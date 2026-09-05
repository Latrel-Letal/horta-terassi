import { Cliente, ItemPedido, Pedido, Produto, RelatorioVendasClienteGrupo, TransporteConfig } from '../types';
import { EMITENTE_INFO } from '../constants/initialData';
import { jsPDF } from 'jspdf';

// Converte um Date para o formato AAAA-MM-DD usando o horário LOCAL do
// navegador (não UTC). Use sempre esta função (ou hojeISO) em vez de
// `date.toISOString().slice(0, 10)`: toISOString() converte pra UTC, e
// como o Brasil está em UTC-3, a partir de ~21h o UTC já é o dia seguinte,
// fazendo "hoje" virar "amanhã" mais cedo do que deveria.
export function dataParaISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Data de hoje (AAAA-MM-DD) no horário local.
export function hojeISO(): string {
  return dataParaISO(new Date());
}

export function fmtData(d?: string): string {
  if (!d) return '';
  const parts = d.split('-');
  if (parts.length !== 3) return d;
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}

export function fmtMoeda(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val || 0);
}

export function diasParado(dataISO?: string): number {
  if (!dataISO) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [y, m, day] = dataISO.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  return Math.floor((hoje.getTime() - d.getTime()) / 86400000);
}

export function getProdutoInfo(codigo: string, produtos: Produto[]): Produto {
  if (codigo && codigo.startsWith('DESC:')) {
    const desc = codigo.slice(5);
    const found = produtos.find(p => p.descricao === desc);
    return found || { descricao: desc, codigo: '', ncm: '', cfop: '5101', valor: 0, unidade: 'UN' };
  }
  const found = produtos.find(p => p.codigo === codigo);
  return found || { descricao: codigo, codigo: '', ncm: '', cfop: '5101', valor: 0, unidade: 'UN' };
}

export function getPrecoProduto(
  clienteId: string,
  itemKey: string,
  produtos: Produto[],
  precosOverrides: Record<string, Record<string, number>>
): number {
  const overrides = precosOverrides[clienteId];
  if (overrides && overrides[itemKey] !== undefined && overrides[itemKey] !== null) {
    const val = parseFloat(String(overrides[itemKey]));
    if (!isNaN(val)) return val;
  }
  return getProdutoInfo(itemKey, produtos).valor;
}

export function getPrecoItem(
  pedido: Pedido,
  it: ItemPedido,
  produtos: Produto[],
  precosOverrides: Record<string, Record<string, number>>
): number {
  if (it.precoUnit !== undefined && it.precoUnit !== null) {
    const val = parseFloat(String(it.precoUnit));
    if (!isNaN(val)) return val;
  }
  return getPrecoProduto(pedido.clienteId, it.codigo, produtos, precosOverrides);
}

export function calcularTotalPedido(
  pedido: Pedido,
  produtos: Produto[],
  precosOverrides: Record<string, Record<string, number>>
): number {
  return pedido.itens.reduce((s, it) => {
    const unit = getPrecoItem(pedido, it, produtos, precosOverrides);
    return s + unit * it.quantidade;
  }, 0);
}

export function calcularDevolucaoTotal(
  pedido: Pedido,
  produtos: Produto[],
  precosOverrides: Record<string, Record<string, number>>
): number {
  const dev = pedido.devolucoes || {};
  return pedido.itens.reduce((s, it) => {
    const q = dev[it.codigo] || 0;
    const unit = getPrecoItem(pedido, it, produtos, precosOverrides);
    return s + q * unit;
  }, 0);
}

export function gerarTextoFichaNFe(
  pedido: Pedido,
  cliente: Cliente,
  produtos: Produto[],
  transporte: TransporteConfig,
  precosOverrides: Record<string, Record<string, number>>
): string {
  const total = calcularTotalPedido(pedido, produtos, precosOverrides);
  const linhasItens = pedido.itens.map(it => {
    const info = getProdutoInfo(it.codigo, produtos);
    const valorAplicado = getPrecoItem(pedido, it, produtos, precosOverrides);
    const subtotal = valorAplicado * it.quantidade;
    const cod = info.codigo ? `${info.codigo}  ${info.descricao}` : `${info.descricao}  (código a definir)`;
    return `${cod}\n  NCM ${info.ncm || '—'}  CFOP ${info.cfop}  ${it.quantidade} ${info.unidade} x R$ ${valorAplicado.toFixed(2)} = R$ ${subtotal.toFixed(2)}`;
  }).join('\n\n');

  return `FICHA PARA EMISSÃO — NFP-e (Portal Receita/PR)

== EMITENTE ==
${EMITENTE_INFO.nome}
CPF: ${EMITENTE_INFO.cpf} | IE: ${EMITENTE_INFO.ie}
${EMITENTE_INFO.cidade}

== DESTINATÁRIO ==
${cliente.nome || cliente.apelido}
${cliente.cnpj ? 'CNPJ/CPF/MEI: ' + cliente.cnpj + ' | ' : ''}IE: ${cliente.ie || '—'}
${cliente.endereco || '—'} — ${cliente.bairro || '—'}
${cliente.municipio || '—'} | CEP: ${cliente.cep || '—'}

== IDENTIFICAÇÃO DA NOTA ==
Natureza da operação: Venda de produção do estabelecimento
Tipo de operação: Saída | Finalidade da emissão: NF-e normal
CFOP: 5101 (venda dentro do PR — confira se muda pra 6101 em venda interestadual)
Data do pedido: ${fmtData(pedido.data)} | Data/hora de saída: ${fmtData(pedido.dataEntrega || pedido.data)}
Indicador de presença do comprador: Não presencial, outros (pedido combinado antes por telefone/WhatsApp, entrega feita depois)
Consumidor final: Não (venda para contribuinte do ICMS)

== LOCAL DE RETIRADA/ENTREGA ==
Retirada: padrão do sistema — mesma propriedade do emitente (não precisa preencher no site)
Entrega: padrão do sistema — mesmo endereço do destinatário acima (não precisa preencher no site)

== PRODUTOS ==
${linhasItens}

== TRANSPORTE ==
Modalidade do frete: Transporte próprio por conta do remetente/emitente (veículo próprio)
Placa do veículo: ${transporte.placa || '(preencher)'} | UF: ${transporte.uf || 'PR'}

== RESUMO ==
TOTAL DA NOTA: R$ ${total.toFixed(2)}`;
}

export function gerarComprovanteHTML(
  pedido: Pedido,
  cliente: Cliente,
  produtos: Produto[],
  precosOverrides: Record<string, Record<string, number>>
): string {
  const total = calcularTotalPedido(pedido, produtos, precosOverrides);

  const linhasHtml = pedido.itens.map(it => {
    const info = getProdutoInfo(it.codigo, produtos);
    const valorAplicado = getPrecoItem(pedido, it, produtos, precosOverrides);
    const vtotal = valorAplicado * it.quantidade;
    const codigo = info.codigo ? `${info.codigo} ` : '';
    const nomeCompleto = `${codigo}${info.descricao}`.toUpperCase();

    return `
      <tr>
        <td class="col-prod">
          <div class="prod-nome">${nomeCompleto}</div>
          <div class="preco-unit">R$ ${valorAplicado.toFixed(2)} un.</div>
        </td>
        <td class="col-qtd">${it.quantidade}</td>
        <td class="col-total">R$ ${vtotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const enderecoCliente = [cliente.endereco, cliente.bairro].filter(Boolean).join(' — ');
  const cidadeCliente = cliente.municipio || '';
  const enderecoLinha = [enderecoCliente, cidadeCliente].filter(Boolean).join(' — ') || '—';
  const clienteNome = (cliente.apelido || cliente.nome || '—').toUpperCase();

  const dataEntregaFmt = pedido.dataEntrega ? fmtData(pedido.dataEntrega) : (pedido.data ? fmtData(pedido.data) : '—');
  const dataVendaFmt = fmtData(pedido.data);

  return `
    <div class="comprovante">
      <!-- Emitente -->
      <div class="comprovante-emit">
        ${EMITENTE_INFO.nome}<br>
        ${EMITENTE_INFO.endereco}<br>
        ${EMITENTE_INFO.telefone}
      </div>

      <!-- Título entre linhas tracejadas -->
      <div class="comprovante-titulo">
        COMPROVANTE NÃO FISCAL
      </div>

      <!-- Informações do Cliente e Datas -->
      <div class="comprovante-info">
        <div class="comprovante-campo"><b>Cliente:</b> ${clienteNome}</div>
        <div class="comprovante-campo"><b>Endereço:</b> ${enderecoLinha}</div>
        <div class="comprovante-campo"><b>Data entrega:</b> ${dataEntregaFmt}</div>
        <div class="comprovante-campo"><b>Data venda:</b> ${dataVendaFmt}</div>
      </div>

      <!-- Tabela de Itens com separadores -->
      <table class="comprovante-tabela">
        <thead>
          <tr>
            <th class="col-prod-th">COD. PRODUTO</th>
            <th class="col-qtd-th">QTD</th>
            <th class="col-total-th">VLR TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${linhasHtml}
        </tbody>
      </table>

      <!-- Valor Total -->
      <div class="comprovante-total">
        Valor total: R$ ${total.toFixed(2)}
      </div>

      <!-- Linha e Campo de Assinatura -->
      <div class="comprovante-ass">
        Ass:
      </div>

      <!-- Margem inferior de corte da bobina -->
      <div class="comprovante-espaco-corte"></div>
    </div>
  `;
}

export function exportarRelatorioProdutosPdf(
  grupos: RelatorioVendasClienteGrupo[],
  de?: string,
  ate?: string,
  nomeFiltroCliente?: string
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = margin;

  const periodoTexto = (de || ate) ? `${de ? fmtData(de) : '—'} a ${ate ? fmtData(ate) : '—'}` : 'Todo o período';

  function novaPaginaSeNecessario(altura: number) {
    if (y + altura > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  function tituloRelatorio() {
    novaPaginaSeNecessario(12);
    doc.setFont('courier', 'bold');
    doc.setFontSize(12);
    doc.text('RELATÓRIO DE VENDAS POR PRODUTOS', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setDrawColor(31, 61, 43);
    doc.setLineWidth(0.35);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  const colX = { qtd: margin, unit: margin + 22, ven: margin + 55, desc: margin + 90, liq: margin + 125 };

  grupos.forEach((g, idx) => {
    if (idx > 0) {
      novaPaginaSeNecessario(20);
      doc.setDrawColor(160);
      doc.setLineDashPattern([1.2, 1], 0);
      doc.line(margin, y, pageWidth - margin, y);
      doc.setLineDashPattern([], 0);
      y += 8;
    }
    tituloRelatorio();

    doc.setFontSize(9.5);
    doc.setFont('courier', 'bold');
    doc.text('Cliente:', margin, y);
    doc.setFont('courier', 'normal');
    doc.text(g.clienteNome, margin + 18, y);
    y += 5;
    doc.setFont('courier', 'bold');
    doc.text('Período:', margin, y);
    doc.setFont('courier', 'normal');
    doc.text(periodoTexto, margin + 18, y);
    y += 7;

    g.produtos.forEach(p => {
      novaPaginaSeNecessario(22);

      doc.setFontSize(9);
      doc.setFont('courier', 'bold');
      doc.text('Produto:', margin, y);
      doc.setFont('courier', 'normal');
      doc.text(String(p.codigo || '—'), margin + 18, y);
      y += 4.5;

      doc.setFont('courier', 'bold');
      doc.text('Nome produto:', margin, y);
      doc.setFont('courier', 'normal');
      doc.text(String(p.descricao || ''), margin + 26, y);
      y += 5.5;

      doc.setFont('courier', 'bold');
      doc.setFontSize(8);
      doc.text('QTD', colX.qtd, y);
      doc.text('UNIT.', colX.unit, y);
      doc.text('VLR.VEN.', colX.ven, y);
      doc.text('DESC', colX.desc, y);
      doc.text('LÍQUIDO', colX.liq, y);
      y += 1.5;
      doc.setDrawColor(31, 61, 43);
      doc.setLineWidth(0.25);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;

      doc.setFont('courier', 'normal');
      doc.setFontSize(9);
      doc.text(String(p.qtd), colX.qtd, y);
      doc.text(`R$ ${p.unit.toFixed(2)}`, colX.unit, y);
      doc.text(`R$ ${p.vlrVen.toFixed(2)}`, colX.ven, y);
      doc.text(`R$ ${p.desconto.toFixed(2)}`, colX.desc, y);
      doc.text(`R$ ${p.liquido.toFixed(2)}`, colX.liq, y);
      y += 3.5;
      doc.setDrawColor(210);
      doc.setLineDashPattern([0.6, 0.6], 0);
      doc.line(margin, y, pageWidth - margin, y);
      doc.setLineDashPattern([], 0);
      y += 6;
    });

    novaPaginaSeNecessario(8);
    doc.setFont('courier', 'bold');
    doc.setFontSize(10);
    doc.text(`Total do cliente: R$ ${g.totalLiquido.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
    y += 4;
  });

  const partes = ['relatorio-produtos-horta-terassi'];
  if (nomeFiltroCliente) partes.push(nomeFiltroCliente.toLowerCase().replace(/\s+/g, '-'));
  if (de) partes.push(de);
  if (ate) partes.push(ate);
  doc.save(partes.join('_') + '.pdf');
}
