import React, { useState } from 'react';
import { FileSpreadsheet, Printer, Download, Search, X, CheckCircle2 } from 'lucide-react';
import { Cliente, Pedido, PrecosOverrides, Produto, RelatorioVendasClienteGrupo } from '../types';
import { exportarRelatorioProdutosPdf, fmtData, fmtMoeda, getPrecoItem, getProdutoInfo } from '../utils/formatters';

interface RelatorioProdutosTabProps {
  pedidos: Pedido[];
  clientes: Cliente[];
  produtos: Produto[];
  precosOverrides: PrecosOverrides;
  onPrintRelatorio: (htmlContent: string) => void;
  showToast: (msg: string) => void;
}

export const RelatorioProdutosTab: React.FC<RelatorioProdutosTabProps> = ({
  pedidos,
  clientes,
  produtos,
  precosOverrides,
  onPrintRelatorio,
  showToast,
}) => {
  const [rpDe, setRpDe] = useState('');
  const [rpAte, setRpAte] = useState('');
  const [rpCliente, setRpCliente] = useState('');
  const [rpClienteBusca, setRpClienteBusca] = useState('');
  const [rpClienteOpen, setRpClienteOpen] = useState(false);
  const [gerado, setGerado] = useState(true);

  const getClienteNome = (id: string) => {
    const c = clientes.find(x => x.id === id);
    return c ? (c.apelido || c.nome) : '(removido)';
  };

  const coletarVendasPorProduto = (): RelatorioVendasClienteGrupo[] => {
    const entregues = pedidos.filter(
      p =>
        p.status === 'entregue' &&
        (!rpDe || (p.dataEntrega || p.data) >= rpDe) &&
        (!rpAte || (p.dataEntrega || p.data) <= rpAte) &&
        (!rpCliente || p.clienteId === rpCliente)
    );

    const porCliente: Record<string, Record<string, { qtd: number; vlrVen: number; desconto: number }>> = {};

    entregues.forEach(p => {
      const dev = p.devolucoes || {};
      if (!porCliente[p.clienteId]) porCliente[p.clienteId] = {};
      const grupo = porCliente[p.clienteId];

      p.itens.forEach(it => {
        const unit = getPrecoItem(p, it, produtos, precosOverrides);
        const vlrVen = it.quantidade * unit;
        const qtdDev = dev[it.codigo] || 0;
        const desconto = qtdDev * unit;

        if (!grupo[it.codigo]) grupo[it.codigo] = { qtd: 0, vlrVen: 0, desconto: 0 };
        grupo[it.codigo].qtd += it.quantidade;
        grupo[it.codigo].vlrVen += vlrVen;
        grupo[it.codigo].desconto += desconto;
      });
    });

    return Object.keys(porCliente)
      .map(clienteId => {
        const grupo = porCliente[clienteId];
        const produtosLista = Object.keys(grupo)
          .map(codigo => {
            const info = getProdutoInfo(codigo, produtos);
            const d = grupo[codigo];
            const unit = d.qtd > 0 ? d.vlrVen / d.qtd : info.valor;

            return {
              codigo: info.codigo,
              descricao: info.descricao,
              qtd: d.qtd,
              unit,
              vlrVen: d.vlrVen,
              desconto: d.desconto,
              liquido: d.vlrVen - d.desconto,
            };
          })
          .sort((a, b) => a.descricao.localeCompare(b.descricao));

        const totalLiquido = produtosLista.reduce((s, p) => s + p.liquido, 0);

        return {
          clienteId,
          clienteNome: getClienteNome(clienteId),
          produtos: produtosLista,
          totalLiquido,
        };
      })
      .sort((a, b) => a.clienteNome.localeCompare(b.clienteNome));
  };

  const grupos = coletarVendasPorProduto();

  const handlePrint = () => {
    if (grupos.length === 0) {
      showToast('Nada para imprimir no período/filtro selecionado.');
      return;
    }

    const periodoTexto = rpDe || rpAte ? `${rpDe ? fmtData(rpDe) : '—'} a ${rpAte ? fmtData(rpAte) : '—'}` : 'Todo o período';

    const html = grupos
      .map(
        (g, idx) => `
      <div class="comprovante" style="${
        idx > 0 ? 'border-top:2px dashed #000000; margin-top:16px; padding-top:14px;' : ''
      }">
        <div class="comprovante-titulo">
          RELATÓRIO DE VENDAS POR PRODUTOS
        </div>
        <div class="comprovante-campo"><b>Cliente:</b> ${g.clienteNome}</div>
        <div class="comprovante-campo"><b>Período:</b> ${periodoTexto}</div>
        ${g.produtos
          .map(
            p => `
          <div style="margin-top:10px; border-bottom:1px dashed #000000; padding-bottom:6px;">
            <div class="comprovante-campo"><b>Produto:</b> ${p.codigo || '—'}</div>
            <div class="comprovante-campo"><b>Nome produto:</b> ${p.descricao}</div>
            <table class="comprovante-tabela" style="width:100%; border-collapse:collapse; margin-top:4px;">
              <thead>
                <tr>
                  <th style="text-align:left; font-size:10.5px; border-bottom:1px solid #000000; padding:2px 0;">Qtd</th>
                  <th style="text-align:right; font-size:10.5px; border-bottom:1px solid #000000; padding:2px 0;">Unit.</th>
                  <th style="text-align:right; font-size:10.5px; border-bottom:1px solid #000000; padding:2px 0;">Vlr.Ven.</th>
                  <th style="text-align:right; font-size:10.5px; border-bottom:1px solid #000000; padding:2px 0;">Desc</th>
                  <th style="text-align:right; font-size:10.5px; border-bottom:1px solid #000000; padding:2px 0;">Líquido</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:3px 0;">${p.qtd}</td>
                  <td style="text-align:right; padding:3px 0;">R$ ${p.unit.toFixed(2)}</td>
                  <td style="text-align:right; padding:3px 0;">R$ ${p.vlrVen.toFixed(2)}</td>
                  <td style="text-align:right; padding:3px 0;">R$ ${p.desconto.toFixed(2)}</td>
                  <td style="text-align:right; font-weight:700; padding:3px 0;">R$ ${p.liquido.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `
          )
          .join('')}
        <div class="comprovante-total" style="font-weight:800; margin-top:10px; text-align:right; font-size:12.5px;">
          Total do cliente: R$ ${g.totalLiquido.toFixed(2)}
        </div>
      </div>
    `
      )
      .join('');

    onPrintRelatorio(html);
  };

  const handleDownloadPdf = () => {
    if (grupos.length === 0) {
      showToast('Nada para exportar em PDF.');
      return;
    }
    const clienteNomeStr = rpCliente ? getClienteNome(rpCliente) : undefined;
    exportarRelatorioProdutosPdf(grupos, rpDe, rpAte, clienteNomeStr);
    showToast('PDF gerado com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-[#D8D9C9] pb-3">
        <h2 className="text-xl md:text-2xl font-bold text-[#132A1D] m-0 flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6 text-[#1F3D2B]" />
          Relatório de vendas por produto
        </h2>
        <p className="text-xs text-[#4B564C] mt-0.5">
          Agrupa pedidos entregues por cliente e por espécie de hortaliça, no formato padrão de auditoria fiscal e comprovante físico.
        </p>
      </div>

      {/* Filter & Actions Card */}
      <div className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
              De
            </label>
            <input
              type="date"
              value={rpDe}
              onChange={e => setRpDe(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
              Até
            </label>
            <input
              type="date"
              value={rpAte}
              onChange={e => setRpAte(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
            />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#4B564C] mb-1">
              Cliente específico
            </label>
            <input
              type="text"
              value={rpClienteBusca}
              onChange={e => {
                setRpClienteBusca(e.target.value);
                setRpClienteOpen(true);
              }}
              onFocus={() => setRpClienteOpen(true)}
              placeholder="Todos os clientes"
              className="w-full px-3 py-2 text-sm bg-white border border-[#D8D9C9] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5E8F52]"
            />
            {rpClienteOpen && (
              <div className="absolute top-full left-0 right-0 z-30 bg-white border border-[#D8D9C9] rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                <div
                  onClick={() => {
                    setRpCliente('');
                    setRpClienteBusca('');
                    setRpClienteOpen(false);
                  }}
                  className="px-3 py-2 text-sm hover:bg-[#1F3D2B] hover:text-white cursor-pointer font-semibold"
                >
                  Todos os clientes
                </div>
                {clientes
                  .filter(c =>
                    (c.apelido || c.nome).toLowerCase().includes(rpClienteBusca.toLowerCase())
                  )
                  .map(c => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setRpCliente(c.id);
                        setRpClienteBusca(c.apelido || c.nome);
                        setRpClienteOpen(false);
                      }}
                      className="px-3 py-2 text-sm hover:bg-[#1F3D2B] hover:text-white cursor-pointer"
                    >
                      {c.apelido || c.nome}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D8D9C9]/50">
          <button
            onClick={() => setGerado(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#1F3D2B] hover:bg-[#132A1D] rounded-lg transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#5E8F52]" />
            Gerar relatório
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#132A1D] bg-[#EEF1E9] hover:bg-[#D8D9C9] rounded-lg transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Imprimir térmico (80mm)
          </button>

          <button
            onClick={handleDownloadPdf}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#132A1D] bg-[#EEF1E9] hover:bg-[#D8D9C9] rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Baixar como PDF
          </button>

          <button
            onClick={() => {
              setRpDe('');
              setRpAte('');
              setRpCliente('');
              setRpClienteBusca('');
            }}
            className="px-3 py-2 text-xs font-semibold text-[#4B564C] hover:text-[#132A1D] ml-auto transition-colors"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Report Preview */}
      {gerado && (
        <div className="space-y-6">
          {grupos.length === 0 ? (
            <div className="bg-white border border-[#D8D9C9] rounded-xl p-8 text-center text-[#4B564C] shadow-sm">
              <p className="font-semibold text-base text-[#132A1D]">
                Nenhum pedido entregue encontrado com os filtros selecionados.
              </p>
              <p className="text-xs mt-1">Ajuste as datas ou selecione outro cliente.</p>
            </div>
          ) : (
            grupos.map(g => (
              <div
                key={g.clienteId}
                className="bg-white border border-[#D8D9C9] rounded-xl p-5 shadow-sm font-mono space-y-4"
              >
                <div className="border-b-2 border-[#1F3D2B] pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#132A1D] m-0">
                      {g.clienteNome}
                    </h3>
                    <div className="text-xs text-[#4B564C] mt-0.5">
                      Período: {rpDe || rpAte ? `${rpDe ? fmtData(rpDe) : '—'} a ${rpAte ? fmtData(rpAte) : '—'}` : 'Todo o período'}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-[#4B564C] block">Total do cliente</span>
                    <span className="font-bold text-lg text-[#1F3D2B]">
                      {fmtMoeda(g.totalLiquido)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {g.produtos.map(p => (
                    <div key={p.codigo || p.descricao} className="bg-[#EEF1E9]/30 p-3.5 rounded-lg border border-[#D8D9C9]">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-[#132A1D]">{p.descricao}</span>
                        <span className="text-[#4B564C]">{p.codigo || '—'}</span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-[#D8D9C9] text-[#4B564C]">
                              <th className="py-1">QTD</th>
                              <th className="py-1 text-right">UNIT.</th>
                              <th className="py-1 text-right">VLR.VEN.</th>
                              <th className="py-1 text-right text-[#A6432F]">DESC</th>
                              <th className="py-1 text-right font-bold text-[#1F3D2B]">LÍQUIDO</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-1.5 font-bold">{p.qtd}</td>
                              <td className="py-1.5 text-right">{fmtMoeda(p.unit)}</td>
                              <td className="py-1.5 text-right">{fmtMoeda(p.vlrVen)}</td>
                              <td className="py-1.5 text-right text-[#A6432F]">
                                {p.desconto > 0 ? fmtMoeda(p.desconto) : 'R$ 0,00'}
                              </td>
                              <td className="py-1.5 text-right font-bold text-[#1F3D2B]">
                                {fmtMoeda(p.liquido)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
