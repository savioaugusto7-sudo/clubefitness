const mongoose = require('mongoose');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let uri = '';
env.split('\n').forEach(l => { if (l.trim().startsWith('MONGODB_URI=')) uri = l.trim().replace('MONGODB_URI=', '').trim(); });

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const appts = await db.collection('appointments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' },
    tipo: 'academia'
  }).toArray();

  const clients = await db.collection('clients').find({}).toArray();
  const clientMap = new Map();
  clients.forEach(c => clientMap.set(String(c._id), c));

  const plans = await db.collection('plans').find({}).toArray();
  const planMap = new Map();
  plans.forEach(p => planMap.set(String(p._id), p.nome));

  const contracts = await db.collection('contracts').find({}).toArray();
  const contractMap = new Map();
  contracts.forEach(ct => { if (ct.planoNome) contractMap.set(String(ct.clientId), ct.planoNome); });

  function getClientPlan(cid) {
    const c = clientMap.get(cid);
    if (!c) return 'Sem Plano';
    const pId = c.dadosComerciais?.planoId ? String(c.dadosComerciais.planoId) : '';
    return contractMap.get(cid) || planMap.get(pId) || c.dadosComerciais?.contrato || c.dadosComerciais?.planoNome || 'Sem Plano';
  }

  const studentStats = {};

  appts.forEach(ap => {
    if (ap.status === 'cancelado') return;
    const cid = String(ap.clienteId);
    const plan = getClientPlan(cid);
    const lower = plan.toLowerCase();
    const inScope = lower.includes('monitorado') || lower.includes('personalizado') || lower.includes('tratamento');
    if (!inScope) return;

    const h = parseInt(ap.horario?.slice(0, 2) || '0', 10);
    // Transição 13h no dia 23/10 alocada para Tarde/Noite
    let turno = h < 13 ? 'Manhã' : 'Tarde/Noite';

    if (!studentStats[cid]) {
      const cObj = clientMap.get(cid);
      studentStats[cid] = {
        cid,
        nome: cObj?.dadosPessoais?.nome || cObj?.nome || ap.clienteNome || 'Aluno',
        plan,
        turno,
        presencas: 0,
        faltas: 0,
        agendados: 0,
        total: 0
      };
    }

    if (ap.status === 'presenca') {
      studentStats[cid].presencas++;
    } else if (ap.status === 'falta') {
      studentStats[cid].faltas++;
    } else if (ap.status === 'agendado') {
      studentStats[cid].agendados++;
    }
    studentStats[cid].total++;
  });

  const studentsList = Object.values(studentStats);
  const manhaStudents = studentsList.filter(s => s.turno === 'Manhã');
  const tardeStudents = studentsList.filter(s => s.turno === 'Tarde/Noite');

  console.log(`TOTAL ALUNOS NO ESCOPO: ${studentsList.length}`);
  console.log(`Manhã: ${manhaStudents.length} | Tarde/Noite: ${tardeStudents.length}`);

  function analyze(list, name) {
    console.log(`\n=================== ${name} ===================`);
    const bateram = [];
    const perderam = [];

    list.forEach(s => {
      const realizadas = s.presencas + s.faltas;
      const pct = realizadas > 0 ? (s.presencas / realizadas) * 100 : 0;
      s.realizadas = realizadas;
      s.pct = pct;
      if (pct >= 80 && s.presencas >= 1) {
        bateram.push(s);
      } else {
        perderam.push(s);
      }
    });

    console.log(`ALUNOS QUE BATERAM A META (>= 80%): ${bateram.length} (${((bateram.length / list.length) * 100).toFixed(1)}%)`);
    console.log(`ALUNOS QUE NÃO BATERAM A META (< 80%): ${perderam.length} (${((perderam.length / list.length) * 100).toFixed(1)}%)`);

    console.log('\n--- LISTA DOS QUE PERDERAM A META ---');
    perderam.sort((a, b) => b.pct - a.pct);
    perderam.forEach(p => {
      console.log(`${p.nome} | Plano: ${p.plan} | Presenças: ${p.presencas} | Faltas: ${p.faltas} | Realizadas: ${p.realizadas} | Taxa: ${p.pct.toFixed(1)}% | Agendados s/ baixa: ${p.agendados}`);
    });

    return { bateram, perderam };
  }

  const resManha = analyze(manhaStudents, 'TURNO MANHÃ (06h às 12h)');
  const resTarde = analyze(tardeStudents, 'TURNO TARDE/NOITE (13h às 21h)');

  process.exit(0);
}
run();
