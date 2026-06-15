const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Check if it has mangled UTF-8 like Ã© (C3 A9)
  if (content.includes('Ã©') || content.includes('Ã£') || content.includes('Ã§') || content.includes('Ãµ') || content.includes('Ã¡') || content.includes('Ã³') || content.includes('Ã­')) {
    console.log('Fixing:', filePath);
    const fixed = Buffer.from(content, 'latin1').toString('utf8');
    fs.writeFileSync(filePath, fixed, 'utf8');
  }
}

function walkSync(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkSync(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fixFile(filePath);
    }
  }
}

walkSync('src');
console.log('Done.');
