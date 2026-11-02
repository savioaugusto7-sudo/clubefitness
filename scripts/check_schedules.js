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

  const schedules = await db.collection('professionalschedules').find({}).toArray();
  console.log(`Found ${schedules.length} schedules.`);
  schedules.forEach(s => {
    console.log(`--- Prof: ${s.profissionalNome} (ID: ${s.profissionalId}) ---`);
    console.log(JSON.stringify(s.diasSemana, null, 2));
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

