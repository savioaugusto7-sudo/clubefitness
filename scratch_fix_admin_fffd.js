const fs = require('fs');
let content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');

const map = {
  'Configuraes': 'Configurações',
  'usurio': 'usuário',
  'Descrio': 'Descrição',
  'Observaes': 'Observações',
  'Clnicos': 'Clínicos',
  'Endereo': 'Endereço',
  'N': 'Nº',
  'Leses': 'Lesões',
  'Diagnsticos': 'Diagnósticos',
  'Leso': 'Lesão',
  'Restries': 'Restrições',
  'Contraindicaes': 'Contraindicações',
  'frequncia': 'frequência',
  'Histrico': 'Histórico',
  'Clnico': 'Clínico',
  'doenas': 'doenças',
  'crnicas': 'crônicas',
  'Clnicas': 'Clínicas',
  'Durao': 'Duração',
  'Carto': 'Cartão',
  'Alteraes': 'Alterações',
  'Cobrana': 'Cobrança',
  'Bancrio': 'Bancário',
  'Cdigo': 'Código',
  'Configuraes': 'Configurações',
  'usurio': 'usuário',
  'Descrio': 'Descrição',
  'Observaes': 'Observações',
  'Clnicos': 'Clínicos',
  'Endereo': 'Endereço',
  'N': 'Nº',
  'Leses': 'Lesões',
  'Diagnsticos': 'Diagnósticos',
  'Leso': 'Lesão',
  'Restries': 'Restrições',
  'Contraindicaes': 'Contraindicações',
  'frequncia': 'frequência',
  'Histrico': 'Histórico',
  'Clnico': 'Clínico',
  'doenas': 'doenças',
  'crnicas': 'crônicas',
  'Clnicas': 'Clínicas',
  'Durao': 'Duração',
  'Carto': 'Cartão',
  'Alteraes': 'Alterações',
  'Cobrana': 'Cobrança',
  'Bancrio': 'Bancário',
  'Cdigo': 'Código'
};

for (let [bad, good] of Object.entries(map)) {
  content = content.split(bad).join(good);
}

// remove any isolated \uFFFD
content = content.replace(/\uFFFD/g, '');

fs.writeFileSync('src/components/DashboardAdmin.tsx', content, 'utf8');
console.log('Fixed DashboardAdmin.tsx FFFD');
