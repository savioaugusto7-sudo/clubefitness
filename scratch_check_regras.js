const fs = require('fs');
const content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');
const lines = content.split('\n');
const matchLine = lines.findIndex(l => l.includes('Regras'));
if (matchLine !== -1) {
  console.log(lines.slice(Math.max(0, matchLine - 5), matchLine + 10).join('\n'));
}
