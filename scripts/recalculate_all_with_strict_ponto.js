const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri = '';
env.split('\n').forEach(l => { 
  if (l.trim().startsWith('MONGODB_URI=')) {
    uri = l.trim().replace('MONGODB_URI=', '').trim(); 
  }
});

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const punches = await db.collection('pontorecords').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  const businessDays = [
    { iso: '2026-10-01', dow: 'Qui', br: '01/10/2026' },
    { iso: '2026-10-02', dow: 'Sex', br: '02/10/2026' },
    { iso: '2026-10-05', dow: 'Seg', br: '05/10/2026' },
    { iso: '2026-10-06', dow: 'Ter', br: '06/10/2026' },
    { iso: '2026-10-07', dow: 'Qua', br: '07/10/2026' },
    { iso: '2026-10-08', dow: 'Qui', br: '08/10/2026' },
    { iso: '2026-10-09', dow: 'Sex', br: '09/10/2026' },
    { iso: '2026-10-13', dow: 'Ter', br: '13/10/2026' },
    { iso: '2026-10-14', dow: 'Qua', br: '14/10/2026' },
    { iso: '2026-10-15', dow: 'Qui', br: '15/10/2026' },
    { iso: '2026-10-16', dow: 'Sex', br: '16/10/2026' },
    { iso: '2026-10-19', dow: 'Seg', br: '19/10/2026' },
    { iso: '2026-10-20', dow: 'Ter', br: '20/10/2026' },
    { iso: '2026-10-21', dow: 'Qua', br: '21/10/2026' },
    { iso: '2026-10-22', dow: 'Qui', br: '22/10/2026' },
    { iso: '2026-10-23', dow: 'Sex', br: '23/10/2026' },
    { iso: '2026-10-26', dow: 'Seg', br: '26/10/2026' },
    { iso: '2026-10-27', dow: 'Ter', br: '27/10/2026' },
    { iso: '2026-10-28', dow: 'Qua', br: '28/10/2026' },
    { iso: '2026-10-29', dow: 'Qui', br: '29/10/2026' },
    { iso: '2026-10-30', dow: 'Sex', br: '30/10/2026' }
  ];

  console.log('Calculating exact points with strict ponto rules...');

  // Helper to test each prof
  const profs = [
    'Cleiton Freitas',
    'Guilherme José Graciano',
    'Ruthi Novais',
    'Albert Nunes',
    'Pedro Grossi',
    'Rachel Zauli Serpa',
    'Matheus Poeiras Luciano',
    'Maria Luísa Câmara Gontijo',
    'Thiago Castro Lima Rocha'
  ];

  process.exit(0);
}

run();
