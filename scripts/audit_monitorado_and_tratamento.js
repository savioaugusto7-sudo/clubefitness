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

  const clients = await db.collection('clients').find({}).toArray();
  const appointments = await db.collection('appointments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  console.log(`Total clients: ${clients.length}`);
  console.log(`Total appointments Oct 2026: ${appointments.length}`);

  // Find valid plans: Clube Fitness Monitorado & Tratamento Personalizado
  const validPlans = ['clube fitness - monitorado', 'tratamento personalizado', 'monitorado'];

  const targetClients = clients.filter(c => {
    const p = (c.plano || c.dadosClinicos?.plano || c.planoNome || '').toLowerCase();
    return p.includes('monitorado') || p.includes('tratamento personalizado');
  });

  console.log(`Target clients (Monitorado + Tratamento Personalizado): ${targetClients.length}`);

  // Group appointments by client
  const apptsByClient = {};
  appointments.forEach(a => {
    const cId = String(a.clienteId?._id || a.clienteId);
    if (!apptsByClient[cId]) apptsByClient[cId] = [];
    apptsByClient[cId].push(a);
  });

  // Also check shift for each client
  // Shift can be determined by horario habitual or appointments time
  const morningList = [];
  const afternoonList = [];

  targetClients.forEach(c => {
    const cId = String(c._id);
    const clientAppts = apptsByClient[cId] || [];
    
    // determine presences and absences
    const presencas = clientAppts.filter(a => a.status === 'concluido' || a.status === 'presente' || a.presenca === true || a.checkin === true).length;
    const faltas = clientAppts.filter(a => a.status === 'falta' || a.status === 'ausente' || a.falta === true).length;
    const total = presencas + faltas;
    const pct = total > 0 ? (presencas / total) * 100 : 0;

    // Shift:
    // check appointments hours
    let morningCount = 0;
    let afternoonCount = 0;
    clientAppts.forEach(a => {
      const horaStr = a.horario || a.hora || '';
      const hour = parseInt(horaStr.split(':')[0], 10);
      if (!isNaN(hour)) {
        if (hour < 13) morningCount++;
        else afternoonCount++;
      }
    });

    // Also check preferred time on client profile
    const prefHora = c.horarioPreferencial || c.horario || c.dadosClinicos?.horario || '';
    const prefHour = parseInt(prefHora.split(':')[0], 10);
    let shift = 'Manhã';
    if (!isNaN(prefHour)) {
      shift = prefHour < 13 ? 'Manhã' : 'Tarde/Noite';
    } else if (morningCount + afternoonCount > 0) {
      shift = morningCount >= afternoonCount ? 'Manhã' : 'Tarde/Noite';
    } else {
      // default check if turno field exists
      const t = (c.turno || c.dadosClinicos?.turno || '').toLowerCase();
      if (t.includes('tarde') || t.includes('noite')) shift = 'Tarde/Noite';
      else shift = 'Manhã';
    }

    const cData = {
      id: cId,
      nome: c.nome || c.dadosPessoais?.nome,
      plano: c.plano || c.dadosClinicos?.plano || c.planoNome,
      presencas,
      faltas,
      total,
      pct,
      shift,
      reached80: pct >= 80 && total > 0
    };

    if (shift === 'Manhã') morningList.push(cData);
    else afternoonList.push(cData);
  });

  console.log(`\n--- MANHÃ (${morningList.length} alunos) ---`);
  const m80 = morningList.filter(x => x.reached80);
  const mUnder80 = morningList.filter(x => !x.reached80);
  console.log(`Atingiram >= 80%: ${m80.length}`);
  console.log(`Abaixo de 80%: ${mUnder80.length}`);
  mUnder80.forEach(x => console.log(`  ${x.nome} (${x.plano}): ${x.presencas}P / ${x.faltas}F (${x.pct.toFixed(1)}%)`));

  console.log(`\n--- TARDE / NOITE (${afternoonList.length} alunos) ---`);
  const a80 = afternoonList.filter(x => x.reached80);
  const aUnder80 = afternoonList.filter(x => !x.reached80);
  console.log(`Atingiram >= 80%: ${a80.length}`);
  console.log(`Abaixo de 80%: ${aUnder80.length}`);
  aUnder80.forEach(x => console.log(`  ${x.nome} (${x.plano}): ${x.presencas}P / ${x.faltas}F (${x.pct.toFixed(1)}%)`));

  process.exit(0);
}

run();

