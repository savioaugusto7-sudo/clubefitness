const fs = require('fs');
const content = fs.readFileSync('src/components/DashboardProfessional.tsx', 'utf8');
const regex = /Hor.rios/g;
const matches = content.match(regex);
if (matches) {
  console.log(matches);
  for (let m of matches) {
    console.log(m, Buffer.from(m).toString('hex'));
  }
}
