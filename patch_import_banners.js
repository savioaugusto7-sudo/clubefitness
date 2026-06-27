const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/DashboardProfessional.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const useCRLF = content.includes('\r\n');
if (useCRLF) content = content.replace(/\r\n/g, '\n');

// ========================
// 1. Step 3: Replace goniometry import button block with banner
// ========================
const gonioMarker = "Goniometria & Mobilidade Articular</h4>";
const gonioBlockEnd = "Importar da \u00daltima Avalia\u00e7\u00e3o\n                          </button>\n                        );\n                      })()\n                    }\n                    </div>";

// Find and replace the entire header div including the old IIFE button
const oldHeaderStart = "                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>\n                      <h4 style={{ margin: 0 }}>Goniometria & Mobilidade Articular</h4>\n                      {(() => {";
const oldHeaderEnd = "                    </div>\n\n                    <div className=\"table-responsive\"";

if (!content.includes(oldHeaderStart)) {
  console.error('Cannot find old goniometry header start');
  process.exit(1);
}

const startIdx = content.indexOf(oldHeaderStart);
const endIdx = content.indexOf("                    <div className=\"table-responsive\"", startIdx);
if (endIdx < 0) {
  console.error('Cannot find table-responsive after goniometry header');
  process.exit(1);
}

const oldBlock = content.substring(startIdx, endIdx);
const newBlock = `                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0 }}>Goniometria & Mobilidade Articular</h4>
                    </div>
                    {(() => {
                      const latest = getLatestRepAssessment();
                      if (!latest) return null;
                      return (
                        <div style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-file-medical" style={{ color: 'var(--color-primary)' }}></i>
                            <span>Avalia\u00e7\u00e3o F\u00edsica dispon\u00edvel: <strong>{fmtDateBR(latest.data)}</strong></span>
                          </div>
                          <button type="button" className="btn btn-sm" style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => importFromPhysAssessment(['goniometria'])}>
                            <i className="fa-solid fa-download" style={{ marginRight: '5px' }}></i>Importar Goniometria
                          </button>
                        </div>
                      );
                    })()}

`;
content = content.substring(0, startIdx) + newBlock + content.substring(endIdx);
console.log('\u2705 Step 3 goniometry banner replaced');

// ========================
// 2. Step 3: Add import banner after "Testes Cl\u00ednicos Especiais de Encurtamento" h4
// ========================
const testesAnchor = `>Testes Cl\u00ednicos Especiais de Encurtamento</h4>\n                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr'`;
const testesAnchorNew = `>Testes Cl\u00ednicos Especiais de Encurtamento</h4>
                    {(() => {
                      const latest = getLatestRepAssessment();
                      if (!latest?.dadosMedidos?.testesEspeciais) return null;
                      return (
                        <div style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-file-medical" style={{ color: 'var(--color-primary)' }}></i>
                            <span>Avalia\u00e7\u00e3o F\u00edsica: <strong>{fmtDateBR(latest.data)}</strong> \u2014 Testes de Ober e Thomas dispon\u00edveis</span>
                          </div>
                          <button type="button" className="btn btn-sm" style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => importFromPhysAssessment(['testes'])}>
                            <i className="fa-solid fa-download" style={{ marginRight: '5px' }}></i>Importar Testes
                          </button>
                        </div>
                      );
                    })()}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr'`;
if (!content.includes(testesAnchor)) {
  console.error('Cannot find testes anchor');
  process.exit(1);
}
content = content.replace(testesAnchor, testesAnchorNew);
console.log('\u2705 Special tests banner added');

// ========================
// 3. Add Y-Test import banner
// ========================
const yTestAnchor = `                    {/* Y TESTE */}\n                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>\n                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>`;
const yTestNew = `                    {/* Y TESTE */}
                    {(() => {
                      const latest = getLatestRepAssessment();
                      if (!latest?.dadosMedidos?.testesEspeciais?.yTest) return null;
                      return (
                        <div style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-file-medical" style={{ color: 'var(--color-primary)' }}></i>
                            <span>Avalia\u00e7\u00e3o F\u00edsica: <strong>{fmtDateBR(latest.data)}</strong> \u2014 Y-Test dispon\u00edvel</span>
                          </div>
                          <button type="button" className="btn btn-sm" style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => importFromPhysAssessment(['ytest'])}>
                            <i className="fa-solid fa-download" style={{ marginRight: '5px' }}></i>Importar Y-Test
                          </button>
                        </div>
                      );
                    })()}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>`;
if (!content.includes(yTestAnchor)) {
  console.error('Cannot find Y-Test anchor');
  process.exit(1);
}
content = content.replace(yTestAnchor, yTestNew);
console.log('\u2705 Y-Test import banner added');

// ========================
// 4. Add Step Down import banner before ESTRELA MAIGNE
// ========================
const maigneAnchor = `                    {/* ESTRELA MAIGNE */}`;
const maigneNew = `                    {/* STEP DOWN IMPORT BANNER */}
                    {(() => {
                      const latest = getLatestRepAssessment();
                      if (!latest?.dadosMedidos?.testesEspeciais?.stepDown) return null;
                      return (
                        <div style={{ background: 'rgba(13,148,136,0.07)', border: '1px solid var(--color-primary)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem' }}>
                            <i className="fa-solid fa-file-medical" style={{ color: 'var(--color-primary)' }}></i>
                            <span>Avalia\u00e7\u00e3o F\u00edsica: <strong>{fmtDateBR(latest.data)}</strong> \u2014 Step Down dispon\u00edvel</span>
                          </div>
                          <button type="button" className="btn btn-sm" style={{ background: 'var(--color-primary)', color: '#fff', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => importFromPhysAssessment(['stepdown'])}>
                            <i className="fa-solid fa-download" style={{ marginRight: '5px' }}></i>Importar Step Down
                          </button>
                        </div>
                      );
                    })()}

                    {/* ESTRELA MAIGNE */}`;
if (!content.includes(maigneAnchor)) {
  console.error('Cannot find ESTRELA MAIGNE anchor');
  process.exit(1);
}
content = content.replace(maigneAnchor, maigneNew);
console.log('\u2705 Step Down import banner added');

if (useCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(filePath, content, 'utf8');
console.log('\u2705 All done!');
