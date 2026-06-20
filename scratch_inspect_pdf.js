const fs = require('fs');
const txt = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');
const lines = txt.split('\n');
lines.forEach((l, i) => {
  if (l.includes('ContractPDF') || l.includes('contractPdf') || l.includes('downloadContract') || l.includes('gerarPDF') || l.includes('Baixar PDF') || l.includes('pdf') || l.includes('PDF')) {
    console.log(i + 1, l.trim().substring(0, 130));
  }
});
