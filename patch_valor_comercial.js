const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'src', 'components', 'DashboardAdmin.tsx');
const recepPath = path.join(__dirname, 'src', 'components', 'DashboardReceptionist.tsx');

function patchAdmin() {
  let content = fs.readFileSync(adminPath, 'utf8');

  // 1. Add state variable for dcValorUnitario
  content = content.replace(
    "const [dcVigenciaQtd, setDcVigenciaQtd] = useState(1);",
    `const [dcVigenciaQtd, setDcVigenciaQtd] = useState(1);
  const [dcValorUnitario, setDcValorUnitario] = useState(0);`
  );

  // 2. Load dcValorUnitario in openClientModal
  content = content.replace(
    "setDcDuracao(c.dadosComerciais?.duracao || 'mensal');\n                              setDcVigenciaQtd(c.dadosComerciais?.duracaoQtd || 1);",
    `setDcDuracao(c.dadosComerciais?.duracao || 'mensal');
                              setDcVigenciaQtd(c.dadosComerciais?.duracaoQtd || 1);
                              setDcValorUnitario(c.dadosComerciais?.valorUnitario || 0);`
  );

  // 3. Update useEffect dcPlano suggestion to suggest dcValorUnitario too
  const oldEffect = `  useEffect(() => {
    if (dcPlano) {
      const plan = plans.find((p: any) => p._id === dcPlano);
      if (plan) {
        let sugDur = 'mensal';
        let sugQtd = 1;
        if (plan.tipo === 'Anual' || plan.validadeDias > 180) {
          sugDur = 'anual';
          sugQtd = 1;
        } else if (plan.validadeDias === 14 || plan.validadeDias === 7) {
          sugDur = 'semana';
          sugQtd = plan.validadeDias === 14 ? 2 : 1;
        } else {
          sugDur = 'mensal';
          sugQtd = Math.round(plan.validadeDias / 30) || 1;
        }
        setDcDuracao(sugDur);
        setDcVigenciaQtd(sugQtd);
        if (sugDur === 'anual') {
          setDcParcelas(12);
        } else if (sugDur === 'mensal') {
          setDcParcelas(sugQtd);
        } else {
          setDcParcelas(1);
        }
      }
    }
  }, [dcPlano, plans]);`;

  const newEffect = `  useEffect(() => {
    if (dcPlano) {
      const plan = plans.find((p: any) => p._id === dcPlano);
      if (plan) {
        let sugDur = 'mensal';
        let sugQtd = 1;
        if (plan.tipo === 'Anual' || plan.validadeDias > 180) {
          sugDur = 'anual';
          sugQtd = 1;
        } else if (plan.validadeDias === 14 || plan.validadeDias === 7) {
          sugDur = 'semana';
          sugQtd = plan.validadeDias === 14 ? 2 : 1;
        } else {
          sugDur = 'mensal';
          sugQtd = Math.round(plan.validadeDias / 30) || 1;
        }
        setDcDuracao(sugDur);
        setDcVigenciaQtd(sugQtd);
        setDcValorUnitario(plan.preco || 0); // Sugere o preço do plano
        if (sugDur === 'anual') {
          setDcParcelas(12);
        } else if (sugDur === 'mensal') {
          setDcParcelas(sugQtd);
        } else {
          setDcParcelas(1);
        }
      }
    }
  }, [dcPlano, plans]);`;

  content = content.replace(oldEffect, newEffect);

  // 4. Update Computed values for gross value calculation
  const computedOld = `  // Computed values for contract and commercial details
  const selectedPlan = plans.find((p: any) => p._id === dcPlano);
  const valorBruto = selectedPlan ? selectedPlan.preco : 0;`;

  const computedNew = `  // Computed values for contract and commercial details
  const selectedPlan = plans.find((p: any) => p._id === dcPlano);
  const valorBruto = dcDuracao === 'anual' ? dcValorUnitario : (dcValorUnitario * dcVigenciaQtd);`;

  content = content.replace(computedOld, computedNew);

  // 5. Update save commercial details payloads to include valorUnitario
  content = content.replace(
    /duracaoQtd: dcVigenciaQtd,\s*vencimento: dcVencimento,/g,
    `duracaoQtd: dcVigenciaQtd,
            valorUnitario: dcValorUnitario,
            vencimento: dcVencimento,`
  );

  // 6. Replace the gross calculation inside generateContractTemplate
  content = content.replace(
    `    const bruto = plan.preco || 0;
    const descVal = Number(dcDescontoValor) || 0;
    let liquido = bruto;`,
    `    const bruto = dcDuracao === 'anual' ? dcValorUnitario : (dcValorUnitario * dcVigenciaQtd);
    const descVal = Number(dcDescontoValor) || 0;
    let liquido = bruto;`
  );

  // 7. Update Real-time financial summary boxes to be extremely descriptive
  const oldSummaryBox = `<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Valor Bruto</span>
                          <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>R$ {valorBruto.toLocaleString('pt-BR')}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Desconto ({dcDescontoTipo === 'percentual' ? \`\${dcDescontoValor}%\` : 'Fixo'})</span>
                          <strong style={{ fontSize: '1.2rem', color: 'var(--color-danger)' }}>- R$ {descontoReais.toLocaleString('pt-BR')}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Valor Líquido</span>
                          <strong style={{ fontSize: '1.2rem', color: 'var(--color-success)' }}>R$ {valorLiquido.toLocaleString('pt-BR')}</strong>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', textTransform: 'uppercase', marginBottom: '4px' }}>Parcelamento</span>
                          <strong style={{ fontSize: '1.2rem', color: 'var(--text-main)' }}>{dcParcelas}x R$ {valorParcela.toLocaleString('pt-BR')}</strong>
                        </div>
                      </div>`;

  const newSummaryBox = `<div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          <i className="fa-solid fa-calculator" style={{ marginRight: '6px' }}></i> Resumo Financeiro em Tempo Real
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', textAlign: 'center' }}>
                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Subtotal Bruto</div>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)', display: 'block', marginTop: '4px' }}>R$ {valorBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            <small style={{ fontSize: '0.65rem', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                              {dcDuracao === 'semana' 
                                ? \`\${dcVigenciaQtd} sem. x R$ \${dcValorUnitario.toFixed(2)}\` 
                                : dcDuracao === 'mensal' 
                                ? \`\${dcVigenciaQtd} meses x R$ \${dcValorUnitario.toFixed(2)}\` 
                                : 'Valor Anual Fixo'}
                            </small>
                          </div>
                          
                          <div style={{ background: 'rgba(239,68,68,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.1)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', textTransform: 'uppercase' }}>Desconto Aplicado</div>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--color-danger)', display: 'block', marginTop: '4px' }}>- R$ {descontoReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            <small style={{ fontSize: '0.65rem', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                              {dcDescontoTipo === 'percentual' ? \`\${dcDescontoValor}% de desconto\` : 'Valor de desconto fixo'}
                            </small>
                          </div>

                          <div style={{ background: 'rgba(16,185,129,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.1)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', textTransform: 'uppercase' }}>Total Líquido</div>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--color-success)', display: 'block', marginTop: '4px' }}>R$ {valorLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            <small style={{ fontSize: '0.65rem', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>Valor final contratado</small>
                          </div>

                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Parcelamento ({dcFormaPag.toUpperCase()})</div>
                            <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)', display: 'block', marginTop: '4px' }}>{dcParcelas}x R$ {valorParcela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            <small style={{ fontSize: '0.65rem', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                              {dcParcelas > 1 ? 'Mensalidades parceladas' : 'Pagamento à vista'}
                            </small>
                          </div>
                        </div>
                      </div>`;

  content = content.replace(oldSummaryBox, newSummaryBox);

  // 8. Add the dynamic price unit field to the UI
  // Find where Vigencia do Contrato is in the UI
  const formRow1 = `                          <select className="select-custom" value={dcDuracao} onChange={e => {
                              setDcDuracao(e.target.value);
                              if (e.target.value === 'anual') {
                                setDcVigenciaQtd(1);
                              }
                            }} disabled={hasActiveSignedContract}>
                              <option value="semana">Semana(s)</option>
                              <option value="mensal">Mensal</option>
                              <option value="anual">Anual (12 Meses)</option>
                            </select>
                          </div>
                          {(dcDuracao === 'semana' || dcDuracao === 'mensal') && (
                            <div style={{ width: '80px' }}>
                              <label>Qtd</label>
                              <input type="number" className="form-control" value={dcVigenciaQtd} onChange={e => setDcVigenciaQtd(Math.max(1, Number(e.target.value)))} min={1} disabled={hasActiveSignedContract} />
                            </div>
                          )}
                        </div>`;

  const newFormRow1 = `                          <select className="select-custom" value={dcDuracao} onChange={e => {
                              setDcDuracao(e.target.value);
                              if (e.target.value === 'anual') {
                                setDcVigenciaQtd(1);
                              }
                            }} disabled={hasActiveSignedContract}>
                              <option value="semana">Semana(s)</option>
                              <option value="mensal">Mensal</option>
                              <option value="anual">Anual (12 Meses)</option>
                            </select>
                          </div>
                          {(dcDuracao === 'semana' || dcDuracao === 'mensal') && (
                            <div style={{ width: '80px' }}>
                              <label>Qtd</label>
                              <input type="number" className="form-control" value={dcVigenciaQtd} onChange={e => setDcVigenciaQtd(Math.max(1, Number(e.target.value)))} min={1} disabled={hasActiveSignedContract} />
                            </div>
                          )}
                        </div>
                        <div className="form-group">
                          <label>{dcDuracao === 'semana' ? 'Valor Semanal (R$)' : dcDuracao === 'anual' ? 'Valor Anual (R$)' : 'Valor Mensal (R$)'}</label>
                          <input type="number" className="form-control" value={dcValorUnitario} onChange={e => setDcValorUnitario(Number(e.target.value))} min={0} disabled={hasActiveSignedContract} />
                        </div>`;

  content = content.replace(formRow1, newFormRow1);

  // 9. Update Live Notice simulation text (line 3413) to show the monthly rate
  const noticeSearch = "• Vigência: {dcDuracao === 'anual' ? '12 meses (Anual)' : dcDuracao === 'semana' ? `${dcVigenciaQtd} semana(s)` : `${dcVigenciaQtd} mês(es)`} | Início: {dcDataInicio || 'Hoje'}";
  const noticeReplacement = "• Vigência: {dcDuracao === 'anual' ? '12 meses (Anual)' : dcDuracao === 'semana' ? `${dcVigenciaQtd} semana(s)` : `${dcVigenciaQtd} mês(es)`} (a R$ {dcValorUnitario.toFixed(2)}/unid) | Início: {dcDataInicio || 'Hoje'}";
  content = content.replace(noticeSearch, noticeReplacement);

  fs.writeFileSync(adminPath, content, 'utf8');
  console.log('✅ DashboardAdmin.tsx patched successfully');
}

function patchRecep() {
  let content = fs.readFileSync(recepPath, 'utf8');

  // 1. Add state variable for dcValorUnitario in receptionist
  content = content.replace(
    "const [dcVigenciaQtd, setDcVigenciaQtd] = useState(1);",
    `const [dcVigenciaQtd, setDcVigenciaQtd] = useState(1);
  const [dcValorUnitario, setDcValorUnitario] = useState(0);`
  );

  // 2. Load dcValorUnitario in receptionist openClientModal
  content = content.replace(
    "setDcDuracao(client.dadosComerciais?.duracao || 'mensal');\n    setDcVigenciaQtd(client.dadosComerciais?.duracaoQtd || 1);",
    `setDcDuracao(client.dadosComerciais?.duracao || 'mensal');
    setDcVigenciaQtd(client.dadosComerciais?.duracaoQtd || 1);
    setDcValorUnitario(client.dadosComerciais?.valorUnitario || 0);`
  );

  // 3. Update useEffect for suggestions in receptionist
  const oldEffect = `  useEffect(() => {
    if (dcPlano) {
      const plan = plans.find((p: any) => p._id === dcPlano);
      if (plan) {
        let sugDur = 'mensal';
        let sugQtd = 1;
        if (plan.tipo === 'Anual' || plan.validadeDias > 180) {
          sugDur = 'anual';
          sugQtd = 1;
        } else if (plan.validadeDias === 14 || plan.validadeDias === 7) {
          sugDur = 'semana';
          sugQtd = plan.validadeDias === 14 ? 2 : 1;
        } else {
          sugDur = 'mensal';
          sugQtd = Math.round(plan.validadeDias / 30) || 1;
        }
        setDcDuracao(sugDur);
        setDcVigenciaQtd(sugQtd);
        if (sugDur === 'anual') {
          setDcParcelas(12);
        } else if (sugDur === 'mensal') {
          setDcParcelas(sugQtd);
        } else {
          setDcParcelas(1);
        }
      }
    }
  }, [dcPlano, plans]);`;

  const newEffect = `  useEffect(() => {
    if (dcPlano) {
      const plan = plans.find((p: any) => p._id === dcPlano);
      if (plan) {
        let sugDur = 'mensal';
        let sugQtd = 1;
        if (plan.tipo === 'Anual' || plan.validadeDias > 180) {
          sugDur = 'anual';
          sugQtd = 1;
        } else if (plan.validadeDias === 14 || plan.validadeDias === 7) {
          sugDur = 'semana';
          sugQtd = plan.validadeDias === 14 ? 2 : 1;
        } else {
          sugDur = 'mensal';
          sugQtd = Math.round(plan.validadeDias / 30) || 1;
        }
        setDcDuracao(sugDur);
        setDcVigenciaQtd(sugQtd);
        setDcValorUnitario(plan.preco || 0); // Sugere o preço do plano
        if (sugDur === 'anual') {
          setDcParcelas(12);
        } else if (sugDur === 'mensal') {
          setDcParcelas(sugQtd);
        } else {
          setDcParcelas(1);
        }
      }
    }
  }, [dcPlano, plans]);`;
  content = content.replace(oldEffect, newEffect);

  // 4. Update Computed values for gross value calculation in receptionist
  const computedOld = `  // Computed
  const selectedPlan = plans.find((p: any) => p._id === dcPlano);
  const valorBruto = selectedPlan ? selectedPlan.preco : 0;`;

  const computedNew = `  // Computed
  const selectedPlan = plans.find((p: any) => p._id === dcPlano);
  const valorBruto = dcDuracao === 'anual' ? dcValorUnitario : (dcValorUnitario * dcVigenciaQtd);`;

  content = content.replace(computedOld, computedNew);

  // 5. Update save commercial details payloads in receptionist
  content = content.replace(
    /duracao: dcDuracao, duracaoQtd: dcVigenciaQtd,/g,
    'duracao: dcDuracao, duracaoQtd: dcVigenciaQtd, valorUnitario: dcValorUnitario,'
  );

  // 6. Update generateContractTemplate in receptionist
  content = content.replace(
    `    const bruto = plan.preco || 0;
    const descVal = Number(dcDescontoValor) || 0;
    let liquido = bruto;`,
    `    const bruto = dcDuracao === 'anual' ? dcValorUnitario : (dcValorUnitario * dcVigenciaQtd);
    const descVal = Number(dcDescontoValor) || 0;
    let liquido = bruto;`
  );

  // 7. Update UI select field and add quantity and monthly price field in receptionist
  const targetSelectRecep = `                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Vigência do Contrato</label>
                        <select style={inputStyle} value={dcDuracao} onChange={e => {
                          setDcDuracao(e.target.value);
                          if (e.target.value === 'anual') {
                            setDcVigenciaQtd(1);
                          }
                        }}>
                          <option value="semana">Semana(s)</option>
                          <option value="mensal">Mensal</option>
                          <option value="anual">Anual (12 Meses)</option>
                        </select>
                      </div>
                      {(dcDuracao === 'semana' || dcDuracao === 'mensal') && (
                        <div style={{ width: '80px' }}>
                          <label style={labelStyle}>Qtd</label>
                          <input type="number" style={inputStyle} value={dcVigenciaQtd} onChange={e => setDcVigenciaQtd(Math.max(1, Number(e.target.value)))} min={1} />
                        </div>
                      )}
                    </div>`;

  const replacementSelectRecep = `                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Vigência do Contrato</label>
                        <select style={inputStyle} value={dcDuracao} onChange={e => {
                          setDcDuracao(e.target.value);
                          if (e.target.value === 'anual') {
                            setDcVigenciaQtd(1);
                          }
                        }}>
                          <option value="semana">Semana(s)</option>
                          <option value="mensal">Mensal</option>
                          <option value="anual">Anual (12 Meses)</option>
                        </select>
                      </div>
                      {(dcDuracao === 'semana' || dcDuracao === 'mensal') && (
                        <div style={{ width: '80px' }}>
                          <label style={labelStyle}>Qtd</label>
                          <input type="number" style={inputStyle} value={dcVigenciaQtd} onChange={e => setDcVigenciaQtd(Math.max(1, Number(e.target.value)))} min={1} />
                        </div>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>{dcDuracao === 'semana' ? 'Valor Semanal (R$)' : dcDuracao === 'anual' ? 'Valor Anual (R$)' : 'Valor Mensal (R$)'}</label>
                      <input type="number" style={inputStyle} value={dcValorUnitario} onChange={e => setDcValorUnitario(Number(e.target.value))} min={0} />
                    </div>`;
  content = content.replace(targetSelectRecep, replacementSelectRecep);

  // 8. Update real-time summary text inside receptionist (line 850)
  const recepSummaryOld = `                  {dcPlano && (
                    <div style={{ padding: '12px', background: 'var(--bg-darker)', borderRadius: '8px', fontSize: '0.85rem' }}>
                      Valor bruto: <strong>{fmt(valorBruto)}</strong> → Desconto: <strong>{fmt(descontoReais)}</strong> → <strong>Líquido: {fmt(valorLiquido)}</strong> ({dcParcelas}x de {fmt(valorParcela)})
                    </div>
                  )}`;

  const recepSummaryNew = `                  {dcPlano && (
                    <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}><i className="fa-solid fa-calculator"></i> Resumo Financeiro</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <div>Subtotal Bruto: <strong>{fmt(valorBruto)}</strong> <small style={{ color: 'var(--text-muted)' }}>({dcDuracao === 'semana' ? \`\${dcVigenciaQtd} sem x R$ \${dcValorUnitario.toFixed(2)}\` : dcDuracao === 'mensal' ? \`\${dcVigenciaQtd} meses x R$ \${dcValorUnitario.toFixed(2)}\` : 'Anual Fixo'})</small></div>
                        <div>Desconto: <strong style={{ color: 'var(--color-danger)' }}>- {fmt(descontoReais)}</strong> <small style={{ color: 'var(--text-muted)' }}>({dcDescontoTipo === 'percentual' ? \`\${dcDescontoValor}%\` : 'Fixo'})</small></div>
                        <div>Total Líquido: <strong style={{ color: 'var(--color-success)' }}>{fmt(valorLiquido)}</strong></div>
                        <div>Parcelas ({dcFormaPag.toUpperCase()}): <strong>{dcParcelas}x de {fmt(valorParcela)}</strong></div>
                      </div>
                    </div>
                  )}`;
  content = content.replace(recepSummaryOld, recepSummaryNew);

  fs.writeFileSync(recepPath, content, 'utf8');
  console.log('✅ DashboardReceptionist.tsx patched successfully');
}

try {
  patchAdmin();
  patchRecep();
} catch (err) {
  console.error('❌ Error patching:', err);
}
