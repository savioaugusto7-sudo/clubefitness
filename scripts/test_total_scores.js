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

  console.log('Calculating complete score with all debits...');

  // Base clinical points:
  // Cleiton: +16
  // Matheus: +4
  // Pedro: +60
  // Rachel: +18
  // Albert: +88
  // Guilherme: +60
  // Ruthi: +8
  // Thiago: 0
  // Maria Luísa: +6

  // Meta turno (+):
  // Cleiton: +122.5 (35 * 3.5)
  // Ruthi: +122.5 (35 * 3.5)
  // Rachel: +70 (35 * 2)
  // Matheus: +133 (38 * 3.5)
  // Guilherme: +133 (38 * 3.5)
  // Pedro: +76 (38 * 2)
  // Albert: 0
  // Thiago: 0
  // Maria Luísa: 0

  // Débito 1: SLA Ficha 24h (-2 pts)
  // Albert: -2
  // Rachel: -2
  // Pedro: -6
  // Ruthi: -4
  // Matheus: -2 (abonado -> 0)

  // Débito 2: Avaliação/Ficha vencida > 2 meses (-10 pts)
  // Ruthi: -20 (2 alunas ativas: Camila Carvalho e Raquel Gomes)
  // Albert: -120 (12 alunos ativos vinculados)
  // Guilherme: 0
  // Demais: 0

  // Débito 3: Frequência < 80% (-5 pts/aluno)
  // Manhã: 13 alunos * -5 = -65 pts (-32.5 para Cleiton e -32.5 para Ruthi)
  // Tarde: 5 alunos * -5 = -25 pts (-12.5 para Matheus e -12.5 para Guilherme)

  // Débito 4: Treino Livre Semanal < 4 no mês (-2 pts/aluno)
  // Manhã: 34 alunos * -2 = -68 pts (-34 para Cleiton e -34 para Ruthi)
  // Tarde: 42 alunos * -2 = -84 pts (-42 para Matheus e -42 para Guilherme)

  // Débito 5: Emergências > 1 no mês (-4 pts/aluno)
  // Manhã: 2 alunos * -4 = -8 pts (-4 para Cleiton e -4 para Ruthi)
  // Tarde: 3 alunos * -4 = -12 pts (-6 para Matheus e -6 para Guilherme)

  // Débito Ponto: Ausência (-20 pts/dia)
  // Ruthi: -60 (3 dias)
  // Guilherme: -40 (2 dias)
  // Thiago: -40 (2 dias)
  // Maria Luísa: -60 (3 dias)

  // Débito Ponto: Atrasos (-1 pt/min)
  // Pedro: -29 (29 min)
  // Ruthi: -22 (22 min)
  // Matheus: -10 (10 min)
  // Guilherme: -89 (89 min)
  // Thiago: -5 (5 min)
  // Maria Luísa: -52 (52 min)

  console.log('Done mapping.');
  process.exit(0);
}

run();

