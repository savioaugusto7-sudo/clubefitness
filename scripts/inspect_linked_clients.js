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

  const profs = await db.collection('professionals').find({}).toArray();
  const profMap = new Map();
  profs.forEach(p => profMap.set(String(p._id), p.nome));

  const clients = await db.collection('clients').find({}).toArray();
  console.log(`Total clients: ${clients.length}`);

  let linkedCount = 0;
  clients.forEach(c => {
    const respId = c.dadosClinicos?.profissionalResponsavelId;
    if (respId) {
      linkedCount++;
      console.log(`Cliente: ${c.dadosPessoais?.nome || c.nome} | Vinculado: ${profMap.get(String(respId)) || respId} | Plano: ${c.dadosComerciais?.planoNome || c.dadosComerciais?.contrato}`);
    }
  });

  console.log(`Clients with linked professional: ${linkedCount}`);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
