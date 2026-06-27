const fs = require('fs');
try {
  const content = fs.readFileSync('.env.production.local', 'utf8');
  content.split('\n').forEach(line => {
    if (line.includes('=')) {
      console.log(line.split('=')[0]);
    }
  });
} catch (e) {
  console.error(e);
}
