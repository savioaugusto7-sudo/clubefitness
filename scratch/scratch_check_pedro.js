const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://savioaugusto:B5ejxcckf@ac-i5efbh4-shard-00-00.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-01.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-02.nmxn7ci.mongodb.net:27017/test?ssl=true&replicaSet=atlas-nak72p-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado ao MongoDB');

  const db = mongoose.connection.useDb('test');
  const Client = db.model('Client', new mongoose.Schema({}, { strict: false, collection: 'clients' }));

  const client = await Client.findOne({ 'dadosPessoais.nome': { $regex: 'Pedro Arthur', $options: 'i' } });
  if (!client) {
    console.log('❌ Cliente Pedro Arthur não encontrado!');
    await mongoose.disconnect();
    return;
  }
  console.log(`👤 Nome: ${client.dadosPessoais?.nome}`);
  console.log(`Dados Pessoais:`, JSON.stringify(client.dadosPessoais, null, 2));

  await mongoose.disconnect();
}

run().catch(err => console.error(err));
