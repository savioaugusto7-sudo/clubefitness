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

  const plans = await db.collection('plans').find({}).toArray();
  const planMap = new Map();
  plans.forEach(p => planMap.set(String(p._id), p.nome));

  const contracts = await db.collection('contracts').find({}).toArray();
  const clientContractMap = new Map();
  contracts.forEach(ct => {
    if (ct.planoNome) clientContractMap.set(String(ct.clientId), ct.planoNome);
  });

  const clients = await db.collection('clients').find({}).toArray();
  const clientMap = new Map();
  clients.forEach(c => {
    const cid = String(c._id);
    const pId = c.dadosComerciais?.planoId ? String(c.dadosComerciais.planoId) : '';
    const rawPlan = planMap.get(pId) || c.dadosComerciais?.contrato || c.dadosComerciais?.planoNome || 'Sem Plano';
    const finalPlan = clientContractMap.get(cid) || rawPlan;
    const lower = finalPlan.toLowerCase();
    const inScope = lower.includes('monitorado') || lower.includes('personalizado') || lower.includes('tratamento');
    clientMap.set(cid, {
      id: cid,
      nome: c.dadosPessoais?.nome || c.nome || 'Cliente',
      plan: finalPlan,
      inScope
    });
  });

  const appts = await db.collection('appointments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' },
    tipo: 'academia'
  }).toArray();

  const morningClients = {};
  const eveningClients = {};

  appts.forEach(a => {
    const cid = String(a.clienteId);
    const client = clientMap.get(cid);
    if (!client || !client.inScope) return;

    const timeStr = a.horario || '00:00';
    const hour = parseInt(timeStr.split(':')[0], 10);

    let isMorning = false;
    if (hour >= 6 && hour < 13) {
      isMorning = true;
    } else if (hour === 13) {
      if (a.data === '2026-10-23') {
        isMorning = false; // Tarde/Noite
      } else {
        isMorning = false;
      }
    } else {
      isMorning = false;
    }

    const targetMap = isMorning ? morningClients : eveningClients;
    if (!targetMap[cid]) {
      targetMap[cid] = {
        id: cid,
        nome: client.nome,
        plan: client.plan,
        presencas: 0,
        faltas: 0,
        cancelados: 0,
        agendados: 0
      };
    }

    const st = (a.status || '').toLowerCase();
    if (st === 'presenca' || st === 'presente') targetMap[cid].presencas++;
    else if (st === 'falta') targetMap[cid].faltas++;
    else if (st === 'cancelado') targetMap[cid].cancelados++;
    else if (st === 'agendado') targetMap[cid].agendados++;
  });

  function analyze(map, turnoNome, respNames, equipeNames) {
    console.log(`\n=================== ${turnoNome} ===================`);
    const list = Object.values(map);
    list.forEach(c => {
      c.realizadas = c.presencas + c.faltas;
      c.taxa = c.realizadas > 0 ? (c.presencas / c.realizadas) * 100 : 0;
      c.metaBatida = c.taxa >= 80;
      
      // Quantas presenças precisava para 80% das realizadas?
      // Ou se as faltas tivessem sido presenças:
      // se P_necessario / realizadas >= 0.8 => P_necessario = Math.ceil(0.8 * realizadas)
      // faltamPara80 = P_necessario - presencas
      c.presencasNecessarias = Math.ceil(0.8 * c.realizadas);
      c.faltouQuantas = Math.max(0, c.presencasNecessarias - c.presencas);
    });

    const bateram = list.filter(c => c.metaBatida);
    const perderam = list.filter(c => !c.metaBatida);

    console.log(`Total Alunos Ativos no Turno: ${list.length}`);
    console.log(`Bateram Meta (>= 80%): ${bateram.length} (${((bateram.length/list.length)*100).toFixed(1)}%)`);
    console.log(`Perderam Oportunidade (< 80%): ${perderam.length} (${((perderam.length/list.length)*100).toFixed(1)}%)`);

    const ptsRespGanhos = bateram.length * 7;
    const ptsEquipeGanhos = bateram.length * 2;
    const ptsRespPerdidos = perderam.length * 7;
    const ptsEquipePerdidos = perderam.length * 2;

    console.log(`Pontos Ganhos - Resp: +${ptsRespGanhos} pts | Equipe (cada): +${ptsEquipeGanhos} pts`);
    console.log(`PONTOS PERDIDOS NA MESA - Resp: -${ptsRespPerdidos} pts | Equipe (cada): -${ptsEquipePerdidos} pts`);
    console.log(`Potencial Máximo do Turno (100% de adesão): Resp = ${list.length * 7} pts | Equipe = ${list.length * 2} pts cada`);

    console.log('\n--- DETALHAMENTO DAS OPORTUNIDADES PERDIDAS ---');
    perderam.sort((a,b) => b.taxa - a.taxa).forEach(c => {
      console.log(`${c.nome} | ${c.plan} | ${c.presencas}P / ${c.faltas}F (${c.realizadas} total) | Taxa: ${c.taxa.toFixed(1)}% | Faltaram ${c.faltouQuantas} presenças p/ 80% | Oportunidade: +7 pts Resp / +2 pts Eq.`);
    });
  }

  analyze(morningClients, 'TURNO MANHÃ (06h às 12h)', ['Ruthi Novais', 'Cleiton Freitas'], ['Rachel Zauli Serpa']);
  analyze(eveningClients, 'TURNO TARDE/NOITE (13h às 21h)', ['Matheus Poeiras Luciano'], ['Pedro Grossi', 'Guilherme José Graciano']);

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
