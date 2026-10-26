/**
 * Gerador de Laudo de Reavaliação Fisioterapêutica em PDF de Alta Fidelidade (18 Seções)
 * Reprodução Exata do Padrão Científico e Editorial de Referência.
 */

import { LongitudinalComputedResult } from './longitudinalEngine';
import { ClinicalNarrative } from './clinicalReasoningEngine';

export function generateReavaliacaoHTML(computed: LongitudinalComputedResult, narrative: ClinicalNarrative): string {
  const { identificacao, objetivoDoLaudo, historicoClinicoBase, tabelaEVA, tabelaForca, tabelaRazoes, tabelaSimetria, testesFuncionais, tabelaGoniometria, tabelaTestesOrtopedicos } = computed;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo de Reavaliação Fisioterapêutica — ${identificacao.paciente}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 16mm 14mm 16mm 14mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 10.5pt;
      line-height: 1.45;
    }
    .header-laudo {
      text-align: center;
      margin-bottom: 22px;
      padding-bottom: 12px;
      border-bottom: 2px solid #0f172a;
    }
    .header-laudo h1 {
      font-size: 14pt;
      font-weight: 800;
      letter-spacing: 0.05em;
      margin: 0 0 4px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .header-laudo h2 {
      font-size: 10pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin: 0 0 6px;
      text-transform: uppercase;
      color: #334155;
    }
    .header-laudo h3 {
      font-size: 12.5pt;
      font-weight: 800;
      letter-spacing: 0.02em;
      margin: 8px 0 4px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .header-laudo p {
      font-size: 8.5pt;
      color: #475569;
      margin: 0;
      font-style: italic;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 800;
      text-transform: uppercase;
      margin: 20px 0 8px 0;
      color: #0f172a;
      letter-spacing: 0.02em;
      page-break-after: avoid;
    }
    .subsection-title {
      font-size: 10pt;
      font-weight: 800;
      margin: 14px 0 6px 0;
      color: #1e293b;
      page-break-after: avoid;
    }
    p {
      margin: 0 0 8px 0;
      text-align: justify;
      color: #1e293b;
    }
    .ressalva-box {
      font-style: italic;
      color: #334155;
      font-size: 9.5pt;
      margin: 10px 0 14px 0;
      text-align: justify;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 14px 0;
      font-size: 8.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 7px;
      text-align: left;
      vertical-align: middle;
    }
    th {
      background: #e2e8f0;
      color: #0f172a;
      font-weight: 700;
      text-align: center;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    ul.bullet-list {
      margin: 6px 0 12px 18px;
      padding: 0;
      list-style-type: disc;
    }
    ul.bullet-list li {
      margin-bottom: 6px;
      text-align: justify;
      font-size: 9.5pt;
    }
    ol.numbered-list {
      margin: 6px 0 12px 20px;
      padding: 0;
    }
    ol.numbered-list li {
      margin-bottom: 6px;
      text-align: justify;
      font-size: 9.5pt;
    }
    .signature-section {
      margin-top: 40px;
      padding-top: 20px;
      page-break-inside: avoid;
    }
    .signature-line {
      width: 320px;
      border-top: 1px solid #0f172a;
      margin: 30px 0 6px 0;
    }
    .signature-name {
      font-weight: 700;
      font-size: 10pt;
      color: #0f172a;
    }
    .signature-role {
      font-size: 9pt;
      color: #475569;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- CABEÇALHO OFICIAL -->
  <div class="header-laudo">
    <h1>CLUBE FITNESS FISIO</h1>
    <h2>Fisioterapia, Quiropraxia e Fortalecimento</h2>
    <h3>LAUDO DE REAVALIAÇÃO FISIOTERAPÊUTICA</h3>
    <p>Análise comparativa pré e pós-tratamento — Avaliação de Força, Simetria Biomecânica, Testes Funcionais e Mobilidade</p>
  </div>

  <!-- 1. IDENTIFICAÇÃO -->
  <div class="section-title">1. IDENTIFICAÇÃO</div>
  <table>
    <thead>
      <tr>
        <th style="width: 45%;">Campo</th>
        <th>Dado</th>
      </tr>
    </thead>
    <tbody>
      <tr><td class="font-bold">Paciente</td><td>${identificacao.paciente}</td></tr>
      <tr><td class="font-bold">Idade</td><td>${identificacao.idade}</td></tr>
      <tr><td class="font-bold">Sexo</td><td>${identificacao.sexo}</td></tr>
      <tr><td class="font-bold">CPF</td><td>${identificacao.cpf}</td></tr>
      <tr><td class="font-bold">Peso corporal</td><td>${identificacao.pesoCorporal}</td></tr>
      <tr><td class="font-bold">Data do relatório inicial</td><td>${identificacao.dataRelatorioInicial}</td></tr>
      <tr><td class="font-bold">Data da avaliação de força inicial</td><td>${identificacao.dataForcaInicial}</td></tr>
      <tr><td class="font-bold">Data da reavaliação</td><td>${identificacao.dataReavaliacao}</td></tr>
      <tr><td class="font-bold">Intervalo entre avaliações</td><td>${identificacao.intervaloSemanas} semanas</td></tr>
      <tr><td class="font-bold">Avaliador da avaliação inicial</td><td>${identificacao.avaliadorInicial}</td></tr>
      <tr><td class="font-bold">Avaliador da reavaliação</td><td>${identificacao.avaliadorReavaliacao}</td></tr>
    </tbody>
  </table>

  <div class="ressalva-box">
    ${identificacao.ressalvaMetodologica}
  </div>

  <!-- 2. OBJETIVO DO LAUDO -->
  <div class="section-title">2. OBJETIVO DO LAUDO</div>
  <p>${objetivoDoLaudo}</p>

  <!-- 3. HISTÓRICO CLÍNICO DE BASE -->
  <div class="section-title">3. HISTÓRICO CLÍNICO DE BASE</div>
  <p>
    Paciente de ${historicoClinicoBase.idade} anos, ${historicoClinicoBase.patologiasPregressas.toLowerCase()}, em uso de ${historicoClinicoBase.medicamentos}. ${historicoClinicoBase.historicoCirurgiasTraumas} ${historicoClinicoBase.demandaEsportiva} ${historicoClinicoBase.queixaInicialDiagnostico}
  </p>

  <!-- 4. COMPARATIVO DE QUEIXAS DOLOROSAS (EVA 0–10) -->
  <div class="section-title">4. COMPARATIVO DE QUEIXAS DOLOROSAS (EVA 0–10)</div>
  <table>
    <thead>
      <tr>
        <th>Queixa</th>
        <th class="text-center">${identificacao.dataRelatorioInicial}</th>
        <th class="text-center">${identificacao.dataReavaliacao}</th>
        <th class="text-center">Variação</th>
        <th>Situação</th>
      </tr>
    </thead>
    <tbody>
      ${tabelaEVA.rows.map(r => `
        <tr>
          <td class="font-bold">${r.queixa}</td>
          <td class="text-center">${r.t1}</td>
          <td class="text-center">${r.t2}</td>
          <td class="text-center font-bold" style="color:${r.variacao < 0 ? '#059669' : '#0f172a'}">${r.variacao > 0 ? `+${r.variacao}` : r.variacao}</td>
          <td>${r.situacao}</td>
        </tr>
      `).join('')}
      <tr style="background:#f1f5f9; font-weight:700;">
        <td>Soma das queixas</td>
        <td class="text-center">${tabelaEVA.somaQueixasT1}</td>
        <td class="text-center">${tabelaEVA.somaQueixasT2}</td>
        <td class="text-center" style="color:#059669;">${tabelaEVA.deltaSoma > 0 ? `+${tabelaEVA.deltaSoma}` : tabelaEVA.deltaSoma}</td>
        <td>Melhora global expressiva</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size:9.5pt; color:#334155;"><strong>Observação:</strong> ${tabelaEVA.observacoesClinicas}</p>

  <!-- 5. COMPARATIVO DE FORÇA MUSCULAR (NEWTONS) -->
  <div class="section-title">5. COMPARATIVO DE FORÇA MUSCULAR (newtons)</div>
  <table>
    <thead>
      <tr>
        <th>Movimento</th>
        <th class="text-center">Lado</th>
        <th class="text-center">${identificacao.dataForcaInicial}</th>
        <th class="text-center">${identificacao.dataReavaliacao}</th>
        <th class="text-center">Variação (%)</th>
        <th>Leitura</th>
      </tr>
    </thead>
    <tbody>
      ${tabelaForca.map(r => `
        <tr>
          <td>${r.movimento}</td>
          <td class="text-center">${r.lado}</td>
          <td class="text-center">${r.t1.toFixed(1).replace('.', ',')}</td>
          <td class="text-center font-bold">${r.t2.toFixed(1).replace('.', ',')}</td>
          <td class="text-center font-bold" style="color:${r.variacaoPct >= 10 ? '#059669' : (r.variacaoPct < -5 ? '#dc2626' : '#0f172a')}">
            ${r.variacaoPct > 0 ? `+${r.variacaoPct.toFixed(1).replace('.', ',')}%` : `${r.variacaoPct.toFixed(1).replace('.', ',')}%`}
          </td>
          <td>${r.leitura}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- 6. RAZÕES MUSCULARES E ÍNDICES BIOMECÂNICOS -->
  <div class="section-title">6. RAZÕES MUSCULARES E ÍNDICES BIOMECÂNICOS</div>
  <table>
    <thead>
      <tr>
        <th>Índice</th>
        <th class="text-center">Referência</th>
        <th class="text-center">${identificacao.dataForcaInicial}</th>
        <th class="text-center">${identificacao.dataReavaliacao}</th>
        <th class="text-center">Variação</th>
        <th>Interpretação</th>
      </tr>
    </thead>
    <tbody>
      ${tabelaRazoes.rows.map(r => `
        <tr>
          <td class="font-bold">${r.indice}</td>
          <td class="text-center">${r.referencia}</td>
          <td class="text-center">${r.t1}</td>
          <td class="text-center font-bold">${r.t2}</td>
          <td class="text-center">${r.variacao}</td>
          <td>${r.interpretacao}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <p style="font-size:9.5pt; color:#334155;"><strong>Análise por lado da razão I:Q:</strong> ${tabelaRazoes.analisePorLadoIQ}</p>

  <!-- 7. ANÁLISE DE SIMETRIA ENTRE MEMBROS -->
  <div class="section-title">7. ANÁLISE DE SIMETRIA ENTRE MEMBROS (déficit percentual)</div>
  <table>
    <thead>
      <tr>
        <th>Movimento</th>
        <th class="text-center">${identificacao.dataForcaInicial}</th>
        <th class="text-center">${identificacao.dataReavaliacao}</th>
        <th class="text-center">Variação</th>
        <th>Situação</th>
      </tr>
    </thead>
    <tbody>
      ${tabelaSimetria.map(r => `
        <tr>
          <td>${r.movimento}</td>
          <td class="text-center">${r.t1.toFixed(1).replace('.', ',')}%</td>
          <td class="text-center font-bold">${r.t2.toFixed(1).replace('.', ',')}%</td>
          <td class="text-center font-bold" style="color:${r.variacaoPP < 0 ? '#059669' : '#dc2626'}">
            ${r.variacaoPP > 0 ? `+${r.variacaoPP.toFixed(1).replace('.', ',')} p.p.` : `${r.variacaoPP.toFixed(1).replace('.', ',')} p.p.`}
          </td>
          <td>${r.situacao}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- 8. TESTES FUNCIONAIS -->
  <div class="section-title">8. TESTES FUNCIONAIS</div>

  <div class="subsection-title">8.1 Y Teste (equilíbrio dinâmico)</div>
  <table>
    <thead>
      <tr>
        <th>Variável</th>
        <th class="text-center">${identificacao.dataRelatorioInicial}</th>
        <th class="text-center">${identificacao.dataReavaliacao}</th>
        <th class="text-center">Variação</th>
        <th>Leitura</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Composite Score direito</td>
        <td class="text-center">${testesFuncionais.yTeste.compositeScoreD.t1.toFixed(1).replace('.', ',')}%</td>
        <td class="text-center font-bold">${testesFuncionais.yTeste.compositeScoreD.t2.toFixed(1).replace('.', ',')}%</td>
        <td class="text-center font-bold" style="color:#059669;">+${testesFuncionais.yTeste.compositeScoreD.deltaPP.toFixed(1).replace('.', ',')} p.p.</td>
        <td>${testesFuncionais.yTeste.compositeScoreD.leitura}</td>
      </tr>
      <tr>
        <td>Composite Score esquerdo</td>
        <td class="text-center">${testesFuncionais.yTeste.compositeScoreE.t1.toFixed(1).replace('.', ',')}%</td>
        <td class="text-center font-bold">${testesFuncionais.yTeste.compositeScoreE.t2.toFixed(1).replace('.', ',')}%</td>
        <td class="text-center font-bold" style="color:#059669;">+${testesFuncionais.yTeste.compositeScoreE.deltaPP.toFixed(1).replace('.', ',')} p.p.</td>
        <td>${testesFuncionais.yTeste.compositeScoreE.leitura}</td>
      </tr>
      <tr>
        <td>Alcance anterior (diferença entre lados)</td>
        <td class="text-center">${testesFuncionais.yTeste.alcanceAnteriorDif.t1.toFixed(1).replace('.', ',')} cm</td>
        <td class="text-center font-bold">${testesFuncionais.yTeste.alcanceAnteriorDif.t2.toFixed(1).replace('.', ',')} cm</td>
        <td class="text-center font-bold" style="color:#dc2626;">+${testesFuncionais.yTeste.alcanceAnteriorDif.deltaCm.toFixed(1).replace('.', ',')} cm</td>
        <td>${testesFuncionais.yTeste.alcanceAnteriorDif.leitura}</td>
      </tr>
      <tr>
        <td>Alcance posteromedial (diferença)</td>
        <td class="text-center">${testesFuncionais.yTeste.alcancePosteromedialDif.t1.toFixed(1).replace('.', ',')} cm</td>
        <td class="text-center font-bold">${testesFuncionais.yTeste.alcancePosteromedialDif.t2.toFixed(1).replace('.', ',')} cm</td>
        <td class="text-center font-bold" style="color:#059669;">-${Math.abs(testesFuncionais.yTeste.alcancePosteromedialDif.deltaCm).toFixed(1).replace('.', ',')} cm</td>
        <td>${testesFuncionais.yTeste.alcancePosteromedialDif.leitura}</td>
      </tr>
      <tr>
        <td>Alcance posterolateral (diferença)</td>
        <td class="text-center">${testesFuncionais.yTeste.alcancePosterolateralDif.t1.toFixed(1).replace('.', ',')} cm</td>
        <td class="text-center font-bold">${testesFuncionais.yTeste.alcancePosterolateralDif.t2.toFixed(1).replace('.', ',')} cm</td>
        <td class="text-center font-bold" style="color:#059669;">-${Math.abs(testesFuncionais.yTeste.alcancePosterolateralDif.deltaCm).toFixed(1).replace('.', ',')} cm</td>
        <td>${testesFuncionais.yTeste.alcancePosterolateralDif.leitura}</td>
      </tr>
    </tbody>
  </table>
  <p style="font-size:9.5pt; color:#334155;">${testesFuncionais.yTeste.parecer}</p>

  <div class="subsection-title">8.2 Step Down Test (controle dinâmico)</div>
  <table>
    <thead>
      <tr>
        <th>Variável</th>
        <th class="text-center">${identificacao.dataRelatorioInicial}</th>
        <th class="text-center">${identificacao.dataReavaliacao}</th>
        <th class="text-center">Variação</th>
        <th>Leitura</th>
      </tr>
    </thead>
    <tbody>
      ${testesFuncionais.stepDown.map(r => `
        <tr>
          <td>${r.variavel}</td>
          <td class="text-center">${r.t1.toFixed(1).replace('.', ',')}°</td>
          <td class="text-center font-bold">${r.t2.toFixed(1).replace('.', ',')}°</td>
          <td class="text-center font-bold" style="color:${r.variacao < 0 ? '#059669' : (r.variavel.includes('Queda pélvica') ? '#dc2626' : '#059669')}">
            ${r.variacao > 0 ? `+${r.variacao.toFixed(1).replace('.', ',')}°` : `${r.variacao.toFixed(1).replace('.', ',')}°`}
          </td>
          <td>${r.leitura}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- 9. AMPLITUDE DE MOVIMENTO (GONIOMETRIA) -->
  <div class="section-title">9. AMPLITUDE DE MOVIMENTO (GONIOMETRIA)</div>
  <table>
    <thead>
      <tr>
        <th>Movimento</th>
        <th class="text-center">Referência</th>
        <th class="text-center">${identificacao.dataRelatorioInicial}</th>
        <th class="text-center">${identificacao.dataReavaliacao}</th>
        <th class="text-center">Variação</th>
        <th>Leitura</th>
      </tr>
    </thead>
    <tbody>
      ${tabelaGoniometria.map(r => `
        <tr>
          <td>${r.movimento}</td>
          <td class="text-center">${r.referencia}</td>
          <td class="text-center">${r.t1 !== null ? `${r.t1}°` : '—'}</td>
          <td class="text-center font-bold">${r.t2 !== null ? `${r.t2}°` : '—'}</td>
          <td class="text-center">${r.variacao}</td>
          <td>${r.leitura}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- 10. TESTES ORTOPÉDICOS ESPECIAIS -->
  <div class="section-title">10. TESTES ORTOPÉDICOS ESPECIAIS — COMPARATIVO</div>
  <table>
    <thead>
      <tr>
        <th style="width:35%;">Teste</th>
        <th class="text-center" style="width:25%;">${identificacao.dataRelatorioInicial}</th>
        <th class="text-center" style="width:25%;">${identificacao.dataReavaliacao}</th>
        <th style="width:15%;">Leitura</th>
      </tr>
    </thead>
    <tbody>
      ${tabelaTestesOrtopedicos.map(r => `
        <tr>
          <td class="font-bold">${r.teste}</td>
          <td class="text-center">${r.t1}</td>
          <td class="text-center">${r.t2}</td>
          <td>${r.leitura}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- 11. FATORES DE EVOLUÇÃO -->
  <div class="section-title">11. FATORES DE EVOLUÇÃO</div>
  <p>O ciclo de ${identificacao.intervaloSemanas} semanas produziu ganho de força em praticamente todo o mapa muscular avaliado, com melhora simultânea de simetria e de controle dinâmico. Os destaques são:</p>
  <ul class="bullet-list">
    ${narrative.fatoresEvolucao.map(item => `<li>${item}</li>`).join('')}
  </ul>

  <!-- 12. FATORES QUE NÃO APRESENTARAM MELHORA -->
  <div class="section-title">12. FATORES QUE NÃO APRESENTARAM MELHORA</div>
  <ul class="bullet-list">
    ${narrative.fatoresNaoApresentaramMelhora.map(item => `<li>${item}</li>`).join('')}
  </ul>

  <!-- 13. FATORES COM INVOLUÇÃO -->
  <div class="section-title">13. FATORES COM INVOLUÇÃO</div>
  <ul class="bullet-list">
    ${narrative.fatoresComInvolucao.map(item => `<li>${item}</li>`).join('')}
  </ul>

  <!-- 14. FATORES DE RISCO PARA O COMPARTIMENTO MEDIAL DO JOELHO -->
  <div class="section-title">14. FATORES DE RISCO PARA O COMPARTIMENTO MEDIAL DO JOELHO</div>
  <p>${narrative.riscoCompartimentoMedialJoelho.introducao}</p>
  <ul class="bullet-list">
    ${narrative.riscoCompartimentoMedialJoelho.itens.map(item => `<li>${item}</li>`).join('')}
  </ul>

  <!-- 15. FATORES DE RISCO PARA O COMPARTIMENTO MEDIAL DO TORNOZELO -->
  <div class="section-title">15. FATORES DE RISCO PARA O COMPARTIMENTO MEDIAL DO TORNOZELO</div>
  <p>${narrative.riscoCompartimentoMedialTornozelo.introducao}</p>
  <ul class="bullet-list">
    ${narrative.riscoCompartimentoMedialTornozelo.itens.map(item => `<li>${item}</li>`).join('')}
  </ul>

  <!-- 16. CONCLUSÃO -->
  <div class="section-title">16. CONCLUSÃO</div>
  ${narrative.conclusao.map(p => `<p>${p}</p>`).join('')}

  <!-- 17. PRIORIDADES TERAPÊUTICAS SUGERIDAS -->
  <div class="section-title">17. PRIORIDADES TERAPÊUTICAS SUGERIDAS</div>
  <ol class="numbered-list">
    ${narrative.prioridadesTerapeuticas.map(item => `<li>${item}</li>`).join('')}
  </ol>

  <!-- 18. ASSINATURA -->
  <div class="signature-section">
    <div class="section-title">18. ASSINATURA</div>
    <div class="signature-line"></div>
    <div class="signature-name">${identificacao.avaliadorInicial.split('—')[0].trim()}</div>
    <div class="signature-role">Fisioterapia — ${identificacao.avaliadorInicial.split('—')[1]?.trim() || 'CREFITO'}</div>
    <div class="signature-role">Clube Fitness Fisio — Fisioterapia, Quiropraxia e Fortalecimento</div>
    <p style="margin-top:14px; font-size:9pt; color:#475569;">
      Reavaliação realizada em ${identificacao.dataReavaliacao} por ${identificacao.avaliadorReavaliacao}.
    </p>
  </div>

</body>
</html>
  `.trim();
}

/** Abre iframe e dispara impressão / salvar como PDF nativo do navegador */
export function downloadReavaliacaoLaudoPDF(computed: LongitudinalComputedResult, narrative: ClinicalNarrative): void {
  const htmlContent = generateReavaliacaoHTML(computed, narrative);

  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = 'none';
  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
  if (!doc) {
    alert('Erro ao abrir janela de impressão do PDF.');
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch (e) {
      console.error('Erro ao acionar impressão:', e);
    } finally {
      setTimeout(() => {
        document.body.removeChild(printIframe);
      }, 2000);
    }
  }, 500);
}
