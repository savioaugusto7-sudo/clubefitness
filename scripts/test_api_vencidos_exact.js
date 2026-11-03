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
  const assessments = await db.collection('physicalassessments').find({}).toArray();

  const profMap = {};
  professionals.forEach(p => {
    profMap[String(p._id)] = { nome: p.nome, vencidos: [] };
  });

  const nowMs = new Date('2026-10-31T23:59:59.999Z').getTime();
  const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;

  clients.forEach(c => {
    const st = c.dadosComerciais?.status;
    if (st !== 'ativo' && st !== 'pendente') return;

    const profId = c.profissionalId ? String(c.profissionalId) : (c.dadosClinicos?.profissionalResponsavelId ? String(c.dadosClinicos.profissionalResponsavelId) : null);
    if (!profId || !profMap[profId]) return;

    const cid = String(c._id);
    const clientAssessments = assessments.filter(a => String(a.clienteId) === cid);
    let lastAssDate = c.dadosClinicos?.dataUltimaAvaliacao ? new Date(c.dadosClinicos.dataUltimaAvaliacao).getTime() : 0;
    if (clientAssessments.length > 0) {
      const sorted = [...clientAssessments].sort((a,b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      lastAssDate = Math.max(lastAssDate, new Date(sorted[0].data).getTime());
    }

    if (lastAssDate > 0 && (nowMs - lastAssDate) > TWO_MONTHS_MS) {
      profMap[profId].vencidos.push({
        alunoNome: c.dadosPessoais?.nome || c.nome,
        data: new Date(lastAssDate).toISOString().split('T')[0]
      });
    }
  });

  console.log('=== ALUNOS COM AVALIAÇÃO > 2 MESES (SEGUNDO REGRA DA API ROUTE.TS) ===');
  Object.values(profMap).forEach(p => {
    console.log(`${p.nome}: ${p.vencidos.length} alunos vencidos (-${p.vencidos.length * 10} pts)`);
    p.vencidos.forEach(v => console.log(`   - ${v.alunoNome} (${v.data})`));
  });

  process.exit(0);
}

run();
