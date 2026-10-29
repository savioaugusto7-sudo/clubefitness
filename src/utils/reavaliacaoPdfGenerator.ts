/**
 * Gerador de Laudo de Reavaliação Fisioterapêutica em PDF de Alta Fidelidade (18 Seções)
 * Reprodução Exata do Padrão Científico e Editorial de Referência.
 */

import { LongitudinalComputedResult } from './longitudinalEngine';
import { ClinicalNarrative } from './clinicalReasoningEngine';
import { detectCompartment, COMPARTIMENTOS_METADATA } from './fisioterapiaQueixasCatalog';

export function generateReavaliacaoHTML(computed: LongitudinalComputedResult, narrative: ClinicalNarrative): string {
  const { identificacao, objetivoDoLaudo, historicoClinicoBase, tabelaEVA, tabelaForca, tabelaRazoes, tabelaSimetria, testesFuncionais, tabelaGoniometria, tabelaTestesOrtopedicos } = computed;

  let secNum = 0;
  const nextSec = () => ++secNum;

  const isFilledField = (val: any) => {
    if (val === undefined || val === null) return false;
    const s = String(val).trim();
    if (!s) return false;
    const lower = s.toLowerCase();
    return !['-', '—', 'n/a', 'n/r', 'não informado', 'nao informado', 'não realizada', 'nao realizada', 'nenhum', 'nenhuma'].includes(lower);
  };

  const idRows = [
    { label: 'Paciente', val: identificacao.paciente },
    { label: 'Idade', val: identificacao.idade },
    { label: 'Sexo', val: identificacao.sexo },
    { label: 'CPF', val: identificacao.cpf },
    { label: 'Peso corporal', val: identificacao.pesoCorporal },
    { label: 'Data do relatório inicial', val: identificacao.dataRelatorioInicial },
    { label: 'Data da avaliação de força inicial', val: identificacao.dataForcaInicial !== identificacao.dataRelatorioInicial ? identificacao.dataForcaInicial : '' },
    { label: 'Data da reavaliação', val: identificacao.dataReavaliacao },
    { label: 'Intervalo entre avaliações', val: identificacao.intervaloSemanas ? `${identificacao.intervaloSemanas} semanas` : '' },
    { label: 'Avaliador da avaliação inicial', val: identificacao.avaliadorInicial },
    { label: 'Avaliador da reavaliação', val: identificacao.avaliadorReavaliacao }
  ].filter(r => isFilledField(r.val));

  const isFilledHist = (val: any) => {
    if (!isFilledField(val)) return false;
    const lower = String(val).trim().toLowerCase();
    return ![
      'sem patologias relatadas',
      'não faz uso contínuo',
      'nega cirurgias ou traumas prévios',
      'condicionamento geral',
      'avaliação funcional'
    ].includes(lower);
  };

  const histParts = [
    isFilledHist(historicoClinicoBase.idade) ? `<strong>Idade:</strong> ${historicoClinicoBase.idade}.` : '',
    isFilledHist(historicoClinicoBase.patologiasPregressas) ? `<strong>Histórico e Patologias:</strong> ${historicoClinicoBase.patologiasPregressas}.` : '',
    isFilledHist(historicoClinicoBase.medicamentos) ? `<strong>Medicamentos:</strong> ${historicoClinicoBase.medicamentos}.` : '',
    isFilledHist(historicoClinicoBase.historicoCirurgiasTraumas) ? `<strong>Cirurgias/Traumas:</strong> ${historicoClinicoBase.historicoCirurgiasTraumas}.` : '',
    isFilledHist(historicoClinicoBase.demandaEsportiva) ? `<strong>Atividade/Demanda:</strong> ${historicoClinicoBase.demandaEsportiva}.` : '',
    isFilledHist(historicoClinicoBase.queixaInicialDiagnostico) ? `<strong>Diagnóstico Inicial:</strong> ${historicoClinicoBase.queixaInicialDiagnostico}.` : ''
  ].filter(Boolean);

  const isFallbackNarrativeItem = (item: string) => {
    const lower = (item || '').trim().toLowerCase();
    return (
      !lower ||
      lower.startsWith('nenhum fator') ||
      lower.startsWith('não foram identificados') ||
      lower.startsWith('dados comparativos em consolidação') ||
      lower.startsWith('todos os parâmetros')
    );
  };

  const realFatoresEvolucao = (narrative.fatoresEvolucao || []).filter(i => !isFallbackNarrativeItem(i));
  const realFatoresSemMelhora = (narrative.fatoresNaoApresentaramMelhora || []).filter(i => !isFallbackNarrativeItem(i));
  const realFatoresInvolucao = (narrative.fatoresComInvolucao || []).filter(i => !isFallbackNarrativeItem(i));

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

  <!-- IDENTIFICAÇÃO -->
  <div class="section-title">${nextSec()}. IDENTIFICAÇÃO</div>
  <table>
    <thead>
      <tr>
        <th style="width: 45%;">Campo</th>
        <th>Dado</th>
      </tr>
    </thead>
    <tbody>
      ${idRows.map(r => `<tr><td class="font-bold">${r.label}</td><td>${r.val}</td></tr>`).join('')}
    </tbody>
  </table>

  ${isFilledField(identificacao.ressalvaMetodologica) ? `
  <div class="ressalva-box">
    ${identificacao.ressalvaMetodologica}
  </div>` : ''}

  <!-- OBJETIVO DO LAUDO -->
  ${isFilledField(objetivoDoLaudo) ? `
  <div class="section-title">${nextSec()}. OBJETIVO DO LAUDO</div>
  <p>${objetivoDoLaudo}</p>` : ''}

  <!-- HISTÓRICO CLÍNICO DE BASE -->
  ${histParts.length > 0 ? `
  <div class="section-title">${nextSec()}. HISTÓRICO CLÍNICO DE BASE</div>
  <p>
    ${histParts.join(' ')}
  </p>` : ''}

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

  <!-- COMPARATIVO DE QUEIXAS DOLOROSAS (EVA 0–10) -->
  ${tabelaEVA.rows.length > 0 ? `
    <div class="section-title">${nextSec()}. COMPARATIVO DE QUEIXAS DOLOROSAS (EVA 0–10)</div>
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
    ${isFilledField(tabelaEVA.observacoesClinicas) ? `<p style="font-size:9.5pt; color:#334155;"><strong>Observação:</strong> ${tabelaEVA.observacoesClinicas}</p>` : ''}
  ` : ''}

  <!-- COMPARATIVO DE FORÇA MUSCULAR (NEWTONS) -->
  ${tabelaForca.length > 0 ? `
    <div class="section-title">${nextSec()}. COMPARATIVO DE FORÇA MUSCULAR (newtons)</div>
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
  ` : ''}

  <!-- RAZÕES MUSCULARES E ÍNDICES BIOMECÂNICOS -->
  ${(tabelaRazoes.rows.length > 0 || (computed.razoesAvancadas && computed.razoesAvancadas.length > 0)) ? `
    <div class="section-title">${nextSec()}. RAZÕES MUSCULARES E ÍNDICES BIOMECÂNICOS</div>
    ${tabelaRazoes.rows.length > 0 ? `
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
    </table>` : ''}
    ${isFilledField(tabelaRazoes.analisePorLadoIQ) ? `<p style="font-size:9.5pt; color:#334155; margin-bottom:6px;"><strong>Análise da razão H:Q:</strong> ${tabelaRazoes.analisePorLadoIQ}</p>` : ''}
    ${computed.razoesAvancadas && computed.razoesAvancadas.length > 0 ? `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px; page-break-inside:avoid;">
        ${computed.razoesAvancadas.map(rz => `
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-left:3.5px solid ${rz.statusGeral === 'critico' ? '#ef4444' : rz.statusGeral === 'atencao' ? '#f59e0b' : '#10b981'}; padding:7px 10px; border-radius:4px; font-size:8pt;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <strong style="color:#0f172a;">${rz.nome}</strong>
              <span style="font-weight:700; color:${rz.statusGeral === 'critico' ? '#ef4444' : rz.statusGeral === 'atencao' ? '#b45309' : '#047857'};">${rz.valorGeral !== null ? `${rz.valorGeral}${rz.unidade}` : ''}</span>
            </div>
            <div style="color:#475569; font-size:7.5pt; line-height:1.35; margin-bottom:3px;">${rz.diagnosticoClinico}</div>
            <div style="color:#047857; font-size:7.5pt; font-weight:700; background:rgba(16,185,129,0.08); padding:3px 6px; border-radius:3px;">🎯 Diretriz de Treino: ${rz.diretrizTreinador}</div>
          </div>
        `).join('')}
      </div>
    ` : ''}
  ` : ''}

  <!-- ANÁLISE DE SIMETRIA ENTRE MEMBROS -->
  ${tabelaSimetria.length > 0 ? `
    <div class="section-title">${nextSec()}. ANÁLISE DE SIMETRIA ENTRE MEMBROS (déficit percentual)</div>
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
  ` : ''}

  <!-- TESTES FUNCIONAIS -->
  ${(testesFuncionais.yTeste || testesFuncionais.stepDown.length > 0 || testesFuncionais.hopTest || testesFuncionais.visaP) ? (() => {
    const funcSec = nextSec();
    let subSec = 0;
    return `
    <div class="section-title">${funcSec}. TESTES FUNCIONAIS</div>

    ${testesFuncionais.yTeste ? `
      <div class="subsection-title">${funcSec}.${++subSec} Y Teste (equilíbrio dinâmico)</div>
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
      <div class="subsection-title">${funcSec}.${++subSec} Step Down Test (controle dinâmico)</div>
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
      <div class="subsection-title">${funcSec}.${++subSec} Bateria de Hop Tests (Simetria LSI ≥ 90% — Noyes et al.)</div>
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
      <div class="subsection-title">${funcSec}.${++subSec} Questionário Validado VISA-P — Tendinopatia Patelar (Escala 0–100 • MCID = 13 pts)</div>
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
  `;
  })() : ''}

  <!-- AMPLITUDE DE MOVIMENTO (GONIOMETRIA) -->
  ${tabelaGoniometria.length > 0 ? `
    <div class="section-title">${nextSec()}. AMPLITUDE DE MOVIMENTO (GONIOMETRIA)</div>
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
            <td class="text-center">${r.t1 !== null ? `${r.t1}°` : ''}</td>
            <td class="text-center font-bold">${r.t2 !== null ? `${r.t2}°` : ''}</td>
            <td class="text-center">${r.variacao}</td>
            <td>${r.leitura}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <!-- MOBILIDADE DA COLUNA VERTEBRAL -->
  ${(computed.tabelaColuna && computed.tabelaColuna.length > 0) ? `
    <div class="section-title">${nextSec()}. MOBILIDADE TRIDIMENSIONAL DA COLUNA VERTEBRAL (GONIOMETRIA E EVA)</div>
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
            <td class="text-center">${r.t1 !== null ? `${r.t1}°` : ''}</td>
            <td class="text-center font-bold">${r.t2 !== null ? `${r.t2}°` : ''}</td>
            <td class="text-center font-bold" style="color:${r.variacaoGraus.startsWith('+') ? '#059669' : '#0f172a'}">${r.variacaoGraus}</td>
            <td class="text-center">${r.eva2 !== null ? `${r.eva2}/10` : '0/10'} (${r.variacaoEVA})</td>
            <td>${r.leitura}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <!-- TESTES ORTOPÉDICOS ESPECIAIS -->
  ${tabelaTestesOrtopedicos.length > 0 ? `
    <div class="section-title">${nextSec()}. TESTES ORTOPÉDICOS ESPECIAIS — COMPARATIVO</div>
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

  <!-- COMPOSIÇÃO CORPORAL E ANTROPOMETRIA -->
  ${(computed.tabelaComposicao && computed.tabelaComposicao.length > 0) ? `
    <div class="section-title">${nextSec()}. COMPOSIÇÃO CORPORAL E ANTROPOMETRIA — COMPARATIVO</div>
    <table>
      <thead>
        <tr>
          <th>Indicador</th>
          <th class="text-center">${identificacao.dataRelatorioInicial}</th>
          <th class="text-center">${identificacao.dataReavaliacao}</th>
          <th class="text-center">Variação</th>
          <th>Interpretação</th>
        </tr>
      </thead>
      <tbody>
        ${computed.tabelaComposicao.map(r => `
          <tr>
            <td class="font-bold">${r.metrica || r.parametro}</td>
            <td class="text-center">${r.t1 != null ? `${r.t1.toFixed(1).replace('.', ',')} ${r.unidade}` : ''}</td>
            <td class="text-center font-bold">${r.t2 != null ? `${r.t2.toFixed(1).replace('.', ',')} ${r.unidade}` : ''}</td>
            <td class="text-center font-bold" style="color:${r.leitura === 'Redução de gordura' || r.leitura === 'Ganho de massa magra' || r.leitura === 'Redução de medidas' || r.leitura === 'Redução de risco' ? '#059669' : '#0f172a'}">
              ${r.variacao.replace('.', ',')} ${r.unidade} (${r.variacaoPct.replace('.', ',')})
            </td>
            <td>${r.leitura}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <!-- DOBRAS CUTÂNEAS (POLLOCK) -->
  ${(computed.tabelaDobras && computed.tabelaDobras.length > 0) ? `
    <div class="section-title">${nextSec()}. DOBRAS CUTÂNEAS (POLLOCK — mm)</div>
    <table>
      <thead>
        <tr>
          <th>Dobra Cutânea</th>
          <th class="text-center">${identificacao.dataRelatorioInicial}</th>
          <th class="text-center">${identificacao.dataReavaliacao}</th>
          <th class="text-center">Variação (mm)</th>
          <th>Interpretação</th>
        </tr>
      </thead>
      <tbody>
        ${computed.tabelaDobras.map(r => `
          <tr>
            <td class="font-bold">${r.dobra}</td>
            <td class="text-center">${r.t1 != null ? `${r.t1.toFixed(1).replace('.', ',')} mm` : ''}</td>
            <td class="text-center font-bold">${r.t2 != null ? `${r.t2.toFixed(1).replace('.', ',')} mm` : ''}</td>
            <td class="text-center font-bold" style="color:${r.deltaNum < 0 ? '#059669' : (r.deltaNum > 0 ? '#dc2626' : '#0f172a')}">
              ${r.variacaoMm.replace('.', ',')} ${r.variacaoPct ? `(${r.variacaoPct.replace('.', ',')})` : ''}
            </td>
            <td>${r.leitura}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <!-- PERIMETRIA / CIRCUNFERÊNCIAS CORPORAIS -->
  ${(computed.tabelaPerimetria && computed.tabelaPerimetria.length > 0) ? `
    <div class="section-title">${nextSec()}. PERIMETRIA E CIRCUNFERÊNCIAS CORPORAIS (cm)</div>
    <table>
      <thead>
        <tr>
          <th>Segmento</th>
          <th class="text-center">${identificacao.dataRelatorioInicial}</th>
          <th class="text-center">${identificacao.dataReavaliacao}</th>
          <th class="text-center">Variação (cm)</th>
          <th>Interpretação</th>
        </tr>
      </thead>
      <tbody>
        ${computed.tabelaPerimetria.map(r => `
          <tr>
            <td class="font-bold">${r.regiao}</td>
            <td class="text-center">${r.t1 != null ? `${r.t1.toFixed(1).replace('.', ',')} cm` : ''}</td>
            <td class="text-center font-bold">${r.t2 != null ? `${r.t2.toFixed(1).replace('.', ',')} cm` : ''}</td>
            <td class="text-center font-bold">${r.variacaoCm.replace('.', ',')}</td>
            <td>${r.leitura}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''}

  <!-- FATORES DE EVOLUÇÃO -->
  ${realFatoresEvolucao.length > 0 ? `
    <div class="section-title">${nextSec()}. FATORES DE EVOLUÇÃO</div>
    <p>A análise comparativa entre as avaliações documentou os seguintes destaques evolutivos:</p>
    <ul class="bullet-list">
      ${realFatoresEvolucao.map(item => `<li>${item}</li>`).join('')}
    </ul>
  ` : ''}

  <!-- FATORES QUE NÃO APRESENTARAM MELHORA -->
  ${realFatoresSemMelhora.length > 0 ? `
    <div class="section-title">${nextSec()}. FATORES QUE NÃO APRESENTARAM MELHORA</div>
    <ul class="bullet-list">
      ${realFatoresSemMelhora.map(item => `<li>${item}</li>`).join('')}
    </ul>
  ` : ''}

  <!-- FATORES COM INVOLUÇÃO -->
  ${realFatoresInvolucao.length > 0 ? `
    <div class="section-title">${nextSec()}. FATORES COM INVOLUÇÃO</div>
    <ul class="bullet-list">
      ${realFatoresInvolucao.map(item => `<li>${item}</li>`).join('')}
    </ul>
  ` : ''}

  <!-- ANÁLISES SEGMENTARES BIOMECÂNICAS E FATORES DE RISCO -->
  ${(Array.isArray((narrative as any).analisesSegmentares) && (narrative as any).analisesSegmentares.length > 0) ? `
    ${(narrative as any).analisesSegmentares.map((seg: any) => `
      <div class="section-title">${nextSec()}. ${seg?.titulo || 'ANÁLISE SEGMENTAR'}</div>
      <p>${seg?.introducao || ''}</p>
      <ul class="bullet-list">
        ${(Array.isArray(seg?.itens) ? seg.itens : []).map((item: string) => `<li>${item}</li>`).join('')}
      </ul>
    `).join('')}
  ` : `
    ${(narrative.riscoCompartimentoMedialJoelho && Array.isArray(narrative.riscoCompartimentoMedialJoelho.itens) && narrative.riscoCompartimentoMedialJoelho.itens.length > 0 && !narrative.riscoCompartimentoMedialJoelho.itens[0]?.includes('Não foram identificados')) ? `
      <div class="section-title">${nextSec()}. FATORES DE RISCO PARA O COMPARTIMENTO MEDIAL DO JOELHO</div>
      <p>${narrative.riscoCompartimentoMedialJoelho.introducao || ''}</p>
      <ul class="bullet-list">
        ${(narrative.riscoCompartimentoMedialJoelho.itens || []).map(item => `<li>${item}</li>`).join('')}
      </ul>
    ` : ''}

    ${(narrative.riscoCompartimentoMedialTornozelo && Array.isArray(narrative.riscoCompartimentoMedialTornozelo.itens) && narrative.riscoCompartimentoMedialTornozelo.itens.length > 0 && !narrative.riscoCompartimentoMedialTornozelo.itens[0]?.includes('Complexo articular')) ? `
      <div class="section-title">${nextSec()}. FATORES DE RISCO PARA O COMPARTIMENTO MEDIAL DO TORNOZELO</div>
      <p>${narrative.riscoCompartimentoMedialTornozelo.introducao || ''}</p>
      <ul class="bullet-list">
        ${(narrative.riscoCompartimentoMedialTornozelo.itens || []).map(item => `<li>${item}</li>`).join('')}
      </ul>
    ` : ''}
  `}

  <!-- CONCLUSÃO -->
  ${(Array.isArray(narrative.conclusao) && narrative.conclusao.length > 0) ? `
  <div class="section-title">${nextSec()}. CONCLUSÃO</div>
  ${narrative.conclusao.map(p => `<p>${p}</p>`).join('')}` : (typeof narrative.conclusao === 'string' && (narrative.conclusao as string).trim() ? `<div class="section-title">${nextSec()}. CONCLUSÃO</div><p>${narrative.conclusao}</p>` : '')}

  <!-- PRIORIDADES TERAPÊUTICAS SUGERIDAS -->
  ${(Array.isArray(narrative.prioridadesTerapeuticas) && narrative.prioridadesTerapeuticas.length > 0) ? `
  <div class="section-title">${nextSec()}. PRIORIDADES TERAPÊUTICAS SUGERIDAS</div>
  <ol class="numbered-list">
    ${narrative.prioridadesTerapeuticas.map(item => `<li>${item}</li>`).join('')}
  </ol>` : (typeof (narrative as any).prioridadesTerapeuticas === 'string' && (narrative.prioridadesTerapeuticas as any).trim() ? `<div class="section-title">${nextSec()}. PRIORIDADES TERAPÊUTICAS SUGERIDAS</div><p>${narrative.prioridadesTerapeuticas}</p>` : '')}

  <!-- ASSINATURA -->
  <div class="signature-section">
    <div class="section-title">${nextSec()}. ASSINATURA</div>
    <div class="signature-container">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-name">${identificacao.avaliadorReavaliacao.split('—')[0].trim()}</div>
        ${identificacao.avaliadorReavaliacao.split('—')[1]?.trim() ? `<div class="signature-role">${identificacao.avaliadorReavaliacao.split('—')[1].trim()}</div>` : ''}
        <div class="signature-role">Clube Fitness Fisio — Fisioterapia, Quiropraxia e Fortalecimento</div>
        ${isFilledField(identificacao.avaliadorInicial) ? `
        <div class="signature-note">
          Avaliação inicial conduzida por ${identificacao.avaliadorInicial} (${identificacao.dataRelatorioInicial}).
        </div>` : ''}
      </div>
    </div>
  </div>

  </div> <!-- fim .laudo-container -->
</body>
</html>
  `.trim();
}

function triggerDirectDownload(blob: Blob, filename: string) {
  if (typeof window === 'undefined') return;
  try {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 5000);
  } catch (error) {
    console.error('Erro no download direto do PDF:', error);
  }
}

/** Gera e baixa diretamente o arquivo PDF do Laudo de Reavaliação (com fallback de impressão nativo) */
export async function downloadReavaliacaoLaudoPDF(computed: LongitudinalComputedResult, narrative: ClinicalNarrative): Promise<void> {
  if (typeof window === 'undefined') return;

  // Auto-delegação: se a comparação for de avaliação física (sem dor EVA nem dinamometria, mas com composição/dobras)
  const isPhysicalAssessmentOnly =
    (!computed.tabelaEVA?.rows || computed.tabelaEVA.rows.length === 0) &&
    (!computed.tabelaForca || computed.tabelaForca.length === 0) &&
    ((computed.tabelaComposicao && computed.tabelaComposicao.length > 0) || (computed.tabelaDobras && computed.tabelaDobras.length > 0));

  if (isPhysicalAssessmentOnly) {
    return downloadPhysicalComparisonPDF(computed, narrative);
  }

  const htmlContent = generateReavaliacaoHTML(computed, narrative);
  const html2pdf = (window as any).html2pdf;

  const safeName = (computed?.identificacao?.paciente || 'Paciente')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
  const safeDate = (computed?.identificacao?.dataReavaliacao || new Date().toISOString().split('T')[0]).replace(/\//g, '-');
  const filename = `Laudo_Reavaliacao_${safeName}_${safeDate}.pdf`;

  if (html2pdf) {
    const pdfWrapper = document.createElement('div');
    pdfWrapper.style.position = 'absolute';
    pdfWrapper.style.left = '0px';
    pdfWrapper.style.top = `${window.scrollY || 0}px`;
    pdfWrapper.style.width = '794px';
    pdfWrapper.style.opacity = '0';
    pdfWrapper.style.zIndex = '-9999';
    pdfWrapper.style.pointerEvents = 'none';

    const pdfContainer = document.createElement('div');
    pdfContainer.style.background = '#ffffff';
    pdfContainer.style.color = '#0f172a';
    pdfContainer.style.padding = '10px 24px';
    pdfContainer.style.margin = '0';
    pdfContainer.style.width = '794px';
    pdfContainer.style.boxSizing = 'border-box';
    pdfContainer.innerHTML = htmlContent;

    pdfWrapper.appendChild(pdfContainer);
    document.body.appendChild(pdfWrapper);

    try {
      const options = {
        margin: [10, 8, 12, 8],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2.2,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
          width: 794,
          x: 0,
          y: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      const blob: Blob = await html2pdf().set(options).from(pdfContainer).output('blob');
      triggerDirectDownload(blob, filename);
      return;
    } catch (err) {
      console.warn('[downloadReavaliacaoLaudoPDF] Falha no html2pdf, acionando fallback de impressão:', err);
    } finally {
      if (pdfWrapper.parentNode) {
        pdfWrapper.parentNode.removeChild(pdfWrapper);
      }
    }
  }

  // Fallback: Impressão via iframe persistente
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '1px';
  printIframe.style.height = '1px';
  printIframe.style.opacity = '0.01';
  printIframe.style.border = 'none';
  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
  if (!doc) {
    alert('Erro ao abrir gerador do PDF.');
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  await new Promise<void>(resolve => {
    setTimeout(() => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      } catch (e) {
        console.error('Erro ao acionar impressão:', e);
      } finally {
        setTimeout(() => {
          if (printIframe.parentNode) {
            printIframe.parentNode.removeChild(printIframe);
          }
        }, 60000);
        resolve();
      }
    }, 350);
  });
}

/**
 * Gerador de Laudo Oficial Comparativo de Avaliação Física & Composição Corporal
 * Foco exclusivo em Antropometria, Pollock 7/8 Dobras, Perimetria e Recomposição Corporal Real.
 */
export function generatePhysicalComparisonHTML(computed: LongitudinalComputedResult, narrative: ClinicalNarrative): string {
  const { identificacao, objetivoDoLaudo, tabelaComposicao = [], tabelaDobras = [], tabelaPerimetria = [], tabelaGoniometria = [], tabelaTestesOrtopedicos = [], kpisRecomposicao } = computed;

  let secNum = 0;
  const nextSec = () => ++secNum;

  const isFilledField = (val: any) => {
    if (val === undefined || val === null) return false;
    const s = String(val).trim();
    if (!s) return false;
    const lower = s.toLowerCase();
    return !['-', '—', 'n/a', 'n/r', 'não informado', 'nao informado', 'não realizada', 'nao realizada', 'nenhum', 'nenhuma'].includes(lower);
  };

  const idRows = [
    { label: 'Aluno / Paciente', val: identificacao.paciente },
    { label: 'Idade', val: identificacao.idade },
    { label: 'Sexo', val: identificacao.sexo },
    { label: 'CPF', val: identificacao.cpf },
    { label: 'Peso Corporal (T1 ➔ T2)', val: identificacao.pesoCorporal },
    { label: 'Data da Avaliação Inicial (T1)', val: identificacao.dataRelatorioInicial },
    { label: 'Data da Reavaliação (T2)', val: identificacao.dataReavaliacao },
    { label: 'Intervalo de Acompanhamento', val: identificacao.intervaloSemanas ? `${identificacao.intervaloSemanas} semanas (${kpisRecomposicao?.diasIntervalo || identificacao.intervaloSemanas * 7} dias)` : '' },
    { label: 'Avaliador Inicial', val: identificacao.avaliadorInicial },
    { label: 'Avaliador da Reavaliação', val: identificacao.avaliadorReavaliacao }
  ].filter(r => isFilledField(r.val));

  const kpis = kpisRecomposicao || {
    gorduraEliminadaKg: 0,
    massaMagraGanhaKg: 0,
    deltaPercentualGordura: 0,
    deltaSomaDobrasMm: 0,
    deltaCinturaCm: 0,
    diasIntervalo: 0,
    statusRecomposicao: 'estavel' as const,
    taxaSucessoLabel: 'Em monitoramento de composição corporal'
  };

  const realFatoresEvolucao = (narrative.fatoresEvolucao || []).filter(i => {
    const l = (i || '').trim().toLowerCase();
    return !l.startsWith('nenhum') && !l.startsWith('dados comparativos em consolidação');
  });

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Laudo Comparativo de Avaliação Física — ${identificacao.paciente}</title>
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
      margin-bottom: 20px;
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
      font-size: 9.5pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin: 0 0 6px;
      text-transform: uppercase;
      color: #0d9488;
    }
    .header-laudo h3 {
      font-size: 12pt;
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
      font-size: 10.5pt;
      font-weight: 800;
      text-transform: uppercase;
      margin: 18px 0 8px 0;
      color: #0f172a;
      letter-spacing: 0.02em;
      page-break-after: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 8.5pt;
    }
    table th, table td {
      border: 1px solid #cbd5e1;
      padding: 6px 8px;
      text-align: left;
    }
    table th {
      background: #f1f5f9;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      font-size: 7.5pt;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .kpi-label {
      font-size: 7pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .kpi-val {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .kpi-sub {
      font-size: 7pt;
      color: #64748b;
      margin-top: 2px;
    }
    .bullet-list {
      margin: 0 0 14px 16px;
      padding: 0;
      font-size: 9pt;
      color: #334155;
      line-height: 1.6;
    }
    .signature-section {
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .signature-container {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .signature-box {
      width: 250px;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #0f172a;
      margin-bottom: 6px;
    }
    .signature-name {
      font-size: 9.5pt;
      font-weight: 700;
      color: #0f172a;
    }
    .signature-role {
      font-size: 7.5pt;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="laudo-container">

    <!-- CABEÇALHO OFICIAL -->
    <div class="header-laudo">
      <h1>CLUBE FITNESS FISIO</h1>
      <h2>Avaliação Física, Composição Corporal & Desempenho</h2>
      <h3>LAUDO COMPARATIVO DE AVALIAÇÃO FÍSICA</h3>
      <p>Análise longitudinal da composição corporal, antropometria, dobras cutâneas e perimetria</p>
    </div>

    <!-- IDENTIFICAÇÃO -->
    <div class="section-title">${nextSec()}. IDENTIFICAÇÃO</div>
    <table>
      <thead>
        <tr>
          <th style="width: 45%;">Campo</th>
          <th>Dado</th>
        </tr>
      </thead>
      <tbody>
        ${idRows.map(r => `<tr><td class="font-bold">${r.label}</td><td>${r.val}</td></tr>`).join('')}
      </tbody>
    </table>

    ${isFilledField(objetivoDoLaudo) ? `
    <!-- OBJETIVO DA AVALIAÇÃO -->
    <div class="section-title">${nextSec()}. OBJETIVO & METAS DO ALUNO</div>
    <p style="font-size: 9pt; color: #334155; margin-bottom: 14px;">${objetivoDoLaudo}</p>
    ` : ''}

    <!-- PAINEL DE KPIS DE RECOMPOSIÇÃO CORPORAL REAL -->
    <div class="kpi-grid">
      <!-- Card 1: Perda de Gordura -->
      <div class="kpi-card" style="border-left: 3.5px solid ${kpis.gorduraEliminadaKg > 0 ? '#10b981' : (kpis.gorduraEliminadaKg < 0 ? '#ef4444' : '#64748b')};">
        <div class="kpi-label">Massa Adiposa</div>
        <div class="kpi-val" style="color: ${kpis.gorduraEliminadaKg > 0 ? '#059669' : (kpis.gorduraEliminadaKg < 0 ? '#dc2626' : '#0f172a')};">
          ${kpis.gorduraEliminadaKg > 0 ? `-${kpis.gorduraEliminadaKg.toFixed(1)} kg` : (kpis.gorduraEliminadaKg < 0 ? `+${Math.abs(kpis.gorduraEliminadaKg).toFixed(1)} kg` : 'Estável')}
        </div>
        <div class="kpi-sub">
          ${kpis.deltaPercentualGordura !== 0 ? `Δ %GC: ${kpis.deltaPercentualGordura > 0 ? '+' : ''}${kpis.deltaPercentualGordura.toFixed(1)}%` : 'Percentual mantido'}
        </div>
      </div>

      <!-- Card 2: Massa Magra -->
      <div class="kpi-card" style="border-left: 3.5px solid ${kpis.massaMagraGanhaKg > 0 ? '#10b981' : (kpis.massaMagraGanhaKg < 0 ? '#f59e0b' : '#64748b')};">
        <div class="kpi-label">Massa Magra</div>
        <div class="kpi-val" style="color: ${kpis.massaMagraGanhaKg > 0 ? '#059669' : '#0f172a'};">
          ${kpis.massaMagraGanhaKg > 0 ? `+${kpis.massaMagraGanhaKg.toFixed(1)} kg` : (kpis.massaMagraGanhaKg < 0 ? `${kpis.massaMagraGanhaKg.toFixed(1)} kg` : 'Preservada')}
        </div>
        <div class="kpi-sub">
          ${kpis.massaMagraGanhaKg > 0 ? 'Ganho trófico muscular' : 'Manutenção de massa livre'}
        </div>
      </div>

      <!-- Card 3: Dobras Cutâneas -->
      <div class="kpi-card" style="border-left: 3.5px solid ${kpis.deltaSomaDobrasMm < 0 ? '#10b981' : (kpis.deltaSomaDobrasMm > 0 ? '#ef4444' : '#64748b')};">
        <div class="kpi-label">Soma de Dobras</div>
        <div class="kpi-val" style="color: ${kpis.deltaSomaDobrasMm < 0 ? '#059669' : (kpis.deltaSomaDobrasMm > 0 ? '#dc2626' : '#0f172a')};">
          ${kpis.deltaSomaDobrasMm < 0 ? `${kpis.deltaSomaDobrasMm.toFixed(1)} mm` : (kpis.deltaSomaDobrasMm > 0 ? `+${kpis.deltaSomaDobrasMm.toFixed(1)} mm` : 'Estável')}
        </div>
        <div class="kpi-sub">Espessura subcutânea (Pollock)</div>
      </div>

      <!-- Card 4: Cintura / Gordura Central -->
      <div class="kpi-card" style="border-left: 3.5px solid ${kpis.deltaCinturaCm < 0 ? '#10b981' : (kpis.deltaCinturaCm > 0 ? '#f59e0b' : '#64748b')};">
        <div class="kpi-label">Cintura (Medida Central)</div>
        <div class="kpi-val" style="color: ${kpis.deltaCinturaCm < 0 ? '#059669' : '#0f172a'};">
          ${kpis.deltaCinturaCm < 0 ? `${kpis.deltaCinturaCm.toFixed(1)} cm` : (kpis.deltaCinturaCm > 0 ? `+${kpis.deltaCinturaCm.toFixed(1)} cm` : 'Estável')}
        </div>
        <div class="kpi-sub">Índice de risco metabólico</div>
      </div>
    </div>

    <!-- BANNER DE SÍNTESE DE RECOMPOSIÇÃO CORPORAL -->
    <div style="background: rgba(13, 148, 136, 0.08); border: 1px solid rgba(13, 148, 136, 0.25); border-radius: 6px; padding: 8px 12px; margin-bottom: 16px; font-size: 8.5pt;">
      <strong style="color: #0f766e;">🎯 Síntese de Desempenho e Recomposição Corporal:</strong>
      <span style="color: #1e293b; margin-left: 4px;">${kpis.taxaSucessoLabel}</span>
    </div>

    <!-- 1. COMPOSIÇÃO CORPORAL E ANTROPOMETRIA -->
    ${tabelaComposicao.length > 0 ? `
    <div class="section-title">${nextSec()}. COMPOSIÇÃO CORPORAL E ANTROPOMETRIA — COMPARATIVO</div>
    <table>
      <thead>
        <tr>
          <th>Indicador</th>
          <th class="text-center">${identificacao.dataRelatorioInicial}</th>
          <th class="text-center">${identificacao.dataReavaliacao}</th>
          <th class="text-center">Variação Total</th>
          <th>Interpretação Clínica</th>
        </tr>
      </thead>
      <tbody>
        ${tabelaComposicao.map(r => `
          <tr>
            <td class="font-bold">${r.metrica || r.parametro}</td>
            <td class="text-center">${r.t1 != null ? `${r.t1.toFixed(1).replace('.', ',')} ${r.unidade}` : ''}</td>
            <td class="text-center font-bold">${r.t2 != null ? `${r.t2.toFixed(1).replace('.', ',')} ${r.unidade}` : ''}</td>
            <td class="text-center font-bold" style="color:${r.leitura === 'Redução de gordura' || r.leitura === 'Ganho de massa magra' || r.leitura === 'Redução de medidas' || r.leitura === 'Redução de risco' ? '#059669' : '#0f172a'}">
              ${r.variacao.replace('.', ',')} ${r.unidade} (${r.variacaoPct.replace('.', ',')})
            </td>
            <td>${r.leitura}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- 2. DOBRAS CUTÂNEAS (POLLOCK — mm) -->
    ${tabelaDobras.length > 0 ? `
    <div class="section-title">${nextSec()}. DOBRAS CUTÂNEAS (POLLOCK — mm)</div>
    <table>
      <thead>
        <tr>
          <th>Dobra Cutânea</th>
          <th class="text-center">${identificacao.dataRelatorioInicial}</th>
          <th class="text-center">${identificacao.dataReavaliacao}</th>
          <th class="text-center">Variação (mm)</th>
          <th>Leitura da Gordura Subcutânea</th>
        </tr>
      </thead>
      <tbody>
        ${tabelaDobras.map(r => `
          <tr>
            <td class="font-bold">${r.dobra}</td>
            <td class="text-center">${r.t1 != null ? `${r.t1.toFixed(1).replace('.', ',')} mm` : ''}</td>
            <td class="text-center font-bold">${r.t2 != null ? `${r.t2.toFixed(1).replace('.', ',')} mm` : ''}</td>
            <td class="text-center font-bold" style="color:${r.deltaNum < 0 ? '#059669' : (r.deltaNum > 0 ? '#dc2626' : '#0f172a')}">
              ${r.variacaoMm.replace('.', ',')} ${r.variacaoPct ? `(${r.variacaoPct.replace('.', ',')})` : ''}
            </td>
            <td>${r.leitura}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- 3. PERIMETRIA / CIRCUNFERÊNCIAS CORPORAIS (cm) -->
    ${tabelaPerimetria.length > 0 ? `
    <div class="section-title">${nextSec()}. PERIMETRIA E CIRCUNFERÊNCIAS CORPORAIS (cm)</div>
    <table>
      <thead>
        <tr>
          <th>Segmento</th>
          <th class="text-center">${identificacao.dataRelatorioInicial}</th>
          <th class="text-center">${identificacao.dataReavaliacao}</th>
          <th class="text-center">Variação (cm)</th>
          <th>Efeito Trófico / Medida</th>
        </tr>
      </thead>
      <tbody>
        ${tabelaPerimetria.map(r => `
          <tr>
            <td class="font-bold">${r.regiao}</td>
            <td class="text-center">${r.t1 != null ? `${r.t1.toFixed(1).replace('.', ',')} cm` : ''}</td>
            <td class="text-center font-bold">${r.t2 != null ? `${r.t2.toFixed(1).replace('.', ',')} cm` : ''}</td>
            <td class="text-center font-bold" style="color:${r.isCentral ? (r.deltaNum < 0 ? '#059669' : (r.deltaNum > 0 ? '#dc2626' : '#0f172a')) : (r.deltaNum > 0 ? '#059669' : '#0f172a')}">
              ${r.variacaoCm.replace('.', ',')}
            </td>
            <td>${r.leitura}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- 4. FLEXIBILIDADE E MOBILIDADE ARTICULAR (GONIOMETRIA) -->
    ${tabelaGoniometria.length > 0 ? `
    <div class="section-title">${nextSec()}. FLEXIBILIDADE E MOBILIDADE ARTICULAR (GONIOMETRIA)</div>
    <table>
      <thead>
        <tr>
          <th>Movimento</th>
          <th class="text-center">Referência</th>
          <th class="text-center">${identificacao.dataRelatorioInicial}</th>
          <th class="text-center">${identificacao.dataReavaliacao}</th>
          <th class="text-center">Variação</th>
          <th>Leitura Articular</th>
        </tr>
      </thead>
      <tbody>
        ${tabelaGoniometria.map(r => `
          <tr>
            <td>${r.movimento}</td>
            <td class="text-center">${r.referencia}</td>
            <td class="text-center">${r.t1 !== null ? `${r.t1}°` : ''}</td>
            <td class="text-center font-bold">${r.t2 !== null ? `${r.t2}°` : ''}</td>
            <td class="text-center">${r.variacao}</td>
            <td>${r.leitura}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- 5. TESTES FUNCIONAIS E ORTOPÉDICOS ESPECIAIS (SE PREENCHIDOS) -->
    ${tabelaTestesOrtopedicos.length > 0 ? `
    <div class="section-title">${nextSec()}. TESTES ESPECIAIS E FUNCIONAIS</div>
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

    <!-- 6. DESTAQUES DE EVOLUÇÃO E RECOMPOSIÇÃO CORPORAL -->
    ${realFatoresEvolucao.length > 0 ? `
    <div class="section-title">${nextSec()}. DESTAQUES EVOLUTIVOS DA REAVALIAÇÃO</div>
    <ul class="bullet-list">
      ${realFatoresEvolucao.map(item => `<li>${item}</li>`).join('')}
    </ul>
    ` : ''}

    <!-- 7. DIRETRIZES DO AVALIADOR / TREINADOR -->
    ${(Array.isArray(narrative.prioridadesTerapeuticas) && narrative.prioridadesTerapeuticas.length > 0) ? `
    <div class="section-title">${nextSec()}. DIRETRIZES E CONDUTA PARA A PERIODIZAÇÃO DE TREINO</div>
    <ul class="bullet-list">
      ${narrative.prioridadesTerapeuticas.map(item => `<li>${item}</li>`).join('')}
    </ul>
    ` : (typeof (narrative as any).prioridadesTerapeuticas === 'string' && (narrative.prioridadesTerapeuticas as any).trim() ? `
    <div class="section-title">${nextSec()}. DIRETRIZES E CONDUTA PARA A PERIODIZAÇÃO DE TREINO</div>
    <p>${narrative.prioridadesTerapeuticas}</p>
    ` : '')}

    <!-- ASSINATURA -->
    <div class="signature-section">
      <div class="section-title">${nextSec()}. RESPONSÁVEL TÉCNICO / AVALIADOR</div>
      <div class="signature-container">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-name">${identificacao.avaliadorReavaliacao.split('—')[0].trim()}</div>
          ${identificacao.avaliadorReavaliacao.split('—')[1]?.trim() ? `<div class="signature-role">${identificacao.avaliadorReavaliacao.split('—')[1].trim()}</div>` : ''}
          <div class="signature-role">Clube Fitness Fisio — Avaliação Física & Saúde</div>
          ${isFilledField(identificacao.avaliadorInicial) ? `
          <div class="signature-note" style="font-size: 7pt; color: #64748b; margin-top: 4px;">
            Avaliação inicial por ${identificacao.avaliadorInicial} (${identificacao.dataRelatorioInicial}).
          </div>` : ''}
        </div>
      </div>
    </div>

  </div> <!-- fim .laudo-container -->
</body>
</html>
  `.trim();
}

/** Gera e baixa diretamente o Laudo Comparativo Oficial de Avaliação Física & Composição Corporal */
export async function downloadPhysicalComparisonPDF(computed: LongitudinalComputedResult, narrative: ClinicalNarrative): Promise<void> {
  if (typeof window === 'undefined') return;

  const htmlContent = generatePhysicalComparisonHTML(computed, narrative);
  const html2pdf = (window as any).html2pdf;

  const safeName = (computed?.identificacao?.paciente || 'Aluno')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_');
  const safeDate = (computed?.identificacao?.dataReavaliacao || new Date().toISOString().split('T')[0]).replace(/\//g, '-');
  const filename = `Comparativo_Avaliacao_Fisica_${safeName}_${safeDate}.pdf`;

  if (html2pdf) {
    const pdfWrapper = document.createElement('div');
    pdfWrapper.style.position = 'absolute';
    pdfWrapper.style.left = '0px';
    pdfWrapper.style.top = `${window.scrollY || 0}px`;
    pdfWrapper.style.width = '794px';
    pdfWrapper.style.opacity = '0';
    pdfWrapper.style.zIndex = '-9999';
    pdfWrapper.style.pointerEvents = 'none';

    const pdfContainer = document.createElement('div');
    pdfContainer.style.background = '#ffffff';
    pdfContainer.style.color = '#0f172a';
    pdfContainer.style.padding = '10px 24px';
    pdfContainer.style.margin = '0';
    pdfContainer.style.width = '794px';
    pdfContainer.style.boxSizing = 'border-box';
    pdfContainer.innerHTML = htmlContent;

    pdfWrapper.appendChild(pdfContainer);
    document.body.appendChild(pdfWrapper);

    try {
      const options = {
        margin: [10, 8, 12, 8],
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2.2,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
          width: 794,
          x: 0,
          y: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      const blob: Blob = await html2pdf().set(options).from(pdfContainer).output('blob');
      triggerDirectDownload(blob, filename);
      return;
    } catch (err) {
      console.warn('[downloadPhysicalComparisonPDF] Falha no html2pdf, acionando fallback:', err);
    } finally {
      if (pdfWrapper.parentNode) {
        pdfWrapper.parentNode.removeChild(pdfWrapper);
      }
    }
  }

  // Fallback: Impressão via iframe
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '1px';
  printIframe.style.height = '1px';
  printIframe.style.opacity = '0.01';
  printIframe.style.border = 'none';
  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
  if (!doc) {
    alert('Erro ao abrir gerador do PDF.');
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  await new Promise<void>(resolve => {
    setTimeout(() => {
      try {
        printIframe.contentWindow?.focus();
        printIframe.contentWindow?.print();
      } catch (e) {
        console.error('Erro ao acionar impressão:', e);
      } finally {
        setTimeout(() => {
          if (printIframe.parentNode) {
            printIframe.parentNode.removeChild(printIframe);
          }
        }, 60000);
        resolve();
      }
    }, 350);
  });
}
