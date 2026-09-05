import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Search,
  Calendar,
  CheckCircle2,
  FileText,
  Edit3,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Folder,
  FolderOpen,
  Filter,
  X
} from 'lucide-react';
import { Cliente, Pedido, Produto, PrecosOverrides } from '../types';
import {
  calcularDevolucaoTotal,
  calcularTotalPedido,
  diasParado,
  fmtData,
  fmtMoeda,
  getPrecoItem,
  getProdutoInfo
} from '../utils/formatters';
import { PromocaoBadge } from './PromocaoBadge';

interface PedidosTabProps {
  pedidos: Pedido[];
  clientes: Cliente[];
  produtos: Produto[];
  precosOverrides: PrecosOverrides;
  onEntregarPedido: (pedidoId: string) => void;
  onVerFichaNota: (pedidoId: string) => void;
  onEditarPedido: (pedidoId: string) => void;
  onReabrirPedido: (pedidoId: string) => void;
  onExcluirPedido: (pedidoId: string) => void;
  onUpdateDevolucao: (pedidoId: string, codigoProduto: string, qtd: number) => void;
}

const LIMITE_DIAS_PENDENTE = 3;

export const PedidosTab: React.FC<PedidosTabProps> = ({
  pedidos,
  clientes,
  produtos,
  precosOverrides,
  onEntregarPedido,
  onVerFichaNota,
  onEditarPedido,
  onReabrirPedido,
  onExcluirPedido,
  onUpdateDevolucao,
}) => {
  // Search & Filter States
  const [buscaPendente, setBuscaPendente] = useState('');
  const [entDe, setEntDe] = useState('');
  const [entAte, setEntAte] = useState('');
  const [entMercado, setEntMercado] = useState('');
  const [entMercadoBusca, setEntMercadoBusca] = useState('');
  const [entMercadoOpen, setEntMercadoOpen] = useState(false);
  const [entNota, setEntNota] = useState<'todos' | 'com' | 'sem'>('todos');

  // Expanded folders & tickets state
  const [pastasPendentesExpandidas, setPastasPendentesExpandidas] = useState<Set<string>>(new Set());
  const [pastasEntreguesExpandidas, setPastasEntreguesExpandidas] = useState<Set<string>>(new Set());
  const [ticketsEntreguesExpandidos, setTicketsEntreguesExpandidos] = useState<Set<string>>(new Set());

  const getClienteNome = (id: string) => {
    const c = clientes.find(x => x.id === id);
    return c ? (c.apelido || c.nome) : '(cliente removido)';
  };

  // Filtered pending orders
  let pendentes = pedidos
    .filter(p => p.status === 'pendente')
    .sort((a, b) => a.data.localeCompare(b.data));

  if (buscaPendente.trim()) {
    const termo = buscaPendente.toLowerCase();
    pendentes = pendentes.filter(p => getClienteNome(p.clienteId).toLowerCase().includes(termo));
  }

  // Filtered delivered orders
  let entregues = pedidos.filter(p => {
    if (p.status !== 'entregue') return false;
    const dataRef = p.dataEntrega || p.data;
    if (entDe && dataRef < entDe) return false;
    if (entAte && dataRef > entAte) return false;
    if (entMercado && p.clienteId !== entMercado) return false;
    if (entNota === 'com' && !p.notaNumero) return false;
    if (entNota === 'sem' && p.notaNumero) return false;
    return true;
  });

  entregues.sort((a, b) => (b.dataEntrega || b.data).localeCompare(a.dataEntrega || a.data));

  // Group orders into market folders
  const agruparPorMercado = (lista: Pedido[]) => {
    const grupos = new Map<string, Pedido[]>();
    lista.forEach(p => {
      if (!grupos.has(p.clienteId)) grupos.set(p.clienteId, []);
      grupos.get(p.clienteId)!.push(p);
    });
    return Array.from(grupos.entries()).sort((a, b) =>
      getClienteNome(a[0]).localeCompare(getClienteNome(b[0]), 'pt-BR')
    );
  };

  const pastasPendentes = agruparPorMercado(pendentes);
  const pastasEntregues = agruparPorMercado(entregues);

  // Toggle folder handlers
  const togglePastaPendente = (clienteId: string) => {
    setPastasPendentesExpandidas(prev => {
      const next = new Set(prev);
      if (next.has(clienteId)) next.delete(clienteId);
      else next.add(clienteId);
      return next;
    });
  };

  const togglePastaEntregue = (clienteId: string) => {
    setPastasEntreguesExpandidas(prev => {
      const next = new Set(prev);
      if (next.has(clienteId)) next.delete(clienteId);
      else next.add(clienteId);
      return next;
    });
  };

  const toggleTicketEntregue = (pedidoId: string) => {
    setTicketsEntreguesExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(pedidoId)) next.delete(pedidoId);
      else next.add(pedidoId);
      return next;
    });
  };

  // Expand / Collapse all handlers
  const expandirTodasPendentes = () => {
    setPastasPendentesExpandidas(new Set(pastasPendentes.map(([id]) => id)));
  };

  const recolherTodasPendentes = () => {
    setPastasPendentesExpandidas(new Set());
  };

  const expandirTodasEntregues = () => {
    setPastasEntreguesExpandidas(new Set(pastasEntregues.map(([id]) => id)));
    setTicketsEntreguesExpandidos(new Set(entregues.map(p => p.id)));
  };

  const recolherTodasEntregues = () => {
    setPastasEntreguesExpandidas(new Set());
    setTicketsEntreguesExpandidos(new Set());
  };

  const limparFiltrosEntregues = () => {
    setEntDe('');
    setEntAte('');
    setEntMercado('');
    setEntMercadoBusca('');
    setEntNota('todos');
  };

  return (
    <div className="space-y-8">
      {/* SECTION 1: PENDENTES DE ENTREGA */}
      <section className="bg-transparent">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0">
              Pendentes de entrega
            </h2>
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#C08A2E] text-white">
              {pendentes.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandirTodasPendentes}
              className="px-3 py-1.5 text-xs font-semibold text-[#1F3D2B] bg-[#FFFFFF] hover:bg-[#EEF1E9] border border-[#D8D9C9] rounded-lg transition-colors"
            >
              Expandir todas
            </button>
            <button
              onClick={recolherTodasPendentes}
              className="px-3 py-1.5 text-xs font-semibold text-[#4B564C] bg-[#FFFFFF] hover:bg-[#EEF1E9] border border-[#D8D9C9] rounded-lg transition-colors"
            >
              Recolher todas
            </button>
          </div>
        </div>

        {/* Search for pending market */}
        <div className="relative max-w-sm mb-4">
          <Search className="w-4 h-4 text-[#4B564C] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={buscaPendente}
            onChange={e => setBuscaPendente(e.target.value)}
            placeholder="Buscar mercado pendente..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
          />
          {buscaPendente && (
            <button
              onClick={() => setBuscaPendente('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#4B564C] hover:text-[#132A1D]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Market Folders for Pending Orders */}
        {pastasPendentes.length === 0 ? (
          <div className="bg-white border border-[#D8D9C9] rounded-xl p-8 text-center text-[#4B564C] shadow-sm">
            <CheckCircle2 className="w-10 h-10 text-[#5E8F52] mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-base text-[#132A1D]">Nenhum pedido pendente de entrega!</p>
            <p className="text-xs mt-1">Lance um novo pedido na aba "Novo pedido" acima.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastasPendentes.map(([clienteId, itens]) => {
              const aberta = pastasPendentesExpandidas.has(clienteId);
              const totalBruto = itens.reduce(
                (s, p) => s + calcularTotalPedido(p, produtos, precosOverrides),
                0
              );
              const maisAntigo = itens.reduce(
                (min, p) => (!min || p.data < min ? p.data : min),
                ''
              );
              const dias = diasParado(maisAntigo);
              const atrasado = dias > LIMITE_DIAS_PENDENTE;

              return (
                <div
                  key={clienteId}
                  className={`bg-white border rounded-xl shadow-sm transition-all overflow-hidden ${
                    atrasado
                      ? 'border-[#A6432F] animate-pisca-borda bg-[#FDF4F2]/30'
                      : 'border-[#D8D9C9] hover:border-[#1F3D2B]'
                  }`}
                >
                  {/* Folder Head */}
                  <div
                    onClick={() => togglePastaPendente(clienteId)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-[#EEF1E9]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {aberta ? (
                        <FolderOpen className="w-5 h-5 text-[#1F3D2B] shrink-0" />
                      ) : (
                        <Folder className="w-5 h-5 text-[#5E8F52] shrink-0" />
                      )}
                      <div>
                        <span className="font-serif font-bold text-base md:text-lg text-[#132A1D]">
                          {getClienteNome(clienteId)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                      {atrasado && (
                        <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#FBE4DE] text-[#A6432F] border border-[#A6432F]/30 animate-pisca-alerta">
                          ⚠ {dias}d parado
                        </span>
                      )}
                      <span className="font-mono text-xs text-[#4B564C] bg-[#EEF1E9] border border-[#D8D9C9] px-2.5 py-0.5 rounded-full">
                        {itens.length} {itens.length === 1 ? 'pedido' : 'pedidos'}
                      </span>
                      <span className="font-mono text-sm font-bold text-[#132A1D]">
                        {fmtMoeda(totalBruto)}
                      </span>
                      {aberta ? (
                        <ChevronDown className="w-4 h-4 text-[#4B564C]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#4B564C]" />
                      )}
                    </div>
                  </div>

                  {/* Folder Body (Order Tickets) */}
                  {aberta && (
                    <div className="p-4 pt-2 border-t border-[#D8D9C9] bg-[#EEF1E9]/25 space-y-3">
                      {itens.map(pedido => {
                        const total = calcularTotalPedido(pedido, produtos, precosOverrides);

                        return (
                          <div
                            key={pedido.id}
                            className="relative bg-white border border-[#D8D9C9] rounded-xl p-4 md:p-5 shadow-sm overflow-hidden"
                          >
                            {/* Gold pending side ribbon */}
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#C08A2E]" />

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                              <div>
                                <h4 className="font-serif font-bold text-base text-[#132A1D] m-0">
                                  {getClienteNome(pedido.clienteId)}
                                </h4>
                                <div className="font-mono text-xs text-[#4B564C] mt-0.5">
                                  Pedido feito em {fmtData(pedido.data)}
                                </div>
                              </div>

                              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FBF0DA] text-[#8A611C]">
                                Pendente
                              </span>
                            </div>

                            {/* Itemized list */}
                            <ul className="divide-y divide-dashed divide-[#D8D9C9] border-t border-b border-dashed border-[#D8D9C9] my-3 py-1 m-0 p-0 list-none">
                              {pedido.itens.map((it, idx) => {
                                const info = getProdutoInfo(it.codigo, produtos);
                                const preco = getPrecoItem(pedido, it, produtos, precosOverrides);
                                const subtotal = preco * it.quantidade;

                                return (
                                  <li
                                    key={idx}
                                    className="py-1.5 flex items-start justify-between gap-2 text-sm"
                                  >
                                    <div className="leading-snug">
                                      <span className="font-medium text-[#1B2420] inline-flex items-center gap-1.5 flex-wrap">
                                        {info.descricao}
                                        {it.emPromocao && <PromocaoBadge />}
                                      </span>
                                      <span className="block text-xs text-[#4B564C] opacity-85">
                                        {fmtMoeda(preco)} un.
                                      </span>
                                    </div>
                                    <div className="font-mono text-right text-[#4B564C] shrink-0">
                                      <span>
                                        {it.quantidade} {info.unidade}
                                      </span>
                                      <span className="block text-xs font-semibold text-[#132A1D]">
                                        {fmtMoeda(subtotal)}
                                      </span>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>

                            {/* Total and Actions */}
                            <div className="flex items-center justify-between font-bold text-sm text-[#132A1D] pt-1">
                              <span>Total bruto</span>
                              <span className="font-mono text-base text-[#1F3D2B]">
                                {fmtMoeda(total)}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#D8D9C9]/60">
                              <button
                                onClick={() => onEntregarPedido(pedido.id)}
                                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-[#1F3D2B] hover:bg-[#132A1D] rounded-lg transition-colors shadow-sm"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#5E8F52]" />
                                Marcar como entregue
                              </button>
                              <button
                                onClick={() => onEditarPedido(pedido.id)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1B2420] bg-white hover:bg-[#EEF1E9] border border-[#D8D9C9] rounded-lg transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-[#4B564C]" />
                                Editar itens
                              </button>
                              <button
                                onClick={() => onExcluirPedido(pedido.id)}
                                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#A6432F] hover:bg-[#FDF4F2] border border-[#A6432F]/30 rounded-lg transition-colors ml-auto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: ENTREGUES */}
      <section className="bg-transparent pt-4 border-t-2 border-[#1F3D2B]/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0">
              Entregues
            </h2>
            <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#5E8F52] text-white">
              {entregues.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={expandirTodasEntregues}
              className="px-3 py-1.5 text-xs font-semibold text-[#1F3D2B] bg-[#FFFFFF] hover:bg-[#EEF1E9] border border-[#D8D9C9] rounded-lg transition-colors"
            >
              Expandir todos
            </button>
            <button
              onClick={recolherTodasEntregues}
              className="px-3 py-1.5 text-xs font-semibold text-[#4B564C] bg-[#FFFFFF] hover:bg-[#EEF1E9] border border-[#D8D9C9] rounded-lg transition-colors"
            >
              Recolher todos
            </button>
          </div>
        </div>

        {/* Filter Card */}
        <div className="bg-white border border-[#D8D9C9] rounded-xl p-4 md:p-5 shadow-sm mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                De
              </label>
              <input
                type="date"
                value={entDe}
                onChange={e => setEntDe(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Até
              </label>
              <input
                type="date"
                value={entAte}
                onChange={e => setEntAte(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div className="relative">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Mercado
              </label>
              <input
                type="text"
                value={entMercadoBusca}
                onChange={e => {
                  setEntMercadoBusca(e.target.value);
                  setEntMercadoOpen(true);
                }}
                onFocus={() => setEntMercadoOpen(true)}
                placeholder="Todos os mercados"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
              {entMercadoOpen && (
                <div className="absolute top-full left-0 right-0 z-30 bg-white border border-[#D8D9C9] rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                  <div
                    onClick={() => {
                      setEntMercado('');
                      setEntMercadoBusca('');
                      setEntMercadoOpen(false);
                    }}
                    className="px-3 py-2 text-sm hover:bg-[#1F3D2B] hover:text-white cursor-pointer font-semibold"
                  >
                    Todos os mercados
                  </div>
                  {clientes
                    .filter(c =>
                      (c.apelido || c.nome).toLowerCase().includes(entMercadoBusca.toLowerCase())
                    )
                    .map(c => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setEntMercado(c.id);
                          setEntMercadoBusca(c.apelido || c.nome);
                          setEntMercadoOpen(false);
                        }}
                        className="px-3 py-2 text-sm hover:bg-[#1F3D2B] hover:text-white cursor-pointer"
                      >
                        {c.apelido || c.nome}
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Nota fiscal
              </label>
              <select
                value={entNota}
                onChange={e => setEntNota(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              >
                <option value="todos">Todos os entregues</option>
                <option value="com">Somente com nota lançada</option>
                <option value="sem">Somente sem nota lançada</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#D8D9C9]/50">
            <button
              onClick={limparFiltrosEntregues}
              className="px-3.5 py-1.5 text-xs font-semibold text-[#4B564C] hover:text-[#132A1D] bg-[#EEF1E9] hover:bg-[#D8D9C9] rounded-lg transition-colors"
            >
              Limpar filtros
            </button>
            <span className="text-xs text-[#4B564C] ml-auto">
              Exibindo {entregues.length} pedidos entregues
            </span>
          </div>
        </div>

        {/* Market Folders for Delivered Orders */}
        {pastasEntregues.length === 0 ? (
          <div className="bg-white border border-[#D8D9C9] rounded-xl p-8 text-center text-[#4B564C] shadow-sm">
            <p className="font-semibold text-base text-[#132A1D]">Nenhum pedido entregue encontrado</p>
            <p className="text-xs mt-1">Ajuste os filtros de data e mercado acima.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastasEntregues.map(([clienteId, itens]) => {
              const aberta = pastasEntreguesExpandidas.has(clienteId);
              const totalLiquido = itens.reduce((s, p) => {
                const bruto = calcularTotalPedido(p, produtos, precosOverrides);
                const dev = calcularDevolucaoTotal(p, produtos, precosOverrides);
                return s + (bruto - dev);
              }, 0);

              return (
                <div
                  key={clienteId}
                  className="bg-white border border-[#D8D9C9] rounded-xl shadow-sm overflow-hidden"
                >
                  {/* Folder Head */}
                  <div
                    onClick={() => togglePastaEntregue(clienteId)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-white hover:bg-[#EEF1E9]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {aberta ? (
                        <FolderOpen className="w-5 h-5 text-[#1F3D2B] shrink-0" />
                      ) : (
                        <Folder className="w-5 h-5 text-[#5E8F52] shrink-0" />
                      )}
                      <div>
                        <span className="font-serif font-bold text-base md:text-lg text-[#132A1D]">
                          {getClienteNome(clienteId)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                      <span className="font-mono text-xs text-[#4B564C] bg-[#EEF1E9] border border-[#D8D9C9] px-2.5 py-0.5 rounded-full">
                        {itens.length} {itens.length === 1 ? 'pedido' : 'pedidos'}
                      </span>
                      <span className="font-mono text-sm font-bold text-[#1F3D2B]">
                        líquido {fmtMoeda(totalLiquido)}
                      </span>
                      {aberta ? (
                        <ChevronDown className="w-4 h-4 text-[#4B564C]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[#4B564C]" />
                      )}
                    </div>
                  </div>

                  {/* Folder Body (Delivered Tickets) */}
                  {aberta && (
                    <div className="p-4 pt-2 border-t border-[#D8D9C9] bg-[#EEF1E9]/20 space-y-3">
                      {itens.map(pedido => {
                        const collapsed = !ticketsEntreguesExpandidos.has(pedido.id);
                        const totalBruto = calcularTotalPedido(pedido, produtos, precosOverrides);
                        const totalDevolucao = calcularDevolucaoTotal(pedido, produtos, precosOverrides);
                        const liquido = totalBruto - totalDevolucao;

                        return (
                          <div
                            key={pedido.id}
                            className="relative bg-white border border-[#D8D9C9] rounded-xl p-4 md:p-5 shadow-sm overflow-hidden"
                          >
                            {/* Leaf Green side ribbon */}
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#5E8F52]" />

                            {/* Entregue Stamp */}
                            <div className="absolute right-4 top-4 border-2 border-[#5E8F52] text-[#5E8F52] font-serif font-bold text-[11px] tracking-widest px-2 py-0.5 rounded-md uppercase rotate-6 opacity-85 select-none pointer-events-none">
                              Entregue
                            </div>

                            {/* Ticket Head (Clickable to collapse) */}
                            <div
                              onClick={() => toggleTicketEntregue(pedido.id)}
                              className="cursor-pointer select-none pr-20"
                            >
                              <div className="flex items-center gap-2">
                                <h4 className="font-serif font-bold text-base text-[#132A1D] m-0">
                                  {getClienteNome(pedido.clienteId)}
                                </h4>
                                {collapsed && (
                                  <span className="text-xs font-mono text-[#5E8F52] font-bold">
                                    · líquido {fmtMoeda(liquido)}
                                  </span>
                                )}
                              </div>
                              <div className="font-mono text-xs text-[#4B564C] mt-0.5">
                                Pedido de {fmtData(pedido.data)}
                                {pedido.dataEntrega && ` · entregue em ${fmtData(pedido.dataEntrega)}`}
                              </div>
                            </div>

                            {/* Ticket Body (Items and Loss adjustments) */}
                            {!collapsed && (
                              <div className="mt-3">
                                {/* Itemized table */}
                                <ul className="divide-y divide-dashed divide-[#D8D9C9] border-t border-b border-dashed border-[#D8D9C9] my-3 py-1 m-0 p-0 list-none">
                                  {pedido.itens.map((it, idx) => {
                                    const info = getProdutoInfo(it.codigo, produtos);
                                    const preco = getPrecoItem(pedido, it, produtos, precosOverrides);
                                    const subtotal = preco * it.quantidade;

                                    return (
                                      <li
                                        key={idx}
                                        className="py-1.5 flex items-start justify-between gap-2 text-sm"
                                      >
                                        <div className="leading-snug">
                                          <span className="font-medium text-[#1B2420] inline-flex items-center gap-1.5 flex-wrap">
                                            {info.descricao}
                                            {it.emPromocao && <PromocaoBadge />}
                                          </span>
                                          <span className="block text-xs text-[#4B564C] opacity-85">
                                            {fmtMoeda(preco)} un.
                                          </span>
                                        </div>
                                        <div className="font-mono text-right text-[#4B564C] shrink-0">
                                          <span>
                                            {it.quantidade} {info.unidade}
                                          </span>
                                          <span className="block text-xs font-semibold text-[#132A1D]">
                                            {fmtMoeda(subtotal)}
                                          </span>
                                        </div>
                                      </li>
                                    );
                                  })}
                                </ul>

                                <div className="flex items-center justify-between font-medium text-sm text-[#4B564C] pt-1">
                                  <span>Total bruto</span>
                                  <span className="font-mono">{fmtMoeda(totalBruto)}</span>
                                </div>

                                {/* Loss / Returns Inputs */}
                                <div className="mt-3 bg-[#EEF1E9]/40 border border-[#D8D9C9] rounded-lg p-3">
                                  <label className="block text-xs font-bold uppercase tracking-wider text-[#A6432F] mb-2">
                                    Perda / devolução por produto (quantidade)
                                  </label>
                                  <div className="space-y-2">
                                    {pedido.itens.map(it => {
                                      const info = getProdutoInfo(it.codigo, produtos);
                                      const devQtd = pedido.devolucoes?.[it.codigo] ?? '';

                                      return (
                                        <div
                                          key={it.codigo}
                                          className="flex items-center justify-between gap-3 text-xs"
                                        >
                                          <span className="text-[#132A1D] font-medium truncate">
                                            {info.descricao}{' '}
                                            <span className="text-[#4B564C]">
                                              (entregue: {it.quantidade})
                                            </span>
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            max={it.quantidade}
                                            step="1"
                                            value={devQtd}
                                            onChange={e => {
                                              const digitado = parseFloat(e.target.value) || 0;
                                              // Nunca permite lançar perda/devolução maior do
                                              // que a quantidade realmente entregue.
                                              const qtdValida = Math.max(0, Math.min(digitado, it.quantidade));
                                              onUpdateDevolucao(pedido.id, it.codigo, qtdValida);
                                            }}
                                            placeholder="0"
                                            className="w-16 px-2 py-1 text-center font-mono text-xs bg-white border border-[#D8D9C9] rounded focus:outline-none focus:ring-1 focus:ring-[#A6432F]"
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="flex items-center justify-between text-xs text-[#A6432F] font-semibold mt-2 pt-2 border-t border-[#D8D9C9]/60">
                                    <span>Valor total da perda:</span>
                                    <span className="font-mono">{fmtMoeda(totalDevolucao)}</span>
                                  </div>
                                </div>

                                {/* Net Total */}
                                <div className="flex items-center justify-between font-bold text-base text-[#132A1D] mt-3 pt-2 border-t border-[#D8D9C9]">
                                  <span>Líquido a receber</span>
                                  <span className="font-mono text-lg text-[#1F3D2B]">
                                    {fmtMoeda(liquido)}
                                  </span>
                                </div>

                                {/* Invoice number and access key info */}
                                {pedido.notaNumero && (
                                  <div className="font-mono text-xs text-[#4B564C] bg-[#EEF1E9]/60 p-2 rounded border border-[#D8D9C9] mt-3">
                                    <span className="font-bold text-[#132A1D]">
                                      Nota nº {pedido.notaNumero}
                                    </span>
                                    {pedido.notaChave && (
                                      <span className="ml-2 opacity-80">
                                        · chave ...{pedido.notaChave.slice(-8)}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Ticket Actions */}
                                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-[#D8D9C9]/60">
                                  <button
                                    onClick={() => onVerFichaNota(pedido.id)}
                                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-[#132A1D] bg-[#EEF1E9] hover:bg-[#1F3D2B] hover:text-white border border-[#1F3D2B] rounded-lg transition-colors shadow-sm"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    Ver ficha da nota NFP-e
                                  </button>
                                  <button
                                    onClick={() => onReabrirPedido(pedido.id)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#4B564C] hover:text-[#132A1D] bg-white hover:bg-[#EEF1E9] border border-[#D8D9C9] rounded-lg transition-colors"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Reabrir pedido
                                  </button>
                                  <button
                                    onClick={() => onExcluirPedido(pedido.id)}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#A6432F] hover:bg-[#FDF4F2] border border-[#A6432F]/30 rounded-lg transition-colors ml-auto"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Excluir
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
