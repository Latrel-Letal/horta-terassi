import React, { useState } from 'react';
import { FileBarChart2, Filter, RotateCcw, Calendar, CheckCircle2 } from 'lucide-react';
import { Cliente, Pedido, PrecosOverrides, Produto } from '../types';
import {
  calcularDevolucaoTotal,
  calcularTotalPedido,
  fmtData,
  fmtMoeda,
  getPrecoItem,
  getProdutoInfo
} from '../utils/formatters';

interface RelatorioMercadoTabProps {
  pedidos: Pedido[];
  clientes: Cliente[];
  produtos: Produto[];
  precosOverrides: PrecosOverrides;
  onVerFichaNota: (pedidoId: string) => void;
}

export const RelatorioMercadoTab: React.FC<RelatorioMercadoTabProps> = ({
  pedidos,
  clientes,
  produtos,
  precosOverrides,
  onVerFichaNota,
}) => {
  const [relDe, setRelDe] = useState('');
  const [relAte, setRelAte] = useState('');

  const getClienteNome = (id: string) => {
    const c = clientes.find(x => x.id === id);
    return c ? (c.apelido || c.nome) : '(removido)';
  };

  const entregues = pedidos.filter(
    p =>
      p.status === 'entregue' &&
      (!relDe || (p.dataEntrega || p.data) >= relDe) &&
      (!relAte || (p.dataEntrega || p.data) <= relAte)
  );

  const porCliente: Record<string, { pedidos: number; bruto: number; devolucao: number }> = {};
  entregues.forEach(p => {
    const total = calcularTotalPedido(p, produtos, precosOverrides);
    const dev = calcularDevolucaoTotal(p, produtos, precosOverrides);
    if (!porCliente[p.clienteId]) {
      porCliente[p.clienteId] = { pedidos: 0, bruto: 0, devolucao: 0 };
    }
    porCliente[p.clienteId].pedidos++;
    porCliente[p.clienteId].bruto += total;
    porCliente[p.clienteId].devolucao += dev;
  });

  const ids = Object.keys(porCliente).sort((a, b) =>
    getClienteNome(a).localeCompare(getClienteNome(b), 'pt-BR')
  );

  let totBruto = 0;
  let totDev = 0;
  let totLiq = 0;

  ids.forEach(id => {
    const d = porCliente[id];
    totBruto += d.bruto;
    totDev += d.devolucao;
    totLiq += d.bruto - d.devolucao;
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-[#D8D9C9] pb-3">
        <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0 flex items-center gap-2">
          <FileBarChart2 className="w-6 h-6 text-[#1F3D2B]" />
          Relatório financeiro por mercado
        </h2>
        <p className="text-xs text-[#4B564C] mt-0.5">
          Resumo de faturamento de pedidos entregues, deduções de perda e saldo líquido a receber por cliente.
        </p>
      </div>

      {/* Date Filter Card */}
      <div className="bg-white border border-[#D8D9C9] rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
              De
            </label>
            <input
              type="date"
              value={relDe}
              onChange={e => setRelDe(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
              Até
            </label>
            <input
              type="date"
              value={relAte}
              onChange={e => setRelAte(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setRelDe('');
                setRelAte('');
              }}
              className="w-full py-2 px-3 text-xs font-semibold text-[#4B564C] hover:text-[#132A1D] bg-[#EEF1E9] hover:bg-[#D8D9C9] rounded-lg transition-colors"
            >
              Limpar datas
            </button>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white border border-[#D8D9C9] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#EEF1E9] border-b-2 border-[#1F3D2B] text-xs uppercase font-bold text-[#4B564C] tracking-wider font-mono">
              <tr>
                <th className="py-3 px-4">Mercado</th>
                <th className="py-3 px-4 text-center">Pedidos</th>
                <th className="py-3 px-4 text-right">Total Bruto</th>
                <th className="py-3 px-4 text-right">Devolução</th>
                <th className="py-3 px-4 text-right">Líquido a receber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D8D9C9]">
              {ids.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[#4B564C]">
                    Nenhum pedido entregue encontrado no período selecionado.
                  </td>
                </tr>
              ) : (
                ids.map(id => {
                  const d = porCliente[id];
                  const liq = d.bruto - d.devolucao;

                  return (
                    <tr key={id} className="hover:bg-[#EEF1E9]/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-[#132A1D]">
                        {getClienteNome(id)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs">
                        {d.pedidos}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#4B564C]">
                        {fmtMoeda(d.bruto)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[#A6432F]">
                        {fmtMoeda(d.devolucao)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#1F3D2B]">
                        {fmtMoeda(liq)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {ids.length > 0 && (
              <tfoot className="bg-[#E7F0E3] border-t-2 border-[#1F3D2B] font-bold text-sm text-[#1F3D2B]">
                <tr>
                  <td className="py-3.5 px-4">Total consolidado</td>
                  <td className="py-3.5 px-4 text-center font-mono">{entregues.length}</td>
                  <td className="py-3.5 px-4 text-right font-mono">{fmtMoeda(totBruto)}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-[#A6432F]">{fmtMoeda(totDev)}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-base">{fmtMoeda(totLiq)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Delivered Orders Details */}
      {entregues.length > 0 && (
        <div className="pt-4 border-t border-[#D8D9C9] space-y-4">
          <h3 className="text-lg font-bold text-[#132A1D] m-0">
            Detalhamento dos pedidos entregues ({entregues.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entregues.map(p => {
              const bruto = calcularTotalPedido(p, produtos, precosOverrides);
              const dev = calcularDevolucaoTotal(p, produtos, precosOverrides);
              const liq = bruto - dev;

              return (
                <div
                  key={p.id}
                  className="bg-white border border-[#D8D9C9] rounded-xl p-4 shadow-sm hover:border-[#1F3D2B]/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-serif font-bold text-base text-[#132A1D] m-0">
                          {getClienteNome(p.clienteId)}
                        </h4>
                        <div className="font-mono text-xs text-[#4B564C] mt-0.5">
                          Pedido de {fmtData(p.data)}
                          {p.dataEntrega && ` · Entregue em ${fmtData(p.dataEntrega)}`}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#1F3D2B] bg-[#5E8F52]/15 px-2.5 py-0.5 rounded-full">
                        {fmtMoeda(liq)}
                      </span>
                    </div>

                    <ul className="text-xs divide-y divide-[#EEF1E9] my-3 border-t border-b border-[#EEF1E9]">
                      {p.itens.map((it, idx) => {
                        const info = getProdutoInfo(it.codigo, produtos);
                        const devQtd = p.devolucoes?.[it.codigo] || 0;
                        const preco = getPrecoItem(p, it, produtos, precosOverrides);

                        return (
                          <li key={idx} className="py-1.5 flex items-center justify-between text-[#1B2420]">
                            <span>
                              {it.quantidade}x {info.descricao}
                              {devQtd > 0 && (
                                <span className="text-[#A6432F] font-semibold ml-1">
                                  ({devQtd} dev.)
                                </span>
                              )}
                            </span>
                            <span className="font-mono font-medium text-[#4B564C]">
                              {fmtMoeda(preco * (it.quantidade - devQtd))}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#D8D9C9]/50">
                    <span className="text-xs text-[#4B564C] font-mono">
                      {p.notaNumero ? `Nota nº ${p.notaNumero}` : 'Sem nota lançada'}
                    </span>
                    <button
                      onClick={() => onVerFichaNota(p.id)}
                      className="px-3 py-1.5 text-xs font-bold text-[#132A1D] bg-[#EEF1E9] hover:bg-[#1F3D2B] hover:text-white rounded-lg transition-colors"
                    >
                      Ficha NFP-e
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
