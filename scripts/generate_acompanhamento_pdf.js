const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri = '';
env.split('\n').forEach(l => {
  if (l.trim().startsWith('MONGODB_URI=')) {
    uri = l.trim().replace('MONGODB_URI=', '').trim().replace(/["']/g, '');
  }
});

const mesParam = process.argv[2] || '2026-10';

const artifactDir = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b';
const htmlPath = path.join(artifactDir, `relatorio_acompanhamento_${mesParam}.html`);
const pdfPath = path.join(artifactDir, `relatorio_acompanhamento_${mesParam}.pdf`);
const downloadsPdfPath = `C:/Users/user/Downloads/relatorio_acompanhamento_${mesParam}.pdf`;
const workspacePdfPath = path.join(__dirname, '..', `relatorio_acompanhamento_${mesParam}.pdf`);
const storageReportsDir = path.join(__dirname, '..', 'storage', 'reports');

if (!fs.existsSync(storageReportsDir)) {
  fs.mkdirSync(storageReportsDir, { recursive: true });
}
const storagePdfPath = path.join(storageReportsDir, `relatorio_acompanhamento_${mesParam}.pdf`);

function formatBRL(v) {
  return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateBR(dateStr) {
  if (!dateStr || dateStr === '—') return '—';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function getMesNome(mStr) {
  const [ano, mes] = mStr.split('-');
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return `${meses[parseInt(mes, 10) - 1]} de ${ano}`;
}

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const plans = await db.collection('plans').find().toArray();
  const planMap = {};
  plans.forEach(p => planMap[p._id.toString()] = p.nome.trim());

  const professionals = await db.collection('professionals').find().toArray();
  const profMap = {};
  professionals.forEach(pr => profMap[pr._id.toString()] = pr.nome.trim());

  const clients = await db.collection('clients').find().toArray();
  const clientMap = {};
  clients.forEach(c => clientMap[c._id.toString()] = c);

  const payments = await db.collection('payments').find().toArray();
  const monthPayments = payments.filter(p => (p.vencimento || '').startsWith(mesParam));

  const allFinancials = await db.collection('financials').find().toArray();
  const monthExpenses = allFinancials.filter(f => {
    const v = (f.vencimento || '').split('T')[0];
    const comp = f.competencia || v.substring(0, 7);
    return comp === mesParam || v.startsWith(mesParam);
  });

  // Métricas de Receita
  let receitaRealizada = 0;
  let receitaAReceber = 0;
  const pagamentosRealizados = [];
  const pagamentosAReceber = [];
  const inadimplentesAtivos = [];

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  monthPayments.forEach(p => {
    const val = Number(p.valor || p.value || 0);
    const st = (p.status || '').toUpperCase();
    const isPaid = st === 'CONFIRMED' || st === 'RECEIVED' || st === 'RECEIVED_IN_CASH' || st === 'PAGO' || st === 'LIQUIDADO' || Boolean(p.dataPagamento || p.paymentDate);

    const c = clientMap[p.clientId ? p.clientId.toString() : ''];
    const nome = (c && c.dadosPessoais && c.dadosPessoais.nome) || p.clientName || 'Cliente';
    const telefone = (c && c.dadosPessoais && c.dadosPessoais.telefone) || '—';
    const plano = (c && c.dadosComerciais && planMap[c.dadosComerciais.planoId?.toString()]) || 'Plano';

    const item = {
      id: p._id.toString(),
      nome,
      telefone,
      plano,
      valor: val,
      vencimento: p.vencimento ? p.vencimento.split('T')[0] : '—',
      dataPagamento: p.dataPagamento ? p.dataPagamento.split('T')[0] : '—',
      forma: p.billingType || (c && c.dadosComerciais && c.dadosComerciais.formaPagamento) || 'Boleto/Cartão',
      status: p.status
    };

    if (isPaid) {
      receitaRealizada += val;
      pagamentosRealizados.push(item);
    } else {
      receitaAReceber += val;
      pagamentosAReceber.push(item);

      // Checa se está vencido em relação à data de hoje ou se venceu no mês
      if (item.vencimento !== '—' && item.vencimento < todayStr) {
        const diffMs = new Date(todayStr).getTime() - new Date(item.vencimento).getTime();
        const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        inadimplentesAtivos.push({ ...item, diasAtraso: diffDays });
      }
    }
  });

  // Ordenar inadimplentes pelo maior valor e maior atraso
  inadimplentesAtivos.sort((a, b) => b.valor - a.valor);

  // Métricas de Despesas
  let despesasPagas = 0;
  let despesasAPagar = 0;
  const despesasPagasList = [];
  const despesasAPagarList = [];

  monthExpenses.forEach(f => {
    const val = Number(f.valor || 0);
    const st = (f.status || '').toLowerCase();
    const isPaid = st === 'pago' || st === 'liquidado';

    const item = {
      descricao: f.descricao || f.identificador || 'Despesa',
      categoria: f.categoria || 'Geral',
      tipo: f.tipo || 'fixo',
      valor: val,
      vencimento: f.vencimento ? f.vencimento.split('T')[0] : '—',
      status: f.status
    };

    if (isPaid) {
      despesasPagas += val;
      despesasPagasList.push(item);
    } else {
      despesasAPagar += val;
      despesasAPagarList.push(item);
    }
  });

  // Despesas a pagar ordenadas por data de vencimento
  despesasAPagarList.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));

  // Previsão de Entradas Restantes ordenadas por data
  pagamentosAReceber.sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''));

  // Totais e Projeções
  const receitaTotalEsperada = receitaRealizada + receitaAReceber;
  const despesasTotaisEsperadas = despesasPagas + despesasAPagar;
  const pctRealizado = receitaTotalEsperada > 0 ? ((receitaRealizada / receitaTotalEsperada) * 100).toFixed(1) : '100.0';
  const saldoLiquidoAtual = receitaRealizada - despesasPagas;
  const saldoLiquidoProjetado = receitaTotalEsperada - despesasTotaisEsperadas;

  // Agrupamento de Entradas Restantes por Data
  const cronogramaEntradas = {};
  pagamentosAReceber.forEach(p => {
    const d = p.vencimento;
    if (!cronogramaEntradas[d]) cronogramaEntradas[d] = { data: d, total: 0, count: 0 };
    cronogramaEntradas[d].total += p.valor;
    cronogramaEntradas[d].count += 1;
  });
  const cronogramaEntradasList = Object.values(cronogramaEntradas).sort((a, b) => a.data.localeCompare(b.data));

  const totalPages = 4;
  const dataEmissaoBR = new Date().toLocaleString('pt-BR');

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Acompanhamento - ${getMesNome(mesParam)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #ffffff;
      color: #0f172a;
      margin: 0;
      padding: 0;
      font-size: 8.5pt;
      line-height: 1.35;
    }
    .page {
      width: 100%;
      min-height: 270mm;
      max-height: 275mm;
      page-break-after: always;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .page:last-child {
      page-break-after: avoid;
    }
    .page-header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand-title {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-subtitle {
      font-size: 9.5pt;
      font-weight: 600;
      color: #0284c7;
    }
    .meta-box {
      text-align: right;
      font-size: 7.5pt;
      color: #64748b;
    }
    .meta-box strong { color: #0f172a; }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      border-left: 4px solid #0284c7;
    }
    .kpi-card.success { border-left-color: #10b981; }
    .kpi-card.warning { border-left-color: #f59e0b; }
    .kpi-card.danger { border-left-color: #ef4444; }
    .kpi-label {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 13pt;
      font-weight: 800;
      color: #0f172a;
    }
    .kpi-sub {
      font-size: 7pt;
      color: #64748b;
      margin-top: 3px;
    }

    .progress-bar-container {
      background: #e2e8f0;
      border-radius: 999px;
      height: 14px;
      overflow: hidden;
      margin: 8px 0 14px 0;
      position: relative;
    }
    .progress-bar-fill {
      background: linear-gradient(90deg, #0284c7, #10b981);
      height: 100%;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      color: #ffffff;
      font-size: 7pt;
      font-weight: 800;
    }

    .section-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
      margin: 12px 0 6px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 12px;
      background: #0284c7;
      border-radius: 2px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 7.8pt;
    }
    th {
      background-color: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1.5px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 6.8pt;
      letter-spacing: 0.3px;
    }
    td {
      padding: 5.5px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    tr:nth-child(even) td {
      background-color: #fafbfc;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 6.5pt;
      font-weight: 700;
      text-transform: uppercase;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #e0f2fe; color: #075985; }

    .page-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 10px;
      font-size: 7pt;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .alert-box {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 10px 14px;
      border-radius: 6px;
      margin-top: 10px;
      font-size: 8pt;
      color: #92400e;
    }
    .alert-box strong { color: #78350f; }
  </style>
</head>
<body>

  <!-- ==================== PÁGINA 1: TERMÔMETRO & INDICADORES DE RITMO ==================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div>
          <div class="brand-title">CLUBE FITNESS • SAÚDE & REABILITAÇÃO</div>
          <div class="brand-subtitle">Relatório Executivo de Acompanhamento Intermediário</div>
        </div>
        <div class="meta-box">
          <div>Competência: <strong>${getMesNome(mesParam)}</strong></div>
          <div>Emissão em Tempo Real: <strong>${dataEmissaoBR}</strong></div>
          <div>Status: <span class="badge badge-info">Em Andamento</span></div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card success">
          <div class="kpi-label">Receita Já Realizada</div>
          <div class="kpi-value">${formatBRL(receitaRealizada)}</div>
          <div class="kpi-sub">${pagamentosRealizados.length} mensalidades liquidadas</div>
        </div>
        <div class="kpi-card warning">
          <div class="kpi-label">A Receber Restante</div>
          <div class="kpi-value">${formatBRL(receitaAReceber)}</div>
          <div class="kpi-sub">${pagamentosAReceber.length} mensalidades pendentes</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Previsão Faturamento Total</div>
          <div class="kpi-value">${formatBRL(receitaTotalEsperada)}</div>
          <div class="kpi-sub">Meta 100% da base ativa</div>
        </div>
        <div class="kpi-card ${saldoLiquidoProjetado >= 0 ? 'success' : 'danger'}">
          <div class="kpi-label">Sobra de Caixa Projetada</div>
          <div class="kpi-value">${formatBRL(saldoLiquidoProjetado)}</div>
          <div class="kpi-sub">Após liquidar 100% das despesas</div>
        </div>
      </div>

      <div style="margin-top: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 8pt; font-weight: 700;">
          <span>Velocidade de Arrecadação: ${pctRealizado}% Concluído</span>
          <span>Faltam ${formatBRL(receitaAReceber)} para atingir a meta total</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${Math.min(100, Number(pctRealizado))}%;">
            ${pctRealizado}%
          </div>
        </div>
      </div>

      <div class="section-title">Quadro Sintético de Entradas vs Saídas</div>
      <table>
        <thead>
          <tr>
            <th>Fluxo Financeiro</th>
            <th style="text-align: right;">Realizado até Hoje</th>
            <th style="text-align: right;">A Realizar (Restante)</th>
            <th style="text-align: right;">Total Previsto no Mês</th>
            <th style="text-align: center;">% Executado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>(+) Entradas de Mensalidades</strong></td>
            <td style="text-align: right; color: #10b981; font-weight: 700;">${formatBRL(receitaRealizada)}</td>
            <td style="text-align: right; color: #f59e0b; font-weight: 700;">${formatBRL(receitaAReceber)}</td>
            <td style="text-align: right; font-weight: 800;">${formatBRL(receitaTotalEsperada)}</td>
            <td style="text-align: center;"><span class="badge badge-success">${pctRealizado}%</span></td>
          </tr>
          <tr>
            <td><strong>(-) Despesas e Custos Operacionais</strong></td>
            <td style="text-align: right; color: #ef4444; font-weight: 700;">${formatBRL(despesasPagas)}</td>
            <td style="text-align: right; color: #64748b; font-weight: 700;">${formatBRL(despesasAPagar)}</td>
            <td style="text-align: right; font-weight: 800;">${formatBRL(despesasTotaisEsperadas)}</td>
            <td style="text-align: center;"><span class="badge badge-info">${despesasTotaisEsperadas > 0 ? ((despesasPagas / despesasTotaisEsperadas) * 100).toFixed(1) : '100'}%</span></td>
          </tr>
          <tr style="background-color: #f8fafc; font-weight: 800; border-top: 2px solid #cbd5e1;">
            <td><strong>(=) Saldo Líquido Operacional</strong></td>
            <td style="text-align: right; color: ${saldoLiquidoAtual >= 0 ? '#10b981' : '#ef4444'}; font-size: 9pt;">${formatBRL(saldoLiquidoAtual)}</td>
            <td style="text-align: right; color: #0284c7; font-size: 9pt;">${formatBRL(receitaAReceber - despesasAPagar)}</td>
            <td style="text-align: right; color: ${saldoLiquidoProjetado >= 0 ? '#10b981' : '#ef4444'}; font-size: 9.5pt;">${formatBRL(saldoLiquidoProjetado)}</td>
            <td style="text-align: center;"><span class="badge ${saldoLiquidoProjetado >= 0 ? 'badge-success' : 'badge-danger'}">Superávit</span></td>
          </tr>
        </tbody>
      </table>

      <div class="alert-box">
        <strong>Diretriz Estratégica de Meio de Mês:</strong> Este relatório dinâmico reflete a posição viva das contas. Alunos com cobranças vencidas devem ser contatados imediatamente pela recepção para garantir o cumprimento da meta de faturamento de <strong>${formatBRL(receitaTotalEsperada)}</strong>.
      </div>
    </div>

    <div class="page-footer">
      <div>Clube Fitness • Gestão Financeira Inteligente</div>
      <div>Página 1 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 2: RADAR DE COBRANÇA IMEDIATA (INADIMPLÊNCIA ATIVA) ==================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div>
          <div class="brand-title">CLUBE FITNESS • SAÚDE & REABILITAÇÃO</div>
          <div class="brand-subtitle">Radar de Cobrança Imediata — Inadimplência do Mês Corrente</div>
        </div>
        <div class="meta-box">
          <div>Emissão: <strong>${dataEmissaoBR}</strong></div>
          <div>Total de Pendências: <strong>${inadimplentesAtivos.length} alunos</strong></div>
        </div>
      </div>

      <div class="section-title">Alunos com Vencimento Decorrido no Mês (Ação Prioritária de Cobrança)</div>
      <table>
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Telefone / Contato</th>
            <th>Plano / Modalidade</th>
            <th style="text-align: center;">Vencimento</th>
            <th style="text-align: center;">Atraso</th>
            <th>Forma</th>
            <th style="text-align: right;">Valor Devido</th>
            <th style="text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${inadimplentesAtivos.length === 0 ? `
            <tr>
              <td colspan="8" style="text-align: center; padding: 20px; color: #10b981; font-weight: 700;">
                Excelente! Não há alunos inadimplentes com parcelas vencidas até a data de hoje neste mês.
              </td>
            </tr>
          ` : inadimplentesAtivos.slice(0, 18).map(item => `
            <tr>
              <td><strong>${item.nome}</strong></td>
              <td>${item.telefone}</td>
              <td>${item.plano}</td>
              <td style="text-align: center;">${formatDateBR(item.vencimento)}</td>
              <td style="text-align: center;"><span class="badge badge-danger">${item.diasAtraso} dia(s)</span></td>
              <td>${item.forma}</td>
              <td style="text-align: right; font-weight: 800; color: #ef4444;">${formatBRL(item.valor)}</td>
              <td style="text-align: center;"><span class="badge badge-danger">Vencido</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${inadimplentesAtivos.length > 18 ? `
        <div style="font-size: 7.5pt; color: #64748b; margin-top: 6px; text-align: right;">
          * Exibindo os 18 principais débitos por valor. Total de pendências ativas: ${inadimplentesAtivos.length}.
        </div>
      ` : ''}

      <div style="margin-top: 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px;">
        <div style="font-weight: 800; color: #991b1b; font-size: 8.5pt;">Total em Atraso Ativo no Mês: ${formatBRL(inadimplentesAtivos.reduce((acc, cur) => acc + cur.valor, 0))}</div>
        <div style="font-size: 7.5pt; color: #7f1d1d; margin-top: 4px;">
          Recomendação: Realizar disparo de aviso via WhatsApp ou link de 2ª via Asaas para estes clientes antes do próximo ciclo de renovação.
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Clube Fitness • Módulo de Cobrança Preventiva</div>
      <div>Página 2 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 3: CRONOGRAMA DE ENTRADAS RESTANTES ==================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div>
          <div class="brand-title">CLUBE FITNESS • SAÚDE & REABILITAÇÃO</div>
          <div class="brand-subtitle">Previsão de Entradas Restantes até o Fim do Mês</div>
        </div>
        <div class="meta-box">
          <div>Mês: <strong>${getMesNome(mesParam)}</strong></div>
          <div>Previsão Restante: <strong>${formatBRL(receitaAReceber)}</strong></div>
        </div>
      </div>

      <div class="section-title">Distribuição Diária de Recebimentos Futuros</div>
      <table>
        <thead>
          <tr>
            <th>Data de Vencimento Prevista</th>
            <th style="text-align: center;">Qtd. Mensalidades</th>
            <th style="text-align: right;">Valor Previsto no Dia</th>
            <th style="text-align: right;">Acumulado Projetado</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
            let acumulado = receitaRealizada;
            return cronogramaEntradasList.slice(0, 16).map(c => {
              acumulado += c.total;
              return `
                <tr>
                  <td><strong>${formatDateBR(c.data)}</strong></td>
                  <td style="text-align: center;"><span class="badge badge-info">${c.count} cobrança(s)</span></td>
                  <td style="text-align: right; font-weight: 700; color: #0284c7;">${formatBRL(c.total)}</td>
                  <td style="text-align: right; font-weight: 800; color: #10b981;">${formatBRL(acumulado)}</td>
                </tr>
              `;
            }).join('');
          })()}
        </tbody>
      </table>

      <div class="section-title" style="margin-top: 14px;">Próximas Mensalidades Agendadas (Amostra Nominal)</div>
      <table>
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Plano</th>
            <th style="text-align: center;">Vencimento</th>
            <th>Forma de Pagamento</th>
            <th style="text-align: right;">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${pagamentosAReceber.slice(0, 10).map(p => `
            <tr>
              <td><strong>${p.nome}</strong></td>
              <td>${p.plano}</td>
              <td style="text-align: center;">${formatDateBR(p.vencimento)}</td>
              <td>${p.forma}</td>
              <td style="text-align: right; font-weight: 700;">${formatBRL(p.valor)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="page-footer">
      <div>Clube Fitness • Previsão Orçamentária e Fluxo de Caixa</div>
      <div>Página 3 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 4: CONTAS A PAGAR & COMPROMISSOS DA QUINZENA ==================== -->
  <div class="page">
    <div>
      <div class="page-header">
        <div>
          <div class="brand-title">CLUBE FITNESS • SAÚDE & REABILITAÇÃO</div>
          <div class="brand-subtitle">Contas a Pagar & Despesas Agendadas da Competência</div>
        </div>
        <div class="meta-box">
          <div>Já Liquidado: <strong>${formatBRL(despesasPagas)}</strong></div>
          <div>A Liquidar: <strong>${formatBRL(despesasAPagar)}</strong></div>
        </div>
      </div>

      <div class="section-title">Despesas Pendentes de Liquidação até o Fechamento</div>
      <table>
        <thead>
          <tr>
            <th>Descrição do Compromisso</th>
            <th>Categoria</th>
            <th>Tipo</th>
            <th style="text-align: center;">Vencimento</th>
            <th style="text-align: right;">Valor Previsto</th>
            <th style="text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${despesasAPagarList.length === 0 ? `
            <tr>
              <td colspan="6" style="text-align: center; padding: 16px; color: #10b981; font-weight: 700;">
                Nenhuma despesa pendente em aberto para este mês. Todas as contas foram liquidadas!
              </td>
            </tr>
          ` : despesasAPagarList.slice(0, 14).map(d => `
            <tr>
              <td><strong>${d.descricao}</strong></td>
              <td>${d.categoria}</td>
              <td><span class="badge ${d.tipo === 'fixo' ? 'badge-info' : 'badge-warning'}">${d.tipo}</span></td>
              <td style="text-align: center;">${formatDateBR(d.vencimento)}</td>
              <td style="text-align: right; font-weight: 800; color: #ef4444;">${formatBRL(d.valor)}</td>
              <td style="text-align: center;"><span class="badge badge-warning">A Pagar</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="section-title" style="margin-top: 14px;">Resumo Consolidado de Custos da Competência</div>
      <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="kpi-card danger">
          <div class="kpi-label">Despesas Já Pagas</div>
          <div class="kpi-value">${formatBRL(despesasPagas)}</div>
          <div class="kpi-sub">${despesasPagasList.length} lançamentos quitados</div>
        </div>
        <div class="kpi-card warning">
          <div class="kpi-label">Despesas a Pagar</div>
          <div class="kpi-value">${formatBRL(despesasAPagar)}</div>
          <div class="kpi-sub">${despesasAPagarList.length} compromissos pendentes</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Custo Total Projetado</div>
          <div class="kpi-value">${formatBRL(despesasTotaisEsperadas)}</div>
          <div class="kpi-sub">Total do orçamento do mês</div>
        </div>
      </div>

      <div class="alert-box" style="margin-top: 10px; border-left-color: #0284c7; background: #f0f9ff; color: #0369a1;">
        <strong>Conclusão do Acompanhamento:</strong> A capacidade financeira da clínica projeta uma cobertura de <strong>${(receitaTotalEsperada / (despesasTotaisEsperadas || 1)).toFixed(2)}x</strong> os custos operacionais totais, garantindo folga de tesouraria para investimentos e expansão contínua.
      </div>
    </div>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 4 de ${totalPages}</div>
    </div>
  </div>

</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('HTML de Acompanhamento gerado com sucesso em:', htmlPath);

  // Renderização via Edge Headless
  console.log('Renderizando PDF com Edge Headless...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    const stat = fs.statSync(pdfPath);
    console.log(`PDF de Acompanhamento compilado com sucesso: ${stat.size} bytes`);

    fs.copyFileSync(pdfPath, downloadsPdfPath);
    console.log('Copiado para Downloads:', downloadsPdfPath);

    fs.copyFileSync(pdfPath, workspacePdfPath);
    console.log('Copiado para Workspace:', workspacePdfPath);

    fs.copyFileSync(pdfPath, storagePdfPath);
    console.log('Copiado para Storage:', storagePdfPath);

  } catch (err) {
    console.error('Erro na renderização do PDF de Acompanhamento:', err);
    process.exit(1);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

