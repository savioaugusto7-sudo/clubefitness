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
  clients.forEach(c => clientMap.set(String(c._id), c.dadosPessoais?.nome || c.nome));

  function normName(s) {
    if (!s) return 'Não Identificado';
    if (s.toLowerCase().includes('cleiton')) return 'Cleiton Freitas';
    if (s.toLowerCase().includes('matheus')) return 'Matheus Poeiras Luciano';
    if (s.toLowerCase().includes('grossi')) return 'Pedro Grossi';
    if (s.toLowerCase().includes('zauli') || s.toLowerCase().includes('rachel')) return 'Rachel Zauli Serpa';
    if (s.toLowerCase().includes('albert')) return 'Albert Nunes';
    if (s.toLowerCase().includes('guilherme')) return 'Guilherme José Graciano';
    if (s.toLowerCase().includes('ruthi')) return 'Ruthi Novais';
    if (s.toLowerCase().includes('gontijo') || s.toLowerCase().includes('maria luísa') || s.toLowerCase().includes('maria luisa')) return 'Maria Luísa Câmara Gontijo';
    if (s.toLowerCase().includes('thiago')) return 'Thiago Castro Lima Rocha';
    return s;
  }

  const evals = await db.collection('physicalassessments').find({ data: { $gte: '2026-10-01', $lte: '2026-10-31' } }).toArray();
  const tests = await db.collection('strengthtests').find({ data: { $gte: '2026-10-01', $lte: '2026-10-31' } }).toArray();
  const reports = await db.collection('physioreports').find({ data: { $gte: '2026-10-01', $lte: '2026-10-31' } }).toArray();

  const byProf = {};
  ['Pedro Grossi', 'Cleiton Freitas', 'Matheus Poeiras Luciano', 'Rachel Zauli Serpa', 'Albert Nunes', 'Guilherme José Graciano', 'Thiago Castro Lima Rocha', 'Ruthi Novais', 'Maria Luísa Câmara Gontijo'].forEach(p => {
    byProf[p] = { evals: 0, tests: 0, reports: 0, evalPts: 0, testPts: 0, reportPts: 0 };
  });

  let danieleCount = 0;
  evals.forEach(ev => {
    const p = normName(profMap.get(String(ev.profissionalId)) || ev.profissionalNome);
    const clientName = clientMap.get(String(ev.clienteId)) || ev.alunoNome || '';
    const tempo = Number(ev.tempoGastoSegundos) || 0;
    let pontua = tempo >= 60 && tempo <= 3600;
    if (clientName.toLowerCase().includes('daniele debossan') && ev.data === '2026-10-02') {
      danieleCount++;
      if (danieleCount > 1) pontua = false;
    }
    if (byProf[p]) {
      byProf[p].evals++;
      if (pontua) byProf[p].evalPts += 4;
    }
  });

  tests.forEach(t => {
    const p = normName(profMap.get(String(t.profissionalId)) || t.profissionalNome);
    if (byProf[p]) {
      byProf[p].tests++;
      byProf[p].testPts += 4;
    }
  });

  reports.forEach(r => {
    const p = normName(profMap.get(String(r.profissionalId)) || profMap.get(String(r.fisioterapeutaId)) || r.profissionalNome);
    const tempo = Number(r.tempoGastoSegundos) || 0;
    const pontua = tempo <= 7200;
    if (byProf[p]) {
      byProf[p].reports++;
      if (pontua) byProf[p].reportPts += 6;
    }
  });

  console.log('=== DETALHAMENTO DE PROCEDIMENTOS CLÍNICOS PONTUADOS ===');
  Object.entries(byProf).forEach(([p, d]) => {
    console.log(`${p}: Aval=${d.evals} (${d.evalPts}pts) | Testes=${d.tests} (${d.testPts}pts) | Relat=${d.reports} (${d.reportPts}pts) -> Total=${d.evalPts + d.testPts + d.reportPts} pts`);
  });

  process.exit(0);
}
run();

