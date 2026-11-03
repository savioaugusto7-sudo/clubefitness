const fs = require('fs');
const path = require('path');
const pdfParse = require('../node_modules/pdf-parse');

const pdfPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026.pdf';

async function readPdf() {
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);

  console.log(`=== METADADOS DO PDF ===`);
  console.log(`Número Total de Páginas: ${data.numpages}`);
  console.log(`Tamanho do Arquivo: ${dataBuffer.length} bytes`);
  console.log(`Total de Caracteres Extraídos: ${data.text.length}`);

  const lines = data.text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  console.log(`Total de Linhas Extraídas: ${lines.length}\n`);

  console.log('=== LEITURA DE TODAS AS LINHAS DO PDF ===');
  lines.forEach((line, idx) => {
    console.log(`[L${String(idx + 1).padStart(4, '0')}] ${line}`);
  });
}

readPdf().catch(err => {
  console.error('Error reading PDF:', err);
  process.exit(1);
});
