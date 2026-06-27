const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb://savioaugusto:B5ejxcckf@ac-i5efbh4-shard-00-00.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-01.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-02.nmxn7ci.mongodb.net:27017/admin?ssl=true&replicaSet=atlas-nak72p-shard-0&authSource=admin&appName=Cluster0';

async function list() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Conectado ao MongoDB');

  const adminDb = mongoose.connection.useDb('admin').db;
  const dbs = await adminDb.admin().listDatabases();
  console.log('📂 Bancos de dados disponíveis:');
  for (const dbInfo of dbs.databases) {
    console.log(`- ${dbInfo.name}`);
    const tempDb = mongoose.connection.useDb(dbInfo.name);
    const collections = await tempDb.db.listCollections().toArray();
    console.log(`  Coleções:`, collections.map(c => c.name).join(', '));
    if (collections.some(c => c.name === 'clients')) {
      const Client = tempDb.model('Client', new mongoose.Schema({
        dadosPessoais: { nome: String, cpf: String }
      }, { collection: 'clients' }));
      const clients = await Client.find({}).limit(5);
      console.log(`  Clientes (primeiros 5):`);
      clients.forEach(c => console.log(`    * ${c.dadosPessoais?.nome}: ${c.dadosPessoais?.cpf}`));
      // Unregister model to avoid overwrite error
      delete tempDb.models.Client;
    }
  }

  await mongoose.disconnect();
}

list().catch(err => console.error(err));
