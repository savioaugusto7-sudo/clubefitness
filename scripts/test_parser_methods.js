const fs = require('fs');
const { PDFParse } = require('../node_modules/pdf-parse');

const pdfPath = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026.pdf';

async function run() {
  const buf = fs.readFileSync(pdfPath);
  const parser = new PDFParse(buf);
  console.log('Parser methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
  const res = await parser.getText();
  console.log('Text length:', res?.text?.length || res?.length);
  const text = res?.text || res;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  console.log('Lines count:', lines.length);
  lines.slice(0, 30).forEach((l, i) => console.log(`[${i+1}] ${l}`));
}

run().catch(console.error);
