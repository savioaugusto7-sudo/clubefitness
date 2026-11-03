const fs = require('fs');
const mdPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_profissionais_outubro_2026.md';
let md = fs.readFileSync(mdPath, 'utf8');

const target = '## 5. DETALHAMENTO INDIVIDUAL DOS PROFISSIONAIS (RANKING HOMOLOGADO)';

const addition = `## 4.1 AUDITORIA NOMINAL DE TURNO — DÉBITOS E BÔNUS (TREINO LIVRE E EMERGÊNCIAS)

Para atender ao rigor de detalhamento contábil e auditoria operacional, seguem as tabelas nominais com a citação exaustiva de cada aluno envolvido nos critérios de fechamento de salão:

### A. Auditoria Nominal de Alunos com > 1 Emergência no Mês (-4 pts/aluno no fechamento)
Critério contratual: Aluno que demandou mais de 1 atendimento emergencial/extraordinário no mês gera débito de -4 pts para a liderança de turno (rateado 50/50 entre co-responsáveis).

| Turno | Aluno(a) Auditado(a) | Plano Ativo | Qtd. | Detalhamento das Ocorrências no Mês | Impacto no Turno |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **Manhã** | **Dante Sarmento Henrique** | Clube Fitness - Monitorado | 2 | 19/10 às 07:00 \| 21/10 às 09:00 (Travamento lombar no fim de semana) | -4 pts (-2 pts Cleiton / -2 pts Ruthi) |
| **Manhã** | **Raquel Freitas** | Clube Fitness - Monitorado | 2 | 01/10 às 15:00 \| 05/10 às 08:00 (Atendimentos sem agendamento prévio) | -4 pts (-2 pts Cleiton / -2 pts Ruthi) |
| **Tarde/Noite** | **Rafaela Vaz** | Clube Fitness - Monitorado | 4 | 09/10 às 15:00 \| 23/10 às 15:00 e 16:00 \| 27/10 às 15:00 | -4 pts (-2 pts Matheus / -2 pts Dr. Guilherme) |
| **Tarde/Noite** | **Ian Javoski Brandão Diniz** | Clube Fitness - Monitorado | 4 | 13/10 às 17:00 \| 14/10 às 17:00 \| 16/10 às 17:00 \| 19/10 às 17:00 | -4 pts (-2 pts Matheus / -2 pts Dr. Guilherme) |
| **Tarde/Noite** | **Raquel Freitas** | Clube Fitness - Monitorado | 2 | 01/10 às 15:00 \| 05/10 às 08:00 (Ocorrência mista compartilhada) | -4 pts (-2 pts Matheus / -2 pts Dr. Guilherme) |

---

### B. Auditoria Nominal de Alunos Sem o Mínimo de 1 Treino Livre Semanal (-2 pts/aluno)
Critério contratual: Aluno ativo que não realizou pelo menos 1 treino livre na semana (< 4 treinos livres no mês) gera débito de -2 pts/aluno para a liderança de turno (rateado 50/50 entre co-responsáveis).

#### 1. Turno Manhã — 34 Alunos Sem Meta Semanal (-68 pts total ➔ -34 pts Cleiton e -34 pts Ruthi):
| # | Aluno(a) | Plano Ativo | Treinos Livres Registrados | Status da Meta (Mín. 4) |
| :---: | :--- | :--- | :---: | :---: |
| 1 | Aluisio Mourão Mendes | Tratamento Personalizado | 0 | 0 de 4 (Não atingiu) |
| 2 | Ana Marta Accoroni Gonçalves Araújo | Clube Fitness - Monitorado | 3 | 3 de 4 (Faltou 1 treino) |
| 3 | Andreza Cancellieri De Souza De Moura | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 4 | Anna Luiza Nogueira Coutinho | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 5 | Célia Maria da Silva Gomes | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 6 | DANNILO FERNANDES DE SOUZA | Tratamento Personalizado | 2 | 2 de 4 (Faltaram 2 treinos) |
| 7 | Denise Palhares Calazans Guerra Lage | Clube Fitness - Monitorado | 3 | 3 de 4 (Faltou 1 treino) |
| 8 | Fabrício Galvão de Brito | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 9 | Faraílde Debossan | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 10 | Helcio Dias Florencio | Tratamento Personalizado | 0 | 0 de 4 (Não atingiu) |
| 11 | Isadora de Araujo Martins | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 12 | IVONETE L DE S JOAQUIM | Tratamento Personalizado | 2 | 2 de 4 (Faltaram 2 treinos) |
| 13 | Izaú Veras Gomes | Tratamento Personalizado | 0 | 0 de 4 (Não atingiu) |
| 14 | Juliana de Carvalho Bastone | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 15 | Juliane Valverde Rodrigues Garcia | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 16 | Julio Savio Guerra Lage | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 17 | Kelly Nascimento Brandão | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 18 | LEANDRO ALVES DE SOUZA | Clube Fitness - Monitorado | 3 | 3 de 4 (Faltou 1 treino) |
| 19 | Leandro Bueno Seixas Romagnoli | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 20 | Livia Teixeira de Lima | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 21 | Lúcia da Silva | Tratamento Personalizado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 22 | Lucio Trindade dos Reis | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 23 | Maria José Cancellieri de Souza | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 24 | Mariana Borja de Salvo | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 25 | Matheus Habibe Silva Ravaiane | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 26 | Meires Devanir Accoroni Gonçalves | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 27 | Monia Pires Novais | Clube Fitness - Monitorado | 2 | 2 de 4 (Faltaram 2 treinos) |
| 28 | Patrícia Goulart Alves | Clube Fitness - Monitorado | 3 | 3 de 4 (Faltou 1 treino) |
| 29 | Paula Maria Ferraz | Clube Fitness - Monitorado | 3 | 3 de 4 (Faltou 1 treino) |
| 30 | Raquel Freitas | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 31 | Renata Thomé Migueletto | Clube Fitness - Monitorado | 2 | 2 de 4 (Faltaram 2 treinos) |
| 32 | Ruan de Oliveira Lopes Rosa | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 33 | Sofia Araújo Campos | Tratamento Personalizado | 0 | 0 de 4 (Não atingiu) |
| 34 | Sofia Stefane Fidelis Andrade | Tratamento Personalizado | 0 | 0 de 4 (Não atingiu) |

#### 2. Turno Tarde/Noite — 42 Alunos Sem Meta Semanal (-84 pts total ➔ -42 pts Matheus e -42 pts Dr. Guilherme):
| # | Aluno(a) | Plano Ativo | Treinos Livres Registrados | Status da Meta (Mín. 4) |
| :---: | :--- | :--- | :---: | :---: |
| 1 | Afonso Celso Rabelo | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 2 | Amanda de Cássia Barbosa | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 3 | Camila Carvalho Diniz | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 4 | Carolina Rocha Guimaraes | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 5 | Cássia de Castro Ladeira Soares | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 6 | Cleonice Alves Batista | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 7 | Danielle de Jesus Ferreira | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 8 | Denise Palhares Calazans Guerra Lage | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 9 | Éder Pereira | Tratamento Personalizado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 10 | Emanuel Costa | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 11 | Francisco De assis de souza gomes | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 12 | Gabriel Lage | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 13 | Ian Javoski Brandão Diniz | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 14 | Iasmim Souza Nunes | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 15 | IVONETE L DE S JOAQUIM | Tratamento Personalizado | 2 | 2 de 4 (Faltaram 2 treinos) |
| 16 | Izabelly Carvalho | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 17 | Izaú Veras Gomes | Tratamento Personalizado | 0 | 0 de 4 (Não atingiu) |
| 18 | Juan Victor Bonifacino Ferreira Rocha | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 19 | Juliane Valverde Rodrigues Garcia | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 20 | LEANDRO ALVES DE SOUZA | Clube Fitness - Monitorado | 3 | 3 de 4 (Faltou 1 treino) |
| 21 | Lucca Gorini Rossetti | Tratamento Personalizado | 0 | 0 de 4 (Não atingiu) |
| 22 | Lúcia da Silva | Tratamento Personalizado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 23 | LUIZ ANTÔNIO ARAUJO | Clube Fitness - Monitorado | 2 | 2 de 4 (Faltaram 2 treinos) |
| 24 | Marcela Valverde Garcia | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 25 | Márcio Nogueira Resende | Tratamento Personalizado | 0 | 0 de 4 (Não atingiu) |
| 26 | Maria Aparecida dos Santos | Tratamento Personalizado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 27 | Maria Valentina Bonifacino Ferreira Rocha | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 28 | Mateus Ahlert | Tratamento Personalizado | 0 | 0 de 4 (Não atingiu) |
| 29 | Matheus Habibe Silva Ravaiane | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 30 | Miguel de Aguilar Fernandes | Tratamento Personalizado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 31 | Monia Pires Novais | Clube Fitness - Monitorado | 2 | 2 de 4 (Faltaram 2 treinos) |
| 32 | Patrícia Goulart Alves | Clube Fitness - Monitorado | 3 | 3 de 4 (Faltou 1 treino) |
| 33 | Paula Maria Ferraz | Clube Fitness - Monitorado | 3 | 3 de 4 (Faltou 1 treino) |
| 34 | Pedro Ferraz de Azevedo | Clube Fitness - Monitorado | 1 | 1 de 4 (Faltaram 3 treinos) |
| 35 | Pedro Rocha Barbosa | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 36 | Rafaela Vaz | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 37 | Raquel Freitas | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 38 | Robert Nunes Queiroz dos Santos | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 39 | Ronei Vital Gomes | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 40 | Rosália Pessoa Caldas | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 41 | Rosângela de Jesus Novais | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |
| 42 | William Santos Fagundes | Clube Fitness - Monitorado | 0 | 0 de 4 (Não atingiu) |

---

### C. Auditoria Nominal de Alunos com Meta de Treino Livre Semanal Atingida (+2 pts/aluno)
Critério contratual: Alunos que realizaram pelo menos 1 treino livre por semana ($\ge$ 4 treinos livres no mês) geram bônus de +2 pts/aluno no fechamento de turno para a liderança.

| Turno | Aluno(a) | Plano Ativo | Treinos Livres Registrados | Status Operacional | Bônus de Turno |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **Manhã** | Daniele Debossan B. P. Coelho | Clube Fitness - Monitorado | 5 | Meta superada | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Danilson Gonçalves De Melo e Silva | Clube Fitness - Monitorado | 4 | Meta atingida | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Dante Sarmento Henrique | Clube Fitness - Monitorado | 5 | Meta superada | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Eugênio Pacelli C. O. Sartori | Clube Fitness - Monitorado | 6 | Meta superada | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Fernando Brandão Diniz | Clube Fitness - Monitorado | 5 | Meta superada | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Giovana Rocha Silva | Clube Fitness - Monitorado | 8 | Destaque de engajamento | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Isabel Imaculada Alves | Clube Fitness - Monitorado | 4 | Meta atingida | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Luiz Alberto dos Santos | Clube Fitness - Monitorado | 8 | Destaque de engajamento | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Marcelo Rodrigues Motta | Clube Fitness - Monitorado | 9 | Destaque de engajamento | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Maria de Fátima S. Gottschalg | Clube Fitness - Monitorado | 4 | Meta atingida | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Mariana Martins | Clube Fitness - Monitorado | 9 | Destaque de engajamento | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Renato Brandão Diniz | Clube Fitness - Monitorado | 6 | Meta superada | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Tatiana Bonifacino | Clube Fitness - Monitorado | 4 | Meta atingida | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Manhã** | Zaime Romeu Gottshalg | Clube Fitness - Monitorado | 6 | Meta superada | +2 pts (+1 pt Cleiton / +1 pt Ruthi) |
| **Tarde/Noite** | Renato Brandão Diniz | Clube Fitness - Monitorado | 6 | Meta superada | +2 pts (+1 pt Matheus / +1 pt Dr. Guilherme) |

---

` + target;

if (md.includes(target)) {
  md = md.replace(target, addition);
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log('relatorio_pontuacao_profissionais_outubro_2026.md updated successfully!');
} else {
  console.error('Target not found in markdown file');
}

