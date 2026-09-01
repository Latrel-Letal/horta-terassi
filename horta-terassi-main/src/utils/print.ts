/**
 * Utilitário de impressão térmica direta para bobina 80mm / 58mm (ex: EPSON TM-T20X).
 * Utiliza iframe isolado para não capturar a tela do sistema ou modais abertos.
 */
export function imprimirCupomTermico(htmlContent: string): void {
  let iframe = document.getElementById('thermal-print-frame') as HTMLIFrameElement | null;

  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-9999';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);
  }

  const fullHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante Não Fiscal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style id="printPageSize">@page { size: 80mm auto; margin: 0; }</style>
  <style>
    :root {
      --line: #000000;
      --ink: #000000;
      --ink-soft: #000000;
    }
    *, *:before, *:after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      width: 100% !important;
      max-width: 76mm !important;
      margin: 0 auto !important;
      padding: 0mm 1.5mm 6mm 1.5mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'IBM Plex Mono', 'Courier New', Courier, monospace !important;
      font-size: 12.5px;
      line-height: 1.4;
      box-sizing: border-box !important;
    }
    .comprovante {
      width: 100% !important;
      font-size: 12.5px !important;
      word-break: break-word;
      color: #000000 !important;
      font-family: 'IBM Plex Mono', 'Courier New', Courier, monospace !important;
      line-height: 1.4;
    }
    .comprovante-emit {
      font-family: 'IBM Plex Sans', sans-serif !important;
      font-weight: 700 !important;
      font-size: 14px !important;
      line-height: 1.4;
      margin-bottom: 8px;
      color: #000000 !important;
    }
    .comprovante-titulo {
      font-weight: 700 !important;
      font-size: 12px !important;
      text-transform: uppercase;
      text-align: center;
      border-top: 1px dashed #000000 !important;
      border-bottom: 1px dashed #000000 !important;
      padding: 6px 0;
      margin: 8px 0 10px 0;
      letter-spacing: 0.5px;
      color: #000000 !important;
    }
    .comprovante-info {
      margin-bottom: 10px;
      line-height: 1.4;
    }
    .comprovante-campo {
      margin-bottom: 4px;
      color: #000000 !important;
      font-size: 12px !important;
    }
    .comprovante-tabela {
      width: 100% !important;
      table-layout: fixed;
      border-collapse: collapse;
      margin: 10px 0 0 0;
      font-size: 11px !important;
    }
    .comprovante-tabela th {
      color: #000000 !important;
      border-bottom: 1.5px solid #000000 !important;
      padding: 4px 2px !important;
      font-size: 11px !important;
      text-transform: uppercase;
      font-weight: 800 !important;
    }
    .col-prod-th { text-align: left; width: 54%; }
    .col-qtd-th { text-align: right; width: 14%; }
    .col-total-th { text-align: right; width: 32%; }
    .comprovante-tabela td {
      padding: 4px 2px !important;
      color: #000000 !important;
      border-bottom: 1px dashed #000000 !important;
      vertical-align: top;
    }
    .col-prod { text-align: left; }
    .prod-nome {
      font-size: 12px !important;
      font-weight: 700 !important;
      line-height: 1.3;
    }
    .preco-unit {
      display: block;
      font-size: 10.5px !important;
      color: #000000 !important;
      font-weight: 600 !important;
      opacity: 1;
      margin-top: 1px;
    }
    .col-qtd {
      text-align: right;
      font-size: 12px !important;
      font-weight: 700 !important;
      white-space: nowrap;
    }
    .col-total {
      text-align: right;
      font-size: 12px !important;
      font-weight: 700 !important;
      white-space: nowrap;
    }
    .comprovante-total {
      font-weight: 800 !important;
      margin-top: 8px;
      text-align: right;
      font-size: 12.5px !important;
      color: #000000 !important;
    }
    .comprovante-ass {
      margin-top: 20px;
      border-top: 1px solid #000000 !important;
      padding-top: 4px;
      font-size: 11px !important;
      font-weight: 700 !important;
      color: #000000 !important;
    }
    .comprovante-espaco-corte {
      height: 4mm;
    }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>
  `;

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) {
    console.error('Não foi possível acessar o documento do iframe de impressão');
    return;
  }

  doc.open();
  doc.write(fullHtml);
  doc.close();

  // Aguarda as fontes carregarem DE VERDADE (em vez de um tempo fixo no escuro)
  // antes de medir a altura real do conteúdo. Se a medição rodar antes da fonte
  // custom (IBM Plex) carregar, o texto é medido com a fonte de fallback do
  // navegador — geralmente mais estreita — e a altura calculada fica menor do
  // que a real. Isso faz o @page ficar menor que o conteúdo de verdade, e o
  // texto que sobra "estoura" pra página seguinte da bobina, aparecendo como
  // um respiro em branco antes do próximo comprovante.
  const imprimirQuandoPronto = () => {
    try {
      const win = iframe!.contentWindow;
      if (!win) return;

      // Mede a altura real do que vai ser impresso e ajusta o @page pra esse
      // tamanho exato, em vez de deixar "auto" — isso evita que a impressora
      // térmica puxe papel em branco além do necessário (ou corte conteúdo).
      const alturaPx = win.document.body.scrollHeight;
      const alturaMm = Math.ceil((alturaPx / 96) * 25.4) + 4;
      const styleTag = win.document.getElementById('printPageSize');
      if (styleTag) {
        styleTag.textContent = `@page { size: 80mm ${alturaMm}mm; margin: 0; }`;
      }

      win.focus();
      win.print();
    } catch (e) {
      console.error('Erro ao acionar impressão:', e);
    }
  };

  let jaImprimiu = false;
  const imprimirUmaVez = () => {
    if (jaImprimiu) return;
    jaImprimiu = true;
    imprimirQuandoPronto();
  };

  try {
    const win = iframe.contentWindow;
    const fontsReady = win?.document?.fonts?.ready;
    if (fontsReady) {
      // requestAnimationFrame extra garante que o layout já reagiu ao
      // carregamento da fonte antes de medirmos a altura.
      fontsReady.then(() => {
        win!.requestAnimationFrame(() => imprimirUmaVez());
      });
      // Rede de segurança: se por algum motivo 'fonts.ready' nunca resolver,
      // não trava a impressão pra sempre.
      setTimeout(imprimirUmaVez, 1200);
    } else {
      setTimeout(imprimirUmaVez, 300);
    }
  } catch (e) {
    setTimeout(imprimirUmaVez, 300);
  }
}
