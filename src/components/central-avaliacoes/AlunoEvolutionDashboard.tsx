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
import { downloadReavaliacaoLaudoPDF } from '@/utils/reavaliacaoPdfGenerator';
import { calculateAdvancedStrengthRatios, AdvancedStrengthRatioItem, calculateHopBatteryAnalysis, HopBatteryResult } from '@/utils/biomechanicsEngine';
import { detectCompartment, COMPARTIMENTOS_METADATA } from '@/utils/fisioterapiaQueixasCatalog';
import { calculateACWR, calculateWellnessACWRDecision, ACWRResult, DecisionMatrixResult } from '@/utils/acwrEngine';
import { VisaPComparisonResult } from '@/utils/visaPEngine';

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
    sexo?: string;
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
    wellnessLogs?: number;
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
    wellness?: any[];
    visaP?: VisaPComparisonResult | null;
    hopTest?: HopBatteryResult | null;
  };
  longitudinal: {
    t1Data?: string | null;
    t2Data?: string | null;
    computed?: any;
    narrative?: any;
  } | null;
  acwr?: ACWRResult | null;
  matrizDecisao?: DecisionMatrixResult | null;
  onOpenNovoTeste: () => void;
}

export default function AlunoEvolutionDashboard({
  client,
  counts,
  liveAlerts,
  evolutionSeries,
  longitudinal,
  acwr,
  matrizDecisao,
  onOpenNovoTeste
}: AlunoEvolutionDashboardProps) {
  // 🌟 ESTADOS DA FASE 3: MODOS DE VISUALIZAÇÃO E SELETOR ARTICULAR
  const [strengthViewMode, setStrengthViewMode] = React.useState<'bilateral' | 'radar' | 'razoes'>('bilateral');
  const [gonioArticulacao, setGonioArticulacao] = React.useState<'tornozelo' | 'joelho' | 'ombro'>('tornozelo');

  // 🌟 MONITORAMENTO DE CARGA ACWR & MATRIZ DE DECISÃO DO WELLNESS (Gabbett / Hooper)
  const acwrData: ACWRResult = React.useMemo(() => {
    if (acwr) return acwr;
    return calculateACWR([], null);
  }, [acwr]);

  const decisionMatrixData: DecisionMatrixResult = React.useMemo(() => {
    if (matrizDecisao) return matrizDecisao;
    const lastWell = evolutionSeries.wellness && evolutionSeries.wellness.length > 0 ? evolutionSeries.wellness[0] : null;
    return calculateWellnessACWRDecision(lastWell, acwrData);
  }, [matrizDecisao, evolutionSeries.wellness, acwrData]);

  // 1. DADOS DE DINAMOMETRIA (AVALIAÇÃO MAIS RECENTE)
  const latestStrengthDoc = evolutionSeries.strength[evolutionSeries.strength.length - 1];

  // 🌟 CÁLCULO DAS RAZÕES MUSCULARES E FORÇA RELATIVA (% PESO CORPORAL)
  const advancedStrengthRatios = React.useMemo(() => {
    if (longitudinal?.computed?.razoesAvancadas && longitudinal.computed.razoesAvancadas.length > 0) {
      return longitudinal.computed.razoesAvancadas;
    }
    const testList = latestStrengthDoc?.testes || latestStrengthDoc?.testesRealizados || latestStrengthDoc?.exercicios || [];
    return calculateAdvancedStrengthRatios(testList, client.peso || 70, (client.sexo as any) || 'M');
  }, [longitudinal, latestStrengthDoc, client]);

  // 🌟 DADOS DA BATERIA DE HOP TESTS (SIMETRIA LSI & RETORNO AO ESPORTE)
  const hopTestData: HopBatteryResult | null = React.useMemo(() => {
    return longitudinal?.computed?.testesFuncionais?.hopTest || evolutionSeries.hopTest || null;
  }, [longitudinal, evolutionSeries.hopTest]);

  // 🌟 DADOS DO QUESTIONÁRIO VALIDADO VISA-P (TENDINOPATIA PATELAR • MCID = 13 PTS)
  const visaPData: VisaPComparisonResult | null = React.useMemo(() => {
    return longitudinal?.computed?.testesFuncionais?.visaP || evolutionSeries.visaP || null;
  }, [longitudinal, evolutionSeries.visaP]);

  // Formatador de data abreviada
  const formatShortDate = (dStr?: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return dStr;
  };

  // 1A. CÁLCULO DAS BARRAS DE FORÇA BILATERAL D vs E COM ZONAS DE SIMETRIA (≤10%, 10-15%, >15%)
  const strengthMovements = React.useMemo(() => {
    if (!latestStrengthDoc?.testes || latestStrengthDoc.testes.length === 0) return [];

    const map = new Map<string, { mov: string; d: number; e: number }>();

    latestStrengthDoc.testes.forEach((t: any) => {
      const mov = t.movimento || 'Movimento';
      if (!map.has(mov)) {
        map.set(mov, { mov, d: 0, e: 0 });
      }
      const item = map.get(mov)!;
      const val = Number(t.forcaN || t.valorObtido) || 0;
      if (t.lado === 'Direito') item.d = val;
      if (t.lado === 'Esquerdo') item.e = val;
    });

    const list = Array.from(map.values()).map(item => {
      const maxF = Math.max(item.d, item.e);
      const diff = maxF > 0 ? Math.round((Math.abs(item.d - item.e) / maxF) * 100) : 0;
      let status: 'otimo' | 'atencao' | 'critico' = 'otimo';
      let statusLabel = 'Equilibrado';
      let statusColor = '#10b981';
      let statusBg = 'rgba(16, 185, 129, 0.12)';

      if (diff > 15) {
        status = 'critico';
        statusLabel = 'Assimetria Crítica (>15%)';
        statusColor = '#ef4444';
        statusBg = 'rgba(239, 68, 68, 0.16)';
      } else if (diff > 10) {
        status = 'atencao';
        statusLabel = 'Alerta Moderado (>10%)';
        statusColor = '#f59e0b';
        statusBg = 'rgba(245, 158, 11, 0.16)';
      } else {
        status = 'otimo';
        statusLabel = 'Simétrico (≤10%)';
        statusColor = '#10b981';
        statusBg = 'rgba(16, 185, 129, 0.16)';
      }

      return {
        ...item,
        diff,
        deficitLado: item.d < item.e ? 'Déficit Direito' : item.e < item.d ? 'Déficit Esquerdo' : 'Equilibrado',
        status,
        statusLabel,
        statusColor,
        statusBg
      };
    });

    // Ordena colocando os de maior assimetria no topo para diagnóstico visual imediato
    return list.sort((a, b) => b.diff - a.diff);
  }, [latestStrengthDoc]);

  // Pico de força para normalização visual das barras (máximo relativo)
  const maxStrengthInSet = React.useMemo(() => {
    let m = 50;
    strengthMovements.forEach(s => {
      if (s.d > m) m = s.d;
      if (s.e > m) m = s.e;
    });
    return m;
  }, [strengthMovements]);

  // 1B. DADOS DO GRÁFICO RADAR
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

  // 2. DADOS DO GRÁFICO DINÂMICO DE GONIOMETRIA COM SELETOR ARTICULAR
  const gonioDates = evolutionSeries.goniometria.map(g => formatShortDate(g.data));

  const gonioChartData = React.useMemo(() => {
    if (gonioArticulacao === 'tornozelo') {
      const gonioDorsi2D = evolutionSeries.goniometria.map(g => g.dorsi2D);
      const gonioDorsi1D = evolutionSeries.goniometria.map(g => g.dorsi1D);
      return {
        labels: gonioDates,
        datasets: [
          {
            label: 'Lunge / Joelho Fletido (Ref: 35-45°)',
            data: gonioDorsi2D,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#10b981'
          },
          {
            label: 'Joelho Estendido (Ref: 20°)',
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
    }

    if (gonioArticulacao === 'joelho') {
      const flexaoD = evolutionSeries.goniometria.map(g => g.joelhoFlexaoD);
      const flexaoE = evolutionSeries.goniometria.map(g => g.joelhoFlexaoE);
      const popliteoD = evolutionSeries.goniometria.map(g => g.popliteoD);
      return {
        labels: gonioDates,
        datasets: [
          {
            label: 'Flexão Joelho D (Ref: 130-140°)',
            data: flexaoD,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.1)',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#06b6d4'
          },
          {
            label: 'Flexão Joelho E (Ref: 130-140°)',
            data: flexaoE,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#3b82f6'
          },
          {
            label: 'Ângulo Poplíteo (Ref: 80-90°)',
            data: popliteoD,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#f59e0b'
          }
        ]
      };
    }

    // Articulação do Ombro
    const rotExtD = evolutionSeries.goniometria.map(g => g.ombroRotExtD);
    const rotIntD = evolutionSeries.goniometria.map(g => g.ombroRotIntD);
    const flexaoD = evolutionSeries.goniometria.map(g => g.ombroFlexaoD);
    return {
      labels: gonioDates,
      datasets: [
        {
          label: 'Rotação Externa D (Ref: 80-100°)',
          data: rotExtD,
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#8b5cf6'
        },
        {
          label: 'Rotação Interna D (Ref: 80-90°)',
          data: rotIntD,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#10b981'
        },
        {
          label: 'Flexão de Ombro (Ref: 180°)',
          data: flexaoD,
          borderColor: '#ec4899',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#ec4899'
        }
      ]
    };
  }, [gonioArticulacao, evolutionSeries.goniometria, gonioDates]);

  // Verifica se há medições preenchidas para a articulação selecionada
  const hasGonioDataForSelectedJoint = React.useMemo(() => {
    if (!gonioChartData.datasets || gonioChartData.datasets.length === 0) return false;
    return gonioChartData.datasets.some(ds => ds.data.some((v: any) => v !== null && v !== undefined && !isNaN(Number(v))));
  }, [gonioChartData]);

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

  // 3. DADOS CONSOLIDADOS DE DOR (EVA) E COMPARAÇÃO TEMPORAL
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

  // Lista consolidada de cards de queixas anatômicas com tags CIF e escala visual
  const mappedQueixas = React.useMemo(() => {
    const list: Array<{
      regiao: string;
      intensidade: number;
      t1?: number;
      t2?: number;
      delta?: number;
      status?: string;
      agravantes?: string[];
      data?: string;
    }> = [];

    if (longitudinal?.computed?.tabelaEVA?.rows?.length > 0) {
      longitudinal.computed.tabelaEVA.rows.forEach((r: any) => {
        list.push({
          regiao: r.queixa,
          intensidade: Number(r.t2 ?? r.t1 ?? 0),
          t1: Number(r.t1) || 0,
          t2: Number(r.t2) || 0,
          delta: r.delta != null ? Number(r.delta) : (r.t2 != null && r.t1 != null ? Number(r.t2) - Number(r.t1) : undefined),
          status: r.status,
          agravantes: []
        });
      });
    }

    if (list.length === 0 && evolutionSeries.eva?.length > 0) {
      const lastEvaDoc = evolutionSeries.eva[evolutionSeries.eva.length - 1];
      if (lastEvaDoc?.queixas?.length > 0) {
        lastEvaDoc.queixas.forEach((q: any) => {
          list.push({
            regiao: q.regiao || 'Geral',
            intensidade: Number(q.intensidade) || 0,
            agravantes: q.atividadesAgravantes || [],
            data: lastEvaDoc.data
          });
        });
      } else if (lastEvaDoc?.dorGeral != null) {
        list.push({
          regiao: 'Queixa Geral',
          intensidade: Number(lastEvaDoc.dorGeral) || 0,
          agravantes: [],
          data: lastEvaDoc.data
        });
      }
    }

    return list;
  }, [longitudinal, evolutionSeries.eva]);

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
      const comp = detectCompartment(topEva.queixa);
      const compMeta = comp ? COMPARTIMENTOS_METADATA[comp] : null;

      if (isResolvida) {
        return {
          label: 'Queixa de Dor',
          valor: '0/10 EVA',
          subtitulo: `${topEva.queixa} (Resolvida)`,
          cor: '#10b981',
          badge: '🟢 Sintoma Resolvido',
          badgeBg: 'rgba(16, 185, 129, 0.18)',
          compartimento: comp,
          compartimentoCor: compMeta?.cor,
          compartimentoBg: compMeta?.bg
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
        badgeBg: delta <= 0 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
        compartimento: comp,
        compartimentoCor: compMeta?.cor,
        compartimentoBg: compMeta?.bg
      };
    }

    if (evolutionSeries.eva?.length > 0) {
      const last = evolutionSeries.eva[evolutionSeries.eva.length - 1];
      const val = Number(last.dorIntensidade || last.valor) || 0;
      const reg = last.regiao || 'Local';
      const comp = detectCompartment(reg);
      const compMeta = comp ? COMPARTIMENTOS_METADATA[comp] : null;
      return {
        label: 'Última Queixa EVA',
        valor: `${val}/10`,
        subtitulo: reg,
        cor: val <= 2 ? '#10b981' : (val <= 5 ? '#f59e0b' : '#ef4444'),
        badge: val === 0 ? 'Sem dor' : `Intensidade ${val}`,
        badgeBg: val <= 2 ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
        compartimento: comp,
        compartimentoCor: compMeta?.cor,
        compartimentoBg: compMeta?.bg
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
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              {(kpiDor as any).compartimento && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '2px 7px',
                    borderRadius: '10px',
                    background: (kpiDor as any).compartimentoBg,
                    color: (kpiDor as any).compartimentoCor,
                    fontWeight: 700,
                    border: `1px solid ${(kpiDor as any).compartimentoCor}50`
                  }}
                >
                  {(kpiDor as any).compartimento}
                </span>
              )}
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: kpiDor.badgeBg, color: kpiDor.cor, fontWeight: 700 }}>
                {kpiDor.badge}
              </span>
            </div>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {longitudinal?.computed && longitudinal?.narrative && (
              <button
                type="button"
                onClick={() => downloadReavaliacaoLaudoPDF(longitudinal.computed, longitudinal.narrative)}
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#38bdf8',
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Emitir Laudo Clínico de Reavaliação em PDF"
              >
                <i className="fas fa-file-pdf" />
                Baixar Laudo PDF
              </button>
            )}
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', background: 'rgba(255,255,255,0.06)', padding: '3px 10px', borderRadius: '12px' }}>
              {counts.totalTimeline} registro(s) no prontuário
            </span>
          </div>
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

      {/* 3. GRID DE BIOMECÂNICA AVANÇADA (FORÇA & GONIOMETRIA) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))', gap: '16px' }}>
        {/* Painel 1: Dinamometria Bilateral (Barras D vs E ou Radar) */}
        <div
          style={{
            background: 'var(--bg-card, #1e293b)',
            borderRadius: '14px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Header com Alternador de Visualização */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-main, #fff)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <i className="fas fa-weight-hanging" style={{ color: 'var(--primary, #818cf8)' }} />
                Força Bilateral (Dinamometria)
              </strong>
              <small style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.74rem', marginTop: '2px' }}>
                Corte de simetria: ≤10% Equilibrado | &gt;15% Risco
              </small>
            </div>

            {/* Alternador de Modo: Barras vs Radar */}
            <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <button
                type="button"
                onClick={() => setStrengthViewMode('bilateral')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  background: strengthViewMode === 'bilateral' ? 'var(--primary, #6366f1)' : 'transparent',
                  color: strengthViewMode === 'bilateral' ? '#fff' : 'var(--text-dim, #94a3b8)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <i className="fas fa-bars-progress" />
                Barras D vs E
              </button>
              <button
                type="button"
                onClick={() => setStrengthViewMode('radar')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  background: strengthViewMode === 'radar' ? 'var(--primary, #6366f1)' : 'transparent',
                  color: strengthViewMode === 'radar' ? '#fff' : 'var(--text-dim, #94a3b8)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <i className="fas fa-spider" />
                Radar
              </button>
              <button
                type="button"
                onClick={() => setStrengthViewMode('razoes')}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  border: 'none',
                  background: strengthViewMode === 'razoes' ? 'var(--primary, #6366f1)' : 'transparent',
                  color: strengthViewMode === 'razoes' ? '#fff' : 'var(--text-dim, #94a3b8)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <i className="fas fa-scale-balanced" />
                Razões &amp; %PC
              </button>
            </div>
          </div>

          {/* Conteúdo do Painel de Força */}
          <div style={{ flex: 1, minHeight: '260px', position: 'relative' }}>
            {strengthViewMode === 'bilateral' ? (
              strengthMovements.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                  {strengthMovements.map((mov, idx) => {
                    const pctD = Math.min(100, Math.round((mov.d / maxStrengthInSet) * 100));
                    const pctE = Math.min(100, Math.round((mov.e / maxStrengthInSet) * 100));
                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '10px',
                          border: `1px solid ${mov.status === 'critico' ? 'rgba(239, 68, 68, 0.35)' : mov.status === 'atencao' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(255, 255, 255, 0.06)'}`,
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main, #fff)' }}>
                            {mov.mov}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: mov.statusBg,
                              color: mov.statusColor,
                              border: `1px solid ${mov.statusColor}30`
                            }}
                          >
                            {mov.diff}% assimetria • {mov.statusLabel}
                          </span>
                        </div>

                        {/* Barra Direito (D) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#cbd5e1' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0d9488' }} />
                              Membro Direito (D)
                            </span>
                            <strong style={{ color: '#0d9488' }}>{mov.d} N</strong>
                          </div>
                          <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pctD}%`, background: '#0d9488', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>

                        {/* Barra Esquerdo (E) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#cbd5e1' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1' }} />
                              Membro Esquerdo (E)
                            </span>
                            <strong style={{ color: '#818cf8' }}>{mov.e} N</strong>
                          </div>
                          <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pctE}%`, background: '#6366f1', borderRadius: '4px', transition: 'width 0.4s ease' }} />
                          </div>
                        </div>

                        {/* Indicativo de déficit se houver assimetria */}
                        {mov.diff > 10 && (
                          <div style={{ fontSize: '0.72rem', color: mov.statusColor, display: 'flex', alignItems: 'center', gap: '5px', marginTop: '1px' }}>
                            <i className="fas fa-triangle-exclamation" style={{ fontSize: '0.68rem' }} />
                            <span>{mov.deficitLado} ({mov.diff}% menor que o contralateral)</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', color: 'var(--text-dim, #94a3b8)', padding: '20px', textAlign: 'center' }}>
                  <i className="fas fa-weight-hanging fa-2x" style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ fontSize: '0.84rem', margin: '0 0 10px 0' }}>Nenhum teste de força dinamométrica registrado ainda.</p>
                  <button onClick={onOpenNovoTeste} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                    Lançar Teste de Força
                  </button>
                </div>
              )
            ) : strengthViewMode === 'radar' ? (
              radarLabels.length > 0 ? (
                <div style={{ height: '260px', position: 'relative' }}>
                  <Radar data={radarChartData} options={radarOptions} />
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', color: 'var(--text-dim, #94a3b8)', padding: '20px', textAlign: 'center' }}>
                  <i className="fas fa-spider fa-2x" style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ fontSize: '0.84rem', margin: '0 0 10px 0' }}>Sem dados suficientes para mapa de teia radar.</p>
                </div>
              )
            ) : (
              /* MODO 'razoes': Razões Musculares & %PC */
              advancedStrengthRatios.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                  {advancedStrengthRatios.map((rz: AdvancedStrengthRatioItem, rIdx: number) => {
                    const statusBg = rz.statusGeral === 'critico' ? 'rgba(239, 68, 68, 0.15)' : rz.statusGeral === 'atencao' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)';
                    const statusColor = rz.statusGeral === 'critico' ? '#ef4444' : rz.statusGeral === 'atencao' ? '#f59e0b' : '#10b981';
                    const statusLabel = rz.statusGeral === 'critico' ? 'Risco Elevado' : rz.statusGeral === 'atencao' ? 'Atenção' : 'Equilibrado';

                    return (
                      <div
                        key={rIdx}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '10px',
                          border: `1px solid ${rz.statusGeral === 'critico' ? 'rgba(239, 68, 68, 0.35)' : rz.statusGeral === 'atencao' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.25)'}`,
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main, #fff)' }}>
                            {rz.nome}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: statusBg,
                              color: statusColor,
                              border: `1px solid ${statusColor}30`
                            }}
                          >
                            {rz.valorGeral !== null ? `${rz.valorGeral}${rz.unidade}` : '-'} • {statusLabel}
                          </span>
                        </div>

                        {/* Detalhe de Valores Unilaterais D e E se existirem */}
                        {(rz.valorD !== null || rz.valorE !== null) && (
                          <div style={{ display: 'flex', gap: '14px', fontSize: '0.74rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.02)', padding: '4px 8px', borderRadius: '6px' }}>
                            <span>
                              <strong style={{ color: '#0d9488' }}>Membro D:</strong> {rz.valorD !== null ? `${rz.valorD}${rz.unidade}` : 'N/A'}
                            </span>
                            <span>
                              <strong style={{ color: '#818cf8' }}>Membro E:</strong> {rz.valorE !== null ? `${rz.valorE}${rz.unidade}` : 'N/A'}
                            </span>
                            <span style={{ marginLeft: 'auto', color: 'var(--text-dim, #94a3b8)' }}>
                              Meta: {rz.referenciaFormatada}
                            </span>
                          </div>
                        )}

                        <div style={{ fontSize: '0.74rem', color: 'var(--text-main, #cbd5e1)', lineHeight: 1.4 }}>
                          {rz.diagnosticoClinico}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '5px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className="fas fa-bullseye" />
                          <span><strong>Diretriz de Treino:</strong> {rz.diretrizTreinador}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', color: 'var(--text-dim, #94a3b8)', padding: '20px', textAlign: 'center' }}>
                  <i className="fas fa-scale-balanced fa-2x" style={{ opacity: 0.3, marginBottom: '8px' }} />
                  <p style={{ fontSize: '0.84rem', margin: '0 0 6px 0' }}>Grupos musculares agonistas/antagonistas não mensurados na avaliação atual.</p>
                  <small style={{ fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)' }}>Necessário teste de extensão/flexão de joelho ou abdução/adução de quadril.</small>
                </div>
              )
            )}
          </div>
        </div>

        {/* Painel 2: Goniometria Dinâmica com Seletor Articular */}
        <div
          style={{
            background: 'var(--bg-card, #1e293b)',
            borderRadius: '14px',
            border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Header com Seletor Articular */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-main, #fff)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <i className="fas fa-chart-line" style={{ color: '#10b981' }} />
                Evolução Goniométrica (ADM)
              </strong>
              <small style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.74rem', marginTop: '2px' }}>
                {gonioArticulacao === 'tornozelo' && 'Normalidade: Lunge ≥35-45° | Joelho Estendido ≥20°'}
                {gonioArticulacao === 'joelho' && 'Normalidade: Flexão ≥130-140° | Poplíteo ≥80-90°'}
                {gonioArticulacao === 'ombro' && 'Normalidade: Rot. Ext. ≥80-100° | Rot. Int. ≥80-90°'}
              </small>
            </div>

            {/* Seletor Articular: Tornozelo | Joelho | Ombro */}
            <div style={{ display: 'inline-flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
              {(['tornozelo', 'joelho', 'ombro'] as const).map(j => {
                const labels = { tornozelo: '🦶 Tornozelo', joelho: '🦵 Joelho', ombro: '💪 Ombro' };
                const isActive = gonioArticulacao === j;
                return (
                  <button
                    key={j}
                    type="button"
                    onClick={() => setGonioArticulacao(j)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      background: isActive ? '#10b981' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-dim, #94a3b8)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {labels[j]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gráfico ou Estado Vazio */}
          <div style={{ flex: 1, minHeight: '260px', position: 'relative' }}>
            {hasGonioDataForSelectedJoint ? (
              <div style={{ height: '260px', position: 'relative' }}>
                <Line data={gonioChartData} options={gonioChartOptions} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '220px', color: 'var(--text-dim, #94a3b8)', padding: '20px', textAlign: 'center' }}>
                <i className="fas fa-ruler-combined fa-2x" style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ fontSize: '0.84rem', margin: '0 0 10px 0' }}>
                  {gonioDates.length > 0
                    ? `Nenhuma medição específica de ${gonioArticulacao} nos laudos deste aluno.`
                    : 'Nenhuma medição de goniometria registrada ainda.'}
                </p>
                <button onClick={onOpenNovoTeste} className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem' }}>
                  Lançar Goniometria
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🌟 PAINEL HOP TESTS (SIMETRIA LSI & RTS) */}
      {hopTestData && (
        <div
          style={{
            background: 'var(--bg-card, #1e293b)',
            borderRadius: '14px',
            border: `1px solid ${hopTestData.badgeCor}40`,
            borderLeft: `4px solid ${hopTestData.badgeCor}`,
            padding: '16px 18px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-main, #fff)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <i className="fas fa-person-running" style={{ color: hopTestData.badgeCor }} />
                Bateria de Hop Tests (Simetria LSI ≥ 90% para RTS)
              </strong>
              <small style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.74rem', marginTop: '2px' }}>
                Bateria canônica de Noyes para liberação de corrida, saltos e retorno ao esporte
                {hopTestData.membroAfetado && hopTestData.membroAfetado !== 'Nenhum' ? ` • Membro acometido: ${hopTestData.membroAfetado}` : ''}
              </small>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                LSI Médio: <strong style={{ color: hopTestData.badgeCor, fontSize: '1.05rem' }}>{hopTestData.lsiMedio}%</strong>
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: hopTestData.badgeBg,
                  color: hopTestData.badgeCor,
                  border: `1px solid ${hopTestData.badgeCor}50`
                }}
              >
                {hopTestData.badgeStatus}
              </span>
            </div>
          </div>

          {/* Cards dos 4 testes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
            {hopTestData.testes.map((t: any, idx: number) => {
              const tCor = t.status === 'otimo' ? '#10b981' : t.status === 'atencao' ? '#f59e0b' : '#ef4444';
              const tBg = t.status === 'otimo' ? 'rgba(16, 185, 129, 0.1)' : t.status === 'atencao' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)';
              return (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '10px',
                    border: `1px solid ${tCor}30`,
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f8fafc', display: 'block' }}>{t.nome}</span>
                      <small style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t.subtitulo}</small>
                    </div>
                    <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 6px', borderRadius: '6px', background: tBg, color: tCor }}>
                      LSI {t.lsiPct}%
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: '#cbd5e1', background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: '4px' }}>
                    <span><strong>D:</strong> {t.valorD} {t.unidade}</span>
                    <span><strong>E:</strong> {t.valorE} {t.unidade}</span>
                    <span style={{ color: '#94a3b8' }}>{t.ladoDominante}</span>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', lineHeight: 1.3 }}>
                    {t.interpretacao}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Parecer RTS e Diretriz do Treinador */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px', marginTop: '2px' }}>
            <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
              <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '3px' }}>
                <i className="fas fa-stethoscope" style={{ marginRight: '5px', color: '#818cf8' }} />
                Parecer Clínico RTS (Return to Sport):
              </strong>
              {hopTestData.parecerRTS}
            </div>

            <div style={{ padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.78rem', color: '#10b981', lineHeight: 1.45 }}>
              <strong style={{ color: '#10b981', display: 'block', marginBottom: '3px' }}>
                <i className="fas fa-bullseye" style={{ marginRight: '5px' }} />
                Diretriz para o Treinador de Musculação:
              </strong>
              {hopTestData.diretrizTreinador}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 PAINEL QUESTIONÁRIO VALIDADO VISA-P (TENDINOPATIA PATELAR • MCID = 13 PTS) */}
      {visaPData && visaPData.atual && (
        <div
          style={{
            background: 'var(--bg-card, #1e293b)',
            borderRadius: '14px',
            border: `1px solid ${visaPData.atual.badgeCor}40`,
            borderLeft: `4px solid ${visaPData.atual.badgeCor}`,
            padding: '16px 18px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <strong style={{ fontSize: '0.92rem', color: 'var(--text-main, #fff)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <i className="fas fa-clipboard-check" style={{ color: visaPData.atual.badgeCor }} />
                Escala Científica VISA-P — Tendinopatia Patelar (MCID ≥ 13 pts)
              </strong>
              <small style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.74rem', marginTop: '2px' }}>
                Victorian Institute of Sport Assessment – Patella (Visentini et al. / Wageck et al.) • Joelho: {visaPData.atual.membroAvaliado}
              </small>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {visaPData.anterior && visaPData.deltaPontos !== undefined && (
                <span
                  style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    padding: '3px 9px',
                    borderRadius: '10px',
                    background: visaPData.deltaPontos >= 13 ? 'rgba(16, 185, 129, 0.18)' : visaPData.deltaPontos > 0 ? 'rgba(56, 189, 248, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                    color: visaPData.deltaPontos >= 13 ? '#10b981' : visaPData.deltaPontos > 0 ? '#38bdf8' : '#ef4444',
                    border: `1px solid ${visaPData.deltaPontos >= 13 ? '#10b98150' : '#38bdf850'}`
                  }}
                >
                  {visaPData.anterior.scoreTotal} ➔ {visaPData.atual.scoreTotal} pts ({visaPData.deltaPontos >= 0 ? `+${visaPData.deltaPontos}` : visaPData.deltaPontos})
                  {visaPData.mcidAtingido ? ' • 🏆 MCID Atingido' : ''}
                </span>
              )}
              <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>
                Score: <strong style={{ color: visaPData.atual.badgeCor, fontSize: '1.1rem' }}>{visaPData.atual.scoreTotal}/100</strong>
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: visaPData.atual.badgeBg,
                  color: visaPData.atual.badgeCor,
                  border: `1px solid ${visaPData.atual.badgeCor}50`
                }}
              >
                {visaPData.atual.classificacaoLabel}
              </span>
            </div>
          </div>

          {/* 3 Subdomínios do VISA-P */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '10px 12px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>1. Sintomas & Dor (Q1, Q2, Q3, Q6)</span>
              <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{visaPData.atual.scoreSintomasDor} <small style={{ color: '#64748b' }}>/ 40 pts</small></strong>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Sentado, escadas, extensão e 10 hops</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '10px 12px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>2. Função Sob Carga (Q4 e Q5)</span>
              <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{visaPData.atual.scoreFuncaoCarga} <small style={{ color: '#64748b' }}>/ 20 pts</small></strong>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Afundo (Lunge) e Agachamento Profundo</div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '10px 12px' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>3. Capacidade Esportiva (Q7 e Q8)</span>
              <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{visaPData.atual.scoreCapacidadeEsportiva} <small style={{ color: '#64748b' }}>/ 40 pts</small></strong>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '2px' }}>Nível de treino e tempo tolerado ({visaPData.atual.respostas.q8TipoDorTreino})</div>
            </div>
          </div>

          {/* Parecer do Continuum Tendíneo e Diretriz para o Treinador */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '10px 12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.78rem', color: '#cbd5e1', lineHeight: 1.45 }}>
              <strong style={{ color: '#f8fafc', display: 'block', marginBottom: '3px' }}>
                <i className="fas fa-stethoscope" style={{ marginRight: '5px', color: '#fbbf24' }} />
                {visaPData.atual.estagioTendineo}:
              </strong>
              {visaPData.atual.parecerClinico}
              {visaPData.leituraComparativa && (
                <div style={{ marginTop: '4px', color: '#38bdf8', fontWeight: 600 }}>
                  {visaPData.leituraComparativa}
                </div>
              )}
            </div>

            <div style={{ padding: '10px 12px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)', fontSize: '0.78rem', color: '#10b981', lineHeight: 1.45 }}>
              <strong style={{ color: '#10b981', display: 'block', marginBottom: '3px' }}>
                <i className="fas fa-bullseye" style={{ marginRight: '5px' }} />
                Diretriz de Carga Tendínea para o Treinador:
              </strong>
              {visaPData.atual.diretrizTreinador}
            </div>
          </div>
        </div>
      )}

      {/* 🌟 PAINEL ACWR & MATRIZ DE DECISÃO DO WELLNESS (Gabbett / Hooper) */}
      <div
        style={{
          background: 'var(--bg-card, #1e293b)',
          borderRadius: '14px',
          border: `1px solid ${decisionMatrixData.semaforoCor}40`,
          borderLeft: `4px solid ${decisionMatrixData.semaforoCor}`,
          padding: '16px 18px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Cabeçalho do Card */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main, #fff)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <i className="fas fa-battery-half" style={{ color: decisionMatrixData.semaforoCor }} />
              Monitoramento de Carga ACWR & Matriz de Decisão do Wellness
            </strong>
            <small style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.74rem', marginTop: '2px' }}>
              Modelo de Gabbett (2016) e Matriz de Hooper — Carga Aguda (7d) vs Crônica (28d) cruzada com Prontidão Diária
            </small>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '12px',
              background: decisionMatrixData.semaforoBg,
              color: decisionMatrixData.semaforoCor,
              border: `1px solid ${decisionMatrixData.semaforoCor}50`
            }}
          >
            {decisionMatrixData.semaforoLabel}
          </span>
        </div>

        {/* Grade com 2 Blocos: 1. ACWR (Carga) e 2. Wellness (Recuperação) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '14px' }}>
          {/* BLOCO 1: RAZÃO ACWR */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: `1px solid ${acwrData.zonaCor}30`,
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600 }}>
                  Razão ACWR (Aguda / Crônica)
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: acwrData.zonaCor, lineHeight: 1 }}>
                    {acwrData.acwr.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: acwrData.zonaCor }}>
                    {acwrData.zona === 'sweet_spot' ? '🟢 Sweet Spot' : acwrData.zona === 'perigo' ? '🔴 Risco de Lesão 4x' : acwrData.zona === 'atencao' ? '🟡 Sobre-alcance' : '🔵 Sub-treinamento'}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#94a3b8' }}>
                <div><strong>Aguda 7d:</strong> {acwrData.cargaAguda7d} UA</div>
                <div><strong>Crônica sem:</strong> {acwrData.cargaCronica28dMediaSemanal} UA</div>
                <div style={{ color: '#64748b' }}>{acwrData.totalSessoes28d} sessões em 28d</div>
              </div>
            </div>

            {/* Barra de Zonas de Risco de Gabbett */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ position: 'relative', height: '10px', borderRadius: '5px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: '30%', background: '#38bdf8', opacity: acwrData.zona === 'subtreinamento' ? 1 : 0.35 }} title="Subtreinamento (< 0.80)" />
                <div style={{ width: '35%', background: '#10b981', opacity: acwrData.zona === 'sweet_spot' ? 1 : 0.35 }} title="Sweet Spot (0.80 - 1.30)" />
                <div style={{ width: '15%', background: '#f59e0b', opacity: acwrData.zona === 'atencao' ? 1 : 0.35 }} title="Atenção (1.30 - 1.49)" />
                <div style={{ width: '20%', background: '#ef4444', opacity: acwrData.zona === 'perigo' ? 1 : 0.35 }} title="Danger Zone (≥ 1.50)" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: '#64748b' }}>
                <span>0.0</span>
                <span>0.80 (Sweet Spot)</span>
                <span>1.30</span>
                <span>1.50+ (Perigo)</span>
              </div>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-main, #cbd5e1)', lineHeight: 1.4 }}>
              {acwrData.diagnosticoClinico}
            </div>
          </div>

          {/* BLOCO 2: PRONTIDÃO PSICOFISIOLÓGICA (WELLNESS) */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: `1px solid ${decisionMatrixData.semaforoCor}30`,
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim, #94a3b8)', fontWeight: 600 }}>
                  Prontidão Biológica (Wellness)
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, color: decisionMatrixData.semaforoCor, lineHeight: 1 }}>
                    {decisionMatrixData.wellnessScore}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>/ 30 pts</span>
                  <span style={{ fontSize: '0.74rem', fontWeight: 700, color: decisionMatrixData.semaforoCor }}>
                    • {decisionMatrixData.wellnessStatusLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenNovoTeste}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.7rem', padding: '3px 8px', borderColor: 'rgba(255,255,255,0.15)' }}
              >
                + Check-in
              </button>
            </div>

            {/* Triplo Indicador (Sono, Fadiga, Dor) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Sono</span>
                <strong style={{ fontSize: '0.82rem', color: '#818cf8' }}>
                  {evolutionSeries.wellness?.[0]?.sono ? `${evolutionSeries.wellness[0].sono}/10` : 'Normal'}
                </strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Fadiga</span>
                <strong style={{ fontSize: '0.82rem', color: '#f59e0b' }}>
                  {evolutionSeries.wellness?.[0]?.fadiga ? `${evolutionSeries.wellness[0].fadiga}/10` : 'Controlada'}
                </strong>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block' }}>Dor Muscular</span>
                <strong style={{ fontSize: '0.82rem', color: '#ef4444' }}>
                  {evolutionSeries.wellness?.[0]?.dorMuscular ? `${evolutionSeries.wellness[0].dorMuscular}/10` : '0/10'}
                </strong>
              </div>
            </div>

            <div style={{ fontSize: '0.74rem', color: 'var(--text-main, #cbd5e1)', lineHeight: 1.4 }}>
              {decisionMatrixData.parecerProntidao}
            </div>
          </div>
        </div>

        {/* FAIXA DE CONDUTA IMEDIATA PARA A SALA DE MUSCULAÇÃO */}
        <div
          style={{
            padding: '12px 14px',
            background: decisionMatrixData.semaforoBg,
            border: `1px solid ${decisionMatrixData.semaforoCor}50`,
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: decisionMatrixData.semaforoCor }}>
              🎯 DIRETRIZ INTERDISCIPLINAR PARA O TREINADOR DE HOJE:
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-main, #fff)', fontWeight: 600 }}>
              {decisionMatrixData.diretrizTreinador}
            </span>
          </div>

          {/* Tags de Ações Específicas */}
          {decisionMatrixData.acoesEspecificas?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
              {decisionMatrixData.acoesEspecificas.map((acao: string, aIdx: number) => (
                <span
                  key={aIdx}
                  style={{
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    color: '#f8fafc',
                    border: `1px solid ${decisionMatrixData.semaforoCor}40`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <i className="fas fa-check" style={{ fontSize: '0.65rem', color: decisionMatrixData.semaforoCor }} />
                  {acao}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. MAPEAMENTO ANATÔMICO DAS QUEIXAS & ESCALA EVA */}
      <div
        style={{
          background: 'var(--bg-card, #1e293b)',
          borderRadius: '14px',
          border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
          padding: '16px 18px',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <strong style={{ fontSize: '0.92rem', color: 'var(--text-main, #fff)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <i className="fas fa-heartbeat" style={{ color: '#ef4444' }} />
              Mapeamento de Queixas Clínicas & Dor (Escala EVA)
            </strong>
            <small style={{ color: 'var(--text-dim, #94a3b8)', display: 'block', fontSize: '0.74rem', marginTop: '2px' }}>
              Monitoramento analógico visual (0 a 10) e agravantes funcionais
            </small>
          </div>
          {mappedQueixas.length > 0 && (
            <span style={{ fontSize: '0.74rem', padding: '3px 10px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', fontWeight: 700 }}>
              {mappedQueixas.length} queixa(s) documentada(s)
            </span>
          )}
        </div>

        {mappedQueixas.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Grid de Cards Anatômicos de Queixas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '12px' }}>
              {mappedQueixas.map((q, qIdx) => {
                const dorVal = q.intensidade;
                const dorColor = dorVal === 0 ? '#10b981' : dorVal <= 3 ? '#10b981' : dorVal <= 6 ? '#f59e0b' : '#ef4444';
                const dorPct = Math.min(100, (dorVal / 10) * 100);

                return (
                  <div
                    key={qIdx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderLeft: `4px solid ${dorColor}`,
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main, #fff)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fas fa-map-pin" style={{ color: dorColor, fontSize: '0.75rem' }} />
                        {q.regiao}
                      </span>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: `${dorColor}22`,
                          color: dorColor,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {dorVal}/10 EVA
                      </span>
                    </div>

                    {/* Régua visual colorida de dor 0 a 10 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${dorPct}%`,
                            background: dorColor,
                            borderRadius: '3px',
                            transition: 'width 0.4s ease'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#64748b' }}>
                        <span>0 (Sem dor)</span>
                        <span>5 (Moderada)</span>
                        <span>10 (Intensa)</span>
                      </div>
                    </div>

                    {/* Evolução Longitudinal se houver T1 vs T2 */}
                    {q.t1 !== undefined && q.t2 !== undefined && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim, #94a3b8)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>Inicial (T1): <strong>{q.t1}</strong> → Atual (T2): <strong>{q.t2}</strong></span>
                        {q.delta !== undefined && (
                          <span style={{ color: q.delta <= 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                            {q.delta < 0 ? `⬇️ ${Math.abs(q.delta)} pts` : q.delta > 0 ? `⬆️ +${q.delta} pts` : 'Estável'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Tags CIF de agravantes se houver */}
                    {q.agravantes && q.agravantes.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                        {q.agravantes.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            style={{
                              fontSize: '0.68rem',
                              padding: '2px 6px',
                              borderRadius: '6px',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#cbd5e1'
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Gráfico de Barras Comparativo se houver histórico longitudinal */}
            {evaItems.length > 0 && (
              <div style={{ marginTop: '10px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1' }}>
                    Comparativo Longitudinal T1 vs T2 (Resolução Clínica):
                  </span>
                </div>
                <div style={{ height: '220px', position: 'relative' }}>
                  <Bar data={evaChartData} options={evaChartOptions} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '16px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <i className="fas fa-shield-heart fa-2x" style={{ color: '#10b981' }} />
            <div>
              <strong style={{ fontSize: '0.88rem', color: '#10b981', display: 'block' }}>
                Prontuário Assintomático
              </strong>
              <small style={{ color: 'var(--text-dim, #94a3b8)', fontSize: '0.78rem' }}>
                Nenhuma queixa de dor musculoesquelética ativa relatada nas avaliações.
              </small>
            </div>
          </div>
        )}
      </div>

      {/* 4. FATORES CLÍNICOS DE DESTAQUE (DO LAUDO DE REAVALIAÇÃO) */}
      {longitudinal?.narrative && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Seção de Discussão Clínica & Síntese */}
          {longitudinal.narrative.discussaoClinica && (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
                border: '1px solid rgba(129, 140, 248, 0.25)',
                borderLeft: '4px solid #818cf8',
                borderRadius: '12px',
                padding: '16px 20px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                <strong style={{ fontSize: '0.88rem', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-brain" />
                  Parecer Clínico Longitudinal Personalizado
                </strong>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94a3b8)', background: 'rgba(129, 140, 248, 0.12)', padding: '2px 8px', borderRadius: '10px' }}>
                  Inteligência Clínica & Biomecânica
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-main, #fff)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {longitudinal.narrative.discussaoClinica}
              </p>
            </div>
          )}

          {/* Cards de Análises Segmentares (Específicos para este Aluno) */}
          {longitudinal.narrative.analisesSegmentares && longitudinal.narrative.analisesSegmentares.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {longitudinal.narrative.analisesSegmentares.map((seg: any, sIdx: number) => (
                <div
                  key={sIdx}
                  style={{
                    background: 'var(--bg-card, #1e293b)',
                    border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
                    borderRadius: '10px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <strong style={{ fontSize: '0.82rem', color: 'var(--primary, #38bdf8)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fas fa-bone" /> {seg.titulo}
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-main, #fff)', lineHeight: 1.45 }}>
                    {seg.diagnosticoFuncional}
                  </p>
                  {seg.recomendacao && (
                    <div style={{ fontSize: '0.74rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.08)', padding: '6px 8px', borderRadius: '6px', marginTop: '4px' }}>
                      <i className="fas fa-check-circle" style={{ marginRight: '4px' }} />
                      {seg.recomendacao}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

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
        </div>
      )}
    </div>
  );
}
