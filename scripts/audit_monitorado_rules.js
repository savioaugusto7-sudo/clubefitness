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

  const firstDayStr = '2026-10-01';
  const lastDayStr = '2026-10-31';

  // Buscar todos os contratos e planos
  const contracts = await db.collection('contracts').find({}).toArray();
  const clientContractMap = new Map();
  contracts.forEach(ct => {
    if (ct.planoNome) clientContractMap.set(String(ct.clientId), ct.planoNome);
  });

  const clients = await db.collection('clients').find({}).toArray();
  const monitoradoClients = [];

  clients.forEach(c => {
    const cid = String(c._id);
    const pNome = clientContractMap.get(cid) || c.dadosComerciais?.contrato || c.dadosComerciais?.planoNome || '';
    if (pNome.toLowerCase().includes('monitorado')) {
      monitoradoClients.push({
        id: cid,
        nome: c.dadosPessoais?.nome || c.nome,
        plano: pNome,
        status: c.dadosComerciais?.status || 'ativo'
      });
    }
  });

  console.log(`Total Alunos Clube Fitness - Monitorado: ${monitoradoClients.length}`);

  // Buscar agendamentos na academia
  const appts = await db.collection('appointments').find({
    data: { $gte: firstDayStr, $lte: lastDayStr },
    tipo: 'academia'
  }).toArray();

  const clientStats = {};
  monitoradoClients.forEach(c => {
    clientStats[c.id] = {
      nome: c.nome,
      plano: c.plano,
      presencas: 0,
      faltas: 0,
      treinosLivres: 0,
      emergencias: 0,
      turno: 'Manhã'
    };
  });

  appts.forEach(a => {
    const cid = String(a.clienteId);
    if (!clientStats[cid]) return;

    const hour = parseInt((a.horario || '00:00').split(':')[0], 10);
    if (hour >= 13) clientStats[cid].turno = 'Tarde/Noite';
    else clientStats[cid].turno = 'Manhã';

    if (a.status === 'presenca' || a.status === 'presente') clientStats[cid].presencas++;
    else if (a.status === 'falta') clientStats[cid].faltas++;

    const serv = (a.servico || '').toLowerCase();
    if (serv.includes('livre') && (a.status === 'presenca' || a.status === 'presente')) {
      clientStats[cid].treinosLivres++;
    }
  });

  // Buscar emergências
  const emerg = await db.collection('appointments').find({
    data: { $gte: firstDayStr, $lte: lastDayStr },
    status: { $ne: 'cancelado' },
    $or: [
      { servico: { $regex: /emerg/i } },
      { tipoCredito: 'emergencia' }
    ]
  }).toArray();

  emerg.forEach(e => {
    const cid = String(e.clienteId);
    if (clientStats[cid]) clientStats[cid].emergencias++;
  });

  console.log('\n--- ALUNOS MONITORADO COM FREQUENCIA < 80% ---');
  let countManha = 0;
  let countTarde = 0;
  for (const [cid, s] of Object.entries(clientStats)) {
    const total = s.presencas + s.faltas;
    if (total === 0) continue;
    const taxa = (s.presencas / total) * 100;
    if (taxa < 80) {
      if (s.turno === 'Manhã') countManha++;
      else countTarde++;
      console.log(`[${s.turno}] ${s.nome} | ${s.presencas}P / ${s.faltas}F (${total} tot) | Taxa: ${taxa.toFixed(1)}% | Treinos Livres: ${s.treinosLivres} | Emergências: ${s.emergencias}`);
    }
  }

  console.log(`\nResumo < 80%: Manhã = ${countManha} alunos | Tarde/Noite = ${countTarde} alunos`);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
