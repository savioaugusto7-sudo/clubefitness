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

  const punches = await db.collection('pontorecords').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).sort({ data: 1, horario: 1 }).toArray();

  console.log('--- MARIA LUISA PUNCHES ---');
  punches.filter(p => p.profissionalNome && p.profissionalNome.includes('Maria')).forEach(p => {
    console.log(p.data, p.horario, p.tipo, p.minutosAtraso, p.status);
  });

  console.log('--- THIAGO PUNCHES ---');
  punches.filter(p => p.profissionalNome && p.profissionalNome.includes('Thiago')).forEach(p => {
    console.log(p.data, p.horario, p.tipo, p.minutosAtraso, p.status);
  });

  console.log('--- RUTHI PUNCHES & MISSING DAYS ---');
  const ruthiDates = punches.filter(p => p.profissionalNome && p.profissionalNome.includes('Ruthi')).map(p => p.data);
  console.log('Ruthi dates:', ruthiDates);

  console.log('--- GUILHERME PUNCHES & MISSING DAYS ---');
  const guiDates = punches.filter(p => p.profissionalNome && p.profissionalNome.includes('Guilherme')).map(p => p.data);
  console.log('Gui dates:', guiDates);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
