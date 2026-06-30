const mongoose = require('mongoose');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/MONGODB_URI=(.*)/);
const mongoUri = match ? match[1].trim() : null;

// Native crypto helper (duplicate here for script independence)
const crypto = require('crypto');
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 10000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
  return `${salt}:${iterations}:${hash}`;
}

async function run() {
  await mongoose.connect(mongoUri);
  console.log("Connected to Atlas");

  const db = mongoose.connection.client.db("test");
  const email = "teste-credentials@clube.com";

  // Clean old test user if exists
  await db.collection('users').deleteOne({ email });
  
  const hashedPassword = hashPassword("123456");
  const result = await db.collection('users').insertOne({
    nome: "Usuário Teste Senha",
    email: email,
    tipo: 'client',
    roles: ['client'],
    password: hashedPassword,
    needPasswordChange: true,
    isTest: true
  });
  
  console.log(`Created test user ${email} with password '123456' and needPasswordChange: true. User ID: ${result.insertedId}`);

  // Create client profile as well
  await db.collection('clients').deleteOne({ userId: result.insertedId });
  await db.collection('clients').insertOne({
    userId: result.insertedId,
    cadastroConcluido: false,
    dadosPessoais: {
      nome: "Usuário Teste Senha",
      email: email
    }
  });
  console.log(`Created linked client profile for ${email}`);

  await mongoose.disconnect();
}

run().catch(console.error);
