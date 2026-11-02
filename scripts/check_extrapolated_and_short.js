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

  const firstDayStr = '2026-10-01';
  const lastDayStr = '2026-10-31';

  // 1. Procedimentos que extrapolaram o tempo
  const assessments = await db.collection('physicalassessments').find({
    data: { $gte: firstDayStr, $lte: lastDayStr }
  }).toArray();

  const reports = await db.collection('physioreports').find({
    data: { $gte: firstDayStr, $lte: lastDayStr }
  }).toArray();

  const strength = await db.collection('strengthtests').find({
    data: { $gte: firstDayStr, $lte: lastDayStr }
  }).toArray();

  const profs = await db.collection('professionals').find({}).toArray();
  const profMap = new Map();
  profs.forEach(p => profMap.set(String(p._id), p.nome));

  const clients = await db.collection('clients').find({}).toArray();
  const clientMap = new Map();
  clients.forEach(c => clientMap.set(String(c._id), c.dadosPessoais?.nome || c.nome));

  console.log('=== PROCEDIMENTOS QUE EXTRAPOLARAM O TEMPO (SLA MAXIMO) ===');
  reports.filter(r => (Number(r.tempoGastoSegundos) || 0) > 7200).forEach(r => {
    const sec = Number(r.tempoGastoSegundos);
    const prof = profMap.get(String(r.profissionalId || r.fisioterapeutaId)) || r.profissionalNome;
    const client = clientMap.get(String(r.clienteId)) || r.alunoNome;
    console.log(`[RELATÓRIO > 2h] Data: ${r.data} | Aluno: ${client} | Prof: ${prof} | Duração: ${Math.floor(sec/60)}m ${sec%60}s (${(sec/3600).toFixed(1)}h) | Limite: 2h (7200s)`);
  });

  assessments.filter(a => (Number(a.tempoGastoSegundos) || 0) > 3600).forEach(a => {
    const sec = Number(a.tempoGastoSegundos);
    const prof = profMap.get(String(a.avaliadorId)) || a.avaliadorNome;
    const client = clientMap.get(String(a.clienteId)) || a.alunoNome;
    console.log(`[AVALIAÇÃO > 1h] Data: ${a.data} | Aluno: ${client} | Prof: ${prof} | Duração: ${Math.floor(sec/60)}m ${sec%60}s | Limite: 1h (3600s)`);
  });

  console.log('\n=== AVALIAÇÕES E RELATÓRIOS < 15 MIN (900s) ===');
  assessments.filter(a => {
    const s = Number(a.tempoGastoSegundos) || 0;
    return s < 900;
  }).forEach(a => {
    const sec = Number(a.tempoGastoSegundos);
    const prof = profMap.get(String(a.avaliadorId)) || a.avaliadorNome;
    const client = clientMap.get(String(a.clienteId)) || a.alunoNome;
    console.log(`[AVALIAÇÃO < 15m] Data: ${a.data} | Aluno: ${client} | Prof: ${prof} | Duração: ${Math.floor(sec/60)}m ${sec%60}s (${sec}s)`);
  });

  reports.filter(r => {
    const s = Number(r.tempoGastoSegundos) || 0;
    return s < 900;
  }).forEach(r => {
    const sec = Number(r.tempoGastoSegundos);
    const prof = profMap.get(String(r.profissionalId || r.fisioterapeutaId)) || r.profissionalNome;
    const client = clientMap.get(String(r.clienteId)) || r.alunoNome;
    console.log(`[RELATÓRIO < 15m] Data: ${r.data} | Aluno: ${client} | Prof: ${prof} | Duração: ${Math.floor(sec/60)}m ${sec%60}s (${sec}s)`);
  });

  console.log('\n=== TESTES DE FORÇA (QUALQUER TEMPO REGISTRADO) ===');
  strength.forEach(s => {
    const sec = Number(s.tempoGastoSegundos);
    const prof = profMap.get(String(s.profissionalId)) || s.profissionalNome;
    const client = clientMap.get(String(s.clienteId)) || s.alunoNome;
    console.log(`[TESTE FORÇA] Data: ${s.data} | Aluno: ${client} | Prof: ${prof} | Duração: ${Math.floor(sec/60)}m ${sec%60}s`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

