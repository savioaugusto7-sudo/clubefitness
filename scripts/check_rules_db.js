const mongoose = require('mongoose');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
let uri = '';
env.split('\n').forEach(l => { if (l.trim().startsWith('MONGODB_URI=')) uri = l.trim().replace('MONGODB_URI=', '').trim(); });

async function check() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('--- Setting and Rule configurations in DB ---');
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));

  const settings = await db.collection('settings').find({}).toArray();
  console.log('Settings:', settings);

  process.exit(0);
}
check();

