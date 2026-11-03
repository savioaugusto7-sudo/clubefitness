const fs = require('fs');
const { PDFParse } = require('../node_modules/pdf-parse');

const pdfPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026.pdf';

async function run() {
  const buf = fs.readFileSync(pdfPath);
  const parser = new PDFParse(new Uint8Array(buf));
  const res = await parser.getText();
  const text = typeof res === 'string' ? res : (res?.text || '');
  console.log('=== LEITURA COMPLETA DE TODAS AS LINHAS DO PDF GERADO ===');
  console.log(`Tamanho total do texto: ${text.length} caracteres`);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  console.log(`Total de linhas: ${lines.length}`);
  
  lines.forEach((line, i) => {
    console.log(`[L${String(i+1).padStart(4, '0')}] ${line}`);
  });
}

run().catch(console.error);
