'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface ProfessionalOption {
  _id: string;
  nome: string;
  especialidade?: string;
  cargo?: string;
}

interface AdvertenciaItem {
  _id: string;
  profissionalId: {
    _id: string;
    nome: string;
    especialidade?: string;
    registro?: string;
  } | string;
  pontosDebito: number;
  descricao: string;
  data: string;
  mesReferencia: string;
  criadoPorNome?: string;
  status: 'ativa' | 'cancelada';
  motivoCancelamento?: string;
  canceladoEm?: string;
  createdAt: string;
}

interface AdvertenciasAdminPanelProps {
  onRefresh?: () => void;
}

export default function AdvertenciasAdminPanel({ onRefresh }: AdvertenciasAdminPanelProps) {
  // State
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [advertencias, setAdvertencias] = useState<AdvertenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedProfFilter, setSelectedProfFilter] = useState<string>('todos');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');

  // Form state
  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [formProfId, setFormProfId] = useState('');
  const [formPontos, setFormPontos] = useState('');
  const [formDataOcorrencia, setFormDataOcorrencia] = useState(todayStr);
  const [formDescricao, setFormDescricao] = useState('');

  // Modal de Revogação
  const [revokingItem, setRevokingItem] = useState<AdvertenciaItem | null>(null);
  const [motivoRevogacao, setMotivoRevogacao] = useState('');
  const [revokingLoading, setRevokingLoading] = useState(false);

  // Carregar profissionais
  const fetchProfessionals = async () => {
    try {
      const res = await fetch('/api/professionals');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProfessionals(json.data);
      }
    } catch (e) {
      console.error('Erro ao buscar profissionais:', e);
    }
  };

  // Carregar advertências com filtros
  const fetchAdvertencias = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (selectedMonth) params.append('mes', selectedMonth);
      if (selectedProfFilter !== 'todos') params.append('profissionalId', selectedProfFilter);
      if (selectedStatusFilter !== 'todos') params.append('status', selectedStatusFilter);

      const res = await fetch(`/api/admin/advertencias?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAdvertencias(json.data);
      } else {
        setErrorMsg(json.error || 'Erro ao carregar lista de advertências.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Erro de conexão ao carregar advertências.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, []);

  useEffect(() => {
    fetchAdvertencias();
  }, [selectedMonth, selectedProfFilter, selectedStatusFilter]);

  // Submeter nova advertência
  const handleSubmitAdvertencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formProfId) {
      setErrorMsg('Selecione o profissional que receberá a advertência.');
      return;
    }

    const ptsNum = parseFloat(String(formPontos).replace(',', '.'));
    if (isNaN(ptsNum) || ptsNum <= 0) {
      setErrorMsg('Informe uma quantidade válida de pontos a debitar (número livre maior que zero).');
      return;
    }

    if (!formDescricao.trim()) {
      setErrorMsg('Descreva detalhadamente o ocorrido / motivo da advertência.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/advertencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profissionalId: formProfId,
          pontosDebito: ptsNum,
          descricao: formDescricao.trim(),
          data: formDataOcorrencia || todayStr
        })
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg(`Advertência registrada com sucesso! -${ptsNum} pts debitados do profissional.`);
        setFormPontos('');
        setFormDescricao('');
        setFormProfId('');
        fetchAdvertencias();
        if (onRefresh) onRefresh();
      } else {
        setErrorMsg(json.error || 'Erro ao registrar advertência.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Falha de comunicação ao registrar advertência.');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmar revogação de advertência
  const handleConfirmRevogacao = async () => {
    if (!revokingItem) return;
    if (!motivoRevogacao.trim()) {
      alert('Por favor, informe a justificativa para revogação da advertência.');
      return;
    }

    setRevokingLoading(true);
    try {
      const res = await fetch('/api/admin/advertencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: revokingItem._id,
          status: 'cancelada',
          motivoCancelamento: motivoRevogacao.trim()
        })
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg('Advertência revogada com sucesso. Os pontos foram restituídos.');
        setRevokingItem(null);
        setMotivoRevogacao('');
        fetchAdvertencias();
        if (onRefresh) onRefresh();
      } else {
        alert(json.error || 'Erro ao revogar advertência.');
      }
    } catch (e: any) {
      alert(e.message || 'Falha ao revogar advertência.');
    } finally {
      setRevokingLoading(false);
    }
  };

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    const ativas = advertencias.filter(a => a.status === 'ativa');
    const totalPontosDebito = ativas.reduce((acc, curr) => acc + (Number(curr.pontosDebito) || 0), 0);
    const profsUnicos = new Set(
      ativas.map(a => (typeof a.profissionalId === 'object' && a.profissionalId?._id ? a.profissionalId._id : String(a.profissionalId)))
    );
    const canceladas = advertencias.filter(a => a.status === 'cancelada').length;

    return {
      totalAtivas: ativas.length,
      totalPontosDebito,
      profsPenalizados: profsUnicos.size,
      totalCanceladas: canceladas
    };
  }, [advertencias]);

  const getProfNome = (item: AdvertenciaItem) => {
    if (typeof item.profissionalId === 'object' && item.profissionalId?.nome) {
      return item.profissionalId.nome;
    }
    const found = professionals.find(p => p._id === item.profissionalId);
    return found ? found.nome : 'Profissional';
  };

  const getProfEspecialidade = (item: AdvertenciaItem) => {
    if (typeof item.profissionalId === 'object' && item.profissionalId?.especialidade) {
      return item.profissionalId.especialidade;
    }
    const found = professionals.find(p => p._id === item.profissionalId);
    return found?.especialidade || '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', paddingBottom: '30px' }}>
      
      {/* 1. CABEÇALHO EXECUTIVO */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', margin: 0 }}>
        <div className="view-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.45rem', fontWeight: 700 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: '#ef4444' }}></i> Advertências & Débitos Disciplinares
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '20px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              Gestão Administrativa
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Lançamento de penalidades com débito direto no extrato de pontuação e ranking dos profissionais.
          </p>
        </div>

        {/* CONTROLES DO CABEÇALHO */}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-card)',
            padding: '6px 12px',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}>
            <i className="fa-regular fa-calendar-days" style={{ color: '#ef4444' }}></i>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Mês:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            />
            {selectedMonth && (
              <button
                type="button"
                onClick={() => setSelectedMonth('')}
                title="Limpar filtro de mês (ver todos)"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  padding: '2px 4px'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchAdvertencias();
              fetchProfessionals();
            }}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <i className={`fa-solid fa-rotate ${loading ? 'fa-spin' : ''}`}></i>
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {errorMsg && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fca5a5',
          fontSize: '0.88rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ color: '#ef4444', fontSize: '1.1rem' }}></i>
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: '10px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#6ee7b7',
          fontSize: '0.88rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-circle-check" style={{ color: '#10b981', fontSize: '1.1rem' }}></i>
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer' }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* 2. CARDS DE RESUMO / KPIS */}
      <div className="metrics-grid">
        {/* Card 1: Advertências Ativas */}
        <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.16) 100%)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div className="metric-info">
            <h3 style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Advertências Ativas</h3>
            <div className="value" style={{ color: '#f87171' }}>{kpis.totalAtivas}</div>
            <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
              {selectedMonth ? `No mês ${selectedMonth}` : 'No período geral'}
            </small>
          </div>
          <div className="metric-icon danger">
            <i className="fa-solid fa-shield-halved"></i>
          </div>
        </div>

        {/* Card 2: Pontos Debitados */}
        <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(153, 27, 27, 0.25) 100%)', border: '1px solid rgba(239, 68, 68, 0.45)' }}>
          <div className="metric-info">
            <h3 style={{ fontSize: '0.75rem', color: '#fca5a5' }}>Total Pontos Debitados</h3>
            <div className="value" style={{ color: '#ef4444', fontWeight: 800 }}>
              -{kpis.totalPontosDebito.toFixed(1)} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>pts</span>
            </div>
            <small style={{ color: '#fca5a5', fontSize: '0.74rem' }}>
              Impactando ranking e metas
            </small>
          </div>
          <div className="metric-icon danger">
            <i className="fa-solid fa-arrow-trend-down"></i>
          </div>
        </div>

        {/* Card 3: Profissionais Notificados */}
        <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(180, 83, 9, 0.16) 100%)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div className="metric-info">
            <h3 style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Profissionais Notificados</h3>
            <div className="value" style={{ color: '#fbbf24' }}>{kpis.profsPenalizados}</div>
            <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
              Com penalidade individual
            </small>
          </div>
          <div className="metric-icon warning">
            <i className="fa-solid fa-user-xmark"></i>
          </div>
        </div>

        {/* Card 4: Advertências Revogadas */}
        <div className="metric-card">
          <div className="metric-info">
            <h3 style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Advertências Revogadas</h3>
            <div className="value" style={{ color: '#cbd5e1' }}>{kpis.totalCanceladas}</div>
            <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
              Pontos restituídos à equipe
            </small>
          </div>
          <div className="metric-icon">
            <i className="fa-solid fa-ban"></i>
          </div>
        </div>
      </div>

      {/* 3. FORMULÁRIO DE LANÇAMENTO */}
      <div className="content-panel" style={{ margin: 0, padding: '22px' }}>
        <div className="panel-header" style={{ marginBottom: '18px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)', margin: 0, fontSize: '1.15rem' }}>
            <i className="fa-solid fa-pen-to-square" style={{ color: '#ef4444' }}></i>
            Lançar Advertência Disciplinar
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Selecione o profissional, defina os pontos livremente e registre o motivo detalhado.
          </span>
        </div>

        <form onSubmit={handleSubmitAdvertencia}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            marginBottom: '16px'
          }}>
            {/* SELEÇÃO DO PROFISSIONAL (SEM AVATAR) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Profissional <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                className="form-control"
                value={formProfId}
                onChange={(e) => setFormProfId(e.target.value)}
                required
                style={{ cursor: 'pointer' }}
              >
                <option value="">Selecione o profissional...</option>
                {professionals.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.nome} {p.especialidade ? `(${p.especialidade})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* PONTOS A DEBITAR (NUMERO LIVRE - SEM BLOQUEIO DE 5 EM 5) */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Pontos a Debitar <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  className="form-control"
                  value={formPontos}
                  onChange={(e) => setFormPontos(e.target.value)}
                  placeholder="Ex: 5, 8, 12.5, 20..."
                  required
                  style={{ paddingRight: '55px' }}
                />
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontWeight: 700,
                  color: '#ef4444',
                  fontSize: '0.85rem'
                }}>
                  -pts
                </span>
              </div>
              <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                Entrada livre: digite qualquer valor numérico que desejar debitar.
              </small>
            </div>

            {/* DATA DA OCORRÊNCIA */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                Data da Ocorrência <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                className="form-control"
                value={formDataOcorrencia}
                onChange={(e) => setFormDataOcorrencia(e.target.value)}
                required
              />
            </div>
          </div>

          {/* DESCRIÇÃO / MOTIVO */}
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
              Descrição do Ocorrido / Justificativa <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              className="form-control"
              rows={3}
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              placeholder="Descreva detalhadamente a ocorrência, processo descumprido ou conduta que gerou a penalidade..."
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn btn-danger"
              disabled={submitting}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '0.9rem' }}
            >
              <i className={`fa-solid fa-triangle-exclamation ${submitting ? 'fa-spin' : ''}`}></i>
              <span>{submitting ? 'Registrando...' : 'Lançar Advertência e Debitar Pontos'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 4. HISTÓRICO DE ADVERTÊNCIAS */}
      <div className="content-panel" style={{ margin: 0, padding: '22px' }}>
        <div className="panel-header" style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}>
              <i className="fa-solid fa-list-check"></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>
                Histórico de Advertências Registradas
              </h2>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                Total de {advertencias.length} registros no filtro selecionado
              </small>
            </div>
          </div>

          {/* FILTROS ADICIONAIS DA TABELA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* FILTRAR POR PROFISSIONAL */}
            <select
              className="form-control"
              value={selectedProfFilter}
              onChange={(e) => setSelectedProfFilter(e.target.value)}
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem', height: 'auto' }}
            >
              <option value="todos">Todos os Profissionais</option>
              {professionals.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.nome}
                </option>
              ))}
            </select>

            {/* FILTRAR POR STATUS */}
            <select
              className="form-control"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem', height: 'auto' }}
            >
              <option value="todos">Todos os Status</option>
              <option value="ativa">Apenas Ativas</option>
              <option value="cancelada">Apenas Revogadas</option>
            </select>
          </div>
        </div>

        {/* TABELA DE REGISTROS */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '1.8rem', color: '#ef4444', marginBottom: '10px' }}></i>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Carregando advertências...</p>
          </div>
        ) : advertencias.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)'
          }}>
            <i className="fa-solid fa-circle-check" style={{ fontSize: '2rem', color: '#64748b', marginBottom: '10px' }}></i>
            <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1rem' }}>Nenhuma advertência encontrada</h4>
            <p style={{ margin: '6px 0 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Não há penalidades cadastradas para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Data</th>
                  <th style={{ width: '220px' }}>Profissional</th>
                  <th>Descrição / Motivo</th>
                  <th style={{ textAlign: 'center', width: '110px' }}>Débito</th>
                  <th style={{ width: '140px' }}>Registrado Por</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Status</th>
                  <th style={{ textAlign: 'right', width: '110px' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {advertencias.map((item) => {
                  const isCancelada = item.status === 'cancelada';
                  return (
                    <tr
                      key={item._id}
                      style={{
                        opacity: isCancelada ? 0.6 : 1,
                        background: isCancelada ? 'rgba(0, 0, 0, 0.2)' : 'transparent'
                      }}
                    >
                      {/* DATA */}
                      <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-main)' }}>
                        {item.data}
                      </td>

                      {/* PROFISSIONAL (SEM AVATAR) */}
                      <td>
                        <strong style={{ display: 'block', color: 'var(--text-main)', fontSize: '0.88rem' }}>
                          {getProfNome(item)}
                        </strong>
                        {getProfEspecialidade(item) && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {getProfEspecialidade(item)}
                          </span>
                        )}
                      </td>

                      {/* DESCRIÇÃO */}
                      <td>
                        <div style={{ color: 'var(--text-main)', fontSize: '0.84rem', lineHeight: '1.4' }}>
                          {item.descricao}
                        </div>
                        {isCancelada && item.motivoCancelamento && (
                          <div style={{
                            marginTop: '6px',
                            padding: '4px 8px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            borderRadius: '6px',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            fontSize: '0.74rem',
                            color: '#fca5a5'
                          }}>
                            <strong>Revogado:</strong> {item.motivoCancelamento}
                          </div>
                        )}
                      </td>

                      {/* PONTOS DEBITO */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '20px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: isCancelada ? 'rgba(255, 255, 255, 0.06)' : 'rgba(239, 68, 68, 0.15)',
                          color: isCancelada ? '#94a3b8' : '#f87171',
                          border: isCancelada ? '1px solid var(--border-color)' : '1px solid rgba(239, 68, 68, 0.3)',
                          textDecoration: isCancelada ? 'line-through' : 'none'
                        }}>
                          -{item.pontosDebito} pts
                        </span>
                      </td>

                      {/* REGISTRADO POR */}
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {item.criadoPorNome || 'Administrador'}
                      </td>

                      {/* STATUS */}
                      <td style={{ textAlign: 'center' }}>
                        {isCancelada ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#94a3b8',
                            border: '1px solid var(--border-color)'
                          }}>
                            <i className="fa-solid fa-ban" style={{ fontSize: '0.65rem' }}></i> Revogada
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                          }}>
                            <i className="fa-solid fa-circle" style={{ fontSize: '0.5rem' }}></i> Ativa
                          </span>
                        )}
                      </td>

                      {/* AÇÕES */}
                      <td style={{ textAlign: 'right' }}>
                        {!isCancelada ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setRevokingItem(item);
                              setMotivoRevogacao('');
                            }}
                            title="Revogar advertência e estornar pontos"
                            style={{
                              fontSize: '0.75rem',
                              padding: '4px 10px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#f87171',
                              borderColor: 'rgba(239, 68, 68, 0.3)'
                            }}
                          >
                            <i className="fa-solid fa-rotate-left"></i>
                            <span>Revogar</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                            Sem ações
                          </span>
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

      {/* 5. MODAL DE REVOGAÇÃO */}
      {revokingItem && (
        <div
          className="modal-overlay"
          style={{ display: 'flex' }}
          onClick={() => setRevokingItem(null)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '90%' }}
          >
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: 'var(--text-main)' }}>
                <i className="fa-solid fa-rotate-left" style={{ color: '#ef4444' }}></i>
                Revogar Advertência Disciplinar
              </h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setRevokingItem(null)}
              >
                &times;
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '0.84rem'
              }}>
                <p style={{ margin: '0 0 6px 0' }}>
                  <strong style={{ color: 'var(--text-main)' }}>Profissional:</strong> {getProfNome(revokingItem)}
                </p>
                <p style={{ margin: '0 0 6px 0' }}>
                  <strong style={{ color: 'var(--text-main)' }}>Data:</strong> {revokingItem.data}
                </p>
                <p style={{ margin: '0 0 6px 0' }}>
                  <strong style={{ color: 'var(--text-main)' }}>Pontos a Estornar:</strong>{' '}
                  <span style={{ color: '#34d399', fontWeight: 700 }}>+{revokingItem.pontosDebito} pts</span>
                </p>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  &quot;{revokingItem.descricao}&quot;
                </p>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Motivo / Justificativa da Revogação <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={motivoRevogacao}
                  onChange={(e) => setMotivoRevogacao(e.target.value)}
                  placeholder="Informe o motivo da revogação (ex: recurso aceito pela coordenação, erro material comprobado...)"
                  required
                />
                <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  Ao confirmar, a advertência é inativada e a pontuação é imediatamente restituída.
                </small>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '14px 20px',
              borderTop: '1px solid var(--border-color)'
            }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setRevokingItem(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={handleConfirmRevogacao}
                disabled={revokingLoading || !motivoRevogacao.trim()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <i className={`fa-solid fa-check ${revokingLoading ? 'fa-spin' : ''}`}></i>
                <span>{revokingLoading ? 'Revogando...' : 'Confirmar Revogação'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
