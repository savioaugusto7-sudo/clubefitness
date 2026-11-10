import { calculateProfessionalGoals } from '@/utils/professionalGoalsEngine';

function formatNumber(v: number): string {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
}

function formatDateBR(dateStr?: string): string {
  if (!dateStr || dateStr === '—' || dateStr === '-') return '—';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function getMesNome(mStr: string): string {
  const [ano, mes] = mStr.split('-');
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const mIdx = parseInt(mes, 10) - 1;
  return `${meses[mIdx >= 0 && mIdx < 12 ? mIdx : 9]} de ${ano}`;
}

interface ScoreReportOptions {
  mes?: string;
  profissionalId?: string;
}

export async function getRelatorioPontuacaoHtml(options: ScoreReportOptions = {}): Promise<string> {
  const mesParam = options.mes || '2026-10';
  const selectedProfId = options.profissionalId;

  // Obter dados consolidados do motor de cálculo
  const goalsData = await calculateProfessionalGoals(mesParam, 'todos');
  const allRanking = goalsData.ranking || [];
  const kpis = goalsData.kpis || {};

  // Filtrar profissionais humanos (remover terminais/computador coletivo)
  const humanRanking = allRanking.filter((item: any) => {
    const nome = (item.prof?.nome || '').toLowerCase();
    const esp = (item.prof?.especialidade || '').toLowerCase();
    return !nome.includes('computador') && !esp.includes('terminal');
  });

  // Se um profissional específico foi selecionado
  const displayedRanking = selectedProfId
    ? humanRanking.filter((item: any) => String(item.prof?._id) === selectedProfId)
    : humanRanking;

  const now = new Date();
  const dataEmissaoBR = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} às ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const mesNomeExtenso = getMesNome(mesParam);

  const totalPontosClinica = humanRanking.reduce((acc: number, curr: any) => acc + (curr.pontosLiquidos || 0), 0);
  const totalCreditosClinica = humanRanking.reduce((acc: number, curr: any) => acc + (curr.creditosIndividuais || 0) + (curr.creditosColetivos || 0), 0);
  const totalDebitosClinica = humanRanking.reduce((acc: number, curr: any) => acc + (curr.debitosIndividuais || 0) + (curr.debitosColetivos || 0), 0);
  const lider = humanRanking.length > 0 ? humanRanking[0] : null;

  let html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Pontuação Detalhado • ${mesNomeExtenso} • Clube Fitness</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      color: #0f172a;
      font-size: 8.5pt;
      line-height: 1.35;
    }

    .no-print-bar {
      position: sticky;
      top: 0;
      background: #0f172a;
      color: #fff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 9999;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }

    .no-print-bar .title {
      font-size: 13pt;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .no-print-bar .subtitle {
      font-size: 8.5pt;
      color: #94a3b8;
    }

    .btn-print {
      background: #0284c7;
      color: #fff;
      border: none;
      padding: 9px 20px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 9.5pt;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(2, 132, 199, 0.4);
      transition: background 0.2s;
    }

    .btn-print:hover {
      background: #0369a1;
    }

    .btn-back {
      background: #334155;
      color: #cbd5e1;
      border: none;
      padding: 9px 16px;
      border-radius: 6px;
      font-size: 8.5pt;
      cursor: pointer;
      text-decoration: none;
      margin-right: 8px;
    }

    .report-container {
      max-width: 210mm;
      margin: 20px auto;
      background: #fff;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }

    @media print {
      body {
        background-color: #fff !important;
      }
      .no-print-bar {
        display: none !important;
      }
      .report-container {
        margin: 0 !important;
        box-shadow: none !important;
        max-width: none !important;
        width: 100% !important;
      }
    }

    /* PÁGINAS */
    .page {
      padding: 10mm 12mm 14mm 12mm;
      min-height: 275mm;
      position: relative;
      background: #fff;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }

    /* QUEBRA DE PÁGINA OBRIGATÓRIA PARA CADA PROFISSIONAL */
    .professional-cover-break {
      page-break-before: always !important;
      break-before: page !important;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }

    .brand-title {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.2px;
      text-transform: uppercase;
    }

    .brand-subtitle {
      font-size: 9pt;
      color: #0284c7;
      font-weight: 700;
      margin-top: 1px;
    }

    .meta-box {
      text-align: right;
      font-size: 7.5pt;
      color: #475569;
      line-height: 1.4;
    }

    .meta-box strong {
      color: #0f172a;
    }

    /* CARDS KPIS */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 12px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 10px;
      border-left: 4px solid #64748b;
    }

    .kpi-card.success {
      border-left-color: #10b981;
      background: #f0fdf4;
    }

    .kpi-card.primary {
      border-left-color: #0284c7;
      background: #f0f9ff;
    }

    .kpi-card.warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }

    .kpi-card.danger {
      border-left-color: #ef4444;
      background: #fef2f2;
    }

    .kpi-label {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }

    .kpi-value {
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

    /* CARD DE IDENTIFICAÇÃO DO PROFISSIONAL */
    .prof-header-card {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #fff;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .prof-name {
      font-size: 14pt;
      font-weight: 800;
      letter-spacing: -0.3px;
      color: #f8fafc;
    }

    .prof-cargo {
      font-size: 8.5pt;
      color: #93c5fd;
      font-weight: 600;
      margin-top: 2px;
    }

    .prof-badge-rank {
      background: #0284c7;
      color: #fff;
      padding: 5px 12px;
      border-radius: 20px;
      font-weight: 800;
      font-size: 9.5pt;
      text-align: right;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
    }

    /* SEÇÕES E TABELAS */
    .section-title {
      font-size: 9pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-top: 10px;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 3px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .section-title span.count-badge {
      background: #e2e8f0;
      color: #334155;
      font-size: 7pt;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 7.5pt;
    }

    thead {
      display: table-header-group;
    }

    th {
      background: #1e293b;
      color: #fff;
      padding: 5px 6px;
      text-align: left;
      font-weight: 700;
      font-size: 7.2pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border: 1px solid #1e293b;
    }

    td {
      padding: 4.5px 6px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc;
    }

    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .pts-plus {
      color: #059669;
      font-weight: 800;
      font-size: 8pt;
    }

    .pts-minus {
      color: #dc2626;
      font-weight: 800;
      font-size: 8pt;
    }

    .pts-neutral {
      color: #64748b;
      font-weight: 700;
    }

    .badge-rank-1 {
      background: #fef3c7;
      color: #b45309;
      border: 1px solid #fcd34d;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .badge-rank-2 {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .badge-rank-3 {
      background: #ffedd5;
      color: #c2410c;
      border: 1px solid #fdba74;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .badge-clean {
      background: #f0fdf4;
      border: 1px solid #86efac;
      color: #166534;
      padding: 10px 14px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 8pt;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* BLOCO DE ASSINATURAS */
    .signature-block {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .sign-line {
      border-top: 1px solid #475569;
      padding-top: 4px;
      text-align: center;
      font-size: 7.5pt;
      color: #334155;
    }

    .sign-line strong {
      display: block;
      color: #0f172a;
      font-size: 8.5pt;
      margin-bottom: 1px;
    }

    /* RODAPÉ DA PÁGINA */
    .page-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #cbd5e1;
      padding-top: 5px;
      font-size: 7pt;
      color: #64748b;
      margin-top: 10px;
    }
  </style>
</head>
<body>

  <!-- BARRA DE CONTROLE NA TELA (NÃO IMPRESSA) -->
  <div class="no-print-bar">
    <div>
      <div class="title">Relatório de Pontuação Detalhado • ${mesNomeExtenso}</div>
      <div class="subtitle">Clube Fitness • Saúde & Reabilitação • Paginação por Profissional</div>
    </div>
    <div style="display: flex; align-items: center;">
      <a href="/admin" class="btn-back">← Voltar ao Painel</a>
      <button onclick="window.print()" class="btn-print">
        🖨️ Salvar como PDF / Imprimir
      </button>
    </div>
  </div>

  <div class="report-container">
`;

  let htmlBody = '';

  // ===========================================================================
  // PÁGINA 1: CAPA GERAL E RANKING DA CLÍNICA (Apenas na emissão coletiva/geral)
  // ===========================================================================
  if (!selectedProfId) {
    htmlBody += `
    <div class="page" id="capa-geral">
      <div>
        <!-- CABEÇALHO DA CAPA -->
        <div class="page-header">
          <div>
            <div class="brand-title">CLUBE FITNESS • SAÚDE & REABILITAÇÃO</div>
            <div class="brand-subtitle">Relatório Oficial de Pontuação & Metas Profissionais</div>
          </div>
          <div class="meta-box">
            <div>Competência: <strong>${mesNomeExtenso}</strong></div>
            <div>Emissão: <strong>${dataEmissaoBR}</strong></div>
            <div>Equipe: <strong>${humanRanking.length} Profissionais Avaliados</strong></div>
            <div>Status: <strong style="color: #059669;">Fechamento Auditado</strong></div>
          </div>
        </div>

        <!-- KPIS GLOBAIS DA CLÍNICA -->
        <div class="kpi-grid">
          <div class="kpi-card success">
            <div class="kpi-label">Pontos Líquidos da Equipe</div>
            <div class="kpi-value">${formatNumber(totalPontosClinica)}</div>
            <div class="kpi-sub">Saldo positivo consolidado</div>
          </div>
          <div class="kpi-card primary">
            <div class="kpi-label">Total Créditos (+pts)</div>
            <div class="kpi-value">+${formatNumber(totalCreditosClinica)}</div>
            <div class="kpi-sub">Avaliações, fichas, testes e retenção</div>
          </div>
          <div class="kpi-card danger">
            <div class="kpi-label">Total Débitos (-pts)</div>
            <div class="kpi-value">-${formatNumber(totalDebitosClinica)}</div>
            <div class="kpi-sub">Penalidades, pontos e atrasos</div>
          </div>
          <div class="kpi-card warning">
            <div class="kpi-label">Líder do Mês (1º Lugar)</div>
            <div class="kpi-value" style="font-size: 11pt; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${lider ? lider.prof?.nome : '—'}
            </div>
            <div class="kpi-sub">${lider ? `${formatNumber(lider.pontosLiquidos)} pts acumulados` : '—'}</div>
          </div>
        </div>

        <!-- QUADRO SINTÉTICO DE REGRAS E DIRETRIZES DO MÊS -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 7.5pt; color: #334155;">
          <strong>Diretrizes Operacionais de Fechamento:</strong>
          Avaliações Físicas entregues dentro de 1h (+4 pts); Testes de Força registrados (+4 pts); Fichas de Treino em até 24h (+2 a +4 pts); Relatórios Fisioterapêuticos em até 2h (+6 pts); Bônus de Retenção de Turno apurado por frequência contratada; Infrações de atraso de ponto e advertências debitadas conforme regulamento.
        </div>

        <!-- TABELA DO RANKING OFICIAL DA CLÍNICA -->
        <div class="section-title">
          <span>Ranking Geral Consolidado • Outubro de 2026</span>
          <span class="count-badge">${humanRanking.length} Profissionais</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">Pos.</th>
              <th>Profissional</th>
              <th>Cargo / Especialidade</th>
              <th>Registro</th>
              <th style="text-align: right; width: 75px;">Créditos (+)</th>
              <th style="text-align: right; width: 75px;">Débitos (-)</th>
              <th style="text-align: right; width: 85px;">Pontos Líquidos</th>
              <th style="text-align: center; width: 80px;">Classificação</th>
            </tr>
          </thead>
          <tbody>
    `;

    humanRanking.forEach((item: any, idx: number) => {
      const pos = idx + 1;
      const rankBadgeClass = pos === 1 ? 'badge-rank-1' : pos === 2 ? 'badge-rank-2' : pos === 3 ? 'badge-rank-3' : '';
      const totalCred = (item.creditosIndividuais || 0) + (item.creditosColetivos || 0);
      const totalDeb = (item.debitosIndividuais || 0) + (item.debitosColetivos || 0);
      const reg = item.prof?.registro && item.prof?.registro !== '-' ? item.prof?.registro : '—';

      htmlBody += `
            <tr>
              <td style="text-align: center; font-weight: 800;">
                ${pos <= 3 ? `<span class="${rankBadgeClass}">${pos}º</span>` : `${pos}º`}
              </td>
              <td><strong>${item.prof?.nome || 'Profissional'}</strong></td>
              <td>${item.prof?.especialidade || 'Fisioterapia / Ed. Física'}</td>
              <td style="color: #64748b;">${reg}</td>
              <td style="text-align: right;" class="pts-plus">+${formatNumber(totalCred)}</td>
              <td style="text-align: right;" class="${totalDeb > 0 ? 'pts-minus' : 'pts-neutral'}">
                ${totalDeb > 0 ? `-${formatNumber(totalDeb)}` : '0'}
              </td>
              <td style="text-align: right; font-weight: 800; font-size: 9pt; color: #0f172a;">
                ${formatNumber(item.pontosLiquidos)} pts
              </td>
              <td style="text-align: center;">
                <span style="font-size: 7pt; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${item.pontosLiquidos >= 100 ? '#dcfce7; color: #166534;' : item.pontosLiquidos >= 0 ? '#f0f9ff; color: #0369a1;' : '#fee2e2; color: #991b1b;'}">
                  ${item.pontosLiquidos >= 100 ? 'Alto Desempenho' : item.pontosLiquidos >= 0 ? 'Regular' : 'Abaixo do SLA'}
                </span>
              </td>
            </tr>
      `;
    });

    htmlBody += `
          </tbody>
        </table>
      </div>

      <!-- RODAPÉ DA CAPA -->
      <div class="page-footer">
        <div>Clube Fitness • Gestão de Performance e Metas Clínicas</div>
        <div>Página 1 • Visão Geral da Clínica e Ranking de Outubro/2026</div>
      </div>
    </div>
    `;
  }

  // ===========================================================================
  // PÁGINAS INDIVIDUAIS POR PROFISSIONAL (COM QUEBRA DE PÁGINA OBRIGATÓRIA)
  // ===========================================================================
  displayedRanking.forEach((profItem: any, profIndex: number) => {
    const profNome = profItem.prof?.nome || 'Profissional';
    const profCargo = profItem.prof?.especialidade || 'Fisioterapia / Educação Física';
    const profRegistro = profItem.prof?.registro && profItem.prof?.registro !== '-' ? profItem.prof?.registro : 'Registro não informado';
    
    // Posição no ranking geral
    const generalRankIdx = humanRanking.findIndex((h: any) => String(h.prof?._id) === String(profItem.prof?._id));
    const rankPosition = generalRankIdx >= 0 ? generalRankIdx + 1 : (profIndex + 1);

    const totalCredIndiv = profItem.creditosIndividuais || 0;
    const totalCredColet = profItem.creditosColetivos || 0;
    const totalCred = totalCredIndiv + totalCredColet;

    const totalDebIndiv = profItem.debitosIndividuais || 0;
    const totalDebColet = profItem.debitosColetivos || 0;
    const totalDeb = totalDebIndiv + totalDebColet;

    const saldoLiquido = profItem.pontosLiquidos || 0;
    const extratoCreditos = profItem.extratoCreditos || [];
    const extratoDebitos = profItem.extratoDebitos || [];
    const extratoAjustes = profItem.extratoAjustes || [];

    // Classe de quebra de página: se for o primeiro elemento e NÃO houver capa (modo individual), não precisa quebrar antes
    const isFirstWithoutCover = selectedProfId && profIndex === 0;
    const pageBreakClass = isFirstWithoutCover ? '' : 'professional-cover-break';

    htmlBody += `
    <div class="page ${pageBreakClass}" id="prof-page-${profItem.prof?._id}">
      <div>
        <!-- CABEÇALHO DO PROFISSIONAL -->
        <div class="prof-header-card">
          <div>
            <div class="prof-name">${profNome}</div>
            <div class="prof-cargo">${profCargo} • Reg: ${profRegistro}</div>
          </div>
          <div style="text-align: right;">
            <div class="prof-badge-rank">${rankPosition}º Lugar no Ranking</div>
            <div style="font-size: 7.5pt; color: #cbd5e1; margin-top: 3px;">Competência: ${mesNomeExtenso}</div>
          </div>
        </div>

        <!-- PLACAR SINTÉTICO DO PROFISSIONAL -->
        <div class="kpi-grid">
          <div class="kpi-card ${saldoLiquido >= 0 ? 'success' : 'danger'}">
            <div class="kpi-label">Pontuação Líquida</div>
            <div class="kpi-value" style="color: ${saldoLiquido >= 0 ? '#10b981' : '#ef4444'};">
              ${formatNumber(saldoLiquido)} pts
            </div>
            <div class="kpi-sub">Saldo final apurado</div>
          </div>
          <div class="kpi-card primary">
            <div class="kpi-label">Créditos Individuais</div>
            <div class="kpi-value">+${formatNumber(totalCredIndiv)}</div>
            <div class="kpi-sub">Avaliações, fichas e relatórios</div>
          </div>
          <div class="kpi-card primary">
            <div class="kpi-label">Créditos de Turno / Coletivo</div>
            <div class="kpi-value">+${formatNumber(totalCredColet)}</div>
            <div class="kpi-sub">Retenção de alunos do turno</div>
          </div>
          <div class="kpi-card ${totalDeb > 0 ? 'danger' : 'success'}">
            <div class="kpi-label">Débitos e Penalidades</div>
            <div class="kpi-value" style="color: ${totalDeb > 0 ? '#dc2626' : '#10b981'};">
              ${totalDeb > 0 ? `-${formatNumber(totalDeb)}` : '0 pts'}
            </div>
            <div class="kpi-sub">${totalDeb > 0 ? 'Atrasos / Infrações' : 'Nenhuma penalidade'}</div>
          </div>
        </div>

        <!-- 1. EXTRATO DETALHADO DE CRÉDITOS (+PTS) -->
        <div class="section-title">
          <span>Extrato Analítico de Créditos (+pts)</span>
          <span class="count-badge">${extratoCreditos.length} Entregas</span>
        </div>

        ${extratoCreditos.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th style="width: 70px;">Data</th>
              <th style="width: 140px;">Aluno / Beneficiário</th>
              <th>Atividade / Entrega</th>
              <th style="width: 100px;">Tempo / SLA</th>
              <th style="width: 65px; text-align: right;">Pontos</th>
            </tr>
          </thead>
          <tbody>
            ${extratoCreditos.map((cred: any) => `
            <tr>
              <td>${formatDateBR(cred.data)}</td>
              <td><strong>${cred.alunoNome || '—'}</strong></td>
              <td>
                <span style="font-weight: 600; color: #0f172a;">${cred.tipo}</span>
                ${cred.descricao && cred.descricao !== cred.tipo ? `<div style="font-size: 6.8pt; color: #64748b;">${cred.descricao}</div>` : ''}
              </td>
              <td style="color: #475569;">${cred.tempoGasto || 'No Prazo (SLA)'}</td>
              <td style="text-align: right;" class="pts-plus">+${formatNumber(cred.pontos)}</td>
            </tr>
            `).join('')}
            <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1;">
              <td colspan="4" style="text-align: right; text-transform: uppercase;">Total de Créditos Acumulados:</td>
              <td style="text-align: right;" class="pts-plus">+${formatNumber(totalCred)} pts</td>
            </tr>
          </tbody>
        </table>
        ` : `
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 10px; text-align: center; color: #64748b; font-size: 7.5pt; margin-bottom: 10px;">
          Nenhum crédito individual registrado neste período.
        </div>
        `}

        <!-- 2. EXTRATO DETALHADO DE DÉBITOS E PENALIDADES (-PTS) -->
        <div class="section-title">
          <span>Extrato Analítico de Débitos e Ocorrências (-pts)</span>
          <span class="count-badge">${extratoDebitos.length} Registros</span>
        </div>

        ${extratoDebitos.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th style="width: 70px;">Data</th>
              <th style="width: 130px;">Aluno / Origem</th>
              <th>Infração / Motivo Oficial</th>
              <th style="width: 90px; text-align: center;">Status</th>
              <th style="width: 65px; text-align: right;">Débito</th>
            </tr>
          </thead>
          <tbody>
            ${extratoDebitos.map((deb: any) => `
            <tr>
              <td>${formatDateBR(deb.data)}</td>
              <td><strong>${deb.alunoNome || 'Sistema / Ponto'}</strong></td>
              <td>
                <span style="font-weight: 600; color: #b91c1c;">${deb.tipo}</span>
                <div style="font-size: 6.8pt; color: #64748b;">${deb.motivo || 'Penalidade regulamentar'}</div>
              </td>
              <td style="text-align: center;">
                <span style="font-size: 6.8pt; font-weight: 700; padding: 2px 6px; border-radius: 4px; ${deb.isAbonado ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'}">
                  ${deb.isAbonado ? 'Abonado' : 'Cobrado'}
                </span>
              </td>
              <td style="text-align: right;" class="${deb.isAbonado ? 'pts-neutral' : 'pts-minus'}">
                ${deb.isAbonado ? '0 (Abono)' : `-${formatNumber(deb.pontosDebito)}`}
              </td>
            </tr>
            `).join('')}
            <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1;">
              <td colspan="4" style="text-align: right; text-transform: uppercase;">Total de Débitos Consolidados:</td>
              <td style="text-align: right;" class="pts-minus">-${formatNumber(totalDeb)} pts</td>
            </tr>
          </tbody>
        </table>
        ` : `
        <div class="badge-clean">
          <span>✅</span>
          <div>
            <strong>100% de Conformidade:</strong> Nenhum débito, atraso de ponto ou falta registrado em ${mesNomeExtenso}. O profissional cumpriu integralmente todos os SLAs de atendimento e registros.
          </div>
        </div>
        `}

        <!-- 3. AJUSTES MANUAIS E ABONOS DA DIRETORIA (SE HOUVER) -->
        ${extratoAjustes.length > 0 ? `
        <div class="section-title">
          <span>Ajustes Manuais e Abonos Autorizados pela Diretoria</span>
          <span class="count-badge">${extratoAjustes.length} Registros</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 70px;">Data</th>
              <th style="width: 120px;">Tipo de Ajuste</th>
              <th>Justificativa / Motivo Aprovado</th>
              <th style="width: 110px;">Autorizado Por</th>
              <th style="width: 65px; text-align: right;">Impacto</th>
            </tr>
          </thead>
          <tbody>
            ${extratoAjustes.map((aj: any) => `
            <tr>
              <td>${formatDateBR(aj.data)}</td>
              <td><strong>${aj.tipoDescricao}</strong></td>
              <td>${aj.motivo}</td>
              <td style="color: #475569;">${aj.criadoPor}</td>
              <td style="text-align: right; font-weight: 800; color: ${aj.tipo === 'debito_manual' ? '#dc2626' : '#059669'};">
                ${aj.tipo === 'debito_manual' ? `-${aj.pontos}` : `+${aj.pontos}`}
              </td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}

        <!-- 4. BLOCO DE ASSINATURAS E CIÊNCIA -->
        <div class="signature-block">
          <div class="sign-line">
            <strong>${profNome}</strong>
            Assinatura do Profissional • Data: ____/____/2026
          </div>
          <div class="sign-line">
            <strong>Sávio Augusto Oliveira</strong>
            Diretoria Geral • Clube Fitness Saúde & Reabilitação
          </div>
        </div>
      </div>

      <!-- RODAPÉ DA FOLHA INDIVIDUAL -->
      <div class="page-footer">
        <div>Clube Fitness • Relatório Individual de Fechamento de Metas</div>
        <div>Profissional: <strong>${profNome}</strong> • Competência: ${mesNomeExtenso}</div>
      </div>
    </div>
    `;
  });

  htmlBody += `
  </div>
</body>
</html>`;

  return html + htmlBody;
}
