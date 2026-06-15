const fs = require('fs');
const content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');
const match = content.match(/Controle de (.*)/);
console.log('Hex:', Buffer.from(match[1]).toString('hex'));
