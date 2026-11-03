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
    { iso: '2026-10-01', dow: 'Qui' },
    { iso: '2026-10-02', dow: 'Sex' },
    { iso: '2026-10-05', dow: 'Seg' },
    { iso: '2026-10-06', dow: 'Ter' },
    { iso: '2026-10-07', dow: 'Qua' },
    { iso: '2026-10-08', dow: 'Qui' },
    { iso: '2026-10-09', dow: 'Sex' },
    { iso: '2026-10-13', dow: 'Ter' },
    { iso: '2026-10-14', dow: 'Qua' },
    { iso: '2026-10-15', dow: 'Qui' },
    { iso: '2026-10-16', dow: 'Sex' },
    { iso: '2026-10-19', dow: 'Seg' },
    { iso: '2026-10-20', dow: 'Ter' },
    { iso: '2026-10-21', dow: 'Qua' },
    { iso: '2026-10-22', dow: 'Qui' },
    { iso: '2026-10-23', dow: 'Sex' },
    { iso: '2026-10-26', dow: 'Seg' },
    { iso: '2026-10-27', dow: 'Ter' },
    { iso: '2026-10-28', dow: 'Qua' },
    { iso: '2026-10-29', dow: 'Qui' },
    { iso: '2026-10-30', dow: 'Sex' }
  ];

  // Check Guilherme's punch times vs expected
  console.log('--- GUILHERME PUNCHES ---');
  const guiPunches = punches.filter(p => p.profissionalNome?.includes('Guilherme'));
  businessDays.forEach(bd => {
    const pc = guiPunches.find(p => p.data === bd.iso);
    console.log(`${bd.iso} (${bd.dow}):`, pc ? `${pc.horario} (esperado no banco: ${pc.horarioEsperado}, atraso banco: ${pc.minutosAtraso}m)` : 'SEM PONTO');
  });

  // Check Maria Luisa punches vs new schedule: Seg 9h, Ter 7h, Qui 7h (facultativo), Sex 14h, Qua Folga
  console.log('\n--- MARIA LUISA PUNCHES VS NEW SCHEDULE ---');
  const mlPunches = punches.filter(p => p.profissionalNome?.includes('Maria Luísa'));
  businessDays.forEach(bd => {
    const pc = mlPunches.find(p => p.data === bd.iso);
    let esp = 'Folga';
    if (bd.dow === 'Seg') esp = '09:00';
    if (bd.dow === 'Ter') esp = '07:00';
    if (bd.dow === 'Qui') esp = '07:00 (Facultativo)';
    if (bd.dow === 'Sex') esp = '14:00';
    console.log(`${bd.iso} (${bd.dow} esp ${esp}):`, pc ? `${pc.horario} (atraso banco: ${pc.minutosAtraso}m)` : 'SEM PONTO');
  });

  // Check Thiago punches
  console.log('\n--- THIAGO PUNCHES ---');
  const thPunches = punches.filter(p => p.profissionalNome?.includes('Thiago'));
  businessDays.forEach(bd => {
    const pc = thPunches.find(p => p.data === bd.iso);
    console.log(`${bd.iso} (${bd.dow}):`, pc ? `${pc.horario}` : 'SEM PONTO');
  });

  process.exit(0);
}

run();

