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

  console.log('--- SCORE ADJUSTMENTS ---');
  const adjustments = await db.collection('scoreadjustments').find({}).toArray();
  console.log(JSON.stringify(adjustments, null, 2));

  console.log('--- PROFESSIONALS ---');
  const profs = await db.collection('professionals').find({}).toArray();
  profs.forEach(p => {
    console.log(`Prof: ${p.nome} | ID: ${p._id} | Cargo: ${p.cargo} | Horário:`, p.horarioTrabalho || p.horarios || p.escala);
  });

  console.log('--- PONTO RECORDS BY PROFESSOR IN OCT 2026 ---');
  const punches = await db.collection('pontorecords').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();
  console.log(`Total punches: ${punches.length}`);

  const byProf = {};
  punches.forEach(p => {
    const nome = p.profissionalNome || 'Sem Nome';
    if (!byProf[nome]) byProf[nome] = [];
    byProf[nome].push(p);
  });

  for (const [name, recs] of Object.entries(byProf)) {
    const dates = [...new Set(recs.map(r => r.data))].sort();
    console.log(`${name}: ${recs.length} batidas em ${dates.length} dias distintos. Dias: ${dates.join(', ')}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

