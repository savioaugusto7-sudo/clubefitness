const mongoose = require('mongoose');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const match = envFile.match(/MONGODB_URI=(.*)/);
const mongoUri = match ? match[1].trim() : null;

async function run() {
  await mongoose.connect(mongoUri);
  console.log("Connected to Atlas");

  const emails = ['savioaugusto7@gmail.com', 'savio.galo7@gmail.com'];
  const dbNames = ['clubefitness', 'test'];

  for (let dbName of dbNames) {
    const db = mongoose.connection.client.db(dbName);
    for (let email of emails) {
      const user = await db.collection('users').findOne({ email: email.toLowerCase() });
      if (user) {
        console.log(`Found user ${email} in ${dbName}`);
        await db.collection('users').updateOne(
          { _id: user._id },
          { 
            $set: { 
              tipo: 'admin',
              roles: ['admin', 'receptionist', 'professional', 'client'] 
            } 
          }
        );
        console.log(`Updated user ${email} in ${dbName} with all active roles!`);
      }
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
