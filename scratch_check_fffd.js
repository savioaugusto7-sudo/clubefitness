const fs = require('fs');
const content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('\uFFFD')) {
    console.log('Line ' + (i + 1) + ':', line.trim());
  }
});
