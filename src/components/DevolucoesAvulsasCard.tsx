import React, { useState } from 'react';
import { PackageMinus, Plus, Trash2 } from 'lucide-react';
import { Cliente, DevolucaoAvulsa, PrecosOverrides, Produto } from '../types';
import {
  calcularValorDevolucaoAvulsa,
  fmtData,
  fmtMoeda,
  getPrecoProduto,
  getProdutoInfo,
  hojeISO,
} from '../utils/formatters';

interface Linha {
  codigo: string;
  quantidade: string;
  preco: string;
}

interface Props {
  clientes: Cliente[];
  produtos: Produto[];
  precosOverrides: PrecosOverrides;
  devolucoes: DevolucaoAvulsa[];
  onSalvar: (dev: Omit<DevolucaoAvulsa, 'id'>) => Promise<void> | void;
  onExcluir: (id: string) => void;
}

const LINHA_VAZIA: Linha = { codigo: '', quantidade: '', preco: '' };

const num = (txt: string) => parseFloat(String(txt).replace(',', '.'));

export const DevolucoesAvulsasCard: React.FC<Props> = ({
  clientes,
  produtos,
  precosOverrides,
  devolucoes,
  onSalvar,
  onExcluir,
}) => {
  const [data, setData] = useState(hojeISO());
  const [clienteId, setClienteId] = useState('');
  const [linhas, setLinhas] = useState<Linha[]>([{ ...LINHA_VAZIA }]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const nomeCliente = (id: string) => {
    const c = clientes.find(x => x.id === id);
    return c ? c.apelido || c.nome : '(removido)';
  };

  const precoPadrao = (cid: string, codigo: string) =>
    codigo && cid ? getPrecoProduto(cid, codigo, produtos, precosOverrides).toFixed(2).replace('.', ',') : '';

  const atualizarLinha = (idx: number, patch: Partial<Linha>) =>
    setLinhas(ls => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const trocarMercado = (cid: string) => {
    setClienteId(cid);
    // Reaplica o preço do mercado escolhido nas linhas que já têm produto
    setLinhas(ls => ls.map(l => (l.codigo ? { ...l, preco: precoPadrao(cid, l.codigo) } : l)));
  };

  const trocarProduto = (idx: number, codigo: string) =>
    atualizarLinha(idx, { codigo, preco: precoPadrao(clienteId, codigo) });

  const handleSalvar = async () => {
    setErro('');
    if (!clienteId) return setErro('Escolha o mercado.');
    if (!data) return setErro('Informe a data.');

    const preenchidas = linhas.filter(l => l.codigo || l.quantidade);
    if (preenchidas.length === 0) return setErro('Adicione pelo menos um produto.');

    const itens = [];
    for (const l of preenchidas) {
      const q = num(l.quantidade);
      const p = num(l.preco);
      if (!l.codigo) return setErro('Selecione o produto em todas as linhas.');
      if (isNaN(q) || q <= 0) return setErro('Informe uma quantidade maior que zero em todas as linhas.');
      if (isNaN(p) || p < 0) return setErro('Informe um preço válido em todas as linhas.');
      itens.push({ codigo: l.codigo, quantidade: q, precoUnit: p });
    }

    setSalvando(true);
    try {
      await onSalvar({ clienteId, data, itens });
      setLinhas([{ ...LINHA_VAZIA }]);
    } catch {
      setErro('Não foi possível salvar. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  };

  const recentes = [...devolucoes]
    .sort((a, b) => b.data.localeCompare(a.data) || b.id.localeCompare(a.id))
    .slice(0, 10);

  const inputCls =
    'w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]';
  const labelCls = 'block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1';

  return (
    <div className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm space-y-4 mb-5">
      <div>
        <h3 className="text-base font-bold text-[#132A1D] m-0 flex items-center gap-2">
          <PackageMinus className="w-5 h-5 text-[#A6432F]" />
          Lançar devolução / perda
        </h3>
        <p className="text-xs text-[#4B564C] mt-0.5">
          Lance direto por mercado e produto, sem precisar vincular a um pedido.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Data</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Mercado</label>
          <select value={clienteId} onChange={e => trocarMercado(e.target.value)} className={inputCls}>
            <option value="">Selecione o mercado</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>
                {c.apelido || c.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        {linhas.map((l, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-12 sm:col-span-6">
              {idx === 0 && <label className={labelCls}>Produto</label>}
              <select value={l.codigo} onChange={e => trocarProduto(idx, e.target.value)} className={inputCls}>
                <option value="">Selecione o produto</option>
                {produtos.map(p => (
                  <option key={p.codigo || p.descricao} value={p.codigo || `DESC:${p.descricao}`}>
                    {p.descricao}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-4 sm:col-span-2">
              {idx === 0 && <label className={labelCls}>Qtd.</label>}
              <input
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={l.quantidade}
                onChange={e => atualizarLinha(idx, { quantidade: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="col-span-5 sm:col-span-3">
              {idx === 0 && <label className={labelCls}>Preço un.</label>}
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={l.preco}
                onChange={e => atualizarLinha(idx, { preco: e.target.value })}
                className={inputCls}
              />
            </div>
            <div className="col-span-3 sm:col-span-1 flex justify-end">
              {linhas.length > 1 && (
                <button
                  type="button"
                  onClick={() => setLinhas(ls => ls.filter((_, i) => i !== idx))}
                  className="p-2 text-[#A6432F] hover:bg-[#FDF4F2] rounded-lg"
                  aria-label="Remover linha"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {erro && <p className="text-xs font-semibold text-[#A6432F] m-0">{erro}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setLinhas(ls => [...ls, { ...LINHA_VAZIA }])}
          className="px-3 py-2 text-xs font-semibold text-[#132A1D] bg-[#EEF1E9] hover:bg-[#D8D9C9] rounded-lg flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Adicionar produto
        </button>
        <button
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
          className="px-4 py-2 text-xs font-bold text-white bg-[#1F3D2B] hover:bg-[#132A1D] disabled:opacity-60 rounded-lg"
        >
          {salvando ? 'Salvando...' : 'Lançar devolução'}
        </button>
      </div>

      {recentes.length > 0 && (
        <div className="pt-3 border-t border-[#D8D9C9]/60">
          <div className="text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-2">
            Últimos lançamentos
          </div>
          <ul className="divide-y divide-[#EEF1E9]">
            {recentes.map(d => (
              <li key={d.id} className="py-2 flex items-start justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-[#132A1D]">
                    {nomeCliente(d.clienteId)}{' '}
                    <span className="font-mono font-normal text-[#4B564C]">· {fmtData(d.data)}</span>
                  </div>
                  <div className="text-[#4B564C]">
                    {d.itens.map(it => `${it.quantidade}x ${getProdutoInfo(it.codigo, produtos).descricao}`).join(', ')}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono font-bold text-[#A6432F]">
                    {fmtMoeda(calcularValorDevolucaoAvulsa(d, produtos, precosOverrides))}
                  </span>
                  <button
                    type="button"
                    onClick={() => onExcluir(d.id)}
                    className="p-1.5 text-[#A6432F] hover:bg-[#FDF4F2] rounded-lg"
                    aria-label="Excluir lançamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
