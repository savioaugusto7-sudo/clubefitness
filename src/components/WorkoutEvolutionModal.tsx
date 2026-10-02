'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { WorkoutEvolutionSummary, ExerciseProgressionAnalysis } from '@/utils/workoutAnalyticsEngine';

interface WorkoutEvolutionModalProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
}

export default function WorkoutEvolutionModal({
  clientId,
  clientName,
  onClose
}: WorkoutEvolutionModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    summary: WorkoutEvolutionSummary;
    activeWorkout: any;
    cycleSnapshots: any[];
  } | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<'kpis' | 'exercicios' | 'comparador'>('kpis');

  // Filters for Exercises Matrix
  const [filterMuscle, setFilterMuscle] = useState<string>('Todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [expandedExName, setExpandedExName] = useState<string | null>(null);

  // Cycle Comparator State
  const [compareCycleA, setCompareCycleA] = useState<string>('atual');
  const [compareCycleB, setCompareCycleB] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    async function fetchEvolution() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/workouts/evolution?clientId=${clientId}`);
        const json = await res.json();
        if (!isMounted) return;

        if (json.success && json.data) {
          setData(json.data);
          if (json.data.cycleSnapshots && json.data.cycleSnapshots.length > 0) {
            setCompareCycleB(json.data.cycleSnapshots[0]._id);
          }
        } else {
          setError(json.error || 'Não foi possível carregar a análise.');
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Erro de conexão.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchEvolution();
    return () => { isMounted = false; };
  }, [clientId]);

  const summary = data?.summary;

  // Filtered exercises
  const filteredExercises = useMemo(() => {
    if (!summary?.exercicios) return [];
    return summary.exercicios.filter(ex => {
      const matchMuscle = filterMuscle === 'Todos' || ex.grupo.toLowerCase().includes(filterMuscle.toLowerCase());
      const matchStatus = filterStatus === 'todos' || ex.status === filterStatus;
      return matchMuscle && matchStatus;
    });
  }, [summary, filterMuscle, filterStatus]);

  // Generate SVG Sparkline Path
  const renderSparkline = (points: { data: string; carga: number }[]) => {
    if (!points || points.length < 2) {
      return (
        <span style={{ fontSize: '11px', color: '#64748b' }}>Registro inicial</span>
      );
    }
    const width = 110;
    const height = 30;
    const minCarga = Math.min(...points.map(p => p.carga));
    const maxCarga = Math.max(...points.map(p => p.carga));
    const range = maxCarga - minCarga || 1;

    const coords = points.map((p, idx) => {
      const x = (idx / (points.length - 1)) * (width - 12) + 6;
      const y = height - 5 - ((p.carga - minCarga) / range) * (height - 12);
      return `${x},${y}`;
    });

    const isGrowing = points[points.length - 1].carga >= points[0].carga;
    const strokeColor = isGrowing ? '#10b981' : '#f59e0b';

    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords.join(' ')}
        />
        {points.map((p, idx) => {
          const x = (idx / (points.length - 1)) * (width - 12) + 6;
          const y = height - 5 - ((p.carga - minCarga) / range) * (height - 12);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={idx === points.length - 1 ? 3.5 : 2}
              fill={idx === points.length - 1 ? '#ffffff' : strokeColor}
              stroke={strokeColor}
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="evolution-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        className="evolution-modal-container"
        style={{
          background: 'linear-gradient(145deg, #0d1527 0%, #080d19 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '1080px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.8)',
          overflow: 'hidden',
          color: '#f8fafc'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            background: 'rgba(15, 23, 42, 0.6)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                color: '#fff',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
              }}
            >
              <i className="fas fa-chart-line"></i>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800', letterSpacing: '-0.02em' }}>
                  Evolução de Cargas & Sobrecarga Progressiva
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.3)'
                  }}
                >
                  Premium Analytics
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
                Aluno: <strong style={{ color: '#f1f5f9' }}>{clientName}</strong> • Leitura inteligente de força e adaptação neural
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '10px',
                padding: '8px 14px',
                color: '#cbd5e1',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              title="Imprimir relatório para entrega ao aluno"
            >
              <i className="fas fa-print"></i>
              <span>Imprimir Relatório</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                fontSize: '22px',
                cursor: 'pointer',
                padding: '4px 8px'
              }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            padding: '10px 28px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            gap: '12px',
            background: 'rgba(15, 23, 42, 0.3)'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('kpis')}
            style={{
              background: activeTab === 'kpis' ? '#10b981' : 'transparent',
              color: activeTab === 'kpis' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-gauge-high"></i>
            <span>Visão Geral & KPIs</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('exercicios')}
            style={{
              background: activeTab === 'exercicios' ? '#10b981' : 'transparent',
              color: activeTab === 'exercicios' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-dumbbell"></i>
            <span>Matriz de Exercícios ({summary?.exercicios?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('comparador')}
            style={{
              background: activeTab === 'comparador' ? '#10b981' : 'transparent',
              color: activeTab === 'comparador' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
          >
            <i className="fas fa-code-compare"></i>
            <span>Comparador de Ciclos</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', color: '#10b981', marginBottom: '14px' }}></i>
              <div style={{ fontSize: '15px', fontWeight: '600' }}>Calculando progressão de cargas e sobrecarga...</div>
            </div>
          )}

          {error && (
            <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }}>
              <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }}></i>
              {error}
            </div>
          )}

          {!loading && !error && summary && (
            <>
              {/* TAB 1: VISÃO GERAL & KPIS */}
              {activeTab === 'kpis' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Top 4 KPI Cards */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: '16px'
                    }}
                  >
                    {/* KPI 1: Ganho Força Global */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(6, 78, 59, 0.2) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#a7f3d0', textTransform: 'uppercase' }}>
                          Ganho de Força Global
                        </span>
                        <i className="fas fa-arrow-trend-up" style={{ color: '#10b981', fontSize: '16px' }}></i>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '30px', fontWeight: '900', color: '#34d399' }}>
                          {summary.ganhoForcaGlobalPercent >= 0 ? `+${summary.ganhoForcaGlobalPercent}%` : `${summary.ganhoForcaGlobalPercent}%`}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                          Média ponderada entre início e momento atual
                        </div>
                      </div>
                    </div>

                    {/* KPI 2: Volume Load Total */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(30, 58, 138, 0.2) 100%)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#bfdbfe', textTransform: 'uppercase' }}>
                          Volume Load Total
                        </span>
                        <i className="fas fa-weight-hanging" style={{ color: '#3b82f6', fontSize: '16px' }}></i>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '900', color: '#60a5fa' }}>
                          {summary.volumeLoadTotalAtual.toLocaleString('pt-BR')} <span style={{ fontSize: '16px' }}>kg</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                          Variação: <strong style={{ color: summary.variacaoVolumePercent >= 0 ? '#34d399' : '#f87171' }}>
                            {summary.variacaoVolumePercent >= 0 ? `+${summary.variacaoVolumePercent}%` : `${summary.variacaoVolumePercent}%`}
                          </strong> em relação à carga base
                        </div>
                      </div>
                    </div>

                    {/* KPI 3: Exercício Destaque */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(120, 53, 15, 0.2) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#fde68a', textTransform: 'uppercase' }}>
                          Maior Evolução de Carga
                        </span>
                        <i className="fas fa-medal" style={{ color: '#f59e0b', fontSize: '16px' }}></i>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '17px', fontWeight: '800', color: '#fbbf24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {summary.exercicioDestaque ? summary.exercicioDestaque.nome : 'Em consolidação'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '700', marginTop: '4px' }}>
                          {summary.exercicioDestaque ? `+${summary.exercicioDestaque.ganhoPercent}% (+${summary.exercicioDestaque.variacaoKg} ${summary.exercicioDestaque.unidade})` : '—'}
                        </div>
                      </div>
                    </div>

                    {/* KPI 4: Ciclos & Constância */}
                    <div
                      style={{
                        background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.12) 0%, rgba(88, 28, 135, 0.2) 100%)',
                        border: '1px solid rgba(147, 51, 234, 0.3)',
                        borderRadius: '16px',
                        padding: '18px 20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#e9d5ff', textTransform: 'uppercase' }}>
                          Periodizações & Constância
                        </span>
                        <i className="fas fa-calendar-check" style={{ color: '#a855f7', fontSize: '16px' }}></i>
                      </div>
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '28px', fontWeight: '900', color: '#c084fc' }}>
                          {summary.totalCiclosConcluidos} <span style={{ fontSize: '15px' }}>ciclos</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                          {summary.diasSobPeriodizacao > 0 ? `${summary.diasSobPeriodizacao} dias sob acompanhamento contínuo` : 'Ciclo inicial ativo'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnóstico Clínico Automatizado */}
                  <div
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '20px 24px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <i className="fas fa-brain" style={{ color: '#38bdf8', fontSize: '18px' }}></i>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                        Diagnóstico Inteligente & Recomendações Clínicas
                      </h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {summary.diagnosticoClinico.map((diag, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: '13px',
                            color: '#cbd5e1',
                            lineHeight: '1.6',
                            background: 'rgba(15, 23, 42, 0.5)',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            borderLeft: '4px solid #38bdf8'
                          }}
                        >
                          {diag}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Distribuição por Grupamento Muscular */}
                  <div
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '16px',
                      padding: '20px 24px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <i className="fas fa-layer-group" style={{ color: '#10b981', fontSize: '18px' }}></i>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#f8fafc' }}>
                          Ganho de Força por Grupamento Muscular
                        </h4>
                      </div>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        {summary.gruposMusculares.length} grupamentos mapeados
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                      {summary.gruposMusculares.map((grp, idx) => {
                        const isHigh = grp.ganhoPercentMedio >= 15;
                        const isStagnant = grp.ganhoPercentMedio <= 0;
                        const barColor = isHigh ? '#10b981' : isStagnant ? '#f59e0b' : '#3b82f6';

                        return (
                          <div
                            key={idx}
                            style={{
                              background: 'rgba(15, 23, 42, 0.5)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              borderRadius: '12px',
                              padding: '14px 16px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontWeight: '700', fontSize: '14px', color: '#f1f5f9' }}>
                                {grp.grupo}
                              </span>
                              <span style={{ fontSize: '14px', fontWeight: '800', color: barColor }}>
                                {grp.ganhoPercentMedio >= 0 ? `+${grp.ganhoPercentMedio}%` : `${grp.ganhoPercentMedio}%`}
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div style={{ height: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(10, grp.ganhoPercentMedio))}%`,
                                  height: '100%',
                                  background: barColor,
                                  borderRadius: '4px',
                                  transition: 'width 0.5s ease-out'
                                }}
                              />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                              <span>{grp.totalExercicios} exercício(s)</span>
                              <span>Volume: <strong>{grp.volumeLoadTotal.toLocaleString('pt-BR')} kg</strong></span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MATRIZ DE EXERCÍCIOS */}
              {activeTab === 'exercicios' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Filter Toolbar */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      background: 'rgba(15, 23, 42, 0.5)',
                      padding: '12px 18px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Grupamento:</span>
                      {['Todos', 'Peito', 'Costas', 'Pernas', 'Ombros', 'Braços', 'Core'].map(grp => (
                        <button
                          key={grp}
                          type="button"
                          onClick={() => setFilterMuscle(grp)}
                          style={{
                            background: filterMuscle === grp ? '#3b82f6' : 'rgba(255, 255, 255, 0.05)',
                            color: filterMuscle === grp ? '#ffffff' : '#94a3b8',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '4px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '600'
                          }}
                        >
                          {grp}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600' }}>Status:</span>
                      <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        style={{
                          background: '#0d1322',
                          color: '#f8fafc',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          fontSize: '12px'
                        }}
                      >
                        <option value="todos">Todos os Status</option>
                        <option value="sobrecarga_ativa">🟢 Sobrecarga Ativa</option>
                        <option value="plato">🟡 Platô</option>
                        <option value="estavel">⚪ Consolidação</option>
                        <option value="deload">🔵 Deload</option>
                      </select>
                    </div>
                  </div>

                  {/* Exercises Table / Cards */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredExercises.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                        Nenhum exercício encontrado com os filtros selecionados.
                      </div>
                    ) : (
                      filteredExercises.map((ex, idx) => {
                        const isExpanded = expandedExName === ex.nome;
                        const hasGain = ex.variacaoKg > 0;
                        const isPlato = ex.status === 'plato';

                        return (
                          <div
                            key={idx}
                            style={{
                              background: 'rgba(30, 41, 59, 0.5)',
                              border: isPlato ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                              borderRadius: '14px',
                              padding: '16px 20px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '12px',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                              {/* Exercise Info */}
                              <div style={{ flex: '1 1 240px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#f8fafc' }}>
                                    {ex.nome}
                                  </h4>
                                  <span
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      textTransform: 'uppercase',
                                      padding: '2px 6px',
                                      borderRadius: '6px',
                                      background: 'rgba(255, 255, 255, 0.08)',
                                      color: '#94a3b8'
                                    }}
                                  >
                                    {ex.grupo}
                                  </span>
                                </div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                                  {ex.series} séries × {ex.reps} reps • Volume: <strong>{ex.volumeLoadAtual.toLocaleString('pt-BR')} kg</strong>
                                </div>
                              </div>

                              {/* Load Progression Values */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Inicial</div>
                                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#cbd5e1' }}>
                                    {ex.cargaInicial} {ex.unidadeCarga}
                                  </div>
                                </div>

                                <i className="fas fa-arrow-right" style={{ color: '#64748b', fontSize: '12px' }}></i>

                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Atual</div>
                                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#ffffff' }}>
                                    {ex.cargaAtual} {ex.unidadeCarga}
                                  </div>
                                </div>

                                <div style={{ textAlign: 'center', minWidth: '75px' }}>
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Variação</div>
                                  <div style={{ fontSize: '14px', fontWeight: '800', color: hasGain ? '#34d399' : ex.variacaoKg < 0 ? '#f87171' : '#94a3b8' }}>
                                    {hasGain ? `+${ex.variacaoKg} ${ex.unidadeCarga} (+${ex.variacaoPercent}%)` : `${ex.variacaoKg} ${ex.unidadeCarga}`}
                                  </div>
                                </div>

                                {/* SVG Sparkline */}
                                <div style={{ padding: '0 8px' }}>
                                  {renderSparkline(ex.pontosEvolucao)}
                                </div>

                                {/* Status Badge */}
                                <div style={{ minWidth: '130px', textAlign: 'right' }}>
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      background: ex.status === 'sobrecarga_ativa' ? 'rgba(16, 185, 129, 0.15)' : ex.status === 'plato' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                                      color: ex.status === 'sobrecarga_ativa' ? '#34d399' : ex.status === 'plato' ? '#fbbf24' : '#cbd5e1',
                                      border: `1px solid ${ex.status === 'sobrecarga_ativa' ? 'rgba(16, 185, 129, 0.3)' : ex.status === 'plato' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`
                                    }}
                                  >
                                    {ex.statusLabel}
                                  </span>
                                </div>

                                {/* Toggle details */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedExName(isExpanded ? null : ex.nome)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '4px'
                                  }}
                                  title="Ver histórico de registros"
                                >
                                  <i className={isExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down'}></i>
                                </button>
                              </div>
                            </div>

                            {/* Expanded History Table */}
                            {isExpanded && (
                              <div
                                style={{
                                  marginTop: '8px',
                                  padding: '12px 16px',
                                  background: 'rgba(15, 23, 42, 0.8)',
                                  borderRadius: '10px',
                                  border: '1px solid rgba(255, 255, 255, 0.06)'
                                }}
                              >
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#93c5fd', marginBottom: '8px' }}>
                                  Linha do Tempo de Cargas Registradas:
                                </div>
                                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                                  {ex.pontosEvolucao.map((pt, pIdx) => (
                                    <div
                                      key={pIdx}
                                      style={{
                                        background: 'rgba(255, 255, 255, 0.04)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        borderRadius: '8px',
                                        padding: '6px 12px',
                                        fontSize: '11px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px'
                                      }}
                                    >
                                      <span style={{ color: '#94a3b8' }}>
                                        {pt.data ? pt.data.split('-').reverse().join('/') : 'Data n/d'}
                                      </span>
                                      <span style={{ fontWeight: '800', color: '#f8fafc', fontSize: '13px' }}>
                                        {pt.carga} {ex.unidadeCarga}
                                      </span>
                                      <span style={{ color: '#64748b', fontSize: '10px' }}>
                                        {pt.reps} reps
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: COMPARADOR DE CICLOS */}
              {activeTab === 'comparador' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div
                    style={{
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '14px',
                      padding: '18px 22px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#f8fafc' }}>
                        Comparar Fichas e Periodizações Históricas
                      </h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                        Analise a transição de exercícios e sobrecarga de volume entre ciclos diferentes
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Ciclo de Referência:
                        </label>
                        <select
                          value={compareCycleA}
                          onChange={e => setCompareCycleA(e.target.value)}
                          style={{
                            background: '#0d1322',
                            color: '#f8fafc',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px'
                          }}
                        >
                          <option value="atual">Ficha Ativa Atual</option>
                          {data?.cycleSnapshots?.map(c => (
                            <option key={c._id} value={c._id}>
                              {c.sheetNome || c.motivo} ({new Date(c.createdAt).toLocaleDateString('pt-BR')})
                            </option>
                          ))}
                        </select>
                      </div>

                      <span style={{ color: '#64748b', fontWeight: '800', marginTop: '16px' }}>VS</span>

                      <div>
                        <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                          Ciclo Anterior / Histórico:
                        </label>
                        <select
                          value={compareCycleB}
                          onChange={e => setCompareCycleB(e.target.value)}
                          style={{
                            background: '#0d1322',
                            color: '#f8fafc',
                            border: '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px'
                          }}
                        >
                          {data?.cycleSnapshots?.length === 0 && (
                            <option value="">Nenhum ciclo arquivado ainda</option>
                          )}
                          {data?.cycleSnapshots?.map(c => (
                            <option key={c._id} value={c._id}>
                              {c.sheetNome || c.motivo} ({new Date(c.createdAt).toLocaleDateString('pt-BR')})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Comparison Details */}
                  {data?.cycleSnapshots?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
                      <i className="fas fa-history" style={{ fontSize: '32px', marginBottom: '12px', color: '#64748b' }}></i>
                      <div>O aluno ainda possui apenas o ciclo inicial ativo.</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        À medida que novas fichas forem salvas ou arquivadas, o comparador exibirá a evolução detalhada lado a lado.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
                      {/* Box Ciclo A */}
                      <div
                        style={{
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          borderRadius: '14px',
                          padding: '20px'
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa', marginBottom: '12px' }}>
                          {compareCycleA === 'atual' ? 'Ficha Ativa Atual' : 'Ciclo Selecionado A'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {summary.exercicios.slice(0, 8).map((ex, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span style={{ color: '#f1f5f9' }}>{ex.nome}</span>
                              <strong style={{ color: '#34d399' }}>{ex.cargaAtual} {ex.unidadeCarga}</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Box Ciclo B */}
                      <div
                        style={{
                          background: 'rgba(30, 41, 59, 0.4)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          borderRadius: '14px',
                          padding: '20px'
                        }}
                      >
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#34d399', marginBottom: '12px' }}>
                          Ciclo de Comparação B
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {summary.exercicios.slice(0, 8).map((ex, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '6px 0', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              <span style={{ color: '#f1f5f9' }}>{ex.nome}</span>
                              <strong style={{ color: '#94a3b8' }}>{ex.cargaInicial} {ex.unidadeCarga}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
