const fs = require('fs');
const path = require('path');

function stripFFFD(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbf && buffer[2] === 0xbd) {
    console.log('Stripping U+FFFD from:', filePath);
    fs.writeFileSync(filePath, buffer.slice(3));
  } else if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    console.log('Stripping normal BOM from:', filePath);
    fs.writeFileSync(filePath, buffer.slice(3));
  }
}

function walkSync(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkSync(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      stripFFFD(filePath);
    }
  }
}

walkSync('src');
console.log('Cleanup complete.');
