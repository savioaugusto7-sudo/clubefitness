const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
      replaceInDir(full);
    } else if (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.js')) {
      let content = fs.readFileSync(full, 'utf8');
      if (content.includes('authOptions') && content.includes('[...nextauth]')) {
        const lines = content.split('\n');
        let changed = false;
        const newLines = lines.map(line => {
          if (line.includes('import') && line.includes('authOptions') && line.includes('[...nextauth]')) {
            changed = true;
            return "import { authOptions } from '@/lib/authOptions';";
          }
          return line;
        });
        if (changed) {
          fs.writeFileSync(full, newLines.join('\n'), 'utf8');
          console.log('Fixed authOptions in:', full);
        }
      }
    }
  }
}

replaceInDir('./src');
console.log('Finished updating authOptions imports.');
