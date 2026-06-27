// Script para corrigir dados comerciais de um usuário específico
// Uso: node fix_user_comercial.js savioaugusto7@gmail.com

const mongoose = require('mongoose');

const email = process.argv[2];
if (!email) {
  console.error('❌ Informe o e-mail. Ex: node fix_user_comercial.js seu@email.com');
  process.exit(1);
}

const MONGODB_URI = 'mongodb://savioaugusto:B5ejxcckf@ac-i5efbh4-shard-00-00.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-01.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-02.nmxn7ci.mongodb.net:27017/clubefitness?ssl=true&replicaSet=atlas-nak72p-shard-0&authSource=admin&appName=Cluster0';

async function fix() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado ao MongoDB');

  const User = mongoose.model('User', new mongoose.Schema({ nome: String, email: String, tipo: String }, { strict: false }));
  const Client = mongoose.model('Client', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    cadastroConcluido: Boolean,
    dadosComerciais: { type: Object }
  }, { strict: false }));

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    console.log('⚠️  Nenhum usuário encontrado:', email);
    await mongoose.disconnect();
    return;
  }
  console.log('👤 Usuário:', user.nome, '|', user.email);

  const result = await Client.updateOne(
    { userId: user._id },
    {
      $set: {
        cadastroConcluido: true,
        'dadosComerciais.status': 'pendente',
        'dadosComerciais.creditosTotal': 0,
        'dadosComerciais.creditosUsados': 0,
        'dadosComerciais.creditosReservados': 0,
        'dadosComerciais.creditosMassagemTotal': 0,
        'dadosComerciais.creditosMassagemUsados': 0,
        'dadosComerciais.creditosMassagemReservados': 0,
        'dadosComerciais.frequencia': 0,
        'dadosComerciais.planoId': null,
        'dadosComerciais.vencimento': null,
        'dadosComerciais.dataInicio': null,
      }
    }
  );

  if (result.modifiedCount > 0) {
    console.log('✅ Dados comerciais corrigidos com sucesso!');
    console.log('   Status: pendente | Créditos: 0 | Sem plano');
  } else {
    console.log('⚠️  Nenhum cliente atualizado (verifique se o cliente existe).');
  }

  await mongoose.disconnect();
}

fix().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
