'use client';

import React, { useState, useEffect } from 'react';

interface DynamusPanelProps {
  clients: any[];
  plans: any[];
  userCargo: string;
  fetchData: () => void;
}

export default function DynamusPanel({ clients, plans, userCargo, fetchData }: DynamusPanelProps) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [clientApts, setClientApts] = useState<any[]>([]);
  const [loadingApts, setLoadingApts] = useState(false);

  // Filter Dynamus clients
  const dynamusClients = clients.filter(c => 
    c.dadosComerciais?.planoId?.nome?.toLowerCase().includes('dynamus') ||
    c.dadosComerciais?.planoId?.nome?.toLowerCase().includes('dynamus')
  );

  const filteredClients = dynamusClients.filter(c => 
    (c.dadosPessoais?.nome || c.nome || '').toLowerCase().includes(search.toLowerCase())
  );

  // Metrics
  const totalDynamus = dynamusClients.length;
  const activeDynamus = dynamusClients.filter(c => c.dadosComerciais?.status === 'ativo').length;
  const totalCreditsUsed = dynamusClients.reduce((sum, c) => sum + (c.dadosComerciais?.creditosUsados || 0), 0);

  const handleCopyLink = () => {
    const link = window.location.origin + '/cadastro-dynamus';
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleToggleExpand = async (clientId: string) => {
    if (expandedClientId === clientId) {
      setExpandedClientId(null);
      setClientApts([]);
      return;
    }

    setExpandedClientId(clientId);
    setLoadingApts(true);
    try {
      const res = await fetch(`/api/appointments?clientId=${clientId}`);
      const data = await res.json();
      if (data.success) {
        // Sort appointments by date descending
        const sorted = data.data.sort((a: any, b: any) => {
          return new Date(b.data + 'T' + b.horario).getTime() - new Date(a.data + 'T' + a.horario).getTime();
        });
        setClientApts(sorted);
      }
    } catch (err) {
      console.error('Error fetching appointments', err);
    } finally {
      setLoadingApts(false);
    }
  };

  const getCreditCost = (servico: string) => {
    const normalized = servico.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (
      normalized.includes('avaliacao fisica') ||
      normalized.includes('fisioterapica') ||
      normalized.includes('teste de forca') ||
      normalized.includes('emergencia')
    ) {
      return 3;
    }
    if (
      normalized.includes('treino monitorado') ||
      normalized.includes('recovery') ||
      normalized.includes('treino livre')
    ) {
      return 1;
    }
    if (normalized.includes('massagem')) {
      return 1;
    }
    return 0;
  };

  return (
    <div>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Consumo de Créditos - Dynamus</h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>Gerencie e acompanhe a utilização de créditos dos alunos do plano Dynamus.</p>
        </div>
        <button 
          onClick={handleCopyLink} 
          style={{ 
            padding: '10px 20px', 
            background: copied ? 'var(--color-success)' : 'var(--color-primary)', 
            border: 'none', 
            color: '#fff', 
            borderRadius: '8px', 
            cursor: 'pointer', 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.88rem',
            transition: 'background-color 0.2s, transform 0.1s',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
          }}
        >
          <i className={copied ? "fa-solid fa-check" : "fa-solid fa-link"}></i>
          {copied ? 'Link Copiado!' : 'Gerar Link de Cadastro'}
        </button>
      </div>

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div style={cardMetricStyle}>
          <div>
            <h3 style={metricLabelStyle}>Total de Alunos Dynamus</h3>
            <div style={metricValueStyle}>{totalDynamus}</div>
          </div>
          <div style={metricIconStyle}><i className="fa-solid fa-users"></i></div>
        </div>
        <div style={cardMetricStyle}>
          <div>
            <h3 style={metricLabelStyle}>Alunos Ativos</h3>
            <div style={metricValueStyle}>{activeDynamus}</div>
          </div>
          <div style={metricIconStyle}><i className="fa-solid fa-user-check" style={{ color: '#10b981' }}></i></div>
        </div>
        <div style={cardMetricStyle}>
          <div>
            <h3 style={metricLabelStyle}>Créditos Consumidos (Total)</h3>
            <div style={metricValueStyle}>{totalCreditsUsed}</div>
          </div>
          <div style={metricIconStyle}><i className="fa-solid fa-chart-line" style={{ color: '#f59e0b' }}></i></div>
        </div>
      </div>

      {/* Table & Search section */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        <div style={{ marginBottom: '16px' }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Buscar por nome de aluno..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ maxWidth: '360px', background: 'var(--bg-darker)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', outline: 'none' }} 
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-darker)', borderBottom: '1px solid var(--border-color)' }}>
                {['Aluno', 'Plano Contratado', 'Adesão', 'Expiração', 'Total', 'Usados', 'Reservados', 'Restantes', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Ações' ? 'center' : 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum aluno cadastrado no plano Dynamus.
                  </td>
                </tr>
              ) : (
                filteredClients.map(c => {
                  const com = c.dadosComerciais || {};
                  const isExpanded = expandedClientId === c._id;
                  const total = com.creditosTotal || 0;
                  const usados = com.creditosUsados || 0;
                  const reservados = com.creditosReservados || 0;
                  const restantes = Math.max(0, total - usados - reservados);

                  return (
                    <React.Fragment key={c._id}>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <strong>{c.dadosPessoais?.nome || c.nome || 'Aluno'}</strong>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: 'var(--color-primary)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>
                            {com.planoId?.nome || 'Dynamus'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                          {com.dataInicio ? new Date(com.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem' }}>
                          {com.vencimento ? new Date(com.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.9rem', fontWeight: 600 }}>{total}</td>
                        <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: 'var(--color-danger)', fontWeight: 600 }}>{usados}</td>
                        <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: '#f59e0b', fontWeight: 600 }}>{reservados}</td>
                        <td style={{ padding: '14px 16px', fontSize: '0.9rem', color: 'var(--color-success)', fontWeight: 700 }}>{restantes}</td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', border: '1px solid var(--border-color)', background: isExpanded ? 'var(--bg-darker)' : 'transparent', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)' }}
                            onClick={() => handleToggleExpand(c._id)}
                          >
                            <i className={isExpanded ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                            {isExpanded ? 'Fechar' : 'Ver Consumo'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded consumption details row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: '20px', background: 'var(--bg-darker)', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-card)', padding: '16px' }}>
                              <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-history" style={{ color: 'var(--color-primary)' }}></i>
                                Histórico de Utilização e Créditos
                              </h4>

                              {loadingApts ? (
                                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Carregando atendimentos...
                                </div>
                              ) : clientApts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                  Nenhum agendamento realizado por este aluno.
                                </div>
                              ) : (
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        {['Data / Horário', 'Serviço', 'Profissional', 'Status', 'Custo em Créditos'].map(h => (
                                          <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {clientApts.map((apt: any) => {
                                        const cost = getCreditCost(apt.servico);
                                        const statusLabels: Record<string, string> = {
                                          agendado: 'Reservado',
                                          presenca: 'Presença',
                                          falta: 'Falta',
                                          cancelado: 'Cancelado'
                                        };
                                        const statusColors: Record<string, string> = {
                                          agendado: '#f59e0b',
                                          presenca: '#10b981',
                                          falta: '#ef4444',
                                          cancelado: 'var(--text-muted)'
                                        };

                                        return (
                                          <tr key={apt._id} style={{ borderBottom: '1px dotted var(--border-color)' }}>
                                            <td style={{ padding: '10px 12px' }}>
                                              {new Date(apt.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {apt.horario}
                                            </td>
                                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>{apt.servico}</td>
                                            <td style={{ padding: '10px 12px' }}>{apt.profissionalId?.nome || 'Profissional'}</td>
                                            <td style={{ padding: '10px 12px' }}>
                                              <span style={{ color: statusColors[apt.status] || '#fff', fontWeight: 600 }}>
                                                {statusLabels[apt.status] || apt.status}
                                              </span>
                                            </td>
                                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>
                                              {cost === 3 ? (
                                                <span style={{ color: '#ef4444' }}>-3 créditos (Avaliação/Emergência)</span>
                                              ) : cost === 1 ? (
                                                <span style={{ color: 'var(--text-main)' }}>-1 crédito (Treino/Recovery)</span>
                                              ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>0 créditos</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Inline Metric Card Styles
const cardMetricStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '24px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
};

const metricLabelStyle: React.CSSProperties = {
  margin: '0 0 6px 0',
  fontSize: '0.85rem',
  color: 'var(--text-muted)',
  fontWeight: 600
};

const metricValueStyle: React.CSSProperties = {
  fontSize: '1.8rem',
  fontWeight: 800,
  color: 'var(--text-main)'
};

const metricIconStyle: React.CSSProperties = {
  fontSize: '2rem',
  color: 'var(--color-primary)',
  opacity: 0.8
};
