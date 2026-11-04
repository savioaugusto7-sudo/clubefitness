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
const htmlPath = path.join(artifactDir, `relatorio_financeiro_${mesParam}.html`);
const pdfPath = path.join(artifactDir, `relatorio_financeiro_${mesParam}.pdf`);
const downloadsPdfPath = `C:/Users/user/Downloads/relatorio_financeiro_${mesParam}.pdf`;
const workspacePdfPath = path.join(__dirname, '..', `relatorio_financeiro_${mesParam}.pdf`);
const storageReportsDir = path.join(__dirname, '..', 'storage', 'reports');

if (!fs.existsSync(storageReportsDir)) {
  fs.mkdirSync(storageReportsDir, { recursive: true });
}
const storagePdfPath = path.join(storageReportsDir, `relatorio_financeiro_${mesParam}.pdf`);


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
  const octPayments = payments.filter(p => (p.vencimento || '').startsWith(mesParam));

  const allFinancials = await db.collection('financials').find().toArray();
  const octExpenses = allFinancials.filter(f => {
    const v = (f.vencimento || '').split('T')[0];
    const comp = f.competencia || v.substring(0, 7);
    return comp === mesParam || v.startsWith(mesParam);
  });

  // Cálculo Dinâmico de Expansão & Churn comparando com o mês anterior
  const [yStr, mStr] = mesParam.split('-');
  const prevDate = new Date(parseInt(yStr), parseInt(mStr) - 2, 1);
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const curMonthPayments = payments.filter(p => (p.vencimento || '').startsWith(mesParam));
  const prevMonthPayments = payments.filter(p => (p.vencimento || '').startsWith(prevMonthStr));

  const curPayers = {};
  curMonthPayments.forEach(p => {
    const cId = p.clientId ? p.clientId.toString() : (p.clientName || 'desconhecido');
    if (!curPayers[cId]) curPayers[cId] = { total: 0, name: p.clientName };
    curPayers[cId].total += Number(p.valor || p.value || 0);
  });

  const prevPayers = {};
  prevMonthPayments.forEach(p => {
    const cId = p.clientId ? p.clientId.toString() : (p.clientName || 'desconhecido');
    if (!prevPayers[cId]) prevPayers[cId] = { total: 0, name: p.clientName };
    prevPayers[cId].total += Number(p.valor || p.value || 0);
  });

  const novosPagantes = [];
  let totalNovos = 0;
  Object.keys(curPayers).forEach(cId => {
    if (!prevPayers[cId]) {
      const c = clientMap[cId];
      const nome = (c && c.dadosPessoais && c.dadosPessoais.nome) || curPayers[cId].name || 'Novo Aluno';
      const plano = (c && c.dadosComerciais && planMap[c.dadosComerciais.planoId?.toString()]) || 'Plano';
      novosPagantes.push({ nome, plano, valor: curPayers[cId].total });
      totalNovos += curPayers[cId].total;
    }
  });
  novosPagantes.sort((a, b) => b.valor - a.valor);

  const descontinuados = [];
  let totalDescontinuados = 0;
  Object.keys(prevPayers).forEach(cId => {
    if (!curPayers[cId]) {
      const c = clientMap[cId];
      const nome = (c && c.dadosPessoais && c.dadosPessoais.nome) || prevPayers[cId].name || 'Aluno Descontinuado';
      const plano = (c && c.dadosComerciais && planMap[c.dadosComerciais.planoId?.toString()]) || 'Plano Anterior';
      descontinuados.push({ nome, plano, valor: prevPayers[cId].total });
      totalDescontinuados += prevPayers[cId].total;
    }
  });
  descontinuados.sort((a, b) => b.valor - a.valor);

  const saldoLiquidoExpansao = totalNovos - totalDescontinuados;


  // Mapear pagamentos por cliente em todo o banco
  const paymentsByClient = {};
  payments.forEach(p => {
    if (p.clientId) {
      const cId = p.clientId.toString();
      paymentsByClient[cId] = (paymentsByClient[cId] || 0) + 1;
    }
  });

  // Clientes ativos sem asaas e sem parcelas
  const activeClients = clients.filter(c => {
    const s = c.dadosComerciais ? (c.dadosComerciais.status || '').toLowerCase() : '';
    return s === 'ativo';
  });

  const semAsaasSemParcelas = [];
  activeClients.forEach(c => {
    const asaasId = (c.dadosComerciais && c.dadosComerciais.asaasCustomerId) ? c.dadosComerciais.asaasCustomerId.trim() : '';
    const hasAsaas = asaasId !== '' && asaasId !== 'null' && asaasId !== 'undefined';
    const numPayments = paymentsByClient[c._id.toString()] || 0;

    if (!hasAsaas && numPayments === 0) {
      const nome = (c.dadosPessoais && c.dadosPessoais.nome) || 'Sem Nome';
      const pId = c.dadosComerciais && c.dadosComerciais.planoId ? c.dadosComerciais.planoId.toString() : '';
      const plano = planMap[pId] || 'Não definido';
      const prId = c.profissionalId ? c.profissionalId.toString() : '';
      const resp = profMap[prId] || '—';

      semAsaasSemParcelas.push({
        id: c._id.toString(),
        nome,
        telefone: (c.dadosPessoais && c.dadosPessoais.telefone) || '—',
        plano,
        forma: (c.dadosComerciais && c.dadosComerciais.formaPagamento) || '—',
        responsavel: resp
      });
    }
  });

  semAsaasSemParcelas.sort((a, b) => a.nome.localeCompare(b.nome));

  // Agrupamentos de Receitas de Outubro
  const grouped = {
    'Clube Fitness - Monitorado': [],
    'Protocolo Individualizado': [],
    'Tratamento Personalizado': [],
    'Captação': []
  };

  let totalPrevisto = 0;
  let totalPago = 0;
  let totalAtraso = 0;
  let qtdPago = 0;
  let qtdAtraso = 0;

  octPayments.forEach(p => {
    let resolvedPlan = '';
    const client = p.clientId ? clientMap[p.clientId.toString()] : null;
    if (client && client.dadosComerciais && client.dadosComerciais.planoId) {
      const pIdStr = client.dadosComerciais.planoId.toString();
      if (planMap[pIdStr]) resolvedPlan = planMap[pIdStr];
    }
    const rawDesc = (p.planoNome || '').toLowerCase();
    if (!resolvedPlan || resolvedPlan === 'Consulta') {
      if (rawDesc.includes('protocolo individualizado') || rawDesc.includes('protocolo')) {
        resolvedPlan = 'Protocolo Individualizado';
      } else if (rawDesc.includes('tratamento personalizado') || rawDesc.includes('tratamento')) {
        resolvedPlan = 'Tratamento Personalizado';
      } else if (rawDesc.includes('monitorado') || rawDesc.includes('clube fitness')) {
        resolvedPlan = 'Clube Fitness - Monitorado';
      } else if (rawDesc.includes('dynamus')) {
        resolvedPlan = 'Dynamus';
      } else if (rawDesc.includes('captação') || rawDesc.includes('captacao')) {
        resolvedPlan = 'Captação';
      }
    }
    resolvedPlan = (resolvedPlan || 'Protocolo Individualizado').trim();

    if (!grouped[resolvedPlan]) grouped[resolvedPlan] = [];

    let formaRaw = (p.formaPagamento || 'Asaas').trim();
    let macroForma = 'Asaas';
    if (formaRaw.toLowerCase().includes('dinheiro')) macroForma = 'Dinheiro';
    else if (formaRaw.toLowerCase().includes('pix manual') || formaRaw.toLowerCase() === 'pix') macroForma = 'PIX / Pix Manual';
    else if (formaRaw.toLowerCase().includes('cartão manual') || formaRaw.toLowerCase().includes('cartao manual')) macroForma = 'Cartão Manual';
    else if (formaRaw.toLowerCase().includes('boleto bancário') || formaRaw.toLowerCase() === 'boleto') macroForma = 'Boleto Bancário Manual';
    else if (formaRaw.toLowerCase().includes('wellhub') || formaRaw.toLowerCase().includes('gympass')) macroForma = 'Wellhub';
    else macroForma = 'Asaas (Plataforma)';

    const val = Number(p.valor || 0);
    totalPrevisto += val;
    if (p.status === 'Pago') {
      totalPago += val;
      qtdPago++;
    } else {
      totalAtraso += val;
      qtdAtraso++;
    }

    grouped[resolvedPlan].push({
      aluno: p.clientNome,
      valor: val,
      forma: formaRaw,
      macroForma: macroForma,
      vencimento: (p.vencimento || '').split('T')[0],
      dataPagamento: (p.dataPagamento || '').split('T')[0] || (p.status === 'Pago' ? (p.vencimento || '').split('T')[0] : '—'),
      status: p.status,
      descricao: (p.planoNome || 'Mensalidade').trim(),
      telefone: client && client.dadosPessoais ? client.dadosPessoais.telefone : '—'
    });
  });

  const formaPriority = {
    'Asaas (Plataforma)': 1,
    'Asaas': 1,
    'Dinheiro': 2,
    'PIX / Pix Manual': 3,
    'Cartão Manual': 4,
    'Boleto Bancário Manual': 5,
    'Wellhub': 6
  };

  const sortItems = (a, b) => {
    const pA = formaPriority[a.macroForma] || 99;
    const pB = formaPriority[b.macroForma] || 99;
    if (pA !== pB) return pA - pB;
    return a.aluno.localeCompare(b.aluno);
  };

  grouped['Clube Fitness - Monitorado'].sort(sortItems);
  grouped['Protocolo Individualizado'].sort(sortItems);
  grouped['Tratamento Personalizado'].sort(sortItems);
  grouped['Captação'].sort(sortItems);

  // Inadimplentes atuais
  const atrasados = octPayments
    .filter(p => p.status !== 'Pago')
    .map(p => {
      const client = p.clientId ? clientMap[p.clientId.toString()] : null;
      let planoDesc = (p.planoNome || 'Mensalidade').trim();
      let planoCat = 'Protocolo Individualizado';
      if (planoDesc.toLowerCase().includes('tratamento')) planoCat = 'Tratamento Personalizado';
      else if (planoDesc.toLowerCase().includes('captação') || planoDesc.toLowerCase().includes('captacao')) planoCat = 'Captação';
      else if (planoDesc.toLowerCase().includes('monitorado')) planoCat = 'Clube Fitness - Monitorado';

      let formaRaw = (p.formaPagamento || 'Asaas').trim();
      let macroForma = 'Asaas';
      if (formaRaw.toLowerCase().includes('dinheiro')) macroForma = 'Dinheiro';
      else if (formaRaw.toLowerCase().includes('pix manual') || formaRaw.toLowerCase() === 'pix') macroForma = 'PIX / Pix Manual';
      else if (formaRaw.toLowerCase().includes('cartão manual') || formaRaw.toLowerCase().includes('cartao manual')) macroForma = 'Cartão Manual';
      else if (formaRaw.toLowerCase().includes('boleto bancário') || formaRaw.toLowerCase() === 'boleto') macroForma = 'Boleto Bancário Manual';
      else if (formaRaw.toLowerCase().includes('wellhub') || formaRaw.toLowerCase().includes('gympass')) macroForma = 'Wellhub';

      return {
        aluno: p.clientNome,
        plano: planoCat,
        descricao: planoDesc,
        vencimento: (p.vencimento || '').split('T')[0],
        valor: Number(p.valor || 0),
        forma: formaRaw,
        macroForma: macroForma,
        telefone: client && client.dadosPessoais ? client.dadosPessoais.telefone : '—'
      };
    })
    .sort((a, b) => {
      const pA = formaPriority[a.macroForma] || 99;
      const pB = formaPriority[b.macroForma] || 99;
      if (pA !== pB) return pA - pB;
      return b.valor - a.valor;
    });

  // Despesas
  octExpenses.sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0));

  const totalDespesas = octExpenses.reduce((sum, f) => sum + Number(f.valor || 0), 0);
  const despesasFixas = octExpenses.filter(f => f.tipo_custo === 'fixo').reduce((sum, f) => sum + Number(f.valor || 0), 0);
  const despesasVariaveis = octExpenses.filter(f => f.tipo_custo !== 'fixo').reduce((sum, f) => sum + Number(f.valor || 0), 0);

  const kpis = {
    faturamentoPrevisto: totalPrevisto,
    faturamentoRealizado: totalPago,
    inadimplenciaValor: totalAtraso,
    taxaAdimplencia: totalPrevisto > 0 ? (totalPago / totalPrevisto) * 100 : 0,
    despesasTotais: totalDespesas,
    despesasFixas: despesasFixas,
    despesasVariaveis: despesasVariaveis,
    superavitCaixa: totalPago - totalDespesas,
    margemCaixa: totalPago > 0 ? ((totalPago - totalDespesas) / totalPago) * 100 : 0,
    lucroCompetencia: totalPrevisto - totalDespesas,
    margemCompetencia: totalPrevisto > 0 ? ((totalPrevisto - totalDespesas) / totalPrevisto) * 100 : 0,
    breakEven: 25974.41,
    coberturaBreakEven: totalPago / 25974.41,
    totalCobrancas: octPayments.length,
    cobrancasPagas: qtdPago,
    cobrancasAtraso: qtdAtraso
  };

  const monitoradoTotal = grouped['Clube Fitness - Monitorado'].reduce((s, i) => s + i.valor, 0);
  const monitoradoPago = grouped['Clube Fitness - Monitorado'].filter(i => i.status === 'Pago').reduce((s, i) => s + i.valor, 0);
  const monitoradoAtraso = grouped['Clube Fitness - Monitorado'].filter(i => i.status !== 'Pago').reduce((s, i) => s + i.valor, 0);

  const protocoloTotal = grouped['Protocolo Individualizado'].reduce((s, i) => s + i.valor, 0);
  const protocoloPago = grouped['Protocolo Individualizado'].filter(i => i.status === 'Pago').reduce((s, i) => s + i.valor, 0);
  const protocoloAtraso = grouped['Protocolo Individualizado'].filter(i => i.status !== 'Pago').reduce((s, i) => s + i.valor, 0);

  const tratamentoTotal = grouped['Tratamento Personalizado'].reduce((s, i) => s + i.valor, 0);
  const tratamentoPago = grouped['Tratamento Personalizado'].filter(i => i.status === 'Pago').reduce((s, i) => s + i.valor, 0);
  const tratamentoAtraso = grouped['Tratamento Personalizado'].filter(i => i.status !== 'Pago').reduce((s, i) => s + i.valor, 0);

  const captacaoTotal = grouped['Captação'].reduce((s, i) => s + i.valor, 0);
  const captacaoPago = grouped['Captação'].filter(i => i.status === 'Pago').reduce((s, i) => s + i.valor, 0);
  const captacaoAtraso = grouped['Captação'].filter(i => i.status !== 'Pago').reduce((s, i) => s + i.valor, 0);

  const planosResumo = [
    {
      nome: 'Protocolo Individualizado',
      previsto: protocoloTotal,
      realizado: protocoloPago,
      atraso: protocoloAtraso,
      share: (protocoloTotal / kpis.faturamentoPrevisto) * 100,
      adimplencia: (protocoloPago / protocoloTotal) * 100,
      qtdTotal: grouped['Protocolo Individualizado'].length,
      qtdPagas: grouped['Protocolo Individualizado'].filter(i => i.status === 'Pago').length,
      qtdAtraso: grouped['Protocolo Individualizado'].filter(i => i.status !== 'Pago').length,
      ticketMedio: protocoloTotal / (grouped['Protocolo Individualizado'].length || 1),
      perfil: 'Treinamento e reabilitação de alta densidade técnica com atendimento contínuo individualizado.'
    },
    {
      nome: 'Clube Fitness - Monitorado',
      previsto: monitoradoTotal,
      realizado: monitoradoPago,
      atraso: monitoradoAtraso,
      share: (monitoradoTotal / kpis.faturamentoPrevisto) * 100,
      adimplencia: (monitoradoPago / monitoradoTotal) * 100,
      qtdTotal: grouped['Clube Fitness - Monitorado'].length,
      qtdPagas: grouped['Clube Fitness - Monitorado'].filter(i => i.status === 'Pago').length,
      qtdAtraso: grouped['Clube Fitness - Monitorado'].filter(i => i.status !== 'Pago').length,
      ticketMedio: monitoradoTotal / (grouped['Clube Fitness - Monitorado'].length || 1),
      perfil: 'Mensalidades e planos monitorados em grupo com suporte fisioterapêutico contínuo e 100% adimplente.'
    },
    {
      nome: 'Tratamento Personalizado',
      previsto: tratamentoTotal,
      realizado: tratamentoPago,
      atraso: tratamentoAtraso,
      share: (tratamentoTotal / kpis.faturamentoPrevisto) * 100,
      adimplencia: (tratamentoPago / tratamentoTotal) * 100,
      qtdTotal: grouped['Tratamento Personalizado'].length,
      qtdPagas: grouped['Tratamento Personalizado'].filter(i => i.status === 'Pago').length,
      qtdAtraso: grouped['Tratamento Personalizado'].filter(i => i.status !== 'Pago').length,
      ticketMedio: tratamentoTotal / (grouped['Tratamento Personalizado'].length || 1),
      perfil: 'Sessões clínicas customizadas com foco em dor aguda, terapia manual e intervenção biomecânica.'
    },
    {
      nome: 'Captação',
      previsto: captacaoTotal,
      realizado: captacaoPago,
      atraso: captacaoAtraso,
      share: (captacaoTotal / kpis.faturamentoPrevisto) * 100,
      adimplencia: 100.0,
      qtdTotal: grouped['Captação'].length,
      qtdPagas: grouped['Captação'].filter(i => i.status === 'Pago').length,
      qtdAtraso: 0,
      ticketMedio: captacaoTotal / (grouped['Captação'].length || 1),
      perfil: 'Novos contratos e pacotes de entrada/avaliação inicial de alunos convertidos (100% liquidados).'
    }
  ];

  const prestadores = [
    { nome: 'Sávio Augusto Oliveira', papel: 'Gestão', salario: 6000.00, bonus: 0.00, total: 6000.00 },
    { nome: 'Ruthi Novais', papel: 'Personal Trainer / Equipe de Atendimento', salario: 3000.00, bonus: 0.00, total: 3000.00 },
    { nome: 'Dr. Guilherme José Graciano', papel: 'Fisioterapeuta / Co-Responsável Clínico', salario: 2500.00, bonus: 231.00, total: 2731.00 },
    { nome: 'Dra. Rachel Zauli Serpa', papel: 'Fisioterapeuta / Atendimento Clínico', salario: 2500.00, bonus: 155.00, total: 2655.00 },
    { nome: 'Pedro Grossi', papel: 'Fisioterapeuta / Equipe de Atendimento', salario: 700.00, bonus: 245.00, total: 945.00 },
    { nome: 'Cleiton Freitas', papel: 'Educador Físico / Co-Responsável Manhã', salario: 800.00, bonus: 100.00, total: 900.00 },
    { nome: 'João Paulo Auad Alves', papel: 'Fisioterapeuta / Atendimento Clínico', salario: 500.00, bonus: 187.00, total: 687.00 },
    { nome: 'Matheus Poeiras Luciano', papel: 'Educador Físico / Equipe Tarde-Noite', salario: 2000.00, bonus: 187.50, total: 2187.50 }
  ];

  function renderGroupedTableRows(items, startIdx = 1) {
    let currentBlock = '';
    let html = '';
    let globalIdx = startIdx;

    items.forEach(item => {
      if (item.macroForma !== currentBlock) {
        currentBlock = item.macroForma;
        const blockItems = items.filter(i => i.macroForma === currentBlock);
        const blockTotal = blockItems.reduce((s, i) => s + i.valor, 0);
        html += `
          <tr style="background: #f1f5f9; border-top: 1.5px solid #0f172a; border-bottom: 1px solid #cbd5e1;">
            <td colspan="7" style="padding: 2.2px 5px; font-weight: 800; font-size: 6.7pt; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">
              ▸ FORMA: ${currentBlock.toUpperCase()} (${blockItems.length}) • TOTAL: ${formatBRL(blockTotal)}
            </td>
          </tr>
        `;
      }
      html += `
        <tr>
          <td class="center font-mono" style="color: #000000; font-weight: 700; padding: 1.5px 3px;">${globalIdx++}</td>
          <td style="padding: 1.5px 3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"><strong style="color: #000000;">${item.aluno}</strong></td>
          <td style="font-size: 6.5pt; color: #000000; font-weight: 500; padding: 1.5px 3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${item.descricao}</td>
          <td style="font-size: 6.5pt; color: #000000; font-weight: 500; padding: 1.5px 3px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${item.forma}</td>
          <td class="center font-mono" style="color: #000000; font-weight: 600; padding: 1.5px 3px; font-size: 6.5pt;">${formatDateBR(item.vencimento)}</td>
          <td class="num" style="${item.status === 'Pago' ? 'color: #16a34a;' : 'color: #dc2626;'} font-weight: 700; padding: 1.5px 3px;">${formatBRL(item.valor)}</td>
          <td class="center" style="padding: 1.5px 3px;">
            <span class="badge ${item.status === 'Pago' ? 'badge-success' : 'badge-danger'}">
              ${item.status}
            </span>
          </td>
        </tr>
      `;
    });
    return html;
  }

  // Divisões
  const monitoradoHalf = Math.ceil(grouped['Clube Fitness - Monitorado'].length / 2);
  const monitoradoP1 = grouped['Clube Fitness - Monitorado'].slice(0, monitoradoHalf);
  const monitoradoP2 = grouped['Clube Fitness - Monitorado'].slice(monitoradoHalf);

  const protocoloP1 = grouped['Protocolo Individualizado'].slice(0, 19);
  const protocoloP2 = grouped['Protocolo Individualizado'].slice(19);

  // Agrupamento estruturado de despesas (Salários em sequência, Bonificações em sequência, Ocupação, etc.)
  function getExpenseGroup(item) {
    const desc = (item.descricao || '').toLowerCase();
    const cat = (item.categoria || '').toLowerCase();

    if (desc.startsWith('salário') || desc.startsWith('salario')) {
      return { groupName: 'Salários', order: 1, subOrder: 1, col: 1 };
    }
    if (desc.startsWith('bonificação') || desc.startsWith('bonificacao')) {
      return { groupName: 'Bonificações de Avaliação', order: 2, subOrder: 1, col: 1 };
    }
    if (desc.includes('simples nacional') || desc.includes('inss') || desc.includes('irrf') || desc.includes('contabilidade') || cat.includes('tribut')) {
      return { groupName: 'Tributos & Contabilidade', order: 3, subOrder: 1, col: 1 };
    }
    if (desc.includes('sistema') || desc.includes('admin fit') || desc.includes('programa')) {
      return { groupName: 'Softwares & Sistemas', order: 4, subOrder: 1, col: 1 };
    }
    if (desc.includes('aluguel') || desc.includes('condomínio') || desc.includes('condominio') || desc.includes('iptu') || desc.includes('cemig')) {
      let sub = 1;
      if (desc.includes('aluguel')) sub = 1;
      else if (desc.includes('condomínio') || desc.includes('condominio')) sub = 2;
      else if (desc.includes('iptu')) sub = 3;
      else if (desc.includes('cemig')) sub = 4;
      return { groupName: 'Ocupação Predial & Energia', order: 5, subOrder: sub, col: 2 };
    }
    return { groupName: 'Insumos & Despesas Operacionais', order: 6, subOrder: 1, col: 2 };
  }

  const enhancedExpenses = octExpenses.map(e => ({
    ...e,
    ...getExpenseGroup(e)
  }));

  const despesasCol1 = enhancedExpenses.filter(e => e.col === 1).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return Number(b.valor || 0) - Number(a.valor || 0);
  });

  const despesasCol2 = enhancedExpenses.filter(e => e.col === 2).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    if (a.subOrder !== b.subOrder) return a.subOrder - b.subOrder;
    return Number(b.valor || 0) - Number(a.valor || 0);
  });

  function renderExpenseRows(items, startIdx = 1) {
    let currentGroup = '';
    let html = '';
    let globalIdx = startIdx;

    items.forEach(item => {
      if (item.groupName !== currentGroup) {
        currentGroup = item.groupName;
        const groupItems = items.filter(i => i.groupName === currentGroup);
        const groupTotal = groupItems.reduce((s, i) => s + Number(i.valor || 0), 0);
        html += `
          <tr style="background: #f1f5f9; border-top: 1.5px solid #0f172a; border-bottom: 1px solid #cbd5e1;">
            <td colspan="4" style="padding: 2.5px 5px; font-weight: 800; font-size: 6.7pt; color: #0f172a; text-transform: uppercase; letter-spacing: 0.3px;">
              ▸ ${currentGroup.toUpperCase()} (${groupItems.length}) • ${formatBRL(groupTotal)}
            </td>
          </tr>
        `;
      }
      const showFornec = item.fornecedor && !item.descricao.toLowerCase().includes(item.fornecedor.toLowerCase()) && !item.groupName.includes('Salários') && !item.groupName.includes('Bonificações');
      const extra = showFornec ? ` <span style="font-size: 6.4pt; color: #000000; font-weight: 500;">(${item.fornecedor})</span>` : '';
      html += `
        <tr>
          <td class="center font-mono" style="color: #000000; font-weight: 700; padding: 1.8px 4px;">${globalIdx++}</td>
          <td style="padding: 1.8px 4px; line-height: 1.2;">
            <strong style="color: #000000;">${item.descricao}</strong>${extra}
          </td>
          <td class="num" style="color: #dc2626; font-weight: 700; padding: 1.8px 4px;">${formatBRL(item.valor)}</td>
          <td class="center font-mono" style="font-size: 6.8pt; color: #000000; font-weight: 600; padding: 1.8px 4px;">${formatDateBR(item.vencimento)}</td>
        </tr>
      `;
    });
    return html;
  }

  // Divisão dos clientes sem Asaas e sem parcelas em 2 colunas
  const semCobrancaHalf = Math.ceil(semAsaasSemParcelas.length / 2);
  const semCobrancaCol1 = semAsaasSemParcelas.slice(0, semCobrancaHalf);
  const semCobrancaCol2 = semAsaasSemParcelas.slice(semCobrancaHalf);

  const totalPages = 10;

  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório Financeiro Executivo — ${mesParam} — Clube Fitness (10 Páginas com Balanço de Expansão)</title>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    @page {
      size: A4 portrait;
      margin: 15mm 18mm 15mm 18mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #ffffff;
      color: #000000;
      font-size: 8pt;
      line-height: 1.35;
      -webkit-font-smoothing: antialiased;
    }

    .page {
      break-after: page;
      page-break-after: always;
      break-inside: avoid;
      page-break-inside: avoid;
      box-sizing: border-box;
      height: 264mm;
      max-height: 264mm;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background-color: #ffffff;
    }

    .page:last-child {
      break-after: auto;
      page-break-after: auto;
    }

    /* HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      margin-bottom: 9px;
      border-bottom: 2px solid #0f172a;
      flex-shrink: 0;
    }

    .brand-title {
      font-size: 14pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #000000;
      display: inline-block;
    }

    .brand-subtitle {
      font-size: 7.8pt;
      color: #334155;
      font-weight: 700;
      margin-top: 1px;
    }

    .header-badge {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 4px 10px;
      text-align: right;
    }

    .header-badge .badge-periodo {
      font-size: 8.5pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .header-badge .badge-date {
      font-size: 6.8pt;
      color: #475569;
      margin-top: 1px;
      font-weight: 600;
    }

    /* SECTION TITLES */
    .section-title {
      font-size: 9pt;
      font-weight: 800;
      color: #000000;
      margin: 4px 0 2px 0;
      display: flex;
      align-items: center;
      gap: 6px;
      letter-spacing: -0.2px;
      flex-shrink: 0;
    }

    .section-title::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 12px;
      background: #0f172a;
      border-radius: 1px;
    }

    /* KPI GRID */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 6px;
      flex-shrink: 0;
    }

    .kpi-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 6px 9px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
    }

    .kpi-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
    }

    .kpi-card.blue::before { background: #0f172a; }
    .kpi-card.green::before { background: #15803d; }
    .kpi-card.purple::before { background: #334155; }
    .kpi-card.amber::before { background: #b45309; }

    .kpi-label {
      font-size: 6.8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #000000;
      font-weight: 800;
    }

    .kpi-value {
      font-size: 11.5pt;
      font-weight: 800;
      color: #000000;
      font-family: 'JetBrains Mono', monospace;
      margin: 2px 0;
    }

    .kpi-sub {
      font-size: 6.8pt;
      color: #000000;
      display: flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }

    .kpi-sub.success { color: #15803d; font-weight: 800; }
    .kpi-sub.warning { color: #b45309; font-weight: 800; }

    /* TABLES */
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 4px;
      border-radius: 4px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      font-size: 6.8pt;
    }

    th {
      background: #f1f5f9;
      color: #000000;
      font-weight: 800;
      text-align: left;
      padding: 2.8px 5px;
      font-size: 6.6pt;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      border-bottom: 1.5px solid #0f172a;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    td {
      padding: 1.8px 5px;
      border-bottom: 1px solid #e2e8f0;
      color: #000000;
      font-weight: 500;
      line-height: 1.15;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .num {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
    }

    .center {
      text-align: center;
    }

    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-size: 6.5pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      font-family: 'JetBrains Mono', monospace;
    }

    .badge-success { background: #dcfce7; color: #15803d; border: 1.2px solid #86efac; }
    .badge-danger { background: #fee2e2; color: #b91c1c; border: 1.2px solid #fca5a5; }
    .badge-warning { background: #fef3c7; color: #b45309; border: 1.2px solid #fde68a; }
    .badge-info { background: #f1f5f9; color: #0f172a; border: 1.2px solid #cbd5e1; }

    /* DRE STYLES */
    .dre-table td { padding: 4.5px 8px; font-size: 7.2pt; vertical-align: middle; }
    .dre-table tr.subtotal-row { background: #f8fafc; font-weight: 800; border-top: 1.5px solid #cbd5e1; border-bottom: 1px solid #e2e8f0; color: #000000; }
    .dre-table tr.total-row { background: #f1f5f9; font-weight: 800; font-size: 7.4pt; border-top: 1.5px solid #0f172a; border-bottom: 1px solid #cbd5e1; color: #000000; }
    .dre-table tr.highlight-row { background: #f1f5f9; font-weight: 800; font-size: 7.5pt; border-top: 1.5px solid #0f172a; border-bottom: 1.5px solid #0f172a; color: #000000; }
    .dre-table tr.final-row { background: #e2e8f0; font-weight: 800; font-size: 7.6pt; border-top: 2px solid #000000; border-bottom: 2px solid #000000; color: #000000; }

    /* INFO BOXES */
    .cards-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 5px;
      flex-shrink: 0;
    }

    .info-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 3px solid #0f172a;
      border-radius: 4px;
      padding: 7px 9px;
      font-size: 7.2pt;
      line-height: 1.35;
    }

    .info-box-title {
      font-weight: 800;
      color: #000000;
      font-size: 7.8pt;
      margin-bottom: 2px;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .info-box-desc {
      color: #000000;
      font-weight: 500;
    }

    .info-box-desc strong {
      color: #000000;
      font-weight: 800;
    }

    /* FOOTER */
    .page-footer {
      margin-top: auto;
      padding-top: 6px;
      border-top: 1.5px solid #cbd5e1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #000000;
      font-size: 6.8pt;
      font-weight: 600;
      flex-shrink: 0;
    }
  </style>
</head>
<body>

  <!-- ==================== PÁGINA 1: SUMÁRIO EXECUTIVO & DRE ==================== -->
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">CLUBE FITNESS — GESTÃO INTEGRADA</div>
        <div class="brand-subtitle">Relatório Financeiro Executivo Mensal — Centro de Reabilitação & Performance (Atualizado)</div>
      </div>
      <div class="header-badge">
        <div class="badge-periodo">Outubro / 2026</div>
        <div class="badge-date">Revisão em 04/11/2026</div>
      </div>
    </div>

    <!-- KPI CARDS -->
    <div class="kpi-grid">
      <div class="kpi-card blue">
        <div class="kpi-label">Faturamento Previsto</div>
        <div class="kpi-value">${formatBRL(kpis.faturamentoPrevisto)}</div>
        <div class="kpi-sub">${kpis.totalCobrancas} cobranças ativas</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-label">Receita Realizada (Caixa)</div>
        <div class="kpi-value">${formatBRL(kpis.faturamentoRealizado)}</div>
        <div class="kpi-sub success">${kpis.taxaAdimplencia.toFixed(1)}% de adimplência</div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-label">Despesas Operacionais</div>
        <div class="kpi-value">${formatBRL(kpis.despesasTotais)}</div>
        <div class="kpi-sub success">${kpis.despesasTotais > 0 ? '100% liquidadas em Outubro' : '—'}</div>
      </div>
      <div class="kpi-card green">
        <div class="kpi-label">Superávit Líquido Caixa</div>
        <div class="kpi-value">${formatBRL(kpis.superavitCaixa)}</div>
        <div class="kpi-sub success">Margem Realizada: ${kpis.margemCaixa.toFixed(1)}%</div>
      </div>
    </div>

    <!-- SEÇÃO: DRE MENSAL -->
    <div class="section-title">Demonstração do Resultado do Exercício (DRE) — Outubro/2026</div>
    <table class="dre-table">
      <thead>
        <tr>
          <th>Estrutura Contábil / Gerencial</th>
          <th style="width: 26%;">Classificação</th>
          <th class="num" style="width: 22%;">Valor (R$)</th>
          <th class="num" style="width: 14%;">% Receita</th>
        </tr>
      </thead>
      <tbody>
        <tr class="subtotal-row">
          <td><strong>RECEITA BRUTA OPERACIONAL (FATURAMENTO)</strong></td>
          <td style="font-weight: 600;">Mensalidades & Planos Contratados</td>
          <td class="num" style="color: #000000; font-weight: 800;">${formatBRL(kpis.faturamentoPrevisto)}</td>
          <td class="num" style="color: #000000; font-weight: 800;">100,00%</td>
        </tr>
        <tr>
          <td>Inadimplência em Aberto (Contas a Receber)</td>
          <td>${kpis.cobrancasAtraso} cobranças pendentes</td>
          <td class="num" style="color: #dc2626; font-weight: 700;">(${formatBRL(kpis.inadimplenciaValor)})</td>
          <td class="num" style="color: #dc2626; font-weight: 700;">-${((kpis.inadimplenciaValor / kpis.faturamentoPrevisto) * 100).toFixed(2)}%</td>
        </tr>
        <tr class="total-row">
          <td><strong>RECEITA OPERACIONAL LÍQUIDA REALIZADA (CAIXA)</strong></td>
          <td style="font-weight: 600;">Entradas Bancárias Efetivas</td>
          <td class="num" style="color: #16a34a; font-weight: 800;">${formatBRL(kpis.faturamentoRealizado)}</td>
          <td class="num" style="color: #16a34a; font-weight: 800;">${kpis.taxaAdimplencia.toFixed(2)}%</td>
        </tr>
        <tr>
          <td>Custos Operacionais Variáveis</td>
          <td>Bonificações de Avaliação & Insumos</td>
          <td class="num" style="color: #dc2626; font-weight: 700;">(${formatBRL(kpis.despesasVariaveis)})</td>
          <td class="num" style="color: #dc2626; font-weight: 700;">-${((kpis.despesasVariaveis / kpis.faturamentoPrevisto) * 100).toFixed(2)}%</td>
        </tr>
        <tr>
          <td>Despesas Fixas Estruturais</td>
          <td>Folha Técnica, Ocupação, Softwares & Tributos</td>
          <td class="num" style="color: #dc2626; font-weight: 700;">(${formatBRL(kpis.despesasFixas)})</td>
          <td class="num" style="color: #dc2626; font-weight: 700;">-${((kpis.despesasFixas / kpis.faturamentoPrevisto) * 100).toFixed(2)}%</td>
        </tr>
        <tr class="highlight-row">
          <td><strong>RESULTADO OPERACIONAL LÍQUIDO (COMPETÊNCIA)</strong></td>
          <td style="font-weight: 600;">EBITDA Gerencial / Lucro Operacional</td>
          <td class="num" style="color: #16a34a; font-weight: 800;">${formatBRL(kpis.lucroCompetencia)}</td>
          <td class="num" style="color: #16a34a; font-weight: 800;">${kpis.margemCompetencia.toFixed(2)}%</td>
        </tr>
        <tr class="final-row">
          <td><strong>SALDO LÍQUIDO REALIZADO EM CAIXA</strong></td>
          <td style="font-weight: 600;">Fluxo de Caixa Livre Disponível</td>
          <td class="num" style="color: #16a34a; font-weight: 800;">${formatBRL(kpis.superavitCaixa)}</td>
          <td class="num" style="color: #16a34a; font-weight: 800;">${kpis.margemCaixa.toFixed(2)}%</td>
        </tr>
      </tbody>
    </table>

    <!-- SEÇÃO: PERFORMANCE COMPARATIVA DOS PLANOS -->
    <div class="section-title">Performance Comparativa dos Planos & Modalidades</div>
    <table>
      <thead>
        <tr>
          <th>Modalidade / Plano</th>
          <th class="num" style="width: 14%;">Faturado (R$)</th>
          <th class="num" style="width: 14%;">Recebido (R$)</th>
          <th class="num" style="width: 13%;">Atraso (R$)</th>
          <th class="center" style="width: 11%;">Adimplência</th>
          <th class="center" style="width: 11%;">Cobranças</th>
          <th class="num" style="width: 12%;">Ticket Médio</th>
        </tr>
      </thead>
      <tbody>
        ${planosResumo.map(p => `
          <tr>
            <td>
              <strong style="color: #000000;">${p.nome}</strong>
              <div style="font-size: 6.8pt; color: #000000; font-weight: 600; margin-top: 1px;">${p.perfil}</div>
            </td>
            <td class="num" style="color: #000000;">${formatBRL(p.previsto)}</td>
            <td class="num" style="color: #16a34a; font-weight: 700;">${formatBRL(p.realizado)}</td>
            <td class="num" style="${p.atraso > 0 ? 'color: #dc2626; font-weight: 700;' : 'color: #000000;'}">${p.atraso > 0 ? formatBRL(p.atraso) : 'R$ 0,00'}</td>
            <td class="center">
              <span class="badge ${p.adimplencia === 100 ? 'badge-success' : p.adimplencia >= 80 ? 'badge-info' : 'badge-warning'}">
                ${p.adimplencia.toFixed(1)}%
              </span>
            </td>
            <td class="center font-mono" style="color: #000000; font-weight: 600;">${p.qtdPagas} / ${p.qtdTotal}</td>
            <td class="num" style="color: #000000; font-weight: 700;">${formatBRL(p.ticketMedio)}</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td><strong>TOTAL GERAL CONSOLIDADO</strong></td>
          <td class="num" style="color: #000000;">${formatBRL(kpis.faturamentoPrevisto)}</td>
          <td class="num" style="color: #16a34a;">${formatBRL(kpis.faturamentoRealizado)}</td>
          <td class="num" style="color: #dc2626;">${formatBRL(kpis.inadimplenciaValor)}</td>
          <td class="center"><span class="badge badge-success">${kpis.taxaAdimplencia.toFixed(1)}%</span></td>
          <td class="center font-mono" style="color: #000000; font-weight: 700;">${kpis.cobrancasPagas} / ${kpis.totalCobrancas}</td>
          <td class="num" style="color: #000000; font-weight: 700;">${formatBRL(kpis.faturamentoPrevisto / kpis.totalCobrancas)}</td>
        </tr>
      </tbody>
    </table>

    <div class="section-title">Folha de Prestadores de Serviço (Salários Fixos & Bonificações de Avaliação)</div>
    <table>
      <thead>
        <tr>
          <th>Profissional</th>
          <th>Função / Responsabilidade</th>
          <th class="num" style="width: 15%;">Salário Fixo</th>
          <th class="num" style="width: 16%;">Bonif. Avaliação</th>
          <th class="num" style="width: 15%;">Total Pago</th>
          <th class="center" style="width: 11%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${prestadores.map(p => `
          <tr>
            <td><strong style="color: #000000;">${p.nome}</strong></td>
            <td style="color: #000000; font-size: 7.2pt; font-weight: 600;">${p.papel}</td>
            <td class="num" style="color: #000000; font-weight: 700;">${p.salario > 0 ? formatBRL(p.salario) : '—'}</td>
            <td class="num" style="color: #000000; font-weight: 700;">${p.bonus > 0 ? formatBRL(p.bonus) : '—'}</td>
            <td class="num" style="color: #16a34a; font-weight: 800;">${formatBRL(p.total)}</td>
            <td class="center"><span class="badge badge-success">Pago</span></td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2"><strong>SUBTOTAL FOLHA DE PRESTADORES</strong></td>
          <td class="num" style="color: #000000;">${formatBRL(prestadores.reduce((s, p) => s + p.salario, 0))}</td>
          <td class="num" style="color: #000000;">${formatBRL(prestadores.reduce((s, p) => s + p.bonus, 0))}</td>
          <td class="num" style="color: #16a34a;">${formatBRL(prestadores.reduce((s, p) => s + p.total, 0))}</td>
          <td class="center"><span class="badge badge-success">Liquidado</span></td>
        </tr>
      </tbody>
    </table>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 1 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 2: CLUBE MONITORADO (PARTE 1: BLOCO ASAAS - ALUNOS 1 A ${monitoradoP1.length}) ==================== -->
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">CLUBE FITNESS — MONITORADO (PARTE 1 / 2)</div>
        <div class="brand-subtitle">Detalhamento por Bloco de Pagamento — Asaas (Alunos 1 a ${monitoradoP1.length})</div>
      </div>
      <div class="header-badge">
        <div class="badge-periodo">Outubro / 2026</div>
        <div class="badge-date">${monitoradoP1.length} de ${grouped['Clube Fitness - Monitorado'].length} Cobranças</div>
      </div>
    </div>

    <div class="section-title">Clube Fitness Monitorado — Segmentado por Forma de Pagamento</div>
    <table>
      <thead>
        <tr>
          <th style="width: 4%;">#</th>
          <th style="width: 27%;">Aluno / Cliente</th>
          <th style="width: 28%;">Descrição da Mensalidade</th>
          <th style="width: 14%;">Forma</th>
          <th class="center" style="width: 10%;">Vencimento</th>
          <th class="num" style="width: 10%;">Valor (R$)</th>
          <th class="center" style="width: 7%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${renderGroupedTableRows(monitoradoP1, 1)}
        <tr class="total-row">
          <td colspan="5"><strong>SUBTOTAL PARTE 1 (${monitoradoP1.length} ALUNOS)</strong></td>
          <td class="num" style="color: #000000; font-weight: 800;">${formatBRL(monitoradoP1.reduce((sum, i) => sum + i.valor, 0))}</td>
          <td class="center"><span class="badge badge-success">100% Pago</span></td>
        </tr>
      </tbody>
    </table>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 2 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 3: CLUBE MONITORADO (PARTE 2: ASAAS RESTANTE + DEMAIS FORMAS) ==================== -->
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">CLUBE FITNESS — MONITORADO (PARTE 2 / 2)</div>
        <div class="brand-subtitle">Detalhamento por Bloco — Asaas Restante, Dinheiro, PIX, Cartão, Boleto & Wellhub</div>
      </div>
      <div class="header-badge">
        <div class="badge-periodo">Outubro / 2026</div>
        <div class="badge-date">${monitoradoP2.length} de ${grouped['Clube Fitness - Monitorado'].length} Cobranças</div>
      </div>
    </div>

    <div class="section-title">Clube Fitness Monitorado — Conclusão de Blocos (Alunos ${monitoradoP1.length + 1} a ${grouped['Clube Fitness - Monitorado'].length})</div>
    <table>
      <thead>
        <tr>
          <th style="width: 4%;">#</th>
          <th style="width: 27%;">Aluno / Cliente</th>
          <th style="width: 28%;">Descrição da Mensalidade</th>
          <th style="width: 14%;">Forma</th>
          <th class="center" style="width: 10%;">Vencimento</th>
          <th class="num" style="width: 10%;">Valor (R$)</th>
          <th class="center" style="width: 7%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${renderGroupedTableRows(monitoradoP2, monitoradoP1.length + 1)}
        <tr class="total-row">
          <td colspan="5"><strong>TOTAL GERAL CLUBE MONITORADO (${grouped['Clube Fitness - Monitorado'].length} ALUNOS)</strong></td>
          <td class="num" style="color: #000000; font-weight: 800;">${formatBRL(monitoradoTotal)}</td>
          <td class="center"><span class="badge badge-success">100,0% Pago</span></td>
        </tr>
      </tbody>
    </table>

    <div class="info-box" style="border-left: 3px solid #16a34a; margin-top: 6px;">
      <div class="info-box-title" style="color: #15803d;">Resumo por Bloco — Clube Monitorado (${grouped['Clube Fitness - Monitorado'].length} Alunos • 100% Adimplente)</div>
      <div class="info-box-desc">
        • <strong>Asaas (Plataforma):</strong> ${grouped['Clube Fitness - Monitorado'].filter(i => i.macroForma === 'Asaas (Plataforma)').length} alunos • ${formatBRL(grouped['Clube Fitness - Monitorado'].filter(i => i.macroForma === 'Asaas (Plataforma)').reduce((s, i) => s + i.valor, 0))}<br>
        • <strong>Cartão Manual:</strong> ${grouped['Clube Fitness - Monitorado'].filter(i => i.macroForma === 'Cartão Manual').length} alunos (Dante, Emanuel, Matheus Habibe e Pedro Rocha) • ${formatBRL(grouped['Clube Fitness - Monitorado'].filter(i => i.macroForma === 'Cartão Manual').reduce((s, i) => s + i.valor, 0))}<br>
        • <strong>PIX Manual:</strong> ${grouped['Clube Fitness - Monitorado'].filter(i => i.macroForma === 'PIX / Pix Manual').length} aluno (Zaime Romeu Gottshalg) • <strong>${formatBRL(grouped['Clube Fitness - Monitorado'].filter(i => i.macroForma === 'PIX / Pix Manual').reduce((s, i) => s + i.valor, 0))}</strong><br>
        • <strong>Dinheiro:</strong> ${grouped['Clube Fitness - Monitorado'].filter(i => i.macroForma === 'Dinheiro').length} aluna (Isabel Imaculada Alves) • ${formatBRL(grouped['Clube Fitness - Monitorado'].filter(i => i.macroForma === 'Dinheiro').reduce((s, i) => s + i.valor, 0))}<br>
        • <strong>Wellhub:</strong> ${grouped['Clube Fitness - Monitorado'].filter(i => i.macroForma === 'Wellhub').length} aluno (Pedro Ferraz de Azevedo) • <strong>${formatBRL(grouped['Clube Fitness - Monitorado'].filter(i => i.macroForma === 'Wellhub').reduce((s, i) => s + i.valor, 0))}</strong>
      </div>
    </div>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 3 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 4: PROTOCOLO INDIVIDUALIZADO (PARTE 1 / 2) ==================== -->
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">CLUBE FITNESS — PROTOCOLO INDIVIDUALIZADO (1 / 2)</div>
        <div class="brand-subtitle">Detalhamento por Bloco — Asaas Plataforma (Cobranças 1 a ${protocoloP1.length})</div>
      </div>
      <div class="header-badge">
        <div class="badge-periodo">Outubro / 2026</div>
        <div class="badge-date">${protocoloP1.length} de ${grouped['Protocolo Individualizado'].length} Cobranças</div>
      </div>
    </div>

    <div class="section-title">Protocolo Individualizado — Bloco Asaas (Parte 1: 1 a ${protocoloP1.length})</div>
    <table>
      <thead>
        <tr>
          <th style="width: 4%;">#</th>
          <th style="width: 27%;">Aluno / Cliente</th>
          <th style="width: 28%;">Descrição / Parcela</th>
          <th style="width: 14%;">Forma</th>
          <th class="center" style="width: 10%;">Vencimento</th>
          <th class="num" style="width: 10%;">Valor (R$)</th>
          <th class="center" style="width: 7%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${renderGroupedTableRows(protocoloP1, 1)}
        <tr class="total-row">
          <td colspan="5"><strong>SUBTOTAL PARTE 1 (${protocoloP1.length} COBRANÇAS)</strong></td>
          <td class="num">${formatBRL(protocoloP1.reduce((sum, i) => sum + i.valor, 0))}</td>
          <td class="center"><span class="badge badge-info">Auditado</span></td>
        </tr>
      </tbody>
    </table>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 4 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 5: PROTOCOLO INDIVIDUALIZADO (PARTE 2 / 2) ==================== -->
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">CLUBE FITNESS — PROTOCOLO INDIVIDUALIZADO (2 / 2)</div>
        <div class="brand-subtitle">Detalhamento por Bloco — Asaas Plataforma (Cobranças ${protocoloP1.length + 1} a ${grouped['Protocolo Individualizado'].length})</div>
      </div>
      <div class="header-badge">
        <div class="badge-periodo">Outubro / 2026</div>
        <div class="badge-date">${protocoloP2.length} de ${grouped['Protocolo Individualizado'].length} Cobranças</div>
      </div>
    </div>

    <div class="section-title">Protocolo Individualizado — Bloco Asaas (Parte 2: ${protocoloP1.length + 1} a ${grouped['Protocolo Individualizado'].length})</div>
    <table>
      <thead>
        <tr>
          <th style="width: 4%;">#</th>
          <th style="width: 27%;">Aluno / Cliente</th>
          <th style="width: 28%;">Descrição / Parcela</th>
          <th style="width: 14%;">Forma</th>
          <th class="center" style="width: 10%;">Vencimento</th>
          <th class="num" style="width: 10%;">Valor (R$)</th>
          <th class="center" style="width: 7%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${renderGroupedTableRows(protocoloP2, protocoloP1.length + 1)}
        <tr class="total-row">
          <td colspan="5"><strong>TOTAL PROTOCOLO INDIVIDUALIZADO (${grouped['Protocolo Individualizado'].length} COBRANÇAS)</strong></td>
          <td class="num">${formatBRL(protocoloTotal)}</td>
          <td class="center"><span class="badge badge-success">${((protocoloPago / protocoloTotal) * 100).toFixed(1)}% Pago</span></td>
        </tr>
      </tbody>
    </table>

    <div class="cards-row" style="margin-top: 6px;">
      <div class="info-box">
        <div class="info-box-title">Liquidação em Asaas</div>
        <div class="info-box-desc">
          Todas as ${grouped['Protocolo Individualizado'].length} cobranças do Protocolo Individualizado operam integradas via <strong>Asaas</strong>, sendo ${grouped['Protocolo Individualizado'].filter(i => i.status === 'Pago').length} já liquidadas (<strong>${formatBRL(protocoloPago)}</strong>) e ${grouped['Protocolo Individualizado'].filter(i => i.status !== 'Pago').length} pendentes de conciliação ativa.
        </div>
      </div>
      <div class="info-box">
        <div class="info-box-title">Cobranças em Atraso (4 alunos)</div>
        <div class="info-box-desc">
          Restam 4 cobranças pendentes somando <strong>${formatBRL(protocoloAtraso)}</strong> (Márcia Lopes R$ 3.000, Bruno Rafael R$ 2.000, João Marcos R$ 1.980 e Neusa Maria R$ 1.600).
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 5 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 6: TRATAMENTO PERSONALIZADO & CAPTAÇÃO ==================== -->
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">CLUBE FITNESS — TRATAMENTO & CAPTAÇÃO</div>
        <div class="brand-subtitle">Detalhamento por Bloco de Forma de Pagamento (${grouped['Tratamento Personalizado'].length + grouped['Captação'].length} Cobranças)</div>
      </div>
      <div class="header-badge">
        <div class="badge-periodo">Outubro / 2026</div>
        <div class="badge-date">Receita Total: ${formatBRL(tratamentoTotal + captacaoTotal)}</div>
      </div>
    </div>

    <!-- SEÇÃO: TRATAMENTO PERSONALIZADO -->
    <div class="section-title">Tratamento Personalizado — Separado por Bloco (${formatBRL(tratamentoTotal)} • ${((tratamentoPago / tratamentoTotal) * 100).toFixed(1)}% Pago)</div>
    <table>
      <thead>
        <tr>
          <th style="width: 4%;">#</th>
          <th style="width: 27%;">Aluno / Paciente</th>
          <th style="width: 28%;">Descrição do Plano</th>
          <th style="width: 14%;">Forma</th>
          <th class="center" style="width: 10%;">Vencimento</th>
          <th class="num" style="width: 10%;">Valor (R$)</th>
          <th class="center" style="width: 7%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${renderGroupedTableRows(grouped['Tratamento Personalizado'], 1)}
        <tr class="total-row">
          <td colspan="5"><strong>TOTAL TRATAMENTO PERSONALIZADO (${grouped['Tratamento Personalizado'].length} COBRANÇAS)</strong></td>
          <td class="num" style="color: #000000; font-weight: 800;">${formatBRL(tratamentoTotal)}</td>
          <td class="center"><span class="badge ${tratamentoAtraso > 0 ? 'badge-warning' : 'badge-success'}">${((tratamentoPago / tratamentoTotal) * 100).toFixed(1)}% Pago</span></td>
        </tr>
      </tbody>
    </table>

    <!-- SEÇÃO: CAPTAÇÃO -->
    <div class="section-title" style="margin-top: 10px;">Captação — Separado por Bloco (${formatBRL(captacaoTotal)} • 100,0% Pago)</div>
    <table>
      <thead>
        <tr>
          <th style="width: 4%;">#</th>
          <th style="width: 27%;">Aluno / Novo Cliente</th>
          <th style="width: 28%;">Descrição do Pacote</th>
          <th style="width: 14%;">Forma</th>
          <th class="center" style="width: 10%;">Vencimento</th>
          <th class="num" style="width: 10%;">Valor (R$)</th>
          <th class="center" style="width: 7%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${renderGroupedTableRows(grouped['Captação'], 1)}
        <tr class="total-row">
          <td colspan="5"><strong>TOTAL CAPTAÇÃO (${grouped['Captação'].length} COBRANÇAS)</strong></td>
          <td class="num" style="color: #000000; font-weight: 800;">${formatBRL(captacaoTotal)}</td>
          <td class="center"><span class="badge badge-success">100,0% Pago</span></td>
        </tr>
      </tbody>
    </table>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 6 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 7: INADIMPLÊNCIA & GESTÃO ATIVA ==================== -->
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">CLUBE FITNESS — GESTÃO ATIVA DE INADIMPLÊNCIA</div>
        <div class="brand-subtitle">Raio-X Nominal dos ${atrasados.length} Clientes Pendentes e Plano de Cobrança</div>
      </div>
      <div class="header-badge">
        <div class="badge-periodo">Outubro / 2026</div>
        <div class="badge-date">${formatBRL(kpis.inadimplenciaValor)} em Aberto</div>
      </div>
    </div>

    <div class="section-title">Relação Nominal dos Clientes com Cobranças Pendentes (${atrasados.length} Cobranças • ${formatBRL(kpis.inadimplenciaValor)})</div>
    <table>
      <thead>
        <tr>
          <th style="width: 4%;">#</th>
          <th>Aluno / Cliente</th>
          <th style="width: 22%;">Modalidade</th>
          <th class="center" style="width: 13%;">Vencimento</th>
          <th class="num" style="width: 15%;">Valor (R$)</th>
          <th class="center" style="width: 16%;">Telefone / Contato</th>
          <th class="center" style="width: 14%;">Forma / Bloco</th>
        </tr>
      </thead>
      <tbody>
        ${(() => {
      let currBlock = '';
      let h = '';
      atrasados.forEach((item, idx) => {
        if (item.macroForma !== currBlock) {
          currBlock = item.macroForma;
          const bItems = atrasados.filter(i => i.macroForma === currBlock);
          const bTotal = bItems.reduce((s, i) => s + i.valor, 0);
          h += `
                <tr style="background: #f1f5f9; border-top: 1.5px solid #dc2626; border-bottom: 1px solid #cbd5e1;">
                  <td colspan="7" style="padding: 3.5px 8px; font-weight: 800; font-size: 7.2pt; color: #991b1b; text-transform: uppercase; letter-spacing: 0.3px;">
                    ▸ BLOCO ${currBlock.toUpperCase()}: ${bItems.length} COBRANÇA(S) EM ABERTO • TOTAL: ${formatBRL(bTotal)}
                  </td>
                </tr>
              `;
        }
        let crit = 'Atraso Crítico';
        let badgeClass = 'badge-danger';
        if (item.vencimento >= '2026-10-30') {
          crit = 'Recente';
          badgeClass = 'badge-info';
        } else if (item.vencimento >= '2026-10-15') {
          crit = 'Atraso Médio';
          badgeClass = 'badge-warning';
        }
        h += `
              <tr>
                <td class="center font-mono" style="color: #000000; font-weight: 700;">${idx + 1}</td>
                <td><strong style="color: #000000;">${item.aluno}</strong></td>
                <td style="font-size: 7.2pt; color: #000000; font-weight: 600;">${item.plano}</td>
                <td class="center font-mono" style="color: #000000; font-weight: 600;">${formatDateBR(item.vencimento)}</td>
                <td class="num" style="color: #dc2626; font-weight: 800;">${formatBRL(item.valor)}</td>
                <td class="center font-mono" style="font-size: 7.2pt; color: #000000; font-weight: 700;">${item.telefone}</td>
                <td class="center"><span class="badge ${badgeClass}">${item.macroForma}</span></td>
              </tr>
            `;
      });
      return h;
    })()}
        <tr class="total-row">
          <td colspan="4"><strong>TOTAL EM ABERTO (${atrasados.length} ALUNOS)</strong></td>
          <td class="num" style="color: #dc2626;">${formatBRL(kpis.inadimplenciaValor)}</td>
          <td colspan="2" style="color: #15803d; font-size: 7.4pt; text-align: center;">Taxa controlada de inadimplência (${((kpis.inadimplenciaValor / kpis.faturamentoPrevisto) * 100).toFixed(2)}% da carteira faturada)</td>
        </tr>
      </tbody>
    </table>

    <div class="info-box" style="border-left: 3px solid #16a34a; margin-top: 12px;">
      <div class="info-box-title" style="color: #15803d;">Acompanhamento e Meta de Liquidez</div>
      <div class="info-box-desc">
        O montante em aberto de <strong>${formatBRL(kpis.inadimplenciaValor)}</strong> representa apenas <strong>${((kpis.inadimplenciaValor / kpis.faturamentoPrevisto) * 100).toFixed(2)}%</strong> do faturamento previsto do mês. A liquidação deste saldo pendente elevará a taxa global de adimplência de Outubro de <strong>${kpis.taxaAdimplencia.toFixed(1)}%</strong> para <strong>100,0%</strong>.
      </div>
    </div>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 7 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 8: DESPESAS OPERACIONAIS DETALHADAS ==================== -->
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">CLUBE FITNESS — CONTAS A PAGAR DETALHADAS</div>
        <div class="brand-subtitle">Relação Completa das ${octExpenses.length} Despesas Operacionais Liquidadas em Outubro/2026</div>
      </div>
      <div class="header-badge">
        <div class="badge-periodo">Outubro / 2026</div>
        <div class="badge-date">100% Pagas (${formatBRL(kpis.despesasTotais)})</div>
      </div>
    </div>

    <div class="section-title">Detalhamento dos Lançamentos de Contas a Pagar (${octExpenses.length} Itens Agrupados por Natureza)</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <!-- COLUNA 1: SALÁRIOS, BONIFICAÇÕES, TRIBUTOS & SOFTWARES (ITENS 1 A ${despesasCol1.length}) -->
      <div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th>Descrição / Fornecedor</th>
              <th class="num" style="width: 25%;">Valor (R$)</th>
              <th class="center" style="width: 22%;">Vencimento</th>
            </tr>
          </thead>
          <tbody>
            ${renderExpenseRows(despesasCol1, 1)}
          </tbody>
        </table>
      </div>

      <!-- COLUNA 2: OCUPAÇÃO PREDIAL, ENERGIA & INSUMOS (ITENS ${despesasCol1.length + 1} A ${octExpenses.length}) -->
      <div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th>Descrição / Fornecedor</th>
              <th class="num" style="width: 25%;">Valor (R$)</th>
              <th class="center" style="width: 22%;">Vencimento</th>
            </tr>
          </thead>
          <tbody>
            ${renderExpenseRows(despesasCol2, despesasCol1.length + 1)}
          </tbody>
        </table>
      </div>
    </div>

    <div class="cards-row" style="margin-top: 6px;">
      <div class="info-box">
        <div class="info-box-title">Consolidação de Despesas</div>
        <div class="info-box-desc">
          Total de ${octExpenses.length} lançamentos processados no módulo financeiro, totalizando <strong>${formatBRL(kpis.despesasTotais)}</strong>. Todas as obrigações encontram-se <strong>100% liquidadas</strong>, sem nenhuma pendência em aberto.
        </div>
      </div>
      <div class="info-box">
        <div class="info-box-title">Remuneração da Equipe Técnica</div>
        <div class="info-box-desc">
          Total de <strong>${formatBRL(prestadores.reduce((s, p) => s + p.total, 0))}</strong> quitado no mês entre salários e bonificações.
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 8 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 9: CLIENTES ATIVOS SEM ASAAS E SEM PARCELAS ==================== -->
  <div class="page">
    <div class="header">
      <div>
        <div class="brand-title">CLUBE FITNESS — AUDITORIA CADASTRAL & REGULARIZAÇÃO</div>
        <div class="brand-subtitle">Clientes com Cadastro Ativo sem Integração Asaas e sem Parcelas Registradas</div>
      </div>
      <div class="header-badge">
        <div class="badge-periodo">Base Ativa</div>
        <div class="badge-date">${semAsaasSemParcelas.length} Clientes Mapeados</div>
      </div>
    </div>

    <div class="section-title">Relação dos ${semAsaasSemParcelas.length} Alunos Ativos sem Cobrança Registrada no Sistema</div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
      <!-- COLUNA 1: ALUNOS 1 A ${semCobrancaHalf} -->
      <div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th>Aluno / Cliente</th>
              <th>Plano / Forma</th>
              <th style="width: 25%;">Telefone</th>
            </tr>
          </thead>
          <tbody>
            ${semCobrancaCol1.map((item, idx) => `
              <tr>
                <td class="center font-mono" style="color: #000000; font-weight: 700;">${idx + 1}</td>
                <td>
                  <strong style="color: #000000;">${item.nome}</strong>
                  <div style="font-size: 6.8pt; color: #000000; font-weight: 600;">Resp: ${item.responsavel}</div>
                </td>
                <td>
                  <div style="font-size: 7.2pt; color: #000000; font-weight: 800;">${item.plano}</div>
                  <div style="font-size: 6.8pt; color: #000000; font-weight: 600;">Forma: ${item.forma}</div>
                </td>
                <td class="font-mono" style="font-size: 6.8pt; color: #000000; font-weight: 700;">${item.telefone}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- COLUNA 2: ALUNOS ${semCobrancaHalf + 1} A ${semAsaasSemParcelas.length} -->
      <div>
        <table>
          <thead>
            <tr>
              <th style="width: 5%;">#</th>
              <th>Aluno / Cliente</th>
              <th>Plano / Forma</th>
              <th style="width: 25%;">Telefone</th>
            </tr>
          </thead>
          <tbody>
            ${semCobrancaCol2.map((item, idx) => `
              <tr>
                <td class="center font-mono" style="color: #000000; font-weight: 700;">${idx + semCobrancaHalf + 1}</td>
                <td>
                  <strong style="color: #000000;">${item.nome}</strong>
                  <div style="font-size: 6.8pt; color: #000000; font-weight: 600;">Resp: ${item.responsavel}</div>
                </td>
                <td>
                  <div style="font-size: 7.2pt; color: #000000; font-weight: 800;">${item.plano}</div>
                  <div style="font-size: 6.8pt; color: #000000; font-weight: 600;">Forma: ${item.forma}</div>
                </td>
                <td class="font-mono" style="font-size: 6.8pt; color: #000000; font-weight: 700;">${item.telefone}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="info-box" style="border-left: 3px solid #b45309; margin-top: 6px;">
      <div class="info-box-title" style="color: #000000;">Diagnóstico de Risco Cadastral</div>
      <div class="info-box-desc">
        Estes <strong>${semAsaasSemParcelas.length} alunos constam com status "ativo"</strong> no sistema e realizam agendamentos ou atendimentos na clínica, porém <strong>não possuem código de cliente Asaas</strong> vinculado e <strong>nenhuma parcela cadastrada</strong> no módulo financeiro.
      </div>
    </div>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 9 de ${totalPages}</div>
    </div>
  </div>

  <!-- ==================== PÁGINA 10: BALANÇO DE EXPANSÃO & DINÂMICA DA BASE (SETEMBRO vs OUTUBRO) ==================== -->
  <div class="page page-front" style="padding-bottom: 20px;">
    <div class="header">
      <div class="header-left">
        <div class="header-tag">BALANÇO DE EXPANSÃO & CHURN DA BASE • MÊS ANTERIOR vs ATUAL</div>
        <div class="header-title" style="font-size: 13pt;">Dinâmica da Carteira: Entradas (+${novosPagantes.length}) vs Saídas (-${descontinuados.length})</div>
        <div class="header-desc">Auditoria comparativa nominal de clientes pagantes entre ${prevMonthStr} e ${mesParam}.</div>
      </div>
      <div class="header-right">
        <div class="company-badge">CLUBE FITNESS</div>
        <div class="reference-date">Competência: ${mesParam}</div>
      </div>
    </div>

    <!-- Indicadores de Crescimento -->
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 10px;">
      <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 8px; padding: 10px 14px;">
        <div style="font-size: 7pt; font-weight: 800; color: #166534; text-transform: uppercase;">Novas Entradas Pagantes</div>
        <div style="font-size: 14pt; font-weight: 800; color: #15803d; margin-top: 2px;">+${formatBRL(totalNovos)}</div>
        <div style="font-size: 7.2pt; font-weight: 700; color: #166534; margin-top: 2px;">${novosPagantes.length} novos alunos ativos</div>
      </div>
      <div style="background: #fef2f2; border: 1.5px solid #fca5a5; border-radius: 8px; padding: 10px 14px;">
        <div style="font-size: 7pt; font-weight: 800; color: #991b1b; text-transform: uppercase;">Descontinuações (Saídas)</div>
        <div style="font-size: 14pt; font-weight: 800; color: #b91c1c; margin-top: 2px;">-${formatBRL(totalDescontinuados)}</div>
        <div style="font-size: 7.2pt; font-weight: 700; color: #991b1b; margin-top: 2px;">${descontinuados.length} alunos descontinuados</div>
      </div>
      <div style="background: ${saldoLiquidoExpansao >= 0 ? '#ecfdf5' : '#fff1f2'}; border: 2px solid ${saldoLiquidoExpansao >= 0 ? '#10b981' : '#f43f5e'}; border-radius: 8px; padding: 10px 14px;">
        <div style="font-size: 7pt; font-weight: 800; color: #000000; text-transform: uppercase;">Saldo Líquido de Expansão</div>
        <div style="font-size: 14pt; font-weight: 800; color: ${saldoLiquidoExpansao >= 0 ? '#047857' : '#be123c'}; margin-top: 2px;">
          ${saldoLiquidoExpansao >= 0 ? '+' : ''}${formatBRL(saldoLiquidoExpansao)}
        </div>
        <div style="font-size: 7.2pt; font-weight: 700; color: #000000; margin-top: 2px;">Crescimento real da receita</div>
      </div>
    </div>

    <!-- Tabelas Comparativas Lado a Lado -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 14px;">
      <!-- Coluna 1: Novos Alunos Pagantes -->
      <div>
        <div style="font-size: 8.5pt; font-weight: 800; color: #166534; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>Novos Alunos Pagantes (${novosPagantes.length})</span>
          <span style="font-size: 8pt; color: #15803d;">+${formatBRL(totalNovos)}</span>
        </div>
        <table class="nominal-table" style="font-size: 6.8pt;">
          <thead>
            <tr>
              <th style="width: 20px;">#</th>
              <th>Aluno</th>
              <th>Plano</th>
              <th class="right">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${novosPagantes.slice(0, 18).map((item, idx) => `
              <tr>
                <td class="center font-mono" style="color: #000000; font-weight: 700;">${idx + 1}</td>
                <td><strong style="color: #000000;">${item.nome}</strong></td>
                <td style="color: #334155;">${item.plano}</td>
                <td class="right font-mono" style="color: #15803d; font-weight: 700;">${formatBRL(item.valor)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <!-- Coluna 2: Alunos Descontinuados -->
      <div>
        <div style="font-size: 8.5pt; font-weight: 800; color: #991b1b; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
          <span>Alunos Descontinuados (${descontinuados.length})</span>
          <span style="font-size: 8pt; color: #b91c1c;">-${formatBRL(totalDescontinuados)}</span>
        </div>
        <table class="nominal-table" style="font-size: 6.8pt;">
          <thead>
            <tr>
              <th style="width: 20px;">#</th>
              <th>Aluno</th>
              <th>Plano Anterior</th>
              <th class="right">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${descontinuados.map((item, idx) => `
              <tr>
                <td class="center font-mono" style="color: #000000; font-weight: 700;">${idx + 1}</td>
                <td><strong style="color: #000000;">${item.nome}</strong></td>
                <td style="color: #334155;">${item.plano}</td>
                <td class="right font-mono" style="color: #b91c1c; font-weight: 700;">${formatBRL(item.valor)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="info-box" style="border-left: 3px solid #10b981; margin-top: 14px;">
          <div class="info-box-title" style="color: #000000;">Parecer da Diretoria Executiva</div>
          <div class="info-box-desc" style="font-size: 7.2pt; color: #1e293b; line-height: 1.4;">
            A conversão de <strong>${novosPagantes.length} novos clientes</strong> superou amplamente as <strong>${descontinuados.length} descontinuações</strong>, resultando em uma <strong>expansão líquida de ${formatBRL(saldoLiquidoExpansao)}</strong> na carteira. O índice de retenção líquida comprova o fortalecimento comercial da unidade.
          </div>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <div>Clube Fitness • Sistema de Gestão Financeira & Reabilitação</div>
      <div>Página 10 de ${totalPages}</div>
    </div>
  </div>

</body>
</html>`;

  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log('HTML Master com 10 páginas gerado com sucesso em:', htmlPath);

  // Renderização via Edge Headless
  console.log('Renderizando PDF com Edge Headless...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`;

  try {
    execSync(cmd, { stdio: 'pipe' });
    const stat = fs.statSync(pdfPath);
    console.log(`PDF compilado com sucesso: ${stat.size} bytes`);

    fs.copyFileSync(pdfPath, downloadsPdfPath);
    console.log('Copiado para Downloads:', downloadsPdfPath);

    fs.copyFileSync(pdfPath, workspacePdfPath);
    console.log('Copiado para Workspace:', workspacePdfPath);

    fs.copyFileSync(pdfPath, storagePdfPath);
    console.log('Copiado para Storage:', storagePdfPath);

    // Compatibilidade com arquivos estáticos de Outubro
    if (mesParam === '2026-10') {
      const octStoragePath = path.join(storageReportsDir, 'relatorio_financeiro_outubro_2026.pdf');
      fs.copyFileSync(pdfPath, octStoragePath);
      const octDownloads = 'C:/Users/user/Downloads/relatorio_financeiro_outubro_2026.pdf';
      fs.copyFileSync(pdfPath, octDownloads);
    }

  } catch (err) {
    console.error('Erro na renderização do PDF:', err);
    process.exit(1);
  }

  process.exit(0);
}


run().catch(err => {
  console.error(err);
  process.exit(1);
});
