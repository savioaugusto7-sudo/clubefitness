const mongoose = require('mongoose');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/MONGODB_URI=(.*)/);
const mongoUri = match ? match[1].trim() : null;

async function run() {
  await mongoose.connect(mongoUri);
  console.log("Connected to Atlas");

  const testDb = mongoose.connection.client.db("test");
  const users = await testDb.collection('users').find({}).toArray();
  console.log("Users in 'test' DB:");
  users.forEach(u => {
    console.log(`- ID: ${u._id}, Email: ${u.email}, Tipo: ${u.tipo}, Roles: ${JSON.stringify(u.roles)}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
