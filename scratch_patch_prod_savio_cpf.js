const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://savioaugusto:B5ejxcckf@ac-i5efbh4-shard-00-00.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-01.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-02.nmxn7ci.mongodb.net:27017/test?ssl=true&replicaSet=atlas-nak72p-shard-0&authSource=admin&appName=Cluster0';

async function patch() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado ao MongoDB (banco de dados: test)');

  const Client = mongoose.model('Client', new mongoose.Schema({
    dadosPessoais: {
      nome: String,
      cpf: String,
      email: String
    }
  }, { collection: 'clients' }));

  // Atualizar para o CPF matematicamente válido 130.779.756-34
  const res = await Client.updateOne(
    { 'dadosPessoais.nome': /Sávio Augusto Oliveira/i },
    { $set: { 'dadosPessoais.cpf': '130.779.756-34' } }
  );

  console.log('✏️ Documentos atualizados:', res.modifiedCount);

  const updated = await Client.findOne({ 'dadosPessoais.nome': /Sávio Augusto Oliveira/i });
  if (updated) {
    console.log('👤 Cliente:', updated.dadosPessoais.nome);
    console.log('📄 CPF Atualizado:', updated.dadosPessoais.cpf);
  } else {
    console.log('⚠️ Cliente não encontrado para verificação.');
  }

  await mongoose.disconnect();
}

patch().catch(err => console.error(err));
