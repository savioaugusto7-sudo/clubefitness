const fs = require('fs');
const path = require('path');

const adminPath = path.join(__dirname, 'src', 'components', 'DashboardAdmin.tsx');
const recepPath = path.join(__dirname, 'src', 'components', 'DashboardReceptionist.tsx');

function patchAdmin() {
  let content = fs.readFileSync(adminPath, 'utf8');
  content = content.replace(/\r\n/g, '\n');

  // Locate from clientDetailTab === 'comerciais' && (
  // to the row where button block begins
  const oldSection = `                  {clientDetailTab === 'comerciais' && (
                    <>
                      {hasActiveSignedContract && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fa-solid fa-triangle-exclamation"></i>
                          <span><strong>Contrato Ativo Assinado:</strong> As informações comerciais estão bloqueadas para edição direta. Para alterá-las, gere uma nova versão do contrato na aba <strong>Contratos</strong>.</span>
                        </div>
                      )}

                      <div style={{ background: 'rgba(59,130,246,0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.15)', marginBottom: '15px' }}>
                        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resumo Financeiro em Tempo Real</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', textAlign: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Valor Bruto</span>
                            <strong style={{ fontSize: '0.95rem' }}>R$ {valorBruto.toFixed(2).replace('.', ',')}</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Desconto ({dcDescontoTipo === 'percentual' ? \`\${dcDescontoValor}%\` : 'R$'})</span>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--color-danger)' }}>- R$ {descontoReais.toFixed(2).replace('.', ',')}</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Valor Líquido</span>
                            <strong style={{ fontSize: '0.95rem', color: 'var(--color-success)' }}>R$ {valorLiquido.toFixed(2).replace('.', ',')}</strong>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Parcelamento</span>
                            <strong style={{ fontSize: '0.95rem' }}>{dcParcelas}x R$ {valorParcela.toFixed(2).replace('.', ',')}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Plano Contratado</label>
                          <select className="select-custom" value={dcPlano} onChange={e => setDcPlano(e.target.value)} disabled={hasActiveSignedContract}>
                            {plans.map((p: any) => <option key={p._id} value={p._id}>{p.nome} - R$ {p.preco?.toFixed(2).replace('.', ',')}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Status</label>
                          <select className="select-custom" value={dcStatus} onChange={e => setDcStatus(e.target.value)} disabled={hasActiveSignedContract}>
                            <option value="ativo">Ativo</option>
                            <option value="vencido">Vencido</option>
                            <option value="suspenso">Suspenso</option>
                            <option value="inativo">Inativo</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Tipo de Desconto</label>
                          <select className="select-custom" value={dcDescontoTipo} onChange={e => setDcDescontoTipo(e.target.value as any)} disabled={hasActiveSignedContract}>
                            <option value="percentual">Percentual (%)</option>
                            <option value="fixo">Fixo (R$)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Valor do Desconto</label>
                          <input type="number" className="form-control" value={dcDescontoValor} onChange={e => setDcDescontoValor(Number(e.target.value))} min={0} disabled={hasActiveSignedContract} />
                        </div>
                        <div className="form-group">
                          <label>Parcelas</label>
                          <input type="number" className="form-control" value={dcParcelas} onChange={e => setDcParcelas(Math.max(1, Number(e.target.value)))} min={1} disabled={hasActiveSignedContract} />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <label>Vigência do Contrato</label>
                            <select className="select-custom" value={dcDuracao} onChange={e => setDcDuracao(e.target.value)} disabled={hasActiveSignedContract}>
                              <option value="semana">Semana(s)</option>
                              <option value="mensal">Mensal</option>
                              <option value="anual">Anual (12 Meses)</option>
                            </select>
                          </div>
                          <div style={{ width: '80px' }}>
                            <label>Qtd</label>
                            <input type="number" className="form-control" value={dcVigenciaQtd} onChange={e => setDcVigenciaQtd(Math.max(1, Number(e.target.value)))} min={1} disabled={hasActiveSignedContract} />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>{dcDuracao === 'semana' ? 'Valor Semanal (R$)' : dcDuracao === 'anual' ? 'Valor Anual (R$)' : 'Valor Mensal (R$)'}</label>
                          <input type="number" className="form-control" value={dcValorUnitario} onChange={e => setDcValorUnitario(Number(e.target.value))} min={0} disabled={hasActiveSignedContract} />
                        </div>
                        <div className="form-group">
                          <label>Forma de Pagamento</label>
                          <select className="select-custom" value={dcFormaPag} onChange={e => setDcFormaPag(e.target.value)} disabled={hasActiveSignedContract}>
                            <option value="pix">Pix</option>
                            <option value="boleto">Boleto Bancário</option>
                            <option value="cartao">Cartão de Crédito/Débito</option>
                            <option value="dinheiro">Dinheiro</option>
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Data de Início</label>
                          <input type="date" className="form-control" value={dcDataInicio} onChange={e => setDcDataInicio(e.target.value)} disabled={hasActiveSignedContract} />
                        </div>
                        <div className="form-group">
                          <label>Primeiro Vencimento</label>
                          <input type="date" className="form-control" value={dcVencimento} onChange={e => setDcVencimento(e.target.value)} disabled={hasActiveSignedContract} />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Responsável pela Venda</label>
                          <input className="form-control" value={dcResponsavelVenda} onChange={e => setDcResponsavelVenda(e.target.value)} placeholder="Nome do vendedor" disabled={hasActiveSignedContract} />
                        </div>
                        <div className="form-group">
                          <label>Unidade Contratada</label>
                          <input className="form-control" value={dcUnidadeContratada} onChange={e => setDcUnidadeContratada(e.target.value)} placeholder="Unidade de atendimento" disabled={hasActiveSignedContract} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Observações Contratuais</label>
                        <textarea className="form-control" rows={2} value={dcObservacoesContratuais} onChange={e => setDcObservacoesContratuais(e.target.value)} placeholder="Notas adicionais sobre esta contratação" disabled={hasActiveSignedContract} />
                      </div>`;

  const newSection = `                  {clientDetailTab === 'comerciais' && (
                    <>
                      {hasActiveSignedContract && (
                        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="fa-solid fa-triangle-exclamation"></i>
                          <span><strong>Contrato Ativo Assinado:</strong> As informações comerciais estão bloqueadas para edição direta. Para alterá-las, gere uma nova versão do contrato na aba <strong>Contratos</strong>.</span>
                        </div>
                      )}

                      <div className="comercial-summary-card">
                        <div className="comercial-summary-header">
                          <span><i className="fa-solid fa-calculator" style={{ marginRight: '8px' }}></i> Resumo Financeiro em Tempo Real</span>
                        </div>
                        <div className="comercial-summary-grid">
                          <div className="comercial-summary-box">
                            <span className="comercial-summary-label">Subtotal Bruto</span>
                            <strong className="comercial-summary-val">R$ {valorBruto.toFixed(2).replace('.', ',')}</strong>
                            <small className="comercial-summary-desc">
                              {dcDuracao === 'semana' 
                                ? \`\${dcVigenciaQtd} sem. x R$ \${dcValorUnitario.toFixed(2)}\` 
                                : dcDuracao === 'mensal' 
                                ? \`\${dcVigenciaQtd} meses x R$ \${dcValorUnitario.toFixed(2)}\` 
                                : \`\${dcVigenciaQtd} ano(s) x R$ \${dcValorUnitario.toFixed(2)}\`}
                            </small>
                          </div>
                          <div className="comercial-summary-box" style={{ background: 'rgba(239, 68, 68, 0.015)', borderColor: 'rgba(239, 68, 68, 0.08)' }}>
                            <span className="comercial-summary-label" style={{ color: 'var(--color-danger)' }}>Desconto Aplicado</span>
                            <strong className="comercial-summary-val" style={{ color: 'var(--color-danger)' }}>- R$ {descontoReais.toFixed(2).replace('.', ',')}</strong>
                            <small className="comercial-summary-desc">
                              {dcDescontoTipo === 'percentual' ? \`\${dcDescontoValor}% de desconto\` : 'Valor fixo deduzido'}
                            </small>
                          </div>
                          <div className="comercial-summary-box" style={{ background: 'rgba(16, 185, 129, 0.015)', borderColor: 'rgba(16, 185, 129, 0.08)' }}>
                            <span className="comercial-summary-label" style={{ color: 'var(--color-success)' }}>Total Líquido</span>
                            <strong className="comercial-summary-val" style={{ color: 'var(--color-success)' }}>R$ {valorLiquido.toFixed(2).replace('.', ',')}</strong>
                            <small className="comercial-summary-desc">Valor final do contrato</small>
                          </div>
                          <div className="comercial-summary-box">
                            <span className="comercial-summary-label">Parcelamento ({dcFormaPag.toUpperCase()})</span>
                            <strong className="comercial-summary-val">{dcParcelas}x R$ {valorParcela.toFixed(2).replace('.', ',')}</strong>
                            <small className="comercial-summary-desc">
                              {dcParcelas > 1 ? 'Mensalidades parceladas' : 'Pagamento à vista'}
                            </small>
                          </div>
                        </div>
                      </div>

                      <div className="comercial-section-card">
                        <div className="comercial-section-title">
                          <i className="fa-solid fa-file-invoice-dollar"></i> Plano Contratado & Vigência
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-signature"></i> Plano Contratado</label>
                            <select className="select-custom" value={dcPlano} onChange={e => setDcPlano(e.target.value)} disabled={hasActiveSignedContract}>
                              {plans.map((p: any) => <option key={p._id} value={p._id}>{p.nome} - R$ {p.preco?.toFixed(2).replace('.', ',')}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-circle-info"></i> Status</label>
                            <select className="select-custom" value={dcStatus} onChange={e => setDcStatus(e.target.value)} disabled={hasActiveSignedContract}>
                              <option value="ativo">Ativo</option>
                              <option value="vencido">Vencido</option>
                              <option value="suspenso">Suspenso</option>
                              <option value="inativo">Inativo</option>
                            </select>
                          </div>
                        </div>
                        <div className="form-row" style={{ marginTop: '10px' }}>
                          <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <label className="comercial-field-label"><i className="fa-solid fa-calendar-days"></i> Vigência do Contrato</label>
                              <select className="select-custom" value={dcDuracao} onChange={e => setDcDuracao(e.target.value)} disabled={hasActiveSignedContract}>
                                <option value="semana">Semana(s)</option>
                                <option value="mensal">Mensal</option>
                                <option value="anual">Anual (12 Meses)</option>
                              </select>
                            </div>
                            <div style={{ width: '80px' }}>
                              <label className="comercial-field-label"><i className="fa-solid fa-list-numeric"></i> Qtd</label>
                              <input type="number" className="form-control" value={dcVigenciaQtd} onChange={e => setDcVigenciaQtd(Math.max(1, Number(e.target.value)))} min={1} disabled={hasActiveSignedContract} />
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-money-bill-wave"></i> {dcDuracao === 'semana' ? 'Valor Semanal (R$)' : dcDuracao === 'anual' ? 'Valor Anual (R$)' : 'Valor Mensal (R$)'}</label>
                            <input type="number" className="form-control" value={dcValorUnitario} onChange={e => setDcValorUnitario(Number(e.target.value))} min={0} disabled={hasActiveSignedContract} />
                          </div>
                        </div>
                      </div>

                      <div className="comercial-section-card">
                        <div className="comercial-section-title">
                          <i className="fa-solid fa-percent"></i> Descontos & Parcelamento
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-tag"></i> Tipo de Desconto</label>
                            <select className="select-custom" value={dcDescontoTipo} onChange={e => setDcDescontoTipo(e.target.value as any)} disabled={hasActiveSignedContract}>
                              <option value="percentual">Percentual (%)</option>
                              <option value="fixo">Fixo (R$)</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-tags"></i> Valor do Desconto</label>
                            <input type="number" className="form-control" value={dcDescontoValor} onChange={e => setDcDescontoValor(Number(e.target.value))} min={0} disabled={hasActiveSignedContract} />
                          </div>
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-credit-card"></i> Parcelas</label>
                            <input type="number" className="form-control" value={dcParcelas} onChange={e => setDcParcelas(Math.max(1, Number(e.target.value)))} min={1} disabled={hasActiveSignedContract} />
                          </div>
                        </div>
                      </div>

                      <div className="comercial-section-card">
                        <div className="comercial-section-title">
                          <i className="fa-solid fa-calendar-check"></i> Fechamento & Emissão
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-receipt"></i> Forma de Pagamento</label>
                            <select className="select-custom" value={dcFormaPag} onChange={e => setDcFormaPag(e.target.value)} disabled={hasActiveSignedContract}>
                              <option value="pix">Pix</option>
                              <option value="boleto">Boleto Bancário</option>
                              <option value="cartao">Cartão de Crédito/Débito</option>
                              <option value="dinheiro">Dinheiro</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-calendar-plus"></i> Data de Início</label>
                            <input type="date" className="form-control" value={dcDataInicio} onChange={e => setDcDataInicio(e.target.value)} disabled={hasActiveSignedContract} />
                          </div>
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-calendar-day"></i> Primeiro Vencimento</label>
                            <input type="date" className="form-control" value={dcVencimento} onChange={e => setDcVencimento(e.target.value)} disabled={hasActiveSignedContract} />
                          </div>
                        </div>

                        <div className="form-row" style={{ marginTop: '10px' }}>
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-user-tie"></i> Responsável pela Venda</label>
                            <input className="form-control" value={dcResponsavelVenda} onChange={e => setDcResponsavelVenda(e.target.value)} placeholder="Nome do vendedor" disabled={hasActiveSignedContract} />
                          </div>
                          <div className="form-group">
                            <label className="comercial-field-label"><i className="fa-solid fa-shop"></i> Unidade Contratada</label>
                            <input className="form-control" value={dcUnidadeContratada} onChange={e => setDcUnidadeContratada(e.target.value)} placeholder="Unidade de atendimento" disabled={hasActiveSignedContract} />
                          </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '10px' }}>
                          <label className="comercial-field-label"><i className="fa-solid fa-file-lines"></i> Observações Contratuais</label>
                          <textarea className="form-control" rows={2} value={dcObservacoesContratuais} onChange={e => setDcObservacoesContratuais(e.target.value)} placeholder="Notas adicionais sobre esta contratação" disabled={hasActiveSignedContract} />
                        </div>
                      </div>`;

  if (content.includes(oldSection)) {
    content = content.replace(oldSection, newSection);
    console.log('✅ Admin commercial section replaced');
  } else {
    console.log('❌ Admin commercial section NOT found');
  }

  fs.writeFileSync(adminPath, content, 'utf8');
}

function patchRecep() {
  let content = fs.readFileSync(recepPath, 'utf8');
  content = content.replace(/\r\n/g, '\n');

  const oldSectionRecep = `              {clientModalTab === 'comerciais' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={labelStyle}>Plano</label>
                      <select style={inputStyle} value={dcPlano} onChange={e => setDcPlano(e.target.value)}>
                        <option value="">Selecione...</option>
                        {plans.map((p: any) => <option key={p._id} value={p._id}>{p.nome} — {fmt(p.preco)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select style={inputStyle} value={dcStatus} onChange={e => setDcStatus(e.target.value)}>
                        <option value="ativo">Ativo</option><option value="vencido">Vencido</option>
                        <option value="pendente">Pendente</option><option value="suspenso">Suspenso</option><option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Vigência do Contrato</label>
                        <select style={inputStyle} value={dcDuracao} onChange={e => setDcDuracao(e.target.value)}>
                          <option value="semana">Semana(s)</option>
                          <option value="mensal">Mensal</option>
                          <option value="anual">Anual (12 Meses)</option>
                        </select>
                      </div>
                      <div style={{ width: '80px' }}>
                        <label style={labelStyle}>Qtd</label>
                        <input type="number" style={inputStyle} value={dcVigenciaQtd} onChange={e => setDcVigenciaQtd(Math.max(1, Number(e.target.value)))} min={1} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>{dcDuracao === 'semana' ? 'Valor Semanal (R$)' : dcDuracao === 'anual' ? 'Valor Anual (R$)' : 'Valor Mensal (R$)'}</label>
                      <input type="number" style={inputStyle} value={dcValorUnitario} onChange={e => setDcValorUnitario(Number(e.target.value))} min={0} />
                    </div>
                    <div><label style={labelStyle}>Data de Início</label><input style={inputStyle} type="date" value={dcDataInicio} onChange={e => setDcDataInicio(e.target.value)} /></div>
                    <div><label style={labelStyle}>Vencimento</label><input style={inputStyle} type="date" value={dcVencimento} onChange={e => setDcVencimento(e.target.value)} /></div>
                    <div>
                      <label style={labelStyle}>Forma de Pagamento</label>
                      <select style={inputStyle} value={dcFormaPag} onChange={e => setDcFormaPag(e.target.value)}>
                        <option value="pix">PIX</option><option value="cartao">Cartão</option><option value="boleto">Boleto</option><option value="dinheiro">Dinheiro</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Desconto</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <select style={{ ...inputStyle, width: '100px' }} value={dcDescontoTipo} onChange={e => setDcDescontoTipo(e.target.value)}>
                          <option value="percentual">%</option><option value="fixo">R$</option>
                        </select>
                        <input style={{ ...inputStyle, flex: 1 }} type="number" value={dcDescontoValor} onChange={e => setDcDescontoValor(Number(e.target.value))} />
                      </div>
                    </div>
                    <div><label style={labelStyle}>Parcelas</label><input style={inputStyle} type="number" min={1} value={dcParcelas} onChange={e => setDcParcelas(Number(e.target.value))} /></div>
                    <div><label style={labelStyle}>Responsável pela Venda</label><input style={inputStyle} value={dcResponsavelVenda} onChange={e => setDcResponsavelVenda(e.target.value)} /></div>
                    <div><label style={labelStyle}>Unidade</label><input style={inputStyle} value={dcUnidadeContratada} onChange={e => setDcUnidadeContratada(e.target.value)} /></div>
                  </div>
                  {dcPlano && (
                    <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}><i className="fa-solid fa-calculator"></i> Resumo Financeiro em Tempo Real</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <div>Subtotal Bruto: <strong>{fmt(valorBruto)}</strong> <small style={{ color: 'var(--text-muted)' }}>({dcDuracao === 'semana' ? \`\${dcVigenciaQtd} sem x R$ \${dcValorUnitario.toFixed(2)}\` : dcDuracao === 'mensal' ? \`\${dcVigenciaQtd} meses x R$ \${dcValorUnitario.toFixed(2)}\` : \`\${dcVigenciaQtd} ano(s) x R$ \${dcValorUnitario.toFixed(2)}\`})</small></div>
                        <div>Desconto: <strong style={{ color: 'var(--color-danger)' }}>- {fmt(descontoReais)}</strong> <small style={{ color: 'var(--text-muted)' }}>({dcDescontoTipo === 'percentual' ? \`\${dcDescontoValor}%\` : 'Fixo'})</small></div>
                        <div>Total Líquido: <strong style={{ color: 'var(--color-success)' }}>{fmt(valorLiquido)}</strong></div>
                        <div>Parcelas ({dcFormaPag.toUpperCase()}): <strong>{dcParcelas}x de {fmt(valorParcela)}</strong></div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label style={labelStyle}>Observações Contratuais</label>
                    <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={dcObservacoesContratuais} onChange={e => setDcObservacoesContratuais(e.target.value)} />
                  </div>`;

  const newSectionRecep = `              {clientModalTab === 'comerciais' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div className="comercial-summary-card" style={{ padding: '20px', marginBottom: '10px' }}>
                    <div className="comercial-summary-header">
                      <span><i className="fa-solid fa-calculator" style={{ marginRight: '8px' }}></i> Resumo Financeiro em Tempo Real</span>
                    </div>
                    <div className="comercial-summary-grid">
                      <div className="comercial-summary-box">
                        <span className="comercial-summary-label">Subtotal Bruto</span>
                        <strong className="comercial-summary-val" style={{ fontSize: '1.05rem' }}>{fmt(valorBruto)}</strong>
                        <small className="comercial-summary-desc">
                          {dcDuracao === 'semana' 
                            ? \`\${dcVigenciaQtd} sem. x R$ \${dcValorUnitario.toFixed(2)}\` 
                            : dcDuracao === 'mensal' 
                            ? \`\${dcVigenciaQtd} meses x R$ \${dcValorUnitario.toFixed(2)}\` 
                            : \`\${dcVigenciaQtd} ano(s) x R$ \${dcValorUnitario.toFixed(2)}\`}
                        </small>
                      </div>
                      <div className="comercial-summary-box" style={{ background: 'rgba(239, 68, 68, 0.015)', borderColor: 'rgba(239, 68, 68, 0.08)' }}>
                        <span className="comercial-summary-label" style={{ color: 'var(--color-danger)' }}>Desconto Aplicado</span>
                        <strong className="comercial-summary-val" style={{ color: 'var(--color-danger)', fontSize: '1.05rem' }}>- {fmt(descontoReais)}</strong>
                        <small className="comercial-summary-desc">
                          {dcDescontoTipo === 'percentual' ? \`\${dcDescontoValor}% de desconto\` : 'Valor fixo deduzido'}
                        </small>
                      </div>
                      <div className="comercial-summary-box" style={{ background: 'rgba(16, 185, 129, 0.015)', borderColor: 'rgba(16, 185, 129, 0.08)' }}>
                        <span className="comercial-summary-label" style={{ color: 'var(--color-success)' }}>Total Líquido</span>
                        <strong className="comercial-summary-val" style={{ color: 'var(--color-success)', fontSize: '1.05rem' }}>{fmt(valorLiquido)}</strong>
                        <small className="comercial-summary-desc">Valor final do contrato</small>
                      </div>
                      <div className="comercial-summary-box">
                        <span className="comercial-summary-label">Parcelamento</span>
                        <strong className="comercial-summary-val" style={{ fontSize: '1.05rem' }}>{dcParcelas}x {fmt(valorParcela)}</strong>
                        <small className="comercial-summary-desc">
                          {dcParcelas > 1 ? 'Mensalidades' : 'À vista'}
                        </small>
                      </div>
                    </div>
                  </div>

                  <div className="comercial-section-card" style={{ padding: '16px', marginBottom: '10px' }}>
                    <div className="comercial-section-title" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                      <i className="fa-solid fa-file-invoice-dollar"></i> Plano Contratado & Vigência
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-signature"></i> Plano Contratado</label>
                        <select className="select-custom" value={dcPlano} onChange={e => setDcPlano(e.target.value)}>
                          <option value="">Selecione...</option>
                          {plans.map((p: any) => <option key={p._id} value={p._id}>{p.nome} — {fmt(p.preco)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-circle-info"></i> Status</label>
                        <select className="select-custom" value={dcStatus} onChange={e => setDcStatus(e.target.value)}>
                          <option value="ativo">Ativo</option>
                          <option value="vencido">Vencido</option>
                          <option value="suspenso">Suspenso</option>
                          <option value="cancelado">Cancelado</option>
                          <option value="pendente">Pendente</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <label className="comercial-field-label"><i className="fa-solid fa-calendar-days"></i> Vigência do Contrato</label>
                          <select className="select-custom" value={dcDuracao} onChange={e => setDcDuracao(e.target.value)}>
                            <option value="semana">Semana(s)</option>
                            <option value="mensal">Mensal</option>
                            <option value="anual">Anual (12 Meses)</option>
                          </select>
                        </div>
                        <div style={{ width: '70px' }}>
                          <label className="comercial-field-label"><i className="fa-solid fa-list-numeric"></i> Qtd</label>
                          <input type="number" className="form-control" value={dcVigenciaQtd} onChange={e => setDcVigenciaQtd(Math.max(1, Number(e.target.value)))} min={1} />
                        </div>
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-money-bill-wave"></i> {dcDuracao === 'semana' ? 'Valor Semanal (R$)' : dcDuracao === 'anual' ? 'Valor Anual (R$)' : 'Valor Mensal (R$)'}</label>
                        <input type="number" className="form-control" value={dcValorUnitario} onChange={e => setDcValorUnitario(Number(e.target.value))} min={0} />
                      </div>
                    </div>
                  </div>

                  <div className="comercial-section-card" style={{ padding: '16px', marginBottom: '10px' }}>
                    <div className="comercial-section-title" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                      <i className="fa-solid fa-percent"></i> Descontos & Parcelamento
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-tag"></i> Tipo Desconto</label>
                        <select className="select-custom" value={dcDescontoTipo} onChange={e => setDcDescontoTipo(e.target.value)}>
                          <option value="percentual">Percentual (%)</option>
                          <option value="fixo">Fixo (R$)</option>
                        </select>
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-tags"></i> Valor Desconto</label>
                        <input type="number" className="form-control" value={dcDescontoValor} onChange={e => setDcDescontoValor(Number(e.target.value))} />
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-credit-card"></i> Parcelas</label>
                        <input type="number" className="form-control" min={1} value={dcParcelas} onChange={e => setDcParcelas(Number(e.target.value))} />
                      </div>
                    </div>
                  </div>

                  <div className="comercial-section-card" style={{ padding: '16px', marginBottom: '10px' }}>
                    <div className="comercial-section-title" style={{ fontSize: '0.85rem', marginBottom: '12px' }}>
                      <i className="fa-solid fa-calendar-check"></i> Fechamento & Emissão
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-receipt"></i> Forma Pagamento</label>
                        <select className="select-custom" value={dcFormaPag} onChange={e => setDcFormaPag(e.target.value)}>
                          <option value="pix">Pix</option>
                          <option value="cartao">Cartão</option>
                          <option value="boleto">Boleto</option>
                          <option value="dinheiro">Dinheiro</option>
                        </select>
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-calendar-plus"></i> Data de Início</label>
                        <input type="date" className="form-control" value={dcDataInicio} onChange={e => setDcDataInicio(e.target.value)} />
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-calendar-day"></i> Primeiro Vencimento</label>
                        <input type="date" className="form-control" value={dcVencimento} onChange={e => setDcVencimento(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-user-tie"></i> Responsável Venda</label>
                        <input className="form-control" value={dcResponsavelVenda} onChange={e => setDcResponsavelVenda(e.target.value)} />
                      </div>
                      <div>
                        <label className="comercial-field-label"><i className="fa-solid fa-shop"></i> Unidade</label>
                        <input className="form-control" value={dcUnidadeContratada} onChange={e => setDcUnidadeContratada(e.target.value)} />
                      </div>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label className="comercial-field-label"><i className="fa-solid fa-file-lines"></i> Observações Contratuais</label>
                      <textarea className="form-control" rows={2} value={dcObservacoesContratuais} onChange={e => setDcObservacoesContratuais(e.target.value)} />
                    </div>
                  </div>`;

  if (content.includes(oldSectionRecep)) {
    content = content.replace(oldSectionRecep, newSectionRecep);
    console.log('✅ Receptionist commercial section replaced');
  } else {
    console.log('❌ Receptionist commercial section NOT found');
  }

  fs.writeFileSync(recepPath, content, 'utf8');
}

try {
  patchAdmin();
  patchRecep();
} catch (err) {
  console.error('❌ Error patching:', err);
}
