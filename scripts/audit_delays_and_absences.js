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

  const profs = await db.collection('professionals').find({}).toArray();
  const punches = await db.collection('pontorecords').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  // Business days of Oct 2026 (Mon-Fri, excl Oct 12 Nossa Sra Aparecida)
  const businessDays = [
    { iso: '2026-10-01', dow: 'Qui' },
    { iso: '2026-10-02', dow: 'Sex' },
    { iso: '2026-10-05', dow: 'Seg' },
    { iso: '2026-10-06', dow: 'Ter' },
    { iso: '2026-10-07', dow: 'Qua' },
    { iso: '2026-10-08', dow: 'Qui' },
    { iso: '2026-10-09', dow: 'Sex' },
    // 12/10 Feriado
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

  console.log('Business days count:', businessDays.length);

  // Group punches by prof
  const byProf = {};
  punches.forEach(p => {
    const nome = p.profissionalNome || 'Sem Nome';
    if (!byProf[nome]) byProf[nome] = [];
    byProf[nome].push(p);
  });

  for (const [name, pList] of Object.entries(byProf)) {
    console.log(`\n=================== ${name} ===================`);
    let totalAtrasoMin = 0;
    const delays = [];
    const punchDates = new Set(pList.map(x => x.data));

    pList.sort((a,b) => a.data.localeCompare(b.data));
    pList.forEach(p => {
      if (p.minutosAtraso > 0) {
        delays.push(`${p.data} (${p.horario} esp ${p.horarioEsperado}): ${p.minutosAtraso} min`);
        totalAtrasoMin += p.minutosAtraso;
      }
    });

    const missingDays = businessDays.filter(bd => !punchDates.has(bd.iso)).map(bd => `${bd.iso} (${bd.dow})`);

    console.log(`Total batidas: ${pList.length} em ${punchDates.size} dias.`);
    console.log(`Dias sem registro (${missingDays.length}):`, missingDays);
    console.log(`Atrasos registrados (${delays.length}) - Total minutos: ${totalAtrasoMin} min:`);
    delays.forEach(d => console.log('  ', d));
  }

  process.exit(0);
}

run();
