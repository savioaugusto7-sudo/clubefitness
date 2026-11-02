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

  const professionals = await db.collection('professionals').find({}).toArray();
  const profMap = new Map();
  professionals.forEach(p => profMap.set(String(p._id), p.nome));

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
    clientMap.set(cid, {
      nome: c.dadosPessoais?.nome || c.nome || 'Cliente',
      plan: finalPlan
    });
  });

  function normName(name) {
    if (!name) return 'Desconhecido';
    const s = name.trim().replace(/\s+/g, ' ');
    if (s.toLowerCase().includes('albert')) return 'Albert Nunes';
    if (s.toLowerCase().includes('guilherme')) return 'Guilherme José Graciano';
    if (s.toLowerCase().includes('cleiton')) return 'Cleiton Freitas';
    if (s.toLowerCase().includes('grossi')) return 'Pedro Grossi';
    if (s.toLowerCase().includes('rachel') || s.toLowerCase().includes('raquel')) return 'Rachel Zauli Serpa';
    if (s.toLowerCase().includes('ruthi')) return 'Ruthi Novais';
    if (s.toLowerCase().includes('poeiras')) return 'Matheus Poeiras Luciano';
    if (s.toLowerCase().includes('gontijo') || s.toLowerCase().includes('maria luísa') || s.toLowerCase().includes('maria luisa')) return 'Maria Luísa Câmara Gontijo';
    if (s.toLowerCase().includes('thiago')) return 'Thiago Castro Lima Rocha';
    return s;
  }

  const assessments = await db.collection('physicalassessments').find({
    data: { $gte: firstDayStr, $lte: lastDayStr }
  }).sort({ data: 1 }).toArray();

  const strengthTests = await db.collection('strengthtests').find({
    data: { $gte: firstDayStr, $lte: lastDayStr }
  }).sort({ data: 1 }).toArray();

  const physioReports = await db.collection('physioreports').find({
    data: { $gte: firstDayStr, $lte: lastDayStr }
  }).sort({ data: 1 }).toArray();

  const profStats = {};

  function ensureProf(p) {
    if (!profStats[p]) profStats[p] = { items: [], totalPontos: 0, count: 0 };
  }

  let danieleSeenCount = 0;
  assessments.forEach(a => {
    const prof = normName(profMap.get(String(a.avaliadorId)) || a.avaliadorNome);
    const client = clientMap.get(String(a.clienteId));
    const alunoNome = client?.nome || a.alunoNome || 'Não Identificado';
    const tempo = Number(a.tempoGastoSegundos) || 0;
    const slaOk = tempo >= 60 && tempo <= 3600;

    let pontuou = slaOk;
    let motivo = !slaOk ? 'Tempo fora do SLA (<60s ou >1h)' : 'Pontuou (SLA Ok)';
    let pontos = pontuou ? 4 : 0;

    if (alunoNome.toLowerCase().includes('daniele debossan') && a.data === '2026-10-02') {
      danieleSeenCount++;
      if (danieleSeenCount > 1) {
        pontuou = false;
        pontos = 0;
        motivo = 'Duplicidade no mesmo dia (Desconsiderada pela Gestão)';
      }
    }

    ensureProf(prof);
    profStats[prof].items.push({
      tipo: 'Avaliação Física',
      data: a.data,
      aluno: alunoNome,
      plano: client?.plan || 'Sem Plano',
      tempo,
      pontuou,
      pontos,
      motivo
    });
    profStats[prof].totalPontos += pontos;
    profStats[prof].count++;
  });

  strengthTests.forEach(s => {
    const prof = normName(profMap.get(String(s.profissionalId)) || s.profissionalNome);
    const client = clientMap.get(String(s.clienteId));
    const alunoNome = client?.nome || s.alunoNome || 'Não Identificado';
    const tempo = Number(s.tempoGastoSegundos) || 0;
    const slaOk = tempo >= 60 && tempo <= 3600;
    let pontuou = slaOk;
    let pontos = pontuou ? 4 : 0;
    let motivo = !slaOk ? 'Tempo fora do SLA (<60s ou >1h)' : 'Pontuou (SLA Ok)';

    ensureProf(prof);
    profStats[prof].items.push({
      tipo: 'Teste de Força',
      data: s.data,
      aluno: alunoNome,
      plano: client?.plan || 'Sem Plano',
      tempo,
      pontuou,
      pontos,
      motivo
    });
    profStats[prof].totalPontos += pontos;
    profStats[prof].count++;
  });

  physioReports.forEach(r => {
    const prof = normName(profMap.get(String(r.profissionalId)) || profMap.get(String(r.fisioterapeutaId)) || r.profissionalNome || r.fisioterapeutaNome);
    const client = clientMap.get(String(r.clienteId));
    const alunoNome = client?.nome || r.alunoNome || 'Não Identificado';
    const tempo = Number(r.tempoGastoSegundos) || 0;
    const slaOk = tempo >= 60 && tempo <= 7200;
    let pontuou = slaOk;
    let pontos = pontuou ? 6 : 0;
    let motivo = !slaOk ? `Tempo fora do SLA (${(tempo/60).toFixed(0)}m > 2h)` : 'Pontuou (SLA Ok)';

    ensureProf(prof);
    profStats[prof].items.push({
      tipo: 'Relatório Fisioterápico',
      data: r.data,
      aluno: alunoNome,
      plano: client?.plan || 'Sem Plano',
      tempo,
      pontuou,
      pontos,
      motivo
    });
    profStats[prof].totalPontos += pontos;
    profStats[prof].count++;
  });

  console.log('--- RESUMO DA PRODUÇÃO CLÍNICA COM TODOS OS PLANOS ---');
  for (const [prof, data] of Object.entries(profStats)) {
    console.log(`\nProfissional: ${prof} | Total Procedimentos: ${data.count} | PONTUAÇÃO TOTAL: +${data.totalPontos} pts`);
    data.items.forEach(i => {
      console.log(`  [${i.data}] ${i.tipo} | Aluno: ${i.aluno} (${i.plano}) | ${i.pontuou ? '+' + i.pontos + ' pts' : '0 pts (' + i.motivo + ')'}`);
    });
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

