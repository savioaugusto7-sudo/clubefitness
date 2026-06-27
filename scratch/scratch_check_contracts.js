const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://savioaugusto:B5ejxcckf@ac-i5efbh4-shard-00-00.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-01.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-02.nmxn7ci.mongodb.net:27017/test?ssl=true&replicaSet=atlas-nak72p-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado ao MongoDB');

  const db = mongoose.connection.useDb('test');
  const Client = db.model('Client', new mongoose.Schema({}, { strict: false, collection: 'clients' }));
  const Contract = db.model('Contract', new mongoose.Schema({}, { strict: false, collection: 'contracts' }));

  const client = await Client.findOne({ 'dadosPessoais.nome': 'Sávio Augusto Oliveira' });
  if (!client) {
    console.log('❌ Cliente Sávio Augusto Oliveira não encontrado!');
    await mongoose.disconnect();
    return;
  }
  console.log(`👤 Cliente ID: ${client._id}`);

  const contracts = await Contract.find({ clientId: client._id }).sort({ createdAt: -1 });
  console.log(`📄 Contratos encontrados (${contracts.length}):`);
  contracts.forEach(c => {
    console.log(`-----------------------------------------------`);
    console.log(`Versão: v${c.versao}`);
    console.log(`Status Local: ${c.status}`);
    console.log(`Status Clicksign: ${c.clicksignStatus}`);
    console.log(`Chave Clicksign: ${c.clicksignDocKey}`);
    console.log(`Criado em: ${c.createdAt}`);
  });

  await mongoose.disconnect();
}

run().catch(err => console.error(err));
