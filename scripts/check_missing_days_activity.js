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

  const profRuthi = await db.collection('professionals').findOne({ nome: /Ruthi/i });
  const profGui = await db.collection('professionals').findOne({ nome: /Guilherme/i });

  console.log('Ruthi ID:', profRuthi?._id);
  console.log('Gui ID:', profGui?._id);

  // Check appointments on 09/10, 13/10, 14/10 for Ruthi
  const ruthiAppts = await db.collection('appointments').find({
    profissionalId: profRuthi?._id,
    data: { $in: ['2026-10-09', '2026-10-13', '2026-10-14'] }
  }).toArray();
  console.log(`Ruthi appointments on missing punch days (09, 13, 14/10): ${ruthiAppts.length}`);

  // Check Gui appointments on 20/10, 27/10
  const guiAppts = await db.collection('appointments').find({
    profissionalId: profGui?._id,
    data: { $in: ['2026-10-20', '2026-10-27'] }
  }).toArray();
  console.log(`Gui appointments on missing punch days (20, 27/10): ${guiAppts.length}`);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

