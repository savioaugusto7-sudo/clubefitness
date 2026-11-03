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

  const professionals = await db.collection('professionals').find({}).toArray();
  professionals.forEach(p => console.log(p.nome, String(p._id)));

  const clients = await db.collection('clients').find({}).toArray();
  const profCounts = {};
  clients.forEach(c => {
    if (c.profissionalId) {
      const pid = String(c.profissionalId);
      profCounts[pid] = (profCounts[pid] || 0) + 1;
    }
  });
  console.log('Prof counts in clients.profissionalId:', profCounts);

  process.exit(0);
}

run();
