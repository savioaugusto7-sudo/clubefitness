const fs = require('fs');
const content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');
const match = content.match(/Controle de (.*)/);
console.log('Admin Match:', match ? match[1] : 'none');
