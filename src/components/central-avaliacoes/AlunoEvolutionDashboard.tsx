'use client';

import React from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from 'chart.js';
import { Radar, Line, Bar } from 'react-chartjs-2';
import LiveClinicalAlert from '../LiveClinicalAlert';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

interface AlunoEvolutionDashboardProps {
  client: {
    _id: string;
    nome: string;
    idade: number | null;
    peso: number | null;
    altura: number | null;
    lesoes?: string;
    restricoes?: string;
  };
  counts: {
    physicalAssessments: number;
    physioReports: number;
    strengthTests: number;
    clientTestRecords: number;
    totalTimeline: number;
  };
  liveAlerts: {
    goniometria: any[];
    strength: any[];
  };
  evolutionSeries: {
    goniometria: any[];
    eva: any[];
    strength: any[];
  };
  longitudinal: {
    computed?: any;
    narrative?: any;
  } | null;
  onOpenNovoTeste: () => void;
}

export default function AlunoEvolutionDashboard({
  client,
  counts,
  liveAlerts,
  evolutionSeries,
  longitudinal,
  onOpenNovoTeste
}: AlunoEvolutionDashboardProps) {
  // Formatador de data abreviada
  const formatShortDate = (dStr?: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dStr;
  };

  // 1. DADOS DO GRÁFICO RADAR (FORÇA BILATERAL: D vs E)
  // Pegamos a avaliação de força mais recente
  const latestStrengthDoc = evolutionSeries.strength[evolutionSeries.strength.length - 1];
  const radarLabels: string[] = [];
  const radarDataD: number[] = [];
  const radarDataE: number[] = [];

  if (latestStrengthDoc?.testes && latestStrengthDoc.testes.length > 0) {
    const movimentosSet = new Set<string>();
    latestStrengthDoc.testes.forEach((t: any) => movimentosSet.add(t.movimento));

    movimentosSet.forEach(mov => {
      radarLabels.push(mov);
      const testD = latestStrengthDoc.testes.find((t: any) => t.movimento === mov && t.lado === 'Direito');
      const testE = latestStrengthDoc.testes.find((t: any) => t.movimento === mov && t.lado === 'Esquerdo');
      radarDataD.push(testD ? Number(testD.forcaN) : 0);
      radarDataE.push(testE ? Number(testE.forcaN) : 0);
    });
  }

  const radarChartData = {
    labels: radarLabels,
    datasets: [
      {
        label: 'Membro Direito (N)',
        data: radarDataD,
        backgroundColor: 'rgba(13, 148, 136, 0.25)',
        borderColor: '#0d9488',
        borderWidth: 2,
        pointBackgroundColor: '#0d9488',
        pointRadius: 3
      },
      {
        label: 'Membro Esquerdo (N)',
        data: radarDataE,
        backgroundColor: 'rgba(99, 102, 241, 0.25)',
        borderColor: '#6366f1',
        borderWidth: 2,
        pointBackgroundColor: '#6366f1',
        pointRadius: 3
      }
    ]
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.08)' },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
        pointLabels: {
          color: '#cbd5e1',
          font: { size: 10 }
        },
        ticks: { display: false }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#cbd5e1', font: { size: 11 }, boxWidth: 12 }
      }
    }
  };

  // 2. DADOS DO GRÁFICO DE LINHAS: EVOLUÇÃO DE GONIOMETRIA (LUNGE vs ESTENDIDO)
  const gonioDates = evolutionSeries.goniometria.map(g => formatShortDate(g.data));
  const gonioDorsi1D = evolutionSeries.goniometria.map(g => g.dorsi1D);
  const gonioDorsi2D = evolutionSeries.goniometria.map(g => g.dorsi2D);

  const gonioChartData = {
    labels: gonioDates,
    datasets: [
      {
        label: 'Tornozelo Lunge / Joelho Fletido (Ref: 35-45°)',
        data: gonioDorsi2D,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#10b981'
      },
      {
        label: 'Tornozelo Joelho Estendido (Ref: 20°)',
        data: gonioDorsi1D,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#6366f1'
      }
    ]
  };

  const gonioChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#cbd5e1', font: { size: 11 }, boxWidth: 12 }
      }
    }
  };

  // 3. DADOS DO GRÁFICO DE BARRAS: RESOLUÇÃO DE DOR EVA
  const evaItems: { regiao: string; t1: number; t2: number }[] = [];
  if (longitudinal?.computed?.tabelaEVA?.rows) {
    longitudinal.computed.tabelaEVA.rows.forEach((r: any) => {
      evaItems.push({
        regiao: r.queixa.length > 25 ? r.queixa.substring(0, 25) + '...' : r.queixa,
        t1: Number(r.t1) || 0,
        t2: Number(r.t2) || 0
      });
    });
  }

  const evaChartData = {
    labels: evaItems.map(e => e.regiao),
    datasets: [
      {
        label: 'Dor Inicial (T1)',
        data: evaItems.map(e => e.t1),
        backgroundColor: 'rgba(239, 68, 68, 0.6)',
        borderColor: '#ef4444',
        borderWidth: 1,
        borderRadius: 4
      },
      {
        label: 'Dor Atual (T2)',
        data: evaItems.map(e => e.t2),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4
      }
    ]
  };

  const evaChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 } }
      },
      y: {
        max: 10,
        min: 0,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 10 }, stepSize: 2 }
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#cbd5e1', font: { size: 11 }, boxWidth: 12 }
      }
    }
  };

  // Alertas combinados reais
  const combinedAlerts = [...liveAlerts.goniometria, ...liveAlerts.strength];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. KPIs EXECUTIVOS NO TOPO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: 'var(--bg-card)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total de Lançamentos</small>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{counts.totalTimeline}</span>
            <small style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>registros no histórico</small>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avaliações Clínicas</small>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--secondary)' }}>{counts.physicalAssessments + counts.physioReports}</span>
            <small style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>completas</small>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Testes de Força</small>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f59e0b' }}>{counts.strengthTests}</span>
            <small style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>baterias Kinology</small>
          </div>
        </div>

        <div style={{ background: 'var(--bg-card)', padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <small style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Testes Avulsos</small>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ec4899' }}>{counts.clientTestRecords}</span>
            <small style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>medições rápidas</small>
          </div>
        </div>
      </div>

      {/* 2. ALERTA CLÍNICO VIVO (BIOMECÂNICA REAL) */}
      {combinedAlerts.length > 0 && (
        <LiveClinicalAlert alerts={combinedAlerts} title="Indicativos Clínicos & Riscos Biomecânicos Vivos" />
      )}

      {/* 3. GRID DE GRÁFICOS VISUAIS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {/* Gráfico 1: Radar de Força Bilateral */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-spider" style={{ color: 'var(--primary)' }} />
                Mapa de Força Bilateral (Dinamometria)
              </strong>
              <small style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>
                Simetria agonista / antagonista mais recente
              </small>
            </div>
            {radarLabels.length > 0 && (
              <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)' }}>
                {radarLabels.length} grupos
              </span>
            )}
          </div>

          <div style={{ flex: 1, minHeight: '260px', position: 'relative' }}>
            {radarLabels.length > 0 ? (
              <Radar data={radarChartData} options={radarOptions} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', padding: '20px', textAlign: 'center' }}>
                <i className="fas fa-weight-hanging fa-2x" style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: '0.85rem', margin: '0 0 10px 0' }}>Nenhum teste de força dinamométrica registrado ainda.</p>
                <button onClick={onOpenNovoTeste} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                  Lançar Teste de Força
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Linha Temporal de Amplitude de Tornozelo */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-chart-line" style={{ color: '#10b981' }} />
                Evolução da Dorsiflexão de Tornozelo
              </strong>
              <small style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>
                Cadeia Fechada (Lunge 35-45°) vs Estendido (20°)
              </small>
            </div>
          </div>

          <div style={{ flex: 1, minHeight: '260px', position: 'relative' }}>
            {gonioDates.length > 0 ? (
              <Line data={gonioChartData} options={gonioChartOptions} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', padding: '20px', textAlign: 'center' }}>
                <i className="fas fa-ruler-combined fa-2x" style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: '0.85rem', margin: '0 0 10px 0' }}>Nenhuma medição de goniometria registrada ainda.</p>
                <button onClick={onOpenNovoTeste} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                  Lançar Goniometria
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico 3: Resolução de Dor EVA (se houver queixas comparativas) */}
      {evaItems.length > 0 && (
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-heartbeat" style={{ color: '#ef4444' }} />
                Resposta Clínica à Dor (Escala EVA)
              </strong>
              <small style={{ color: 'var(--text-dim)', display: 'block', fontSize: '0.75rem' }}>
                Comparativo da intensidade inicial (T1) vs reavaliação (T2)
              </small>
            </div>
          </div>

          <div style={{ height: '220px', position: 'relative' }}>
            <Bar data={evaChartData} options={evaChartOptions} />
          </div>
        </div>
      )}

      {/* 4. FATORES CLÍNICOS DE DESTAQUE (DO LAUDO DE REAVALIAÇÃO) */}
      {longitudinal?.narrative && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {longitudinal.narrative.fatoresEvolucao?.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', borderLeft: '4px solid #10b981' }}>
              <strong style={{ fontSize: '0.85rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <i className="fas fa-arrow-trend-up" />
                Fatores de Evolução Clínica
              </strong>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {longitudinal.narrative.fatoresEvolucao.map((f: string, idx: number) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {longitudinal.narrative.fatoresComInvolucao?.length > 0 && (
            <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-color)', borderLeft: '4px solid #ef4444' }}>
              <strong style={{ fontSize: '0.85rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <i className="fas fa-triangle-exclamation" />
                Fatores que Requerem Atenção / Involução
              </strong>
              <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {longitudinal.narrative.fatoresComInvolucao.map((f: string, idx: number) => (
                  <li key={idx}>{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
