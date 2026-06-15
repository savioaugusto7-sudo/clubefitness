const fs = require('fs');
const path = require('path');

let found = false;

function searchFFFD(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('\uFFFD')) {
    console.log('U+FFFD found in:', filePath);
    found = true;
  }
}

function walkSync(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      walkSync(filePath);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      searchFFFD(filePath);
    }
  }
}

walkSync('src');
if (!found) {
  console.log('No U+FFFD characters found in src/');
}
