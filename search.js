const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'src', 'components', 'DashboardProfessional.tsx'),
  path.join(__dirname, 'src', 'utils', 'pdfGenerator.ts'),
  path.join(__dirname, 'src', 'models', 'PhysioReport.ts')
];

files.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  console.log(`=== ${path.basename(filePath)} ===`);
  lines.forEach((line, idx) => {
    if (/maigne|estrela/i.test(line)) {
      console.log(`Line ${idx + 1}: ${line.trim()}`);
    }
  });
});
