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
  const workouts = await db.collection('clientworkouts').find({}).toArray();
  const physicalAssessments = await db.collection('physicalassessments').find({}).toArray();
  const appointments = await db.collection('appointments').find({
    data: { $gte: '2026-10-01', $lte: '2026-10-31' }
  }).toArray();

  console.log(`=== AUDITORIA DOS CRITÉRIOS DE DÉBITO DO SISTEMA ===\n`);

  // Critério 1: Avaliação/Teste/Relatório sem Ficha após 24h: -2 pts
  // Já aplicamos em alguns casos (Pedro, Albert, Rachel, Ruthi)

  // Critério 2: Avaliação ou Ficha vencida há > 2 meses: -10 pts (profissional vinculado)
  console.log('--- 2. AVALIAÇÃO OU FICHA VENCIDA HÁ > 2 MESES (-10 pts) ---');
  // Data de referência de fechamento: 31/10/2026. > 2 meses atrás = antes de 31/08/2026 (ou 01/09/2026)
  // Verificar quais clientes ativos têm profissional vinculado e última avaliação ou ficha > 2 meses
  let totalVencidas = 0;
  clients.forEach(c => {
    const respId = c.dadosClinicos?.profissionalResponsavelId;
    const respNome = profMap.get(String(respId)) || c.dadosClinicos?.profissionalResponsavelNome;
    const st = c.dadosComerciais?.status;
    const plano = (c.dadosComerciais?.contrato || c.plano || '').toLowerCase();
    
    // Verificar se cliente é ativo
    if (st === 'ativo' || st === 'pendente') {
      // achar última avaliação do cliente
      const clientAssessments = physicalAssessments.filter(a => String(a.clienteId) === String(c._id));
      clientAssessments.sort((a,b) => b.data.localeCompare(a.data));
      const lastAss = clientAssessments[0];

      // achar última ficha do cliente
      const clientW = workouts.find(w => String(w.clienteId) === String(c._id));
      let lastWorkoutDate = null;
      if (clientW) {
        (clientW.fichasMonitorado || []).forEach(f => {
          if (f.ultimaAtualizacao && (!lastWorkoutDate || f.ultimaAtualizacao > lastWorkoutDate)) lastWorkoutDate = f.ultimaAtualizacao;
        });
      }

      // Check if either is > 2 months old (e.g. before 2026-09-01)
      const assVencida = lastAss ? (lastAss.data < '2026-09-01') : true;
      const fichaVencida = lastWorkoutDate ? (lastWorkoutDate < '2026-09-01') : true;

      if ((assVencida || fichaVencida) && respNome) {
        totalVencidas++;
        // console.log(`Cliente: ${c.dadosPessoais?.nome || c.nome} | Resp: ${respNome} | Ult. Aval: ${lastAss?.data || 'Nenhuma'} | Ult. Ficha: ${lastWorkoutDate || 'Nenhuma'}`);
      }
    }
  });
  console.log(`Total de clientes com avaliação/ficha vencida > 2 meses e profissional vinculado: ${totalVencidas}`);

  // Critério 3: Aluno ativo com frequência mensal < 80% (fechamento): -5 pts/aluno
  console.log('\n--- 3. ALUNO ATIVO COM FREQUÊNCIA MENSAL < 80% (FECHAMENTO): -5 pts/aluno ---');
  // Quem recebe esse débito?
  // Na regra do card diz: "Aluno ativo com frequência mensal < 80% (fechamento): -5 pts/aluno"
  // Na versão anterior que gerou 1700 pontos negativos (Image 2 que o usuário mandou!), Guilherme recebeu -1.754 pts e Maria -1.794 pts!
  // Por que eles receberam -1700 pts? Porque o sistema debitou -5 pts de TODOS os alunos abaixo de 80% para o profissional vinculado ou para todos!

  // Critério 4: Aluno sem o mín. de 1 Treino Livre na semana (fechamento): -2 pts/aluno
  console.log('\n--- 4. ALUNO SEM O MÍN. DE 1 TREINO LIVRE NA SEMANA (FECHAMENTO): -2 pts/aluno ---');

  // Critério 5: Aluno com > 1 emergência no mês (fechamento): -4 pts/aluno
  console.log('\n--- 5. ALUNO COM > 1 EMERGÊNCIA NO MÊS (FECHAMENTO): -4 pts/aluno ---');
  
  process.exit(0);
}

run();

