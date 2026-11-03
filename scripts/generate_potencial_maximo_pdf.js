const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const artifactDir = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b';
const htmlPath = path.join(artifactDir, 'relatorio_analise_potencial_maximo_outubro_2026.html');
const pdfPath = path.join(artifactDir, 'relatorio_analise_potencial_maximo_outubro_2026.pdf');
const downloadsPdfPath = 'C:/Users/user/Downloads/relatorio_analise_potencial_maximo_outubro_2026.pdf';
const workspacePdfPath = 'c:/Users/user/.gemini/antigravity-ide/scratch/relatorio_analise_potencial_maximo_outubro_2026.pdf';
const storagePdfPath = path.join(__dirname, '..', 'storage', 'reports', 'relatorio_analise_potencial_maximo_outubro_2026.pdf');

const dataComparison = [
  {
    pos: '1º',
    nome: 'Dr. Guilherme José Graciano',
    funcao: 'Fisioterapeuta / Co-Resp. Tarde-Noite',
    realizado: '+3,5 pts',
    realizadoNum: 3.5,
    maximo: '+336,0 pts',
    maximoNum: 336.0,
    gap: '+332,5 pts',
    aproveitamento: '1,0%',
    alavanca: 'Eliminar atrasos/faltas de ponto (+129 pts), capturar bônus de treino livre (+43 pts) e emergências (+64,5 pts), além de reverter glosas clínicas (+18 pts).',
    detalhes: {
      clinicaReal: '+60,0 pts (11 procedimentos)',
      clinicaMax: '+78,0 pts (6 testes + 9 relatórios no SLA)',
      turnoReal: '+133,0 pts (bônus frequência)',
      turnoMax: '+258,0 pts (frequência 100% + treino livre 100% + emergências ≤1)',
      debitosReal: '-189,5 pts (-60,5 turno, -40 ausências, -89 atrasos)',
      debitosMax: '0,0 pts'
    }
  },
  {
    pos: '2º',
    nome: 'Cleiton Freitas',
    funcao: 'Fisioterapeuta / Co-Resp. Manhã',
    realizado: '+68,0 pts',
    realizadoNum: 68.0,
    maximo: '+306,0 pts',
    maximoNum: 306.0,
    gap: '+238,0 pts',
    aproveitamento: '22,2%',
    alavanca: 'Blindar os 13 alunos em risco de frequência (+70,5 pts de turno neutralizados) e fechar 100% dos treinos livres semanais (+48 pts) e emergências (+72 pts).',
    detalhes: {
      clinicaReal: '+16,0 pts (3 procedimentos)',
      clinicaMax: '+18,0 pts (1 avaliação com ficha em 24h + 2 relatórios)',
      turnoReal: '+122,5 pts (bônus frequência)',
      turnoMax: '+288,0 pts (frequência 100% + treino livre 100% + emergências ≤1)',
      debitosReal: '-263,5 pts (-70,5 turno, débito 06/10 neutralizado por abono)',
      debitosMax: '0,0 pts'
    }
  },
  {
    pos: '3º',
    nome: 'Ruthi Novais',
    funcao: 'Treinadora / Avaliadora / Co-Resp. Manhã',
    realizado: '-56,0 pts',
    realizadoNum: -56.0,
    maximo: '+300,0 pts',
    maximoNum: 300.0,
    gap: '+356,0 pts',
    aproveitamento: 'Negativo',
    alavanca: 'Regularizar ponto biométrico (+82 pts), reavaliar carteira vencida (+30 pts), zerar SLA de ficha (+4 pts) e capturar bônus integral de turno (+165,5 pts).',
    detalhes: {
      clinicaReal: '+8,0 pts (2 avaliações)',
      clinicaMax: '+12,0 pts (2 avaliações com fichas montadas em 24h)',
      turnoReal: '+122,5 pts (bônus frequência)',
      turnoMax: '+288,0 pts (frequência 100% + treino livre 100% + emergências ≤1)',
      debitosReal: '-186,5 pts (-70,5 turno, -60 ausências, -22 atrasos, -30 carteira, -4 SLA)',
      debitosMax: '0,0 pts'
    }
  },
  {
    pos: '4º',
    nome: 'Matheus Poeiras Luciano',
    funcao: 'Treinador / Co-Resp. Tarde-Noite',
    realizado: '+56,5 pts',
    realizadoNum: 56.5,
    maximo: '+264,0 pts',
    maximoNum: 264.0,
    gap: '+207,5 pts',
    aproveitamento: '21,4%',
    alavanca: 'Engajar alunos no treino livre semanal (+43 pts), blindar emergências (+64,5 pts), neutralizar débitos de turno (+60,5 pts) e zerar atrasos (+10 pts).',
    detalhes: {
      clinicaReal: '+4,0 pts (1 avaliação)',
      clinicaMax: '+6,0 pts (1 avaliação com ficha montada em 24h)',
      turnoReal: '+133,0 pts (bônus frequência)',
      turnoMax: '+258,0 pts (frequência 100% + treino livre 100% + emergências ≤1)',
      debitosReal: '-80,5 pts (-60,5 turno, -10 atrasos, -10 carteira Maria de Fátima)',
      debitosMax: '0,0 pts'
    }
  },
  {
    pos: '5º',
    nome: 'Pedro Grossi',
    funcao: 'Fisioterapeuta / Treinador (Equipe Tarde)',
    realizado: '+101,0 pts',
    realizadoNum: 101.0,
    maximo: '+152,0 pts',
    maximoNum: 152.0,
    gap: '+51,0 pts',
    aproveitamento: '66,4%',
    alavanca: 'Zerar os 29 minutos de atraso de ponto (+29 pts), montar fichas em ≤ 24h (+12 pts de resgate e bônus) e elevar presença da equipe para 100% (+10 pts).',
    detalhes: {
      clinicaReal: '+60,0 pts (12 procedimentos)',
      clinicaMax: '+66,0 pts (3 avaliações com fichas + 3 testes + 6 relatórios)',
      turnoReal: '+76,0 pts (equipe tarde 38 alunos)',
      turnoMax: '+86,0 pts (equipe tarde 43 alunos 100%)',
      debitosReal: '-35,0 pts (-29 atrasos, -6 SLA de fichas)',
      debitosMax: '0,0 pts'
    }
  },
  {
    pos: '6º',
    nome: 'Dr. Albert Nunes',
    funcao: 'Diretor Clínico / Fisioterapia',
    realizado: '+46,0 pts',
    realizadoNum: 46.0,
    maximo: '+116,0 pts',
    maximoNum: 116.0,
    gap: '+70,0 pts',
    aproveitamento: '39,7%',
    alavanca: 'Reavaliar os 4 alunos de carteira vencida (+40 pts), montar fichas em ≤ 24h (+22 pts) e resgatar relatório de Lourilda no SLA (+6 pts).',
    detalhes: {
      clinicaReal: '+88,0 pts (20 procedimentos)',
      clinicaMax: '+116,0 pts (11 avaliações com fichas + 5 testes + 5 relatórios)',
      turnoReal: '— (atuação clínica direta)',
      turnoMax: '— (atuação clínica direta)',
      debitosReal: '-42,0 pts (-40 carteira vencida, -2 SLA ficha)',
      debitosMax: '0,0 pts'
    }
  },
  {
    pos: '7º',
    nome: 'Dra. Rachel Zauli Serpa',
    funcao: 'Fisioterapeuta / Equipe Manhã',
    realizado: '+46,0 pts',
    realizadoNum: 46.0,
    maximo: '+116,0 pts',
    maximoNum: 116.0,
    gap: '+70,0 pts',
    aproveitamento: '39,7%',
    alavanca: 'Reavaliar as 4 alunas de carteira vencida (+40 pts), elevar presença da equipe para 100% (+26 pts) e montar ficha de Monia Pires em 24h (+4 pts).',
    detalhes: {
      clinicaReal: '+18,0 pts (4 procedimentos)',
      clinicaMax: '+20,0 pts (1 avaliação com ficha + 2 testes + 1 relatório)',
      turnoReal: '+70,0 pts (equipe manhã 35 alunos)',
      turnoMax: '+96,0 pts (equipe manhã 48 alunos 100%)',
      debitosReal: '-42,0 pts (-40 carteira vencida, -2 SLA ficha)',
      debitosMax: '0,0 pts'
    }
  },
  {
    pos: '8º',
    nome: 'Thiago Castro Lima Rocha',
    funcao: 'Fisioterapeuta (Início em 16/10/2026)',
    realizado: '-45,0 pts',
    realizadoNum: -45.0,
    maximo: '+20,0 pts',
    maximoNum: 20.0,
    gap: '+65,0 pts',
    aproveitamento: 'Negativo',
    alavanca: 'Registrar 100% de presença sem faltas de ponto nos plantões (+45 pts) e assumir carteira inicial de procedimentos técnicos (+20 pts).',
    detalhes: {
      clinicaReal: '0,0 pts (sem procedimentos)',
      clinicaMax: '+20,0 pts (4 procedimentos técnicos na quinzena)',
      turnoReal: '— (escala de plantão)',
      turnoMax: '— (escala de plantão)',
      debitosReal: '-45,0 pts (-40 ausências em 21 e 27/10, -5 atrasos)',
      debitosMax: '0,0 pts'
    }
  },
  {
    pos: '9º',
    nome: 'Maria Luísa Câmara Gontijo',
    funcao: 'Fisioterapeuta (Escala Fixada)',
    realizado: '-106,0 pts',
    realizadoNum: -106.0,
    maximo: '+18,0 pts',
    maximoNum: 18.0,
    gap: '+124,0 pts',
    aproveitamento: 'Negativo',
    alavanca: 'Eliminar faltas e atrasos de escala no ponto biométrico (+112 pts) e expandir produção clínica na escala fixada (+12 pts).',
    detalhes: {
      clinicaReal: '+6,0 pts (1 relatório)',
      clinicaMax: '+18,0 pts (3 relatórios no SLA)',
      turnoReal: '— (escala fixada)',
      turnoMax: '— (escala fixada)',
      debitosReal: '-112,0 pts (-60 ausências de escala, -52 atrasos)',
      debitosMax: '0,0 pts'
    }
  }
];

const cardsHtml = dataComparison.map(p => `
  <div class="card-prof">
    <div class="card-header">
      <div>
        <span class="badge ${p.maximoNum >= 250 ? 'badge-gold' : 'badge-blue'}">${p.pos} LUGAR NO TETO</span>
        <div class="card-title">${p.nome}</div>
        <div class="card-sub">${p.funcao}</div>
      </div>
      <div class="score-box">
        <div class="score-lbl">MÁXIMO REALIZÁVEL</div>
        <div class="score-val text-emerald">${p.maximo}</div>
        <div class="score-gap">Realizado: <strong>${p.realizado}</strong> (Gap: <strong class="text-rose">${p.gap}</strong>)</div>
      </div>
    </div>

    <div class="metric-grid">
      <div class="metric-box">
        <div class="k">Produção Clínica Real</div>
        <div class="v">${p.detalhes.clinicaReal}</div>
      </div>
      <div class="metric-box bg-emerald-light">
        <div class="k text-emerald">Produção Clínica Máxima</div>
        <div class="v text-emerald font-bold">${p.detalhes.clinicaMax}</div>
      </div>
      <div class="metric-box">
        <div class="k">Turno de Salão Real</div>
        <div class="v">${p.detalhes.turnoReal}</div>
      </div>
      <div class="metric-box bg-emerald-light">
        <div class="k text-emerald">Turno de Salão Máximo</div>
        <div class="v text-emerald font-bold">${p.detalhes.turnoMax}</div>
      </div>
      <div class="metric-box bg-rose-light">
        <div class="k text-rose">Débitos Sofridos (Out/26)</div>
        <div class="v text-rose font-bold">${p.detalhes.debitosReal}</div>
      </div>
      <div class="metric-box">
        <div class="k">Débitos no Cenário Ideal</div>
        <div class="v text-emerald font-bold">0,0 pts (Zero Débitos)</div>
      </div>
    </div>

    <div class="alavanca-box">
      <strong>Plano de Ação para Capturar o Teto:</strong> ${p.alavanca}
    </div>
  </div>
`).join('\n');

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Relatório Executivo de Potencial Máximo — Outubro / 2026</title>
<style>
  @page {
    size: A4 portrait;
    margin: 14mm 14mm 18mm 14mm;
    @bottom-right {
      content: "Página " counter(page);
      font-size: 8px;
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
    line-height: 1.4;
  }
  .container {
    width: 100%;
    max-width: 100%;
  }

  /* CABEÇALHO */
  .header {
    border-bottom: 2.5px solid #0284c7;
    padding-bottom: 10px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .header-tag {
    display: inline-block;
    background: #0f172a;
    color: #ffffff;
    font-size: 8px;
    font-weight: 800;
    padding: 2.5px 8px;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }
  .header h1 {
    font-size: 18px;
    font-weight: 900;
    color: #0f172a;
    margin: 0 0 4px 0;
    letter-spacing: -0.3px;
    line-height: 1.2;
  }
  .header .subtitle {
    font-size: 10px;
    color: #0369a1;
    font-weight: 700;
    margin-bottom: 6px;
  }
  .header .meta-row {
    font-size: 8.5px;
    color: #475569;
    display: flex;
    gap: 20px;
  }

  /* KPIS EXECUTIVOS */
  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 14px;
    page-break-inside: avoid;
  }
  .kpi-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
  }
  .kpi-title {
    font-size: 8px;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
  }
  .kpi-value {
    font-size: 18px;
    font-weight: 900;
    margin: 3px 0 1px 0;
  }
  .kpi-sub {
    font-size: 7.5px;
    color: #64748b;
  }

  /* SEÇÕES */
  h2 {
    font-size: 12px;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 1.5px solid #0284c7;
    padding-bottom: 4px;
    margin: 16px 0 8px 0;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    page-break-after: avoid;
  }

  .box-info {
    background: #f0fdf4;
    border-left: 3.5px solid #16a34a;
    padding: 8px 10px;
    font-size: 8.5px;
    color: #14532d;
    border-radius: 0 6px 6px 0;
    margin-bottom: 10px;
    page-break-inside: avoid;
    line-height: 1.4;
  }

  /* TABELA COMPARATIVA MESTRA */
  table.main-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 14px;
    font-size: 8px;
    border: 1px solid #cbd5e1;
    page-break-inside: avoid;
  }
  table.main-table th {
    background: #0f172a;
    color: #ffffff;
    font-weight: 700;
    padding: 6px 6px;
    border: 1px solid #334155;
    text-align: left;
    font-size: 8px;
  }
  table.main-table td {
    padding: 5px 6px;
    border: 1px solid #cbd5e1;
    vertical-align: middle;
  }
  table.main-table tr:nth-child(even) td {
    background: #f8fafc;
  }
  table.main-table tr.total-row td {
    background: #f1f5f9;
    font-weight: 800;
    border-top: 2px solid #0f172a;
  }

  /* CARDS INDIVIDUAIS */
  .card-prof {
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
    page-break-inside: avoid;
    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  }
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 6px;
    margin-bottom: 8px;
  }
  .card-title {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
  }
  .card-sub {
    font-size: 8.5px;
    color: #64748b;
    font-weight: 600;
  }
  .badge {
    display: inline-block;
    padding: 1.5px 6px;
    border-radius: 4px;
    font-size: 7.5px;
    font-weight: 800;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .badge-gold { background: #fef08a; color: #854d0e; border: 1px solid #facc15; }
  .badge-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }

  .score-box {
    text-align: right;
  }
  .score-lbl {
    font-size: 7.5px;
    text-transform: uppercase;
    color: #64748b;
    font-weight: 700;
  }
  .score-val {
    font-size: 16px;
    font-weight: 900;
    line-height: 1.1;
  }
  .score-gap {
    font-size: 8px;
    color: #475569;
    margin-top: 2px;
  }

  .metric-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-bottom: 6px;
  }
  .metric-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 4px 6px;
  }
  .metric-box .k {
    font-size: 7px;
    color: #64748b;
    font-weight: 700;
    text-transform: uppercase;
  }
  .metric-box .v {
    font-size: 8.5px;
    font-weight: 700;
    color: #1e293b;
    margin-top: 1px;
  }
  .bg-emerald-light { background: #f0fdf4 !important; border-color: #bbf7d0 !important; }
  .bg-rose-light { background: #fef2f2 !important; border-color: #fecaca !important; }

  .alavanca-box {
    background: #f8fafc;
    border-left: 2.5px solid #0284c7;
    padding: 5px 8px;
    font-size: 8px;
    color: #334155;
    border-radius: 0 4px 4px 0;
    line-height: 1.35;
  }

  .text-emerald { color: #166534; }
  .text-rose { color: #991b1b; }
  .text-blue { color: #1d4ed8; }
  .text-muted { color: #64748b; }
  .font-bold { font-weight: 700; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }

  /* MAPA DE PERDAS */
  table.decomposicao-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 8px;
    margin-bottom: 12px;
    border: 1px solid #cbd5e1;
    page-break-inside: avoid;
  }
  table.decomposicao-table th {
    background: #f1f5f9;
    color: #1e293b;
    font-weight: 700;
    padding: 5px 6px;
    border: 1px solid #cbd5e1;
  }
  table.decomposicao-table td {
    padding: 4px 6px;
    border: 1px solid #e2e8f0;
  }

  .footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 8px;
    margin-top: 16px;
    font-size: 7.5px;
    color: #94a3b8;
    text-align: center;
    page-break-inside: avoid;
  }
</style>
</head>
<body>
<div class="container">

  <!-- CABEÇALHO -->
  <div class="header">
    <span class="header-tag">Auditoria Estratégica de Performance • Clube Fitness</span>
    <h1>Relatório Executivo de Potencial Máximo</h1>
    <div class="subtitle">Confronto Contábil: O Que Foi Atingido em Outubro/2026 vs. O Teto Realizável no Cenário Ideal</div>
    <div class="meta-row">
      <span><strong>Período Auditado:</strong> 01/10/2026 a 31/10/2026</span>
      <span><strong>Unidade:</strong> Central de Metas & Performance</span>
      <span><strong>Destinatário:</strong> Diretoria Executiva</span>
    </div>
  </div>

  <!-- KPIS EXECUTIVOS GERAIS -->
  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-title">Pontos Realizados</div>
      <div class="kpi-value text-blue">+113,0 pts</div>
      <div class="kpi-sub">Soma líquida real da equipe</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Teto Máximo Ideal</div>
      <div class="kpi-value text-emerald">+1.628,0 pts</div>
      <div class="kpi-sub">Potencial realizável com 100% de metas</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Deixado na Mesa</div>
      <div class="kpi-value text-rose">-1.515,0 pts</div>
      <div class="kpi-sub">Perdas de ponto, carteira e retenção</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Aproveitamento Geral</div>
      <div class="kpi-value font-bold" style="color: #ea580c;">6,9%</div>
      <div class="kpi-sub">Eficiência líquida capturada</div>
    </div>
  </div>

  <div class="box-info">
    <strong>Definição do Cenário Ideal:</strong> Simulação auditada onde 100% dos alunos do turno atingem a meta de frequência ($\ge 80\%$), realizam ao menos 1 treino livre semanal, mantêm $\le 1$ emergência no mês, todas as avaliações físicas recebem fichas montadas em até 24 horas, e a equipe opera com zero minutos de atraso de ponto biométrico e zero carteiras vencidas (> 2 meses).
  </div>

  <!-- 1. TABELA MESTRA COMPARATIVA -->
  <h2>1. Tabela Comparativa Geral: Realizado vs. Teto Máximo Real</h2>
  <table class="main-table">
    <thead>
      <tr>
        <th style="width: 25px;" class="text-center">Pos</th>
        <th>Profissional</th>
        <th>Função / Turno</th>
        <th class="text-right">Valor Atingido (Out/26)</th>
        <th class="text-right">Máximo Real (Ideal)</th>
        <th class="text-right">Deixado na Mesa</th>
        <th class="text-center">Aproveitamento</th>
        <th>Principal Alavanca para o Máximo</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="font-bold text-center">1º</td>
        <td class="font-bold">Dr. Guilherme José Graciano</td>
        <td>Fisioterapeuta / Co-Resp. Tarde-Noite</td>
        <td class="text-right font-bold text-emerald">+3,5 pts</td>
        <td class="text-right font-bold text-emerald">+336,0 pts</td>
        <td class="text-right font-bold text-rose">+332,5 pts</td>
        <td class="text-center font-bold">1,0%</td>
        <td>Recuperar 129m/faltas de ponto (+129) + bônus de treino livre e emergências (+125)</td>
      </tr>
      <tr>
        <td class="font-bold text-center">2º</td>
        <td class="font-bold">Cleiton Freitas</td>
        <td>Fisioterapeuta / Co-Resp. Manhã</td>
        <td class="text-right font-bold text-emerald">+68,0 pts</td>
        <td class="text-right font-bold text-emerald">+306,0 pts</td>
        <td class="text-right font-bold text-emerald">+238,0 pts</td>
        <td class="text-center font-bold">22,2%</td>
        <td>Blindar alunos em risco de frequência (+70,5) + bônus integral treino livre/emergências (+120)</td>
      </tr>
      <tr>
        <td class="font-bold text-center">3º</td>
        <td class="font-bold">Ruthi Novais</td>
        <td>Treinadora / Co-Resp. Manhã</td>
        <td class="text-right font-bold text-rose">-56,0 pts</td>
        <td class="text-right font-bold text-emerald">+300,0 pts</td>
        <td class="text-right font-bold text-rose">+356,0 pts</td>
        <td class="text-center font-bold text-rose">Negativo</td>
        <td>Regularizar ponto biométrico (+82) + reavaliar carteira (+30) + bônus de turno (+165,5)</td>
      </tr>
      <tr>
        <td class="font-bold text-center">4º</td>
        <td class="font-bold">Matheus Poeiras Luciano</td>
        <td>Treinador / Co-Resp. Tarde-Noite</td>
        <td class="text-right font-bold text-emerald">+56,5 pts</td>
        <td class="text-right font-bold text-emerald">+264,0 pts</td>
        <td class="text-right font-bold text-emerald">+207,5 pts</td>
        <td class="text-center font-bold">21,4%</td>
        <td>Engajar alunos no treino livre semanal (+107,5) e neutralizar débitos de turno (+60,5)</td>
      </tr>
      <tr>
        <td class="font-bold text-center">5º</td>
        <td class="font-bold">Pedro Grossi</td>
        <td>Fisioterapeuta / Treinador (Equipe Tarde)</td>
        <td class="text-right font-bold text-emerald">+101,0 pts</td>
        <td class="text-right font-bold text-emerald">+152,0 pts</td>
        <td class="text-right font-bold text-emerald">+51,0 pts</td>
        <td class="text-center font-bold text-emerald">66,4%</td>
        <td>Zerar minutos de atraso de ponto (+29) e montar fichas em ≤ 24h (+12)</td>
      </tr>
      <tr>
        <td class="font-bold text-center">6º</td>
        <td class="font-bold">Dr. Albert Nunes</td>
        <td>Diretor Clínico / Fisioterapia</td>
        <td class="text-right font-bold text-emerald">+46,0 pts</td>
        <td class="text-right font-bold text-emerald">+116,0 pts</td>
        <td class="text-right font-bold text-emerald">+70,0 pts</td>
        <td class="text-center font-bold">39,7%</td>
        <td>Reavaliar 4 carteiras vencidas (+40) + montar fichas em 24h (+22) + relatório glosado (+6)</td>
      </tr>
      <tr>
        <td class="font-bold text-center">7º</td>
        <td class="font-bold">Dra. Rachel Zauli Serpa</td>
        <td>Fisioterapeuta / Equipe Manhã</td>
        <td class="text-right font-bold text-emerald">+46,0 pts</td>
        <td class="text-right font-bold text-emerald">+116,0 pts</td>
        <td class="text-right font-bold text-emerald">+70,0 pts</td>
        <td class="text-center font-bold">39,7%</td>
        <td>Reavaliar 4 carteiras vencidas (+40) + elevar frequência da equipe para 100% (+26)</td>
      </tr>
      <tr>
        <td class="font-bold text-center">8º</td>
        <td class="font-bold">Thiago Castro Lima Rocha</td>
        <td>Fisioterapeuta (Início em 16/10)</td>
        <td class="text-right font-bold text-rose">-45,0 pts</td>
        <td class="text-right font-bold text-emerald">+20,0 pts</td>
        <td class="text-right font-bold text-rose">+65,0 pts</td>
        <td class="text-center font-bold text-rose">Negativo</td>
        <td>Registrar 100% de presença sem faltas (+45) e assumir atendimentos clínicos (+20)</td>
      </tr>
      <tr>
        <td class="font-bold text-center">9º</td>
        <td class="font-bold">Maria Luísa Câmara Gontijo</td>
        <td>Fisioterapeuta (Escala Fixada)</td>
        <td class="text-right font-bold text-rose">-106,0 pts</td>
        <td class="text-right font-bold text-emerald">+18,0 pts</td>
        <td class="text-right font-bold text-rose">+124,0 pts</td>
        <td class="text-center font-bold text-rose">Negativo</td>
        <td>Eliminar faltas e atrasos de escala no ponto biométrico (+112)</td>
      </tr>
      <tr class="total-row">
        <td colspan="3" class="text-center font-bold">TOTAL CONSOLIDADO DA UNIDADE</td>
        <td class="text-right font-bold text-blue">+113,0 pts</td>
        <td class="text-right font-bold text-emerald">+1.628,0 pts</td>
        <td class="text-right font-bold text-rose">+1.515,0 pts</td>
        <td class="text-center font-bold text-blue">6,9%</td>
        <td>Equipe capturou apenas 6,9% do potencial financeiro e operacional da unidade</td>
      </tr>
    </tbody>
  </table>

  <!-- 2. MAPA DE OPORTUNIDADES -->
  <h2>2. O Mapa dos 1.515 Pontos Deixados na Mesa</h2>
  <table class="decomposicao-table">
    <thead>
      <tr>
        <th>Fator de Perda / Oportunidade Não Capturada</th>
        <th class="text-center">Pontos Perdidos</th>
        <th class="text-center">% do Total</th>
        <th>Impacto Prático e Causa Raiz</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="font-bold">1. Penalidades de Ponto Biométrico (Atrasos e Ausências)</td>
        <td class="text-center font-bold text-rose">378,0 pts</td>
        <td class="text-center font-bold">25,0%</td>
        <td>Atrasos minuto a minuto e dias sem marcação (Dr. Guilherme, Ruthi, Maria Luísa, Pedro e Thiago).</td>
      </tr>
      <tr>
        <td class="font-bold">2. Perdas de Retenção de Salão (Frequência &lt; 80%)</td>
        <td class="text-center font-bold text-rose">307,0 pts</td>
        <td class="text-center font-bold">20,3%</td>
        <td>18 alunos (13 na Manhã e 5 na Tarde) que precisavam de apenas 1 ou 2 presenças no mês para bater 80%.</td>
      </tr>
      <tr>
        <td class="font-bold">3. Treinos Livres Semanais Não Cumpridos pelos Alunos</td>
        <td class="text-center font-bold text-rose">236,0 pts</td>
        <td class="text-center font-bold">15,6%</td>
        <td>76 alunos (34 Manhã e 42 Tarde) sem 1 treino livre/semana gerando débito de fechamento de -2 pts/aluno.</td>
      </tr>
      <tr>
        <td class="font-bold">4. Alunos com Mais de 1 Atendimento Emergencial</td>
        <td class="text-center font-bold text-rose">152,0 pts</td>
        <td class="text-center font-bold">10,0%</td>
        <td>Falta de controle de agendamento preventivo gerando débito de -4 pts/aluno no fechamento.</td>
      </tr>
      <tr>
        <td class="font-bold">5. Carteiras Ativas com Avaliação/Ficha Vencida (&gt; 2 Meses)</td>
        <td class="text-center font-bold text-rose">120,0 pts</td>
        <td class="text-center font-bold">7,9%</td>
        <td>12 alunos vinculados há mais de 60 dias sem reavaliação (-10 pts cada: Rachel, Albert, Ruthi e Matheus).</td>
      </tr>
      <tr>
        <td class="font-bold">6. Fichas de Treino Não Montadas em ≤ 24h Pós-Avaliação</td>
        <td class="text-center font-bold text-rose">74,0 pts</td>
        <td class="text-center font-bold">4,9%</td>
        <td>Perda do bônus de agilidade (+2 pts) e incidência de débito de SLA (-2 pts por avaliação sem ficha).</td>
      </tr>
      <tr>
        <td class="font-bold">7. Relatórios Clínicos com Tempo Excessivo (&gt; 2 Horas)</td>
        <td class="text-center font-bold text-rose">24,0 pts</td>
        <td class="text-center font-bold">1,6%</td>
        <td>4 relatórios glosados a 0 pts por estouro do teto operacional de 120 minutos.</td>
      </tr>
      <tr>
        <td class="font-bold">8. Descontos e Ajustes de Fechamento de Salão</td>
        <td class="text-center font-bold text-rose">224,0 pts</td>
        <td class="text-center font-bold">14,7%</td>
        <td>Rateio de co-responsabilidade 50/50 das perdas coletivas do turno.</td>
      </tr>
    </tbody>
  </table>

  <!-- 3. DETALHAMENTO INDIVIDUAL -->
  <h2>3. Detalhamento Individual do Potencial Máximo por Profissional</h2>
  ${cardsHtml}

  <div class="footer">
    Documento emitido eletronicamente pela Central de Metas do Clube Fitness • Relatório Oficial de Potencial Máximo Realizável • Outubro / 2026.
  </div>

</div>
</body>
</html>
`;

fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('HTML generated successfully at:', htmlPath);

// Render PDF with Edge headless
const edgeExe = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
const cmd = `${edgeExe} --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`;

console.log('Rendering PDF with Edge...');
execSync(cmd);

const stat = fs.statSync(pdfPath);
console.log('PDF rendered successfully:', stat.size, 'bytes');

// Copy to Downloads, Workspace and Storage
fs.copyFileSync(pdfPath, downloadsPdfPath);
fs.copyFileSync(pdfPath, workspacePdfPath);
fs.copyFileSync(pdfPath, storagePdfPath);
console.log('Copied to Downloads:', downloadsPdfPath);
console.log('Copied to Workspace:', workspacePdfPath);
console.log('Copied to Storage:', storagePdfPath);

