/**
 * Módulo especializado em Fisiologia e Variáveis de Treino:
 * Cálculo de Tempo Sob Tensão (TUT), Descansos e Tempo Previsto de Sessão.
 * 
 * Regra cardinal: Sem fallback automático arbitrário — quando o ritmo não é
 * informado, o sistema sinaliza pendência técnica para garantir precisão na prescrição.
 */

export interface TempoOption {
  id: string;
  valor: string;
  label: string;
  tempoSegundosPorRep?: number;
  tempoSegundosPorSerie?: number;
  descricao: string;
  tipo: 'cadencia' | 'fixo' | 'cardio';
}

export const RITMO_OPTIONS: TempoOption[] = [
  // Cadências tradicionais por repetição
  {
    id: '2-1',
    valor: '2-1',
    label: '2-1 (3s por repetição)',
    tempoSegundosPorRep: 3,
    descricao: '2s descida / 1s subida • Dinâmico / Padrão',
    tipo: 'cadencia'
  },
  {
    id: '2-0-2-0',
    valor: '2-0-2-0',
    label: '2-0-2-0 (4s por repetição)',
    tempoSegundosPorRep: 4,
    descricao: '2s descida / 2s subida • Tensão Contínua',
    tipo: 'cadencia'
  },
  {
    id: '3-0-1-0',
    valor: '3-0-1-0',
    label: '3-0-1-0 (4s por repetição)',
    tempoSegundosPorRep: 4,
    descricao: '3s descida excêntrica / 1s subida • Hipertrofia',
    tipo: 'cadencia'
  },
  {
    id: '4-0-2-0',
    valor: '4-0-2-0',
    label: '4-0-2-0 (6s por repetição)',
    tempoSegundosPorRep: 6,
    descricao: '4s descida / 2s subida • Alta Sobrecarga Excêntrica',
    tipo: 'cadencia'
  },
  {
    id: '1-0-1-0',
    valor: '1-0-1-0',
    label: '1-0-1-0 (2s por repetição)',
    tempoSegundosPorRep: 2,
    descricao: '1s descida / 1s subida • Potência e Explosão',
    tipo: 'cadencia'
  },
  // Isometrias e tempos fixos curtos por série
  {
    id: '20s',
    valor: '20s',
    label: '20s por série (Isometria)',
    tempoSegundosPorSerie: 20,
    descricao: 'Duração contínua de 20s sob tensão',
    tipo: 'fixo'
  },
  {
    id: '30s',
    valor: '30s',
    label: '30s por série (Isometria)',
    tempoSegundosPorSerie: 30,
    descricao: 'Duração contínua de 30s sob tensão (ex: Prancha)',
    tipo: 'fixo'
  },
  {
    id: '40s',
    valor: '40s',
    label: '40s por série (Isometria)',
    tempoSegundosPorSerie: 40,
    descricao: 'Duração contínua de 40s sob tensão',
    tipo: 'fixo'
  },
  {
    id: '45s',
    valor: '45s',
    label: '45s por série (Isometria)',
    tempoSegundosPorSerie: 45,
    descricao: 'Duração contínua de 45s sob tensão',
    tipo: 'fixo'
  },
  {
    id: '60s',
    valor: '60s',
    label: '60s por série (Isometria)',
    tempoSegundosPorSerie: 60,
    descricao: 'Duração contínua de 1 minuto sob tensão',
    tipo: 'fixo'
  },
  // Cardio / Tempo Contínuo (Aeróbico / Esteira / Bike)
  {
    id: '2min',
    valor: '2 min',
    label: '2 min (120s)',
    tempoSegundosPorSerie: 120,
    descricao: 'Tiro curto / Aquecimento inicial',
    tipo: 'cardio'
  },
  {
    id: '5min',
    valor: '5 min',
    label: '5 min (300s)',
    tempoSegundosPorSerie: 300,
    descricao: 'Aquecimento geral na esteira/bike',
    tipo: 'cardio'
  },
  {
    id: '6min',
    valor: '6 min',
    label: '6 min (360s)',
    tempoSegundosPorSerie: 360,
    descricao: 'Cardio contínuo moderado',
    tipo: 'cardio'
  },
  {
    id: '10min',
    valor: '10 min',
    label: '10 min (600s)',
    tempoSegundosPorSerie: 600,
    descricao: 'Cardio contínuo intermediário',
    tipo: 'cardio'
  },
  {
    id: '15min',
    valor: '15 min',
    label: '15 min (900s)',
    tempoSegundosPorSerie: 900,
    descricao: 'Sessão aeróbica contínua',
    tipo: 'cardio'
  },
  {
    id: '20min',
    valor: '20 min',
    label: '20 min (1200s)',
    tempoSegundosPorSerie: 1200,
    descricao: 'Endurance / Condicionamento',
    tipo: 'cardio'
  },
  {
    id: '30min',
    valor: '30 min',
    label: '30 min (1800s)',
    tempoSegundosPorSerie: 1800,
    descricao: 'Treino aeróbico prolongado',
    tipo: 'cardio'
  }
];

/**
 * Normaliza repetições para uma média aritmética
 * Ex: "10-12" => 11, "12" => 12, "8 a 10" => 9
 */
export function parseRepsAvg(val: any): number {
  if (!val) return 10;
  const str = String(val).trim().toLowerCase();
  
  if (str.includes('-')) {
    const parts = str.split('-').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
    if (parts.length >= 2) return (parts[0] + parts[1]) / 2;
    if (parts.length === 1) return parts[0];
  }
  if (str.includes(' a ')) {
    const parts = str.split(' a ').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
    if (parts.length >= 2) return (parts[0] + parts[1]) / 2;
    if (parts.length === 1) return parts[0];
  }

  const matchNum = str.match(/\d+(\.\d+)?/);
  if (matchNum) {
    return parseFloat(matchNum[0]);
  }
  return 10;
}

/**
 * Converte valor de descanso para segundos
 * Ex: 60, "60s", "90", "1:30" => 90
 */
export function parseDescansoSeconds(descanso: any): number {
  if (descanso === undefined || descanso === null || descanso === '') return 60;
  if (typeof descanso === 'number') return Math.max(0, descanso);

  const str = String(descanso).trim().toLowerCase();
  if (str.includes(':')) {
    const parts = str.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return (parts[0] * 60) + parts[1];
    }
  }

  const num = parseInt(str.replace(/\D/g, ''), 10);
  return isNaN(num) ? 60 : Math.max(0, num);
}

/**
 * Interpreta o ritmo/cadência informado e calcula a duração de UMA série.
 * Retorna isValid: false se o profissional não informou ritmo.
 */
export function parseTempoExecucaoSerie(
  ritmo: any,
  reps: any
): {
  secondsPerSet: number;
  secondsPerRep?: number;
  isValid: boolean;
  tipo: 'cadencia' | 'fixo' | 'cardio' | 'invalido';
  labelExplicativo: string;
} {
  if (!ritmo || typeof ritmo !== 'string' || !ritmo.trim()) {
    return {
      secondsPerSet: 0,
      isValid: false,
      tipo: 'invalido',
      labelExplicativo: 'Ritmo não informado'
    };
  }

  const clean = ritmo.trim().toLowerCase();

  // 1. Formato Relógio mm:ss (ex: "06:00", "6:00", "15:30")
  if (/^\d{1,3}:\d{2}$/.test(clean)) {
    const parts = clean.split(':').map(p => parseInt(p, 10));
    const secs = (parts[0] * 60) + parts[1];
    if (secs > 0) {
      const minPart = Math.floor(secs / 60);
      const remSec = secs % 60;
      const fmtStr = remSec > 0 ? `${minPart}m ${remSec}s` : `${minPart} min`;
      return {
        secondsPerSet: secs,
        isValid: true,
        tipo: 'cardio',
        labelExplicativo: `${fmtStr} (${secs}s contínuos)`
      };
    }
  }

  // 2. Horas (ex: "1h", "1 h", "1.5h", "1 hora", "1 horas")
  const matchH = clean.match(/^(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hora|horas)$/i);
  if (matchH) {
    const hours = parseFloat(matchH[1].replace(',', '.'));
    const secs = Math.round(hours * 3600);
    if (secs > 0) {
      return {
        secondsPerSet: secs,
        isValid: true,
        tipo: 'cardio',
        labelExplicativo: `${hours}h (${secs}s contínuos)`
      };
    }
  }

  // 3. Minutos (ex: "6 min", "6min", "6m", "6 mins", "6 minuto", "6 minutos", "6.5 min")
  const matchMin = clean.match(/^(\d+(?:[.,]\d+)?)\s*(min|mins|minuto|minutos|m)$/i);
  if (matchMin) {
    const mins = parseFloat(matchMin[1].replace(',', '.'));
    const secs = Math.round(mins * 60);
    if (secs > 0) {
      const minPart = Math.floor(secs / 60);
      const remSec = secs % 60;
      const fmtStr = remSec > 0 ? `${minPart}m ${remSec}s` : `${mins} min`;
      return {
        secondsPerSet: secs,
        isValid: true,
        tipo: 'cardio',
        labelExplicativo: `${fmtStr} (${secs}s contínuos)`
      };
    }
  }

  // 4. Segundos explícitos (ex: "360s", "360 seg", "360seg", "360 segundos", "45s", "isometria 30s")
  // Não deve conflitar com cadência hífen (ex: "2-1")
  if (!clean.includes('-') && (clean.includes('s') || clean.includes('"') || clean.includes('seg'))) {
    const numPart = clean.match(/\d+/);
    if (numPart) {
      const secs = parseInt(numPart[0], 10);
      if (secs > 0) {
        const isLongCardio = secs >= 90;
        const minPart = Math.floor(secs / 60);
        const remSec = secs % 60;
        const fmtStr = minPart > 0 ? (remSec > 0 ? `${minPart}m ${remSec}s` : `${minPart} min`) : `${secs}s`;
        return {
          secondsPerSet: secs,
          isValid: true,
          tipo: isLongCardio ? 'cardio' : 'fixo',
          labelExplicativo: minPart > 0 ? `${fmtStr} (${secs}s contínuos)` : `${secs}s contínuos`
        };
      }
    }
  }

  // 5. Cadência clássica com hífen (ex: "2-1", "2-0-2-0", "3-0-1-0", "4-0-2-0")
  if (clean.includes('-')) {
    const parts = clean.split('-').map(p => parseFloat(p.trim())).filter(p => !isNaN(p));
    if (parts.length >= 2) {
      const secondsPerRep = parts.reduce((acc, cur) => acc + cur, 0);
      if (secondsPerRep > 0) {
        const repsAvg = parseRepsAvg(reps);
        const totalSerie = Math.round(repsAvg * secondsPerRep);
        return {
          secondsPerSet: totalSerie,
          secondsPerRep,
          isValid: true,
          tipo: 'cadencia',
          labelExplicativo: `${secondsPerRep}s/rep (${clean})`
        };
      }
    }
  }

  // 6. Número isolado digitado
  const onlyNum = parseFloat(clean);
  if (!isNaN(onlyNum) && onlyNum > 0) {
    if (onlyNum <= 10) {
      // Cadência em segundos por repetição
      const repsAvg = parseRepsAvg(reps);
      const totalSerie = Math.round(repsAvg * onlyNum);
      return {
        secondsPerSet: totalSerie,
        secondsPerRep: onlyNum,
        isValid: true,
        tipo: 'cadencia',
        labelExplicativo: `${onlyNum}s por repetição`
      };
    } else {
      // Tempo fixo em segundos por série (ex: 360 ou 60)
      const minPart = Math.floor(onlyNum / 60);
      const remSec = Math.round(onlyNum % 60);
      const fmtStr = minPart > 0 ? (remSec > 0 ? `${minPart}m ${remSec}s` : `${minPart} min`) : `${onlyNum}s`;
      return {
        secondsPerSet: onlyNum,
        isValid: true,
        tipo: onlyNum >= 90 ? 'cardio' : 'fixo',
        labelExplicativo: minPart > 0 ? `${fmtStr} (${onlyNum}s contínuos)` : `${onlyNum}s contínuos`
      };
    }
  }

  return {
    secondsPerSet: 0,
    isValid: false,
    tipo: 'invalido',
    labelExplicativo: 'Formato não padronizado'
  };
}

export interface ExerciseTimeResult {
  executionSeconds: number;
  restSeconds: number;
  totalSeconds: number;
  isPendingTempo: boolean;
  secondsPerSet: number;
  secondsPerRep?: number;
  tipo: 'cadencia' | 'fixo' | 'cardio' | 'invalido';
  labelExplicativo: string;
}

/**
 * Calcula o tempo total de execução e descanso de um exercício individual
 */
export function calculateExerciseTime(
  series: any,
  reps: any,
  ritmo: any,
  descanso: any
): ExerciseTimeResult {
  const s = Math.max(1, parseInt(String(series), 10) || 3);
  const d = parseDescansoSeconds(descanso);
  const exec = parseTempoExecucaoSerie(ritmo, reps);

  if (!exec.isValid) {
    return {
      executionSeconds: 0,
      restSeconds: s * d,
      totalSeconds: 0,
      isPendingTempo: true,
      secondsPerSet: 0,
      tipo: 'invalido',
      labelExplicativo: 'Definir ritmo para calcular'
    };
  }

  const executionSeconds = s * exec.secondsPerSet;
  // (s - 1) descansos entre as séries + 1 descanso de transição após última série
  const restSeconds = s * d;
  const totalSeconds = executionSeconds + restSeconds;

  return {
    executionSeconds,
    restSeconds,
    totalSeconds,
    isPendingTempo: false,
    secondsPerSet: exec.secondsPerSet,
    secondsPerRep: exec.secondsPerRep,
    tipo: exec.tipo,
    labelExplicativo: exec.labelExplicativo
  };
}

export interface SheetTotalTimeResult {
  totalMinutes: number;
  executionMinutes: number;
  restMinutes: number;
  totalSeconds: number;
  executionSeconds: number;
  restSeconds: number;
  pendingCount: number;
  isComplete: boolean;
  densidadePercent: number; // Porcentagem do treino sob tensão ativa
  formattedTotal: string;
}

/**
 * Calcula o tempo previsto completo da ficha, levando em consideração Bi-sets / Conjugados (G1, G2, etc.)
 */
export function calculateSheetTotalTime(items: any[]): SheetTotalTimeResult {
  if (!items || items.length === 0) {
    return {
      totalMinutes: 0,
      executionMinutes: 0,
      restMinutes: 0,
      totalSeconds: 0,
      executionSeconds: 0,
      restSeconds: 0,
      pendingCount: 0,
      isComplete: true,
      densidadePercent: 0,
      formattedTotal: '0 min'
    };
  }

  let totalExecutionSeconds = 0;
  let totalRestSeconds = 0;
  let pendingCount = 0;

  // Mapear exercícios por grupo conjugado (G1, G2, etc.) para otimizar os descansos
  const groupsMap = new Map<string, any[]>();
  const individualExercises: any[] = [];

  items.forEach(it => {
    const grp = it.combinaGrupo ? String(it.combinaGrupo).trim().toUpperCase() : '';
    if (grp) {
      if (!groupsMap.has(grp)) groupsMap.set(grp, []);
      groupsMap.get(grp)!.push(it);
    } else {
      individualExercises.push(it);
    }
  });

  // 1. Processar exercícios individuais
  individualExercises.forEach(it => {
    const s = Math.max(1, parseInt(String(it.series), 10) || 3);
    const d = parseDescansoSeconds(it.descanso);
    const exec = parseTempoExecucaoSerie(it.ritmo, it.reps);

    if (exec.isValid) {
      totalExecutionSeconds += s * exec.secondsPerSet;
    } else {
      pendingCount++;
    }
    // Descanso das séries + transição
    totalRestSeconds += s * d;
  });

  // 2. Processar grupos conjugados (Bi-sets / Super-sets)
  groupsMap.forEach((groupItems) => {
    // No Bi-set, o número de rodadas é o máximo de séries entre os membros do grupo
    const maxSeries = Math.max(...groupItems.map(it => Math.max(1, parseInt(String(it.series), 10) || 3)));
    // O descanso do bi-set é adotado a partir do descanso configurado no grupo (maior descanso entre eles)
    const maxDescanso = Math.max(...groupItems.map(it => parseDescansoSeconds(it.descanso)));

    groupItems.forEach(it => {
      const s = Math.max(1, parseInt(String(it.series), 10) || 3);
      const exec = parseTempoExecucaoSerie(it.ritmo, it.reps);
      if (exec.isValid) {
        totalExecutionSeconds += s * exec.secondsPerSet;
      } else {
        pendingCount++;
      }
      // Entre exercícios do mesmo bi-set há apenas transição curta (~15s)
      totalRestSeconds += (s * 15);
    });

    // O descanso completo ocorre ao final de cada rodada do grupo conjugado
    totalRestSeconds += (maxSeries * maxDescanso);
  });

  const totalSeconds = totalExecutionSeconds + totalRestSeconds;
  const totalMinutes = Math.round(totalSeconds / 60);
  const executionMinutes = Math.round(totalExecutionSeconds / 60);
  const restMinutes = Math.round(totalRestSeconds / 60);

  const densidadePercent = totalSeconds > 0
    ? Math.round((totalExecutionSeconds / totalSeconds) * 100)
    : 0;

  let formattedTotal = `${totalMinutes} min`;
  if (totalMinutes >= 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    formattedTotal = m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  return {
    totalMinutes,
    executionMinutes,
    restMinutes,
    totalSeconds,
    executionSeconds: totalExecutionSeconds,
    restSeconds: totalRestSeconds,
    pendingCount,
    isComplete: pendingCount === 0,
    densidadePercent,
    formattedTotal
  };
}

/**
 * Formata segundos em texto amigável
 * Ex: 195s => "3m 15s", 45s => "45s"
 */
export function formatSecondsToTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins} min`;
  return `${mins}m ${secs}s`;
}
