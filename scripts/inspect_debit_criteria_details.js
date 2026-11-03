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
  const withResp = clients.filter(c => c.dadosClinicos?.profissionalResponsavelId || c.dadosClinicos?.profissionalResponsavelNome);
  console.log('Total clients:', clients.length);
  console.log('Clients com profissional vinculado:', withResp.length);
  withResp.forEach(c => {
    console.log(` - Cliente: ${c.dadosPessoais?.nome || c.nome} -> Resp: ${c.dadosClinicos?.profissionalResponsavelNome || c.dadosClinicos?.profissionalResponsavelId}`);
  });

  // Check appointments in Oct 2026
  const appts = await db.collection('appointments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();
  
  const emerg = appts.filter(a => (a.servico || '').toLowerCase().includes('emerg') || a.tipoCredito === 'emergencia');
  console.log('\nTotal emergencias Oct 2026:', emerg.length);
  
  const emergByClient = {};
  emerg.forEach(a => {
    const cid = String(a.clienteId);
    emergByClient[cid] = (emergByClient[cid] || 0) + 1;
  });
  const clientsWithExtraEmerg = Object.entries(emergByClient).filter(([cid, count]) => count > 1);
  console.log('Clientes com > 1 emergencia no mes:', clientsWithExtraEmerg.length);
  clientsWithExtraEmerg.forEach(([cid, count]) => {
    const cl = clients.find(c => String(c._id) === cid);
    console.log(` - ${cl?.dadosPessoais?.nome || cl?.nome}: ${count} emergencias`);
  });

  // Check treinos livres in Oct 2026
  const freeWorkouts = appts.filter(a => {
    const s = (a.servico || '').toLowerCase();
    const t = (a.tipo || '').toLowerCase();
    return s.includes('livre') || t.includes('livre') || a.treinoLivre === true;
  });
  console.log('\nTotal treinos livres registrados em Oct 2026:', freeWorkouts.length);

  process.exit(0);
}

run();

