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

  // Tracking de Alunos
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingFilter, setTrackingFilter] = useState<'todos' | 'no_ritmo' | 'em_risco' | 'fora_da_meta' | 'meta_batida'>('todos');
  const [trackingSearch, setTrackingSearch] = useState('');

  const rankingList = data?.ranking || [];
  const kpis = data?.kpis || {};
  const alunosTracking: any[] = data?.alunosTracking || [];

  const filteredRanking = rankingList.filter((item: any) => {
    const nome = (item.prof?.nome || '').toLowerCase();
    const esp = (item.prof?.especialidade || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return nome.includes(q) || esp.includes(q);
  });

  const filteredTracking = alunosTracking.filter((a: any) => {
    const matchesFilter =
      trackingFilter === 'todos' ||
      (trackingFilter === 'no_ritmo' && (a.statusRitmo === 'no_ritmo' || a.statusRitmo === 'meta_batida')) ||
      (trackingFilter === 'em_risco' && a.statusRitmo === 'em_risco') ||
      (trackingFilter === 'fora_da_meta' && a.statusRitmo === 'fora_da_meta') ||
      (trackingFilter === 'meta_batida' && a.statusRitmo === 'meta_batida');

    const q = trackingSearch.toLowerCase();
    const matchesSearch =
      (a.nome || '').toLowerCase().includes(q) ||
      (a.profissionalVinculadoNome || '').toLowerCase().includes(q) ||
      (a.frequenciaContratada || '').toLowerCase().includes(q);

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

      {/* BANNER DE STATUS DO MÊS: EM ANDAMENTO VS CONSOLIDADO */}
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
                ? `Mês em Andamento • Dia ${kpis.diaAtualMes} de ${kpis.diasTotalMes} (${kpis.percentualMesDecorrido}% do mês decorrido)`
                : `Mês Encerrado • Fechamento Consolidado Oficial (${selectedMonth})`}
            </strong>
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', marginTop: '2px' }}>
              {kpis.isMesEmAndamento
                ? 'Acompanhamento em tempo real: créditos são somados imediatamente e débitos de fechamento mensal serão apurados ao término do mês.'
                : 'Pontuação final apurada com todos os créditos de produção e débitos de fechamento mensal aplicados.'}
            </div>
          </div>
        </div>

        {kpis.isMesEmAndamento && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setShowTrackingModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
          >
            <i className="fa-solid fa-users-viewfinder"></i> Monitor de Ritmo dos Alunos ({alunosTracking.length})
          </button>
        )}
      </div>

      {/* 2. KPIS EXECUTIVOS */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
        
        {/* Card 1: Pontuação Total da Clínica */}
        <div className="metric-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(180, 83, 9, 0.15) 100%)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div className="metric-info">
            <h3 style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Saldo Total de Pontos da Equipe</h3>
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
              Créditos de Produção e Débitos de Conformidade
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

      {/* 3. REGRAS DO SCORECARD (GUIA RÁPIDO) */}
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
              <li>Aluno com frequência mensal ≥ 80%: <strong style={{ color: '#34d399' }}>+5 pts/aluno</strong> (todos os profissionais)</li>
              <li>Aluno com mín. 1 Treino Livre na semana: <strong style={{ color: '#34d399' }}>+2 pts/aluno</strong> (todos os profissionais)</li>
              <li>Aluno com no máx. 1 emergência no mês: <strong style={{ color: '#34d399' }}>+3 pts/aluno</strong> (todos os profissionais)</li>
            </ul>
          </div>

          {/* Débitos */}
          <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '10px 14px' }}>
            <div style={{ fontWeight: 800, color: '#f87171', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-circle-minus"></i> Critérios que Debitam Pontos (-)
            </div>
            <ul style={{ margin: 0, paddingLeft: '16px', color: '#cbd5e1', lineHeight: '1.6' }}>
              <li>Avaliação/Teste/Relatório sem Ficha após 24h: <strong style={{ color: '#f87171' }}>-2 pts</strong></li>
              <li>Aluno ativo com frequência mensal &lt; 80%: <strong style={{ color: '#f87171' }}>-5 pts/aluno</strong> (todos os profissionais)</li>
              <li>Avaliação ou Ficha vencida há &gt; 2 meses: <strong style={{ color: '#f87171' }}>-10 pts</strong> (profissional vinculado)</li>
              <li>Aluno sem o mín. de 1 Treino Livre na semana: <strong style={{ color: '#f87171' }}>-2 pts/aluno</strong> (todos os profissionais)</li>
              <li>Aluno com &gt; 1 emergência no mês: <strong style={{ color: '#f87171' }}>-4 pts/aluno</strong> (todos os profissionais)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 4. TABELA DE RANKING DOS PROFISSIONAIS */}
      <div className="content-panel" style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-ranking-star" style={{ color: '#f59e0b' }}></i> Ranking Geral dos Profissionais ({selectedMonth})
            </h2>
            <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
              Classificação por saldo líquido de pontuação obtido no período.
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

      {/* 6. MODAL DO MONITOR DE RITMO DOS ALUNOS */}
      {showTrackingModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '100%',
              maxWidth: '950px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
          >
            {/* Header Modal */}
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-users-viewfinder" style={{ color: '#38bdf8' }}></i> Acompanhamento de Ritmo dos Alunos ({selectedMonth})
                </h3>
                <small style={{ color: '#94a3b8', fontSize: '0.78rem' }}>
                  Progresso do mês: Dia {kpis.diaAtualMes} de {kpis.diasTotalMes} ({kpis.percentualMesDecorrido}% decorrido) • Identifique quem precisa de reposição antes do fechamento
                </small>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setShowTrackingModal(false)}
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Filtros e Busca */}
            <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setTrackingFilter('todos')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: trackingFilter === 'todos' ? '#38bdf8' : 'rgba(255,255,255,0.05)',
                    color: trackingFilter === 'todos' ? '#0f172a' : '#94a3b8',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  Todos ({alunosTracking.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingFilter('no_ritmo')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    background: trackingFilter === 'no_ritmo' ? '#10b981' : 'rgba(16, 185, 129, 0.08)',
                    color: trackingFilter === 'no_ritmo' ? '#ffffff' : '#34d399',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  No Ritmo / Meta Batida ({(kpis.totalAlunosNoRitmo || 0) + (kpis.totalAlunosMetaBatida || 0)})
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingFilter('em_risco')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    background: trackingFilter === 'em_risco' ? '#f59e0b' : 'rgba(245, 158, 11, 0.08)',
                    color: trackingFilter === 'em_risco' ? '#0f172a' : '#fbbf24',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  Em Risco ({kpis.totalAlunosEmRisco || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTrackingFilter('fora_da_meta')}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    background: trackingFilter === 'fora_da_meta' ? '#ef4444' : 'rgba(239, 68, 68, 0.08)',
                    color: trackingFilter === 'fora_da_meta' ? '#ffffff' : '#f87171',
                    fontWeight: 700,
                    fontSize: '0.76rem',
                    cursor: 'pointer'
                  }}
                >
                  Crítico / Fora da Meta ({kpis.totalAlunosForaDaMeta || 0})
                </button>
              </div>

              <div style={{ width: '240px' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar aluno ou profissional..."
                  value={trackingSearch}
                  onChange={(e) => setTrackingSearch(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                />
              </div>
            </div>

            {/* Tabela de Alunos */}
            <div style={{ padding: '16px 24px', overflowY: 'auto', flex: '1 1 auto' }}>
              {filteredTracking.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  <i className="fa-solid fa-users-slash" style={{ fontSize: '2rem', marginBottom: '8px' }}></i>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>Nenhum aluno encontrado para os filtros selecionados.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)', textAlign: 'left', color: '#94a3b8' }}>
                        <th style={{ padding: '10px 8px' }}>Aluno</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Plano</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Meta Mês</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Presenças</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Esperado Hoje</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>% Atual</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center' }}>Status do Ritmo</th>
                        <th style={{ padding: '10px 8px' }}>Profissional Responsável</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTracking.map((a: any, idx: number) => {
                        let badgeBg = 'rgba(148, 163, 184, 0.1)';
                        let badgeColor = '#94a3b8';
                        let badgeBorder = 'rgba(148, 163, 184, 0.2)';
                        let icon = 'fa-circle-question';

                        if (a.statusRitmo === 'meta_batida') {
                          badgeBg = 'rgba(16, 185, 129, 0.15)';
                          badgeColor = '#34d399';
                          badgeBorder = 'rgba(16, 185, 129, 0.3)';
                          icon = 'fa-circle-check';
                        } else if (a.statusRitmo === 'no_ritmo') {
                          badgeBg = 'rgba(56, 189, 248, 0.15)';
                          badgeColor = '#38bdf8';
                          badgeBorder = 'rgba(56, 189, 248, 0.3)';
                          icon = 'fa-arrow-trend-up';
                        } else if (a.statusRitmo === 'em_risco') {
                          badgeBg = 'rgba(245, 158, 11, 0.15)';
                          badgeColor = '#fbbf24';
                          badgeBorder = 'rgba(245, 158, 11, 0.3)';
                          icon = 'fa-triangle-exclamation';
                        } else if (a.statusRitmo === 'fora_da_meta') {
                          badgeBg = 'rgba(239, 68, 68, 0.15)';
                          badgeColor = '#f87171';
                          badgeBorder = 'rgba(239, 68, 68, 0.3)';
                          icon = 'fa-circle-exclamation';
                        }

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '10px 8px', fontWeight: 600, color: 'var(--text-main)' }}>
                              {a.nome}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', color: '#94a3b8' }}>
                              {a.frequenciaContratada}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: 'var(--text-main)' }}>
                              {a.metaAulasMes > 0 ? `${a.metaAulasMes} aulas` : '-'}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, color: a.presencasRealizadas > 0 ? '#34d399' : '#94a3b8' }}>
                              {a.presencasRealizadas}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', color: '#94a3b8' }}>
                              {a.esperadoAteHoje > 0 ? `${a.esperadoAteHoje}` : '-'}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: a.percentualAtual >= 80 ? '#34d399' : a.percentualAtual >= 50 ? '#fbbf24' : '#f87171' }}>
                              {a.metaAulasMes > 0 ? `${a.percentualAtual}%` : '-'}
                            </td>
                            <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: badgeBg,
                                  color: badgeColor,
                                  border: `1px solid ${badgeBorder}`,
                                  fontSize: '0.74rem',
                                  fontWeight: 700
                                }}
                              >
                                <i className={`fa-solid ${icon}`}></i> {a.statusTexto}
                              </span>
                            </td>
                            <td style={{ padding: '10px 8px', color: '#cbd5e1' }}>
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

            {/* Footer Modal */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Exibindo {filteredTracking.length} de {alunosTracking.length} alunos
              </span>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowTrackingModal(false)}
              >
                Fechar Monitor
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
