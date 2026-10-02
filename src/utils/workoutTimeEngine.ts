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
  tipo: 'cadencia' | 'fixo';
}

export const RITMO_OPTIONS: TempoOption[] = [
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
  // Isometrias e tempos fixos por série
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
  tipo: 'cadencia' | 'fixo' | 'invalido';
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

  // 1. Verificar se é tempo fixo por série (ex: "30s", "45s", "60 seg", "isometria 30s")
  const matchMin = clean.match(/^(\d+)\s*(min|m|minuto|minutos)$/i);
  if (matchMin) {
    const mins = parseInt(matchMin[1], 10);
    const secs = mins * 60;
    return {
      secondsPerSet: secs,
      isValid: true,
      tipo: 'fixo',
      labelExplicativo: `${secs}s por série`
    };
  }

  // Se tem apenas número seguido de 's' ou 'seg' (ex: "30s", "45 seg", "isometria 40s")
  if (clean.includes('s') && !clean.includes('-')) {
    const numPart = clean.match(/\d+/);
    if (numPart) {
      const secs = parseInt(numPart[0], 10);
      return {
        secondsPerSet: secs,
        isValid: true,
        tipo: 'fixo',
        labelExplicativo: `${secs}s contínuos por série`
      };
    }
  }

  // 2. Verificar se é cadência clássica com hífen (ex: "2-1", "2-0-2-0", "3-0-1-0", "4-0-2-0")
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

  // 3. Verificar se é número direto isolado (ex: "3" interpretado como 3s/rep ou "30" como segundos)
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
      // Tempo fixo em segundos por série
      return {
        secondsPerSet: onlyNum,
        isValid: true,
        tipo: 'fixo',
        labelExplicativo: `${onlyNum}s contínuos por série`
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
  tipo: 'cadencia' | 'fixo' | 'invalido';
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
