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

  console.log('=== AUDITORIA COMPLETA DE CADA TIPO DE SOMA (+) E DE DÉBITO (-) ===\n');

  // Let us inspect the exact numbers for each professional
  // 1. Procedimentos Clínicos:
  // - Avaliação Física: +4 pts
  // - Teste de Força: +4 pts
  // - Relatório Fisioterápico: +6 pts
  // - Ficha de Treino em <= 24h: +2/+4 pts (0 encontradas)
  
  // 2. Metas de Turno:
  // - Frequência >= 80%: +7 pts Resp. (div 50/50: +3.5 pts cada) / +2 pts Equipe
  //   Manhã: 35 alunos -> Cleiton: +122.5, Ruthi: +122.5, Rachel: +70
  //   Tarde: 38 alunos -> Matheus: +133, Guilherme: +133, Pedro: +76
  
  // 3. Treino Livre Ativo (+2 pts/aluno):
  //   Manhã: 14 alunos atingiram -> +28 pts total (se dividido 50/50: +14 pts Cleiton, +14 pts Ruthi; Rachel equipe: se equipe ganha, quanto?)
  //   Tarde: 1 aluno atingiu -> +2 pts total (se dividido 50/50: +1 pt Matheus, +1 pt Guilherme)
  
  // 4. Emergências <= 1 (+3 pts/aluno):
  //   Manhã: 46 alunos com <= 1 emergência -> +138 pts total (se dividido 50/50: +69 pts Cleiton, +69 pts Ruthi)
  //   Tarde: 40 alunos com <= 1 emergência -> +120 pts total (se dividido 50/50: +60 pts Matheus, +60 pts Guilherme)
  
  // Let's verify how the user formulated this and what the breakdown shows.
  console.log('Script ready to check.');
  process.exit(0);
}
run();

