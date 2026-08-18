const mongoose = require('mongoose');
const uri = 'mongodb://savioaugusto:B5ejxcckf@ac-i5efbh4-shard-00-00.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-01.nmxn7ci.mongodb.net:27017,ac-i5efbh4-shard-00-02.nmxn7ci.mongodb.net:27017/clubefitness?ssl=true&replicaSet=atlas-nak72p-shard-0&authSource=admin&appName=Cluster0';

async function run() {
  await mongoose.connect(uri);
  const Client = mongoose.model('Client', new mongoose.Schema({}, { strict: false }));
  const Renewal = mongoose.model('RenewalProposal', new mongoose.Schema({}, { strict: false }));
  const Contract = mongoose.model('Contract', new mongoose.Schema({}, { strict: false }));

  const clients = await Client.find({});
  console.log('CLIENT NAMES:', clients.map(c => ({ id: c._id, nome: c.dadosPessoais?.nome || c.nome })));
  const renewals = await Renewal.find({}).sort({ createdAt: -1 }).limit(5);
  console.log('LATEST RENEWALS:', JSON.stringify(renewals, null, 2));
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
