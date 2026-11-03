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

  // Sofia Araújo
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

  const emergenciesByClient = {};
  allMonthAppts.forEach(a => {
    const cid = String(a.clienteId);
    const serv = (a.servico || '').toLowerCase();
    const obs = (a.observacoes || '').toLowerCase();
    const tipo = (a.tipo || '').toLowerCase();
    const isEmerg = serv.includes('emerg') || obs.includes('emerg') || tipo.includes('emerg');
    if (isEmerg) {
      if (!emergenciesByClient[cid]) emergenciesByClient[cid] = [];
      emergenciesByClient[cid].push({ data: a.data, horario: a.horario, servico: a.servico, obs: a.observacoes });
    }
  });

  console.log('=== 1. FREQUÊNCIA < 80% (MANHÃ - 13 ALUNOS) ===');
  const mBelow80 = Object.values(morningClients).filter(c => {
    const tot = c.presencas + c.faltas;
    const rate = tot > 0 ? (c.presencas / tot) * 100 : 0;
    return rate < 80;
  });
  mBelow80.sort((a,b) => a.nome.localeCompare(b.nome)).forEach((c, idx) => {
    const tot = c.presencas + c.faltas;
    const rate = tot > 0 ? ((c.presencas / tot) * 100).toFixed(1) + '%' : 'Sem frequência';
    console.log(`${idx+1}. ${c.nome} | ${c.plan} | ${c.presencas}P / ${c.faltas}F | Taxa: ${rate}`);
  });

  console.log('\n=== 2. FREQUÊNCIA < 80% (TARDE/NOITE - 5 ALUNOS) ===');
  const eBelow80 = Object.values(eveningClients).filter(c => {
    const tot = c.presencas + c.faltas;
    const rate = tot > 0 ? (c.presencas / tot) * 100 : 0;
    return rate < 80;
  });
  eBelow80.sort((a,b) => a.nome.localeCompare(b.nome)).forEach((c, idx) => {
    const tot = c.presencas + c.faltas;
    const rate = tot > 0 ? ((c.presencas / tot) * 100).toFixed(1) + '%' : 'Sem frequência';
    console.log(`${idx+1}. ${c.nome} | ${c.plan} | ${c.presencas}P / ${c.faltas}F | Taxa: ${rate}`);
  });

  console.log('\n=== 3. SEM TREINO LIVRE (MANHÃ - 34 ALUNOS) ===');
  const mNoLivre = Object.values(morningClients).filter(c => (freeWorkoutsByClient[c.id] || 0) < 4);
  mNoLivre.sort((a,b) => a.nome.localeCompare(b.nome)).forEach((c, idx) => {
    console.log(`${idx+1}. ${c.nome} | ${c.plan} | Treinos Livres no Mês: ${freeWorkoutsByClient[c.id] || 0} (Meta: $\\ge$ 4)`);
  });

  console.log('\n=== 4. COM TREINO LIVRE ATINGIDO (MANHÃ - 14 ALUNOS) ===');
  const mWithLivre = Object.values(morningClients).filter(c => (freeWorkoutsByClient[c.id] || 0) >= 4);
  mWithLivre.sort((a,b) => a.nome.localeCompare(b.nome)).forEach((c, idx) => {
    console.log(`${idx+1}. ${c.nome} | ${c.plan} | Treinos Livres no Mês: ${freeWorkoutsByClient[c.id] || 0}`);
  });

  console.log('\n=== 5. SEM TREINO LIVRE (TARDE/NOITE - 42 ALUNOS) ===');
  const eNoLivre = Object.values(eveningClients).filter(c => (freeWorkoutsByClient[c.id] || 0) < 4);
  eNoLivre.sort((a,b) => a.nome.localeCompare(b.nome)).forEach((c, idx) => {
    console.log(`${idx+1}. ${c.nome} | ${c.plan} | Treinos Livres no Mês: ${freeWorkoutsByClient[c.id] || 0} (Meta: $\\ge$ 4)`);
  });

  console.log('\n=== 6. COM TREINO LIVRE ATINGIDO (TARDE/NOITE - 1 ALUNO) ===');
  const eWithLivre = Object.values(eveningClients).filter(c => (freeWorkoutsByClient[c.id] || 0) >= 4);
  eWithLivre.sort((a,b) => a.nome.localeCompare(b.nome)).forEach((c, idx) => {
    console.log(`${idx+1}. ${c.nome} | ${c.plan} | Treinos Livres no Mês: ${freeWorkoutsByClient[c.id] || 0}`);
  });

  console.log('\n=== 7. EMERGÊNCIAS > 1 (MANHÃ - 2 ALUNOS) ===');
  const mEmerg = Object.values(morningClients).filter(c => (emergenciesByClient[c.id] || []).length > 1);
  mEmerg.forEach(c => {
    console.log(`- ${c.nome} | ${c.plan} | Total Ocorrências: ${emergenciesByClient[c.id].length}`);
    emergenciesByClient[c.id].forEach(e => console.log(`    Data: ${e.data} ${e.horario} | ${e.servico} | Obs: ${e.obs}`));
  });

  console.log('\n=== 8. EMERGÊNCIAS > 1 (TARDE/NOITE - 3 ALUNOS) ===');
  const eEmerg = Object.values(eveningClients).filter(c => (emergenciesByClient[c.id] || []).length > 1);
  eEmerg.forEach(c => {
    console.log(`- ${c.nome} | ${c.plan} | Total Ocorrências: ${emergenciesByClient[c.id].length}`);
    emergenciesByClient[c.id].forEach(e => console.log(`    Data: ${e.data} ${e.horario} | ${e.servico} | Obs: ${e.obs}`));
  });

  await mongoose.disconnect();
}
run();
