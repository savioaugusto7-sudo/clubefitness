const fs = require('fs');
const content = fs.readFileSync('C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026.html', 'utf8');

function inspectProf(name) {
  const startIdx = content.indexOf(`prof-name">${name}`);
  if (startIdx === -1) {
    console.log('Not found:', name);
    return;
  }
  const endIdx = content.indexOf('Débitos Registrados', startIdx);
  const section = content.slice(startIdx, endIdx);

  const trs = section.split('<tr>').slice(2); // skip header
  let evalPts = 0, evalCount = 0;
  let testPts = 0, testCount = 0;
  let reportPts = 0, reportCount = 0;

  trs.forEach(tr => {
    const isEval = tr.includes('Avaliação Física');
    const isTest = tr.includes('Teste de Força');
    const isReport = tr.includes('Relatório Clínico');
    const mPts = tr.match(/\+([0-9]+) pts/);
    const pts = mPts ? parseInt(mPts[1]) : 0;

    if (isEval) { evalCount++; evalPts += pts; }
    else if (isTest) { testCount++; testPts += pts; }
    else if (isReport) { reportCount++; reportPts += pts; }
  });

  console.log(`${name}: Aval=${evalPts} pts (${evalCount}) | Testes=${testPts} pts (${testCount}) | Relat=${reportPts} pts (${reportCount}) | Total=${evalPts + testPts + reportPts} pts`);
}

inspectProf('Pedro Grossi');
inspectProf('Cleiton Freitas');
inspectProf('Matheus Poeiras Luciano');
inspectProf('Dra. Rachel Zauli Serpa');
inspectProf('Dr. Albert Nunes');
inspectProf('Dr. Guilherme José Graciano');
inspectProf('Thiago Castro Lima Rocha');
inspectProf('Ruthi Novais');
inspectProf('Maria Luísa Câmara Gontijo');
