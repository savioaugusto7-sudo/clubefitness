/**
 * Gerador de Laudo de Reavaliação Fisioterapêutica em PDF de Alta Fidelidade (18 Seções)
 * Reprodução Exata do Padrão Científico e Editorial de Referência.
 */

import { LongitudinalComputedResult } from './longitudinalEngine';
import { ClinicalNarrative } from './clinicalReasoningEngine';
import { detectCompartment, COMPARTIMENTOS_METADATA } from './fisioterapiaQueixasCatalog';

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
      margin: 18mm 20mm 18mm 20mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0 4mm;
      font-size: 10pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .laudo-container {
      width: 100%;
      max-width: 170mm;
      margin: 0 auto;
      padding: 0 4mm;
      box-sizing: border-box;
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
      margin: 8px 0 14px 22px;
      padding: 0 4px 0 0;
      list-style-type: disc;
    }
    ul.bullet-list li {
      margin-bottom: 7px;
      text-align: justify;
      font-size: 9.5pt;
      line-height: 1.5;
    }
    ol.numbered-list {
      margin: 8px 0 14px 22px;
      padding: 0 4px 0 0;
    }
    ol.numbered-list li {
      margin-bottom: 7px;
      text-align: justify;
      font-size: 9.5pt;
      line-height: 1.5;
    }
    .signature-section {
      margin-top: 40px;
      padding-top: 20px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .signature-container {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      margin: 30px 0 10px 0;
    }
    .signature-box {
      text-align: center;
      display: inline-block;
      min-width: 320px;
      max-width: 480px;
      margin: 0 auto;
    }
    .signature-line {
      width: 340px;
      border-top: 1.5px solid #0f172a;
      margin: 0 auto 10px auto;
    }
    .signature-name {
      font-weight: 800;
      font-size: 11pt;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      text-align: center;
    }
    .signature-role {
      font-size: 9pt;
      color: #475569;
      font-weight: 500;
      text-align: center;
      margin-top: 2px;
    }
    .signature-note {
      margin-top: 16px;
      font-size: 8.5pt;
      color: #64748b;
      font-style: italic;
      text-align: center;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <div class="laudo-container">

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
    <strong>Idade:</strong> ${historicoClinicoBase.idade}. 
    <strong>Histórico e Patologias:</strong> ${historicoClinicoBase.patologiasPregressas}. 
    <strong>Medicamentos:</strong> ${historicoClinicoBase.medicamentos}. 
    <strong>Cirurgias/Traumas:</strong> ${historicoClinicoBase.historicoCirurgiasTraumas}. 
    <strong>Atividade/Demanda:</strong> ${historicoClinicoBase.demandaEsportiva}. 
    <strong>Diagnóstico Inicial:</strong> ${historicoClinicoBase.queixaInicialDiagnostico}.
  </p>

  ${(narrative as any).discussaoClinica ? `
  <!-- SÍNTESE CLÍNICA E EVOLUÇÃO DIAGNÓSTICA -->
  <div class="section-title" style="background:#0f172a; color:#38bdf8; border-left:4px solid #38bdf8;">
    SÍNTESE CLÍNICA E EVOLUÇÃO DIAGNÓSTICA DO PACIENTE
  </div>
  <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 9.5pt; line-height: 1.6; color: #1e293b;">
    ${(narrative as any).discussaoClinica.split('\n\n').map((p: string) => `<p style="margin: 0 0 8px 0;">${p.trim()}</p>`).join('')}
  </div>
  ` : ''}

  ${(computed as any).acwr && (computed as any).matrizDecisao ? `
  <!-- MONITORAMENTO DE CARGA ACWR & WELLNESS -->
  <div style="background:#f8fafc; border:1px solid #cbd5e1; border-left:4px solid ${(computed as any).matrizDecisao.semaforoCor}; border-radius:6px; padding:10px 14px; margin-bottom:18px; font-size:8.5pt;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
      <strong style="color:#0f172a; text-transform:uppercase;">Monitoramento de Carga (ACWR) e Prontidão de Treino (Wellness)</strong>
      <span style="font-weight:700; color:${(computed as any).matrizDecisao.semaforoCor};">${(computed as any).matrizDecisao.semaforoLabel}</span>
    </div>
    <p style="margin:0 0 4px; color:#334155;">
      <strong>Razão ACWR:</strong> ${(computed as any).acwr.acwr.toFixed(2)} (${(computed as any).acwr.zonaLabel}) • 
      <strong>Carga Aguda 7d:</strong> ${(computed as any).acwr.cargaAguda7d} UA • 
      <strong>Carga Crônica 28d:</strong> ${(computed as any).acwr.cargaCronica28dMediaSemanal} UA • 
      <strong>Score Wellness:</strong> ${(computed as any).matrizDecisao.wellnessScore}/30 (${(computed as any).matrizDecisao.wellnessStatusLabel}).
    </p>
    <p style="margin:0; color:${(computed as any).matrizDecisao.semaforoCor}; font-weight:700;">
      🎯 <strong>Diretriz Interdisciplinar para o Treinador:</strong> ${(computed as any).matrizDecisao.diretrizTreinador}
    </p>
  </div>
  ` : ''}

  <!-- 4. COMPARATIVO DE QUEIXAS DOLOROSAS (EVA 0–10) -->
  <div class="section-title">4. COMPARATIVO DE QUEIXAS DOLOROSAS (EVA 0–10)</div>
  ${tabelaEVA.rows.length === 0 ? `
    <div class="ressalva-box" style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:6px; color:#64748b; font-style:normal;">
      Sem queixas dolorosas ativas quantificadas em prontuário para o período avaliado.
    </div>
  ` : `
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
        ${tabelaEVA.rows.map(r => {
          const comp = detectCompartment(r.queixa);
          const meta = comp ? COMPARTIMENTOS_METADATA[comp] : null;
          return `
          <tr>
            <td class="font-bold">
              ${r.queixa}
              ${meta ? `<span style="background:${meta.bg}; color:${meta.cor}; border:1px solid ${meta.border}; padding:1px 5px; border-radius:3px; font-size:7.5pt; font-weight:700; margin-left:6px; display:inline-block;">${comp}</span>` : ''}
            </td>
            <td class="text-center">${r.t1}</td>
            <td class="text-center">${r.t2}</td>
            <td class="text-center font-bold" style="color:${r.variacao < 0 ? '#059669' : '#0f172a'}">${r.variacao > 0 ? `+${r.variacao}` : r.variacao}</td>
            <td>${r.situacao}</td>
          </tr>
        `;
        }).join('')}
        <tr style="background:#f1f5f9; font-weight:700;">
          <td>Soma das queixas</td>
          <td class="text-center">${tabelaEVA.somaQueixasT1}</td>
          <td class="text-center">${tabelaEVA.somaQueixasT2}</td>
          <td class="text-center" style="color:#059669;">${tabelaEVA.deltaSoma > 0 ? `+${tabelaEVA.deltaSoma}` : tabelaEVA.deltaSoma}</td>
          <td>${tabelaEVA.deltaSoma < 0 ? 'Melhora global' : (tabelaEVA.deltaSoma === 0 ? 'Estável' : 'Aumento de queixas')}</td>
        </tr>
      </tbody>
    </table>
    <p style="font-size:9.5pt; color:#334155;"><strong>Observação:</strong> ${tabelaEVA.observacoesClinicas}</p>
  `}

  <!-- 5. COMPARATIVO DE FORÇA MUSCULAR (NEWTONS) -->
  <div class="section-title">5. COMPARATIVO DE FORÇA MUSCULAR (newtons)</div>
  ${tabelaForca.length === 0 ? `
    <div class="ressalva-box" style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:6px; color:#64748b; font-style:normal;">
      Dinamometria computadorizada não realizada neste ciclo avaliativo.
    </div>
  ` : `
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
  `}

  <!-- 6. RAZÕES MUSCULARES E ÍNDICES BIOMECÂNICOS -->
  <div class="section-title">6. RAZÕES MUSCULARES E ÍNDICES BIOMECÂNICOS</div>
  ${tabelaRazoes.rows.length === 0 ? `
    <div class="ressalva-box" style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:6px; color:#64748b; font-style:normal;">
      Índices de equilíbrio muscular dependem da mensuração de dinamometria (não realizada no ciclo).
    </div>
  ` : `
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
    <p style="font-size:9.5pt; color:#334155; margin-bottom:6px;"><strong>Análise da razão H:Q:</strong> ${tabelaRazoes.analisePorLadoIQ}</p>
    ${computed.razoesAvancadas && computed.razoesAvancadas.length > 0 ? `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; page-break-inside:avoid;">
        ${computed.razoesAvancadas.map(rz => `
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-left:3.5px solid ${rz.statusGeral === 'critico' ? '#ef4444' : rz.statusGeral === 'atencao' ? '#f59e0b' : '#10b981'}; padding:7px 10px; border-radius:4px; font-size:8pt;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <strong style="color:#0f172a;">${rz.nome}</strong>
              <span style="font-weight:700; color:${rz.statusGeral === 'critico' ? '#ef4444' : rz.statusGeral === 'atencao' ? '#b45309' : '#047857'};">${rz.valorGeral !== null ? `${rz.valorGeral}${rz.unidade}` : '-'}</span>
            </div>
            <div style="color:#475569; font-size:7.5pt; line-height:1.35; margin-bottom:3px;">${rz.diagnosticoClinico}</div>
            <div style="color:#047857; font-size:7.5pt; font-weight:700; background:rgba(16,185,129,0.08); padding:3px 6px; border-radius:3px;">🎯 Diretriz de Treino: ${rz.diretrizTreinador}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  `}

  <!-- 7. ANÁLISE DE SIMETRIA ENTRE MEMBROS -->
  <div class="section-title">7. ANÁLISE DE SIMETRIA ENTRE MEMBROS (déficit percentual)</div>
  ${tabelaSimetria.length === 0 ? `
    <div class="ressalva-box" style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:6px; color:#64748b; font-style:normal;">
      Análise de simetria dinamométrica não disponível para as mensurações atuais.
    </div>
  ` : `
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
  `}

  <!-- 8. TESTES FUNCIONAIS -->
  ${(testesFuncionais.yTeste || testesFuncionais.stepDown.length > 0 || testesFuncionais.hopTest || testesFuncionais.visaP) ? `
    <div class="section-title">8. TESTES FUNCIONAIS</div>

    ${testesFuncionais.yTeste ? `
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
            <td class="text-center font-bold" style="color:#059669;">${testesFuncionais.yTeste.compositeScoreD.deltaPP >= 0 ? '+' : ''}${testesFuncionais.yTeste.compositeScoreD.deltaPP.toFixed(1).replace('.', ',')} p.p.</td>
            <td>${testesFuncionais.yTeste.compositeScoreD.leitura}</td>
          </tr>
          <tr>
            <td>Composite Score esquerdo</td>
            <td class="text-center">${testesFuncionais.yTeste.compositeScoreE.t1.toFixed(1).replace('.', ',')}%</td>
            <td class="text-center font-bold">${testesFuncionais.yTeste.compositeScoreE.t2.toFixed(1).replace('.', ',')}%</td>
            <td class="text-center font-bold" style="color:#059669;">${testesFuncionais.yTeste.compositeScoreE.deltaPP >= 0 ? '+' : ''}${testesFuncionais.yTeste.compositeScoreE.deltaPP.toFixed(1).replace('.', ',')} p.p.</td>
            <td>${testesFuncionais.yTeste.compositeScoreE.leitura}</td>
          </tr>
          <tr>
            <td>Alcance anterior (diferença entre lados)</td>
            <td class="text-center">${testesFuncionais.yTeste.alcanceAnteriorDif.t1.toFixed(1).replace('.', ',')} cm</td>
            <td class="text-center font-bold">${testesFuncionais.yTeste.alcanceAnteriorDif.t2.toFixed(1).replace('.', ',')} cm</td>
            <td class="text-center font-bold" style="color:${testesFuncionais.yTeste.alcanceAnteriorDif.deltaCm <= 0 ? '#059669' : '#dc2626'}">${testesFuncionais.yTeste.alcanceAnteriorDif.deltaCm >= 0 ? '+' : ''}${testesFuncionais.yTeste.alcanceAnteriorDif.deltaCm.toFixed(1).replace('.', ',')} cm</td>
            <td>${testesFuncionais.yTeste.alcanceAnteriorDif.leitura}</td>
          </tr>
          <tr>
            <td>Alcance posteromedial (diferença)</td>
            <td class="text-center">${testesFuncionais.yTeste.alcancePosteromedialDif.t1.toFixed(1).replace('.', ',')} cm</td>
            <td class="text-center font-bold">${testesFuncionais.yTeste.alcancePosteromedialDif.t2.toFixed(1).replace('.', ',')} cm</td>
            <td class="text-center font-bold" style="color:#059669;">${testesFuncionais.yTeste.alcancePosteromedialDif.deltaCm >= 0 ? '+' : ''}${testesFuncionais.yTeste.alcancePosteromedialDif.deltaCm.toFixed(1).replace('.', ',')} cm</td>
            <td>${testesFuncionais.yTeste.alcancePosteromedialDif.leitura}</td>
          </tr>
          <tr>
            <td>Alcance posterolateral (diferença)</td>
            <td class="text-center">${testesFuncionais.yTeste.alcancePosterolateralDif.t1.toFixed(1).replace('.', ',')} cm</td>
            <td class="text-center font-bold">${testesFuncionais.yTeste.alcancePosterolateralDif.t2.toFixed(1).replace('.', ',')} cm</td>
            <td class="text-center font-bold" style="color:#059669;">${testesFuncionais.yTeste.alcancePosterolateralDif.deltaCm >= 0 ? '+' : ''}${testesFuncionais.yTeste.alcancePosterolateralDif.deltaCm.toFixed(1).replace('.', ',')} cm</td>
            <td>${testesFuncionais.yTeste.alcancePosterolateralDif.leitura}</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size:9.5pt; color:#334155;">${testesFuncionais.yTeste.parecer}</p>
    ` : ''}

    ${testesFuncionais.stepDown.length > 0 ? `
      <div class="subsection-title">${testesFuncionais.yTeste ? '8.2' : '8.1'} Step Down Test (controle dinâmico)</div>
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
    ` : ''}

    ${testesFuncionais.hopTest ? `
      <div class="subsection-title">${(testesFuncionais.yTeste ? 1 : 0) + (testesFuncionais.stepDown.length > 0 ? 1 : 0) === 2 ? '8.3' : (testesFuncionais.yTeste || testesFuncionais.stepDown.length > 0 ? '8.2' : '8.1')} Bateria de Hop Tests (Simetria LSI ≥ 90% — Noyes et al.)</div>
      <p style="font-size:9pt; color:#475569; margin-bottom:8px;">
        Avaliação canônica de potência horizontal, capacidade de frenagem e estabilidade neuromuscular unipodal para critérios de Liberação de Corrida e Retorno ao Esporte (<em>Return to Sport - RTS</em>).
        ${testesFuncionais.hopTest.membroAfetado && testesFuncionais.hopTest.membroAfetado !== 'Nenhum' ? `<strong>Membro Acometido:</strong> ${testesFuncionais.hopTest.membroAfetado}.` : ''}
      </p>
      <table>
        <thead>
          <tr>
            <th>Teste de Salto Unipodal</th>
            <th class="text-center">Direito (D)</th>
            <th class="text-center">Esquerdo (E)</th>
            <th class="text-center">LSI (%)</th>
            <th class="text-center">Dominância</th>
            <th>Classificação</th>
          </tr>
        </thead>
        <tbody>
          ${testesFuncionais.hopTest.testes.map(t => `
            <tr>
              <td>
                <div class="font-bold">${t.nome}</div>
                <div style="font-size:7.5pt; color:#64748b;">${t.subtitulo}</div>
              </td>
              <td class="text-center font-bold">${t.valorD.toFixed(t.unidade === 's' ? 2 : 1).replace('.', ',')} ${t.unidade}</td>
              <td class="text-center font-bold">${t.valorE.toFixed(t.unidade === 's' ? 2 : 1).replace('.', ',')} ${t.unidade}</td>
              <td class="text-center font-bold" style="color:${t.status === 'otimo' ? '#059669' : t.status === 'atencao' ? '#d97706' : '#dc2626'}">
                ${t.lsiPct.toFixed(1).replace('.', ',')}%
              </td>
              <td class="text-center" style="font-size:8pt; font-weight:600; color:#475569;">${t.ladoDominante}</td>
              <td>
                <span style="display:inline-block; padding:1px 6px; border-radius:3px; font-size:7.5pt; font-weight:700; ${
                  t.status === 'otimo' 
                    ? 'background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0;' 
                    : t.status === 'atencao'
                    ? 'background:#fffbeb; color:#92400e; border:1px solid #fde68a;'
                    : 'background:#fef2f2; color:#991b1b; border:1px solid #fecaca;'
                }">
                  ${t.status === 'otimo' ? 'Apto (≥ 90%)' : t.status === 'atencao' ? 'Atenção (80–89%)' : 'Retenção (< 80%)'}
                </span>
              </td>
            </tr>
          `).join('')}
          <tr style="background:#f8fafc; font-weight:700; border-top:2px solid #cbd5e1;">
            <td>Índice de Simetria Médio (LSI Global)</td>
            <td colspan="2" class="text-center" style="font-size:8.5pt; color:#475569;">${testesFuncionais.hopTest.testes.length} de 4 testes calculados</td>
            <td class="text-center font-bold" style="font-size:10pt; color:${testesFuncionais.hopTest.lsiMedio >= 90 ? '#059669' : testesFuncionais.hopTest.lsiMedio >= 80 ? '#d97706' : '#dc2626'};">
              ${testesFuncionais.hopTest.lsiMedio.toFixed(1).replace('.', ',')}%
            </td>
            <td colspan="2" class="text-center">
              <span style="font-weight:800; font-size:8.5pt; color:${testesFuncionais.hopTest.statusGeral === 'liberado' ? '#047857' : testesFuncionais.hopTest.statusGeral === 'fase_intermediaria' ? '#b45309' : '#b91c1c'};">
                ${testesFuncionais.hopTest.statusGeral === 'liberado' ? '✅ LIBERADO' : testesFuncionais.hopTest.statusGeral === 'fase_intermediaria' ? '⚠️ FASE INTERMEDIÁRIA' : '🛑 RETENÇÃO'}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:8px; padding:10px 12px; background:${testesFuncionais.hopTest.statusGeral === 'liberado' ? '#ecfdf5' : testesFuncionais.hopTest.statusGeral === 'fase_intermediaria' ? '#fffbeb' : '#fef2f2'}; border:1px solid ${testesFuncionais.hopTest.statusGeral === 'liberado' ? '#a7f3d0' : testesFuncionais.hopTest.statusGeral === 'fase_intermediaria' ? '#fde68a' : '#fecaca'}; border-radius:6px; font-size:8.5pt;">
        <div style="margin-bottom:4px; color:#1e293b;"><strong>Parecer Clínico RTS:</strong> ${testesFuncionais.hopTest.parecerRTS}</div>
        <div style="color:${testesFuncionais.hopTest.statusGeral === 'liberado' ? '#047857' : testesFuncionais.hopTest.statusGeral === 'fase_intermediaria' ? '#92400e' : '#991b1b'}; font-weight:700;"><strong>🎯 Diretriz para o Treinador:</strong> ${testesFuncionais.hopTest.diretrizTreinador}</div>
      </div>
    ` : ''}

    ${testesFuncionais.visaP && testesFuncionais.visaP.atual ? `
      <div class="subsection-title">Questionário Validado VISA-P — Tendinopatia Patelar (Escala 0–100 • MCID = 13 pts)</div>
      <p style="font-size:9pt; color:#475569; margin-bottom:8px;">
        Instrumento específico internacional (<em>Victorian Institute of Sport Assessment – Patella</em>, Visentini et al., 1998 / Wageck et al., 2013) para quantificação da dor e capacidade de carga no tendão patelar.
        <strong>Joelho Avaliado:</strong> ${testesFuncionais.visaP.atual.membroAvaliado}.
      </p>
      <table>
        <thead>
          <tr>
            <th>Domínio Funcional Avaliado</th>
            <th class="text-center">Pontuação Máxima</th>
            ${testesFuncionais.visaP.anterior ? `<th class="text-center">${testesFuncionais.visaP.dataT1 || identificacao.dataRelatorioInicial}</th>` : ''}
            <th class="text-center">${testesFuncionais.visaP.dataT2 || identificacao.dataReavaliacao}</th>
            ${testesFuncionais.visaP.anterior ? `<th class="text-center">Variação</th>` : ''}
            <th>Interpretação Clínica</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-bold">1. Sintomas & Dor (Q1, Q2, Q3, Q6)</td>
            <td class="text-center">40 pts</td>
            ${testesFuncionais.visaP.anterior ? `<td class="text-center">${testesFuncionais.visaP.anterior.scoreSintomasDor} pts</td>` : ''}
            <td class="text-center font-bold">${testesFuncionais.visaP.atual.scoreSintomasDor} pts</td>
            ${testesFuncionais.visaP.anterior ? `<td class="text-center font-bold">${testesFuncionais.visaP.atual.scoreSintomasDor - testesFuncionais.visaP.anterior.scoreSintomasDor >= 0 ? '+' : ''}${testesFuncionais.visaP.atual.scoreSintomasDor - testesFuncionais.visaP.anterior.scoreSintomasDor} pts</td>` : ''}
            <td>Tolerância sentado, escadas, extensão ativa e 10 saltos unipodais</td>
          </tr>
          <tr>
            <td class="font-bold">2. Função Sob Carga (Q4 e Q5)</td>
            <td class="text-center">20 pts</td>
            ${testesFuncionais.visaP.anterior ? `<td class="text-center">${testesFuncionais.visaP.anterior.scoreFuncaoCarga} pts</td>` : ''}
            <td class="text-center font-bold">${testesFuncionais.visaP.atual.scoreFuncaoCarga} pts</td>
            ${testesFuncionais.visaP.anterior ? `<td class="text-center font-bold">${testesFuncionais.visaP.atual.scoreFuncaoCarga - testesFuncionais.visaP.anterior.scoreFuncaoCarga >= 0 ? '+' : ''}${testesFuncionais.visaP.atual.scoreFuncaoCarga - testesFuncionais.visaP.anterior.scoreFuncaoCarga} pts</td>` : ''}
            <td>Execução de Afundo (Lunge) e Agachamento Profundo</td>
          </tr>
          <tr>
            <td class="font-bold">3. Capacidade Esportiva (Q7 e Q8)</td>
            <td class="text-center">40 pts</td>
            ${testesFuncionais.visaP.anterior ? `<td class="text-center">${testesFuncionais.visaP.anterior.scoreCapacidadeEsportiva} pts</td>` : ''}
            <td class="text-center font-bold">${testesFuncionais.visaP.atual.scoreCapacidadeEsportiva} pts</td>
            ${testesFuncionais.visaP.anterior ? `<td class="text-center font-bold">${testesFuncionais.visaP.atual.scoreCapacidadeEsportiva - testesFuncionais.visaP.anterior.scoreCapacidadeEsportiva >= 0 ? '+' : ''}${testesFuncionais.visaP.atual.scoreCapacidadeEsportiva - testesFuncionais.visaP.anterior.scoreCapacidadeEsportiva} pts</td>` : ''}
            <td>Nível de treino e tempo tolerado (${testesFuncionais.visaP.atual.respostas.q8TipoDorTreino})</td>
          </tr>
          <tr style="background:#f8fafc; font-weight:700; border-top:2px solid #cbd5e1;">
            <td>Escore Global VISA-P</td>
            <td class="text-center">100 pts (Corte ≥ 80)</td>
            ${testesFuncionais.visaP.anterior ? `<td class="text-center">${testesFuncionais.visaP.anterior.scoreTotal}/100</td>` : ''}
            <td class="text-center font-bold" style="font-size:10pt; color:${testesFuncionais.visaP.atual.scoreTotal >= 80 ? '#059669' : testesFuncionais.visaP.atual.scoreTotal >= 65 ? '#d97706' : '#dc2626'};">
              ${testesFuncionais.visaP.atual.scoreTotal}/100
            </td>
            ${testesFuncionais.visaP.anterior && testesFuncionais.visaP.deltaPontos !== undefined ? `
              <td class="text-center font-bold" style="color:${testesFuncionais.visaP.deltaPontos >= 13 ? '#059669' : testesFuncionais.visaP.deltaPontos >= 0 ? '#0284c7' : '#dc2626'};">
                ${testesFuncionais.visaP.deltaPontos >= 0 ? `+${testesFuncionais.visaP.deltaPontos}` : testesFuncionais.visaP.deltaPontos} pts ${testesFuncionais.visaP.mcidAtingido ? '(MCID ≥ 13 ✓)' : ''}
              </td>
            ` : ''}
            <td>${testesFuncionais.visaP.atual.classificacaoLabel}</td>
          </tr>
        </tbody>
      </table>
      <div style="margin-top:8px; padding:10px 12px; background:#f8fafc; border:1px solid #cbd5e1; border-left:4px solid ${testesFuncionais.visaP.atual.badgeCor}; border-radius:6px; font-size:8.5pt;">
        <div style="margin-bottom:4px; color:#1e293b;"><strong>${testesFuncionais.visaP.atual.estagioTendineo}:</strong> ${testesFuncionais.visaP.atual.parecerClinico}</div>
        ${testesFuncionais.visaP.leituraComparativa ? `<div style="margin-bottom:4px; color:#0369a1; font-weight:600;">${testesFuncionais.visaP.leituraComparativa}</div>` : ''}
        <div style="color:#047857; font-weight:700;"><strong>🎯 Diretriz de Carga Tendínea para o Treinador:</strong> ${testesFuncionais.visaP.atual.diretrizTreinador}</div>
      </div>
    ` : ''}
  ` : ''}

  <!-- 9. AMPLITUDE DE MOVIMENTO (GONIOMETRIA) -->
  ${tabelaGoniometria.length > 0 ? `
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
  ` : ''}

  <!-- 9.1 MOBILIDADE DA COLUNA VERTEBRAL -->
  ${(computed.tabelaColuna && computed.tabelaColuna.length > 0) ? `
    <div class="section-title">9.1 MOBILIDADE TRIDIMENSIONAL DA COLUNA VERTEBRAL (GONIOMETRIA E EVA)</div>
    <table>
      <thead>
        <tr>
          <th>Movimento</th>
          <th class="text-center">Referência</th>
          <th class="text-center">${identificacao.dataRelatorioInicial}</th>
          <th class="text-center">${identificacao.dataReavaliacao}</th>
          <th class="text-center">Variação (Graus)</th>
          <th class="text-center">Dor (EVA)</th>
          <th>Leitura</th>
        </tr>
      </thead>
      <tbody>
        ${computed.tabelaColuna.map(r => `
          <tr>
            <td class="font-bold">${r.movimento}</td>
            <td class="text-center">${r.referencia}</td>
            <td class="text-center">${r.t1 !== null ? `${r.t1}°` : '—'}</td>
            <td class="text-center font-bold">${r.t2 !== null ? `${r.t2}°` : '—'}</td>
            <td class="text-center font-bold" style="color:${r.variacaoGraus.startsWith('+') ? '#059669' : '#0f172a'}">${r.variacaoGraus}</td>
            <td class="text-center">${r.eva2 !== null ? `${r.eva2}/10` : '0/10'} (${r.variacaoEVA})</td>
            <td>${r.leitura}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <!-- 10. TESTES ORTOPÉDICOS ESPECIAIS -->
  ${tabelaTestesOrtopedicos.length > 0 ? `
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
  ` : ''}

  <!-- 11. FATORES DE EVOLUÇÃO -->
  <div class="section-title">11. FATORES DE EVOLUÇÃO</div>
  <p>A análise comparativa entre as avaliações documentou os seguintes destaques evolutivos:</p>
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

  <!-- 14. ANÁLISES SEGMENTARES BIOMECÂNICAS E FATORES DE RISCO -->
  ${((narrative as any).analisesSegmentares && (narrative as any).analisesSegmentares.length > 0) ? `
    ${(narrative as any).analisesSegmentares.map((seg: any, idx: number) => `
      <div class="section-title">${14 + idx}. ${seg.titulo}</div>
      <p>${seg.introducao}</p>
      <ul class="bullet-list">
        ${seg.itens.map((item: string) => `<li>${item}</li>`).join('')}
      </ul>
    `).join('')}
  ` : `
    ${(narrative.riscoCompartimentoMedialJoelho && narrative.riscoCompartimentoMedialJoelho.itens.length > 0 && !narrative.riscoCompartimentoMedialJoelho.itens[0].includes('Não foram identificados')) ? `
      <div class="section-title">14. FATORES DE RISCO PARA O COMPARTIMENTO MEDIAL DO JOELHO</div>
      <p>${narrative.riscoCompartimentoMedialJoelho.introducao}</p>
      <ul class="bullet-list">
        ${narrative.riscoCompartimentoMedialJoelho.itens.map(item => `<li>${item}</li>`).join('')}
      </ul>
    ` : ''}

    ${(narrative.riscoCompartimentoMedialTornozelo && narrative.riscoCompartimentoMedialTornozelo.itens.length > 0 && !narrative.riscoCompartimentoMedialTornozelo.itens[0].includes('Complexo articular')) ? `
      <div class="section-title">15. FATORES DE RISCO PARA O COMPARTIMENTO MEDIAL DO TORNOZELO</div>
      <p>${narrative.riscoCompartimentoMedialTornozelo.introducao}</p>
      <ul class="bullet-list">
        ${narrative.riscoCompartimentoMedialTornozelo.itens.map(item => `<li>${item}</li>`).join('')}
      </ul>
    ` : ''}
  `}

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
    <div class="signature-container">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-name">${identificacao.avaliadorReavaliacao.split('—')[0].trim()}</div>
        <div class="signature-role">${identificacao.avaliadorReavaliacao.split('—')[1]?.trim() || 'Fisioterapia'}</div>
        <div class="signature-role">Clube Fitness Fisio — Fisioterapia, Quiropraxia e Fortalecimento</div>
        <div class="signature-note">
          Avaliação inicial conduzida por ${identificacao.avaliadorInicial} (${identificacao.dataRelatorioInicial}).
        </div>
      </div>
    </div>
  </div>

  </div> <!-- fim .laudo-container -->
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
