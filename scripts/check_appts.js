const mongoose = require('mongoose');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let uri = '';
env.split('\n').forEach(l => { if (l.trim().startsWith('MONGODB_URI=')) uri = l.trim().replace('MONGODB_URI=', '').trim(); });

async function check() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const appts = await db.collection('appointments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' },
    tipo: 'academia'
  }).toArray();

  const statuses = {};
  const presencas = {};
  appts.forEach(a => {
    statuses[a.status] = (statuses[a.status] || 0) + 1;
    presencas[String(a.presenca)] = (presencas[String(a.presenca)] || 0) + 1;
  });

  console.log('Statuses:', statuses);
  console.log('Presencas:', presencas);

  const samplePresente = appts.find(a => a.presenca === true || a.status === 'presente' || a.status === 'concluido');
  console.log('Sample presente:', samplePresente);

  process.exit(0);
}
check();

