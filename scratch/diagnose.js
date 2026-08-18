const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const match = env.match(/MONGODB_URI=(.+)/);
const uri = match[1].trim().replace(/['"]/g, '');
const mongoose = require('mongoose');

async function diagnose() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // 1. Listar collections
  const cols = await db.listCollections().toArray();
  console.log('=== COLLECTIONS ===');
  cols.forEach(function(c) { console.log(' -', c.name); });

  // 2. Contar docs
  const names = ['physicalassessments', 'physioreports', 'strengthtests', 'prontuarios', 'clients'];
  for (let i = 0; i < names.length; i++) {
    try {
      const count = await db.collection(names[i]).countDocuments();
      console.log('COUNT', names[i], ':', count);
    } catch(e) { console.log('ERROR counting', names[i], e.message); }
  }

  // 3. Mostrar assessment completo
  const assessments = await db.collection('physicalassessments').find({}).toArray();
  console.log('\n=== PHYSICALASSESSMENTS FULL (' + assessments.length + ') ===');
  assessments.forEach(function(a) {
    console.log('  _id:', a._id, '| clienteId:', a.clienteId, '| avaliadorId:', a.avaliadorId, '| data:', a.data);
    console.log('  clienteId type:', typeof a.clienteId, '| toString:', String(a.clienteId));
  });

  // 4. Mostrar reports completo
  const reports = await db.collection('physioreports').find({}).toArray();
  console.log('\n=== PHYSIOREPORTS FULL (' + reports.length + ') ===');
  reports.forEach(function(r) {
    console.log('  _id:', r._id, '| clienteId:', r.clienteId, '| data:', r.data);
    console.log('  clienteId type:', typeof r.clienteId);
  });

  // 5. Verificar clients
  const clients = await db.collection('clients').find({}).toArray();
  console.log('\n=== CLIENTS (' + clients.length + ') ===');
  clients.forEach(function(c) {
    const nome = c.dadosPessoais && c.dadosPessoais.nome ? c.dadosPessoais.nome : c.nome;
    console.log('  _id:', c._id, '| nome:', nome, '| type:', typeof c._id);
  });

  await mongoose.disconnect();
  console.log('\nDone.');
}
diagnose().catch(console.error);
