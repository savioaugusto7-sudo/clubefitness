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
  const albertClients = clients.filter(c => {
    const st = c.dadosComerciais?.status;
    return (st === 'ativo' || st === 'pendente') && String(c.profissionalId) === '6668aa010101010101010101'; // Albert
  });

  console.log('Albert clients count:', albertClients.length);
  albertClients.forEach(c => {
    console.log(`- ${c.dadosPessoais?.nome || c.nome} | Plano: ${c.dadosComerciais?.contrato || c.plano || 'Sem Plano'} | Status: ${c.dadosComerciais?.status}`);
  });

  process.exit(0);
}

run();

