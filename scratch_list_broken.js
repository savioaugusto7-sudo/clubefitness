const fs = require('fs');
const content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');
const words = content.split(/[^a-zA-Z0-9_\uFFFD]+/);
const broken = words.filter(w => w.includes('\uFFFD'));
console.log([...new Set(broken)]);
