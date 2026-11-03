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

  console.log('=== AUDITORIA COMPLETA DE TODOS OS BÔNUS (+) ===');

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
      inScope,
      respProfId: c.dadosClinicos?.profissionalResponsavelId ? String(c.dadosClinicos.profissionalResponsavelId) : null
    });
  });

  const profs = await db.collection('professionals').find({}).toArray();
  const profMap = new Map();
  profs.forEach(p => profMap.set(String(p._id), p.nome));

  // 1. Procedimentos Clínicos (+)
  // - Avaliação Física <= 1h: +4 pts
  // - Teste de Força <= 1h: +4 pts
  // - Relatório Fisioterápico <= 2h: +6 pts
  const assessments = await db.collection('assessments').find({ data: { $gte: '2026-10-01', $lte: '2026-10-31' } }).toArray();
  const strengthTests = await db.collection('strengthtests').find({ data: { $gte: '2026-10-01', $lte: '2026-10-31' } }).toArray();
  const reports = await db.collection('physioreports').find({ data: { $gte: '2026-10-01', $lte: '2026-10-31' } }).toArray();

  console.log(`\n1. PROCEDIMENTOS CLÍNICOS:`);
  console.log(`- Avaliações: ${assessments.length}`);
  console.log(`- Testes de Força: ${strengthTests.length}`);
  console.log(`- Relatórios Fisioterápicos: ${reports.length}`);

  // 2. Fichas de Treino montadas em <= 24h (+2 resp / +2 exec)
  // Check how route.ts collects workoutUpdateEvents
  let workoutUpdateEvents = [];
  clients.forEach(c => {
    const workouts = c.treinos || c.workouts || [];
    workouts.forEach((w, wIdx) => {
      const sheetName = w.nome || `Treino ${wIdx + 1}`;
      if (w.createdAt || w.dataCriacao) {
        const dStr = (w.createdAt || w.dataCriacao || '').slice(0, 10);
        if (dStr >= '2026-10-01' && dStr <= '2026-10-31') {
          workoutUpdateEvents.push({
            clientId: String(c._id),
            data: dStr,
            createdAt: w.createdAt || w.dataCriacao,
            profId: w.profissionalId || w.criadoPorId,
            sheetName
          });
        }
      }
      if (Array.isArray(w.historicoAtualizacoes)) {
        w.historicoAtualizacoes.forEach(h => {
          const dStr = (h.data || h.updatedAt || '').slice(0, 10);
          if (dStr >= '2026-10-01' && dStr <= '2026-10-31') {
            workoutUpdateEvents.push({
              clientId: String(c._id),
              data: dStr,
              createdAt: h.data || h.updatedAt,
              profId: h.profissionalId || h.atualizadoPorId,
              sheetName
            });
          }
        });
      }
    });
  });
  console.log(`\n2. FICHAS DE TREINO CRIADAS/ATUALIZADAS EM OUTUBRO: ${workoutUpdateEvents.length}`);
  workoutUpdateEvents.forEach(w => {
    const c = clientMap.get(w.clientId);
    console.log(`   - Data: ${w.data} | Aluno: ${c?.nome} | Sheet: ${w.sheetName} | ProfId: ${w.profId} (${profMap.get(String(w.profId))})`);
  });

  // 3. Frequência, Treino Livre e Emergências por Turno
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

  const mList = Object.values(morningClients);
  const eList = Object.values(eveningClients);

  console.log(`\n3. PILARES DE RETENÇÃO E FECHAMENTO:`);
  console.log(`--- TURNO MANHÃ (Total: ${mList.length} alunos) ---`);
  // Frequência >= 80% (+7 resp div 50/50: +3.5 cada / +2 equipe)
  const mFreqOk = mList.filter(c => {
    const tot = c.presencas + c.faltas;
    const rate = tot > 0 ? (c.presencas / tot) * 100 : 0;
    return rate >= 80;
  });
  console.log(`- Frequência >= 80%: ${mFreqOk.length} alunos (Meta Turno)`);

  // Treino Livre Semanal (mín 1 na semana = 4 no mês): +2 pts/aluno no fechamento
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

  const mTreinoLivreOk = mList.filter(c => (freeWorkoutsByClient[c.id] || 0) >= 4);
  console.log(`- Treino Livre >= 4 no mês: ${mTreinoLivreOk.length} alunos (+2 pts/aluno = +${mTreinoLivreOk.length * 2} pts)`);

  // Emergências <= 1 no mês: +3 pts/aluno no fechamento
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

  const mEmergOk = mList.filter(c => (emergByClient[c.id] || 0) <= 1);
  console.log(`- Emergências <= 1 no mês: ${mEmergOk.length} alunos (+3 pts/aluno = +${mEmergOk.length * 3} pts)`);

  console.log(`\n--- TURNO TARDE/NOITE (Total: ${eList.length} alunos) ---`);
  const eFreqOk = eList.filter(c => {
    const tot = c.presencas + c.faltas;
    const rate = tot > 0 ? (c.presencas / tot) * 100 : 0;
    return rate >= 80;
  });
  console.log(`- Frequência >= 80%: ${eFreqOk.length} alunos (Meta Turno)`);
  const eTreinoLivreOk = eList.filter(c => (freeWorkoutsByClient[c.id] || 0) >= 4);
  console.log(`- Treino Livre >= 4 no mês: ${eTreinoLivreOk.length} alunos (+2 pts/aluno = +${eTreinoLivreOk.length * 2} pts)`);
  const eEmergOk = eList.filter(c => (emergByClient[c.id] || 0) <= 1);
  console.log(`- Emergências <= 1 no mês: ${eEmergOk.length} alunos (+3 pts/aluno = +${eEmergOk.length * 3} pts)`);

  process.exit(0);
}
run();

