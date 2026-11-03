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

  const professionals = await db.collection('professionals').find({}).toArray();
  const profMap = new Map();
  professionals.forEach(p => profMap.set(String(p._id), p.nome));

  const clients = await db.collection('clients').find({}).toArray();
  const plans = await db.collection('plans').find({}).toArray();
  const planMap = new Map();
  plans.forEach(p => planMap.set(String(p._id), p.nome));
  const contracts = await db.collection('contracts').find({}).toArray();
  const clientContractMap = new Map();
  contracts.forEach(ct => { if (ct.planoNome) clientContractMap.set(String(ct.clientId), ct.planoNome); });

  const appointments = await db.collection('appointments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  const workouts = await db.collection('clientworkouts').find({}).toArray();
  const physicalAssessments = await db.collection('physicalassessments').find({}).toArray();

  console.log('=== AUDITORIA COMPLETA DOS CRITÉRIOS DE DÉBITO ===');

  // Let's identify target clients: Clube Fitness - Monitorado & Tratamento Personalizado
  const clientAttendance = {};
  appointments.forEach(a => {
    const cid = String(a.clienteId?._id || a.clienteId);
    if (!clientAttendance[cid]) clientAttendance[cid] = { presencas: 0, faltas: 0, livre: 0, emerg: 0, hours: [] };
    if (a.status === 'concluido' || a.status === 'presente' || a.presenca === true || a.checkin === true) clientAttendance[cid].presencas++;
    if (a.status === 'falta' || a.status === 'ausente' || a.falta === true) clientAttendance[cid].faltas++;
    const s = (a.servico || '').toLowerCase();
    const t = (a.tipo || '').toLowerCase();
    if (s.includes('livre') || t.includes('livre') || a.tipoCredito === 'livre') clientAttendance[cid].livre++;
    if (s.includes('emerg') || a.tipoCredito === 'emergencia') clientAttendance[cid].emerg++;
    const h = parseInt((a.horario || a.hora || '').split(':')[0], 10);
    if (!isNaN(h)) clientAttendance[cid].hours.push(h);
  });

  // Filter clients
  const targetClients = clients.filter(c => {
    const cid = String(c._id);
    const pId = c.dadosComerciais?.planoId ? String(c.dadosComerciais.planoId) : '';
    const rawPlan = planMap.get(pId) || c.dadosComerciais?.contrato || c.dadosComerciais?.planoNome || 'Sem Plano';
    const plan = (clientContractMap.get(cid) || rawPlan).toLowerCase();
    const isTarget = plan.includes('monitorado') || plan.includes('tratamento personalizado');
    const st = c.dadosComerciais?.status;
    return isTarget && (st === 'ativo' || st === 'pendente' || !st);
  });

  console.log(`Total Target Clients: ${targetClients.length}`);

  // Determine shift for each target client
  const morningClients = [];
  const afternoonClients = [];

  targetClients.forEach(c => {
    const cid = String(c._id);
    const att = clientAttendance[cid] || { presencas: 0, faltas: 0, livre: 0, emerg: 0, hours: [] };
    
    let mCount = 0;
    let aCount = 0;
    att.hours.forEach(h => {
      if (h < 13) mCount++;
      else aCount++;
    });

    const prefHora = c.horarioPreferencial || c.horario || c.dadosClinicos?.horario || '';
    const prefH = parseInt(prefHora.split(':')[0], 10);
    let shift = 'Manhã';
    if (!isNaN(prefH)) {
      shift = prefH < 13 ? 'Manhã' : 'Tarde/Noite';
    } else if (mCount + aCount > 0) {
      shift = mCount >= aCount ? 'Manhã' : 'Tarde/Noite';
    } else {
      const t = (c.turno || c.dadosClinicos?.turno || '').toLowerCase();
      if (t.includes('tarde') || t.includes('noite')) shift = 'Tarde/Noite';
      else shift = 'Manhã';
    }

    const item = {
      id: cid,
      nome: c.dadosPessoais?.nome || c.nome || 'Cliente',
      profId: c.profissionalId ? String(c.profissionalId) : (c.dadosClinicos?.profissionalResponsavelId ? String(c.dadosClinicos.profissionalResponsavelId) : null),
      shift,
      presencas: att.presencas,
      faltas: att.faltas,
      total: att.presencas + att.faltas,
      rate: (att.presencas + att.faltas) > 0 ? (att.presencas / (att.presencas + att.faltas)) : 0,
      livre: att.livre,
      emerg: att.emerg
    };

    if (shift === 'Manhã') morningClients.push(item);
    else afternoonClients.push(item);
  });

  console.log(`Manhã clients: ${morningClients.length} | Tarde/Noite clients: ${afternoonClients.length}`);

  // CRITÉRIO 3: Aluno ativo com frequência mensal < 80% (-5 pts/aluno)
  const morningBelow80 = morningClients.filter(c => c.rate < 0.8);
  const afternoonBelow80 = afternoonClients.filter(c => c.rate < 0.8);
  console.log(`\nCRITÉRIO 3 (< 80%):`);
  console.log(`Manhã abaixo de 80%: ${morningBelow80.length} alunos -> Débito total = ${morningBelow80.length * 5} pts (-${morningBelow80.length * 2.5} pts para Cleiton e Ruthi)`);
  console.log(`Tarde abaixo de 80%: ${afternoonBelow80.length} alunos -> Débito total = ${afternoonBelow80.length * 5} pts (-${afternoonBelow80.length * 2.5} pts para Matheus e Guilherme)`);

  // CRITÉRIO 4: Aluno sem o mín. de 1 Treino Livre na semana (fechamento): -2 pts/aluno
  // No fechamento mensal (4 semanas), mínimo de 4 treinos livres.
  const morningNoLivre = morningClients.filter(c => c.livre < 4);
  const afternoonNoLivre = afternoonClients.filter(c => c.livre < 4);
  console.log(`\nCRITÉRIO 4 (Treino Livre < 4 no mês):`);
  console.log(`Manhã sem treino livre suficiente: ${morningNoLivre.length} alunos -> Débito total = ${morningNoLivre.length * 2} pts (-${morningNoLivre.length * 1} pts para Cleiton e Ruthi)`);
  console.log(`Tarde sem treino livre suficiente: ${afternoonNoLivre.length} alunos -> Débito total = ${afternoonNoLivre.length * 2} pts (-${afternoonNoLivre.length * 1} pts para Matheus e Guilherme)`);

  // CRITÉRIO 5: Aluno com > 1 emergência no mês (fechamento): -4 pts/aluno
  const morningExtraEmerg = morningClients.filter(c => c.emerg > 1);
  const afternoonExtraEmerg = afternoonClients.filter(c => c.emerg > 1);
  console.log(`\nCRITÉRIO 5 (Emergências > 1):`);
  console.log(`Manhã com emergências extras: ${morningExtraEmerg.length} alunos -> Débito total = ${morningExtraEmerg.length * 4} pts (-${morningExtraEmerg.length * 2} pts para Cleiton e Ruthi)`);
  morningExtraEmerg.forEach(c => console.log(`   - ${c.nome} (${c.emerg} emergências)`));
  console.log(`Tarde com emergências extras: ${afternoonExtraEmerg.length} alunos -> Débito total = ${afternoonExtraEmerg.length * 4} pts (-${afternoonExtraEmerg.length * 2} pts para Matheus e Guilherme)`);
  afternoonExtraEmerg.forEach(c => console.log(`   - ${c.nome} (${c.emerg} emergências)`));

  // CRITÉRIO 2: Avaliação ou Ficha vencida há > 2 meses (-10 pts)
  console.log('\nCRITÉRIO 2 (Avaliação ou Ficha vencida > 2 meses):');
  // Check per professional
  const profVencidosMap = {};
  professionals.forEach(p => profVencidosMap[String(p._id)] = { nome: p.nome, count: 0, clients: [] });

  clients.forEach(c => {
    const profId = c.profissionalId ? String(c.profissionalId) : (c.dadosClinicos?.profissionalResponsavelId ? String(c.dadosClinicos.profissionalResponsavelId) : null);
    if (!profId || !profVencidosMap[profId]) return;

    const cid = String(c._id);
    const clientAss = physicalAssessments.filter(a => String(a.clienteId) === cid).sort((a,b) => b.data.localeCompare(a.data));
    const lastAss = clientAss[0];

    const clientW = workouts.find(w => String(w.clienteId) === cid);
    let lastWDate = null;
    if (clientW) {
      (clientW.fichasMonitorado || []).forEach(f => {
        if (f.ultimaAtualizacao && (!lastWDate || f.ultimaAtualizacao > lastWDate)) lastWDate = f.ultimaAtualizacao;
      });
    }

    // Check if both or either are > 2 months before 2026-10-31 (i.e. before 2026-09-01)
    const assVencida = !lastAss || lastAss.data < '2026-09-01';
    const fichaVencida = !lastWDate || lastWDate < '2026-09-01';

    // Regra: "Avaliação ou Ficha vencida há > 2 meses: -10 pts (profissional vinculado)"
    if (assVencida && fichaVencida) {
      profVencidosMap[profId].count++;
      profVencidosMap[profId].clients.push({ nome: c.dadosPessoais?.nome || c.nome, lastAss: lastAss?.data, lastW: lastWDate });
    }
  });

  Object.values(profVencidosMap).forEach(p => {
    if (p.count > 0) {
      console.log(`Profissional: ${p.nome} -> ${p.count} clientes com avaliação/ficha vencida > 2 meses = -${p.count * 10} pts`);
      p.clients.slice(0, 5).forEach(cl => console.log(`   - ${cl.nome} (Ult. Aval: ${cl.lastAss || 'Nenhuma'}, Ult. Ficha: ${cl.lastW || 'Nenhuma'})`));
    }
  });

  process.exit(0);
}

run();
