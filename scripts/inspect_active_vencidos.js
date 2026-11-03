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
  const clients = await db.collection('clients').find({}).toArray();
  const physicalAssessments = await db.collection('physicalassessments').find({}).toArray();
  const workouts = await db.collection('clientworkouts').find({}).toArray();

  const profMap = {};
  professionals.forEach(p => profMap[String(p._id)] = { nome: p.nome, count: 0, clients: [] });

  clients.forEach(c => {
    const st = c.dadosComerciais?.status;
    // Apenas clientes ATIVOS no fechamento
    if (st !== 'ativo' && st !== 'pendente') return;

    const profId = c.profissionalId ? String(c.profissionalId) : (c.dadosClinicos?.profissionalResponsavelId ? String(c.dadosClinicos.profissionalResponsavelId) : null);
    if (!profId || !profMap[profId]) return;

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

    const assVencida = !lastAss || lastAss.data < '2026-09-01';
    const fichaVencida = !lastWDate || lastWDate < '2026-09-01';

    if (assVencida && fichaVencida) {
      profMap[profId].count++;
      profMap[profId].clients.push({
        nome: c.dadosPessoais?.nome || c.nome,
        status: st,
        lastAss: lastAss?.data || 'Nenhuma',
        lastW: lastWDate || 'Nenhuma'
      });
    }
  });

  console.log('=== CLIENTES ATIVOS COM AVALIAÇÃO E FICHA VENCIDAS (> 2 MESES) ===');
  Object.values(profMap).forEach(p => {
    console.log(`Profissional: ${p.nome} -> ${p.count} ativos vencidos = -${p.count * 10} pts`);
    p.clients.forEach(cl => console.log(`   - ${cl.nome} (Status: ${cl.status}, Aval: ${cl.lastAss}, Ficha: ${cl.lastW})`));
  });

  process.exit(0);
}

run();
