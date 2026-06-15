const fs = require('fs');
const content = fs.readFileSync('src/components/DashboardAdmin.tsx', 'utf8');
const words = content.split(/[^a-zA-Z0-9_\uFFFD]+/);
const broken = words.filter(w => w.includes('\uFFFD'));
console.log([...new Set(broken)]);
