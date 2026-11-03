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

  const profs = await db.collection('professionals').find({}).toArray();
  const profMap = new Map();
  profs.forEach(p => profMap.set(String(p._id), p.nome));

  const clients = await db.collection('clients').find({}).toArray();
  const clientMap = new Map();
  clients.forEach(c => clientMap.set(String(c._id), c));

  const evals = await db.collection('physicalassessments').find({ data: { $gte: '2026-10-01', $lte: '2026-10-31' } }).toArray();
  const tests = await db.collection('strengthtests').find({ data: { $gte: '2026-10-01', $lte: '2026-10-31' } }).toArray();
  const reports = await db.collection('physioreports').find({ data: { $gte: '2026-10-01', $lte: '2026-10-31' } }).toArray();

  console.log('=== 1. CLINICAL PROCEDURES BREAKDOWN BY PROFESSIONAL ===');
  const clinicalByProf = {};
  profs.forEach(p => {
    clinicalByProf[p.nome] = {
      evals: 0,
      evalPts: 0,
      tests: 0,
      testPts: 0,
      reports: 0,
      reportPts: 0,
      fichas: 0,
      fichaPts: 0
    };
  });

  evals.forEach(ev => {
    const pName = profMap.get(String(ev.profissionalId));
    if (clinicalByProf[pName]) {
      clinicalByProf[pName].evals++;
      clinicalByProf[pName].evalPts += 4;
    }
  });

  tests.forEach(t => {
    const pName = profMap.get(String(t.profissionalId));
    if (clinicalByProf[pName]) {
      clinicalByProf[pName].tests++;
      clinicalByProf[pName].testPts += 4;
    }
  });

  reports.forEach(r => {
    const pName = profMap.get(String(r.profissionalId));
    if (clinicalByProf[pName]) {
      // check if extrapolated > 120 min
      const durSeconds = r.duracaoSegundos || 0;
      if (durSeconds <= 7200) {
        clinicalByProf[pName].reports++;
        clinicalByProf[pName].reportPts += 6;
      }
    }
  });

  Object.entries(clinicalByProf).forEach(([name, data]) => {
    const total = data.evalPts + data.testPts + data.reportPts;
    if (total > 0) {
      console.log(`${name}: Total Clinica = ${total} pts (Aval: ${data.evals} = ${data.evalPts}pts, Testes: ${data.tests} = ${data.testPts}pts, Relat: ${data.reports} = ${data.reportPts}pts)`);
    }
  });

  // Check workout sheets in Oct
  console.log('\n=== 2. WORKOUT SHEET CREATION / UPDATE IN OCT ===');
  let totalSheetsInOct = 0;
  clients.forEach(c => {
    const workouts = c.treinos || c.workouts || [];
    workouts.forEach(w => {
      const d = (w.dataCriacao || w.createdAt || '').slice(0, 10);
      if (d >= '2026-10-01' && d <= '2026-10-31') {
        totalSheetsInOct++;
        console.log(`Ficha criada: ${c.dadosPessoais?.nome || c.nome} em ${d} por prof ${profMap.get(String(w.profissionalId))}`);
      }
      if (w.historicoAtualizacoes) {
        w.historicoAtualizacoes.forEach(h => {
          const hd = (h.data || h.updatedAt || '').slice(0, 10);
          if (hd >= '2026-10-01' && hd <= '2026-10-31') {
            totalSheetsInOct++;
            console.log(`Ficha atualizada: ${c.dadosPessoais?.nome || c.nome} em ${hd} por prof ${profMap.get(String(h.profissionalId))}`);
          }
        });
      }
    });
  });
  console.log(`Total sheets in Oct: ${totalSheetsInOct}`);

  process.exit(0);
}
run();

