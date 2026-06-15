const fs = require('fs');
const buffer = fs.readFileSync('src/components/DashboardAdmin.tsx');
console.log('First 20 bytes:', buffer.slice(0, 20).toString('hex'));
console.log('First 20 chars:', buffer.slice(0, 20).toString('utf8'));
