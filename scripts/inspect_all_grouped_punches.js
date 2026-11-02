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

  const grouped = {};
  punches.forEach(p => {
    if (!grouped[p.profissionalNome]) grouped[p.profissionalNome] = [];
    grouped[p.profissionalNome].push(`${p.data}: ${p.horario} (esp: ${p.horarioEsperado})`);
  });

  for (const [name, list] of Object.entries(grouped)) {
    console.log(`=== ${name} (${list.length} batidas) ===`);
    console.log(list.slice(0, 5).join('\n'));
    console.log('...');
    console.log(list.slice(-3).join('\n'));
  }

  process.exit(0);
}

run();

