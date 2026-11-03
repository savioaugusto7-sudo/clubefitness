const { execSync } = require('child_process');
const fs = require('fs');

const pdfPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026.pdf';
const htmlPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026.html';

const edgeExe = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
const cmd = `${edgeExe} --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`;

console.log('Rendering PDF...');
execSync(cmd);

const stat = fs.statSync(pdfPath);
console.log('PDF rendered successfully:', stat.size, 'bytes, Last Modified:', stat.mtime);
