'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ClicksignContract {
  _id: string;
  clienteNome: string;
  clienteEmail: string;
  clienteCpf: string;
  planoNome: string;
  planoTipo: string;
  valorLiquido: number;
  dataInicio: string;
  dataFim: string;
  status: string;
  clicksignStatus: string;
  clicksignDocKey: string;
  clicksignUrl: string;
  assinaturaData?: string;
  dataEmissao: string;
  responsavelVenda: string;
  versao: number;
}

interface Stats {
  total: number;
  pendente: number;
  assinado: number;
  cancelado: number;
}

export default function ClicksignPanel() {
  const [contracts, setContracts] = useState<ClicksignContract[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pendente: 0, assinado: 0, cancelado: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'todos') params.set('status', filterStatus);
      if (search) params.set('search', search);
      const res = await fetch(`/api/clicksign?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setContracts(data.data);
        setStats(data.stats);
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleResend = async (contractId: string) => {
    setActionLoading(contractId + '_resend');
    try {
      const res = await fetch('/api/clicksign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });
      const data = await res.json();
      alert(data.success ? '✅ Notificação reenviada com sucesso!' : `❌ Erro: ${data.error}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (contractId: string, clienteNome: string) => {
    if (!confirm(`Cancelar o contrato Clicksign de ${clienteNome}? Esta ação não pode ser desfeita.`)) return;
    setActionLoading(contractId + '_cancel');
    try {
      const res = await fetch(`/api/clicksign?id=${contractId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        alert('Contrato cancelado com sucesso.');
        fetchData();
      } else {
        alert(`Erro: ${data.error}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (c: ClicksignContract) => {
    const s = c.clicksignStatus || c.status;
    if (s === 'assinado') return { label: '✅ Assinado', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
    if (s === 'cancelado') return { label: '❌ Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    return { label: '⏳ Aguardando Assinatura', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
  };

  const fmtDate = (d?: string) => d ? new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR') : '—';
  const fmtCurrency = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00';

  return (
    <div className="content-panel">
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fa-solid fa-file-signature" style={{ color: '#818cf8' }} />
          Gestão de Contratos Clicksign
        </h2>
        <p style={{ color: 'var(--text-dim)', margin: '4px 0 0', fontSize: '0.85rem' }}>
          Acompanhe, reenvie e gerencie todos os contratos enviados via assinatura eletrônica.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Enviados', value: stats.total, color: '#818cf8', icon: 'fa-file-signature' },
          { label: 'Aguardando', value: stats.pendente, color: '#f59e0b', icon: 'fa-clock' },
          { label: 'Assinados', value: stats.assinado, color: '#10b981', icon: 'fa-circle-check' },
          { label: 'Cancelados', value: stats.cancelado, color: '#ef4444', icon: 'fa-circle-xmark' },
        ].map(kpi => (
          <div key={kpi.label} style={{
            background: 'var(--bg-secondary)',
            border: `1px solid ${kpi.color}30`,
            borderRadius: '14px',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: `0 0 0 1px ${kpi.color}15, 0 4px 20px rgba(0,0,0,0.15)`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</span>
              <i className={`fa-solid ${kpi.icon}`} style={{ color: kpi.color, fontSize: '1rem' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          style={{
            flex: '1 1 220px',
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem'
          }}
          placeholder="🔍 Buscar por nome, e-mail ou CPF..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            minWidth: '180px'
          }}
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="todos">Todos os Status</option>
          <option value="pendente">⏳ Aguardando Assinatura</option>
          <option value="assinado">✅ Assinados</option>
          <option value="cancelado">❌ Cancelados</option>
        </select>
        <button className="btn btn-secondary" onClick={fetchData} style={{ padding: '9px 16px' }}>
          <i className="fa-solid fa-rotate-right" />
        </button>
      </div>

      {/* Contracts Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)' }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '12px', display: 'block' }} />
          Carregando contratos...
        </div>
      ) : contracts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <i className="fa-solid fa-file-signature" style={{ fontSize: '3rem', marginBottom: '16px', display: 'block', color: '#818cf8', opacity: 0.4 }} />
          <strong>Nenhum contrato Clicksign encontrado.</strong>
          <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>Envie contratos via Clicksign na ficha do aluno para vê-los aqui.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                {['Cliente', 'Plano', 'Valor', 'Vigência', 'Vendedor', 'Status', 'Emitido em', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: 'var(--text-dim)', fontWeight: 600, fontSize: '0.73rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => {
                const badge = getStatusBadge(c);
                return (
                  <tr key={c._id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 600 }}>{c.clienteNome}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{c.clienteEmail}</div>
                      {c.clienteCpf && <div style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>CPF: {c.clienteCpf}</div>}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div>{c.planoNome}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{c.planoTipo} · v{c.versao}</div>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{fmtCurrency(c.valorLiquido)}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.8rem' }}>{fmtDate(c.dataInicio)}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>até {fmtDate(c.dataFim)}</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-dim)' }}>{c.responsavelVenda || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ color: badge.color, background: badge.bg, padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {badge.label}
                      </span>
                      {c.assinaturaData && (
                        <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '4px' }}>
                          Assinado em {fmtDate(c.assinaturaData)}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmtDate(c.dataEmissao)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {/* Open Clicksign link */}
                        {c.clicksignUrl && (
                          <a
                            href={c.clicksignUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary btn-sm"
                            title="Abrir link de assinatura"
                            style={{ color: '#818cf8', borderColor: 'rgba(129,140,248,0.3)', fontSize: '0.75rem', padding: '4px 8px' }}
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square" /> Abrir
                          </a>
                        )}
                        {/* Copy link */}
                        {c.clicksignUrl && (
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Copiar link de assinatura"
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            onClick={() => { navigator.clipboard.writeText(c.clicksignUrl); alert('Link copiado!'); }}
                          >
                            <i className="fa-solid fa-copy" />
                          </button>
                        )}
                        {/* Resend notification */}
                        {c.clicksignStatus !== 'assinado' && c.clicksignStatus !== 'cancelado' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Reenviar e-mail de assinatura"
                            style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', fontSize: '0.75rem', padding: '4px 8px' }}
                            disabled={actionLoading === c._id + '_resend'}
                            onClick={() => handleResend(c._id)}
                          >
                            {actionLoading === c._id + '_resend'
                              ? <i className="fa-solid fa-spinner fa-spin" />
                              : <><i className="fa-solid fa-paper-plane" /> Reenviar</>
                            }
                          </button>
                        )}
                        {/* Cancel */}
                        {c.status !== 'cancelado' && c.clicksignStatus !== 'cancelado' && (
                          <button
                            className="btn btn-danger btn-sm"
                            title="Cancelar contrato"
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                            disabled={actionLoading === c._id + '_cancel'}
                            onClick={() => handleCancel(c._id, c.clienteNome)}
                          >
                            {actionLoading === c._id + '_cancel'
                              ? <i className="fa-solid fa-spinner fa-spin" />
                              : <i className="fa-solid fa-ban" />
                            }
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
