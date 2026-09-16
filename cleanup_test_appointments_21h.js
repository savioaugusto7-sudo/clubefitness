const path = require('path');
const appDir = 'c:/Users/user/.gemini/antigravity-ide/scratch/clubefitness';
const mongoose = require(path.join(appDir, 'node_modules/mongoose'));
const fs = require('fs');

const envContent = fs.readFileSync(path.join(appDir, '.env.local'), 'utf-8');
const match = envContent.match(/MONGODB_URI=(.*)/);
let baseUri = match ? match[1].trim() : null;

async function cleanupDb(dbName) {
  let uri = baseUri;
  if (uri.includes('/clubefitness?')) {
    uri = uri.replace('/clubefitness?', `/${dbName}?`);
  } else if (uri.includes('/test?')) {
    uri = uri.replace('/test?', `/${dbName}?`);
  }

  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;

  const res = await db.collection('appointments').deleteMany({
    tagTeste: { $in: ['TESTE_PWA_SWITCHER_21H', 'TESTE_PWA_SWITCHER_22H'] }
  });

  console.log(`[${dbName}] Removidos ${res.deletedCount} agendamentos de teste.`);
  await conn.close();
}

async function main() {
  await cleanupDb('test');
  await cleanupDb('clubefitness');
  console.log('Limpeza completa concluída com sucesso!');
}

main().catch(console.error);
