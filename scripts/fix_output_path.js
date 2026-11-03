const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'generate_full_mobile_report.js');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const outputPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026.html';",
  "const outputPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026_mobile.html';"
);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed outputPath in generate_full_mobile_report.js');

