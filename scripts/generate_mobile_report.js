const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Output paths
const htmlPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026_mobile.html';
const pdfPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026_mobile.pdf';
const downloadsPdfPath = 'C:/Users/user/Downloads/relatorio_pontuacao_outubro_2026_mobile.pdf';
const workspacePdfPath = 'c:/Users/user/.gemini/antigravity-ide/scratch/relatorio_pontuacao_outubro_2026_mobile.pdf';

const professionalsData = [
  {
    pos: '1º',
    nome: 'Pedro Grossi',
    funcao: 'Fisioterapeuta / Treinador (Equipe Tarde)',
    saldo: '+101 pts',
    saldoClass: 'text-emerald',
    badgeClass: 'badge-pos-gold',
    assiduidade: '21 / 21 dias (29 min atraso)',
    somas: [
      { label: 'Avaliações Físicas (≤ 1h)', valor: '+12 pts', desc: '3 procedimentos' },
      { label: 'Testes de Força (≤ 1h)', valor: '+12 pts', desc: '3 procedimentos' },
      { label: 'Relatórios Fisioterápicos (≤ 2h)', valor: '+36 pts', desc: '6 procedimentos' },
      { label: 'Equipe Turno Tarde (≥ 80%)', valor: '+76 pts', desc: '38 alunos × 2 pts' },
      { label: 'Ficha de Treino em ≤ 24h', valor: '—', desc: '0 ocorrências' },
      { label: 'Abonos / Ajustes', valor: '—', desc: 'Sem abonos' }
    ],
    totalSomas: '+136 pts',
    debitos: [
      { label: 'SLA Ficha após 24h (-2 pts)', valor: '-6 pts', desc: 'Camila, Dante e Raquel' },
      { label: 'Fichas Vencidas > 2m (-10 pts)', valor: '0 pts', desc: 'Sem pendências' },
      { label: 'Débitos de Turno (Fechamento)', valor: '0 pts', desc: 'Membro de equipe' },
      { label: 'Ausências de Ponto (-20 pts/dia)', valor: '0 pts', desc: '0 faltas em 21 dias' },
      { label: 'Atrasos de Ponto (-1 pt/min)', valor: '-29 pts', desc: '29 minutos acumulados' }
    ],
    totalDebitos: '-35 pts',
    obs: 'Destaque absoluto em produção clínica e pontualidade exemplar de escala.'
  },
  {
    pos: '2º',
    nome: 'Cleiton Freitas',
    funcao: 'Fisioterapeuta / Co-Responsável Manhã',
    saldo: '+68 pts',
    saldoClass: 'text-emerald',
    badgeClass: 'badge-pos-silver',
    assiduidade: '21 / 21 dias (100% pontual)',
    somas: [
      { label: 'Avaliações Físicas (≤ 1h)', valor: '+4 pts', desc: '1 procedimento' },
      { label: 'Testes de Força (≤ 1h)', valor: '—', desc: '0 procedimentos' },
      { label: 'Relatórios Fisioterápicos (≤ 2h)', valor: '+12 pts', desc: '2 procedimentos' },
      { label: 'Co-Resp. Turno Manhã (≥ 80%)', valor: '+122,5 pts', desc: '50% de 35 alunos × 7 pts' },
      { label: 'Ficha de Treino em ≤ 24h', valor: '—', desc: '0 ocorrências' },
      { label: 'Abono Oficial de Ponto (06/10)', valor: '+193 pts', desc: 'Homologação teste técnico' }
    ],
    totalSomas: '+331,5 pts',
    debitos: [
      { label: 'SLA Ficha após 24h (-2 pts)', valor: '0 pts', desc: 'Sem ocorrências' },
      { label: 'Fichas Vencidas > 2m (-10 pts)', valor: '0 pts', desc: 'Sem pendências' },
      { label: 'Frequência < 80% (-5 pts)', valor: '-32,5 pts', desc: '50% de 13 alunos (-65 pts ÷ 2)' },
      { label: 'Sem Treino Livre (-2 pts)', valor: '-34 pts', desc: '50% de 34 alunos (-68 pts ÷ 2)' },
      { label: 'Emergências > 1 (-4 pts)', valor: '-4 pts', desc: '50% de 2 alunos (-8 pts ÷ 2)' },
      { label: 'Ponto (Débito Original 06/10)', valor: '-193 pts', desc: 'Totalmente neutralizado por abono' },
      { label: 'Ausências / Atrasos Reais', valor: '0 pts', desc: '100% assíduo e pontual' }
    ],
    totalDebitos: '-263,5 pts',
    obs: 'Liderança operacional do turno matutino com 100% de pontualidade no salão.'
  },
  {
    pos: '3º',
    nome: 'Matheus Poeiras Luciano',
    funcao: 'Treinador / Co-Responsável Tarde-Noite',
    saldo: '+56,5 pts',
    saldoClass: 'text-emerald',
    badgeClass: 'badge-pos-bronze',
    assiduidade: '21 / 21 dias (10 min atraso)',
    somas: [
      { label: 'Avaliações Físicas (≤ 1h)', valor: '+4 pts', desc: '1 procedimento' },
      { label: 'Testes de Força (≤ 1h)', valor: '—', desc: '0 procedimentos' },
      { label: 'Relatórios Fisioterápicos (≤ 2h)', valor: '—', desc: '0 procedimentos' },
      { label: 'Co-Resp. Turno Tarde (≥ 80%)', valor: '+133 pts', desc: '50% de 38 alunos × 7 pts' },
      { label: 'Abono Ficha 18/10 (Maria de Fátima)', valor: '+2 pts', desc: 'Montada com validação' }
    ],
    totalSomas: '+139 pts',
    debitos: [
      { label: 'SLA Ficha após 24h (-2 pts)', valor: '0 pts', desc: 'Abonada' },
      { label: 'Fichas Vencidas > 2m (-10 pts)', valor: '-10 pts', desc: '1 aluno (Maria de Fátima)' },
      { label: 'Frequência < 80% (-5 pts)', valor: '-12,5 pts', desc: '50% de 5 alunos (-25 pts ÷ 2)' },
      { label: 'Sem Treino Livre (-2 pts)', valor: '-42 pts', desc: '50% de 42 alunos (-84 pts ÷ 2)' },
      { label: 'Emergências > 1 (-4 pts)', valor: '-6 pts', desc: '50% de 3 alunos (-12 pts ÷ 2)' },
      { label: 'Ausências de Ponto (-20 pts/dia)', valor: '0 pts', desc: '0 ausências em 21 dias' },
      { label: 'Atrasos de Ponto (-1 pt/min)', valor: '-10 pts', desc: '10 minutos acumulados' }
    ],
    totalDebitos: '-80,5 pts',
    obs: 'Turno com maior índice de retenção da academia (88,4% de presença).'
  },
  {
    pos: '4º',
    nome: 'Dra. Rachel Zauli Serpa',
    funcao: 'Fisioterapeuta / Equipe Manhã',
    saldo: '+46 pts',
    saldoClass: 'text-emerald',
    badgeClass: 'badge-pos-neutral',
    assiduidade: '21 / 21 dias (0 min atraso - 100%)',
    somas: [
      { label: 'Avaliações Físicas (≤ 1h)', valor: '+4 pts', desc: '1 procedimento' },
      { label: 'Testes de Força (≤ 1h)', valor: '+8 pts', desc: '2 procedimentos' },
      { label: 'Relatórios Fisioterápicos (≤ 2h)', valor: '+6 pts', desc: '1 procedimento' },
      { label: 'Equipe Turno Manhã (≥ 80%)', valor: '+70 pts', desc: '35 alunos × 2 pts' }
    ],
    totalSomas: '+88 pts',
    debitos: [
      { label: 'SLA Ficha após 24h (-2 pts)', valor: '-2 pts', desc: '1 aluno (Monia Pires)' },
      { label: 'Fichas Vencidas > 2m (-10 pts)', valor: '-40 pts', desc: '4 alunos vinculados' },
      { label: 'Débitos de Turno (Fechamento)', valor: '0 pts', desc: 'Membro de equipe' },
      { label: 'Ausências / Atrasos de Ponto', valor: '0 pts', desc: 'Pontualidade absoluta (0m)' }
    ],
    totalDebitos: '-42 pts',
    obs: 'Empatada em saldo líquido com Dr. Albert, classificada à frente pelo critério oficial de assiduidade perfeita.'
  },
  {
    pos: '5º',
    nome: 'Dr. Albert Nunes',
    funcao: 'Diretor Clínico / Fisioterapia',
    saldo: '+46 pts',
    saldoClass: 'text-emerald',
    badgeClass: 'badge-pos-neutral',
    assiduidade: 'Isento de Ponto (Diretoria Clínica)',
    somas: [
      { label: 'Avaliações Físicas (≤ 1h)', valor: '+44 pts', desc: '11 procedimentos' },
      { label: 'Testes de Força (≤ 1h)', valor: '+20 pts', desc: '5 procedimentos' },
      { label: 'Relatórios Fisioterápicos (≤ 2h)', valor: '+24 pts', desc: '4 procedimentos' }
    ],
    totalSomas: '+88 pts',
    debitos: [
      { label: 'SLA Ficha após 24h (-2 pts)', valor: '-2 pts', desc: '1 aluno (Augusto Andrade)' },
      { label: 'Fichas Vencidas > 2m (-10 pts)', valor: '-40 pts', desc: '4 alunos vinculados' },
      { label: 'Débitos de Turno / Ponto', valor: '0 pts', desc: 'Atuação clínica direta' }
    ],
    totalDebitos: '-42 pts',
    obs: 'Maior produtor clínico da unidade com 20 atendimentos válidos no SLA.'
  },
  {
    pos: '6º',
    nome: 'Dr. Guilherme José Graciano',
    funcao: 'Fisioterapeuta / Co-Responsável Tarde-Noite',
    saldo: '+3,5 pts',
    saldoClass: 'text-emerald',
    badgeClass: 'badge-pos-neutral',
    assiduidade: '18 / 21 dias (2 ausências, 89 min atraso)',
    somas: [
      { label: 'Avaliações Físicas (≤ 1h)', valor: '—', desc: '0 procedimentos' },
      { label: 'Testes de Força (≤ 1h)', valor: '+24 pts', desc: '6 procedimentos' },
      { label: 'Relatórios Fisioterápicos (≤ 2h)', valor: '+36 pts', desc: '6 procedimentos' },
      { label: 'Co-Resp. Turno Tarde (≥ 80%)', valor: '+133 pts', desc: '50% de 38 alunos × 7 pts' },
      { label: 'Abono Oficial de Ponto (16/10)', valor: 'Abonado', desc: 'Abono por atividade externa' }
    ],
    totalSomas: '+193 pts',
    debitos: [
      { label: 'Frequência < 80% (-5 pts)', valor: '-12,5 pts', desc: '50% de 5 alunos (-25 pts ÷ 2)' },
      { label: 'Sem Treino Livre (-2 pts)', valor: '-42 pts', desc: '50% de 42 alunos (-84 pts ÷ 2)' },
      { label: 'Emergências > 1 (-4 pts)', valor: '-6 pts', desc: '50% de 3 alunos (-12 pts ÷ 2)' },
      { label: 'Ausências de Ponto (-20 pts/dia)', valor: '-40 pts', desc: '2 dias sem registro (20 e 27/10)' },
      { label: 'Atrasos de Ponto (-1 pt/min)', valor: '-89 pts', desc: '89 minutos acumulados' }
    ],
    totalDebitos: '-189,5 pts',
    obs: 'Saldo líquido positivo assegurado pela alta produção técnica e coparticipação na meta de turno.'
  },
  {
    pos: '7º',
    nome: 'Thiago Castro Lima Rocha',
    funcao: 'Fisioterapeuta (Início em 16/10/2026)',
    saldo: '-45 pts',
    saldoClass: 'text-rose',
    badgeClass: 'badge-pos-danger',
    assiduidade: '8 plantões (2 ausências, 5 min atraso)',
    somas: [
      { label: 'Produção Clínica / Metas', valor: '0 pts', desc: 'Sem produção no período' },
      { label: 'Abono Presença 22/10', valor: 'Abonado', desc: 'Presença confirmada' }
    ],
    totalSomas: '0 pts',
    debitos: [
      { label: 'Ausências de Ponto (-20 pts/dia)', valor: '-40 pts', desc: '2 ausências (21 e 27/10)' },
      { label: 'Atrasos de Ponto (-1 pt/min)', valor: '-5 pts', desc: '5 minutos acumulados' },
      { label: 'Período Pré-Admissão (01 a 15/10)', valor: 'Isento (-)', desc: 'Registrado sem débito' }
    ],
    totalDebitos: '-45 pts',
    obs: 'Profissional admitido em meados de outubro com escala em adaptação.'
  },
  {
    pos: '8º',
    nome: 'Ruthi Novais',
    funcao: 'Treinadora / Avaliadora / Co-Resp. Manhã',
    saldo: '-56 pts',
    saldoClass: 'text-rose',
    badgeClass: 'badge-pos-danger',
    assiduidade: '18 / 21 dias (3 ausências, 22 min atraso)',
    somas: [
      { label: 'Avaliações Físicas (≤ 1h)', valor: '+8 pts', desc: '2 procedimentos' },
      { label: 'Co-Resp. Turno Manhã (≥ 80%)', valor: '+122,5 pts', desc: '50% de 35 alunos × 7 pts' }
    ],
    totalSomas: '+130,5 pts',
    debitos: [
      { label: 'SLA Ficha após 24h (-2 pts)', valor: '-4 pts', desc: '2 ocorrências (Daniele e Renato)' },
      { label: 'Fichas Vencidas > 2m (-10 pts)', valor: '-30 pts', desc: '3 alunas vinculadas' },
      { label: 'Frequência < 80% (-5 pts)', valor: '-32,5 pts', desc: '50% de 13 alunos (-65 pts ÷ 2)' },
      { label: 'Sem Treino Livre (-2 pts)', valor: '-34 pts', desc: '50% de 34 alunos (-68 pts ÷ 2)' },
      { label: 'Emergências > 1 (-4 pts)', valor: '-4 pts', desc: '50% de 2 alunos (-8 pts ÷ 2)' },
      { label: 'Ausências de Ponto (-20 pts/dia)', valor: '-60 pts', desc: '3 faltas (09, 13 e 14/10)' },
      { label: 'Atrasos de Ponto (-1 pt/min)', valor: '-22 pts', desc: '22 minutos acumulados' }
    ],
    totalDebitos: '-186,5 pts',
    obs: 'Forte participação em sala penalizada por ausências de ponto e carteira vencida.'
  },
  {
    pos: '9º',
    nome: 'Maria Luísa Câmara Gontijo',
    funcao: 'Fisioterapeuta (Escala Fixada)',
    saldo: '-106 pts',
    saldoClass: 'text-rose',
    badgeClass: 'badge-pos-danger',
    assiduidade: '10 plantões (3 ausências, 52 min atraso)',
    somas: [
      { label: 'Relatórios Fisioterápicos (≤ 2h)', valor: '+6 pts', desc: '1 procedimento' },
      { label: 'Abono 1º Plantão (05/10)', valor: 'Abonado', desc: 'Ajuste inicial de integração' }
    ],
    totalSomas: '+6 pts',
    debitos: [
      { label: 'Ausências de Ponto (-20 pts/dia)', valor: '-60 pts', desc: '3 plantões (06, 16 e 27/10)' },
      { label: 'Atrasos de Ponto (-1 pt/min)', valor: '-52 pts', desc: '52 minutos acumulados' },
      { label: 'Dias Facultativos / Folgas', valor: 'Abonados', desc: 'Quartas e quintas flexíveis' }
    ],
    totalDebitos: '-112 pts',
    obs: 'Escala parcial necessita alinhamento contínuo com a coordenação de ponto.'
  }
];

const cardsHtml = professionalsData.map((p, idx) => `
  <div class="prof-card">
    <div class="prof-header">
      <div class="prof-identity">
        <span class="badge ${p.badgeClass}">${p.pos} LUGAR</span>
        <div class="prof-name">${p.nome}</div>
        <div class="prof-role">${p.funcao}</div>
      </div>
      <div class="prof-score-box">
        <div class="score-label">SALDO LÍQUIDO</div>
        <div class="score-value ${p.saldoClass}">${p.saldo}</div>
      </div>
    </div>

    <div class="assiduidade-bar">
      <strong>Assiduidade de Ponto:</strong> ${p.assiduidade}
    </div>

    <div class="breakdown-grid">
      <!-- SOMAS -->
      <div class="breakdown-col plus-col">
        <div class="breakdown-title text-emerald">Atividades que Somam (+)</div>
        <div class="breakdown-items">
          ${p.somas.map(s => `
            <div class="breakdown-row">
              <span class="item-name">${s.label}<br><small>${s.desc}</small></span>
              <span class="item-val text-emerald font-bold">${s.valor}</span>
            </div>
          `).join('')}
          <div class="breakdown-total font-bold text-emerald">
            <span>Total Créditos (+)</span>
            <span>${p.totalSomas}</span>
          </div>
        </div>
      </div>

      <!-- DÉBITOS -->
      <div class="breakdown-col minus-col">
        <div class="breakdown-title text-rose">Critérios que Debitam (-)</div>
        <div class="breakdown-items">
          ${p.debitos.map(d => `
            <div class="breakdown-row">
              <span class="item-name">${d.label}<br><small>${d.desc}</small></span>
              <span class="item-val text-rose font-bold">${d.valor}</span>
            </div>
          `).join('')}
          <div class="breakdown-total font-bold text-rose">
            <span>Total Débitos (-)</span>
            <span>${p.totalDebitos}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="prof-obs">
      <strong>Auditoria:</strong> ${p.obs}
    </div>
  </div>
`).join('\n');

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Relatório Executivo de Pontuação — Mobile Edition</title>
<style>
  @page {
    size: 110mm 220mm;
    margin: 6mm 5mm;
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
    background: #f8fafc;
    color: #0f172a;
    font-size: 11.5px;
    line-height: 1.35;
  }
  .mobile-container {
    padding: 4px;
    max-width: 100%;
  }

  /* CAPA / HEADER */
  .header-card {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    color: #ffffff;
    border-radius: 10px;
    padding: 14px 12px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .header-card .badge-org {
    display: inline-block;
    background: #3b82f6;
    color: #ffffff;
    font-size: 8.5px;
    font-weight: 800;
    padding: 2px 7px;
    border-radius: 4px;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
    text-transform: uppercase;
  }
  .header-card h1 {
    font-size: 16px;
    font-weight: 800;
    line-height: 1.2;
    margin: 0 0 6px 0;
    letter-spacing: -0.3px;
  }
  .header-card p {
    font-size: 9.5px;
    color: #94a3b8;
    margin: 0 0 10px 0;
    line-height: 1.4;
  }
  .header-meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    border-top: 1px solid rgba(255,255,255,0.1);
    padding-top: 8px;
  }
  .meta-box {
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
    padding: 6px 8px;
  }
  .meta-box .lbl {
    font-size: 8px;
    text-transform: uppercase;
    color: #94a3b8;
    font-weight: 700;
  }
  .meta-box .val {
    font-size: 10px;
    color: #f1f5f9;
    font-weight: 700;
    margin-top: 1px;
  }

  /* CARDS DE RESUMO RÁPIDO */
  .quick-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .stat-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 10px;
  }
  .stat-card .stat-title {
    font-size: 8.5px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
  }
  .stat-card .stat-val {
    font-size: 15px;
    font-weight: 800;
    margin-top: 2px;
  }
  .stat-card .stat-sub {
    font-size: 8px;
    color: #64748b;
    margin-top: 1px;
  }

  /* SEÇÕES E TÍTULOS */
  .section-title {
    font-size: 12.5px;
    font-weight: 800;
    color: #0f172a;
    margin: 14px 0 8px 0;
    padding-bottom: 4px;
    border-bottom: 2px solid #0284c7;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    page-break-after: avoid;
  }

  /* CARD DO PROFISSIONAL */
  .prof-card {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 9px;
    padding: 10px 10px 8px 10px;
    margin-bottom: 10px;
    page-break-inside: avoid;
    box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  }
  .prof-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 6px;
  }
  .prof-identity {
    flex: 1;
  }
  .badge {
    display: inline-block;
    font-size: 8px;
    font-weight: 800;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .badge-pos-gold { background: #fef08a; color: #854d0e; border: 1px solid #facc15; }
  .badge-pos-silver { background: #e2e8f0; color: #334155; border: 1px solid #cbd5e1; }
  .badge-pos-bronze { background: #ffedd5; color: #9a3412; border: 1px solid #fdba74; }
  .badge-pos-neutral { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
  .badge-pos-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

  .prof-name {
    font-size: 13.5px;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
  }
  .prof-role {
    font-size: 9px;
    color: #64748b;
    margin-top: 1px;
    font-weight: 600;
  }
  .prof-score-box {
    text-align: right;
    min-width: 80px;
  }
  .prof-score-box .score-label {
    font-size: 7.5px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
  }
  .prof-score-box .score-value {
    font-size: 16px;
    font-weight: 900;
    line-height: 1.1;
  }

  .assiduidade-bar {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 4px 8px;
    font-size: 9px;
    color: #334155;
    margin-bottom: 8px;
  }

  .breakdown-grid {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 6px;
  }
  .breakdown-col {
    border-radius: 6px;
    padding: 6px 8px;
  }
  .plus-col { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .minus-col { background: #fef2f2; border: 1px solid #fecaca; }

  .breakdown-title {
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(0,0,0,0.06);
    padding-bottom: 2px;
  }
  .breakdown-items {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .breakdown-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 9px;
    line-height: 1.2;
  }
  .breakdown-row small {
    font-size: 7.5px;
    color: #64748b;
  }
  .breakdown-total {
    display: flex;
    justify-content: space-between;
    margin-top: 3px;
    padding-top: 3px;
    border-top: 1px dashed rgba(0,0,0,0.15);
    font-size: 9.5px;
  }

  .prof-obs {
    font-size: 8px;
    color: #475569;
    background: #f1f5f9;
    border-radius: 4px;
    padding: 4px 6px;
    line-height: 1.3;
  }

  /* TABELAS COMPACTAS MOBILE */
  .mobile-table {
    width: 100%;
    border-collapse: collapse;
    background: #ffffff;
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #cbd5e1;
    font-size: 8.5px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .mobile-table th {
    background: #f1f5f9;
    font-weight: 700;
    color: #334155;
    padding: 5px 6px;
    text-align: left;
    border-bottom: 1px solid #cbd5e1;
  }
  .mobile-table td {
    padding: 4px 6px;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .mobile-table tr:last-child td { border-bottom: none; }

  .text-emerald { color: #166534; }
  .text-rose { color: #991b1b; }
  .text-blue { color: #1d4ed8; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .font-bold { font-weight: 700; }

  .footer-note {
    font-size: 8px;
    color: #94a3b8;
    text-align: center;
    margin-top: 14px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    page-break-inside: avoid;
  }
</style>
</head>
<body>
<div class="mobile-container">

  <!-- CAPA MOBILE -->
  <div class="header-card">
    <span class="badge-org">Clube Fitness • Auditoria Oficial</span>
    <h1>Relatório de Metas & Performance</h1>
    <p>Fechamento Contábil de Outubro/2026 adaptado especialmente para leitura ágil e legível em smartphones.</p>
    <div class="header-meta-grid">
      <div class="meta-box">
        <div class="lbl">Período Auditado</div>
        <div class="val">01/10 a 31/10/2026</div>
      </div>
      <div class="meta-box">
        <div class="lbl">Regra Contábil</div>
        <div class="val">Anti-Perdas & SLA 24h</div>
      </div>
      <div class="meta-box">
        <div class="lbl">Escopo Frequência</div>
        <div class="val">Monitorado & Personalizado</div>
      </div>
      <div class="meta-box">
        <div class="lbl">Status da Auditoria</div>
        <div class="val" style="color: #4ade80;">100% Homologado</div>
      </div>
    </div>
  </div>

  <!-- STATS RÁPIDOS -->
  <div class="quick-stats">
    <div class="stat-card">
      <div class="stat-title">Turno Manhã</div>
      <div class="stat-val text-emerald">72,9%</div>
      <div class="stat-sub">35 retidos / 48 ativos</div>
    </div>
    <div class="stat-card">
      <div class="stat-title">Turno Tarde/Noite</div>
      <div class="stat-val text-blue">88,4%</div>
      <div class="stat-sub">38 retidos / 43 ativos</div>
    </div>
  </div>

  <!-- RANKING RESUMO MOBILE -->
  <div class="section-title">1. Resumo do Ranking Geral</div>
  <table class="mobile-table">
    <thead>
      <tr>
        <th style="width: 30px;">Pos</th>
        <th>Profissional</th>
        <th class="text-right">Somas</th>
        <th class="text-right">Débitos</th>
        <th class="text-right">Líquido</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="font-bold text-center">1º</td>
        <td class="font-bold">Pedro Grossi</td>
        <td class="text-right text-emerald">+136</td>
        <td class="text-right text-rose">-35</td>
        <td class="text-right font-bold text-emerald">+101 pts</td>
      </tr>
      <tr>
        <td class="font-bold text-center">2º</td>
        <td class="font-bold">Cleiton Freitas</td>
        <td class="text-right text-emerald">+331,5</td>
        <td class="text-right text-rose">-263,5</td>
        <td class="text-right font-bold text-emerald">+68 pts</td>
      </tr>
      <tr>
        <td class="font-bold text-center">3º</td>
        <td class="font-bold">Matheus Poeiras Luciano</td>
        <td class="text-right text-emerald">+139</td>
        <td class="text-right text-rose">-80,5</td>
        <td class="text-right font-bold text-emerald">+56,5 pts</td>
      </tr>
      <tr>
        <td class="font-bold text-center">4º</td>
        <td class="font-bold">Dra. Rachel Zauli Serpa</td>
        <td class="text-right text-emerald">+88</td>
        <td class="text-right text-rose">-42</td>
        <td class="text-right font-bold text-emerald">+46 pts</td>
      </tr>
      <tr>
        <td class="font-bold text-center">5º</td>
        <td class="font-bold">Dr. Albert Nunes</td>
        <td class="text-right text-emerald">+88</td>
        <td class="text-right text-rose">-42</td>
        <td class="text-right font-bold text-emerald">+46 pts</td>
      </tr>
      <tr>
        <td class="font-bold text-center">6º</td>
        <td class="font-bold">Dr. Guilherme Graciano</td>
        <td class="text-right text-emerald">+193</td>
        <td class="text-right text-rose">-189,5</td>
        <td class="text-right font-bold text-emerald">+3,5 pts</td>
      </tr>
      <tr>
        <td class="font-bold text-center">7º</td>
        <td class="font-bold">Thiago Castro Rocha</td>
        <td class="text-right">0</td>
        <td class="text-right text-rose">-45</td>
        <td class="text-right font-bold text-rose">-45 pts</td>
      </tr>
      <tr>
        <td class="font-bold text-center">8º</td>
        <td class="font-bold">Ruthi Novais</td>
        <td class="text-right text-emerald">+130,5</td>
        <td class="text-right text-rose">-186,5</td>
        <td class="text-right font-bold text-rose">-56 pts</td>
      </tr>
      <tr>
        <td class="font-bold text-center">9º</td>
        <td class="font-bold">Maria Luísa Gontijo</td>
        <td class="text-right text-emerald">+6</td>
        <td class="text-right text-rose">-112</td>
        <td class="text-right font-bold text-rose">-106 pts</td>
      </tr>
    </tbody>
  </table>

  <!-- CARDS INDIVIDUAIS DOS PROFISSIONAIS -->
  <div class="section-title">2. Detalhamento por Profissional</div>
  ${cardsHtml}

  <!-- AUDITORIA NOMINAL DE EMERGÊNCIAS -->
  <div class="section-title">3. Alunos com &gt; 1 Emergência (-4 pts)</div>
  <table class="mobile-table">
    <thead>
      <tr style="background:#fef2f2;">
        <th>Aluno(a)</th>
        <th>Turno</th>
        <th class="text-center">Qtd</th>
        <th>Ocorrências Auditadas</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="font-bold">Dante Sarmento</td>
        <td>Manhã</td>
        <td class="text-center font-bold text-rose">2</td>
        <td>19/10 (07h) e 21/10 (09h - lombar)</td>
      </tr>
      <tr>
        <td class="font-bold">Raquel Freitas</td>
        <td>Manhã/Tarde</td>
        <td class="text-center font-bold text-rose">2</td>
        <td>01/10 (15h) e 05/10 (08h)</td>
      </tr>
      <tr>
        <td class="font-bold">Rafaela Vaz</td>
        <td>Tarde/Noite</td>
        <td class="text-center font-bold text-rose">4</td>
        <td>09/10, 23/10 (15h/16h) e 27/10</td>
      </tr>
      <tr>
        <td class="font-bold">Ian Javoski Diniz</td>
        <td>Tarde/Noite</td>
        <td class="text-center font-bold text-rose">4</td>
        <td>13, 14, 16 e 19/10 (todos às 17h)</td>
      </tr>
    </tbody>
  </table>

  <!-- AUDITORIA NOMINAL DE FREQUÊNCIA < 80% -->
  <div class="section-title">4. Alunos com Frequência &lt; 80% (-5 pts)</div>
  <table class="mobile-table">
    <thead>
      <tr style="background:#fef2f2;">
        <th>Aluno(a)</th>
        <th>Turno</th>
        <th class="text-center">Taxa</th>
        <th class="text-right">Falta p/ 80%</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>Célia Maria Gomes</td><td>Manhã</td><td class="text-center font-bold text-rose">75%</td><td class="text-right">+1 pres.</td></tr>
      <tr><td>Anna Luiza Coutinho</td><td>Manhã</td><td class="text-center font-bold text-rose">75%</td><td class="text-right">+1 pres.</td></tr>
      <tr><td>Livia Teixeira Lima</td><td>Manhã</td><td class="text-center font-bold text-rose">70%</td><td class="text-right">+1 pres.</td></tr>
      <tr><td>Danilson Gonçalves</td><td>Manhã</td><td class="text-center font-bold text-rose">70%</td><td class="text-right">+1 pres.</td></tr>
      <tr><td>Tatiana Bonifacino</td><td>Manhã</td><td class="text-center font-bold text-rose">70%</td><td class="text-right">+1 pres.</td></tr>
      <tr><td>Kelly Nascimento</td><td>Manhã</td><td class="text-center font-bold text-rose">66,7%</td><td class="text-right">+2 pres.</td></tr>
      <tr><td>Helcio Dias Florencio</td><td>Manhã</td><td class="text-center font-bold text-rose">50%</td><td class="text-right">+1 pres.</td></tr>
      <tr><td>Mariana Borja Salvo</td><td>Manhã</td><td class="text-center font-bold text-rose">50%</td><td class="text-right">+3 pres.</td></tr>
      <tr><td>Aluisio Mourão Mendes</td><td>Manhã</td><td class="text-center font-bold text-rose">44,4%</td><td class="text-right">+4 pres.</td></tr>
      <tr><td>Ruan Lopes Rosa</td><td>Manhã</td><td class="text-center font-bold text-rose">22,2%</td><td class="text-right">+6 pres.</td></tr>
      <tr><td>Juliana Bastone</td><td>Manhã</td><td class="text-center font-bold text-rose">0%</td><td class="text-right">+1 pres.</td></tr>
      <tr><td>Fabrício Galvão Brito</td><td>Manhã</td><td class="text-center font-bold text-rose">0%</td><td class="text-right">+2 pres.</td></tr>
      <tr><td>Sofia Araújo Campos</td><td>Manhã</td><td class="text-center font-bold text-rose">0%</td><td class="text-right">Sem baixa</td></tr>
      <tr><td>Mª Valentina Rocha</td><td>Tarde</td><td class="text-center font-bold text-rose">77,8%</td><td class="text-right">+1 pres.</td></tr>
      <tr><td>Ronei Vital Gomes</td><td>Tarde</td><td class="text-center font-bold text-rose">70%</td><td class="text-right">+1 pres.</td></tr>
      <tr><td>Francisco de Assis</td><td>Tarde</td><td class="text-center font-bold text-rose">66,7%</td><td class="text-right">+1 pres.</td></tr>
      <tr><td>Rosália Pessoa Caldas</td><td>Tarde</td><td class="text-center font-bold text-rose">66,7%</td><td class="text-right">+2 pres.</td></tr>
      <tr><td>Márcio Nogueira Resende</td><td>Tarde</td><td class="text-center font-bold text-rose">62,5%</td><td class="text-right">+2 pres.</td></tr>
    </tbody>
  </table>

  <!-- NOTA DE RODAPÉ -->
  <div class="footer-note">
    Documento emitido eletronicamente pela Central de Metas do Clube Fitness.<br>
    Formatado com precisão para visualização e leitura vertical em telas de smartphones.
  </div>

</div>
</body>
</html>
`;

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('Mobile HTML written successfully:', fs.statSync(htmlPath).size, 'bytes');

// Render PDF with Edge headless
const edgeExe = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
const cmd = `${edgeExe} --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`;

console.log('Rendering Mobile PDF with Microsoft Edge...');
execSync(cmd);

const pdfStat = fs.statSync(pdfPath);
console.log('Mobile PDF generated successfully:', pdfStat.size, 'bytes');

// Copy to Downloads and workspace
fs.copyFileSync(pdfPath, downloadsPdfPath);
fs.copyFileSync(pdfPath, workspacePdfPath);
console.log('Copied to Downloads:', downloadsPdfPath);
console.log('Copied to Workspace:', workspacePdfPath);
