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

  // 🌟 CÁLCULO DO KPI 1: MAIOR ASSIMETRIA BILATERAL ATUAL
  const kpiAssimetria = React.useMemo(() => {
    let maxDiff = -1;
    let worstMov = '';
    let ladoDominante = '';

    // 1. Tenta extrair de longitudinal.computed.tabelaSimetria
    if (longitudinal?.computed?.tabelaSimetria && Array.isArray(longitudinal.computed.tabelaSimetria)) {
      longitudinal.computed.tabelaSimetria.forEach((s: any) => {
        const v = Math.abs(Number(s.t2 ?? s.variacaoPP ?? 0));
        if (v > maxDiff) {
          maxDiff = v;
          worstMov = s.movimento || '';
        }
      });
    }

    // 2. Se não encontrou, calcula a partir de latestStrengthDoc
    if (maxDiff < 0 && latestStrengthDoc?.testes && latestStrengthDoc.testes.length > 0) {
      const movimentosSet = new Set<string>();
      latestStrengthDoc.testes.forEach((t: any) => movimentosSet.add(t.movimento));
      movimentosSet.forEach(mov => {
        const d = latestStrengthDoc.testes.find((t: any) => t.movimento === mov && t.lado === 'Direito');
        const e = latestStrengthDoc.testes.find((t: any) => t.movimento === mov && t.lado === 'Esquerdo');
        const fd = d ? Number(d.forcaN) || 0 : 0;
        const fe = e ? Number(e.forcaN) || 0 : 0;
        const maxF = Math.max(fd, fe);
        if (maxF > 0) {
          const diffPct = Math.round((Math.abs(fd - fe) / maxF) * 100);
          if (diffPct > maxDiff) {
            maxDiff = diffPct;
            worstMov = mov;
            ladoDominante = fd >= fe ? 'D > E' : 'E > D';
          }
        }
      });
    }

    if (maxDiff < 0) {
      return {
        label: 'Força Bilateral',
        valor: 'Não avaliado',
        subtitulo: 'Sem teste de dinamometria',
        cor: 'var(--text-dim, #94a3b8)',
        badge: 'Pendente',
        badgeBg: 'rgba(255,255,255,0.06)',
        status: 'neutro'
      };
    }

    if (maxDiff > 15) {
      return {
        label: 'Assimetria Crítica',
        valor: `${maxDiff}%`,
        subtitulo: `${worstMov} (${ladoDominante || 'Déficit severo'})`,
        cor: '#ef4444',
        badge: '⚠️ Risco Elevado (>15%)',
        badgeBg: 'rgba(239, 68, 68, 0.18)',
        status: 'critico'
      };
    }
    if (maxDiff > 10) {
      return {
        label: 'Maior Assimetria',
        valor: `${maxDiff}%`,
        subtitulo: `${worstMov} (${ladoDominante || 'Atenção clínica'})`,
        cor: '#f59e0b',
        badge: '⚡ Alerta Moderado (>10%)',
        badgeBg: 'rgba(245, 158, 11, 0.18)',
        status: 'atencao'
      };
    }
    return {
      label: 'Equilíbrio Muscular',
      valor: `${maxDiff}%`,
      subtitulo: `${worstMov || 'Membros'} simétricos`,
      cor: '#10b981',
      badge: '🟢 Equilibrado (≤10%)',
      badgeBg: 'rgba(16, 185, 129, 0.18)',
      status: 'otimo'
    };
  }, [longitudinal, latestStrengthDoc]);

  // 🌟 CÁLCULO DO KPI 2: MOBILIDADE ARTICULAR MAIS RESTRITA
  const kpiMobilidade = React.useMemo(() => {
    const latestGonio = evolutionSeries.goniometria[evolutionSeries.goniometria.length - 1];
    if (!latestGonio) {
      return {
        label: 'Mobilidade Articular',
        valor: 'Não avaliada',
        subtitulo: 'Sem goniometria registrada',
        cor: 'var(--text-dim, #94a3b8)',
        badge: 'Pendente',
        badgeBg: 'rgba(255,255,255,0.06)'
      };
    }

    const d2D = Number(latestGonio.dorsi2D) || null;
    const d2E = Number(latestGonio.dorsi2E) || null;
    const minLunge = d2D !== null && d2E !== null ? Math.min(d2D, d2E) : (d2D ?? d2E);
    const ladoLunge = d2D !== null && d2E !== null ? (d2D < d2E ? 'Direito' : (d2E < d2D ? 'Esquerdo' : 'Bilateral')) : (d2D !== null ? 'Direito' : 'Esquerdo');

    if (minLunge !== null) {
      if (minLunge < 30) {
        return {
          label: 'Mobilidade Crítica',
          valor: `${minLunge}°`,
          subtitulo: `Tornozelo ${ladoLunge} (Ref: 35-45°)`,
          cor: '#ef4444',
          badge: '🔴 Restrição Severa',
          badgeBg: 'rgba(239, 68, 68, 0.18)'
        };
      }
      if (minLunge < 35) {
        return {
          label: 'Mobilidade Reduzida',
          valor: `${minLunge}°`,
          subtitulo: `Tornozelo ${ladoLunge} (Ref: 35-45°)`,
          cor: '#f59e0b',
          badge: '🟡 Abaixo da Ref.',
          badgeBg: 'rgba(245, 158, 11, 0.18)'
        };
      }
      return {
        label: 'Mobilidade Funcional',
        valor: `${minLunge}°`,
        subtitulo: `Tornozelo ${ladoLunge} (Normal)`,
        cor: '#10b981',
        badge: '🟢 Adequada (≥35°)',
        badgeBg: 'rgba(16, 185, 129, 0.18)'
      };
    }

    return {
      label: 'Mobilidade Articular',
      valor: 'Avaliada',
      subtitulo: `${evolutionSeries.goniometria.length} medição(ões)`,
      cor: '#38bdf8',
      badge: 'Registrada',
      badgeBg: 'rgba(56, 189, 248, 0.18)'
    };
  }, [evolutionSeries.goniometria]);

  // 🌟 CÁLCULO DO KPI 3: QUEIXA PRINCIPAL & DOR EVA
  const kpiDor = React.useMemo(() => {
    const evaRows = longitudinal?.computed?.tabelaEVA?.rows || [];
    if (evaRows.length > 0) {
      const topEva = evaRows[0];
      const t1 = Number(topEva.t1) || 0;
      const t2 = Number(topEva.t2) || 0;
      const delta = topEva.delta != null ? Number(topEva.delta) : (t2 - t1);
      const isResolvida = t2 === 0 || topEva.status === 'Resolvida';

      if (isResolvida) {
        return {
          label: 'Queixa de Dor',
          valor: '0/10 EVA',
          subtitulo: `${topEva.queixa} (Resolvida)`,
          cor: '#10b981',
          badge: '🟢 Sintoma Resolvido',
          badgeBg: 'rgba(16, 185, 129, 0.18)'
        };
      }

      const deltaTxt = delta < 0 ? `${delta} pts desde T1` : (delta > 0 ? `+${delta} pts (Piorou)` : 'Estável');
      const cor = t2 <= 3 ? '#10b981' : (t2 <= 6 ? '#f59e0b' : '#ef4444');
      return {
        label: 'Queixa Ativa (EVA)',
        valor: `${t2}/10`,
        subtitulo: `${topEva.queixa.length > 22 ? topEva.queixa.substring(0, 22) + '...' : topEva.queixa}`,
        cor,
        badge: deltaTxt,
        badgeBg: delta <= 0 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)'
      };
    }

    if (evolutionSeries.eva?.length > 0) {
      const last = evolutionSeries.eva[evolutionSeries.eva.length - 1];
      const val = Number(last.dorIntensidade || last.valor) || 0;
      const reg = last.regiao || 'Local';
      return {
        label: 'Última Queixa EVA',
        valor: `${val}/10`,
        subtitulo: reg,
        cor: val <= 2 ? '#10b981' : (val <= 5 ? '#f59e0b' : '#ef4444'),
        badge: val === 0 ? 'Sem dor' : `Intensidade ${val}`,
        badgeBg: val <= 2 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)'
      };
    }

    return {
      label: 'Queixas Clínicas',
      valor: '0/10 EVA',
      subtitulo: 'Sem dor ativa relatada',
      cor: '#10b981',
      badge: '🟢 Assintomático',
      badgeBg: 'rgba(16, 185, 129, 0.18)'
    };
  }, [longitudinal, evolutionSeries.eva]);

  // 🌟 CÁLCULO DO KPI 4: SAÚDE DO CICLO & TEMPO DESDE AVALIAÇÃO
  const kpiCiclo = React.useMemo(() => {
    const total = counts.totalTimeline;
    if (total === 0) {
      return {
        label: 'Status do Ciclo',
        valor: 'Sem histórico',
        subtitulo: 'Aluno ainda sem lançamentos',
        cor: 'var(--text-dim, #94a3b8)',
        badge: 'Novo Aluno',
        badgeBg: 'rgba(255, 255, 255, 0.06)'
      };
    }

    const lastDateStr = longitudinal?.t2Data || longitudinal?.t1Data || (evolutionSeries.strength[evolutionSeries.strength.length - 1]?.data);
    let diasDecorridos: number | null = null;
    if (lastDateStr) {
      const parts = lastDateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const diffMs = Date.now() - d.getTime();
        diasDecorridos = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
    }

    if (diasDecorridos !== null) {
      if (diasDecorridos > 60) {
        return {
          label: 'Ciclo de Reavaliação',
          valor: `${diasDecorridos}d`,
          subtitulo: 'Último teste há mais de 2 meses',
          cor: '#ef4444',
          badge: '⚠️ Ciclo Vencido',
          badgeBg: 'rgba(239, 68, 68, 0.18)'
        };
      }
      if (diasDecorridos > 45) {
        return {
          label: 'Ciclo de Reavaliação',
          valor: `${diasDecorridos}d`,
          subtitulo: 'Reavaliação recomendada em breve',
          cor: '#f59e0b',
          badge: '⚡ Reavaliação Próxima',
          badgeBg: 'rgba(245, 158, 11, 0.18)'
        };
      }
      return {
        label: 'Ciclo de Reavaliação',
        valor: `${diasDecorridos}d`,
        subtitulo: 'Acompanhamento recente e em dia',
        cor: '#10b981',
        badge: '🟢 Em Dia',
        badgeBg: 'rgba(16, 185, 129, 0.18)'
      };
    }

    return {
      label: 'Ciclo de Reavaliação',
      valor: `${total} testes`,
      subtitulo: 'Prontuário ativo e alimentado',
      cor: '#6366f1',
      badge: 'Ativo',
      badgeBg: 'rgba(99, 102, 241, 0.18)'
    };
  }, [counts.totalTimeline, longitudinal, evolutionSeries]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. KPIs BIOMECÂNICOS VIVOS (ALTO VALOR CLÍNICO) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {/* KPI 1: Assimetria Muscular */}
        <div
          style={{
            background: 'var(--bg-card, #1e293b)',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            borderLeft: `4px solid ${kpiAssimetria.cor}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              {kpiAssimetria.label}
            </span>
            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: kpiAssimetria.badgeBg, color: kpiAssimetria.cor, fontWeight: 700 }}>
              {kpiAssimetria.badge}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpiAssimetria.cor, lineHeight: 1.1 }}>
              {kpiAssimetria.valor}
            </div>
            <small style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
              {kpiAssimetria.subtitulo}
            </small>
          </div>
        </div>

        {/* KPI 2: Mobilidade Articular */}
        <div
          style={{
            background: 'var(--bg-card, #1e293b)',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            borderLeft: `4px solid ${kpiMobilidade.cor}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              {kpiMobilidade.label}
            </span>
            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: kpiMobilidade.badgeBg, color: kpiMobilidade.cor, fontWeight: 700 }}>
              {kpiMobilidade.badge}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpiMobilidade.cor, lineHeight: 1.1 }}>
              {kpiMobilidade.valor}
            </div>
            <small style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
              {kpiMobilidade.subtitulo}
            </small>
          </div>
        </div>

        {/* KPI 3: Queixa de Dor EVA */}
        <div
          style={{
            background: 'var(--bg-card, #1e293b)',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            borderLeft: `4px solid ${kpiDor.cor}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              {kpiDor.label}
            </span>
            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: kpiDor.badgeBg, color: kpiDor.cor, fontWeight: 700 }}>
              {kpiDor.badge}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpiDor.cor, lineHeight: 1.1 }}>
              {kpiDor.valor}
            </div>
            <small style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
              {kpiDor.subtitulo}
            </small>
          </div>
        </div>

        {/* KPI 4: Ciclo de Reavaliação */}
        <div
          style={{
            background: 'var(--bg-card, #1e293b)',
            padding: '16px 18px',
            borderRadius: '14px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            borderLeft: `4px solid ${kpiCiclo.cor}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
              {kpiCiclo.label}
            </span>
            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: kpiCiclo.badgeBg, color: kpiCiclo.cor, fontWeight: 700 }}>
              {kpiCiclo.badge}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: kpiCiclo.cor, lineHeight: 1.1 }}>
              {kpiCiclo.valor}
            </div>
            <small style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.82rem', marginTop: '4px', display: 'block' }}>
              {kpiCiclo.subtitulo}
            </small>
          </div>
        </div>
      </div>

      {/* 🌟 BOX EXECUTIVO PARA O TREINADOR (DIRETRIZES CLÍNICAS) */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.28)',
          borderRadius: '14px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main, #fff)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-clipboard-check" style={{ color: 'var(--primary, #818cf8)' }} />
            Diretrizes Clínicas para a Sala de Treino
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '12px' }}>
            {counts.totalTimeline} registro(s) no prontuário
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '12px 14px', borderRadius: '10px' }}>
            <strong style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <i className="fas fa-arrow-up" /> O que Priorizar no Treino:
            </strong>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-main, #fff)', lineHeight: 1.45 }}>
              {kpiAssimetria.status !== 'otimo' && kpiAssimetria.status !== 'neutro'
                ? `Focar exercícios unilaterais no membro deficitário (${kpiAssimetria.subtitulo}).`
                : 'Progressão gradual de carga com estímulos bilaterais equilibrados.'}
              {kpiMobilidade.valor !== 'Não avaliada' && Number(kpiMobilidade.valor.replace('°','')) < 35
                ? ' Mobilidade de tornozelo em cadeia fechada como preparação de movimento.'
                : ''}
            </p>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '12px 14px', borderRadius: '10px' }}>
            <strong style={{ fontSize: '0.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <i className="fas fa-shield-alt" /> O que Evitar ou Adaptar:
            </strong>
            <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-main, #fff)', lineHeight: 1.45 }}>
              {client.restricoes || (kpiDor.valor !== '0/10 EVA' && kpiDor.valor !== 'Não avaliada'
                ? `Respeitar limiar de dor (${kpiDor.subtitulo}). Evitar impactos excessivos se dor > 3.`
                : 'Sem contraindicações específicas no momento. Manter padrão técnico rigoroso.')}
            </p>
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
