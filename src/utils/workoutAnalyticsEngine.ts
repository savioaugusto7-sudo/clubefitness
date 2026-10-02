/**
 * workoutAnalyticsEngine.ts
 * Motor de Inteligência & Análise de Sobrecarga Progressiva e Evolução de Treino
 * Clube Fitness
 */

export interface LoadHistoryPoint {
  data: string;
  carga: number | string;
  reps?: string;
  unidadeCarga?: string;
  origem?: string;
}

export interface ExerciseProgressionAnalysis {
  nome: string;
  grupo: string;
  cargaInicial: number;
  cargaMaxima: number;
  cargaAtual: number;
  unidadeCarga: string;
  variacaoKg: number;
  variacaoPercent: number;
  series: number;
  reps: string;
  volumeLoadAtual: number;
  status: 'sobrecarga_ativa' | 'plato' | 'deload' | 'estavel' | 'novo';
  statusLabel: string;
  diasEmTreino: number;
  pontosEvolucao: { data: string; carga: number; reps: string }[];
}

export interface MuscleGroupEvolution {
  grupo: string;
  totalExercicios: number;
  ganhoPercentMedio: number;
  volumeLoadTotal: number;
  status: 'em_alta' | 'estagnado' | 'normal';
}

export interface WorkoutEvolutionSummary {
  alunoNome: string;
  ganhoForcaGlobalPercent: number;
  volumeLoadTotalAtual: number;
  volumeLoadTotalInicial: number;
  variacaoVolumePercent: number;
  totalExerciciosAvaliados: number;
  exercicioDestaque: {
    nome: string;
    grupo: string;
    ganhoPercent: number;
    variacaoKg: number;
    unidade: string;
  } | null;
  totalCiclosConcluidos: number;
  diasSobPeriodizacao: number;
  gruposMusculares: MuscleGroupEvolution[];
  exercicios: ExerciseProgressionAnalysis[];
  diagnosticoClinico: string[];
}

/**
 * Normaliza uma carga informada como string (ex: "35kg", "35", "12.5") para número limpo
 */
export function parseCargaNumber(val: any): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).toLowerCase().replace(/kg|kilos|libras|lbs/g, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Normaliza repetições (ex: "10-12", "12", "15") para um número médio representativo de volume
 */
export function parseRepsAvg(val: any): number {
  if (!val) return 10;
  const str = String(val).trim();
  if (str.includes('-')) {
    const parts = str.split('-').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
    if (parts.length >= 2) return (parts[0] + parts[1]) / 2;
    if (parts.length === 1) return parts[0];
  }
  const single = parseFloat(str);
  return isNaN(single) ? 10 : single;
}

/**
 * Analisa a progressão de um único exercício com base em seu historicoCargas
 */
export function analyzeExerciseProgression(
  ex: any,
  historicoCargas: LoadHistoryPoint[] = []
): ExerciseProgressionAnalysis {
  const nome = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : (ex.exercicioId || ex.nome || 'Exercício');
  const grupo = typeof ex.exercicioId === 'object' ? (ex.exercicioId?.grupo || 'Geral') : (ex.grupo || 'Geral');
  const series = Number(ex.series) || 3;
  const repsStr = String(ex.repeticoes || ex.reps || '10-12');
  const repsNum = parseRepsAvg(repsStr);
  const unidadeCarga = ex.unidadeCarga || 'kg';

  // Montar linha do tempo de cargas cronológica
  const validHistory = Array.isArray(historicoCargas) ? [...historicoCargas] : [];
  
  // Se o exercício tem carga atual e não está no histórico, adiciona
  const currentCargaNum = parseCargaNumber(ex.carga);
  if (validHistory.length === 0 && currentCargaNum > 0) {
    validHistory.push({
      data: new Date().toISOString().split('T')[0],
      carga: currentCargaNum,
      reps: repsStr,
      unidadeCarga
    });
  }

  // Filtrar e converter pontos
  const pontos = validHistory
    .map(p => ({
      data: p.data || '',
      carga: parseCargaNumber(p.carga),
      reps: String(p.reps || repsStr)
    }))
    .filter(p => p.carga > 0)
    .sort((a, b) => (a.data > b.data ? 1 : -1));

  // Se após filtrar ainda estiver vazio mas tiver currentCarga
  if (pontos.length === 0 && currentCargaNum > 0) {
    pontos.push({
      data: new Date().toISOString().split('T')[0],
      carga: currentCargaNum,
      reps: repsStr
    });
  }

  const cargaInicial = pontos.length > 0 ? pontos[0].carga : currentCargaNum;
  const cargaAtual = currentCargaNum > 0 ? currentCargaNum : (pontos.length > 0 ? pontos[pontos.length - 1].carga : 0);
  const cargaMaxima = pontos.reduce((max, p) => (p.carga > max ? p.carga : max), Math.max(cargaInicial, cargaAtual));

  const variacaoKg = cargaAtual - cargaInicial;
  const variacaoPercent = cargaInicial > 0 ? ((cargaAtual - cargaInicial) / cargaInicial) * 100 : 0;
  const volumeLoadAtual = Math.round(series * repsNum * cargaAtual);

  // Calcular dias em treino
  let diasEmTreino = 0;
  if (pontos.length >= 2 && pontos[0].data && pontos[pontos.length - 1].data) {
    const d1 = new Date(pontos[0].data).getTime();
    const d2 = new Date(pontos[pontos.length - 1].data).getTime();
    diasEmTreino = Math.max(0, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
  }

  // Status Inteligente
  let status: 'sobrecarga_ativa' | 'plato' | 'deload' | 'estavel' | 'novo' = 'estavel';
  let statusLabel = 'Estável';

  if (pontos.length <= 1) {
    status = 'novo';
    statusLabel = 'Iniciando Registro';
  } else if (variacaoPercent >= 5) {
    status = 'sobrecarga_ativa';
    statusLabel = `Sobrecarga Ativa (+${variacaoPercent.toFixed(0)}%)`;
  } else if (variacaoPercent <= -5) {
    status = 'deload';
    statusLabel = `Deload / Readaptação (${variacaoPercent.toFixed(0)}%)`;
  } else if (diasEmTreino >= 45 && variacaoKg === 0) {
    status = 'plato';
    statusLabel = 'Platô (>45 dias sem alteração)';
  } else {
    status = 'estavel';
    statusLabel = 'Consolidação de Força';
  }

  return {
    nome,
    grupo,
    cargaInicial: Math.round(cargaInicial * 10) / 10,
    cargaMaxima: Math.round(cargaMaxima * 10) / 10,
    cargaAtual: Math.round(cargaAtual * 10) / 10,
    unidadeCarga,
    variacaoKg: Math.round(variacaoKg * 10) / 10,
    variacaoPercent: Math.round(variacaoPercent * 10) / 10,
    series,
    reps: repsStr,
    volumeLoadAtual,
    status,
    statusLabel,
    diasEmTreino,
    pontosEvolucao: pontos
  };
}

/**
 * Agrupa exercícios e gera análise completa da ficha e do histórico
 */
export function buildWorkoutEvolutionSummary(
  clientName: string,
  currentSheets: any[] = [],
  workoutHistoryList: any[] = []
): WorkoutEvolutionSummary {
  // 1. Extrair todos os exercícios das fichas atuais
  const exercisesMap = new Map<string, any>();

  currentSheets.forEach(sheet => {
    (sheet.exercicios || []).forEach((ex: any) => {
      const nome = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : (ex.exercicioId || ex.nome || 'Exercício');
      if (!exercisesMap.has(nome)) {
        exercisesMap.set(nome, ex);
      }
    });
  });

  // Também verificar se há exercícios relevantes no histórico que não estão na ficha atual
  workoutHistoryList.forEach(hist => {
    const monSheets = hist.snapshot?.fichasMonitorado || [];
    const livSheets = hist.snapshot?.fichasLivre || [];
    [...monSheets, ...livSheets].forEach(s => {
      (s.exercicios || []).forEach((ex: any) => {
        const nome = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : (ex.exercicioId || ex.nome || 'Exercício');
        if (!exercisesMap.has(nome) && ex.historicoCargas && ex.historicoCargas.length > 1) {
          exercisesMap.set(nome, ex);
        }
      });
    });
  });

  // 2. Analisar cada exercício
  const analyzedExercises: ExerciseProgressionAnalysis[] = [];
  exercisesMap.forEach(ex => {
    const analysis = analyzeExerciseProgression(ex, ex.historicoCargas || []);
    analyzedExercises.push(analysis);
  });

  // Ordenar: primeiro os com maior variação percentual
  analyzedExercises.sort((a, b) => b.variacaoPercent - a.variacaoPercent);

  // 3. Cálculos Globais
  let totalVolumeAtual = 0;
  let totalVolumeInicial = 0;
  let somaPercent = 0;
  let countWithProgression = 0;

  analyzedExercises.forEach(ex => {
    totalVolumeAtual += ex.volumeLoadAtual;
    const initialVolume = Math.round(ex.series * parseRepsAvg(ex.reps) * ex.cargaInicial);
    totalVolumeInicial += initialVolume;

    if (ex.cargaInicial > 0) {
      somaPercent += ex.variacaoPercent;
      countWithProgression++;
    }
  });

  const ganhoForcaGlobalPercent = countWithProgression > 0 
    ? Math.round((somaPercent / countWithProgression) * 10) / 10 
    : 0;

  const variacaoVolumePercent = totalVolumeInicial > 0 
    ? Math.round(((totalVolumeAtual - totalVolumeInicial) / totalVolumeInicial) * 1000) / 10 
    : 0;

  // 4. Exercício Destaque
  let exercicioDestaque: WorkoutEvolutionSummary['exercicioDestaque'] = null;
  const topExercise = analyzedExercises.find(e => e.variacaoPercent > 0 && e.cargaInicial > 0);
  if (topExercise) {
    exercicioDestaque = {
      nome: topExercise.nome,
      grupo: topExercise.grupo,
      ganhoPercent: topExercise.variacaoPercent,
      variacaoKg: topExercise.variacaoKg,
      unidade: topExercise.unidadeCarga
    };
  }

  // 5. Agrupamento por Região Muscular
  const groupsMap = new Map<string, { totalEx: number; sumPercent: number; volume: number }>();
  analyzedExercises.forEach(ex => {
    const g = ex.grupo || 'Geral';
    const cur = groupsMap.get(g) || { totalEx: 0, sumPercent: 0, volume: 0 };
    cur.totalEx += 1;
    cur.sumPercent += ex.variacaoPercent;
    cur.volume += ex.volumeLoadAtual;
    groupsMap.set(g, cur);
  });

  const gruposMusculares: MuscleGroupEvolution[] = [];
  groupsMap.forEach((val, key) => {
    const avgGain = val.totalEx > 0 ? Math.round((val.sumPercent / val.totalEx) * 10) / 10 : 0;
    gruposMusculares.push({
      grupo: key,
      totalExercicios: val.totalEx,
      ganhoPercentMedio: avgGain,
      volumeLoadTotal: val.volume,
      status: avgGain >= 15 ? 'em_alta' : avgGain <= 0 ? 'estagnado' : 'normal'
    });
  });

  gruposMusculares.sort((a, b) => b.ganhoPercentMedio - a.ganhoPercentMedio);

  // 6. Diagnóstico Clínico / Recomendações Automatizadas
  const diagnosticoClinico: string[] = [];

  if (ganhoForcaGlobalPercent >= 15) {
    diagnosticoClinico.push(`🌟 Resposta biomecânica excelente: Ganho global ponderado de força de +${ganhoForcaGlobalPercent}%.`);
  } else if (ganhoForcaGlobalPercent > 0) {
    diagnosticoClinico.push(`📈 Progressão consistente de força em consolidação (+${ganhoForcaGlobalPercent}%).`);
  } else {
    diagnosticoClinico.push(`⚖️ Treino focado em adaptação neural e manutenção de técnica.`);
  }

  const platoExercises = analyzedExercises.filter(e => e.status === 'plato');
  if (platoExercises.length > 0) {
    const names = platoExercises.slice(0, 3).map(e => e.nome).join(', ');
    diagnosticoClinico.push(`⚠️ Alerta de Platô em ${platoExercises.length} exercício(s) (${names}): Sugere-se variação de estímulo (dropset, cadência ou nova angulação).`);
  }

  const highestGroup = gruposMusculares[0];
  const lowestGroup = gruposMusculares[gruposMusculares.length - 1];
  if (highestGroup && lowestGroup && highestGroup.grupo !== lowestGroup.grupo && highestGroup.ganhoPercentMedio - lowestGroup.ganhoPercentMedio >= 20) {
    diagnosticoClinico.push(`🔍 Assimetria de desenvolvimento: Grupamento "${highestGroup.grupo}" avançou +${highestGroup.ganhoPercentMedio}%, enquanto "${lowestGroup.grupo}" registrou +${lowestGroup.ganhoPercentMedio}%. Recomenda-se balancear o volume load.`);
  }

  // 7. Dados de Ciclos
  const totalCiclosConcluidos = workoutHistoryList.length;
  let diasSobPeriodizacao = 0;
  if (workoutHistoryList.length > 0) {
    const dates = workoutHistoryList
      .map(h => new Date(h.createdAt || h.dataInicio || '').getTime())
      .filter(t => !isNaN(t))
      .sort();
    if (dates.length > 0) {
      const first = dates[0];
      const now = Date.now();
      diasSobPeriodizacao = Math.max(1, Math.round((now - first) / (1000 * 60 * 60 * 24)));
    }
  }

  return {
    alunoNome: clientName,
    ganhoForcaGlobalPercent,
    volumeLoadTotalAtual: totalVolumeAtual,
    volumeLoadTotalInicial: totalVolumeInicial,
    variacaoVolumePercent,
    totalExerciciosAvaliados: analyzedExercises.length,
    exercicioDestaque,
    totalCiclosConcluidos,
    diasSobPeriodizacao,
    gruposMusculares,
    exercicios: analyzedExercises,
    diagnosticoClinico
  };
}
