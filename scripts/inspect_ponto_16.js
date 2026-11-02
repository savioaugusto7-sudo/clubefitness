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

  const profs = await db.collection('professionals').find({}).toArray();
  for (const p of profs) {
    console.log(p.nome, 'horarioTrabalho:', p.horarioTrabalho, 'turnos:', p.turnos, 'cargo:', p.cargo);
  }

  const oct1Punches = await db.collection('pontorecords').find({
    data: '2026-10-01'
  }).toArray();
  console.log('--- 2026-10-01 punches ---');
  for (const pc of oct1Punches) {
    console.log(pc.profissionalNome, pc.entrada, pc.saida, pc.horarioEsperado, pc.status);
  }

  process.exit(0);
}

run();

