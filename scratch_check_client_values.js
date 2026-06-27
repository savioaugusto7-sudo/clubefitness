const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://savioaugusto:B5ejxcckf@ac-i5efbh4-shard-00-00.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-01.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-02.nmxn7ci.mongodb.net:27017/clubefitness?ssl=true&replicaSet=atlas-nak72p-shard-0&authSource=admin&appName=Cluster0';

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado ao MongoDB');

  const Client = mongoose.model('Client', new mongoose.Schema({
    dadosPessoais: { nome: String },
    dadosComerciais: Object
  }, { collection: 'clients' }));

  const all = await Client.find({}).sort({ createdAt: -1 });
  all.forEach(c => {
    console.log(`👤 Cliente: ${c.dadosPessoais?.nome}`);
    console.log(`💼 Dados Comerciais:`, JSON.stringify(c.dadosComerciais, null, 2));
    console.log('---');
  });

  await mongoose.disconnect();
}

check().catch(err => console.error(err));
