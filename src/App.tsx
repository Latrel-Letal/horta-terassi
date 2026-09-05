import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StorageService } from './services/storage';
import { Cliente, Funcionario, Pedido, PrecosOverrides, Produto, TransporteConfig } from './types';
import { hojeISO, fmtMoeda, calcularTotalPedido, getProdutoInfo } from './utils/formatters';
import { 
  auth, 
  db, 
  isEmailAdmin, 
  isEmailAllowed, 
  saveDocData, 
  saveFirebasePedido, 
  deleteFirebasePedido, 
  importarPedidosBatch,
  registrarLog,
  migrarPedidosLegado,
  subscribeFirebasePedidos,
  subscribeDocData
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

  // Duração do aviso antes do bloqueio de fato entrar em vigor.
  const AVISO_MANUTENCAO_MS = 30000;
  // "Relógio" que força recálculo da contagem regressiva a cada segundo
  // enquanto o modo manutenção estiver ativo.
  const [manutencaoTick, setManutencaoTick] = useState(() => Date.now());
  useEffect(() => {
    if (!manutencaoData?.ativo) return;
    const intervalId = setInterval(() => setManutencaoTick(Date.now()), 500);
    return () => clearInterval(intervalId);
  }, [manutencaoData?.ativo]);

  const manutencaoDesdeMs: number | null = manutencaoData?.desde?.toMillis?.() ?? null;
  // Se ainda não tem timestamp confirmado pelo servidor (instante logo após
  // ativar), trata como decorrido = 0 (aviso recém-começou).
  const manutencaoDecorridoMs = manutencaoData?.ativo
    ? (manutencaoDesdeMs !== null ? manutencaoTick - manutencaoDesdeMs : 0)
    : 0;
  const emAvisoManutencao = !!manutencaoData?.ativo && manutencaoDecorridoMs < AVISO_MANUTENCAO_MS;
  const segundosRestantesManutencao = Math.max(0, Math.ceil((AVISO_MANUTENCAO_MS - manutencaoDecorridoMs) / 1000));

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

  // Guarda as funções de "desinscrição" das assinaturas em tempo real do
  // Firebase, para poder encerrá-las no logout/troca de usuário e evitar
  // vazamento de conexões.
  const unsubscribersRef = useRef<Array<() => void>>([]);

  const pararSincronizacaoFirebase = useCallback(() => {
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];
  }, []);

  // Liga a sincronização em tempo real com o Firebase: qualquer alteração
  // feita por outra pessoa (em outro celular/computador) chega aqui na
  // hora, sem precisar dar F5. Substitui o antigo carregamento único.
  const iniciarSincronizacaoFirebase = useCallback(() => {
    // Evita assinaturas duplicadas caso a função seja chamada mais de uma
    // vez (ex: login manual + listener de auth disparando em seguida).
    pararSincronizacaoFirebase();
    setLoadingData(true);

    // Migração de pedidos do formato antigo só precisa rodar uma vez.
    migrarPedidosLegado().catch(e => console.error('Erro na migração de pedidos legados:', e));

    let pendentes = 6;
    const marcarCarregado = () => {
      pendentes = Math.max(0, pendentes - 1);
      if (pendentes === 0) setLoadingData(false);
    };

    unsubscribersRef.current = [
      subscribeDocData<Produto[]>('produtos', DEFAULT_PRODUTOS, data => {
        setProdutos(data);
        StorageService.saveProdutos(data);
        marcarCarregado();
      }),
      subscribeDocData<Cliente[]>('clientes', DEFAULT_CLIENTES, data => {
        setClientes(data);
        StorageService.saveClientes(data);
        marcarCarregado();
      }),
      subscribeDocData<Funcionario[]>('funcionarios', DEFAULT_FUNCIONARIOS, data => {
        setFuncionarios(data);
        StorageService.saveFuncionarios(data);
        marcarCarregado();
      }),
      subscribeDocData<PrecosOverrides>('precos', {}, data => {
        setPrecosOverrides(data);
        StorageService.savePrecosOverrides(data);
        marcarCarregado();
      }),
      subscribeDocData<TransporteConfig>('transporte', DEFAULT_TRANSPORTE, data => {
        setTransporteConfig(data);
        StorageService.saveTransporte(data);
        marcarCarregado();
      }),
      subscribeFirebasePedidos(data => {
        setPedidos(data);
        StorageService.savePedidos(data);
        marcarCarregado();
      }),
    ];
  }, [pararSincronizacaoFirebase]);

  // Firebase Auth State Listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser && fbUser.email && isEmailAllowed(fbUser.email)) {
        const isAdmin = isEmailAdmin(fbUser.email);
        const apelidoSalvo = localStorage.getItem('horta_apelido') || (isAdmin ? 'Administrador' : 'Desconhecido');
        const loggedUser = {
          email: fbUser.email,
          name: isAdmin ? 'Administrador (Tanathus)' : 'Fabricio Inacio Terassi',
          apelido: apelidoSalvo,
        };
        setUser(loggedUser);
        StorageService.saveAuthUser(loggedUser);
        iniciarSincronizacaoFirebase();
      } else {
        if (fbUser) {
          await signOut(auth);
        }
        pararSincronizacaoFirebase();
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
      pararSincronizacaoFirebase();
    };
  }, [iniciarSincronizacaoFirebase, pararSincronizacaoFirebase]);

  // Auth handlers
  const handleLoginSuccess = (loggedUser: { email: string; name: string; apelido: string }) => {
    // Guardamos no localStorage (não sessionStorage) para o apelido
    // sobreviver a fechamentos de aba/navegador, já que a sessão do
    // Firebase Auth também é lembrada automaticamente pelo navegador.
    localStorage.setItem('horta_apelido', loggedUser.apelido);
    setUser(loggedUser);
    StorageService.saveAuthUser(loggedUser);
    showToast(`Bem-vindo, ${loggedUser.name}!`);
    iniciarSincronizacaoFirebase();
  };

  const handleLogout = async () => {
    pararSincronizacaoFirebase();
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('horta_apelido');
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
      ? 'Deseja ATIVAR o Modo Manutenção? Os usuários verão um aviso com contagem de 30 segundos antes do acesso ser bloqueado.'
      : 'Deseja DESATIVAR o Modo Manutenção e liberar o acesso a todos os usuários imediatamente?';

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

  // Helpers para descrições legíveis no Registro de Acesso (em vez de IDs crus)
  const nomeClienteById = useCallback(
    (clienteId?: string) => {
      if (!clienteId) return 'cliente desconhecido';
      const c = clientes.find(x => x.id === clienteId);
      return c?.apelido || c?.nome || clienteId;
    },
    [clientes]
  );

  const resumoPedido = useCallback(
    (pedido: Pedido) => {
      const nItens = pedido.itens?.length || 0;
      const total = calcularTotalPedido(pedido, produtos, precosOverrides);
      return `${nomeClienteById(pedido.clienteId)} (${nItens} ite${nItens === 1 ? 'm' : 'ns'}, ${fmtMoeda(total)})`;
    },
    [nomeClienteById, produtos, precosOverrides]
  );

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
          descricao: `Editou o pedido de ${resumoPedido(atualizado)}`,
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
          descricao: `Lançou novo pedido para ${resumoPedido(novoPedido)}`,
        });
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleEntregarPedido = async (pedidoId: string) => {
    const hoje = hojeISO();
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
        descricao: `Marcou como entregue o pedido de ${resumoPedido(modificado)}`,
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
          descricao: `Reabriu o pedido de ${resumoPedido(modificado)} (voltou para pendente)`,
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
            descricao: `Excluiu o pedido de ${pedidoExcluido ? resumoPedido(pedidoExcluido) : pedidoId}`,
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
        descricao: `Atualizou perda/devolução de ${getProdutoInfo(codigoProduto, produtos).descricao} (qtd: ${qtd}) no pedido de ${nomeClienteById(target.clienteId)}`,
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
  // O bloqueio de fato só entra em vigor depois que o aviso de 30s termina.
  const isManutencaoBloqueante = !!manutencaoData?.ativo && !isAdmin && !emAvisoManutencao;

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
      {/* Aviso de manutenção com contagem regressiva de 30s (não bloqueia o uso ainda) */}
      {emAvisoManutencao && (
        <div className="fixed top-0 inset-x-0 z-50 bg-[#C08A2E] text-white text-center py-3 px-4 shadow-lg flex items-center justify-center gap-2">
          <Wrench className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm font-semibold m-0">
            Atenção: o site entrará em manutenção em {segundosRestantesManutencao}s. Finalize e salve o que estiver fazendo.
          </p>
        </div>
      )}

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

      <div className={`max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-20 ${emAvisoManutencao ? 'pt-16' : ''}`}>
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
              ultimaRetiradaRelatorio: hojeISO(),
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
