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

  const plans = await db.collection('plans').find({}).toArray();
  const planMap = new Map();
  plans.forEach(p => planMap.set(String(p._id), p.nome));

  const contracts = await db.collection('contracts').find({}).toArray();
  const clientContractMap = new Map();
  contracts.forEach(ct => {
    if (ct.planoNome) clientContractMap.set(String(ct.clientId), ct.planoNome);
  });

  const clients = await db.collection('clients').find({}).toArray();
  const clientMap = new Map();
  clients.forEach(c => {
    const cid = String(c._id);
    const pId = c.dadosComerciais?.planoId ? String(c.dadosComerciais.planoId) : '';
    const rawPlan = planMap.get(pId) || c.dadosComerciais?.contrato || c.dadosComerciais?.planoNome || 'Sem Plano';
    const finalPlan = clientContractMap.get(cid) || rawPlan;
    const lower = finalPlan.toLowerCase();
    const inScope = lower.includes('monitorado') || lower.includes('personalizado') || lower.includes('tratamento');
    clientMap.set(cid, {
      id: cid,
      nome: c.dadosPessoais?.nome || c.nome || 'Cliente',
      plan: finalPlan,
      inScope
    });
  });

  const appts = await db.collection('appointments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' },
    tipo: 'academia'
  }).toArray();

  const allMonthAppts = await db.collection('appointments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  const morningClients = {};
  const eveningClients = {};

  appts.forEach(a => {
    const cid = String(a.clienteId);
    const client = clientMap.get(cid);
    if (!client || !client.inScope) return;

    const timeStr = a.horario || '00:00';
    const hour = parseInt(timeStr.split(':')[0], 10);
    const isMorning = hour >= 6 && hour < 13;

    const targetMap = isMorning ? morningClients : eveningClients;
    if (!targetMap[cid]) {
      targetMap[cid] = {
        id: cid,
        nome: client.nome,
        plan: client.plan,
        presencas: 0,
        faltas: 0
      };
    }

    const st = (a.status || '').toLowerCase();
    if (st === 'presenca' || st === 'presente') targetMap[cid].presencas++;
    else if (st === 'falta') targetMap[cid].faltas++;
  });

  // Also include Sofia Araújo in morning if needed
  clients.forEach(c => {
    const cid = String(c._id);
    const client = clientMap.get(cid);
    if (client && client.inScope && client.nome.includes('Sofia Araújo')) {
      if (!morningClients[cid] && !eveningClients[cid]) {
        morningClients[cid] = {
          id: cid,
          nome: client.nome,
          plan: client.plan,
          presencas: 0,
          faltas: 0
        };
      }
    }
  });

  console.log(`Manhã clients count: ${Object.keys(morningClients).length}`);
  console.log(`Tarde/Noite clients count: ${Object.keys(eveningClients).length}`);

  // Now calculate:
  // 1. Alunos com frequência mensal < 80% (-5 pts/aluno)
  const mList = Object.values(morningClients);
  const eList = Object.values(eveningClients);

  const mBelow80 = mList.filter(c => {
    const tot = c.presencas + c.faltas;
    const rate = tot > 0 ? (c.presencas / tot) * 100 : 0;
    return rate < 80;
  });

  const eBelow80 = eList.filter(c => {
    const tot = c.presencas + c.faltas;
    const rate = tot > 0 ? (c.presencas / tot) * 100 : 0;
    return rate < 80;
  });

  console.log(`\n1. FREQUÊNCIA < 80% (-5 pts/aluno):`);
  console.log(`Manhã: ${mBelow80.length} alunos -> -${mBelow80.length * 5} pts (-${mBelow80.length * 2.5} pts cada co-resp: Cleiton e Ruthi)`);
  mBelow80.forEach(c => console.log(`   - ${c.nome} (${c.plan}): ${c.presencas}P / ${c.faltas}F`));
  
  console.log(`Tarde/Noite: ${eBelow80.length} alunos -> -${eBelow80.length * 5} pts (-${eBelow80.length * 2.5} pts cada co-resp: Matheus e Guilherme)`);
  eBelow80.forEach(c => console.log(`   - ${c.nome} (${c.plan}): ${c.presencas}P / ${c.faltas}F`));

  // 2. Treino livre semanal (< 4 no mês): -2 pts/aluno
  // Count free workouts for each student
  const freeWorkoutsByClient = {};
  allMonthAppts.forEach(a => {
    const cid = String(a.clienteId);
    const serv = (a.servico || '').toLowerCase();
    const tipo = (a.tipo || '').toLowerCase();
    const st = (a.status || '').toLowerCase();
    const isFree = (serv.includes('livre') || tipo.includes('livre') || a.tipoCredito === 'nenhum') && (st === 'presenca' || st === 'presente' || st === 'concluido');
    if (isFree) {
      freeWorkoutsByClient[cid] = (freeWorkoutsByClient[cid] || 0) + 1;
    }
  });

  const mNoLivre = mList.filter(c => (freeWorkoutsByClient[c.id] || 0) < 4);
  const eNoLivre = eList.filter(c => (freeWorkoutsByClient[c.id] || 0) < 4);
  console.log(`\n2. SEM TREINO LIVRE SEMANAL (< 4 no mês) (-2 pts/aluno):`);
  console.log(`Manhã: ${mNoLivre.length} alunos sem 4 treinos livres -> -${mNoLivre.length * 2} pts (-${mNoLivre.length * 1} pts para Cleiton e Ruthi)`);
  console.log(`Tarde/Noite: ${eNoLivre.length} alunos sem 4 treinos livres -> -${eNoLivre.length * 2} pts (-${eNoLivre.length * 1} pts para Matheus e Guilherme)`);

  // 3. Emergências (> 1 no mês): -4 pts/aluno
  const emergByClient = {};
  allMonthAppts.forEach(a => {
    const cid = String(a.clienteId);
    const serv = (a.servico || '').toLowerCase();
    const st = (a.status || '').toLowerCase();
    const isEmerg = (serv.includes('emerg') || a.tipoCredito === 'emergencia') && st !== 'cancelado';
    if (isEmerg) {
      emergByClient[cid] = (emergByClient[cid] || 0) + 1;
    }
  });

  const mExtraEmerg = mList.filter(c => (emergByClient[c.id] || 0) > 1);
  const eExtraEmerg = eList.filter(c => (emergByClient[c.id] || 0) > 1);
  console.log(`\n3. EMERGÊNCIAS EXCEDENTES (> 1 no mês) (-4 pts/aluno):`);
  console.log(`Manhã: ${mExtraEmerg.length} alunos com > 1 emergência -> -${mExtraEmerg.length * 4} pts (-${mExtraEmerg.length * 2} pts para Cleiton e Ruthi)`);
  mExtraEmerg.forEach(c => console.log(`   - ${c.nome}: ${emergByClient[c.id]} emergências`));
  console.log(`Tarde/Noite: ${eExtraEmerg.length} alunos com > 1 emergência -> -${eExtraEmerg.length * 4} pts (-${eExtraEmerg.length * 2} pts para Matheus e Guilherme)`);
  eExtraEmerg.forEach(c => console.log(`   - ${c.nome}: ${emergByClient[c.id]} emergências`));

  process.exit(0);
}

run();
