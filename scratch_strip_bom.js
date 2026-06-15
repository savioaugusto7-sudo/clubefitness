const fs = require('fs');
const path = require('path');

function stripBOM(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) {
    console.log('Stripping BOM from:', filePath);
    content = content.slice(1);
    fs.writeFileSync(filePath, content, 'utf8');
  }
}

function walkSync(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkSync(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      stripBOM(filePath);
    }
  }
}

walkSync('src');
console.log('BOM cleanup complete.');
