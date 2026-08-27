import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { TrendingDown, DollarSign, Filter, BarChart3, AlertOctagon } from 'lucide-react';
import { Cliente, Pedido, PrecosOverrides, Produto } from '../types';
import { fmtData, fmtMoeda, getPrecoItem, getProdutoInfo } from '../utils/formatters';

Chart.register(...registerables);

interface PerdasTabProps {
  pedidos: Pedido[];
  clientes: Cliente[];
  produtos: Produto[];
  precosOverrides: PrecosOverrides;
}

export const PerdasTab: React.FC<PerdasTabProps> = ({
  pedidos,
  clientes,
  produtos,
  precosOverrides,
}) => {
  // Filters
  const [pdDe, setPdDe] = useState('');
  const [pdAte, setPdAte] = useState('');
  const [pdProduto, setPdProduto] = useState('');
  const [pdMercado, setPdMercado] = useState('');
  const [pdAgrupar, setPdAgrupar] = useState<'produto' | 'mercado'>('produto');
  const [pdMetrica, setPdMetrica] = useState<'quantidade' | 'valor'>('quantidade');

  const [arAgrupar, setArAgrupar] = useState<'produto' | 'mercado'>('produto');
  const [arMetrica, setArMetrica] = useState<'quantidade' | 'valor'>('valor');

  const chartPerdasRef = useRef<HTMLCanvasElement | null>(null);
  const chartArrecadadoRef = useRef<HTMLCanvasElement | null>(null);
  const chartPerdasInstance = useRef<Chart | null>(null);
  const chartArrecadadoInstance = useRef<Chart | null>(null);

  const getClienteNome = (id: string) => {
    const c = clientes.find(x => x.id === id);
    return c ? (c.apelido || c.nome) : '(removido)';
  };

  // Collect Losses Data
  const registrosPerdas: {
    data: string;
    clienteId: string;
    clienteNome: string;
    produtoDescricao: string;
    quantidade: number;
    valor: number;
  }[] = [];

  pedidos
    .filter(
      p =>
        p.status === 'entregue' &&
        (!pdDe || (p.dataEntrega || p.data) >= pdDe) &&
        (!pdAte || (p.dataEntrega || p.data) <= pdAte)
    )
    .forEach(p => {
      const dev = p.devolucoes || {};
      p.itens.forEach(it => {
        const qtd = dev[it.codigo] || 0;
        if (qtd <= 0) return;
        if (pdProduto && it.codigo !== pdProduto) return;
        if (pdMercado && p.clienteId !== pdMercado) return;

        const info = getProdutoInfo(it.codigo, produtos);
        const preco = getPrecoItem(p, it, produtos, precosOverrides);
        registrosPerdas.push({
          data: p.dataEntrega || p.data,
          clienteId: p.clienteId,
          clienteNome: getClienteNome(p.clienteId),
          produtoDescricao: info.descricao,
          quantidade: qtd,
          valor: qtd * preco,
        });
      });
    });

  // Collect Net Revenue Data (Arrecadação Efetiva)
  const registrosArrecadado: {
    data: string;
    clienteId: string;
    clienteNome: string;
    produtoDescricao: string;
    quantidade: number;
    valor: number;
  }[] = [];

  pedidos
    .filter(
      p =>
        p.status === 'entregue' &&
        (!pdDe || (p.dataEntrega || p.data) >= pdDe) &&
        (!pdAte || (p.dataEntrega || p.data) <= pdAte)
    )
    .forEach(p => {
      const dev = p.devolucoes || {};
      p.itens.forEach(it => {
        if (pdProduto && it.codigo !== pdProduto) return;
        if (pdMercado && p.clienteId !== pdMercado) return;

        const perdido = dev[it.codigo] || 0;
        const qtdLiquida = it.quantidade - perdido;
        if (qtdLiquida <= 0) return;

        const info = getProdutoInfo(it.codigo, produtos);
        const preco = getPrecoItem(p, it, produtos, precosOverrides);
        registrosArrecadado.push({
          data: p.dataEntrega || p.data,
          clienteId: p.clienteId,
          clienteNome: getClienteNome(p.clienteId),
          produtoDescricao: info.descricao,
          quantidade: qtdLiquida,
          valor: qtdLiquida * preco,
        });
      });
    });

  // Update Charts when data or config changes
  useEffect(() => {
    // 1. Render Losses Chart
    if (chartPerdasRef.current) {
      const gruposPerdas: Record<string, { quantidade: number; valor: number }> = {};
      registrosPerdas.forEach(r => {
        const chave = pdAgrupar === 'produto' ? r.produtoDescricao : r.clienteNome;
        if (!gruposPerdas[chave]) gruposPerdas[chave] = { quantidade: 0, valor: 0 };
        gruposPerdas[chave].quantidade += r.quantidade;
        gruposPerdas[chave].valor += r.valor;
      });

      const labels = Object.keys(gruposPerdas).sort(
        (a, b) => gruposPerdas[b][pdMetrica] - gruposPerdas[a][pdMetrica]
      );
      const dataValues = labels.map(l => gruposPerdas[l][pdMetrica]);

      if (chartPerdasInstance.current) {
        chartPerdasInstance.current.destroy();
      }

      const ctx = chartPerdasRef.current.getContext('2d');
      if (ctx) {
        chartPerdasInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: pdMetrica === 'quantidade' ? 'Quantidade perdida' : 'Valor perdido (R$)',
                data: dataValues,
                backgroundColor: '#A6432F',
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: { beginAtZero: true },
            },
          },
        });
      }
    }

    // 2. Render Revenue Chart
    if (chartArrecadadoRef.current) {
      const gruposArrecadado: Record<string, { quantidade: number; valor: number }> = {};
      registrosArrecadado.forEach(r => {
        const chave = arAgrupar === 'produto' ? r.produtoDescricao : r.clienteNome;
        if (!gruposArrecadado[chave]) gruposArrecadado[chave] = { quantidade: 0, valor: 0 };
        gruposArrecadado[chave].quantidade += r.quantidade;
        gruposArrecadado[chave].valor += r.valor;
      });

      const labels = Object.keys(gruposArrecadado).sort(
        (a, b) => gruposArrecadado[b][arMetrica] - gruposArrecadado[a][arMetrica]
      );
      const dataValues = labels.map(l => gruposArrecadado[l][arMetrica]);

      if (chartArrecadadoInstance.current) {
        chartArrecadadoInstance.current.destroy();
      }

      const ctx = chartArrecadadoRef.current.getContext('2d');
      if (ctx) {
        chartArrecadadoInstance.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels,
            datasets: [
              {
                label: arMetrica === 'quantidade' ? 'Quantidade vendida' : 'Valor arrecadado (R$)',
                data: dataValues,
                backgroundColor: '#1F3D2B',
                borderRadius: 6,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
            },
            scales: {
              y: { beginAtZero: true },
            },
          },
        });
      }
    }

    return () => {
      if (chartPerdasInstance.current) chartPerdasInstance.current.destroy();
      if (chartArrecadadoInstance.current) chartArrecadadoInstance.current.destroy();
    };
  }, [registrosPerdas, registrosArrecadado, pdAgrupar, pdMetrica, arAgrupar, arMetrica]);

  // Totals
  const totalPerdaQtd = registrosPerdas.reduce((s, r) => s + r.quantidade, 0);
  const totalPerdaValor = registrosPerdas.reduce((s, r) => s + r.valor, 0);

  const totalArrecadadoQtd = registrosArrecadado.reduce((s, r) => s + r.quantidade, 0);
  const totalArrecadadoValor = registrosArrecadado.reduce((s, r) => s + r.valor, 0);

  return (
    <div className="space-y-8">
      {/* SECTION 1: PERDAS / DEVOLUÇÕES */}
      <div>
        <div className="border-b border-[#D8D9C9] pb-3 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0 flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-[#A6432F]" />
            Perdas e devoluções
          </h2>
          <p className="text-xs text-[#4B564C] mt-0.5">
            Quantidade e valor perdido calculados a partir das devoluções lançadas nos pedidos entregues.
          </p>
        </div>

        {/* Filters Card */}
        <div className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm space-y-4 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                De
              </label>
              <input
                type="date"
                value={pdDe}
                onChange={e => setPdDe(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Até
              </label>
              <input
                type="date"
                value={pdAte}
                onChange={e => setPdAte(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Produto
              </label>
              <select
                value={pdProduto}
                onChange={e => setPdProduto(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              >
                <option value="">Todos os produtos</option>
                {produtos.map(p => (
                  <option key={p.codigo || p.descricao} value={p.codigo || `DESC:${p.descricao}`}>
                    {p.descricao}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Mercado
              </label>
              <select
                value={pdMercado}
                onChange={e => setPdMercado(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
              >
                <option value="">Todos os mercados</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.apelido || c.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#D8D9C9]/50">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Gráfico agrupado por
              </label>
              <select
                value={pdAgrupar}
                onChange={e => setPdAgrupar(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg"
              >
                <option value="produto">Produto</option>
                <option value="mercado">Mercado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Métrica do gráfico
              </label>
              <select
                value={pdMetrica}
                onChange={e => setPdMetrica(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg"
              >
                <option value="quantidade">Quantidade perdida (unidades)</option>
                <option value="valor">Valor financeiro perdido (R$)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chart Card */}
        <div className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm mb-5">
          <div className="h-64 relative w-full">
            <canvas ref={chartPerdasRef} />
          </div>
        </div>

        {/* Detailed Table */}
        <div className="bg-white border border-[#D8D9C9] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#EEF1E9] border-b-2 border-[#1F3D2B] text-xs uppercase font-bold text-[#4B564C] tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Mercado</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4 text-center">Qtd. perdida</th>
                  <th className="py-3 px-4 text-right">Valor perdido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D9C9]">
                {registrosPerdas.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-[#4B564C]">
                      Nenhuma perda registrada no período/filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  registrosPerdas
                    .sort((a, b) => b.data.localeCompare(a.data))
                    .map((r, i) => (
                      <tr key={i} className="hover:bg-[#EEF1E9]/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-xs text-[#4B564C]">{fmtData(r.data)}</td>
                        <td className="py-2.5 px-4 font-medium text-[#132A1D]">{r.clienteNome}</td>
                        <td className="py-2.5 px-4 text-[#1B2420]">{r.produtoDescricao}</td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-[#A6432F]">
                          {r.quantidade}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-[#A6432F]">
                          {fmtMoeda(r.valor)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
              {registrosPerdas.length > 0 && (
                <tfoot className="bg-[#FDF4F2] border-t-2 border-[#A6432F] font-bold text-sm text-[#A6432F]">
                  <tr>
                    <td colSpan={3} className="py-3 px-4">Total de perdas</td>
                    <td className="py-3 px-4 text-center font-mono">{totalPerdaQtd} un.</td>
                    <td className="py-3 px-4 text-right font-mono">{fmtMoeda(totalPerdaValor)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: ARRECADAÇÃO (RECEITA LÍQUIDA) */}
      <div className="pt-4 border-t-2 border-[#1F3D2B]/20">
        <div className="border-b border-[#D8D9C9] pb-3 mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-[#5E8F52]" />
            Arrecadação e vendas efetivas
          </h2>
          <p className="text-xs text-[#4B564C] mt-0.5">
            Quantidade e valor efetivamente entregues e faturados (já descontando todas as devoluções).
          </p>
        </div>

        {/* Revenue Filters */}
        <div className="bg-white border border-[#D8D9C9] rounded-xl p-4 shadow-sm mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Gráfico agrupado por
              </label>
              <select
                value={arAgrupar}
                onChange={e => setArAgrupar(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg"
              >
                <option value="produto">Produto</option>
                <option value="mercado">Mercado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
                Métrica do gráfico
              </label>
              <select
                value={arMetrica}
                onChange={e => setArMetrica(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg"
              >
                <option value="quantidade">Quantidade vendida (unidades)</option>
                <option value="valor">Valor arrecadado (R$)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm mb-5">
          <div className="h-64 relative w-full">
            <canvas ref={chartArrecadadoRef} />
          </div>
        </div>

        {/* Revenue Table */}
        <div className="bg-white border border-[#D8D9C9] rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#EEF1E9] border-b-2 border-[#1F3D2B] text-xs uppercase font-bold text-[#4B564C] tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Mercado</th>
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4 text-center">Qtd. vendida</th>
                  <th className="py-3 px-4 text-right">Valor arrecadado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8D9C9]">
                {registrosArrecadado.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-xs text-[#4B564C]">
                      Nenhuma arrecadação registrada no período/filtro selecionado.
                    </td>
                  </tr>
                ) : (
                  registrosArrecadado
                    .sort((a, b) => b.data.localeCompare(a.data))
                    .map((r, i) => (
                      <tr key={i} className="hover:bg-[#EEF1E9]/30 transition-colors">
                        <td className="py-2.5 px-4 font-mono text-xs text-[#4B564C]">{fmtData(r.data)}</td>
                        <td className="py-2.5 px-4 font-medium text-[#132A1D]">{r.clienteNome}</td>
                        <td className="py-2.5 px-4 text-[#1B2420]">{r.produtoDescricao}</td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-[#1F3D2B]">
                          {r.quantidade}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-[#1F3D2B]">
                          {fmtMoeda(r.valor)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
              {registrosArrecadado.length > 0 && (
                <tfoot className="bg-[#E7F0E3] border-t-2 border-[#1F3D2B] font-bold text-sm text-[#1F3D2B]">
                  <tr>
                    <td colSpan={3} className="py-3 px-4">Total faturado líquido</td>
                    <td className="py-3 px-4 text-center font-mono">{totalArrecadadoQtd} un.</td>
                    <td className="py-3 px-4 text-right font-mono">{fmtMoeda(totalArrecadadoValor)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
