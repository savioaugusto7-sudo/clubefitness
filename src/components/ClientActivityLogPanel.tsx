'use client';

import React, { useState, useEffect, useCallback } from 'react';
import SmartSearchInput from './SmartSearchInput';

interface ClientActivityLogPanelProps {
  professionalActivityLogs?: any[];
  onOpenClientProfile?: (clientId: string) => void;
}

export default function ClientActivityLogPanel({
  professionalActivityLogs = [],
  onOpenClientProfile
}: ClientActivityLogPanelProps) {
  // Aba ativa: 'clientes' ou 'profissionais'
  const [activeSubTab, setActiveSubTab] = useState<'clientes' | 'profissionais'>('clientes');

  // Estados de Filtro para Clientes
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(20);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const [search, setSearch] = useState<string>('');
  const [tipoAcao, setTipoAcao] = useState<string>('todos');
  const [periodo, setPeriodo] = useState<string>('hoje');

  // KPIs
  const [kpis, setKpis] = useState({
    totalHoje: 0,
    agendouHoje: 0,
    cancelouHoje: 0,
    checkinHoje: 0,
    alunosAtivosHoje: 0,
    taxaDesistenciaHoje: 0,
    cancelamentosUltimaHora: 0
  });

  // Busca dos logs de movimentação de clientes
  const fetchClientLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        tipoAcao,
        periodo,
        search
      });

      const res = await fetch(`/api/admin/client-activity-logs?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setLogs(json.data || []);
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages || 1);
          setTotalCount(json.pagination.total || 0);
        }
        if (json.kpis) {
          setKpis(json.kpis);
        }
      } else {
        setError(json.error || 'Erro ao carregar movimentações');
      }
    } catch (err: any) {
      console.error('Erro na requisição de logs de clientes:', err);
      setError('Falha na comunicação com o servidor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, tipoAcao, periodo, search]);

  useEffect(() => {
    fetchClientLogs();
  }, [fetchClientLogs]);

  // Handler para resetar página ao mudar filtros
  const handleFilterChange = (setter: (val: any) => void, val: any) => {
    setter(val);
    setPage(1);
  };

  // Helper para renderizar badge de ação
  const renderAcaoBadge = (log: any) => {
    switch (log.tipoAcao) {
      case 'agendou':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 800
          }}>
            <i className="fa-solid fa-calendar-plus"></i> Agendou
          </span>
        );
      case 'cancelou':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 800
          }}>
            <i className="fa-solid fa-calendar-xmark"></i> Cancelou
          </span>
        );
      case 'checkin':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(2, 132, 199, 0.15)',
            color: '#38bdf8',
            border: '1px solid rgba(2, 132, 199, 0.3)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 800
          }}>
            <i className="fa-solid fa-circle-check"></i> Check-in
          </span>
        );
      case 'wellness':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(139, 92, 246, 0.15)',
            color: '#c084fc',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 800
          }}>
            <i className="fa-solid fa-heart-pulse"></i> Wellness
          </span>
        );
      case 'trancamento':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#22d3ee',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            padding: '4px 10px',
            borderRadius: '8px',
            fontSize: '0.78rem',
            fontWeight: 800
          }}>
            <i className="fa-solid fa-snowflake"></i> Trancamento
          </span>
        );
      default:
        return (
          <span className="badge badge-secondary" style={{ fontSize: '0.78rem', fontWeight: 700 }}>
            {log.acao || 'Ação'}
          </span>
        );
    }
  };

  // Helper para formatar data e horário
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return { date: '-', time: '-' };
    const d = new Date(dateStr);
    const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return { date, time };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* 1. Header & Seletor de Modo (Abas Internas) */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '18px 24px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(16, 185, 129, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}>
              <i className="fa-solid fa-shield-halved" style={{ color: '#38bdf8', fontSize: '1.2rem' }}></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                Central de Auditoria & Logs do Sistema
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                Acompanhamento em tempo real de movimentações de alunos e ações da equipe técnica.
              </p>
            </div>
          </div>
        </div>

        {/* Abas Superiores de Alternância */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.6)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <button
            type="button"
            onClick={() => setActiveSubTab('clientes')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'clientes' ? '#0284c7' : 'transparent',
              color: activeSubTab === 'clientes' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <i className="fa-solid fa-users"></i>
            Movimentações de Alunos
            <span style={{
              background: activeSubTab === 'clientes' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '0.72rem'
            }}>
              {kpis.totalHoje} hoje
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('profissionais')}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              background: activeSubTab === 'profissionais' ? '#10b981' : 'transparent',
              color: activeSubTab === 'profissionais' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <i className="fa-solid fa-user-doctor"></i>
            Ações de Profissionais
            <span style={{
              background: activeSubTab === 'profissionais' ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)',
              padding: '2px 7px',
              borderRadius: '10px',
              fontSize: '0.72rem'
            }}>
              {professionalActivityLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: MOVIMENTAÇÕES DE ALUNOS (FOCO PRINCIPAL)                           */}
      {/* ========================================================================= */}
      {activeSubTab === 'clientes' && (
        <>
          {/* Cards de KPIs Rápidos */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '14px'
          }}>
            {/* KPI 1: Movimentações Hoje */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '4px solid #0284c7',
              borderRadius: '12px',
              padding: '14px 18px'
            }}>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                Movimentações Hoje
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f8fafc', margin: '4px 0 2px' }}>
                {kpis.totalHoje}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#38bdf8' }}>
                {kpis.alunosAtivosHoje} alunos interagiram hoje
              </div>
            </div>

            {/* KPI 2: Agendamentos Hoje */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '4px solid #10b981',
              borderRadius: '12px',
              padding: '14px 18px'
            }}>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                Agendamentos Hoje
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#10b981', margin: '4px 0 2px' }}>
                {kpis.agendouHoje}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                Sessões marcadas na agenda
              </div>
            </div>

            {/* KPI 3: Cancelamentos Hoje */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '4px solid #ef4444',
              borderRadius: '12px',
              padding: '14px 18px'
            }}>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                Cancelamentos Hoje
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ef4444', margin: '4px 0 2px' }}>
                {kpis.cancelouHoje}
              </div>
              <div style={{ fontSize: '0.74rem', color: '#fca5a5' }}>
                Taxa de desistência: {kpis.taxaDesistenciaHoje}%
              </div>
            </div>

            {/* KPI 4: Cancelamentos Última Hora (< 2h) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '4px solid #f59e0b',
              borderRadius: '12px',
              padding: '14px 18px'
            }}>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                Cancelamentos &lt; 2h
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f59e0b', margin: '4px 0 2px' }}>
                {kpis.cancelamentosUltimaHora}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                Horários vagos sem tempo de reposição
              </div>
            </div>

            {/* KPI 5: Check-in Hoje */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderLeft: '4px solid #8b5cf6',
              borderRadius: '12px',
              padding: '14px 18px'
            }}>
              <div style={{ fontSize: '0.74rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>
                Presenças / Check-in
              </div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#a78bfa', margin: '4px 0 2px' }}>
                {kpis.checkinHoje}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                Validações de frequência
              </div>
            </div>
          </div>

          {/* Barra de Filtros e Busca */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '14px 18px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '280px' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <SmartSearchInput
                  value={search}
                  onChange={val => handleFilterChange(setSearch, val)}
                  placeholder="Buscar por nome do aluno, telefone ou ação..."
                  resultCount={logs.length}
                  totalCount={totalCount}
                />
              </div>

              {/* Seletor de Tipo de Ação */}
              <select
                className="form-control"
                value={tipoAcao}
                onChange={e => handleFilterChange(setTipoAcao, e.target.value)}
                style={{
                  width: 'auto',
                  minWidth: '150px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                <option value="todos">Todas as Ações</option>
                <option value="agendou">🟢 Apenas Agendamentos</option>
                <option value="cancelou">🔴 Apenas Cancelamentos</option>
                <option value="checkin">🔵 Apenas Check-ins</option>
                <option value="wellness">📋 Apenas Wellness</option>
                <option value="trancamento">❄️ Apenas Trancamentos</option>
              </select>

              {/* Seletor de Período */}
              <select
                className="form-control"
                value={periodo}
                onChange={e => handleFilterChange(setPeriodo, e.target.value)}
                style={{
                  width: 'auto',
                  minWidth: '130px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  color: '#f8fafc',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                <option value="hoje">Hoje</option>
                <option value="ontem">Ontem</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="mes_atual">Este Mês</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="todos">Todo o Histórico</option>
              </select>
            </div>

            {/* Botão Atualizar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => fetchClientLogs(true)}
                disabled={loading || refreshing}
                className="btn btn-secondary btn-sm"
                style={{
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className={`fa-solid fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`}></i>
                Atualizar
              </button>
            </div>
          </div>

          {/* Tabela de Movimentações */}
          <div className="content-panel" style={{ padding: 0, overflow: 'hidden', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div className="table-responsive">
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                    <th style={{ width: '130px' }}>Data / Hora</th>
                    <th style={{ width: '220px' }}>Aluno</th>
                    <th style={{ width: '140px' }}>Ação</th>
                    <th>Detalhes da Movimentação</th>
                    <th style={{ width: '160px' }}>Origem / Dispositivo</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', marginBottom: '8px', display: 'block', color: '#0284c7' }}></i>
                        Carregando movimentações dos alunos...
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#ef4444' }}>
                        <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '6px' }}></i>
                        {error}
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-dim)' }}>
                        <i className="fa-regular fa-clipboard" style={{ fontSize: '2rem', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
                        Nenhuma movimentação de aluno registrada com os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    logs.map(log => {
                      const dt = formatDateTime(log.createdAt);
                      const client = log.clienteId;
                      const nomeAluno = client?.dadosPessoais?.nome || 'Aluno não identificado';
                      const telefoneAluno = client?.dadosPessoais?.telefone || '';
                      const isUltimaHora = log.metadata?.isUltimaHora || false;

                      return (
                        <tr key={log._id} style={{
                          background: isUltimaHora ? 'rgba(239, 68, 68, 0.04)' : undefined,
                          transition: 'background 0.15s'
                        }}>
                          {/* 1. Data e Horário */}
                          <td>
                            <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.85rem' }}>
                              {dt.time}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                              {dt.date}
                            </div>
                          </td>

                          {/* 2. Aluno com Foto/Avatar */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, #0284c7, #10b981)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                flexShrink: 0
                              }}>
                                {nomeAluno.charAt(0).toUpperCase()}
                              </div>
                              <div style={{ overflow: 'hidden' }}>
                                <div
                                  onClick={() => client?._id && onOpenClientProfile && onOpenClientProfile(client._id)}
                                  style={{
                                    fontWeight: 700,
                                    color: '#f8fafc',
                                    fontSize: '0.86rem',
                                    cursor: onOpenClientProfile ? 'pointer' : 'default',
                                    textDecoration: onOpenClientProfile ? 'underline' : 'none'
                                  }}
                                  title={nomeAluno}
                                >
                                  {nomeAluno}
                                </div>
                                {telefoneAluno && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                                    {telefoneAluno}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 3. Ação */}
                          <td>
                            {renderAcaoBadge(log)}
                          </td>

                          {/* 4. Detalhes com Destaques */}
                          <td>
                            <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600 }}>
                              {log.detalhes}
                            </div>
                            {isUltimaHora && (
                              <div style={{ marginTop: '4px' }}>
                                <span style={{
                                  background: 'rgba(239, 68, 68, 0.2)',
                                  color: '#f87171',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  border: '1px solid rgba(239, 68, 68, 0.4)'
                                }}>
                                  <i className="fa-solid fa-triangle-exclamation"></i>
                                  Cancelamento Crítico (&lt; 2h de antecedência)
                                </span>
                              </div>
                            )}
                            {log.metadata?.motivoCancelamento && !isUltimaHora && (
                              <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px', fontStyle: 'italic' }}>
                                Justificativa: &ldquo;{log.metadata.motivoCancelamento}&rdquo;
                              </div>
                            )}
                          </td>

                          {/* 5. Origem & Dispositivo */}
                          <td>
                            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className={log.dispositivo?.includes('Mobile') || log.dispositivo?.includes('iPhone') || log.dispositivo?.includes('Android') ? 'fa-solid fa-mobile-screen' : 'fa-solid fa-desktop'}></i>
                              {log.dispositivo || 'Computador'}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                              {log.origem || 'Portal Web'}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                background: 'rgba(15, 23, 42, 0.4)',
                fontSize: '0.82rem',
                color: 'var(--text-dim)'
              }}>
                <div>
                  Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalCount} registros no total)
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: '6px', padding: '5px 12px' }}
                  >
                    <i className="fa-solid fa-chevron-left" style={{ marginRight: '4px' }}></i>
                    Anterior
                  </button>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: '6px', padding: '5px 12px' }}
                  >
                    Próxima
                    <i className="fa-solid fa-chevron-right" style={{ marginLeft: '4px' }}></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: AÇÕES DE PROFISSIONAIS (AUDITORIA INTERNA LEGADA)                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'profissionais' && (
        <div className="content-panel" style={{ padding: 0, overflow: 'hidden', borderRadius: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', background: 'rgba(15, 23, 42, 0.5)' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc' }}>
              Trilha de Auditoria da Equipe Técnica
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Histórico de lançamentos manuais, trancamentos e alterações clínicas efetuadas pelos profissionais.
            </p>
          </div>

          <div className="table-responsive">
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr style={{ background: 'rgba(15, 23, 42, 0.8)' }}>
                  <th style={{ width: '140px' }}>Data / Hora</th>
                  <th style={{ width: '180px' }}>Profissional</th>
                  <th>Ação Realizada</th>
                  <th style={{ width: '180px' }}>Aluno Vinculado</th>
                  <th style={{ width: '140px' }}>Terminal / Origem</th>
                </tr>
              </thead>
              <tbody>
                {professionalActivityLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-dim)' }}>
                      Nenhuma ação de profissional registrada no sistema.
                    </td>
                  </tr>
                ) : (
                  professionalActivityLogs.map(log => {
                    const formattedDate = new Date(log.createdAt).toLocaleString('pt-BR');
                    const profName = log.profissionalId?.nome || 'Profissional Desconhecido';
                    const clientName = log.clienteId?.dadosPessoais?.nome || '-';
                    const isColetivo = log.origem === 'Computador Coletivo';

                    return (
                      <tr key={log._id}>
                        <td><strong>{formattedDate}</strong></td>
                        <td style={{ color: '#38bdf8', fontWeight: 700 }}>{profName}</td>
                        <td>
                          <strong style={{ color: '#f8fafc' }}>{log.acao}</strong>
                          {log.detalhes && (
                            <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', marginTop: '2px' }}>
                              {log.detalhes}
                            </div>
                          )}
                        </td>
                        <td>{clientName}</td>
                        <td>
                          <span className={`badge ${isColetivo ? 'badge-info' : 'badge-secondary'}`}>
                            {log.origem || 'Acesso Direto'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

