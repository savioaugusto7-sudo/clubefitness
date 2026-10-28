/**
 * visaPEngine.ts
 * Motor Científico do Questionário Validado VISA-P (Victorian Institute of Sport Assessment – Patella)
 * 
 * Referências Científicas:
 * - Visentini PJ, Khan KM, Cook JL, et al. (1998): "The VISA score: an index of severity of symptoms in patients with jumper's knee (patellar tendinosis)." J Sci Med Sport.
 * - Wageck BB, et al. (2013): Tradução, adaptação cultural e validação do VISA-P Brasil.
 * - Hernandez-Sanchez S, et al. (2014): "Confirmatory factor analysis and Minimal Clinically Important Difference (MCID = 13 points) of the VISA-P scale." Br J Sports Med.
 * - Cook JL & Purdam CR (2009) / Rio E et al. (2015): Continuum da Tendinopatia, Isometria Analgésica e Heavy Slow Resistance (HSR).
 */

export type VisaPQ8Type = '8A' | '8B' | '8C';

export interface VisaPAnswers {
  membroAvaliado?: 'Direito' | 'Esquerdo' | 'Bilateral';
  q1SentadoSemDor: number;        // 0 a 10 pts (0 min a 100 min sem dor sentado)
  q2DescerEscadas: number;        // 0 a 10 pts (Dor forte a Sem dor ao descer escadas)
  q3ExtensaoAtivaSemPeso: number; // 0 a 10 pts (Dor forte a Sem dor ao estender joelho sem carga)
  q4AfundoLunge: number;          // 0 a 10 pts (Dor forte a Sem dor no afundo/lunge)
  q5AgachamentoProfundo: number;  // 0 a 10 pts (Incapaz a Sem problemas para agachar)
  q6DezSaltosUnipodais: number;   // 0 a 10 pts (Dor forte/incapaz a Sem dor em 10 hops)
  q7PraticaEsportiva: number;     // 0, 4, 7 ou 10 pts
  q8TipoDorTreino: VisaPQ8Type;   // '8A' (Sem dor), '8B' (Dor que não interrompe), '8C' (Dor que interrompe)
  q8TempoTreinoScore: number;     // 8A: 0,7,14,21,30 | 8B: 0,4,10,14,20 | 8C: 0,2,5,7,10
  data?: string;
}

export interface VisaPResult {
  membroAvaliado: 'Direito' | 'Esquerdo' | 'Bilateral';
  scoreTotal: number;          // 0 a 100 pontos
  scoreSintomasDor: number;    // Q1 + Q2 + Q3 + Q6 (0 a 40 pts)
  scoreFuncaoCarga: number;    // Q4 + Q5 (0 a 20 pts)
  scoreCapacidadeEsportiva: number; // Q7 + Q8 (0 a 40 pts)
  classificacao: 'alta_funcional' | 'disfuncao_leve' | 'tendinopatia_moderada' | 'tendinopatia_severa';
  classificacaoLabel: string;
  badgeCor: string;
  badgeBg: string;
  estagioTendineo: string;
  parecerClinico: string;
  diretrizTreinador: string;
  respostas: VisaPAnswers;
}

export interface VisaPComparisonResult {
  atual: VisaPResult;
  anterior?: VisaPResult | null;
  dataT1?: string;
  dataT2?: string;
  deltaPontos?: number;
  mcidAtingido?: boolean; // MCID >= +13 pontos (ou score final >= 90)
  statusEvolucao?: 'mcid_atingido' | 'melhora_parcial' | 'estavel' | 'regressao';
  leituraComparativa?: string;
}

export const VISA_P_QUESTIONS_META = [
  {
    id: 'q1SentadoSemDor',
    numero: 1,
    pergunta: '1. Por quantos minutos você consegue ficar sentado com os joelhos fletidos a 90° sem sentir dor?',
    minLabel: '0 min (0 pts - Dor imediata)',
    maxLabel: '100 min (10 pts - Sem dor)'
  },
  {
    id: 'q2DescerEscadas',
    numero: 2,
    pergunta: '2. Você sente dor no tendão patelar ao descer escadas com ciclo de marcha normal?',
    minLabel: 'Dor severa / Incapacitante (0 pts)',
    maxLabel: 'Nenhuma dor (10 pts)'
  },
  {
    id: 'q3ExtensaoAtivaSemPeso',
    numero: 3,
    pergunta: '3. Você sente dor no joelho ao estender totalmente o joelho de forma ativa sem descarga de peso?',
    minLabel: 'Dor severa (0 pts)',
    maxLabel: 'Nenhuma dor (10 pts)'
  },
  {
    id: 'q4AfundoLunge',
    numero: 4,
    pergunta: '4. Você sente dor no tendão patelar ao realizar um movimento de afundo (Lunge) com descarga total de peso?',
    minLabel: 'Dor severa / Incapaz (0 pts)',
    maxLabel: 'Nenhuma dor (10 pts)'
  },
  {
    id: 'q5AgachamentoProfundo',
    numero: 5,
    pergunta: '5. Você apresenta dificuldade ou dor para realizar o agachamento completo (Deep Squat)?',
    minLabel: 'Incapaz devido à dor (0 pts)',
    maxLabel: 'Sem dificuldade / Sem dor (10 pts)'
  },
  {
    id: 'q6DezSaltosUnipodais',
    numero: 6,
    pergunta: '6. Você sente dor durante ou imediatamente após realizar 10 saltos unipodais (Single-Leg Hops) no membro avaliado?',
    minLabel: 'Dor severa / Incapaz de saltar (0 pts)',
    maxLabel: 'Nenhuma dor (10 pts)'
  }
] as const;

export const VISA_P_Q7_OPTIONS = [
  { points: 0, label: '0 pts — Não pratico atividade física / treino devido à dor no tendão patelar' },
  { points: 4, label: '4 pts — Treinamento modificado e/ou volume reduzido por causa da dor' },
  { points: 7, label: '7 pts — Treinamento completo, porém em nível inferior ao período pré-lesão' },
  { points: 10, label: '10 pts — Treinamento completo no mesmo nível ou superior ao período pré-lesão' }
];

export const VISA_P_Q8_OPTIONS: Record<VisaPQ8Type, { title: string; options: { points: number; label: string }[] }> = {
  '8A': {
    title: '8A. NÃO sinto dor durante o treino/esporte:',
    options: [
      { points: 0, label: 'Nenhuma duração / Não treina (0 pts)' },
      { points: 7, label: '1 a 10 minutos (7 pts)' },
      { points: 14, label: '11 a 20 minutos (14 pts)' },
      { points: 21, label: '21 a 30 minutos (21 pts)' },
      { points: 30, label: 'Mais de 30 minutos sem dor (30 pts)' }
    ]
  },
  '8B': {
    title: '8B. Sinto dor durante o treino, mas ela NÃO me obriga a interromper a sessão:',
    options: [
      { points: 0, label: 'Nenhuma duração (0 pts)' },
      { points: 4, label: '1 a 10 minutos (4 pts)' },
      { points: 10, label: '11 a 20 minutos (10 pts)' },
      { points: 14, label: '21 a 30 minutos (14 pts)' },
      { points: 20, label: 'Mais de 30 minutos tolerando a dor (20 pts)' }
    ]
  },
  '8C': {
    title: '8C. Sinto dor que ME OBRIGA A INTERROMPER o treino/exercício:',
    options: [
      { points: 0, label: 'Nenhuma duração / Interrupção imediata (0 pts)' },
      { points: 2, label: '1 a 10 minutos até parar (2 pts)' },
      { points: 5, label: '11 a 20 minutos até parar (5 pts)' },
      { points: 7, label: '21 a 30 minutos até parar (7 pts)' },
      { points: 10, label: 'Mais de 30 minutos até parar (10 pts)' }
    ]
  }
};

/**
 * Calcula o escore VISA-P (0–100) e gera diagnóstico e diretrizes baseadas no Continuum da Tendinopatia
 */
export function calculateVisaPAnalysis(rawInput: any): VisaPResult | null {
  if (!rawInput || typeof rawInput !== 'object') return null;

  const d = rawInput.respostas || rawInput.dados || rawInput;
  if (
    d.q1SentadoSemDor === undefined &&
    d.q2DescerEscadas === undefined &&
    d.scoreTotal === undefined
  ) {
    return null;
  }

  const clamp10 = (v: any) => Math.max(0, Math.min(10, Math.round(Number(v) || 0)));

  const q1 = clamp10(d.q1SentadoSemDor ?? 8);
  const q2 = clamp10(d.q2DescerEscadas ?? 8);
  const q3 = clamp10(d.q3ExtensaoAtivaSemPeso ?? 8);
  const q4 = clamp10(d.q4AfundoLunge ?? 7);
  const q5 = clamp10(d.q5AgachamentoProfundo ?? 7);
  const q6 = clamp10(d.q6DezSaltosUnipodais ?? 6);
  const q7 = Math.max(0, Math.min(10, Number(d.q7PraticaEsportiva ?? 7)));
  const q8Tipo: VisaPQ8Type = (d.q8TipoDorTreino === '8A' || d.q8TipoDorTreino === '8B' || d.q8TipoDorTreino === '8C')
    ? d.q8TipoDorTreino
    : '8B';
  const q8Score = Math.max(0, Math.min(30, Number(d.q8TempoTreinoScore ?? 14)));

  const scoreSintomasDor = q1 + q2 + q3 + q6; // 0 a 40
  const scoreFuncaoCarga = q4 + q5;           // 0 a 20
  const scoreCapacidadeEsportiva = q7 + q8Score; // 0 a 40
  const scoreTotal = d.scoreTotal !== undefined && d.q1SentadoSemDor === undefined
    ? Math.max(0, Math.min(100, Number(d.scoreTotal)))
    : Math.max(0, Math.min(100, scoreSintomasDor + scoreFuncaoCarga + scoreCapacidadeEsportiva));

  const membroAvaliado = d.membroAvaliado || 'Direito';

  let classificacao: VisaPResult['classificacao'] = 'alta_funcional';
  let classificacaoLabel = '🟢 Capacidade Tendínea Normal / Alta (≥ 80 pts)';
  let badgeCor = '#10b981';
  let badgeBg = 'rgba(16, 185, 129, 0.15)';
  let estagioTendineo = 'Fase 4 — Retorno ao Esporte e Armazenamento Elástico (Cook & Purdam)';
  let parecerClinico = `Escore VISA-P de ${scoreTotal}/100 pontos no joelho ${membroAvaliado.toLowerCase()}, acima do ponto de corte diagnóstico de 80 pontos. Excelente tolerância do tendão patelar ao armazenamento e liberação de energia (ciclo alongamento-encurtamento).`;
  let diretrizTreinador = 'Tendão apto para sobrecarga progressiva, agachamento livre, afundos pesados e introdução/manutenção de pliometria e corrida conforme periodização.';

  if (scoreTotal < 50) {
    classificacao = 'tendinopatia_severa';
    classificacaoLabel = '🔴 Tendinopatia Patelar Reativa / Severa (< 50 pts)';
    badgeCor = '#ef4444';
    badgeBg = 'rgba(239, 68, 68, 0.15)';
    estagioTendineo = 'Fase 1 — Modulação Analgésica / Tendinopatia Reativa (Rio et al.)';
    parecerClinico = `Escore VISA-P crítico de ${scoreTotal}/100 pontos no joelho ${membroAvaliado.toLowerCase()}, indicando alta irritabilidade nociceptiva do tendão patelar em tarefas de flexão de joelho e intolerância a ciclos de armazenamento de energia.`;
    diretrizTreinador = 'VEDADO saltos, corrida, afundos profundos e cadeira extensora rápida. Aplicar protocolo de Isometria Analgésica (5 séries x 45s de sustentação na cadeira extensora a 60° de flexão com 70% CVM, 2 min de descanso) e priorizar exercícios de cadeia posterior/quadril.';
  } else if (scoreTotal < 65) {
    classificacao = 'tendinopatia_moderada';
    classificacaoLabel = '🟠 Tendinopatia Patelar Moderada (50 – 64 pts)';
    badgeCor = '#f97316';
    badgeBg = 'rgba(249, 115, 22, 0.15)';
    estagioTendineo = 'Fase 2 — Heavy Slow Resistance (HSR) / Remodelação Matriz (Kongsgaard et al.)';
    parecerClinico = `Escore VISA-P de ${scoreTotal}/100 pontos no joelho ${membroAvaliado.toLowerCase()}, compatível com déficit de capacidade de carga mecânica no tendão patelar durante agachamento profundo e desaceleração.`;
    diretrizTreinador = 'Iniciar protocolo HSR (Heavy Slow Resistance): Leg Press e Agachamento com cadência lenta controlada (3 segundos na descida + 3 segundos na subida), sem ricochete no fundo, limitando dor durante a execução a EVA ≤ 3/10. Evitar pliometria de impacto.';
  } else if (scoreTotal < 80) {
    classificacao = 'disfuncao_leve';
    classificacaoLabel = '🟡 Disfunção Tendínea Leve / Transição (65 – 79 pts)';
    badgeCor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.15)';
    estagioTendineo = 'Fase 3 — Transição Funcional e Acúmulo de Energia Controlado';
    parecerClinico = `Escore VISA-P de ${scoreTotal}/100 pontos no joelho ${membroAvaliado.toLowerCase()}. Boa evolução estrutural em cargas lentas, porém ainda abaixo do limiar de 80 pontos para alta esportiva irrestrita.`;
    diretrizTreinador = 'Manter fortalecimento pesado lento (HSR 3x/semana) e introduzir progressivamente exercícios de absorção de impacto (aterrissagens unipodais controladas e desacelerações), monitorando dor nas 24h seguintes.';
  }

  return {
    membroAvaliado,
    scoreTotal,
    scoreSintomasDor,
    scoreFuncaoCarga,
    scoreCapacidadeEsportiva,
    classificacao,
    classificacaoLabel,
    badgeCor,
    badgeBg,
    estagioTendineo,
    parecerClinico,
    diretrizTreinador,
    respostas: {
      membroAvaliado,
      q1SentadoSemDor: q1,
      q2DescerEscadas: q2,
      q3ExtensaoAtivaSemPeso: q3,
      q4AfundoLunge: q4,
      q5AgachamentoProfundo: q5,
      q6DezSaltosUnipodais: q6,
      q7PraticaEsportiva: q7,
      q8TipoDorTreino: q8Tipo,
      q8TempoTreinoScore: q8Score,
      data: d.data
    }
  };
}

/**
 * Compara longitudinalmente dois registros VISA-P (T1 vs T2) aplicando o critério MCID = 13 pontos
 */
export function compareVisaPLongitudinal(
  t1Raw: any,
  t2Raw: any,
  dataT1?: string,
  dataT2?: string
): VisaPComparisonResult | null {
  const res2 = calculateVisaPAnalysis(t2Raw);
  const res1 = calculateVisaPAnalysis(t1Raw);

  if (!res2 && !res1) return null;

  // Caso exista apenas 1 avaliação VISA-P registrada
  if (res2 && !res1) {
    return {
      atual: res2,
      anterior: null,
      dataT2: dataT2 || res2.respostas.data,
      leituraComparativa: `Avaliação de base VISA-P registrada (${res2.scoreTotal}/100 pts). A Diferença Mínima Clinicamente Importante (MCID) para futuras reavaliações é de +13 pontos.`
    };
  }

  if (!res2 && res1) {
    return {
      atual: res1,
      anterior: null,
      dataT1: dataT1 || res1.respostas.data,
      leituraComparativa: `Avaliação VISA-P registrada (${res1.scoreTotal}/100 pts). A Diferença Mínima Clinicamente Importante (MCID) para reavaliação é de +13 pontos.`
    };
  }

  const delta = res2!.scoreTotal - res1!.scoreTotal;
  const mcidAtingido = delta >= 13 || (res2!.scoreTotal >= 85 && delta > 0);

  let statusEvolucao: VisaPComparisonResult['statusEvolucao'] = 'estavel';
  let leituraComparativa = '';

  if (delta >= 13) {
    statusEvolucao = 'mcid_atingido';
    leituraComparativa = `Melhora Clinicamente Significativa Atingida (+${delta} pts, superando o MCID de 13 pontos): evolução de ${res1!.scoreTotal} para ${res2!.scoreTotal}/100 pontos, confirmando remodelação funcional positiva e aumento da tolerância à carga do tendão patelar.`;
  } else if (delta > 0) {
    statusEvolucao = 'melhora_parcial';
    leituraComparativa = `Evolução positiva de +${delta} pontos (${res1!.scoreTotal} ➔ ${res2!.scoreTotal}/100 pts). Embora favorável, ainda em progressão para atingir a Diferença Mínima Clinicamente Importante (MCID ≥ 13 pts).`;
  } else if (delta === 0) {
    statusEvolucao = 'estavel';
    leituraComparativa = `Estabilidade clínica (${res2!.scoreTotal}/100 pts). Recomenda-se revisar a progressão de carga excêntrica/HSR para estimular nova adaptação tendínea.`;
  } else {
    statusEvolucao = 'regressao';
    leituraComparativa = `Redução de ${delta} pontos no escore VISA-P (${res1!.scoreTotal} ➔ ${res2!.scoreTotal}/100 pts), sinalizando sobrecarga reativa recente no tendão patelar. Ajustar volume de impacto e priorizar analgesia isométrica.`;
  }

  return {
    atual: res2!,
    anterior: res1!,
    dataT1: dataT1 || res1!.respostas.data,
    dataT2: dataT2 || res2!.respostas.data,
    deltaPontos: delta,
    mcidAtingido,
    statusEvolucao,
    leituraComparativa
  };
}

