const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://savioaugusto:B5ejxcckf@ac-i5efbh4-shard-00-00.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-01.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-02.nmxn7ci.mongodb.net:27017/clubefitness?ssl=true&replicaSet=atlas-nak72p-shard-0&authSource=admin&appName=Cluster0';

async function patch() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado ao MongoDB');

  const Client = mongoose.model('Client', new mongoose.Schema({
    dadosPessoais: {
      nome: String,
      cpf: String,
      email: String
    }
  }, { collection: 'clients' }));

  // Usar o CPF 123.456.789-09 que é matematicamente VÁLIDO!
  const res = await Client.updateOne(
    { 'dadosPessoais.nome': /Sávio/i },
    { $set: { 'dadosPessoais.cpf': '123.456.789-09' } }
  );

  console.log('✏️ Documentos atualizados:', res.modifiedCount);

  const updated = await Client.findOne({ 'dadosPessoais.nome': /Sávio/i });
  console.log('👤 Cliente:', updated.dadosPessoais.nome);
  console.log('📄 CPF Atualizado:', updated.dadosPessoais.cpf);

  await mongoose.disconnect();
}

patch().catch(err => console.error(err));
