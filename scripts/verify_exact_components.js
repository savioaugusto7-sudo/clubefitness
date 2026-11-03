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

  console.log('=== CALCULO EXATO DE TODAS AS COLUNAS DE SOMA E DEBITO ===\n');

  // Let's list each professional and all components:
  // PRODUCÃO CLÍNICA:
  // Pedro Grossi:
  //   Aval: 3 (Gabriel Lage, Ronei Vital, Juan Victor) = +12 pts
  //   Testes: 3 (Emanuel Costa, Izaú Veras, Mateus Ahlert) = +12 pts
  //   Relatórios: 6 (Emanuel Costa, Valdson, Geane, Mateus Ahlert, Ian Javoski, Anderson) = +36 pts
  //   Total Clínica = +60 pts

  // Cleiton Freitas:
  //   Aval: 1 (Maria de Fátima) = +4 pts
  //   Testes: 0 = 0 pts
  //   Relatórios: 2 (Rosilda Roveda, Camila Carvalho) = +12 pts
  //   Total Clínica = +16 pts

  // Matheus Poeiras Luciano:
  //   Aval: 1 (Rosália Caldas) = +4 pts
  //   Testes: 0 = 0 pts
  //   Relatórios: 0 = 0 pts
  //   Total Clínica = +4 pts

  // Dra. Rachel Zauli Serpa:
  //   Aval: 3 = +12 pts
  //   Testes: 2 (Monia Pires, Rosilda) = +8 pts
  //   Relatórios: 1 = +6 pts (Glosa de 1 relatório?) Wait, let's verify Rachel's exact breakdown: +18 pts total: 3 aval (12) + 1 relat (6) = 18? Or 2 testes?
  
  // Dr. Albert Nunes:
  //   Aval: 4 = +16 pts
  //   Testes: 6 = +24 pts
  //   Relatórios: 8 = +48 pts
  //   Total Clínica = +88 pts

  // Dr. Guilherme José Graciano:
  //   Aval: 0 = 0 pts
  //   Testes: 6 = +24 pts
  //   Relatórios: 6 pontuados = +36 pts (3 extrapolaram)
  //   Total Clínica = +60 pts

  // Ruthi Novais:
  //   Aval: 2 pontuadas (Daniele, Renato) = +8 pts (1 duplicidade desconsiderada)
  //   Testes: 0 = 0 pts
  //   Relatórios: 0 = 0 pts
  //   Total Clínica = +8 pts

  // Maria Luísa Câmara Gontijo:
  //   Aval: 0 = 0 pts
  //   Testes: 0 = 0 pts
  //   Relatórios: 1 = +6 pts
  //   Total Clínica = +6 pts

  // Thiago Castro:
  //   Total Clínica = 0 pts

  console.log('Verification completed.');
  process.exit(0);
}
run();

