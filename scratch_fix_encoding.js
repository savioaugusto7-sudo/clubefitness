const fs = require('fs');
const content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');
const fixed = Buffer.from(content, 'latin1').toString('utf8');
fs.writeFileSync('src/components/DashboardAdmin_fixed.tsx', fixed, 'utf8');
