'use client';

import React, { useEffect, useState } from 'react';

interface AsaasClientInfo {
  clientId: string;
  nome: string;
  email: string;
  cpf: string;
  asaasCustomerId?: string;
  status: 'gerado' | 'nao_gerado' | 'sem_contrato';
  contractId?: string;
  planoNome?: string;
  valorLiquido?: number;
  formaPagamento?: string;
  dataPrimeiroVencimento?: string;
  asaasPaymentId?: string;
  asaasInvoiceUrl?: string;
  asaasBoletoPdf?: string;
  asaasPixCopyPaste?: string;
  asaasPixQrCode?: string;
  asaasBillingStatus?: string;
  contractStatus?: string;
}

export default function AsaasPanel() {
  const [clients, setClients] = useState<AsaasClientInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPixModal, setShowPixModal] = useState(false);
  const [selectedPix, setSelectedPix] = useState<{ qrCode: string; payload: string; name: string } | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'danger' } | null>(null);

  // Webhook URL calculada com base no domínio atual
  const [webhookUrl, setWebhookUrl] = useState('https://clubefitness.vercel.app/api/webhooks/asaas');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWebhookUrl(`${window.location.origin}/api/webhooks/asaas`);
    }
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/asaas');
      const data = await res.json();
      if (data.success) {
        setClients(data.data || []);
      } else {
        showFeedback(data.error || 'Erro ao carregar faturas', 'danger');
      }
    } catch (e) {
      showFeedback('Erro de rede ao carregar faturas.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (text: string, type: 'success' | 'danger') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSyncPayment = async (contractId: string) => {
    setSyncingId(contractId);
    try {
      const res = await fetch('/api/admin/asaas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Cobrança sincronizada com sucesso!', 'success');
        fetchPayments(); // Recarrega lista
      } else {
        showFeedback(data.error || 'Erro ao sincronizar cobrança', 'danger');
      }
    } catch (e) {
      showFeedback('Erro de rede ao sincronizar.', 'danger');
    } finally {
      setSyncingId(null);
    }
  };

  const handleGenerateAsaasCharge = async (contractId: string) => {
    setGeneratingId(contractId);
    try {
      const res = await fetch('/api/admin/asaas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const data = await res.json();
      if (data.success) {
        showFeedback('Cobrança Asaas gerada com sucesso! Boleto e Pix gerados.', 'success');
        fetchPayments(); // Recarrega lista
      } else {
        showFeedback(data.error || 'Erro ao gerar cobrança no Asaas', 'danger');
      }
    } catch (err: any) {
      showFeedback('Erro de rede: ' + err.message, 'danger');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleCopyClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const filteredClients = clients.filter(c => {
    const name = c.nome || '';
    const email = c.email || '';
    const cpf = c.cpf || '';
    const plan = c.planoNome || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q) || cpf.includes(q) || plan.toLowerCase().includes(q);
  });

  return (
    <div className="content-panel" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
            <i className="fa-solid fa-credit-card" style={{ marginRight: '8px', color: 'var(--color-primary)' }}></i> Integração Asaas
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Gerencie todas as cobranças emitidas no gateway do Asaas e sincronize os pagamentos dos alunos.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchPayments} disabled={loading}>
            <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '6px' }}></i> Atualizar
          </button>
          <a href="https://sandbox.asaas.com" target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="fa-solid fa-arrow-up-right-from-square"></i> Painel Asaas
          </a>
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span>{message.text}</span>
        </div>
      )}

      {/* Cards de Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ambiente Conectado</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>Sandbox (Testes)</strong>
          </div>
          <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Pronto para simular pagamentos com faturas de teste.</small>
        </div>

        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>URL de Webhook Ativo</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', overflow: 'hidden' }}>
            <code style={{ fontSize: '0.78rem', padding: '4px 6px', background: 'var(--bg-darker)', borderRadius: '4px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', flexGrow: 1, border: '1px solid var(--border-color)' }}>
              {webhookUrl}
            </code>
            <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', flexShrink: 0 }} onClick={() => handleCopyClipboard(webhookUrl)}>
              <i className="fa-solid fa-copy"></i>
            </button>
          </div>
          <small style={{ display: 'block', marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Cadastre este link no Asaas para receber alertas automáticos.</small>
        </div>
      </div>

      {/* Lista de Cobranças */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <input
            type="text"
            className="form-control"
            placeholder="Pesquisar por aluno, plano ou ID Asaas..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '32px' }}
          />
          <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '0.8rem' }}></i>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
          <p style={{ color: 'var(--text-dim)' }}>Carregando faturas do Asaas...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', border: '1.5px dashed var(--border-color)', borderRadius: '12px' }}>
          <i className="fa-solid fa-users" style={{ fontSize: '2.5rem', color: 'var(--text-dim)', marginBottom: '12px' }}></i>
          <h4 style={{ margin: '0 0 6px 0' }}>Nenhum aluno encontrado</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
            Nenhum registro corresponde aos critérios de pesquisa.
          </p>
        </div>
      ) : (
        <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: '8px' }}>
          <table className="data-table" style={{ margin: 0, fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th>Aluno</th>
                <th style={{ textAlign: 'center' }}>Integração Asaas</th>
                <th>Plano</th>
                <th style={{ textAlign: 'right' }}>Valor Líquido</th>
                <th style={{ textAlign: 'center' }}>Forma</th>
                <th style={{ textAlign: 'center' }}>Vencimento</th>
                <th style={{ textAlign: 'center' }}>Status Asaas</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map(c => {
                let statusColor = 'var(--text-dim)';
                let statusBg = 'rgba(128,128,128,0.1)';
                let statusLabel = 'SEM CONTRATO';
                if (c.status === 'gerado') { statusColor = 'var(--color-success)'; statusBg = 'rgba(16,185,129,0.1)'; statusLabel = 'GERADO'; }
                else if (c.status === 'nao_gerado') { statusColor = '#f59e0b'; statusBg = 'rgba(245,158,11,0.1)'; statusLabel = 'NÃO GERADO'; }

                let asaasColor = '#94a3b8';
                let asaasBg = 'rgba(148,163,184,0.1)';
                const statusUpper = (c.asaasBillingStatus || '').toUpperCase();
                if (statusUpper === 'CONFIRMED' || statusUpper === 'RECEIVED' || statusUpper === 'PAGO') {
                  asaasColor = 'var(--color-success)';
                  asaasBg = 'rgba(16,185,129,0.1)';
                } else if (statusUpper === 'PENDING' || statusUpper === 'PENDENTE') {
                  asaasColor = '#f59e0b';
                  asaasBg = 'rgba(245,158,11,0.1)';
                } else if (statusUpper === 'OVERDUE' || statusUpper === 'VENCIDO') {
                  asaasColor = 'var(--color-danger)';
                  asaasBg = 'rgba(239,68,68,0.1)';
                }

                return (
                  <tr key={c.clientId}>
                    <td>
                      <strong>{c.nome}</strong>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        CPF: {c.cpf || '—'} · Email: {c.email || '—'}
                      </div>
                      {c.asaasCustomerId && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          Customer ID: {c.asaasCustomerId}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ color: statusColor, background: statusBg, padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold' }}>
                        {statusLabel}
                      </span>
                    </td>
                    <td>{c.planoNome || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: c.valorLiquido ? 'bold' : 'normal' }}>
                      {c.valorLiquido ? `R$ ${c.valorLiquido.toFixed(2).replace('.', ',')}` : '—'}
                    </td>
                    <td style={{ textAlign: 'center', textTransform: 'uppercase' }}>{c.formaPagamento || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      {c.dataPrimeiroVencimento ? new Date(c.dataPrimeiroVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {c.status === 'gerado' ? (
                        <span style={{ color: asaasColor, background: asaasBg, padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          {c.asaasBillingStatus || 'pendente'}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {c.status === 'gerado' ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Sincronizar Status"
                            onClick={() => handleSyncPayment(c.contractId || '')}
                            disabled={syncingId === c.contractId}
                          >
                            {syncingId === c.contractId ? (
                              <i className="fa-solid fa-spinner fa-spin"></i>
                            ) : (
                              <i className="fa-solid fa-rotate"></i>
                            )}
                          </button>

                          {c.asaasInvoiceUrl && (
                            <a href={c.asaasInvoiceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" title="Abrir Fatura Asaas">
                              <i className="fa-solid fa-file-invoice"></i>
                            </a>
                          )}

                          {c.formaPagamento === 'pix' && c.asaasPixCopyPaste && (
                            <button
                              className="btn btn-secondary btn-sm"
                              title="Ver QR Code Pix"
                              onClick={() => {
                                setSelectedPix({
                                  qrCode: c.asaasPixQrCode || '',
                                  payload: c.asaasPixCopyPaste || '',
                                  name: c.nome
                                });
                                setShowPixModal(true);
                              }}
                            >
                              <i className="fa-solid fa-qrcode" style={{ color: 'var(--color-primary)' }}></i>
                            </button>
                          )}

                          {c.asaasBoletoPdf && (
                            <a href={c.asaasBoletoPdf} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" title="Baixar Boleto PDF">
                              <i className="fa-solid fa-file-pdf" style={{ color: 'var(--color-danger)' }}></i>
                            </a>
                          )}
                        </div>
                      ) : c.status === 'nao_gerado' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleGenerateAsaasCharge(c.contractId || '')}
                          disabled={generatingId === c.contractId}
                        >
                          {generatingId === c.contractId ? (
                            <><i className="fa-solid fa-spinner fa-spin"></i> Gerando...</>
                          ) : (
                            <><i className="fa-solid fa-plus-circle"></i> Gerar Cobrança</>
                          )}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Pix QR Code */}
      {showPixModal && selectedPix && (
        <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowPixModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header">
              <h3>QR Code Pix - {selectedPix.name}</h3>
              <button className="modal-close" onClick={() => setShowPixModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '20px' }}>
              {selectedPix.qrCode ? (
                <img
                  src={`data:image/png;base64,${selectedPix.qrCode}`}
                  alt="QR Code Pix"
                  style={{ width: '200px', height: '200px', margin: '0 auto 15px', display: 'block', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                />
              ) : (
                <div style={{ width: '200px', height: '200px', margin: '0 auto 15px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-darker)' }}>
                  <i className="fa-solid fa-qrcode fa-3x" style={{ color: 'var(--text-dim)' }}></i>
                </div>
              )}
              
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label>Pix Copia e Cola</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <textarea
                    readOnly
                    className="form-control"
                    value={selectedPix.payload}
                    style={{ fontSize: '0.75rem', height: '60px', resize: 'none', background: 'var(--bg-darker)' }}
                  />
                  <button className="btn btn-primary" onClick={() => handleCopyClipboard(selectedPix.payload)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px' }}>
                    <i className="fa-solid fa-copy"></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPixModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
