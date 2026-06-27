// Script para resetar um usuário pelo e-mail
// Uso: node reset_user.js savioaugusto7@gmail.com

const mongoose = require('mongoose');

const email = process.argv[2];

if (!email) {
  console.error('❌ Informe o e-mail. Exemplo: node reset_user.js seu@email.com');
  process.exit(1);
}

const MONGODB_URI = 'mongodb://savioaugusto:B5ejxcckf@ac-i5efbh4-shard-00-00.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-01.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-02.nmxn7ci.mongodb.net:27017/clubefitness?ssl=true&replicaSet=atlas-nak72p-shard-0&authSource=admin&appName=Cluster0';

async function reset() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado ao MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({
    nome: String,
    email: String,
    tipo: String,
  }));

  const Client = mongoose.model('Client', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    dadosPessoais: Object,
    dadosComerciais: Object,
    cadastroConcluido: Boolean,
  }));

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    console.log('⚠️  Nenhum usuário encontrado com o e-mail:', email);
    await mongoose.disconnect();
    return;
  }

  console.log('👤 Usuário encontrado:', user.nome, '| tipo:', user.tipo);

  const deletedClient = await Client.deleteMany({ userId: user._id });
  console.log(`🗑️  Clientes deletados: ${deletedClient.deletedCount}`);

  const deletedUser = await User.deleteOne({ _id: user._id });
  console.log(`🗑️  Usuário deletado: ${deletedUser.deletedCount}`);

  console.log('');
  console.log('✅ Pronto! Agora faça login novamente em clubefitness.vercel.app');
  console.log('   O sistema irá criar um novo registro e redirecionar para o onboarding.');

  await mongoose.disconnect();
}

reset().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
