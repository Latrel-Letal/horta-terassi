import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, ShoppingCart, Calendar, Store, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Cliente, ItemPedido, Pedido, PrecosOverrides, Produto } from '../types';
import { fmtMoeda, getPrecoProduto, hojeISO } from '../utils/formatters';
import { PromocaoBadge } from './PromocaoBadge';
import { PromocaoResolvida } from '../hooks/usePromocaoDoDia';

interface NovoPedidoTabProps {
  clientes: Cliente[];
  produtos: Produto[];
  precosOverrides: PrecosOverrides;
  getPromocaoPara: (clienteId: string, itemKey: string) => PromocaoResolvida | null;
  onSalvarPedido: (pedido: Omit<Pedido, 'id'>) => void;
  pedidoEmEdicao?: Pedido | null;
  onCancelarEdicao?: () => void;
}

export const NovoPedidoTab: React.FC<NovoPedidoTabProps> = ({
  clientes,
  produtos,
  precosOverrides,
  getPromocaoPara,
  onSalvarPedido,
  pedidoEmEdicao,
  onCancelarEdicao,
}) => {
  const [clienteId, setClienteId] = useState<string>('');
  const [clienteBusca, setClienteBusca] = useState<string>('');
  const [clienteOpen, setClienteOpen] = useState<boolean>(false);
  const [data, setData] = useState<string>(hojeISO());
  const [dataEntrega, setDataEntrega] = useState<string>(hojeISO());

  // Quantities for standard species grid (index in produtos -> number)
  const [gridQuantidades, setGridQuantidades] = useState<Record<number, number>>({});

  // Extra loose items
  const [itensAvulsos, setItensAvulsos] = useState<{ codigo: string; quantidade: number }[]>([]);

  // Initialize form when editing
  useEffect(() => {
    if (pedidoEmEdicao) {
      setClienteId(pedidoEmEdicao.clienteId);
      const c = clientes.find(x => x.id === pedidoEmEdicao.clienteId);
      setClienteBusca(c ? (c.apelido || c.nome) : '');
      setData(pedidoEmEdicao.data);
      setDataEntrega(pedidoEmEdicao.dataEntrega || pedidoEmEdicao.data);

      const novaGrid: Record<number, number> = {};
      const novosAvulsos: { codigo: string; quantidade: number }[] = [];

      pedidoEmEdicao.itens.forEach(it => {
        const idx = produtos.findIndex(p => (p.codigo || `DESC:${p.descricao}`) === it.codigo);
        if (idx >= 0) {
          novaGrid[idx] = it.quantidade;
        } else {
          novosAvulsos.push({ codigo: it.codigo, quantidade: it.quantidade });
        }
      });

      setGridQuantidades(novaGrid);
      setItensAvulsos(novosAvulsos);
    } else {
      if (clientes.length > 0 && !clienteId) {
        setClienteId(clientes[0].id);
        setClienteBusca(clientes[0].apelido || clientes[0].nome);
      }
    }
  }, [pedidoEmEdicao, clientes]);

  const handleGridQtdChange = (index: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setGridQuantidades(prev => {
      const next = { ...prev };
      if (val > 0) next[index] = val;
      else delete next[index];
      return next;
    });
  };

  const handleAddItemAvulso = () => {
    if (produtos.length === 0) return;
    setItensAvulsos(prev => [
      ...prev,
      { codigo: produtos[0].codigo || `DESC:${produtos[0].descricao}`, quantidade: 1 },
    ]);
  };

  const handleRemoveItemAvulso = (index: number) => {
    setItensAvulsos(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemAvulsoChange = (index: number, field: 'codigo' | 'quantidade', val: any) => {
    setItensAvulsos(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Resolve o preço final de um item: usa a promoção ativa do dia (se houver
  // uma pra esse cliente + produto) em vez do preço padrão/override, e sinaliza
  // isso pra ser gravado junto no pedido (pra aparecer na nota e não gerar
  // conflito de preço no total).
  const resolverPreco = (itemKey: string): { preco: number; emPromocao: boolean } => {
    const promo = getPromocaoPara(clienteId, itemKey);
    if (promo) {
      return { preco: promo.preco, emPromocao: true };
    }
    return { preco: getPrecoProduto(clienteId, itemKey, produtos, precosOverrides), emPromocao: false };
  };

  // Calculate live totals
  let totalEstimado = 0;
  let totalItensCount = 0;

  produtos.forEach((p, idx) => {
    const qtd = gridQuantidades[idx] || 0;
    if (qtd > 0) {
      const itemKey = p.codigo || `DESC:${p.descricao}`;
      const unit = resolverPreco(itemKey).preco;
      totalEstimado += unit * qtd;
      totalItensCount += qtd;
    }
  });

  itensAvulsos.forEach(it => {
    if (it.quantidade > 0 && it.codigo) {
      const unit = resolverPreco(it.codigo).preco;
      totalEstimado += unit * it.quantidade;
      totalItensCount += it.quantidade;
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) {
      alert('Selecione o cliente / mercado.');
      return;
    }

    const itensParaSalvar: ItemPedido[] = [];

    produtos.forEach((p, idx) => {
      const qtd = gridQuantidades[idx] || 0;
      if (qtd > 0) {
        const itemKey = p.codigo || `DESC:${p.descricao}`;
        const { preco, emPromocao } = resolverPreco(itemKey);
        itensParaSalvar.push({
          codigo: itemKey,
          quantidade: qtd,
          precoUnit: preco,
          emPromocao,
        });
      }
    });

    itensAvulsos.forEach(it => {
      if (it.quantidade > 0 && it.codigo) {
        const { preco, emPromocao } = resolverPreco(it.codigo);
        itensParaSalvar.push({
          codigo: it.codigo,
          quantidade: it.quantidade,
          precoUnit: preco,
          emPromocao,
        });
      }
    });

    if (itensParaSalvar.length === 0) {
      alert('Preencha a quantidade de ao menos uma espécie de verdura ou hortaliça.');
      return;
    }

    // Trigger confetti on successful order launch
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.75 },
      colors: ['#1F3D2B', '#5E8F52', '#C08A2E', '#EEF1E9']
    });

    onSalvarPedido({
      clienteId,
      data,
      dataEntrega,
      itens: itensParaSalvar,
      status: 'pendente',
    });

    // Reset fields if not editing
    if (!pedidoEmEdicao) {
      setGridQuantidades({});
      setItensAvulsos([]);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#D8D9C9] pb-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0">
            {pedidoEmEdicao ? 'Editar pedido' : 'Lançar novo pedido'}
          </h2>
          <p className="text-xs text-[#4B564C] mt-0.5">
            Preencha apenas as quantidades que forem colhidas e carregadas no veículo.
          </p>
        </div>

        {pedidoEmEdicao && onCancelarEdicao && (
          <button
            type="button"
            onClick={onCancelarEdicao}
            className="px-3.5 py-1.5 text-xs font-bold text-[#4B564C] hover:text-[#A6432F] bg-white border border-[#D8D9C9] rounded-lg transition-colors"
          >
            Cancelar edição
          </button>
        )}
      </div>

      <div className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm space-y-5">
        {/* Row 1: Client & Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1.5 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-[#5E8F52]" />
              Cliente / Mercado
            </label>
            <input
              type="text"
              value={clienteBusca}
              onChange={e => {
                setClienteBusca(e.target.value);
                setClienteOpen(true);
              }}
              onFocus={() => setClienteOpen(true)}
              placeholder="Digite o apelido ou razão social..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              required
            />
            {clienteOpen && (
              <div className="absolute top-full left-0 right-0 z-40 bg-white border border-[#D8D9C9] rounded-lg shadow-xl max-h-52 overflow-y-auto mt-1 divide-y divide-[#EEF1E9]">
                {clientes
                  .filter(c =>
                    (c.apelido || c.nome).toLowerCase().includes(clienteBusca.toLowerCase())
                  )
                  .map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setClienteId(c.id);
                        setClienteBusca(c.apelido || c.nome);
                        setClienteOpen(false);
                      }}
                      className="px-3.5 py-2.5 text-sm hover:bg-[#1F3D2B] hover:text-white cursor-pointer transition-colors"
                    >
                      <div className="font-semibold">{c.apelido || c.nome}</div>
                      {c.bairro && (
                        <div className="text-xs opacity-75">{c.bairro} — {c.municipio}</div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#5E8F52]" />
              Data do pedido
            </label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#5E8F52]" />
              Data da entrega
            </label>
            <input
              type="date"
              value={dataEntrega}
              onChange={e => setDataEntrega(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              required
            />
          </div>
        </div>

        {/* Species Grid (Talão Order Checklist) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C]">
              Espécies — preencha só as quantidades que forem sair
            </label>
            <span className="text-xs text-[#4B564C]">
              Preços calculados para: <strong className="text-[#132A1D]">{clienteBusca || 'Padrão'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 bg-white border border-[#D8D9C9] rounded-xl p-3 md:p-4">
            {produtos.map((p, idx) => {
              const itemKey = p.codigo || `DESC:${p.descricao}`;
              const { preco: precoUnit, emPromocao } = resolverPreco(itemKey);
              const qtd = gridQuantidades[idx] || '';

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 py-2 border-b border-dashed border-[#D8D9C9] last:border-b-0 hover:bg-[#EEF1E9]/30 px-2 rounded-md transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-sm font-medium text-[#132A1D] flex items-center gap-2 flex-wrap">
                      <span className="truncate">{p.descricao}</span>
                      {emPromocao && <PromocaoBadge />}
                    </span>
                    <span className="text-xs text-[#4B564C] font-mono">
                      · {fmtMoeda(precoUnit)} / {p.unidade}
                    </span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={qtd}
                    onChange={e => handleGridQtdChange(idx, e.target.value)}
                    className="w-18 px-2.5 py-1.5 text-center font-mono font-bold text-sm bg-[#FFFFFF] border-1.5 border-[#D8D9C9] focus:border-[#5E8F52] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]/30 shrink-0"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Loose Extra Items */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-2">
            Item avulso (algo fora da lista acima)
          </label>

          <div className="space-y-2">
            {itensAvulsos.map((it, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_100px_40px] sm:grid-cols-[1fr_120px_44px] gap-2 items-center bg-[#EEF1E9]/40 p-2.5 rounded-lg border border-[#D8D9C9]"
              >
                <div>
                  <select
                    value={it.codigo}
                    onChange={e => handleItemAvulsoChange(index, 'codigo', e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
                  >
                    {produtos.map(p => (
                      <option key={p.codigo || p.descricao} value={p.codigo || `DESC:${p.descricao}`}>
                        {p.descricao}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={it.quantidade || ''}
                    onChange={e =>
                      handleItemAvulsoChange(index, 'quantidade', parseFloat(e.target.value) || 0)
                    }
                    placeholder="Qtd"
                    className="w-full px-3 py-2 text-center font-mono text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveItemAvulso(index)}
                  className="h-10 flex items-center justify-center text-[#A6432F] hover:bg-[#FDF4F2] border border-[#D8D9C9] rounded-lg transition-colors"
                  title="Remover item avulso"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItemAvulso}
            className="w-full mt-2 py-2.5 px-4 border-1.5 border-dashed border-[#D8D9C9] hover:border-[#1F3D2B] rounded-lg text-xs font-bold text-[#1F3D2B] hover:bg-[#1F3D2B]/5 transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Adicionar item avulso
          </button>
        </div>

        {/* Live Estimate & Submit */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#D8D9C9]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#5E8F52]/15 flex items-center justify-center text-[#1F3D2B]">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#4B564C] uppercase tracking-wider">
                Total estimado ({totalItensCount} unidades)
              </div>
              <div className="font-serif font-bold text-2xl text-[#132A1D]">
                {fmtMoeda(totalEstimado)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold text-white bg-[#1F3D2B] hover:bg-[#132A1D] rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#5E8F52]" />
              <span>{pedidoEmEdicao ? 'Salvar alterações' : 'Confirmar e lançar pedido'}</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
