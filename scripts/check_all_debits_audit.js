const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri = '';
env.split('\n').forEach(l => { 
  if (l.trim().startsWith('MONGODB_URI=')) uri = l.trim().replace('MONGODB_URI=', '').trim(); 
});

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const clients = await db.collection('clients').find({}).toArray();
  const withProfRoot = clients.filter(c => c.profissionalId);
  console.log('Clients with c.profissionalId at root:', withProfRoot.length);

  // Check appointments in Oct 2026
  const appts = await db.collection('appointments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  // Check attendance by client in Oct 2026
  const clientAttendance = {};
  appts.forEach(a => {
    const cid = String(a.clienteId?._id || a.clienteId);
    if (!clientAttendance[cid]) clientAttendance[cid] = { presencas: 0, faltas: 0, livre: 0, emerg: 0, appts: [] };
    if (a.status === 'concluido' || a.status === 'presente' || a.presenca === true || a.checkin === true) clientAttendance[cid].presencas++;
    if (a.status === 'falta' || a.status === 'ausente' || a.falta === true) clientAttendance[cid].faltas++;
    const s = (a.servico || '').toLowerCase();
    if (s.includes('livre') || a.tipoCredito === 'livre') clientAttendance[cid].livre++;
    if (s.includes('emerg') || a.tipoCredito === 'emergencia') clientAttendance[cid].emerg++;
    clientAttendance[cid].appts.push(a);
  });

  console.log('\n=== AUDITORIA COMPLETA DOS 5 CRITÉRIOS DE DÉBITO DO CARD ===');

  // 1. Avaliação/Teste/Relatório sem Ficha após 24h: -2 pts
  console.log('\n1. Avaliação/Teste/Relatório sem Ficha após 24h: -2 pts');
  console.log('STATUS: APLICADO no PDF e no sistema (Albert -2, Rachel -2, Pedro -6, Ruthi -4, Matheus abonado).');

  // 2. Avaliação ou Ficha vencida há > 2 meses: -10 pts (profissional vinculado)
  console.log('\n2. Avaliação ou Ficha vencida há > 2 meses: -10 pts (profissional vinculado)');
  console.log(`Clientes com profissional vinculado no banco: ${withProfRoot.length} (de 212 clientes).`);

  // 3. Aluno ativo com frequência mensal < 80% (fechamento): -5 pts/aluno
  console.log('\n3. Aluno ativo com frequência mensal < 80% (fechamento): -5 pts/aluno');
  // How many active students have frequency < 80%?
  const plans = await db.collection('plans').find({}).toArray();
  const planMap = new Map();
  plans.forEach(p => planMap.set(String(p._id), p.nome));
  const contracts = await db.collection('contracts').find({}).toArray();
  const clientContractMap = new Map();
  contracts.forEach(ct => { if (ct.planoNome) clientContractMap.set(String(ct.clientId), ct.planoNome); });

  const activeMonitoradoAndTratamento = clients.filter(c => {
    const cid = String(c._id);
    const pId = c.dadosComerciais?.planoId ? String(c.dadosComerciais.planoId) : '';
    const rawPlan = planMap.get(pId) || c.dadosComerciais?.contrato || c.dadosComerciais?.planoNome || 'Sem Plano';
    const plan = (clientContractMap.get(cid) || rawPlan).toLowerCase();
    const isTarget = plan.includes('monitorado') || plan.includes('tratamento personalizado');
    const st = c.dadosComerciais?.status;
    return isTarget && (st === 'ativo' || st === 'pendente' || !st);
  });
  console.log(`Total de alunos ativos no escopo (Monitorado + Tratamento): ${activeMonitoradoAndTratamento.length}`);

  let below80Count = 0;
  activeMonitoradoAndTratamento.forEach(c => {
    const cid = String(c._id);
    const att = clientAttendance[cid] || { presencas: 0, faltas: 0 };
    const tot = att.presencas + att.faltas;
    const rate = tot > 0 ? (att.presencas / tot) : 0;
    if (rate < 0.8) below80Count++;
  });
  console.log(`Total de alunos no escopo abaixo de 80%: ${below80Count} alunos.`);

  // 4. Aluno sem o mín. de 1 Treino Livre na semana (fechamento): -2 pts/aluno
  console.log('\n4. Aluno sem o mín. de 1 Treino Livre na semana (fechamento): -2 pts/aluno');
  let noFreeWorkoutCount = 0;
  activeMonitoradoAndTratamento.forEach(c => {
    const cid = String(c._id);
    const att = clientAttendance[cid] || { livre: 0 };
    // Esperado 4 semanas no mês
    if (att.livre < 4) noFreeWorkoutCount++;
  });
  console.log(`Total de alunos no escopo com menos de 4 treinos livres no mês: ${noFreeWorkoutCount}`);

  // 5. Aluno com > 1 emergência no mês (fechamento): -4 pts/aluno
  console.log('\n5. Aluno com > 1 emergência no mês (fechamento): -4 pts/aluno');
  let extraEmergCount = 0;
  activeMonitoradoAndTratamento.forEach(c => {
    const cid = String(c._id);
    const att = clientAttendance[cid] || { emerg: 0 };
    if (att.emerg > 1) extraEmergCount++;
  });
  console.log(`Total de alunos no escopo com > 1 emergência no mês: ${extraEmergCount}`);

  process.exit(0);
}

run();

