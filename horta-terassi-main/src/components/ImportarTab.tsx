import React, { useState } from 'react';
import { Upload, FileCode, CheckCircle2, AlertCircle, RefreshCw, Calendar, Filter } from 'lucide-react';
import { Cliente, Pedido, Produto } from '../types';

interface ImportarTabProps {
  clientes: Cliente[];
  produtos: Produto[];
  pedidos: Pedido[];
  onImportarDados: (novosClientes: Cliente[], novosProdutos: Produto[], novosPedidos: Pedido[]) => void;
  showToast: (msg: string) => void;
}

export const ImportarTab: React.FC<ImportarTabProps> = ({
  clientes,
  produtos,
  pedidos,
  onImportarDados,
  showToast,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [dataDe, setDataDe] = useState('');
  const [dataAte, setDataAte] = useState('');
  const [resumo, setResumo] = useState<{
    novosClientes: Cliente[];
    novosProdutos: Produto[];
    novosPedidos: Pedido[];
    pedidosDuplicados: number;
    pedidosForaPeriodo: number;
    totalArquivoPedidos: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const normalizarCnpj = (cnpj: string) => (cnpj || '').replace(/\D/g, '');

  const handlePrevisualizar = async () => {
    if (!file) {
      showToast('Escolha o arquivo importacao_horta.json primeiro.');
      return;
    }

    setLoading(true);
    try {
      const texto = await file.text();
      const dados = JSON.parse(texto);

      if (!Array.isArray(dados.clientes) || !Array.isArray(dados.produtos) || !Array.isArray(dados.pedidos)) {
        showToast('Formato inesperado (faltam as listas de clientes, produtos ou pedidos).');
        setLoading(false);
        return;
      }

      const cnpjsExistentes = new Set(clientes.map(c => normalizarCnpj(c.cnpj)).filter(Boolean));
      const codigosExistentes = new Set(produtos.map(p => p.codigo));
      const chavesExistentes = new Set(pedidos.map(p => p.notaChave).filter(Boolean));

      const cnpjParaId: Record<string, string> = {};
      clientes.forEach(c => {
        const n = normalizarCnpj(c.cnpj);
        if (n) cnpjParaId[n] = c.id;
      });

      const novosClientes: Cliente[] = [];
      dados.clientes.forEach((c: any) => {
        const norm = normalizarCnpj(c.cnpj);
        if (norm && cnpjParaId[norm]) return;
        const novoId = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        const novo: Cliente = {
          id: novoId,
          nome: c.nome || '',
          apelido: c.apelido || c.nome || 'Novo Mercado',
          cnpj: c.cnpj || '',
          endereco: c.endereco || '',
          bairro: c.bairro || '',
          municipio: c.municipio || 'Londrina/PR',
          cep: c.cep || '',
          ie: c.ie || '',
          periodicidadeRelatorio: null,
          ultimaRetiradaRelatorio: '',
        };
        novosClientes.push(novo);
        if (norm) cnpjParaId[norm] = novoId;
      });

      const novosProdutos: Produto[] = [];
      dados.produtos.forEach((p: any) => {
        if (codigosExistentes.has(p.codigo)) return;
        novosProdutos.push({
          codigo: p.codigo || `0121.${Math.floor(1000 + Math.random() * 9000)}.00`,
          descricao: p.descricao || '',
          ncm: p.ncm || '07051900',
          cfop: p.cfop || '5101',
          unidade: p.unidade || 'UN',
          valor: p.valor || 0,
        });
        codigosExistentes.add(p.codigo);
      });

      const novosPedidos: Pedido[] = [];
      let pedidosDuplicados = 0;
      let pedidosForaPeriodo = 0;

      dados.pedidos.forEach((p: any) => {
        const dataPedido = p.data || p.dataEntrega || '';

        // Filtro de data se especificado
        if (dataDe && dataPedido && dataPedido < dataDe) {
          pedidosForaPeriodo++;
          return;
        }
        if (dataAte && dataPedido && dataPedido > dataAte) {
          pedidosForaPeriodo++;
          return;
        }

        if (p.notaChave && chavesExistentes.has(p.notaChave)) {
          pedidosDuplicados++;
          return;
        }

        const cid = cnpjParaId[normalizarCnpj(p.clienteCnpj)];
        if (!cid) return;

        novosPedidos.push({
          id: `ped_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          clienteId: cid,
          data: p.data || new Date().toISOString().slice(0, 10),
          itens: p.itens || [],
          status: p.status || 'entregue',
          notaNumero: p.notaNumero || '',
          notaChave: p.notaChave || '',
          dataEntrega: p.dataEntrega || p.data || '',
        });

        if (p.notaChave) chavesExistentes.add(p.notaChave);
      });

      setResumo({
        novosClientes,
        novosProdutos,
        novosPedidos,
        pedidosDuplicados,
        pedidosForaPeriodo,
        totalArquivoPedidos: dados.pedidos.length,
      });
    } catch (e) {
      console.error(e);
      showToast('Não foi possível ler o arquivo JSON.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmarImportacao = () => {
    if (!resumo) return;
    onImportarDados(resumo.novosClientes, resumo.novosProdutos, resumo.novosPedidos);
    showToast(
      `Importação concluída: ${resumo.novosPedidos.length} pedido(s), ${resumo.novosClientes.length} cliente(s) e ${resumo.novosProdutos.length} produto(s) adicionados!`
    );
    setResumo(null);
    setFile(null);
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#D8D9C9] pb-3">
        <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0 flex items-center gap-2">
          <Upload className="w-6 h-6 text-[#1F3D2B]" />
          Importar histórico de notas e pedidos
        </h2>
        <p className="text-xs text-[#4B564C] mt-0.5">
          Acesso de Administrador: suba o arquivo <code className="font-mono bg-[#EEF1E9] px-1 py-0.5 rounded">importacao_horta.json</code> extraído das notas fiscais antigas. Clientes e produtos já cadastrados não serão duplicados.
        </p>
      </div>

      <div className="bg-white border border-[#D8D9C9] rounded-xl p-6 shadow-sm space-y-5">
        {/* File Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-2">
            Selecione o arquivo de importação (.json)
          </label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={e => {
              const selected = e.target.files?.[0] || null;
              setFile(selected);
              setResumo(null);
            }}
            className="block w-full text-sm text-[#4B564C] file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#1F3D2B] file:text-white hover:file:bg-[#132A1D] file:cursor-pointer border border-[#D8D9C9] rounded-xl p-2 bg-[#EEF1E9]/20"
          />
        </div>

        {/* Date Range Filter */}
        <div className="bg-[#EEF1E9]/30 border border-[#D8D9C9] rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1F3D2B]">
            <Filter className="w-4 h-4" />
            <span>Filtro de período para importação (opcional)</span>
          </div>
          <p className="text-xs text-[#4B564C]">
            Caso queira importar somente pedidos de um intervalo específico de datas, selecione abaixo. Se deixar em branco, todos os pedidos do arquivo serão importados.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#4B564C] mb-1">
                Data inicial (De)
              </label>
              <input
                type="date"
                value={dataDe}
                onChange={e => {
                  setDataDe(e.target.value);
                  setResumo(null);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-[#4B564C] mb-1">
                Data final (Até)
              </label>
              <input
                type="date"
                value={dataAte}
                onChange={e => {
                  setDataAte(e.target.value);
                  setResumo(null);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>
          </div>
          {(dataDe || dataAte) && (
            <button
              type="button"
              onClick={() => {
                setDataDe('');
                setDataAte('');
                setResumo(null);
              }}
              className="text-xs font-semibold text-[#A6432F] hover:underline"
            >
              Limpar filtro de data
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevisualizar}
            disabled={!file || loading}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#1F3D2B] hover:bg-[#132A1D] disabled:opacity-50 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
            Pré-visualizar dados
          </button>
        </div>

        {resumo && (
          <div className="bg-[#EEF1E9]/50 border border-[#D8D9C9] rounded-xl p-5 space-y-4">
            <h3 className="font-serif font-bold text-base text-[#132A1D] m-0 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#5E8F52]" />
              Resumo da pré-visualização
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-white p-3 rounded-lg border border-[#D8D9C9]">
                <span className="text-[#4B564C] block text-[11px] uppercase">Novos clientes</span>
                <span className="font-bold text-lg text-[#132A1D]">{resumo.novosClientes.length}</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-[#D8D9C9]">
                <span className="text-[#4B564C] block text-[11px] uppercase">Novos produtos</span>
                <span className="font-bold text-lg text-[#132A1D]">{resumo.novosProdutos.length}</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-[#D8D9C9]">
                <span className="text-[#4B564C] block text-[11px] uppercase">Novos pedidos prontos</span>
                <span className="font-bold text-lg text-[#1F3D2B]">{resumo.novosPedidos.length}</span>
                <span className="text-[10px] text-[#4B564C] block mt-0.5">
                  (de {resumo.totalArquivoPedidos} no arquivo)
                </span>
                {resumo.pedidosForaPeriodo > 0 && (
                  <span className="text-[10px] text-[#4B564C] block font-sans">
                    • {resumo.pedidosForaPeriodo} fora do período filtrado
                  </span>
                )}
                {resumo.pedidosDuplicados > 0 && (
                  <span className="text-[10px] text-[#C08A2E] block font-sans">
                    • {resumo.pedidosDuplicados} duplicados ignorados
                  </span>
                )}
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleConfirmarImportacao}
                disabled={resumo.novosPedidos.length === 0 && resumo.novosClientes.length === 0 && resumo.novosProdutos.length === 0}
                className="flex items-center gap-2 px-6 py-3 text-xs font-bold text-white bg-[#5E8F52] hover:bg-[#1F3D2B] disabled:opacity-50 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar e importar {resumo.novosPedidos.length} pedido(s)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
