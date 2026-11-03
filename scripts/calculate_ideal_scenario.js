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

  const profs = [
    { nome: 'Pedro Grossi', role: 'Fisioterapeuta / Treinador (Equipe Tarde)', turno: 'tarde_equipe' },
    { nome: 'Cleiton Freitas', role: 'Fisioterapeuta / Co-Resp. Manhã', turno: 'manha_resp' },
    { nome: 'Matheus Poeiras Luciano', role: 'Treinador / Co-Resp. Tarde-Noite', turno: 'tarde_resp' },
    { nome: 'Dra. Rachel Zauli Serpa', role: 'Fisioterapeuta / Equipe Manhã', turno: 'manha_equipe' },
    { nome: 'Dr. Albert Nunes', role: 'Diretor Clínico / Fisioterapia', turno: 'clinica' },
    { nome: 'Dr. Guilherme José Graciano', role: 'Fisioterapeuta / Co-Resp. Tarde-Noite', turno: 'tarde_resp' },
    { nome: 'Thiago Castro Lima Rocha', role: 'Fisioterapeuta (Início 16/10)', turno: 'plantao' },
    { nome: 'Ruthi Novais', role: 'Treinadora / Avaliadora / Co-Resp. Manhã', turno: 'manha_resp' },
    { nome: 'Maria Luísa Câmara Gontijo', role: 'Fisioterapeuta (Escala Fixada)', turno: 'plantao' }
  ];

  // Procedimentos realizados no mês (incluindo os que foram glosados):
  // 1. Pedro Grossi:
  //    - 3 Avaliações Físicas: 3 x 4 = +12 pts
  //    - 3 Testes de Força: 3 x 4 = +12 pts
  //    - 6 Relatórios Fisioterápicos: 6 x 6 = +36 pts
  //    - Se montasse ficha em 24h para as 3 avaliações: +6 pts (+2 pts cada)
  //    Total Clínico Ideal: 12 + 12 + 36 + 6 = +66 pts
  //    Turno Equipe Tarde Ideal (43 alunos x 2 pts): +86 pts
  //    Ponto: 0 atraso (recupera 29 pts)
  //    SLA Débito: 0 pts (recupera 6 pts)
  //    Saldo Ideal Pedro: 66 + 86 = +152 pts

  // 2. Cleiton Freitas:
  //    - 1 Avaliação Física: +4 pts (+2 ficha = +6 pts)
  //    - 2 Relatórios: 2 x 6 = +12 pts
  //    Total Clínico Ideal: +18 pts
  //    Turno Co-Resp Manhã Ideal:
  //      - Frequência 100% (48 alunos): 50% de 336 = +168 pts
  //      - Treino Livre 100% (48 alunos): 50% de 96 = +48 pts
  //      - Emergências 100% (48 alunos): 50% de 144 = +72 pts
  //      Total Turno Ideal: +288 pts
  //    Ponto: 0 atraso (já 100% pontual)
  //    Débitos: 0 pts
  //    Saldo Ideal Cleiton: 18 + 288 = +306 pts

  // 3. Matheus Poeiras Luciano:
  //    - 1 Avaliação Física: +4 pts (+2 ficha = +6 pts)
  //    Total Clínico Ideal: +6 pts
  //    Turno Co-Resp Tarde Ideal:
  //      - Frequência 100% (43 alunos): 50% de 301 = +150,5 pts
  //      - Treino Livre 100% (43 alunos): 50% de 86 = +43 pts
  //      - Emergências 100% (43 alunos): 50% de 129 = +64,5 pts
  //      Total Turno Ideal: +258 pts
  //    Ponto: 0 atraso (recupera 10 pts)
  //    Débito Carteira: 0 pts (recupera 10 pts)
  //    Saldo Ideal Matheus: 6 + 258 = +264 pts

  // 4. Dra. Rachel Zauli Serpa:
  //    - 1 Avaliação Física: +4 pts (+2 ficha = +6 pts)
  //    - 2 Testes de Força: 2 x 4 = +8 pts
  //    - 1 Relatório: +6 pts
  //    Total Clínico Ideal: +20 pts
  //    Turno Equipe Manhã Ideal (48 alunos x 2 pts): +96 pts
  //    Ponto: 100% pontual (0m atraso)
  //    Débito Carteira: 0 pts (recupera 40 pts)
  //    Débito SLA: 0 pts (recupera 2 pts)
  //    Saldo Ideal Dra. Rachel: 20 + 96 = +116 pts

  // 5. Dr. Albert Nunes:
  //    - 11 Avaliações Físicas: 11 x 4 = +44 pts (+22 pts se fichas em 24h = +66 pts)
  //    - 5 Testes de Força: 5 x 4 = +20 pts
  //    - 4 Relatórios Válidos + 1 Glosado (Lourilda Rocha recuperado): 5 x 6 = +30 pts
  //    Total Clínico Ideal: 66 + 20 + 30 = +116 pts
  //    Débito Carteira: 0 pts (recupera 40 pts)
  //    Débito SLA: 0 pts (recupera 2 pts)
  //    Saldo Ideal Dr. Albert: +116 pts

  // 6. Dr. Guilherme José Graciano:
  //    - 6 Testes de Força: 6 x 4 = +24 pts
  //    - 6 Relatórios Válidos + 3 Glosados (Lúcia, Mateus Ahlert, Éder Pereira recuperados): 9 x 6 = +54 pts
  //    Total Clínico Ideal: 24 + 54 = +78 pts
  //    Turno Co-Resp Tarde Ideal:
  //      - Frequência 100% (43 alunos): 50% de 301 = +150,5 pts
  //      - Treino Livre 100% (43 alunos): 50% de 86 = +43 pts
  //      - Emergências 100% (43 alunos): 50% de 129 = +64,5 pts
  //      Total Turno Ideal: +258 pts
  //    Ponto: 100% pontual (recupera 89m atraso + 40 pts ausências = +129 pts)
  //    Débitos Turno: 0 pts (recupera 60,5 pts)
  //    Saldo Ideal Dr. Guilherme: 78 + 258 = +336 pts

  // 7. Ruthi Novais:
  //    - 2 Avaliações Físicas: 2 x 4 = +8 pts (+4 pts fichas em 24h = +12 pts)
  //    Total Clínico Ideal: +12 pts
  //    Turno Co-Resp Manhã Ideal:
  //      - Frequência 100% (48 alunos): 50% de 336 = +168 pts
  //      - Treino Livre 100% (48 alunos): 50% de 96 = +48 pts
  //      - Emergências 100% (48 alunos): 50% de 144 = +72 pts
  //      Total Turno Ideal: +288 pts
  //    Ponto: 100% pontual (recupera 60 pts ausências + 22 pts atrasos = +82 pts)
  //    Débitos Carteira/SLA: 0 pts (recupera 30 pts carteira + 4 pts SLA = +34 pts)
  //    Débitos Turno: 0 pts (recupera 70,5 pts)
  //    Saldo Ideal Ruthi: 12 + 288 = +300 pts

  // 8. Thiago Castro Lima Rocha:
  //    - Ponto: 100% pontual nos seus plantões (recupera 40 pts ausências + 5 pts atrasos = +45 pts)
  //    - Se assumir atendimentos clínicos na 2ª quinzena (ex: 4 procedimentos = +20 pts)
  //    Saldo Ideal Base Ponto: 0 pts (neutraliza perdas) ou positivo com produção

  // 9. Maria Luísa Câmara Gontijo:
  //    - 1 Relatório Clínico: +6 pts
  //    - Ponto: 100% pontual nos 10 plantões (recupera 60 pts ausências + 52 pts atrasos = +112 pts)
  //    Saldo Ideal Maria Luísa: +6 pts (ou +18 pts com novos atendimentos)

  console.log('Calculation model established.');
  await mongoose.disconnect();
}
run();

