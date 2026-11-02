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
  }).toArray();
  
  // Look for any record where entrada or horaEntrada or whatever is 14:14
  console.log('Total records:', punches.length);
  if (punches.length > 0) {
    console.log('Sample record keys:', Object.keys(punches[0]));
    console.log('Sample record:', punches[0]);
  }

  const p1414 = punches.filter(p => JSON.stringify(p).includes('14:14'));
  console.log('Records matching 14:14:', p1414);

  const p16 = punches.filter(p => JSON.stringify(p).includes('16:00'));
  console.log('Records matching 16:00:', p16);

  process.exit(0);
}

run();
