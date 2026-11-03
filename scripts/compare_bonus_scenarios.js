const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri = '';
env.split('\n').forEach(l => { 
  if (l.trim().startsWith('MONGODB_URI=')) uri = l.trim().replace('MONGODB_URI=', '').trim(); 
});

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('=== ANÁLISE COMPARATIVA DOS CRITÉRIOS DE SOMA (+) ===\n');

  // Clinical breakdown:
  // Pedro: 0 aval (0), 3 testes (12), 6 relat (36) -> 48 pts? Wait! In our current report Pedro had +60 pts!
  // Let's check why Pedro had +60 pts in generate_definitive_report.js:
  // Let's inspect the clinical items of Pedro Grossi in generate_definitive_report.js!
  
  process.exit(0);
}
run();

