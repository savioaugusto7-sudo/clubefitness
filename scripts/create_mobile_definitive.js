const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'generate_definitive_report.js');
let code = fs.readFileSync(srcPath, 'utf8');

// 1. Output file target
code = code.replace(
  "const htmlPath = path.join(artifactDir, 'relatorio_pontuacao_outubro_2026.html');",
  "const htmlPath = path.join(artifactDir, 'relatorio_pontuacao_outubro_2026_mobile.html');"
);

// 2. Change title to Mobile Edition
code = code.replace(
  '<title>Relatório Executivo de Pontuação dos Profissionais — Fechamento Outubro/2026</title>',
  '<title>Relatório Executivo de Pontuação dos Profissionais — Edição Mobile (Outubro/2026)</title>'
);

// 3. Replace @page CSS and styling for mobile smartphone screen
const oldCssStart = '<style>';
const oldCssEnd = '</style>';
const startIdx = code.indexOf(oldCssStart);
const endIdx = code.indexOf(oldCssEnd);

if (startIdx !== -1 && endIdx !== -1) {
  const mobileCss = `<style>
  @page {
    size: 115mm 230mm;
    margin: 6mm 5mm 8mm 5mm;
    @bottom-right {
      content: "Pág. " counter(page);
      font-size: 7.5px;
      color: #64748b;
    }
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 0;
    color: #0f172a;
    background: #ffffff;
    font-size: 9.5px;
    line-height: 1.35;
  }
  .page-container {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    padding: 0;
  }

  /* CABEÇALHO MOBILE */
  .header {
    border-bottom: 2px solid #0284c7;
    padding-bottom: 8px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .header-badge {
    display: inline-block;
    background: #0284c7;
    color: #ffffff;
    font-size: 7.5px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .header h1 {
    font-size: 14px;
    font-weight: 800;
    color: #0f172a;
    margin: 0 0 4px 0;
    line-height: 1.2;
    letter-spacing: -0.2px;
  }
  .header .meta {
    font-size: 8.5px;
    color: #475569;
    line-height: 1.35;
  }

  h2 {
    font-size: 11.5px;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 1.5px solid #0284c7;
    padding-bottom: 3px;
    margin: 12px 0 6px 0;
    text-transform: uppercase;
    letter-spacing: 0.2px;
    page-break-after: avoid;
  }

  h3 {
    font-size: 10px;
    font-weight: 800;
    color: #1e293b;
    margin: 8px 0 4px 0;
    page-break-after: avoid;
  }

  .confront-box {
    background: #f8fafc;
    border-left: 3px solid #0284c7;
    padding: 6px 8px;
    font-size: 8.5px;
    color: #334155;
    margin-bottom: 8px;
    border-radius: 0 4px 4px 0;
    page-break-inside: avoid;
  }

  /* TABELAS MOBILE */
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
    font-size: 7.5px;
    page-break-inside: auto;
  }
  th {
    background: #f1f5f9;
    color: #1e293b;
    font-weight: 700;
    padding: 3.5px 3px;
    border: 1px solid #cbd5e1;
    text-align: left;
    font-size: 7px;
    line-height: 1.2;
  }
  td {
    padding: 3.5px 3px;
    border: 1px solid #e2e8f0;
    vertical-align: middle;
    font-size: 7.5px;
    line-height: 1.25;
    word-break: break-word;
  }
  tr:nth-child(even) td {
    background: #fbfcfe;
  }

  .sub-table {
    margin-bottom: 8px;
    border: 1px solid #cbd5e1;
  }
  .sub-table-title {
    font-size: 8.5px;
    font-weight: 800;
    color: #1e293b;
    margin: 8px 0 3px 0;
    text-transform: uppercase;
    page-break-after: avoid;
  }

  .audit-note {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 5px 7px;
    font-size: 7.5px;
    color: #475569;
    margin-bottom: 8px;
    line-height: 1.35;
  }

  .prof-block {
    margin-bottom: 14px;
    page-break-inside: avoid;
    border-top: 1.5px solid #0284c7;
    padding-top: 6px;
  }
  .prof-title {
    font-size: 11px;
    font-weight: 800;
    color: #0f172a;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
  }
  .prof-subtitle {
    font-size: 8px;
    color: #64748b;
    margin-bottom: 6px;
  }

  .badge-pos {
    display: inline-block;
    padding: 1.5px 4px;
    border-radius: 3px;
    font-size: 7.5px;
    font-weight: 800;
  }

  .text-emerald { color: #166534; }
  .text-rose { color: #991b1b; }
  .text-blue { color: #1e40af; }
  .text-muted { color: #64748b; }
  .font-bold { font-weight: 700; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }

  /* CARDS MOBILE COMPACTOS PARA ITENS */
  .mobile-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    padding: 6px 8px;
    margin-bottom: 6px;
    page-break-inside: avoid;
  }
  .mobile-card-header {
    display: flex;
    justify-content: space-between;
    font-weight: 800;
    font-size: 8.5px;
    margin-bottom: 4px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 3px;
  }
  .mobile-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    font-size: 7.5px;
  }
  .mobile-grid-item {
    background: #f8fafc;
    padding: 3px 5px;
    border-radius: 4px;
    border: 1px solid #f1f5f9;
  }
  .mobile-grid-item .k { color: #64748b; font-size: 6.5px; text-transform: uppercase; font-weight: 700; }
  .mobile-grid-item .v { font-weight: 700; font-size: 8px; margin-top: 1px; }

  /* Ajuste no layout de duas colunas do script original para mobile (empilhar verticalmente) */
  div[style*="grid-template-columns: 1fr 1fr"] {
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
  }
</style>`;

  code = code.substring(0, startIdx) + mobileCss + code.substring(endIdx + oldCssEnd.length);
}

// 4. In Section 1, make the main ranking table mobile-friendly:
// We provide both:
// A) An executive mobile ranking table with the core totals (Pos | Profissional | Somas | Débitos | Líquido | Assiduidade)
// B) Immediately followed by the Full 17-Column Nominal Matrix
const searchRanking = '  <!-- 1. TABELA GERAL TOTALMENTE DISCRIMINADA POR CADA TIPO DE SOMA E DÉBITO -->';
const mobileRankingSummary = `  <!-- 1. RESUMO EXECUTIVO DE RANKING MOBILE -->
  <div class="confront-box">
    <strong>Formatação Mobile Completa:</strong> Este documento contém a totalidade dos dados, procedimentos e auditorias de ponto do relatório principal, estruturado para leitura contínua e confortável em celulares.
  </div>

  <table class="sub-table" style="font-size: 8px; margin-bottom: 10px;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th class="text-center" style="width:25px;">Pos</th>
        <th>Profissional</th>
        <th class="text-right">Somas (+)</th>
        <th class="text-right">Débitos (-)</th>
        <th class="text-right">Líquido</th>
        <th>Assiduidade</th>
      </tr>
    </thead>
    <tbody>
      <tr><td class="font-bold text-center">1º</td><td class="font-bold">Pedro Grossi</td><td class="text-right text-emerald font-bold">+136 pts</td><td class="text-right text-rose font-bold">-35 pts</td><td class="text-right text-emerald font-bold">+101 pts</td><td>21/21 (29m)</td></tr>
      <tr><td class="font-bold text-center">2º</td><td class="font-bold">Cleiton Freitas</td><td class="text-right text-emerald font-bold">+331,5 pts</td><td class="text-right text-rose font-bold">-263,5 pts</td><td class="text-right text-emerald font-bold">+68 pts</td><td>21/21 (100%)</td></tr>
      <tr><td class="font-bold text-center">3º</td><td class="font-bold">Matheus Poeiras Luciano</td><td class="text-right text-emerald font-bold">+139 pts</td><td class="text-right text-rose font-bold">-80,5 pts</td><td class="text-right text-emerald font-bold">+56,5 pts</td><td>21/21 (10m)</td></tr>
      <tr><td class="font-bold text-center">4º</td><td class="font-bold">Dra. Rachel Zauli Serpa</td><td class="text-right text-emerald font-bold">+88 pts</td><td class="text-right text-rose font-bold">-42 pts</td><td class="text-right text-emerald font-bold">+46 pts</td><td>21/21 (0m)</td></tr>
      <tr><td class="font-bold text-center">5º</td><td class="font-bold">Dr. Albert Nunes</td><td class="text-right text-emerald font-bold">+88 pts</td><td class="text-right text-rose font-bold">-42 pts</td><td class="text-right text-emerald font-bold">+46 pts</td><td>Isento (Dir.)</td></tr>
      <tr><td class="font-bold text-center">6º</td><td class="font-bold">Dr. Guilherme José Graciano</td><td class="text-right text-emerald font-bold">+193 pts</td><td class="text-right text-rose font-bold">-189,5 pts</td><td class="text-right text-emerald font-bold">+3,5 pts</td><td>18/21 (89m)</td></tr>
      <tr><td class="font-bold text-center">7º</td><td class="font-bold">Thiago Castro Lima Rocha</td><td class="text-right text-muted font-bold">0 pts</td><td class="text-right text-rose font-bold">-45 pts</td><td class="text-right text-rose font-bold">-45 pts</td><td>8 plantões (5m)</td></tr>
      <tr><td class="font-bold text-center">8º</td><td class="font-bold">Ruthi Novais</td><td class="text-right text-emerald font-bold">+130,5 pts</td><td class="text-right text-rose font-bold">-186,5 pts</td><td class="text-right text-rose font-bold">-56 pts</td><td>18/21 (22m)</td></tr>
      <tr><td class="font-bold text-center">9º</td><td class="font-bold">Maria Luísa Câmara Gontijo</td><td class="text-right text-emerald font-bold">+6 pts</td><td class="text-right text-rose font-bold">-112 pts</td><td class="text-right text-rose font-bold">-106 pts</td><td>10 plantões (52m)</td></tr>
    </tbody>
  </table>

  <h3 style="font-size: 9px; font-weight: 800; color: #1e293b; margin: 10px 0 4px 0; text-transform: uppercase;">Detalhamento Integral de Todas as 17 Colunas da Tabela Geral:</h3>
`;

if (code.includes(searchRanking)) {
  code = code.replace(searchRanking, searchRanking + '\n' + mobileRankingSummary);
}

// 5. Replace font-size: 7.5px in main table with font-size: 6px for the 17-column table to ensure it renders all 17 columns without cut
code = code.replace(
  'style="width: 100%; border-collapse: collapse; font-size: 7.5px; margin-bottom: 12px; page-break-inside: avoid;"',
  'style="width: 100%; border-collapse: collapse; font-size: 6px; margin-bottom: 12px; page-break-inside: avoid;"'
);

// Save as generate_full_mobile_report.js
const destScript = path.join(__dirname, 'generate_full_mobile_report.js');
fs.writeFileSync(destScript, code, 'utf8');
console.log('generate_full_mobile_report.js written successfully!');

