const fs = require('fs');
const content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');
const lines = content.split('\n');
const matchLine = lines.findIndex(l => l.includes('const handleOpenRulesModal'));
if (matchLine !== -1) {
  console.log(lines.slice(matchLine, matchLine + 20).join('\n'));
}
