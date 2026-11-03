const { execSync } = require('child_process');
const fs = require('fs');

const pdfPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026_mobile.pdf';
const htmlPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026_mobile.html';
const downloadsPath = 'C:/Users/user/Downloads/relatorio_pontuacao_outubro_2026_mobile.pdf';
const workspacePath = 'c:/Users/user/.gemini/antigravity-ide/scratch/relatorio_pontuacao_outubro_2026_mobile.pdf';

const edgeExe = '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"';
const cmd = `${edgeExe} --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`;

console.log('Rendering Full Mobile PDF with Microsoft Edge...');
execSync(cmd);

const stat = fs.statSync(pdfPath);
console.log('Mobile PDF rendered successfully:', stat.size, 'bytes, Last Modified:', stat.mtime);

fs.copyFileSync(pdfPath, downloadsPath);
fs.copyFileSync(pdfPath, workspacePath);
console.log('Copied to Downloads:', downloadsPath);
console.log('Copied to Workspace:', workspacePath);

