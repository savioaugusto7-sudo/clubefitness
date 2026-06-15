const fs = require('fs');
const content = fs.readFileSync('src/components/DashboardProfessional.tsx', 'utf8');
console.log('Includes :', content.includes(''));
console.log('Includes Ã©:', content.includes('Ã©'));
