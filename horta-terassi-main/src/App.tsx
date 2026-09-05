import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from './services/storage';
import { Cliente, Funcionario, Pedido, PrecosOverrides, Produto, TransporteConfig } from './types';
import { 
  auth, 
  db, 
  isEmailAdmin, 
  isEmailAllowed, 
  getOrInitDoc, 
  saveDocData, 
  loadFirebasePedidos, 
  saveFirebasePedido, 
  deleteFirebasePedido, 
  importarPedidosBatch,
  registrarLog
} from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

import { Header } from './components/Header';
import { LembretesBanner } from './components/LembretesBanner';
import { TabsNavigation, TabType } from './components/TabsNavigation';
import { PedidosTab } from './components/PedidosTab';
import { NovoPedidoTab } from './components/NovoPedidoTab';
import { ClientesTab } from './components/ClientesTab';
import { ProdutosTab } from './components/ProdutosTab';
import { EntregadoresTab } from './components/EntregadoresTab';
import { PerdasTab } from './components/PerdasTab';
import { RelatorioMercadoTab } from './components/RelatorioMercadoTab';
import { RelatorioProdutosTab } from './components/RelatorioProdutosTab';
import { ImportarTab } from './components/ImportarTab';
import { RegistroAcessoTab } from './components/RegistroAcessoTab';
import { ModalFichaNota } from './components/ModalFichaNota';
import { ModalClienteForm } from './components/ModalClienteForm';
import { ModalPrecosCliente } from './components/ModalPrecosCliente';
import { ModalConfirmacaoSenha } from './components/ModalConfirmacaoSenha';
import { Toast } from './components/Toast';
import { LoginScreen } from './components/LoginScreen';
import { usePromocaoDoDia } from './hooks/usePromocaoDoDia';
import { Wrench, ShieldAlert, AlertCircle } from 'lucide-react';
import { DEFAULT_CLIENTES, DEFAULT_PRODUTOS, DEFAULT_FUNCIONARIOS, DEFAULT_TRANSPORTE } from './constants/initialData';
import { imprimirCupomTermico } from './utils/print';

export default function App() {
  // Auth State
  const [user, setUser] = useState<{ email: string; name: string; apelido: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Maintenance State (realtime from Firebase)
  const [manutencaoData, setManutencaoData] = useState<{
    ativo?: boolean;
    desde?: any;
    por?: string;
  } | null>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabType>('pedidos');

  // Core Data
  const [produtos, setProdutos] = useState<Produto[]>(() => StorageService.getProdutos());
  const [clientes, setClientes] = useState<Cliente[]>(() => StorageService.getClientes());
  const [pedidos, setPedidos] = useState<Pedido[]>(() => StorageService.getPedidos());
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>(() => StorageService.getFuncionarios());
  const [precosOverrides, setPrecosOverrides] = useState<PrecosOverrides>(() => StorageService.getPrecosOverrides());
  const [transporteConfig, setTransporteConfig] = useState<TransporteConfig>(() => StorageService.getTransporte());
  const [loadingData, setLoadingData] = useState(false);

  // Promoções ativas do dia (lançadas pelo bot de WhatsApp), já cruzadas
  // com os cadastros de clientes e produtos
  const { getPromocaoPara, getPromocoesDoProduto } = usePromocaoDoDia(clientes, produtos);

  // Modals & Active Edit States
  const [pedidoEmEdicao, setPedidoEmEdicao] = useState<Pedido | null>(null);
  const [modalFichaPedidoId, setModalFichaPedidoId] = useState<string | null>(null);
  const [clienteModalData, setClienteModalData] = useState<{ isOpen: boolean; cliente: Cliente | null }>({
    isOpen: false,
    cliente: null,
  });
  const [modalPrecosClienteId, setModalPrecosClienteId] = useState<string | null>(null);
  const [modalSenha, setModalSenha] = useState<{
    isOpen: boolean;
    mensagem: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    mensagem: '',
    onConfirm: () => {},
  });

  // Notifications & Print
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [printHtml, setPrintHtml] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Carregar todos os dados reais do Firebase
  const loadFirebaseAllData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [pDb, cDb, fDb, prDb, trDb, pedDb] = await Promise.all([
        getOrInitDoc<Produto[]>('produtos', DEFAULT_PRODUTOS),
        getOrInitDoc<Cliente[]>('clientes', DEFAULT_CLIENTES),
        getOrInitDoc<Funcionario[]>('funcionarios', DEFAULT_FUNCIONARIOS),
        getOrInitDoc<PrecosOverrides>('precos', {}),
        getOrInitDoc<TransporteConfig>('transporte', DEFAULT_TRANSPORTE),
        loadFirebasePedidos()
      ]);

      if (pDb) { setProdutos(pDb); StorageService.saveProdutos(pDb); }
      if (cDb) { setClientes(cDb); StorageService.saveClientes(cDb); }
      if (fDb) { setFuncionarios(fDb); StorageService.saveFuncionarios(fDb); }
      if (prDb) { setPrecosOverrides(prDb); StorageService.savePrecosOverrides(prDb); }
      if (trDb) { setTransporteConfig(trDb); StorageService.saveTransporte(trDb); }
      if (pedDb) { setPedidos(pedDb); StorageService.savePedidos(pedDb); }
    } catch (e) {
      console.error('Erro ao sincronizar dados com o Firebase:', e);
      showToast('Aviso: usando dados em cache local.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email && isEmailAllowed(fbUser.email)) {
        const isAdmin = isEmailAdmin(fbUser.email);
        const apelidoSalvo = sessionStorage.getItem('horta_apelido') || (isAdmin ? 'Administrador' : 'Desconhecido');
        const loggedUser = {
          email: fbUser.email,
          name: isAdmin ? 'Administrador (Tanathus)' : 'Fabricio Inacio Terassi',
          apelido: apelidoSalvo,
        };
        setUser(loggedUser);
        StorageService.saveAuthUser(loggedUser);
        await loadFirebaseAllData();
      } else {
        if (fbUser) {
          await signOut(auth);
        }
        setUser(null);
        StorageService.saveAuthUser(null);
      }
      setAuthLoading(false);
    });

    // Firebase Maintenance Mode Listener
    const unsubManut = onSnapshot(doc(db, 'horta_data', 'manutencao'), (snapshot) => {
      if (snapshot.exists()) {
        setManutencaoData(snapshot.data() as any);
      } else {
        setManutencaoData(null);
      }
    });

    return () => {
      unsubAuth();
      unsubManut();
    };
  }, [loadFirebaseAllData]);

  // Auth handlers
  const handleLoginSuccess = async (loggedUser: { email: string; name: string; apelido: string }) => {
    sessionStorage.setItem('horta_apelido', loggedUser.apelido);
    setUser(loggedUser);
    StorageService.saveAuthUser(loggedUser);
    showToast(`Bem-vindo, ${loggedUser.name}!`);
    await loadFirebaseAllData();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    sessionStorage.removeItem('horta_apelido');
    setUser(null);
    StorageService.saveAuthUser(null);
  };

  // Toggle Maintenance Mode (Admin only)
  const handleToggleManutencao = async () => {
    const isAdmin = user ? isEmailAdmin(user.email) : false;
    if (!isAdmin) {
      showToast('Acesso negado: apenas o Administrador pode alterar o modo manutenção.');
      return;
    }

    const ativoAtual = !!manutencaoData?.ativo;
    const confirmMsg = !ativoAtual
      ? 'Deseja ATIVAR o Modo Manutenção? Isso bloqueará o acesso para usuários não-administradores.'
      : 'Deseja DESATIVAR o Modo Manutenção e liberar o acesso a todos os usuários?';

    if (!window.confirm(confirmMsg)) return;

    try {
      await setDoc(doc(db, 'horta_data', 'manutencao'), {
        ativo: !ativoAtual,
        desde: serverTimestamp(),
        por: user?.email
      });
      showToast(!ativoAtual ? 'Modo manutenção ativado.' : 'Modo manutenção desativado.');
    } catch (e) {
      console.error(e);
      showToast('Erro ao atualizar modo manutenção no Firebase.');
    }
  };

  // Pedidos Handlers
  const handleSalvarPedido = async (pedidoData: Omit<Pedido, 'id'>) => {
    if (pedidoEmEdicao) {
      const atualizado: Pedido = {
        ...pedidoEmEdicao,
        clienteId: pedidoData.clienteId,
        data: pedidoData.data,
        dataEntrega: pedidoData.dataEntrega,
        itens: pedidoData.itens,
      };
      setPedidos(prev => prev.map(p => (p.id === pedidoEmEdicao.id ? atualizado : p)));
      StorageService.savePedidos(pedidos.map(p => (p.id === pedidoEmEdicao.id ? atualizado : p)));
      setPedidoEmEdicao(null);
      showToast('Pedido atualizado com sucesso!');
      try {
        await saveFirebasePedido(atualizado);
        registrarLog({
          email: user?.email || '',
          apelido: user?.apelido || 'Desconhecido',
          tipo: 'edicao',
          entidade: 'pedido',
          entidadeId: atualizado.id,
          descricao: `Editou o pedido do cliente ${atualizado.clienteId}`,
        });
      } catch (e) {
        console.error(e);
      }
      setActiveTab('pedidos');
    } else {
      const novoPedido: Pedido = {
        id: `ped_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        ...pedidoData,
      };
      const novos = [novoPedido, ...pedidos];
      setPedidos(novos);
      StorageService.savePedidos(novos);
      showToast('Novo pedido lançado com sucesso!');
      try {
        await saveFirebasePedido(novoPedido);
        registrarLog({
          email: user?.email || '',
          apelido: user?.apelido || 'Desconhecido',
          tipo: 'criacao',
          entidade: 'pedido',
          entidadeId: novoPedido.id,
          descricao: `Lançou novo pedido para o cliente ${novoPedido.clienteId}`,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleEntregarPedido = async (pedidoId: string) => {
    const hoje = new Date().toISOString().slice(0, 10);
    const atualizado = pedidos.find(p => p.id === pedidoId);
    if (!atualizado) return;

    const modificado: Pedido = { ...atualizado, status: 'entregue', dataEntrega: atualizado.dataEntrega || hoje };
    const lista = pedidos.map(p => (p.id === pedidoId ? modificado : p));
    setPedidos(lista);
    StorageService.savePedidos(lista);
    showToast('Pedido marcado como entregue!');
    setModalFichaPedidoId(pedidoId);

    try {
      await saveFirebasePedido(modificado);
      registrarLog({
        email: user?.email || '',
        apelido: user?.apelido || 'Desconhecido',
        tipo: 'edicao',
        entidade: 'pedido',
        entidadeId: pedidoId,
        descricao: `Marcou o pedido ${pedidoId} como entregue`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleReabrirPedido = async (pedidoId: string) => {
    const p = pedidos.find(x => x.id === pedidoId);
    if (!p) return;

    if (window.confirm('Reabrir este pedido para torná-lo pendente novamente?')) {
      const modificado: Pedido = { ...p, status: 'pendente', dataEntrega: undefined, devolucoes: {} };
      const lista = pedidos.map(item => item.id === pedidoId ? modificado : item);
      setPedidos(lista);
      StorageService.savePedidos(lista);
      showToast('Pedido reaberto com sucesso!');

      try {
        await saveFirebasePedido(modificado);
        registrarLog({
          email: user?.email || '',
          apelido: user?.apelido || 'Desconhecido',
          tipo: 'edicao',
          entidade: 'pedido',
          entidadeId: pedidoId,
          descricao: `Reabriu o pedido ${pedidoId} (voltou para pendente)`,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleExcluirPedido = (pedidoId: string) => {
    const pedidoExcluido = pedidos.find(p => p.id === pedidoId);
    setModalSenha({
      isOpen: true,
      mensagem: 'Tem certeza que deseja excluir permanentemente este pedido?',
      onConfirm: async () => {
        const filtrados = pedidos.filter(p => p.id !== pedidoId);
        setPedidos(filtrados);
        StorageService.savePedidos(filtrados);
        setModalSenha(prev => ({ ...prev, isOpen: false }));
        showToast('Pedido excluído com sucesso.');

        try {
          await deleteFirebasePedido(pedidoId);
          registrarLog({
            email: user?.email || '',
            apelido: user?.apelido || 'Desconhecido',
            tipo: 'exclusao',
            entidade: 'pedido',
            entidadeId: pedidoId,
            descricao: `Excluiu o pedido ${pedidoId}`,
            dadosAntes: pedidoExcluido ? JSON.stringify(pedidoExcluido) : undefined,
          });
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  const handleUpdateDevolucao = async (pedidoId: string, codigoProduto: string, qtd: number) => {
    const target = pedidos.find(p => p.id === pedidoId);
    if (!target) return;

    const dev = { ...(target.devolucoes || {}) };
    if (qtd > 0) dev[codigoProduto] = qtd;
    else delete dev[codigoProduto];

    const modificado: Pedido = { ...target, devolucoes: dev };
    const lista = pedidos.map(p => (p.id === pedidoId ? modificado : p));
    setPedidos(lista);
    StorageService.savePedidos(lista);
    showToast('Perda/devolução atualizada.');

    try {
      await saveFirebasePedido(modificado);
      registrarLog({
        email: user?.email || '',
        apelido: user?.apelido || 'Desconhecido',
        tipo: 'edicao',
        entidade: 'pedido',
        entidadeId: pedidoId,
        descricao: `Atualizou perda/devolução do produto ${codigoProduto} (qtd: ${qtd}) no pedido ${pedidoId}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Clientes Handlers
  const handleSalvarCliente = async (cliente: Cliente) => {
    let atualizados: Cliente[];
    const idx = clientes.findIndex(c => c.id === cliente.id);
    const isNovo = idx < 0;
    if (idx >= 0) {
      atualizados = [...clientes];
      atualizados[idx] = cliente;
    } else {
      atualizados = [...clientes, cliente];
    }
    setClientes(atualizados);
    StorageService.saveClientes(atualizados);
    showToast('Cliente salvo com sucesso!');

    try {
      await saveDocData('clientes', atualizados);
      registrarLog({
        email: user?.email || '',
        apelido: user?.apelido || 'Desconhecido',
        tipo: isNovo ? 'criacao' : 'edicao',
        entidade: 'cliente',
        entidadeId: cliente.id,
        descricao: `${isNovo ? 'Cadastrou' : 'Editou'} o cliente ${cliente.apelido || cliente.nome}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExcluirCliente = (clienteId: string) => {
    const c = clientes.find(x => x.id === clienteId);
    const temPedidos = pedidos.some(p => p.clienteId === clienteId);
    const aviso = temPedidos
      ? `Excluir "${c?.apelido || c?.nome}"? Existem pedidos registrados para esse mercado — eles continuarão no histórico como (cliente removido).`
      : `Excluir "${c?.apelido || c?.nome}" da lista de clientes?`;

    setModalSenha({
      isOpen: true,
      mensagem: aviso,
      onConfirm: async () => {
        const novosClientes = clientes.filter(item => item.id !== clienteId);
        setClientes(novosClientes);
        StorageService.saveClientes(novosClientes);

        const novosFuncionarios = funcionarios.map(f => ({
          ...f,
          clientesIds: (f.clientesIds || []).filter(cid => cid !== clienteId),
        }));
        setFuncionarios(novosFuncionarios);
        StorageService.saveFuncionarios(novosFuncionarios);

        setModalSenha(prev => ({ ...prev, isOpen: false }));
        showToast('Cliente excluído.');

        try {
          await saveDocData('clientes', novosClientes);
          await saveDocData('funcionarios', novosFuncionarios);
          registrarLog({
            email: user?.email || '',
            apelido: user?.apelido || 'Desconhecido',
            tipo: 'exclusao',
            entidade: 'cliente',
            entidadeId: clienteId,
            descricao: `Excluiu o cliente ${c?.apelido || c?.nome || clienteId}`,
            dadosAntes: c ? JSON.stringify(c) : undefined,
          });
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  const handleUpdateClienteField = async (clienteId: string, updates: Partial<Cliente>) => {
    const atualizados = clientes.map(c => (c.id === clienteId ? { ...c, ...updates } : c));
    setClientes(atualizados);
    StorageService.saveClientes(atualizados);
    showToast('Lembrete atualizado.');

    try {
      await saveDocData('clientes', atualizados);
    } catch (e) {
      console.error(e);
    }
  };

  // Produtos Handlers
  const handleSalvarProduto = async (produto: Produto) => {
    let atualizados: Produto[];
    const key = produto.codigo || `DESC:${produto.descricao}`;
    const idx = produtos.findIndex(p => (p.codigo || `DESC:${p.descricao}`) === key);
    const isNovo = idx < 0;
    if (idx >= 0) {
      atualizados = [...produtos];
      atualizados[idx] = produto;
    } else {
      atualizados = [...produtos, produto];
    }
    setProdutos(atualizados);
    StorageService.saveProdutos(atualizados);
    showToast('Produto salvo com sucesso!');

    try {
      await saveDocData('produtos', atualizados);
      registrarLog({
        email: user?.email || '',
        apelido: user?.apelido || 'Desconhecido',
        tipo: isNovo ? 'criacao' : 'edicao',
        entidade: 'produto',
        entidadeId: key,
        descricao: `${isNovo ? 'Cadastrou' : 'Editou'} o produto ${produto.descricao}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExcluirProduto = (codigo: string) => {
    setModalSenha({
      isOpen: true,
      mensagem: 'Deseja excluir este produto do catálogo? Pedidos já emitidos permanecerão com seus valores congelados.',
      onConfirm: async () => {
        const produtoExcluido = produtos.find(p => (p.codigo || `DESC:${p.descricao}`) === codigo);
        const filtrados = produtos.filter(p => (p.codigo || `DESC:${p.descricao}`) !== codigo);
        setProdutos(filtrados);
        StorageService.saveProdutos(filtrados);
        setModalSenha(prev => ({ ...prev, isOpen: false }));
        showToast('Produto excluído do catálogo.');

        try {
          await saveDocData('produtos', filtrados);
          registrarLog({
            email: user?.email || '',
            apelido: user?.apelido || 'Desconhecido',
            tipo: 'exclusao',
            entidade: 'produto',
            entidadeId: codigo,
            descricao: `Excluiu o produto ${produtoExcluido?.descricao || codigo}`,
            dadosAntes: produtoExcluido ? JSON.stringify(produtoExcluido) : undefined,
          });
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  // Funcionários Handlers
  const handleSalvarFuncionario = async (func: Funcionario) => {
    let atualizados: Funcionario[];
    const idx = funcionarios.findIndex(f => f.id === func.id);
    const isNovo = idx < 0;
    if (idx >= 0) {
      atualizados = [...funcionarios];
      atualizados[idx] = func;
    } else {
      atualizados = [...funcionarios, func];
    }
    setFuncionarios(atualizados);
    StorageService.saveFuncionarios(atualizados);
    showToast('Funcionário salvo com sucesso!');

    try {
      await saveDocData('funcionarios', atualizados);
      registrarLog({
        email: user?.email || '',
        apelido: user?.apelido || 'Desconhecido',
        tipo: isNovo ? 'criacao' : 'edicao',
        entidade: 'funcionario',
        entidadeId: func.id,
        descricao: `${isNovo ? 'Cadastrou' : 'Editou'} o entregador ${func.nome}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExcluirFuncionario = (id: string) => {
    setModalSenha({
      isOpen: true,
      mensagem: 'Deseja excluir este entregador da equipe?',
      onConfirm: async () => {
        const funcExcluido = funcionarios.find(f => f.id === id);
        const filtrados = funcionarios.filter(f => f.id !== id);
        setFuncionarios(filtrados);
        StorageService.saveFuncionarios(filtrados);
        setModalSenha(prev => ({ ...prev, isOpen: false }));
        showToast('Entregador excluído.');

        try {
          await saveDocData('funcionarios', filtrados);
          registrarLog({
            email: user?.email || '',
            apelido: user?.apelido || 'Desconhecido',
            tipo: 'exclusao',
            entidade: 'funcionario',
            entidadeId: id,
            descricao: `Excluiu o entregador ${funcExcluido?.nome || id}`,
            dadosAntes: funcExcluido ? JSON.stringify(funcExcluido) : undefined,
          });
        } catch (e) {
          console.error(e);
        }
      },
    });
  };

  // Preços & Notas Handlers
  const handleSalvarPrecos = async (clienteId: string, overrides: Record<string, number>) => {
    const atualizados = {
      ...precosOverrides,
      [clienteId]: overrides,
    };
    setPrecosOverrides(atualizados);
    StorageService.savePrecosOverrides(atualizados);
    showToast('Tabela de preços personalizada salva!');

    try {
      await saveDocData('precos', atualizados);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNotaDados = async (pedidoId: string, notaNumero: string, notaChave: string) => {
    const target = pedidos.find(p => p.id === pedidoId);
    if (!target) return;

    const modificado: Pedido = { ...target, notaNumero, notaChave };
    const lista = pedidos.map(p => (p.id === pedidoId ? modificado : p));
    setPedidos(lista);
    StorageService.savePedidos(lista);
    showToast('Dados da nota salvos!');

    try {
      await saveFirebasePedido(modificado);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveTransporte = async (transporte: TransporteConfig) => {
    setTransporteConfig(transporte);
    StorageService.saveTransporte(transporte);
    try {
      await saveDocData('transporte', transporte);
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportarDados = async (
    novosClientes: Cliente[],
    novosProdutos: Produto[],
    novosPedidos: Pedido[]
  ) => {
    if (novosClientes.length > 0) {
      const c = [...clientes, ...novosClientes];
      setClientes(c);
      StorageService.saveClientes(c);
      await saveDocData('clientes', c);
    }
    if (novosProdutos.length > 0) {
      const pr = [...produtos, ...novosProdutos];
      setProdutos(pr);
      StorageService.saveProdutos(pr);
      await saveDocData('produtos', pr);
    }
    if (novosPedidos.length > 0) {
      const p = [...novosPedidos, ...pedidos];
      setPedidos(p);
      StorageService.savePedidos(p);
      await importarPedidosBatch(novosPedidos);
    }
    showToast('Importação salva no Firebase com sucesso!');
    registrarLog({
      email: user?.email || '',
      apelido: user?.apelido || 'Desconhecido',
      tipo: 'criacao',
      entidade: 'pedido',
      descricao: `Importou dados em lote: ${novosClientes.length} clientes, ${novosProdutos.length} produtos, ${novosPedidos.length} pedidos`,
    });
  };

  // Thermal Receipt Printing (EPSON TM-T20X e bobinas 80mm)
  const handlePrintThermal = (htmlContent: string) => {
    setPrintHtml(htmlContent);
    imprimirCupomTermico(htmlContent);
  };

  const pedidosPendentesCount = pedidos.filter(p => p.status === 'pendente').length;
  const isAdmin = user ? isEmailAdmin(user.email) : false;
  const isManutencaoBloqueante = !!manutencaoData?.ativo && !isAdmin;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF1E9]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#1F3D2B] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-semibold text-sm text-[#1F3D2B]">Conectando ao Firebase...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#EEF1E9] text-[#1B2420] relative">
      {/* Maintenance Fullscreen Overlay for non-admins when maintenance is active */}
      {isManutencaoBloqueante && (
        <div className="fixed inset-0 z-50 bg-[#EEF1E9] flex items-center justify-center p-6 text-center">
          <div className="bg-white border-2 border-[#C08A2E] rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#C08A2E]/15 text-[#C08A2E] flex items-center justify-center mx-auto">
              <Wrench className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold font-serif text-[#132A1D] m-0">
              Site em manutenção
            </h2>
            <p className="text-sm text-[#4B564C] leading-relaxed">
              Estamos fazendo alguns ajustes técnicos no painel. O acesso para usuários comuns retornará em alguns minutos.
            </p>
            <div className="pt-2">
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-xs font-semibold text-[#A6432F] hover:underline"
              >
                Sair da conta
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20">
        {/* App Header */}
        <Header
          user={user}
          isAdmin={isAdmin}
          manutencaoAtiva={!!manutencaoData?.ativo}
          loadingData={loadingData}
          pedidosCount={pedidos.length}
          onToggleManutencao={handleToggleManutencao}
          onLogout={handleLogout}
          showToast={showToast}
        />

        {/* Lembretes Banner */}
        <LembretesBanner
          clientes={clientes}
          onMarcarRetiradoHoje={cid =>
            handleUpdateClienteField(cid, {
              ultimaRetiradaRelatorio: new Date().toISOString().slice(0, 10),
            })
          }
        />

        {/* Pill Navigation Tabs */}
        <TabsNavigation
          activeTab={activeTab}
          onSelectTab={tab => {
            if (tab === 'novo' && activeTab !== 'novo') {
              setPedidoEmEdicao(null);
            }
            setActiveTab(tab);
          }}
          pedidosPendentesCount={pedidosPendentesCount}
          isAdmin={isAdmin}
        />

        {/* Main Content Panels */}
        <main>
          {activeTab === 'pedidos' && (
            <PedidosTab
              pedidos={pedidos}
              clientes={clientes}
              produtos={produtos}
              precosOverrides={precosOverrides}
              onEntregarPedido={handleEntregarPedido}
              onVerFichaNota={id => setModalFichaPedidoId(id)}
              onEditarPedido={id => {
                const p = pedidos.find(x => x.id === id);
                if (p) {
                  setPedidoEmEdicao(p);
                  setActiveTab('novo');
                }
              }}
              onReabrirPedido={handleReabrirPedido}
              onExcluirPedido={handleExcluirPedido}
              onUpdateDevolucao={handleUpdateDevolucao}
            />
          )}

          {activeTab === 'novo' && (
            <NovoPedidoTab
              clientes={clientes}
              produtos={produtos}
              precosOverrides={precosOverrides}
              getPromocaoPara={getPromocaoPara}
              onSalvarPedido={handleSalvarPedido}
              pedidoEmEdicao={pedidoEmEdicao}
              onCancelarEdicao={() => {
                setPedidoEmEdicao(null);
                setActiveTab('pedidos');
              }}
            />
          )}

          {activeTab === 'clientes' && (
            <ClientesTab
              clientes={clientes}
              onAdicionarCliente={() => setClienteModalData({ isOpen: true, cliente: null })}
              onEditarCliente={c => setClienteModalData({ isOpen: true, cliente: c })}
              onExcluirCliente={handleExcluirCliente}
              onOpenPrecosCliente={cid => setModalPrecosClienteId(cid)}
              onUpdateClienteField={handleUpdateClienteField}
            />
          )}

          {activeTab === 'produtos' && (
            <ProdutosTab
              produtos={produtos}
              getPromocoesDoProduto={getPromocoesDoProduto}
              onSalvarProduto={handleSalvarProduto}
              onExcluirProduto={handleExcluirProduto}
            />
          )}

          {activeTab === 'entregadores' && (
            <EntregadoresTab
              funcionarios={funcionarios}
              clientes={clientes}
              pedidos={pedidos}
              onSalvarFuncionario={handleSalvarFuncionario}
              onExcluirFuncionario={handleExcluirFuncionario}
            />
          )}

          {activeTab === 'perdas' && (
            <PerdasTab
              pedidos={pedidos}
              clientes={clientes}
              produtos={produtos}
              precosOverrides={precosOverrides}
            />
          )}

          {activeTab === 'relatorio' && (
            <RelatorioMercadoTab
              pedidos={pedidos}
              clientes={clientes}
              produtos={produtos}
              precosOverrides={precosOverrides}
              onVerFichaNota={id => setModalFichaPedidoId(id)}
            />
          )}

          {activeTab === 'relprodutos' && (
            <RelatorioProdutosTab
              pedidos={pedidos}
              clientes={clientes}
              produtos={produtos}
              precosOverrides={precosOverrides}
              onPrintRelatorio={handlePrintThermal}
              showToast={showToast}
            />
          )}

          {activeTab === 'importar' && isAdmin && (
            <ImportarTab
              clientes={clientes}
              produtos={produtos}
              pedidos={pedidos}
              onImportarDados={handleImportarDados}
              showToast={showToast}
            />
          )}

          {activeTab === 'registroAcesso' && isAdmin && (
            <RegistroAcessoTab />
          )}
        </main>
      </div>

      {/* MODALS */}
      <ModalFichaNota
        pedidoId={modalFichaPedidoId}
        pedidos={pedidos}
        clientes={clientes}
        produtos={produtos}
        precosOverrides={precosOverrides}
        transporteConfig={transporteConfig}
        onSaveTransporte={handleSaveTransporte}
        onSaveNotaDados={handleSaveNotaDados}
        onClose={() => setModalFichaPedidoId(null)}
        onPrintThermal={handlePrintThermal}
        showToast={showToast}
      />

      <ModalClienteForm
        cliente={clienteModalData.cliente}
        isOpen={clienteModalData.isOpen}
        onClose={() => setClienteModalData({ isOpen: false, cliente: null })}
        onSalvarCliente={handleSalvarCliente}
      />

      <ModalPrecosCliente
        clienteId={modalPrecosClienteId}
        clientes={clientes}
        produtos={produtos}
        precosOverrides={precosOverrides}
        onSalvarPrecos={handleSalvarPrecos}
        onClose={() => setModalPrecosClienteId(null)}
      />

      <ModalConfirmacaoSenha
        isOpen={modalSenha.isOpen}
        userEmail={user?.email}
        mensagem={modalSenha.mensagem}
        onConfirm={modalSenha.onConfirm}
        onCancelar={() => setModalSenha(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Floating Status Toast */}
      <Toast message={toastMessage} />

      {/* Hidden Thermal Print Output */}
      <div id="printSection" className="hidden">
        {printHtml && <div dangerouslySetInnerHTML={{ __html: printHtml }} />}
      </div>
    </div>
  );
}
