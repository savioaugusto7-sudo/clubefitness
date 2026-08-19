'use client';

import React, { useState } from 'react';

interface DynamusPanelProps {
  clients: any[];
  plans: any[];
  userCargo: string;
  fetchData: () => void;
}

function calculateExpiryDateStr(dataInicio: string, duracao: string): string {
  if (!dataInicio) return '';
  const d = new Date(dataInicio + 'T12:00:00');
  if (isNaN(d.getTime())) return '';
  const isSemestral = (duracao || '').toLowerCase().includes('semestral');
  d.setMonth(d.getMonth() + (isSemestral ? 6 : 12));
  return d.toISOString().split('T')[0];
}

function formatExpiryDisplay(dataInicio: string, duracao: string, vencimentoSalvo?: string): string {
  if (vencimentoSalvo && vencimentoSalvo.includes('-')) {
    const d = new Date(vencimentoSalvo + 'T12:00:00');
    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
  }
  if (!dataInicio) return '—';
  const d = new Date(dataInicio + 'T12:00:00');
  if (isNaN(d.getTime())) return '—';
  const isSemestral = (duracao || '').toLowerCase().includes('semestral');
  d.setMonth(d.getMonth() + (isSemestral ? 6 : 12));
  return d.toLocaleDateString('pt-BR');
}

export default function DynamusPanel({ clients, plans, userCargo, fetchData }: DynamusPanelProps) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [expandedClientId, setExpandedClientId] = useState<string | null>(null);
  const [clientApts, setClientApts] = useState<any[]>([]);
  const [loadingApts, setLoadingApts] = useState(false);

  // Modal de Ajuste de Créditos & Vigência
  const [adjustClient, setAdjustClient] = useState<any | null>(null);
  const [tipoCredito, setTipoCredito] = useState<'geral' | 'recovery' | 'massagem'>('geral');
  const [operacao, setOperacao] = useState<'adicionar' | 'remover'>('adicionar');
  const [quantidade, setQuantidade] = useState<number>(0);
  const [motivo, setMotivo] = useState('');
  const [editDataInicio, setEditDataInicio] = useState('');
  const [editPeriodicidade, setEditPeriodicidade] = useState<'semestral' | 'anual'>('anual');
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [adjustError, setAdjustError] = useState('');
  const [adjustSuccess, setAdjustSuccess] = useState('');

  // Modal de Lançamento de Consumo Manual / Retroativo
  const [retroClient, setRetroClient] = useState<any | null>(null);
  const [retroDate, setRetroDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [retroTime, setRetroTime] = useState('12:00');
  const [retroService, setRetroService] = useState('Treino Monitorado');
  const [retroCreditType, setRetroCreditType] = useState<'geral' | 'recovery' | 'massagem'>('geral');
  const [retroCredits, setRetroCredits] = useState<number>(1);
  const [retroObs, setRetroObs] = useState('');
  const [savingRetro, setSavingRetro] = useState(false);
  const [retroError, setRetroError] = useState('');
  const [retroSuccess, setRetroSuccess] = useState('');

  // Filter Dynamus clients
  const dynamusClients = clients.filter(c => 
    c.dadosComerciais?.planoId?.nome?.toLowerCase().includes('dynamus') ||
    c.planoNome?.toLowerCase().includes('dynamus') ||
    (c.dadosComerciais?.saldoCreditosDynamus && c.dadosComerciais.saldoCreditosDynamus > 0)
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
    setQuantidade(0);
    setMotivo('');
    const com = client.dadosComerciais || {};
    setEditDataInicio(com.dataInicio || '');
    const isSemestral = (com.duracao || '').toLowerCase().includes('semestral') || com.parcelas === 6;
    setEditPeriodicidade(isSemestral ? 'semestral' : 'anual');
    setAdjustError('');
    setAdjustSuccess('');
  };

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustClient) return;

    setSavingAdjust(true);
    setAdjustError('');
    setAdjustSuccess('');

    try {
      const payload: any = {
        clientId: adjustClient._id,
        dataInicio: editDataInicio,
        periodicidade: editPeriodicidade
      };

      if (quantidade > 0) {
        payload.tipoCredito = tipoCredito;
        payload.operacao = operacao;
        payload.quantidade = quantidade;
        payload.motivo = motivo;
      }

      const res = await fetch('/api/dynamus/adjust-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setAdjustSuccess(data.message || 'Dados do aluno Dynamus atualizados com sucesso!');
        fetchData();
        setTimeout(() => {
          setAdjustClient(null);
        }, 1200);
      } else {
        setAdjustError(data.error || 'Erro ao atualizar dados.');
      }
    } catch (err: any) {
      setAdjustError('Erro de conexão ao salvar ajuste.');
    } finally {
      setSavingAdjust(false);
    }
  };

  const handleOpenRetro = (client: any) => {
    setRetroClient(client);
    setRetroDate(new Date().toISOString().split('T')[0]);
    setRetroTime('12:00');
    setRetroService('Treino Monitorado');
    setRetroCreditType('geral');
    setRetroCredits(1);
    setRetroObs('');
    setRetroError('');
    setRetroSuccess('');
  };

  const handleRetroServiceChange = (service: string) => {
    setRetroService(service);
    if (service === 'Avaliação Física / Fisioterapêutica') {
      setRetroCreditType('geral');
      setRetroCredits(3);
    } else if (service === 'Recovery') {
      setRetroCreditType('recovery');
      setRetroCredits(1);
    } else if (service === 'Massagem / Massoterapia') {
      setRetroCreditType('massagem');
      setRetroCredits(1);
    } else if (service === 'Treino Monitorado' || service === 'Treino Livre') {
      setRetroCreditType('geral');
      setRetroCredits(1);
    }
  };

  const handleSaveRetroConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retroClient || !retroDate || retroCredits <= 0) {
      setRetroError('Preencha a data e a quantidade de créditos.');
      return;
    }

    setSavingRetro(true);
    setRetroError('');
    setRetroSuccess('');

    try {
      const res = await fetch('/api/dynamus/record-consumption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: retroClient._id,
          data: retroDate,
          horario: retroTime,
          servico: retroService,
          tipoCredito: retroCreditType,
          creditosDebitar: retroCredits,
          observacoes: retroObs
        })
      });

      const data = await res.json();
      if (data.success) {
        setRetroSuccess(data.message || 'Consumo retroativo lançado com sucesso!');
        fetchData();
        setTimeout(() => {
          setRetroClient(null);
        }, 1200);
      } else {
        setRetroError(data.error || 'Erro ao lançar consumo retroativo.');
      }
    } catch (err: any) {
      setRetroError('Erro de conexão ao registrar consumo.');
    } finally {
      setSavingRetro(false);
    }
  };

  const cardMetricStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
  };

  const metricLabelStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const metricValueStyle: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-main)',
    marginTop: '4px'
  };

  const metricIconStyle: React.CSSProperties = {
    fontSize: '1.8rem',
    color: 'var(--color-primary)'
  };

  return (
    <div>
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-bolt" style={{ color: '#f59e0b' }}></i>
            Consumo de Créditos – Dynamus
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Gerencie a vigência contratual (Semestral/Anual), acompanhe o consumo de créditos e lance atendimentos retroativos.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleCopyLink} 
            style={{ 
              padding: '10px 18px', 
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
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
                {['Aluno', 'Plano', 'Periodicidade', 'Adesão', 'Expiração', 'Créditos Gerais (Rest./Total)', 'Recovery', 'Massagem', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: h === 'Ações' ? 'center' : 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
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

                  const recoveryTotal = com.creditosRecoveryTotal || 0;
                  const recoveryUsados = com.creditosRecoveryUsados || 0;
                  const recoveryRestantes = Math.max(0, recoveryTotal - recoveryUsados);

                  const massagemTotal = com.creditosMassagemTotal || 0;
                  const massagemUsados = com.creditosMassagemUsados || 0;
                  const massagemRestantes = Math.max(0, massagemTotal - massagemUsados);

                  const isSemestral = (com.duracao || '').toLowerCase().includes('semestral') ||
                                      (com.planoId?.nome || '').toLowerCase().includes('semestral') ||
                                      com.parcelas === 6;
                  const periodicidadeLabel = isSemestral ? 'Semestral' : 'Anual';
                  const expDateDisplay = formatExpiryDisplay(com.dataInicio, periodicidadeLabel, com.vencimento);

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
                          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {com.planoId?.nome || 'Dynamus'}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span 
                            style={{ 
                              display: 'inline-block', 
                              padding: '3px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700,
                              background: isSemestral ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                              color: isSemestral ? '#3b82f6' : '#10b981',
                              border: `1px solid ${isSemestral ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                            }}
                          >
                            {periodicidadeLabel}
                          </span>
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          {com.dataInicio ? new Date(com.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                          {expDateDisplay}
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
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button 
                              className="btn btn-warning btn-sm" 
                              style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: '#f59e0b', borderColor: '#f59e0b', color: '#000', borderRadius: '6px', fontSize: '0.76rem', fontWeight: 700 }}
                              onClick={() => handleOpenRetro(c)}
                              title="Lançar consumo de sessão/atendimento retroativo"
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                              Consumo
                            </button>

                            <button 
                              className="btn btn-primary btn-sm" 
                              style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none', borderRadius: '6px', fontSize: '0.76rem', color: '#fff', fontWeight: 600 }}
                              onClick={() => handleOpenAdjust(c)}
                              title="Ajustar créditos ou editar data de vigência"
                            >
                              <i className="fa-solid fa-sliders"></i>
                              Ajustar
                            </button>

                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', border: '1px solid var(--border-color)', background: isExpanded ? 'var(--bg-darker)' : 'transparent', borderRadius: '6px', fontSize: '0.76rem', color: 'var(--text-main)' }}
                              onClick={() => handleToggleExpand(c._id)}
                              title="Ver histórico de utilização"
                            >
                              <i className={isExpanded ? "fa-solid fa-eye-slash" : "fa-solid fa-eye"}></i>
                              {isExpanded ? 'Fechar' : 'Histórico'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded consumption details row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} style={{ padding: '20px', background: 'var(--bg-darker)', borderBottom: '1px solid var(--border-color)' }}>
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
                                  Nenhum agendamento ou consumo registrado até o momento.
                                </div>
                              ) : (
                                <div style={{ overflowX: 'auto' }}>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                    <thead>
                                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                        <th style={{ padding: '8px 12px' }}>Data / Hora</th>
                                        <th style={{ padding: '8px 12px' }}>Serviço Realizado</th>
                                        <th style={{ padding: '8px 12px' }}>Profissional</th>
                                        <th style={{ padding: '8px 12px' }}>Status</th>
                                        <th style={{ padding: '8px 12px' }}>Impacto de Créditos</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {clientApts.map(apt => {
                                        const cost = getCreditCost(apt.servico);
                                        const statusLabels: Record<string, string> = {
                                          presenca: 'Presença Confirmada',
                                          agendado: 'Agendado',
                                          falta: 'Falta Sem Aviso (<24h)',
                                          cancelado: 'Cancelado com Aviso'
                                        };
                                        const statusColors: Record<string, string> = {
                                          presenca: 'var(--color-success)',
                                          agendado: 'var(--color-primary)',
                                          falta: 'var(--color-danger)',
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
                                                <span style={{ color: '#ef4444' }}>-3 créditos (Avaliação / Terapia / Emergência)</span>
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

      {/* Modal de Ajuste de Créditos e Vigência */}
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
              maxWidth: '520px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-sliders" style={{ color: 'var(--color-primary)' }}></i>
                Ajustar Créditos & Vigência Dynamus
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

            <form onSubmit={handleSaveAdjust}>
              {/* Seção 1: Vigência Contratual */}
              <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-calendar-check"></i>
                  Vigência e Periodicidade Contratual
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      Data de Adesão (Início):
                    </label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={editDataInicio} 
                      onChange={e => setEditDataInicio(e.target.value)} 
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                      Periodicidade:
                    </label>
                    <select 
                      value={editPeriodicidade} 
                      onChange={e => setEditPeriodicidade(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                    >
                      <option value="semestral">Semestral (6 meses)</option>
                      <option value="anual">Anual (12 meses)</option>
                    </select>
                  </div>
                </div>

                {/* Exibição em tempo real da expiração calculada */}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', background: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '8px 12px', borderRadius: '6px', marginTop: '6px' }}>
                  📅 <strong>Expiração Calculada:</strong>{' '}
                  <span style={{ color: '#10b981', fontWeight: 700 }}>
                    {formatExpiryDisplay(editDataInicio, editPeriodicidade)}
                  </span>
                </div>
              </div>

              {/* Seção 2: Ajuste de Créditos (Opcional) */}
              <div style={{ background: 'var(--bg-darker)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '18px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-coins"></i>
                  Ajuste Manual de Saldo de Créditos (Opcional)
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Tipo de Crédito:</label>
                    <select 
                      value={tipoCredito} 
                      onChange={e => setTipoCredito(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                    >
                      <option value="geral">Gerais (Treino / Fisio)</option>
                      <option value="recovery">Recovery</option>
                      <option value="massagem">Massagem</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Operação:</label>
                    <select 
                      value={operacao} 
                      onChange={e => setOperacao(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                    >
                      <option value="adicionar">➕ Adicionar (+)</option>
                      <option value="remover">➖ Remover (-)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Quantidade de Créditos (0 para não alterar):</label>
                  <input 
                    type="number" 
                    min="0" 
                    max="100" 
                    value={quantidade} 
                    onChange={e => setQuantidade(Math.max(0, parseInt(e.target.value) || 0))}
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>Justificativa / Motivo:</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Bonificação contratual ou correção de saldo"
                    value={motivo} 
                    onChange={e => setMotivo(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                  />
                </div>
              </div>

              {adjustError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '14px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  ⚠️ {adjustError}
                </div>
              )}

              {adjustSuccess && (
                <div style={{ color: '#10b981', fontSize: '0.85rem', marginBottom: '14px', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  ✓ {adjustSuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button 
                  type="button" 
                  onClick={() => setAdjustClient(null)} 
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>

                <button 
                  type="submit" 
                  disabled={savingAdjust}
                  className="btn btn-primary"
                  style={{ 
                    padding: '8px 20px', 
                    borderRadius: '8px', 
                    cursor: savingAdjust ? 'not-allowed' : 'pointer',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    border: 'none',
                    color: '#fff',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {savingAdjust ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Salvando...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Lançamento de Consumo Manual / Retroativo */}
      {retroClient && (
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
          onClick={() => setRetroClient(null)}
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
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b' }}>
                <i className="fa-solid fa-pen-to-square"></i>
                Lançar Consumo Manual / Retroativo
              </h3>
              <button 
                onClick={() => setRetroClient(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
              Aluno: <strong style={{ color: 'var(--text-main)' }}>{retroClient.dadosPessoais?.nome || retroClient.nome}</strong>
            </p>

            <form onSubmit={handleSaveRetroConsumption}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    Data do Atendimento:
                  </label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={retroDate} 
                    onChange={e => setRetroDate(e.target.value)} 
                    required
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    Horário (Opcional):
                  </label>
                  <input 
                    type="time" 
                    className="form-control"
                    value={retroTime} 
                    onChange={e => setRetroTime(e.target.value)} 
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  Tipo de Atendimento / Serviço:
                </label>
                <select 
                  value={retroService} 
                  onChange={e => handleRetroServiceChange(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontSize: '0.88rem' }}
                >
                  <option value="Treino Monitorado">🏋️ Treino Monitorado (1 crédito geral)</option>
                  <option value="Treino Livre">🏃 Treino Livre (1 crédito geral)</option>
                  <option value="Avaliação Física / Fisioterapêutica">📋 Avaliação Física / Fisio (3 créditos gerais)</option>
                  <option value="Recovery">❄️ Sessão Recovery (1 crédito recovery)</option>
                  <option value="Massagem / Massoterapia">💆 Massagem / Massoterapia (1 crédito massagem)</option>
                  <option value="Personalizado / Outro">⚙️ Outro Atendimento (Créditos Manuais)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    Tipo de Saldo:
                  </label>
                  <select 
                    value={retroCreditType} 
                    onChange={e => setRetroCreditType(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                  >
                    <option value="geral">Geral (Treino/Fisio)</option>
                    <option value="recovery">Recovery</option>
                    <option value="massagem">Massagem</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                    Créditos a Debitar:
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    max="30" 
                    value={retroCredits} 
                    onChange={e => setRetroCredits(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px', fontWeight: 700 }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                  Observações / Histórico:
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Sessão retroativa presencial de Julho/2026"
                  value={retroObs} 
                  onChange={e => setRetroObs(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', background: 'var(--bg-darker)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '8px' }}
                />
              </div>

              {retroError && (
                <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '14px', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                  ⚠️ {retroError}
                </div>
              )}

              {retroSuccess && (
                <div style={{ color: '#10b981', fontSize: '0.85rem', marginBottom: '14px', background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  ✓ {retroSuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => setRetroClient(null)} 
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                >
                  Cancelar
                </button>

                <button 
                  type="submit" 
                  disabled={savingRetro}
                  style={{ 
                    padding: '8px 20px', 
                    borderRadius: '8px', 
                    cursor: savingRetro ? 'not-allowed' : 'pointer',
                    background: '#f59e0b',
                    border: 'none',
                    color: '#000',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {savingRetro ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Lançando...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-check"></i> Confirmar Débito
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
