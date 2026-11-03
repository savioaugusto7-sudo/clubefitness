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

  const clients = await db.collection('clients').find({}).toArray();
  const sample = clients[0];
  console.log('Sample client keys:', Object.keys(sample));
  console.log('dadosClinicos sample:', sample.dadosClinicos);
  console.log('dadosComerciais sample:', sample.dadosComerciais);

  // Check contracts
  const contracts = await db.collection('contracts').find({}).toArray();
  console.log('\nTotal contracts:', contracts.length);
  if (contracts.length > 0) {
    console.log('Contract sample keys:', Object.keys(contracts[0]));
    console.log('Contract sample:', contracts[0]);
  }

  // Check clientworkouts
  const workouts = await db.collection('clientworkouts').find({}).toArray();
  console.log('\nTotal clientworkouts:', workouts.length);
  if (workouts.length > 0) {
    console.log('Workout sample keys:', Object.keys(workouts[0]));
  }

  process.exit(0);
}

run();

