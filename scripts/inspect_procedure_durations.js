const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri = '';
env.split('\n').forEach(l => { 
  if (l.trim().startsWith('MONGODB_URI=')) {
    uri = l.trim().replace('MONGODB_URI=', '').trim(); 
  }
});

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const assessments = await db.collection('physicalassessments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  const reports = await db.collection('physioreports').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  const strength = await db.collection('strengthtests').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  console.log('=== AVALIAÇÕES FÍSICAS ===');
  assessments.forEach(a => {
    const sec = Number(a.tempoGastoSegundos) || 0;
    const min = (sec / 60).toFixed(1);
    console.log(`[${a.data}] ${a.alunoNome || a.clienteNome || a.clienteId} | Prof: ${a.avaliadorNome || a.avaliadorId} | Duração: ${sec}s (${min} min)`);
  });

  console.log('\n=== RELATÓRIOS FISIOTERÁPICOS ===');
  reports.forEach(r => {
    const sec = Number(r.tempoGastoSegundos) || 0;
    const min = (sec / 60).toFixed(1);
    console.log(`[${r.data}] ${r.alunoNome || r.clienteNome || r.clienteId} | Prof: ${r.fisioterapeutaNome || r.profissionalNome} | Duração: ${sec}s (${min} min)`);
  });

  console.log('\n=== TESTES DE FORÇA ===');
  strength.forEach(s => {
    const sec = Number(s.tempoGastoSegundos) || 0;
    const min = (sec / 60).toFixed(1);
    console.log(`[${s.data}] ${s.alunoNome || s.clienteNome || s.clienteId} | Prof: ${s.profissionalNome} | Duração: ${sec}s (${min} min)`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

