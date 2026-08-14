'use client';

import React, { useState } from 'react';

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

  // Modal de Ajuste de Créditos
  const [adjustClient, setAdjustClient] = useState<any | null>(null);
  const [tipoCredito, setTipoCredito] = useState<'geral' | 'recovery' | 'massagem'>('geral');
  const [operacao, setOperacao] = useState<'adicionar' | 'remover'>('adicionar');
  const [quantidade, setQuantidade] = useState<number>(1);
  const [motivo, setMotivo] = useState('');
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState('');

  // Filter Dynamus clients
  const dynamusClients = clients.filter(c => 
    c.dadosComerciais?.planoId?.nome?.toLowerCase().includes('dynamus') ||
    c.planoNome?.toLowerCase().includes('dynamus')
  );

  const filteredClients = dynamusClients.filter(c => 
    (c.dadosPessoais?.nome || c.nome || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.dadosPessoais?.cpf || '').includes(search.replace(/\D/g, ''))
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
    const normalized = (servico || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (
      normalized.includes('avaliacao fisica') ||
      normalized.includes('fisioterapica') ||
      normalized.includes('teste de forca') ||
      normalized.includes('terapia manual') ||
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
    if (normalized.includes('massagem') || normalized.includes('massoterapia') || normalized.includes('miofascial')) {
      return 1;
    }
    return 0;
  };

  const handleOpenAdjust = (client: any) => {
    setAdjustClient(client);
    setTipoCredito('geral');
    setOperacao('adicionar');
    setQuantidade(1);
    setMotivo('');
    setAdjustError('');
    setAdjustSuccess('');
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustClient || quantidade <= 0) return;

    setSavingAdjust(true);
    setAdjustError('');
    setAdjustSuccess('');

    try {
      const res = await fetch('/api/dynamus/adjust-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: adjustClient._id,
          tipoCredito,
          operacao,
          quantidade,
          motivo
        })
      });

      const data = await res.json();
      if (data.success) {
        setAdjustSuccess(data.message || 'Créditos ajustados com sucesso!');
        fetchData();
        setTimeout(() => {
          setAdjustClient(null);
        }, 1200);
      } else {
        setAdjustError(data.error || 'Erro ao ajustar créditos.');
      }
    } catch (err: any) {
      setAdjustError('Erro de conexão ao salvar ajuste.');
    } finally {
      setSavingAdjust(false);
    }
  };

  return (
    <div>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Consumo de Créditos - Dynamus</h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Gerencie, acompanhe o consumo e realize ajustes manuais de créditos (Gerais, Recovery e Massagem) dos alunos Dynamus.
          </p>
        </div>
        <button 
          onClick={handleCopyLink} 
          style={{ 
            padding: '10px 20px', 
            background: copied ? 'var(--color-success)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
            border: 'none', 
            color: '#fff', 
            borderRadius: '10px', 
            cursor: 'pointer', 
            fontWeight: 600, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.88rem',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
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
            placeholder="Buscar por nome ou CPF..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{ maxWidth: '360px', background: 'var(--bg-darker)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', outline: 'none' }} 
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-darker)', borderBottom: '1px solid var(--border-color)' }}>
                {['Aluno', 'Plano', 'Adesão', 'Expiração', 'Créditos Gerais (Rest./Total)', 'Recovery', 'Massagem', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Ações' ? 'center' : 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
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

                  const recoveryTotal = com.creditosRecoveryTotal || 0;
                  const recoveryUsados = com.creditosRecoveryUsados || 0;
                  const recoveryRestantes = Math.max(0, recoveryTotal - recoveryUsados);

                  const massagemTotal = com.creditosMassagemTotal || 0;
                  const massagemUsados = com.creditosMassagemUsados || 0;
                  const massagemRestantes = Math.max(0, massagemTotal - massagemUsados);

                  return (
                    <React.Fragment key={c._id}>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', transition: 'background-color 0.2s' }}>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.dadosPessoais?.nome || c.nome || 'Aluno'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            CPF: {c.dadosPessoais?.cpf || '—'} {c.dadosPessoais?.dataNascimento ? `• Nasc: ${c.dadosPessoais.dataNascimento}` : ''}
                          </div>
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
                        <td style={{ padding: '14px 16px', fontSize: '0.88rem' }}>
                          <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>{restantes}</span> / <span style={{ color: 'var(--text-muted)' }}>{total}</span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Usados: {usados} | Reserv.: {reservados}</div>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.88rem' }}>
                          <span style={{ color: '#38bdf8', fontWeight: 700 }}>{recoveryRestantes}</span> / <span style={{ color: 'var(--text-muted)' }}>{recoveryTotal}</span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.88rem' }}>
                          <span style={{ color: '#ec4899', fontWeight: 700 }}>{massagemRestantes}</span> / <span style={{ color: 'var(--text-muted)' }}>{massagemTotal}</span>
                        </td>
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'nowrap' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', border: '1px solid var(--border-color)', background: isExpanded ? 'var(--bg-darker)' : 'transparent', borderRadius: '6px', fontSize: '0.78rem', color: 'var(--text-main)' }}
                              onClick={() => handleToggleExpand(c._id)}
                            >
                              <i className={isExpanded ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                              {isExpanded ? 'Fechar' : 'Consumo'}
                            </button>

                            <button 
                              className="btn btn-primary btn-sm" 
                              style={{ padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none', borderRadius: '6px', fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}
                              onClick={() => handleOpenAdjust(c)}
                            >
                              <i className="fa-solid fa-sliders"></i>
                              Ajustar
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded consumption details row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: '20px', background: 'var(--bg-darker)', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '12px', background: 'var(--bg-card)', padding: '16px' }}>
                              <h4 style={{ margin: '0 0 14px 0', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <i className="fa-solid fa-history" style={{ color: 'var(--color-primary)' }}></i>
                                Histórico de Utilização e Créditos de {c.dadosPessoais?.nome || c.nome}
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
                                                <span style={{ color: '#ef4444' }}>-3 créditos (Avaliação / Terapia Manual / Emergência)</span>
                                              ) : cost === 1 ? (
                                                <span style={{ color: 'var(--text-main)' }}>-1 crédito (Treino / Recovery / Massagem)</span>
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

      {/* Modal de Ajuste de Créditos */}
      {adjustClient && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px'
          }}
          onClick={() => setAdjustClient(null)}
        >
          <div 
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '20px',
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-sliders" style={{ color: 'var(--color-primary)' }}></i>
                Ajustar Créditos - Dynamus
              </h3>
              <button 
                onClick={() => setAdjustClient(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              Aluno: <strong style={{ color: 'var(--text-main)' }}>{adjustClient.dadosPessoais?.nome || adjustClient.nome}</strong>
            </p>

            {/* Saldos Atuais */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px', background: 'var(--bg-darker)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gerais</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {adjustClient.dadosComerciais?.creditosTotal || 0}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recovery</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38bdf8' }}>
                  {adjustClient.dadosComerciais?.creditosRecoveryTotal || 0}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Massagem</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ec4899' }}>
                  {adjustClient.dadosComerciais?.creditosMassagemTotal || 0}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {adjustError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#f87171', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                  {adjustError}
                </div>
              )}
              {adjustSuccess && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#34d399', padding: '10px', borderRadius: '8px', fontSize: '0.8rem' }}>
                  {adjustSuccess}
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Tipo de Crédito
                </label>
                <select 
                  value={tipoCredito} 
                  onChange={e => setTipoCredito(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none' }}
                >
                  <option value="geral">🏋️‍♂️ Créditos Gerais (Treinos / Avaliações)</option>
                  <option value="recovery">⚡ Créditos de Recovery</option>
                  <option value="massagem">💆‍♀️ Créditos de Massagem</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Operação
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button 
                    type="button" 
                    onClick={() => setOperacao('adicionar')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: operacao === 'adicionar' ? '2px solid #10b981' : '1px solid var(--border-color)',
                      background: operacao === 'adicionar' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-darker)',
                      color: operacao === 'adicionar' ? '#34d399' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fa-solid fa-plus" style={{ marginRight: '6px' }}></i> Adicionar (+)
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setOperacao('remover')}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: operacao === 'remover' ? '2px solid #ef4444' : '1px solid var(--border-color)',
                      background: operacao === 'remover' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-darker)',
                      color: operacao === 'remover' ? '#f87171' : 'var(--text-muted)',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <i className="fa-solid fa-minus" style={{ marginRight: '6px' }}></i> Remover (-)
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Quantidade de Créditos
                </label>
                <input 
                  type="number" 
                  min={1} 
                  max={100}
                  value={quantidade} 
                  onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '1rem', fontWeight: 700 }}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Motivo / Observação (Opcional)
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Bônus de fidelidade, reposição manual..."
                  value={motivo} 
                  onChange={e => setMotivo(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '8px', color: '#fff', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setAdjustClient(null)} 
                  style={{ flex: 1, padding: '12px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={savingAdjust}
                  style={{ flex: 2, padding: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none', borderRadius: '10px', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {savingAdjust ? 'Salvando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
