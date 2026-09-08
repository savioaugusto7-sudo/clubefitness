'use client';

import React, { useState, useEffect } from 'react';

interface MetasProfissionaisPanelProps {
  onRefresh?: () => void;
}

export default function MetasProfissionaisPanel({}: MetasProfissionaisPanelProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modal de Extrato
  const [selectedProfExtrato, setSelectedProfExtrato] = useState<any | null>(null);
  const [extratoTab, setExtratoTab] = useState<'creditos' | 'debitos'>('creditos');

  const fetchGoalsData = async (mes: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/professional-goals?mes=${mes}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Erro ao carregar indicadores de metas.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalsData(selectedMonth);
  }, [selectedMonth]);

  // Lista de meses para o seletor (últimos 12 meses)
  const availableMonths = React.useMemo(() => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      months.push({
        value: val,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      });
    }
    return months;
  }, []);

  // Aba Principal da Tela: 'ranking', 'alunos_tracking' ou 'emergencias_evolucao'
  const [activeMainTab, setActiveMainTab] = useState<'ranking' | 'alunos_tracking' | 'emergencias_evolucao'>('ranking');

  // Tracking de Alunos
  const [trackingFilter, setTrackingFilter] = useState<'todos' | 'baixo' | 'medio' | 'alto'>('todos');
  const [trackingSearch, setTrackingSearch] = useState('');

  // Evolução de Emergências
  const [emergenciaFilter, setEmergenciaFilter] = useState<'todos' | 'reincidentes' | 'ok'>('todos');
  const [emergenciaSearch, setEmergenciaSearch] = useState('');
  const [emergenciaVisualMode, setEmergenciaVisualMode] = useState<'cards' | 'tabela'>('cards');

  const rankingList = data?.ranking || [];
  const kpis = data?.kpis || {};
  const alunosTracking: any[] = data?.alunosTracking || [];
  const emergenciasData = data?.emergenciasData || {};
  const historicoMensal: any[] = emergenciasData.historicoMensal || [];
  const alunosComEmergencia: any[] = emergenciasData.alunosComEmergencia || [];
  const atendimentosDetalhados: any[] = emergenciasData.atendimentosDetalhados || [];
  const resumoEmergencia = emergenciasData.resumoMes || {};

  const filteredRanking = rankingList.filter((item: any) => {
    const nome = (item.prof?.nome || '').toLowerCase();
    const esp = (item.prof?.especialidade || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return nome.includes(q) || esp.includes(q);
  });

  const filteredTracking = alunosTracking.filter((a: any) => {
    const matchesFilter =
      trackingFilter === 'todos' ||
      (trackingFilter === 'baixo' && a.riscoGeral === 'baixo') ||
      (trackingFilter === 'medio' && a.riscoGeral === 'medio') ||
      (trackingFilter === 'alto' && a.riscoGeral === 'alto');

    const q = trackingSearch.toLowerCase();
    const matchesSearch =
      (a.nome || '').toLowerCase().includes(q) ||
      (a.profissionalVinculadoNome || '').toLowerCase().includes(q) ||
      (a.frequenciaContratada || '').toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const filteredAlunosEmergencia = alunosComEmergencia.filter((a: any) => {
    const matchesFilter =
      emergenciaFilter === 'todos' ||
      (emergenciaFilter === 'reincidentes' && a.status === 'reincidente') ||
      (emergenciaFilter === 'ok' && a.status === 'ok');

    const q = emergenciaSearch.toLowerCase();
    const matchesSearch =
      (a.nome || '').toLowerCase().includes(q) ||
      (a.profissionalVinculadoNome || '').toLowerCase().includes(q) ||
      (a.profissionaisAtendentes || '').toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      
      {/* 1. CABEÇALHO EXECUTIVO & FILTRO DE PERÍODO */}
      <div className="view-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', margin: 0 }}>
        <div className="view-title-group">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa-solid fa-trophy" style={{ color: '#f59e0b' }}></i> Acompanhamento de Metas dos Profissionais
          </h1>
          <p>Painel de produtividade clínica, agilidade de prescrição e indicadores de retenção e conformidade</p>
        </div>

        {/* Seletor de Mês e Botão de Atualizar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.05)', padding: '6px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <i className="fa-regular fa-calendar-days" style={{ color: '#38bdf8' }}></i>
            <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>Mês de Referência:</span>
            <select
              className="form-control"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '4px 10px', fontSize: '0.85rem', width: 'auto', background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-main)', cursor: 'pointer' }}
            >
              {availableMonths.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchGoalsData(selectedMonth)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem' }}
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i> Atualizar
          </button>
        </div>
      </div>

      {/* BANNER DE STATUS DO MÊS */}
      <div
        style={{
          background: kpis.isMesEmAndamento
            ? 'linear-gradient(90deg, rgba(56, 189, 248, 0.12) 0%, rgba(3, 105, 161, 0.08) 100%)'
            : 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
          border: `1px solid ${kpis.isMesEmAndamento ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i
            className={`fa-solid ${kpis.isMesEmAndamento ? 'fa-hourglass-half' : 'fa-circle-check'}`}
            style={{ color: kpis.isMesEmAndamento ? '#38bdf8' : '#34d399', fontSize: '1.2rem' }}
          ></i>
          <div>
            <strong style={{ color: 'var(--text-main)', fontSize: '0.92rem' }}>
              {kpis.isMesEmAndamento
                ? `Mês em Andamento • Dia ${kpis.diaAtualMes} de ${kpis.diasTotalMes} (${kpis.percentualMesDecorrido}% decorrido)`
                : `Mês Encerrado • Fechamento Consolidado Oficial (${selectedMonth})`}
            </strong>
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px' }}>
              {kpis.isMesEmAndamento
                ? 'Durante o mês, o balanço dos profissionais contabiliza estritamente a produção individual. Frequência, treino livre e emergências são consolidados no fechamento.'
                : 'Pontuação oficial consolidada: inclui créditos de produção individual e apuração definitiva dos indicadores coletivos.'}
            </div>
          </div>
        </div>

        {/* Projeção Coletiva para Fechamento */}
        {kpis.isMesEmAndamento && kpis.projecaoColetiva && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: '#cbd5e1' }}>
            <span style={{ color: '#94a3b8' }}>Projeção Coletiva para o Fechamento: </span>
            <strong style={{ color: kpis.projecaoColetiva.saldoProjetado >= 0 ? '#34d399' : '#f87171' }}>
              {kpis.projecaoColetiva.saldoProjetado >= 0 ? `+${kpis.projecaoColetiva.saldoProjetado}` : kpis.projecaoColetiva.saldoProjetado} pts/prof
            </strong>
          </div>
        )}
      </div>

      {/* NAVEGAÇÃO ENTRE ABAS PRINCIPAIS */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '2px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveMainTab('ranking')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeMainTab === 'ranking' ? '3px solid #38bdf8' : '3px solid transparent',
            color: activeMainTab === 'ranking' ? '#38bdf8' : '#94a3b8',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fa-solid fa-ranking-star"></i> Ranking dos Profissionais
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('alunos_tracking')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeMainTab === 'alunos_tracking' ? '3px solid #c084fc' : '3px solid transparent',
            color: activeMainTab === 'alunos_tracking' ? '#c084fc' : '#94a3b8',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fa-solid fa-users-viewfinder"></i> Monitor de Progressão & Risco dos Alunos ({alunosTracking.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('emergencias_evolucao')}
          style={{
            padding: '10px 18px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeMainTab === 'emergencias_evolucao' ? '3px solid #ef4444' : '3px solid transparent',
            color: activeMainTab === 'emergencias_evolucao' ? '#f87171' : '#94a3b8',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fa-solid fa-truck-medical"></i> Evolução de Emergências ({alunosComEmergencia.length})
        </button>
      </div>

      {/* CONTEÚDO DA ABA 1: RANKING DOS PROFISSIONAIS */}
      {activeMainTab === 'ranking' && (
        <>
          {/* 2. KPIS EXECUTIVOS */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
            
            {/* Card 1: Pontuação Total da Clínica */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(180, 83, 9, 0.15) 100%)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Saldo Total de Pontos ({kpis.isMesEmAndamento ? 'Produção' : 'Consolidado'})</h3>
                <div className="value" style={{ color: '#f59e0b', fontSize: '1.8rem', fontWeight: 900 }}>
                  {kpis.totalPontosClinica || 0} pts
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  Mês: <strong style={{ color: '#fff' }}>{selectedMonth}</strong> • {kpis.totalProfissionais || 0} profissionais ativos
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <i className="fa-solid fa-award"></i>
              </div>
            </div>

            {/* Card 2: Profissional Destaque */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.15) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Profissional Líder do Mês</h3>
                <div className="value" style={{ color: '#10b981', fontSize: '1.2rem', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {kpis.liderNome || 'Nenhum'}
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  Pontuação individual: <strong style={{ color: '#34d399' }}>{kpis.liderPontos || 0} pts</strong>
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <i className="fa-solid fa-medal"></i>
              </div>
            </div>

            {/* Card 3: Total de Créditos (+) vs Débitos (-) */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(3, 105, 161, 0.15) 100%)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Balanço de Pontuações</h3>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'baseline', marginTop: '4px' }}>
                  <span style={{ color: '#34d399', fontSize: '1.25rem', fontWeight: 900 }}>+{kpis.totalCreditosClinica || 0}</span>
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>/</span>
                  <span style={{ color: '#f87171', fontSize: '1.25rem', fontWeight: 900 }}>-{kpis.totalDebitosClinica || 0}</span>
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  Créditos e Débitos de Produção Individual
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <i className="fa-solid fa-scale-balanced"></i>
              </div>
            </div>

            {/* Card 4: Retenção e Ritmo de Frequência */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(107, 33, 168, 0.15) 100%)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  {kpis.isMesEmAndamento ? 'Alunos no Ritmo / Meta Batida' : 'Alunos em Alta Retenção (≥ 80%)'}
                </h3>
                <div className="value" style={{ color: '#c084fc', fontSize: '1.8rem', fontWeight: 900 }}>
                  {kpis.isMesEmAndamento
                    ? (kpis.totalAlunosNoRitmo || 0) + (kpis.totalAlunosMetaBatida || 0)
                    : kpis.totalAlunosAltaFreq || 0}{' '}
                  <span style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: 500 }}>
                    de {kpis.totalAlunosAtivos || 0}
                  </span>
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  {kpis.isMesEmAndamento
                    ? `🟡 ${kpis.totalAlunosEmRisco || 0} em risco • 🔴 ${kpis.totalAlunosForaDaMeta || 0} críticos`
                    : `+${(kpis.totalAlunosAltaFreq || 0) * 5} pts/prof • ${kpis.totalAlunosBaixaFreq || 0} com débito`}
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                <i className="fa-solid fa-users-viewfinder"></i>
              </div>
            </div>

          </div>

          {/* 3. REGRAS DO SCORECARD */}
          <div className="content-panel" style={{ background: 'var(--card-bg)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-circle-info" style={{ color: '#38bdf8' }}></i> Regras de Pontuação e Conformidade de Metas
              </h3>
              <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Atualização automática em tempo real</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', fontSize: '0.78rem' }}>
              {/* Créditos */}
              <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontWeight: 800, color: '#34d399', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-circle-plus"></i> Atividades que Somam Pontos (+)
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <li>Avaliação Física concluída em ≤ 1h: <strong style={{ color: '#34d399' }}>+4 pts</strong></li>
                  <li>Teste de Força concluído em ≤ 1h: <strong style={{ color: '#34d399' }}>+4 pts</strong></li>
                  <li>Ficha de Treino montada em ≤ 24h após avaliação: <strong style={{ color: '#34d399' }}>+4 pts</strong></li>
                  <li>Relatório Fisioterápico concluído em ≤ 2h: <strong style={{ color: '#34d399' }}>+6 pts</strong></li>
                  <li>Aluno com frequência mensal ≥ 80% (fechamento): <strong style={{ color: '#34d399' }}>+5 pts/aluno</strong></li>
                  <li>Aluno com mín. 1 Treino Livre na semana (fechamento): <strong style={{ color: '#34d399' }}>+2 pts/aluno</strong></li>
                  <li>Aluno com no máx. 1 emergência no mês (fechamento): <strong style={{ color: '#34d399' }}>+3 pts/aluno</strong></li>
                </ul>
              </div>

              {/* Débitos */}
              <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '10px 14px' }}>
                <div style={{ fontWeight: 800, color: '#f87171', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-circle-minus"></i> Critérios que Debitam Pontos (-)
                </div>
                <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <li>Avaliação/Teste/Relatório sem Ficha após 24h: <strong style={{ color: '#f87171' }}>-2 pts</strong></li>
                  <li>Avaliação ou Ficha vencida há &gt; 2 meses: <strong style={{ color: '#f87171' }}>-10 pts</strong> (profissional vinculado)</li>
                  <li>Aluno ativo com frequência mensal &lt; 80% (fechamento): <strong style={{ color: '#f87171' }}>-5 pts/aluno</strong></li>
                  <li>Aluno sem o mín. de 1 Treino Livre na semana (fechamento): <strong style={{ color: '#f87171' }}>-2 pts/aluno</strong></li>
                  <li>Aluno com &gt; 1 emergência no mês (fechamento): <strong style={{ color: '#f87171' }}>-4 pts/aluno</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* 4. TABELA DE RANKING DOS PROFISSIONAIS */}
          <div className="content-panel" style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-ranking-star" style={{ color: '#f59e0b' }}></i> {kpis.isMesEmAndamento ? 'Ranking de Produção Individual' : 'Ranking Geral Consolidado'} ({selectedMonth})
                </h2>
                <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                  {kpis.isMesEmAndamento
                    ? 'Classificação por saldo de produção clínica individual em tempo real.'
                    : 'Classificação oficial definitiva por saldo consolidado (produção individual + fechamento coletivo).'}
                </small>
              </div>

              {/* Campo de Busca */}
              <div style={{ width: '260px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por profissional ou especialidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ fontSize: '0.82rem', padding: '7px 12px' }}
                />
              </div>
            </div>

        {error && (
          <div className="alert alert-danger" style={{ fontSize: '0.85rem' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.8rem', marginBottom: '10px', color: '#38bdf8' }}></i>
            <p style={{ fontSize: '0.88rem', margin: 0 }}>Calculando indicadores de metas e SLAs...</p>
          </div>
        ) : filteredRanking.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Nenhum profissional encontrado para o período selecionado.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '12px 10px', width: '60px', textAlign: 'center' }}>Posição</th>
                  <th style={{ padding: '12px 10px' }}>Profissional</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Avaliações & Testes</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Fichas Treino</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Relatórios</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Pontos Coletivos</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Débitos Aplicados</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Saldo Líquido</th>
                  <th style={{ padding: '12px 10px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRanking.map((item: any, idx: number) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;

                  const totalCredIndiv = (item.detalhes.avaliacoesPrazoPts || 0) + (item.detalhes.testesForcaPrazoPts || 0) + (item.detalhes.fichas24hPts || 0) + (item.detalhes.relatoriosPrazoPts || 0);
                  const totalDeb = (item.debitosIndividuais || 0) + (item.debitosColetivos || 0);

                  return (
                    <tr key={item.prof._id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', background: isTop1 ? 'rgba(245, 158, 11, 0.03)' : 'transparent' }}>
                      
                      {/* Posição */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          background: isTop1 ? '#f59e0b' : (isTop2 ? '#94a3b8' : (isTop3 ? '#b45309' : 'rgba(255, 255, 255, 0.06)')),
                          color: isTop1 || isTop2 || isTop3 ? '#0f172a' : '#cbd5e1'
                        }}>
                          {idx + 1}
                        </span>
                      </td>

                      {/* Profissional */}
                      <td style={{ padding: '12px 10px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          {item.prof.nome}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          {item.prof.especialidade || 'Profissional'} • Reg: {item.prof.registro || '-'}
                        </div>
                      </td>

                      {/* Avaliações e Testes */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#38bdf8' }}>
                          +{(item.detalhes.avaliacoesPrazoPts || 0) + (item.detalhes.testesForcaPrazoPts || 0)} pts
                        </div>
                        <small style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {item.detalhes.avaliacoesPrazo + item.detalhes.testesForcaPrazo} laudos em ≤ 1h
                        </small>
                      </td>

                      {/* Fichas de Treino */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#34d399' }}>
                          +{item.detalhes.fichas24hPts || 0} pts
                        </div>
                        <small style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {item.detalhes.fichas24h} em ≤ 24h
                        </small>
                      </td>

                      {/* Relatórios */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#818cf8' }}>
                          +{item.detalhes.relatoriosPrazoPts || 0} pts
                        </div>
                        <small style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {item.detalhes.relatoriosPrazo} em ≤ 2h
                        </small>
                      </td>

                      {/* Pontos Coletivos */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#c084fc' }}>
                          +{item.creditosColetivos || 0} pts
                        </div>
                        <small style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          Retenção & Emergências
                        </small>
                      </td>

                      {/* Débitos */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, color: '#f87171' }}>
                          -{totalDeb} pts
                        </div>
                        <small style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          {item.extratoDebitos?.length || 0} ocorrência(s)
                        </small>
                      </td>

                      {/* Saldo Líquido */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '8px',
                          fontWeight: 900,
                          fontSize: '1rem',
                          background: item.pontosLiquidos >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: item.pontosLiquidos >= 0 ? '#34d399' : '#f87171',
                          border: `1px solid ${item.pontosLiquidos >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                          {item.pontosLiquidos} pts
                        </div>
                      </td>

                      {/* Ações */}
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setSelectedProfExtrato(item);
                            setExtratoTab('creditos');
                          }}
                          style={{ fontSize: '0.75rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                          <i className="fa-solid fa-list-check"></i> Ver Extrato
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
      </>
      )}

      {/* CONTEÚDO DA ABA 2: MONITOR DE PROGRESSÃO E RISCO DOS ALUNOS */}
      {activeMainTab === 'alunos_tracking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* CARDS DOS 3 PILARES COLETIVOS */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            
            {/* Pilar 1: Frequência Contratada */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(107, 33, 168, 0.15) 100%)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>1. Frequência Mensal Contratada (≥ 80%)</h3>
                <div className="value" style={{ color: '#c084fc', fontSize: '1.7rem', fontWeight: 900 }}>
                  {(kpis.totalAlunosNoRitmo || 0) + (kpis.totalAlunosMetaBatida || 0)}{' '}
                  <span style={{ fontSize: '0.88rem', color: '#94a3b8', fontWeight: 500 }}>de {kpis.totalAlunosAtivos || 0} no ritmo</span>
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  🟡 <strong style={{ color: '#fbbf24' }}>{kpis.totalAlunosEmRisco || 0}</strong> em risco • 🔴 <strong style={{ color: '#f87171' }}>{kpis.totalAlunosForaDaMeta || 0}</strong> críticos • {kpis.totalAlunosNeutrosFreq || 0} sem plano
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                <i className="fa-solid fa-calendar-check"></i>
              </div>
            </div>

            {/* Pilar 2: Treino Livre Semanal */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(3, 105, 161, 0.15) 100%)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>2. Treino Livre Semanal (Mín. 1x/sem)</h3>
                <div className="value" style={{ color: '#38bdf8', fontSize: '1.7rem', fontWeight: 900 }}>
                  {kpis.totalAlunosTreinoLivreOk || 0}{' '}
                  <span style={{ fontSize: '0.88rem', color: '#94a3b8', fontWeight: 500 }}>de {kpis.totalAlunosAtivos || 0} em dia</span>
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  {kpis.totalAlunosTreinoLivreFalta ? `🟡 ${kpis.totalAlunosTreinoLivreFalta} alunos com pendência de treino livre` : '100% da base em conformidade'}
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <i className="fa-solid fa-dumbbell"></i>
              </div>
            </div>

            {/* Pilar 3: Controle de Emergências */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.15) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>3. Controle de Emergências (≤ 1 no mês)</h3>
                <div className="value" style={{ color: '#34d399', fontSize: '1.7rem', fontWeight: 900 }}>
                  {kpis.totalAlunosEmergenciaOk || 0}{' '}
                  <span style={{ fontSize: '0.88rem', color: '#94a3b8', fontWeight: 500 }}>de {kpis.totalAlunosAtivos || 0} sob controle</span>
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  {kpis.totalAlunosEmergenciaExtra ? `🔴 ${kpis.totalAlunosEmergenciaExtra} aluno(s) com emergência excedente (>1)` : 'Nenhuma emergência excedente registrada'}
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
                <i className="fa-solid fa-heart-pulse"></i>
              </div>
            </div>

          </div>

          {/* PAINEL DE TABELA E FILTROS DE RISCO */}
          <div className="content-panel" style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '20px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-users-viewfinder" style={{ color: '#c084fc' }}></i> Progressão e Risco dos Alunos ({selectedMonth})
                </h2>
                <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                  Acompanhe em tempo real a evolução de cada aluno nos 3 pilares para atuação preventiva da equipe antes do fechamento do mês.
                </small>
              </div>

              {/* Busca */}
              <div style={{ width: '280px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar aluno, plano ou profissional..."
                  value={trackingSearch}
                  onChange={(e) => setTrackingSearch(e.target.value)}
                  style={{ fontSize: '0.82rem', padding: '7px 12px' }}
                />
              </div>
            </div>

            {/* Filtros Rápidos de Risco */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => setTrackingFilter('todos')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: trackingFilter === 'todos' ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                  color: trackingFilter === 'todos' ? '#0f172a' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                Todos os Alunos ({alunosTracking.length})
              </button>

              <button
                type="button"
                onClick={() => setTrackingFilter('baixo')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  background: trackingFilter === 'baixo' ? '#10b981' : 'rgba(16, 185, 129, 0.08)',
                  color: trackingFilter === 'baixo' ? '#ffffff' : '#34d399',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                🟢 Baixo Risco / No Ritmo ({alunosTracking.filter((a: any) => a.riscoGeral === 'baixo').length})
              </button>

              <button
                type="button"
                onClick={() => setTrackingFilter('medio')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  background: trackingFilter === 'medio' ? '#f59e0b' : 'rgba(245, 158, 11, 0.08)',
                  color: trackingFilter === 'medio' ? '#0f172a' : '#fbbf24',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                🟡 Médio Risco / Em Atenção ({alunosTracking.filter((a: any) => a.riscoGeral === 'medio').length})
              </button>

              <button
                type="button"
                onClick={() => setTrackingFilter('alto')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  background: trackingFilter === 'alto' ? '#ef4444' : 'rgba(239, 68, 68, 0.08)',
                  color: trackingFilter === 'alto' ? '#ffffff' : '#f87171',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                🔴 Alto Risco / Crítico ({alunosTracking.filter((a: any) => a.riscoGeral === 'alto').length})
              </button>
            </div>

            {/* TABELA DE PROGRESSÃO E RISCO */}
            {filteredTracking.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <i className="fa-solid fa-users-slash" style={{ fontSize: '2rem', marginBottom: '10px' }}></i>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>Nenhum aluno encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '12px 10px' }}>Aluno</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Plano</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Frequência (Check-ins / Meta)</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Status Frequência</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Treino Livre</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Emergências</th>
                      <th style={{ padding: '12px 10px', textAlign: 'center' }}>Risco Geral</th>
                      <th style={{ padding: '12px 10px' }}>Profissional Responsável</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTracking.map((a: any, idx: number) => {
                      let badgeFreqBg = 'rgba(148, 163, 184, 0.1)';
                      let badgeFreqColor = '#94a3b8';
                      let badgeFreqBorder = 'rgba(148, 163, 184, 0.2)';
                      let iconFreq = 'fa-circle-question';

                      if (a.statusRitmo === 'meta_batida') {
                        badgeFreqBg = 'rgba(16, 185, 129, 0.15)';
                        badgeFreqColor = '#34d399';
                        badgeFreqBorder = 'rgba(16, 185, 129, 0.3)';
                        iconFreq = 'fa-circle-check';
                      } else if (a.statusRitmo === 'no_ritmo') {
                        badgeFreqBg = 'rgba(56, 189, 248, 0.15)';
                        badgeFreqColor = '#38bdf8';
                        badgeFreqBorder = 'rgba(56, 189, 248, 0.3)';
                        iconFreq = 'fa-arrow-trend-up';
                      } else if (a.statusRitmo === 'em_risco') {
                        badgeFreqBg = 'rgba(245, 158, 11, 0.15)';
                        badgeFreqColor = '#fbbf24';
                        badgeFreqBorder = 'rgba(245, 158, 11, 0.3)';
                        iconFreq = 'fa-triangle-exclamation';
                      } else if (a.statusRitmo === 'fora_da_meta') {
                        badgeFreqBg = 'rgba(239, 68, 68, 0.15)';
                        badgeFreqColor = '#f87171';
                        badgeFreqBorder = 'rgba(239, 68, 68, 0.3)';
                        iconFreq = 'fa-circle-exclamation';
                      }

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                          
                          {/* Nome do Aluno */}
                          <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--text-main)' }}>
                            {a.nome}
                          </td>

                          {/* Plano */}
                          <td style={{ padding: '12px 10px', textAlign: 'center', color: '#94a3b8' }}>
                            {a.frequenciaContratada}
                          </td>

                          {/* Frequência (Check-ins / Meta) */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            {a.metaAulasMes > 0 ? (
                              <div>
                                <span style={{ fontWeight: 800, color: a.presencasRealizadas > 0 ? '#34d399' : '#94a3b8' }}>
                                  {a.presencasRealizadas}
                                </span>{' '}
                                <span style={{ color: '#94a3b8' }}>de {a.metaAulasMes} aulas</span>{' '}
                                <strong style={{ color: a.percentualAtual >= 80 ? '#34d399' : a.percentualAtual >= 50 ? '#fbbf24' : '#f87171', marginLeft: '4px' }}>
                                  ({a.percentualAtual}%)
                                </strong>
                              </div>
                            ) : (
                              <span style={{ color: '#64748b' }}>-</span>
                            )}
                          </td>

                          {/* Status Frequência */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: badgeFreqBg,
                                color: badgeFreqColor,
                                border: `1px solid ${badgeFreqBorder}`,
                                fontSize: '0.74rem',
                                fontWeight: 700
                              }}
                            >
                              <i className={`fa-solid ${iconFreq}`}></i> {a.statusTexto}
                            </span>
                          </td>

                          {/* Treino Livre */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: a.statusTreinoLivre === 'ok' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                                color: a.statusTreinoLivre === 'ok' ? '#38bdf8' : '#fbbf24',
                                border: `1px solid ${a.statusTreinoLivre === 'ok' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                fontSize: '0.74rem',
                                fontWeight: 700
                              }}
                            >
                              <i className={`fa-solid ${a.statusTreinoLivre === 'ok' ? 'fa-circle-check' : 'fa-clock'}`}></i> {a.treinosLivresRealizados} feito(s) ({a.statusTreinoLivre === 'ok' ? 'OK' : 'Pendente'})
                            </span>
                          </td>

                          {/* Emergências */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: a.statusEmergencia === 'ok' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                color: a.statusEmergencia === 'ok' ? '#34d399' : '#f87171',
                                border: `1px solid ${a.statusEmergencia === 'ok' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                fontSize: '0.74rem',
                                fontWeight: 700
                              }}
                            >
                              <i className={`fa-solid ${a.statusEmergencia === 'ok' ? 'fa-shield-heart' : 'fa-triangle-exclamation'}`}></i> {a.emergenciasNoMes} ({a.statusEmergencia === 'ok' ? 'OK' : 'Alerta > 1'})
                            </span>
                          </td>

                          {/* Risco Geral */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: a.riscoGeral === 'baixo' ? 'rgba(16, 185, 129, 0.15)' : a.riscoGeral === 'medio' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                color: a.riscoGeral === 'baixo' ? '#34d399' : a.riscoGeral === 'medio' ? '#fbbf24' : '#f87171',
                                border: `1px solid ${a.riscoGeral === 'baixo' ? 'rgba(16, 185, 129, 0.3)' : a.riscoGeral === 'medio' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                fontSize: '0.76rem',
                                fontWeight: 800
                              }}
                            >
                              {a.riscoGeral === 'baixo' ? '🟢 Baixo' : a.riscoGeral === 'medio' ? '🟡 Médio' : '🔴 Alto'}
                            </span>
                          </td>

                          {/* Profissional */}
                          <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>
                            {a.profissionalVinculadoNome || <span style={{ color: '#64748b' }}>Geral</span>}
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>

        </div>
      )}

      {/* CONTEÚDO DA ABA 3: EVOLUÇÃO DE EMERGÊNCIAS */}
      {activeMainTab === 'emergencias_evolucao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* 1. DIRETRIZ DA REGRA DE PONTUAÇÃO DE EMERGÊNCIA */}
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.03) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '12px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px'
            }}
          >
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '10px', borderRadius: '10px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fa-solid fa-truck-medical"></i>
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Diretriz de Pontuação Coletiva para Atendimentos de Emergência
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.45' }}>
                O objetivo clínico é a prevenção e o controle de crises. A pontuação é computada de forma coletiva entre todos os profissionais:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-circle-check"></i> <strong>≤ 1 Emergência no Mês:</strong> +3 pontos por aluno em controle (Crédito Coletivo)
                </span>
                <span style={{ fontSize: '0.8rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-circle-exclamation"></i> <strong>&gt; 1 Emergência no Mês:</strong> -4 pontos por aluno reincidente (Débito Coletivo)
                </span>
              </div>
            </div>
          </div>

          {/* 2. KPIS EXECUTIVOS DE EMERGÊNCIA */}
          <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
            
            {/* Card 1: Alunos em Controle (<= 1) */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.15) 100%)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Alunos em Controle (≤ 1 Atendimento)</h3>
                <div className="value" style={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 900 }}>
                  {resumoEmergencia.totalAlunosOk || 0}{' '}
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                    de {kpis.totalAlunosAtivos || 0} alunos
                  </span>
                </div>
                <small style={{ color: '#34d399', fontSize: '0.74rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-arrow-up"></i> +{resumoEmergencia.creditosTotal || 0} pts coletivos (+3 pts/aluno)
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                <i className="fa-solid fa-shield-heart"></i>
              </div>
            </div>

            {/* Card 2: Alunos Reincidentes (> 1) */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(185, 28, 28, 0.15) 100%)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Alunos Reincidentes (&gt; 1 Atendimento)</h3>
                <div className="value" style={{ color: '#ef4444', fontSize: '1.8rem', fontWeight: 900 }}>
                  {resumoEmergencia.totalAlunosExtra || 0}{' '}
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                    aluno(s) em alerta
                  </span>
                </div>
                <small style={{ color: '#f87171', fontSize: '0.74rem', fontWeight: 700 }}>
                  <i className="fa-solid fa-arrow-down"></i> -{resumoEmergencia.debitosTotal || 0} pts coletivos (-4 pts/aluno)
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
            </div>

            {/* Card 3: Total de Atendimentos no Mês */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(3, 105, 161, 0.15) 100%)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Total de Atendimentos no Mês</h3>
                <div className="value" style={{ color: '#38bdf8', fontSize: '1.8rem', fontWeight: 900 }}>
                  {resumoEmergencia.totalAtendimentos || 0}{' '}
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
                    sessões
                  </span>
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  Distribuídos em <strong style={{ color: '#fff' }}>{resumoEmergencia.totalAlunosComEmergencia || 0}</strong> aluno(s)
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
                <i className="fa-solid fa-kit-medical"></i>
              </div>
            </div>

            {/* Card 4: Saldo Coletivo */}
            <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(180, 83, 9, 0.15) 100%)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div className="metric-info">
                <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Saldo de Pontuação Coletiva</h3>
                <div className="value" style={{ color: (resumoEmergencia.saldoTotal || 0) >= 0 ? '#f59e0b' : '#f87171', fontSize: '1.8rem', fontWeight: 900 }}>
                  {(resumoEmergencia.saldoTotal || 0) >= 0 ? `+${resumoEmergencia.saldoTotal || 0}` : (resumoEmergencia.saldoTotal || 0)} pts
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.74rem' }}>
                  Créditos: <strong style={{ color: '#34d399' }}>+{resumoEmergencia.creditosTotal || 0}</strong> • Débitos: <strong style={{ color: '#f87171' }}>-{resumoEmergencia.debitosTotal || 0}</strong>
                </small>
              </div>
              <div className="metric-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                <i className="fa-solid fa-scale-balanced"></i>
              </div>
            </div>

          </div>

          {/* 3. HISTÓRICO & TENDÊNCIA DOS ÚLTIMOS 6 MESES */}
          <div className="card" style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '14px', background: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-chart-line" style={{ color: '#38bdf8' }}></i> Evolução Histórica (Últimos 6 Meses)
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Acompanhamento mês a mês do volume de atendimentos de emergência e pontuação coletiva apurada
                </p>
              </div>

              {/* Seletor de Modo: Cards ou Tabela */}
              <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  onClick={() => setEmergenciaVisualMode('cards')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: emergenciaVisualMode === 'cards' ? '#38bdf8' : 'transparent',
                    color: emergenciaVisualMode === 'cards' ? '#0f172a' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-grip"></i> Cards
                </button>
                <button
                  type="button"
                  onClick={() => setEmergenciaVisualMode('tabela')}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: emergenciaVisualMode === 'tabela' ? '#38bdf8' : 'transparent',
                    color: emergenciaVisualMode === 'tabela' ? '#0f172a' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  <i className="fa-solid fa-table-list"></i> Tabela
                </button>
              </div>
            </div>

            {/* MODO CARDS HISTÓRICOS */}
            {emergenciaVisualMode === 'cards' ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                {historicoMensal.map((m: any) => {
                  const isSelected = m.mes === selectedMonth;
                  return (
                    <div
                      key={m.mes}
                      onClick={() => setSelectedMonth(m.mes)}
                      style={{
                        background: isSelected
                          ? 'linear-gradient(180deg, rgba(56, 189, 248, 0.12) 0%, rgba(3, 105, 161, 0.05) 100%)'
                          : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isSelected ? '#38bdf8' : 'var(--border-color)'}`,
                        borderRadius: '12px',
                        padding: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isSelected ? '#38bdf8' : 'var(--text-main)' }}>
                          {m.nomeMes}
                        </span>
                        {isSelected && (
                          <span style={{ fontSize: '0.68rem', padding: '2px 6px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 800 }}>
                            Selecionado
                          </span>
                        )}
                      </div>

                      <div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: m.totalAtendimentos > 0 ? '#f87171' : '#34d399' }}>
                          {m.totalAtendimentos}{' '}
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>atendimentos</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                          {m.totalAlunosComEmergencia} aluno(s) • {m.alunosReincidentes} reincidente(s)
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                        <span style={{ color: '#94a3b8' }}>Saldo:</span>
                        <strong style={{ color: m.saldo >= 0 ? '#34d399' : '#f87171', fontWeight: 800 }}>
                          {m.saldo >= 0 ? `+${m.saldo}` : m.saldo} pts
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* MODO TABELA HISTÓRICA */
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '10px' }}>Mês</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Total Atendimentos</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Alunos Atendidos</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Em Controle (≤ 1)</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Reincidentes (&gt; 1)</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Créditos (+)</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Débitos (-)</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Saldo Líquido</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoMensal.map((m: any) => {
                      const isSelected = m.mes === selectedMonth;
                      return (
                        <tr
                          key={m.mes}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: isSelected ? 'rgba(56, 189, 248, 0.05)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '12px 10px', fontWeight: isSelected ? 800 : 600, color: isSelected ? '#38bdf8' : 'var(--text-main)' }}>
                            {m.nomeMes} {isSelected ? '(Ativo)' : ''}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700, color: m.totalAtendimentos > 0 ? '#f87171' : '#34d399' }}>
                            {m.totalAtendimentos}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', color: '#cbd5e1' }}>
                            {m.totalAlunosComEmergencia}
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', color: '#34d399', fontWeight: 600 }}>
                            {m.alunosOk} alunos
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center', color: m.alunosReincidentes > 0 ? '#f87171' : '#94a3b8', fontWeight: 600 }}>
                            {m.alunosReincidentes} alunos
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: '#34d399', fontWeight: 700 }}>
                            +{m.creditos} pts
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', color: '#f87171', fontWeight: 700 }}>
                            -{m.debitos} pts
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 800, color: m.saldo >= 0 ? '#34d399' : '#f87171' }}>
                            {m.saldo >= 0 ? `+${m.saldo}` : m.saldo} pts
                          </td>
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setSelectedMonth(m.mes)}
                              disabled={isSelected}
                              style={{ padding: '3px 8px', fontSize: '0.74rem' }}
                            >
                              {isSelected ? 'Selecionado' : 'Ver Mês'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. ALUNOS COM ATENDIMENTOS DE EMERGÊNCIA NO MÊS SELECIONADO */}
          <div className="card" style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '14px', background: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-users" style={{ color: '#ef4444' }}></i> Alunos com Emergência no Mês ({filteredAlunosEmergencia.length})
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                  Detalhamento de cada aluno atendido em emergência em <strong style={{ color: '#fff' }}>{selectedMonth}</strong> e seu status de conformidade
                </p>
              </div>

              {/* Filtros e Busca */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {/* Filtro Status */}
                <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <button
                    type="button"
                    onClick={() => setEmergenciaFilter('todos')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: emergenciaFilter === 'todos' ? 'rgba(255,255,255,0.15)' : 'transparent',
                      color: emergenciaFilter === 'todos' ? '#fff' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    Todos ({alunosComEmergencia.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmergenciaFilter('reincidentes')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: emergenciaFilter === 'reincidentes' ? 'rgba(239, 68, 68, 0.25)' : 'transparent',
                      color: emergenciaFilter === 'reincidentes' ? '#f87171' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    Reincidentes &gt;1 ({alunosComEmergencia.filter(a => a.status === 'reincidente').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmergenciaFilter('ok')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: 'none',
                      background: emergenciaFilter === 'ok' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                      color: emergenciaFilter === 'ok' ? '#34d399' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    Controle 1x ({alunosComEmergencia.filter(a => a.status === 'ok').length})
                  </button>
                </div>

                {/* Campo de Busca */}
                <div style={{ position: 'relative' }}>
                  <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b', fontSize: '0.8rem' }}></i>
                  <input
                    type="text"
                    placeholder="Buscar aluno ou profissional..."
                    value={emergenciaSearch}
                    onChange={(e) => setEmergenciaSearch(e.target.value)}
                    style={{
                      padding: '5px 12px 5px 30px',
                      fontSize: '0.82rem',
                      borderRadius: '8px',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-main)',
                      width: '210px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* TABELA DE ALUNOS COM EMERGÊNCIA */}
            {filteredAlunosEmergencia.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: '#94a3b8' }}>
                <i className="fa-solid fa-shield-heart" style={{ fontSize: '2.5rem', color: '#10b981', marginBottom: '12px' }}></i>
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-main)', fontSize: '1rem', fontWeight: 700 }}>
                  Nenhum registro de emergência encontrado
                </h4>
                <p style={{ margin: 0, fontSize: '0.82rem' }}>
                  {alunosComEmergencia.length === 0
                    ? `Excelente! Nenhum aluno necessitou de atendimento de emergência no mês de ${selectedMonth}. Todos estão em controle preventivo pleno.`
                    : 'Nenhum aluno corresponde aos filtros selecionados acima.'}
                </p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '10px' }}>Aluno</th>
                      <th style={{ padding: '10px' }}>Profissional Responsável</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Qtd. Emergências</th>
                      <th style={{ padding: '10px' }}>Datas dos Atendimentos</th>
                      <th style={{ padding: '10px' }}>Profissionais Atendentes</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Status de Risco</th>
                      <th style={{ padding: '10px', textAlign: 'right' }}>Impacto Coletivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAlunosEmergencia.map((a: any) => {
                      const isReincidente = a.status === 'reincidente';
                      return (
                        <tr
                          key={a.clientId}
                          style={{
                            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                            background: isReincidente ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                          }}
                        >
                          {/* Aluno */}
                          <td style={{ padding: '12px 10px' }}>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.88rem' }}>{a.nome}</strong>
                          </td>

                          {/* Profissional Vinculado */}
                          <td style={{ padding: '12px 10px', color: '#cbd5e1' }}>
                            {a.profissionalVinculadoNome || <span style={{ color: '#64748b' }}>Geral</span>}
                          </td>

                          {/* Qtd. Emergências */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontWeight: 900,
                                fontSize: '0.85rem',
                                background: isReincidente ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                color: isReincidente ? '#f87171' : '#34d399',
                                border: `1px solid ${isReincidente ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                              }}
                            >
                              {a.totalEmergencias}x
                            </span>
                          </td>

                          {/* Datas dos Atendimentos */}
                          <td style={{ padding: '12px 10px', color: '#cbd5e1', fontSize: '0.8rem' }}>
                            {a.datasFormatadas || '-'}
                          </td>

                          {/* Profissionais Atendentes */}
                          <td style={{ padding: '12px 10px', color: '#cbd5e1', fontSize: '0.8rem' }}>
                            {a.profissionaisAtendentes || '-'}
                          </td>

                          {/* Status de Risco */}
                          <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: isReincidente ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                color: isReincidente ? '#f87171' : '#34d399',
                                border: `1px solid ${isReincidente ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                                fontSize: '0.76rem',
                                fontWeight: 800
                              }}
                            >
                              <i className={`fa-solid ${isReincidente ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}></i>
                              {isReincidente ? 'Reincidente (> 1)' : 'Controle (1x)'}
                            </span>
                          </td>

                          {/* Impacto Coletivo */}
                          <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                            <span
                              style={{
                                fontWeight: 900,
                                fontSize: '0.88rem',
                                color: isReincidente ? '#f87171' : '#34d399'
                              }}
                            >
                              {isReincidente ? '-4 pts' : '+3 pts'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. REGISTRO CRONOLÓGICO DE ATENDIMENTOS DE EMERGÊNCIA */}
          {atendimentosDetalhados.length > 0 && (
            <div className="card" style={{ padding: '20px', border: '1px solid var(--border-color)', borderRadius: '14px', background: 'var(--card-bg)' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-clipboard-list" style={{ color: '#f59e0b' }}></i> Registro Detalhado dos Atendimentos ({atendimentosDetalhados.length})
              </h3>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Histórico cronológico de cada sessão de emergência realizada em <strong style={{ color: '#fff' }}>{selectedMonth}</strong> com o desfecho clínico
              </p>

              <div className="table-responsive" style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '10px' }}>Data & Horário</th>
                      <th style={{ padding: '10px' }}>Aluno</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Conduta Escolhida</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atendimentosDetalhados.map((at: any) => (
                      <tr key={at.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '10px', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                          <i className="fa-regular fa-calendar" style={{ color: '#38bdf8', marginRight: '5px' }}></i> {at.data} {at.horario ? `às ${at.horario}` : ''}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 600, color: '#cbd5e1' }}>
                          {at.clienteNome}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {at.conduta === 'alta' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#34d399',
                                border: '1px solid rgba(16, 185, 129, 0.3)'
                              }}
                            >
                              <i className="fa-solid fa-circle-check"></i> Alta
                            </span>
                          ) : at.conduta === 'novo_agendamento' ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3px 10px',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#fbbf24',
                                border: '1px solid rgba(245, 158, 11, 0.3)'
                              }}
                            >
                              <i className="fa-solid fa-calendar-plus"></i> Novo Agendamento
                            </span>
                          ) : (
                            <span style={{ color: '#64748b', fontSize: '0.85rem' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background:
                                at.status === 'presenca'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : at.status === 'falta'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(56, 189, 248, 0.15)',
                              color:
                                at.status === 'presenca'
                                  ? '#34d399'
                                  : at.status === 'falta'
                                  ? '#f87171'
                                  : '#38bdf8'
                            }}
                          >
                            {at.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 5. MODAL DE EXTRATO DETALHADO */}
      {selectedProfExtrato && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setSelectedProfExtrato(null)}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '840px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  Extrato de Pontuação: {selectedProfExtrato.prof.nome}
                </h3>
                <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                  Período: {selectedMonth} • Saldo Líquido: <strong style={{ color: selectedProfExtrato.pontosLiquidos >= 0 ? '#34d399' : '#f87171' }}>{selectedProfExtrato.pontosLiquidos} pts</strong>
                </small>
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSelectedProfExtrato(null)}
                style={{ padding: '4px 10px' }}
              >
                <i className="fa-solid fa-xmark"></i> Fechar
              </button>
            </div>

            {/* Abas do Extrato */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 20px', background: 'rgba(255,255,255,0.01)' }}>
              <button
                type="button"
                onClick={() => setExtratoTab('creditos')}
                style={{
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: extratoTab === 'creditos' ? '2px solid #10b981' : '2px solid transparent',
                  color: extratoTab === 'creditos' ? '#34d399' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-circle-plus"></i> Créditos Recebidos (+{selectedProfExtrato.creditosIndividuais + selectedProfExtrato.creditosColetivos} pts)
              </button>

              <button
                type="button"
                onClick={() => setExtratoTab('debitos')}
                style={{
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: extratoTab === 'debitos' ? '2px solid #ef4444' : '2px solid transparent',
                  color: extratoTab === 'debitos' ? '#f87171' : '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <i className="fa-solid fa-circle-minus"></i> Penalidades & Débitos (-{selectedProfExtrato.debitosIndividuais + selectedProfExtrato.debitosColetivos} pts)
              </button>
            </div>

            {/* Conteúdo do Extrato */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: '1 1 auto' }}>
              {extratoTab === 'creditos' ? (
                selectedProfExtrato.extratoCreditos?.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', margin: '20px 0', fontSize: '0.88rem' }}>Nenhum crédito de pontos registrado para este profissional no mês.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedProfExtrato.extratoCreditos.map((c: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(16, 185, 129, 0.05)',
                          border: '1px solid rgba(16, 185, 129, 0.15)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.86rem' }}>
                            {c.tipo} • {c.alunoNome}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                            {c.descricao} {c.tempoGasto ? `• Tempo gasto: ${c.tempoGasto}` : ''}
                          </div>
                        </div>
                        <span style={{ fontWeight: 900, color: '#34d399', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                          +{c.pontos} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                selectedProfExtrato.extratoDebitos?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#34d399' }}>
                    <i className="fa-solid fa-circle-check" style={{ fontSize: '2rem', marginBottom: '8px' }}></i>
                    <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600 }}>Parabéns! Nenhuma penalidade ou débito aplicado a este profissional neste período.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedProfExtrato.extratoDebitos.map((d: any, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(239, 68, 68, 0.05)',
                          border: '1px solid rgba(239, 68, 68, 0.15)',
                          borderRadius: '8px',
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '12px'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#f87171', fontSize: '0.86rem' }}>
                            {d.tipo} • {d.alunoNome}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '2px' }}>
                            {d.motivo}
                          </div>
                        </div>
                        <span style={{ fontWeight: 900, color: '#f87171', fontSize: '0.95rem', whiteSpace: 'nowrap' }}>
                          -{d.pontosDebito} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {/* Footer Modal */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', textAlign: 'right' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setSelectedProfExtrato(null)}
              >
                Concluir Visualização
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
