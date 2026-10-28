/**
 * acwrEngine.ts
 * Motor de Monitoramento de Carga Crônica/Aguda (ACWR - Acute:Chronic Workload Ratio)
 * e Matriz de Decisão Integrada do Wellness (Hooper / Foster / Gabbett).
 * 
 * Padrão Científico de Referência:
 * - Tim Gabbett (2016): "The training-injury prevention paradox: should athletes be training smarter and harder?" (Br J Sports Med).
 * - Hooper & Mackinnon (1995): Monitoramento de fadiga psicofisiológica em atletas.
 * - Foster et al. (2001): Monitoramento de carga pelo produto Duração x PSE da sessão (Session RPE).
 * 
 * Clube Fitness
 */

export interface DayWorkload {
  data: string; // YYYY-MM-DD
  cargaUA: number; // Unidades Arbitrárias de Carga
  origem: 'presenca' | 'ficha' | 'avulso' | 'estimada' | 'repouso';
  detalhes?: string;
}

export interface ACWRResult {
  diasAnalisados: number;
  totalSessoes28d: number;
  cargaAguda7d: number; // Soma dos últimos 7 dias (UA)
  cargaCronica28dMediaSemanal: number; // Média semanal dos últimos 28 dias (UA)
  acwr: number; // Acute:Chronic Workload Ratio
  zona: 'subtreinamento' | 'sweet_spot' | 'atencao' | 'perigo';
  zonaLabel: string;
  zonaCor: string;
  zonaBg: string;
  diagnosticoClinico: string;
  recomendacaoCarga: string;
  historicoDiario: DayWorkload[];
}

export interface WellnessStatusInput {
  sono: number; // 1 a 10 (1 = reparador, 10 = insônia severa)
  fadiga: number; // 1 a 10 (1 = descansado, 10 = exausto)
  dorMuscular: number; // 1 a 10 (1 = sem dor, 10 = dor incapacitante)
  score?: number; // 3 a 30
  status?: 'otimo' | 'moderado' | 'ruim' | 'critico';
  data?: string;
  conduta?: string;
}

export interface DecisionMatrixResult {
  semaforo: 'verde' | 'amarelo' | 'laranja' | 'vermelho';
  semaforoLabel: string;
  semaforoCor: string;
  semaforoBg: string;
  acwr: number;
  acwrZona: string;
  acwrZonaLabel: string;
  wellnessScore: number;
  wellnessStatus: string;
  wellnessStatusLabel: string;
  parecerProntidao: string;
  diretrizTreinador: string;
  acoesEspecificas: string[];
}

/**
 * Calcula a Carga de uma sessão em Unidades Arbitrárias (UA)
 * Baseada no Volume Load da Ficha de Treino ou no Método de Foster (Duração x PSE)
 */
export function calculateSessionWorkloadUA(
  appointment: any,
  workoutSheetsMap?: Map<string, number>
): { cargaUA: number; origem: 'presenca' | 'ficha' | 'avulso' | 'estimada' | 'repouso'; detalhes: string } {
  if (!appointment || appointment.status !== 'presenca') {
    return { cargaUA: 0, origem: 'repouso', detalhes: 'Dia de descanso / Sem presença' };
  }

  // 1. Se houver treinoExecutado com ficha e soubermos o volume load calculado da ficha
  const fichaId = appointment.treinoExecutado?.fichaId;
  if (fichaId && workoutSheetsMap && workoutSheetsMap.has(fichaId)) {
    const volKg = workoutSheetsMap.get(fichaId) || 0;
    if (volKg > 0) {
      // Normalização: 10 kg de volume load = 1 UA (ex: 3.500 kg volume load = 350 UA)
      const ua = Math.round(volKg / 10);
      return {
        cargaUA: Math.max(100, Math.min(800, ua)),
        origem: 'ficha',
        detalhes: `Ficha ${fichaId} (${volKg.toLocaleString('pt-BR')} kg volume load)`
      };
    }
  }

  // 2. Se houver avaliação de wellness realizada no appointment, modula a intensidade estimada
  if (appointment.wellness?.realizado) {
    const dor = Number(appointment.wellness.dorMuscular) || 3;
    const fad = Number(appointment.wellness.fadiga) || 3;
    // Sessão padrão de 50 minutos com PSE estimada entre 5 e 8
    const pseEstimada = Math.min(9, Math.max(5, 6 + Math.round((fad + dor) / 4)));
    const ua = 50 * pseEstimada; // ex: 50 * 7 = 350 UA
    return {
      cargaUA: ua,
      origem: 'presenca',
      detalhes: `Treino Presencial (50 min • PSE ${pseEstimada}/10)`
    };
  }

  // 3. Sessão de presença padrão de academia / fisioterapia no Clube Fitness
  return {
    cargaUA: 350,
    origem: 'presenca',
    detalhes: 'Presença confirmada (Sessão Padrão de 350 UA)'
  };
}

/**
 * Calcula o ACWR (Acute:Chronic Workload Ratio) para os últimos 28 dias
 */
export function calculateACWR(
  appointments: any[] = [],
  clientWorkout?: any,
  referenciaData?: string
): ACWRResult {
  const refDate = referenciaData ? new Date(referenciaData + 'T12:00:00') : new Date();

  // Mapeia o Volume Load de cada ficha do aluno se disponível
  const sheetVolMap = new Map<string, number>();
  if (clientWorkout) {
    const allSheets = [
      ...(clientWorkout.fichasMonitorado || []),
      ...(clientWorkout.fichasLivre || [])
    ];
    allSheets.forEach(sheet => {
      let sheetTotalKg = 0;
      (sheet.exercicios || []).forEach((ex: any) => {
        const series = Number(ex.series) || 3;
        let reps = 10;
        if (typeof ex.repeticoes === 'string' && ex.repeticoes.includes('-')) {
          const parts = ex.repeticoes.split('-').map((p: string) => parseFloat(p.trim())).filter((n: number) => !isNaN(n));
          if (parts.length >= 2) reps = (parts[0] + parts[1]) / 2;
        } else if (ex.repeticoes) {
          const parsed = parseFloat(ex.repeticoes);
          if (!isNaN(parsed)) reps = parsed;
        }
        let cargaKg = 0;
        if (typeof ex.carga === 'number') cargaKg = ex.carga;
        else if (typeof ex.carga === 'string') {
          const c = parseFloat(ex.carga.replace(',', '.'));
          if (!isNaN(c)) cargaKg = c;
        }
        sheetTotalKg += series * reps * cargaKg;
      });
      if (sheet.id && sheetTotalKg > 0) {
        sheetVolMap.set(sheet.id, Math.round(sheetTotalKg));
      }
    });
  }

  // Mapeia agendamentos dos últimos 28 dias
  const presencasPorData = new Map<string, any>();
  appointments.forEach(apt => {
    if (apt.data && apt.status === 'presenca') {
      presencasPorData.set(apt.data, apt);
    }
  });

  const historicoDiario: DayWorkload[] = [];
  let totalSessoes28d = 0;

  // Itera dia a dia dos últimos 28 dias (do dia -27 até o dia 0)
  for (let i = 27; i >= 0; i--) {
    const d = new Date(refDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];

    const apt = presencasPorData.get(dateStr);
    const { cargaUA, origem, detalhes } = calculateSessionWorkloadUA(apt, sheetVolMap);

    if (cargaUA > 0) {
      totalSessoes28d++;
    }

    historicoDiario.push({
      data: dateStr,
      cargaUA,
      origem,
      detalhes
    });
  }

  // 1. Carga Aguda: últimos 7 dias (índices 21 a 27)
  const ultimos7Dias = historicoDiario.slice(21, 28);
  const cargaAguda7d = ultimos7Dias.reduce((acc, cur) => acc + cur.cargaUA, 0);

  // 2. Carga Crônica: média semanal dos últimos 28 dias
  const somaTotal28d = historicoDiario.reduce((acc, cur) => acc + cur.cargaUA, 0);
  // Se o aluno fez pelo menos 1 treino, garante base crônica mínima representativa de 350 UA
  const baseCronicaCalculada = Math.round(somaTotal28d / 4);
  const cargaCronica28dMediaSemanal = Math.max(baseCronicaCalculada, somaTotal28d > 0 ? 350 : 0);

  // 3. Cálculo da Razão ACWR
  let acwr = 0;
  if (cargaCronica28dMediaSemanal > 0) {
    acwr = Math.round((cargaAguda7d / cargaCronica28dMediaSemanal) * 100) / 100;
  } else if (cargaAguda7d > 0) {
    acwr = 1.0; // Primeiro ciclo com treinos
  }

  // 4. Classificação das Zonas de Risco de Gabbett
  let zona: 'subtreinamento' | 'sweet_spot' | 'atencao' | 'perigo' = 'sweet_spot';
  let zonaLabel = '🟢 Zona Segura ("Sweet Spot" 0.80 - 1.30)';
  let zonaCor = '#10b981';
  let zonaBg = 'rgba(16, 185, 129, 0.15)';
  let diagnosticoClinico = 'Equilíbrio fisiológico ideal entre a carga recente e a base crônica de condicionamento. Menor risco epidemiológico de lesão musculoesquelética.';
  let recomendacaoCarga = 'Progressão de sobrecarga liberada conforme planejamento de treino. Estímulos normais de hipertrofia e força.';

  if (acwr >= 1.50) {
    zona = 'perigo';
    zonaLabel = '🔴 Zona de Perigo / Spike de Carga (≥ 1.50)';
    zonaCor = '#ef4444';
    zonaBg = 'rgba(239, 68, 68, 0.15)';
    diagnosticoClinico = `Aumento abrupto de carga nos últimos 7 dias (${cargaAguda7d} UA vs média crônica ${cargaCronica28dMediaSemanal} UA/sem). Risco relativo de lesão quadruplicado por estresse tecidual excessivo.`;
    recomendacaoCarga = 'Deload imediato: reduzir volume load da semana em 30% a 50%. Proibido saltos de carga ou repetições até a falha.';
  } else if (acwr >= 1.30) {
    zona = 'atencao';
    zonaLabel = '🟡 Sobre-alcance / Atenção (1.30 - 1.49)';
    zonaCor = '#f59e0b';
    zonaBg = 'rgba(245, 158, 11, 0.15)';
    diagnosticoClinico = `Carga aguda aproximando-se do limiar de fadiga cumulativa (ACWR ${acwr}). Monitorar sintomas de dores articulares e tendíneas pós-treino.`;
    recomendacaoCarga = 'Manter cargas estáveis. Não adicionar novos exercícios de alta intensidade esta semana.';
  } else if (acwr < 0.80) {
    zona = 'subtreinamento';
    zonaLabel = '🔵 Sub-treinamento / Descondicionamento (< 0.80)';
    zonaCor = '#38bdf8';
    zonaBg = 'rgba(56, 189, 248, 0.15)';
    diagnosticoClinico = `Volume agudo inferior à capacidade de suporte crônica (ACWR ${acwr}). Aluno descansado, mas suscetível a sobrecargas súbitas caso retorne bruscamente.`;
    recomendacaoCarga = 'Progressão gradual de volume (máximo +10% por semana) para reconstruir capacidade de carga com segurança.';
  }

  return {
    diasAnalisados: 28,
    totalSessoes28d,
    cargaAguda7d,
    cargaCronica28dMediaSemanal,
    acwr,
    zona,
    zonaLabel,
    zonaCor,
    zonaBg,
    diagnosticoClinico,
    recomendacaoCarga,
    historicoDiario
  };
}

/**
 * Matriz de Decisão Cruzada: Wellness (Sono + Fadiga + Dor) x ACWR (Gabbett)
 * Emite a conduta interdisciplinar imediata (Semáforo de Prescrição para a Musculação)
 */
export function calculateWellnessACWRDecision(
  wellnessInput: WellnessStatusInput | null | undefined,
  acwrResult: ACWRResult | null | undefined
): DecisionMatrixResult {
  const s = Math.max(1, Math.min(10, Number(wellnessInput?.sono) || 3));
  const f = Math.max(1, Math.min(10, Number(wellnessInput?.fadiga) || 3));
  const d = Math.max(1, Math.min(10, Number(wellnessInput?.dorMuscular) || 3));
  const wScore = wellnessInput?.score || (s + f + d);
  const wStatus = wellnessInput?.status || (wScore >= 24 ? 'critico' : wScore >= 18 ? 'ruim' : wScore >= 11 ? 'moderado' : 'otimo');

  const acwrVal = acwrResult?.acwr ?? 1.0;
  const acwrZona = acwrResult?.zona ?? 'sweet_spot';
  const acwrZonaLabel = acwrResult?.zonaLabel ?? 'Zona Segura (Sweet Spot)';

  const wStatusLabels = {
    otimo: 'Ótimo / Alta Prontidão',
    moderado: 'Moderado / Atenção Leve',
    ruim: 'Ruim / Sobrecarga Fisiológica',
    critico: 'Crítico / Exaustão ou Dor'
  };

  // 1. SEMÁFORO VERMELHO: Crítico / Spike de Carga Severo / Exaustão / Dor Intensa
  if (acwrVal >= 1.50 || wStatus === 'critico' || (d >= 8 && f >= 7)) {
    return {
      semaforo: 'vermelho',
      semaforoLabel: '🔴 SEMÁFORO VERMELHO: CONDUTA REGENERATIVA / DELOAD',
      semaforoCor: '#ef4444',
      semaforoBg: 'rgba(239, 68, 68, 0.15)',
      acwr: acwrVal,
      acwrZona,
      acwrZonaLabel,
      wellnessScore: wScore,
      wellnessStatus: wStatus,
      wellnessStatusLabel: wStatusLabels[wStatus],
      parecerProntidao: `Risco Crítico de Lesão: ${acwrVal >= 1.50 ? `Pico de Carga Abrupto (ACWR ${acwrVal})` : 'Sobrecarga Fisiológica Severa'} associado a estado de recuperação comprometido (Score Wellness ${wScore}/30).`,
      diretrizTreinador: 'VEDADO treino de alta intensidade, repetições até a falha excêntrica e testes de carga máxima. Conduzir sessão regenerativa com foco em liberação miofascial, mobilidade articular e estímulos posturais sem sobrecarga.',
      acoesEspecificas: [
        'Reduzir volume load do dia em 50%',
        'Trabalhar com RPE máximo 5 (muito leve a moderado)',
        'Foco exclusivo em amplitude de movimento e descompressão articular',
        'Orientar hidratação e higiene do sono para a próxima sessão'
      ]
    };
  }

  // 2. SEMÁFORO LARANJA: Atenção / Sobre-alcance Agudo / Dor Moderada / Fadiga Significativa
  if (acwrVal >= 1.30 || wStatus === 'ruim' || (f >= 7 && d >= 5) || s >= 7) {
    return {
      semaforo: 'laranja',
      semaforoLabel: '🟠 SEMÁFORO LARANJA: MODULAÇÃO PREVENTIVA DE CARGA',
      semaforoCor: '#f97316',
      semaforoBg: 'rgba(249, 115, 22, 0.15)',
      acwr: acwrVal,
      acwrZona,
      acwrZonaLabel,
      wellnessScore: wScore,
      wellnessStatus: wStatus,
      wellnessStatusLabel: wStatusLabels[wStatus],
      parecerProntidao: `Sinais de Fadiga Acumulada: ${acwrVal >= 1.30 ? `ACWR em zona de sobre-alcance (${acwrVal})` : 'Relato de sono insuficiente ou cansaço muscular evidente'} (Score Wellness ${wScore}/30).`,
      diretrizTreinador: 'Manter cargas submáximas e reduzir volume em 25% a 30% (remover 1 série por exercício). Priorizar qualidade técnica e evitar exercícios pliométricos ou de choque articular.',
      acoesEspecificas: [
        'Diminuir 1 série de cada exercício da ficha',
        'Manter reservas de repetições (RIR 2 a 3)',
        'Substituir exercícios com impacto por alternativas em cadeia fechada',
        'Aumentar tempo de intervalo entre séries para 90 a 120 segundos'
      ]
    };
  }

  // 3. SEMÁFORO AMARELO: Aluno Descansado mas Sub-treinado ou com Pequeno Desconforto
  if (acwrVal < 0.80 || wStatus === 'moderado') {
    return {
      semaforo: 'amarelo',
      semaforoLabel: '🟡 SEMÁFORO AMARELO: PROGRESSÃO CAUTELOSA / READAPTAÇÃO',
      semaforoCor: '#eab308',
      semaforoBg: 'rgba(234, 179, 8, 0.15)',
      acwr: acwrVal,
      acwrZona,
      acwrZonaLabel,
      wellnessScore: wScore,
      wellnessStatus: wStatus,
      wellnessStatusLabel: wStatusLabels[wStatus],
      parecerProntidao: acwrVal < 0.80
        ? `Sub-treinamento ou Retorno (ACWR ${acwrVal}): Capacidade de suporte crônica baixa. O aluno está descansado, porém tecidos não toleram aumento súbito de volume.`
        : `Recuperação Moderada (Wellness ${wScore}/30): Discreto desconforto muscular ou fadiga leve do dia a dia.`,
      diretrizTreinador: 'Progredir cargas de forma gradual e controlada (máximo de 5% a 10% por ciclo). Manter boa cadência e evitar dobrar treinos na mesma semana.',
      acoesEspecificas: [
        'Ajuste progressivo de sobrecarga linear controlada',
        'Cadência controlada (2s excêntrica / 1s concêntrica)',
        'Monitorar se haverá dor residual nas 24h seguintes ao treino'
      ]
    };
  }

  // 4. SEMÁFORO VERDE: Sweet Spot de Carga + Excelência Fisiológica
  return {
    semaforo: 'verde',
    semaforoLabel: '🟢 SEMÁFORO VERDE: SOBRECARGA PROGRESSIVA LIBERADA',
    semaforoCor: '#10b981',
    semaforoBg: 'rgba(16, 185, 129, 0.15)',
    acwr: acwrVal,
    acwrZona,
    acwrZonaLabel,
    wellnessScore: wScore,
    wellnessStatus: wStatus,
    wellnessStatusLabel: wStatusLabels[wStatus],
    parecerProntidao: `Prontidão Fisiológica Plena: Carga crônica perfeitamente calibrada (ACWR ${acwrVal} no Sweet Spot) e excelente estado de sono e recuperação (Score Wellness ${wScore}/30).`,
    diretrizTreinador: 'Sinal verde total para treinos intensos, progressão de sobrecarga, testes de força máxima e estímulos de hipertrofia/potência conforme a periodização.',
    acoesEspecificas: [
      'Liberado para aumento planejado de cargas em exercícios multiarticulares',
      'Permitidas séries com proximidade de falha concêntrica (RIR 1 a 0)',
      'Manter estímulo de sobrecarga progressiva estruturado'
    ]
  };
}
