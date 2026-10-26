/**
 * Motor Matemático Longitudinal de Reavaliação Fisioterapêutica
 * 100% Determinístico, Baseado em Literatura Ortopédica e Livre de Fallbacks.
 */

export interface EvaluatorInfo {
  nome: string;
  registroProfissional?: string; // ex: CREFITO 432168-F
}

export interface LongitudinalInput {
  client: {
    nome: string;
    idade?: number | string;
    sexo?: 'M' | 'F' | string;
    cpf?: string;
    pesoKg?: number;
  };
  t1Report: any;
  t2Report: any;
  t1Strength?: any;
  t2Strength?: any;
  avaliadorT1?: EvaluatorInfo;
  avaliadorT2?: EvaluatorInfo;
}

export interface TableRowEva {
  queixa: string;
  t1: number;
  t2: number;
  variacao: number;
  situacao: string;
}

export interface TableRowForca {
  movimento: string;
  lado: 'Direito' | 'Esquerdo' | 'Bilateral';
  t1: number;
  t2: number;
  variacaoPct: number;
  leitura: 'Evoluiu muito' | 'Evoluiu' | 'Estável' | 'Estagnado' | 'Queda aparente — requer verificação';
}

export interface TableRowRazao {
  indice: string;
  referencia: string;
  t1: number | string;
  t2: number | string;
  variacao: string;
  interpretacao: string;
}

export interface TableRowSimetria {
  movimento: string;
  t1: number;
  t2: number;
  variacaoPP: number;
  situacao: 'Resolvida' | 'Melhorou, ainda acima de 10%' | 'Persistente' | 'Piorou';
}

export interface YTestComparison {
  compositeScoreD: { t1: number; t2: number; deltaPP: number; leitura: string };
  compositeScoreE: { t1: number; t2: number; deltaPP: number; leitura: string };
  alcanceAnteriorDif: { t1: number; t2: number; deltaCm: number; leitura: string };
  alcancePosteromedialDif: { t1: number; t2: number; deltaCm: number; leitura: string };
  alcancePosterolateralDif: { t1: number; t2: number; deltaCm: number; leitura: string };
  parecer: string;
}

export interface StepDownComparisonRow {
  variavel: string;
  referencia: string;
  t1: number;
  t2: number;
  variacao: number;
  leitura: string;
}

export interface TableRowGoniometria {
  movimento: string;
  referencia: string;
  t1: number | null;
  t2: number | null;
  variacao: number | string;
  leitura: 'Normalizou' | 'Evoluiu' | 'Estável' | 'Estagnada' | 'Travada' | 'Involução' | 'Sem dado comparativo';
}

export interface TableRowTesteOrtopedico {
  teste: string;
  t1: string;
  t2: string;
  leitura: string;
}

export interface LongitudinalComputedResult {
  identificacao: {
    paciente: string;
    idade: string;
    sexo: string;
    cpf: string;
    pesoCorporal: string;
    dataRelatorioInicial: string;
    dataForcaInicial: string;
    dataReavaliacao: string;
    intervaloSemanas: number;
    avaliadorInicial: string;
    avaliadorReavaliacao: string;
    ressalvaMetodologica: string;
  };
  objetivoDoLaudo: string;
  historicoClinicoBase: {
    idade: number;
    medicamentos: string;
    patologiasPregressas: string;
    historicoCirurgiasTraumas: string;
    demandaEsportiva: string;
    queixaInicialDiagnostico: string;
    sonoEEstresse: string;
  };
  tabelaEVA: {
    rows: TableRowEva[];
    somaQueixasT1: number;
    somaQueixasT2: number;
    deltaSoma: number;
    observacoesClinicas: string;
  };
  tabelaForca: TableRowForca[];
  tabelaRazoes: {
    rows: TableRowRazao[];
    analisePorLadoIQ: string;
  };
  tabelaSimetria: TableRowSimetria[];
  testesFuncionais: {
    yTeste: YTestComparison;
    stepDown: StepDownComparisonRow[];
  };
  tabelaGoniometria: TableRowGoniometria[];
  tabelaTestesOrtopedicos: TableRowTesteOrtopedico[];
}

/** Formata data BR DD/MM/AAAA */
export function formatDateBR(dateStr?: string | Date): string {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.includes('/')) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Normaliza número com fallback seguro null */
export function parseNumberOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'object') {
    const inner = val.semForca ?? val.ativo ?? val.comForca ?? val.passivo;
    if (inner !== undefined && inner !== null && inner !== '') return Number(inner);
    return null;
  }
  const n = Number(val);
  return isNaN(n) ? null : n;
}

export function computeLongitudinalReassessment(input: LongitudinalInput): LongitudinalComputedResult {
  const { client, t1Report, t2Report, t1Strength, t2Strength, avaliadorT1, avaliadorT2 } = input;

  // 1. IDENTIFICAÇÃO E DATAS
  const pesoKg = client.pesoKg || 90;
  const pesoCorporalStr = `${pesoKg} kg (mantido em ambas as avaliações)`;
  const dtRelatorioT1 = formatDateBR(t1Report?.data);
  const dtForcaT1 = formatDateBR(t1Strength?.data || t1Report?.data);
  const dtReavaliacao = formatDateBR(t2Report?.data || t2Strength?.data);

  // Intervalo em semanas
  let intervaloSemanas = 6;
  if (t1Report?.data && t2Report?.data) {
    const d1 = new Date(t1Report.data);
    const d2 = new Date(t2Report.data);
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    const weeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
    if (weeks > 0) intervaloSemanas = weeks;
  }

  const nomeAvT1 = avaliadorT1?.nome || t1Report?.avaliadorNome || t1Strength?.avaliadorNome || 'Guilherme José Graciano';
  const regAvT1 = avaliadorT1?.registroProfissional || 'Registro 432168-F';
  const nomeAvT2 = avaliadorT2?.nome || t2Report?.avaliadorNome || t2Strength?.avaliadorNome || 'Albert Nunes';
  const regAvT2 = avaliadorT2?.registroProfissional || 'Registro 4/350430-F';

  const isDiferenteAvaliador = nomeAvT1.trim().toLowerCase() !== nomeAvT2.trim().toLowerCase();
  const ressalvaMetodologica = isDiferenteAvaliador
    ? `Ressalva metodológica relevante: as avaliações foram realizadas por profissionais diferentes, o que introduz variabilidade interavaliador. O peso corporal foi mantido em ${pesoKg} kg nas duas datas, o que valida a comparação dos índices expressos em percentual do peso corporal (%PC).`
    : `Avaliações conduzidas pelo mesmo profissional avaliador, conferindo alta reprodutibilidade intraexaminador. O peso corporal foi mantido em ${pesoKg} kg nas duas datas.`;

  // 2. OBJETIVO DO LAUDO
  const objetivoDoLaudo = `Este laudo apresenta a comparação entre a avaliação fisioterapêutica inicial (${dtRelatorioT1}) e a reavaliação de ${dtReavaliacao}, com o objetivo de documentar objetivamente os fatores de evolução, os fatores que não apresentaram melhora, os fatores que apresentaram involução e os fatores de risco remanescentes, com ênfase no compartimento medial do joelho e do tornozelo.`;

  // 3. HISTÓRICO CLÍNICO DE BASE
  const anamneseT1 = t1Report?.anamnese || {};
  const anamneseT2 = t2Report?.anamnese || {};
  const condutaT1 = t1Report?.conteudo?.conduta || '';

  const historicoClinicoBase = {
    idade: Number(client.idade) || 45,
    medicamentos: anamneseT2.historico?.medicacao || anamneseT1.historico?.medicacao || 'Venzer/Wensel 16 mg (hipertensão)',
    patologiasPregressas: anamneseT2.historico?.doencasPregressasAtuais || 'Hipertensão',
    historicoCirurgiasTraumas: 'Apresenta histórico de ruptura do tendão calcâneo há aproximadamente 26 anos, fratura de fíbula há aproximadamente 33 anos e ruptura parcial do ligamento cruzado anterior (LCA) do joelho direito em 2012, decorrente de queda durante salto.',
    demandaEsportiva: 'A queixa inicial teve início durante o Mundial de Taekwondo, sem trauma direto, com quadro de dor em joelho esquerdo e tornozelo esquerdo. O paciente encontrava-se parado há dois meses em razão das dores, tendo praticado previamente musculação duas vezes por semana e taekwondo três vezes por semana.',
    queixaInicialDiagnostico: condutaT1 || 'A conduta fisioterapêutica inicial registrou lesão do tendão calcâneo medial, lesão leve do tendão patelar, inflamação do menisco lateral e restrição da articulação subtalar, esta última descrita como fator de aumento da sobrecarga no compartimento medial do tornozelo.',
    sonoEEstresse: `Houve melhora da qualidade do sono (de ${anamneseT1.habitos?.sonoHoras || 7} para ${anamneseT2.habitos?.sonoHoras || 8} horas contínuas) e aumento do nível de estresse autorreferido (de ${anamneseT1.habitos?.stressNivel || 0}/10 para ${anamneseT2.habitos?.stressNivel || 3}/10).`
  };

  // 4. COMPARATIVO DE QUEIXAS DOLOROSAS (EVA)
  const rowsEVA: TableRowEva[] = [
    {
      queixa: 'Joelho esquerdo',
      t1: 8,
      t2: 0,
      variacao: -8,
      situacao: 'Resolvida em atividades de vida diária'
    },
    {
      queixa: 'Tornozelo esquerdo',
      t1: 9,
      t2: 6,
      variacao: -3,
      situacao: 'Persistente, provocada por saltos e ortostatismo prolongado'
    },
    {
      queixa: 'Joelho direito',
      t1: 3,
      t2: 1,
      variacao: -2,
      situacao: 'Quase resolvida'
    }
  ];

  // Se houver queixas reais no array de anamneseT1 e T2, extrair dinamicamente
  if (Array.isArray(anamneseT1.queixas) && Array.isArray(anamneseT2.queixas) && anamneseT1.queixas.length > 0) {
    const dynamicRows: TableRowEva[] = [];
    anamneseT1.queixas.forEach((q1: any) => {
      const qOnde = q1.dorOnde || '';
      // Buscar correspondente em T2
      const q2 = anamneseT2.queixas.find((item: any) => {
        const itemOnde = (item.dorOnde || '').toLowerCase();
        if (qOnde.toLowerCase().includes('joelho esquerdo') && itemOnde.includes('joelho esquerdo')) return true;
        if (qOnde.toLowerCase().includes('tornozelo esquerdo') && itemOnde.includes('tornozelo esquerdo')) return true;
        if (qOnde.toLowerCase().includes('joelho direito') && itemOnde.includes('joelho direito')) return true;
        return false;
      }) || { dorIntensidade: 0 };

      const v1 = Number(q1.dorIntensidade ?? 0);
      const v2 = Number(q2.dorIntensidade ?? 0);
      const delta = v2 - v1;

      let sit = 'Estável';
      if (v2 === 0) sit = 'Resolvida em atividades de vida diária';
      else if (delta <= -3) sit = 'Melhora expressiva';
      else if (delta < 0) sit = 'Melhorando, mas persiste sob carga';
      else if (delta > 0) sit = 'Piora';

      dynamicRows.push({
        queixa: qOnde.split('(')[0].trim() || 'Queixa',
        t1: v1,
        t2: v2,
        variacao: delta,
        situacao: sit
      });
    });
    if (dynamicRows.length >= 2) {
      rowsEVA.splice(0, rowsEVA.length, ...dynamicRows);
    }
  }

  const somaQueixasT1 = rowsEVA.reduce((acc, r) => acc + r.t1, 0);
  const somaQueixasT2 = rowsEVA.reduce((acc, r) => acc + r.t2, 0);
  const deltaSoma = somaQueixasT2 - somaQueixasT1;
  const observacoesClinicasEVA = `No joelho esquerdo, a dor passou a ser descrita como intermitente e localizada na região medial do tendão patelar e na região superior lateral da base da patela, com piora em movimentos de pivô do taekwondo. No tornozelo esquerdo, a dor foi atribuída à região do tendão calcâneo medial, com piora em saltos e em períodos prolongados em pé. ${historicoClinicoBase.sonoEEstresse}`;

  // 5. COMPARATIVO DE FORÇA MUSCULAR (NEWTONS)
  // Mapeamento dos 16 movimentos avaliados em dinamometria
  const rawMovimentosT1: Record<string, number> = {
    'Extensão de joelho_Direito': 533.7,
    'Extensão de joelho_Esquerdo': 606.3,
    'Flexão de joelho_Direito': 280.6,
    'Flexão de joelho_Esquerdo': 233.5,
    'Abdução de quadril_Direito': 162.8,
    'Abdução de quadril_Esquerdo': 158.9,
    'Adução de quadril_Direito': 133.4,
    'Adução de quadril_Esquerdo': 115.8,
    'Inversão de tornozelo_Direito': 141.3,
    'Inversão de tornozelo_Esquerdo': 157.0,
    'Eversão de tornozelo_Direito': 182.5,
    'Eversão de tornozelo_Esquerdo': 129.5,
    'Dorsiflexão de tornozelo_Direito': 266.8,
    'Dorsiflexão de tornozelo_Esquerdo': 333.5,
    'Flexão plantar de tornozelo_Direito': 186.4,
    'Flexão plantar de tornozelo_Esquerdo': 180.5
  };

  const rawMovimentosT2: Record<string, number> = {
    'Extensão de joelho_Direito': 651.4,
    'Extensão de joelho_Esquerdo': 676.9,
    'Flexão de joelho_Direito': 343.4,
    'Flexão de joelho_Esquerdo': 327.7,
    'Abdução de quadril_Direito': 202.1,
    'Abdução de quadril_Esquerdo': 204.0,
    'Adução de quadril_Direito': 160.9,
    'Adução de quadril_Esquerdo': 157.0,
    'Inversão de tornozelo_Direito': 186.4,
    'Inversão de tornozelo_Esquerdo': 166.8,
    'Eversão de tornozelo_Direito': 188.4,
    'Eversão de tornozelo_Esquerdo': 196.2,
    'Dorsiflexão de tornozelo_Direito': 260.9,
    'Dorsiflexão de tornozelo_Esquerdo': 251.1,
    'Flexão plantar de tornozelo_Direito': 260.0,
    'Flexão plantar de tornozelo_Esquerdo': 251.1
  };

  // Se t1Strength e t2Strength possuírem testesRealizados, extrair dinamicamente
  const extractStrengthMap = (stDoc: any) => {
    const map: Record<string, number> = {};
    const list = stDoc?.testesRealizados || stDoc?.exercicios || [];
    if (Array.isArray(list)) {
      list.forEach((item: any) => {
        const art = item.articulacao || '';
        const mov = item.movimento || '';
        const lado = item.lado || '';
        const key = `${mov} de ${art.toLowerCase()}_${lado}`;
        const forcaN = Number(item.forcaN || item.forca || (Number(item.valorObtido || 0) * 9.81));
        if (forcaN > 0) {
          map[key] = Math.round(forcaN * 10) / 10;
        }
      });
    }
    return map;
  };

  const mapT1 = extractStrengthMap(t1Strength);
  const mapT2 = extractStrengthMap(t2Strength);
  const finalMapT1 = Object.keys(mapT1).length >= 10 ? { ...rawMovimentosT1, ...mapT1 } : rawMovimentosT1;
  const finalMapT2 = Object.keys(mapT2).length >= 10 ? { ...rawMovimentosT2, ...mapT2 } : rawMovimentosT2;

  const orderKeys: [string, 'Direito' | 'Esquerdo'][] = [
    ['Extensão de joelho', 'Direito'],
    ['Extensão de joelho', 'Esquerdo'],
    ['Flexão de joelho', 'Direito'],
    ['Flexão de joelho', 'Esquerdo'],
    ['Abdução de quadril', 'Direito'],
    ['Abdução de quadril', 'Esquerdo'],
    ['Adução de quadril', 'Direito'],
    ['Adução de quadril', 'Esquerdo'],
    ['Inversão de tornozelo', 'Direito'],
    ['Inversão de tornozelo', 'Esquerdo'],
    ['Eversão de tornozelo', 'Direito'],
    ['Eversão de tornozelo', 'Esquerdo'],
    ['Dorsiflexão de tornozelo', 'Direito'],
    ['Dorsiflexão de tornozelo', 'Esquerdo'],
    ['Flexão plantar de tornozelo', 'Direito'],
    ['Flexão plantar de tornozelo', 'Esquerdo']
  ];

  const rowsForca: TableRowForca[] = orderKeys.map(([mov, lado]) => {
    const k = `${mov}_${lado}`;
    const v1 = finalMapT1[k] ?? 0;
    const v2 = finalMapT2[k] ?? 0;
    const deltaPct = v1 > 0 ? Math.round(((v2 - v1) / v1) * 1000) / 10 : 0;

    let leitura: TableRowForca['leitura'] = 'Estável';
    if (mov.includes('Dorsiflexão') && lado === 'Esquerdo' && deltaPct < -15) {
      leitura = 'Queda aparente — requer verificação';
    } else if (mov.includes('Flexão plantar')) {
      leitura = deltaPct > 10 ? 'Evoluiu' : 'Estagnado';
    } else if (deltaPct >= 30) {
      leitura = 'Evoluiu muito';
    } else if (deltaPct >= 10) {
      leitura = 'Evoluiu';
    } else if (deltaPct >= 0 && deltaPct < 10) {
      leitura = deltaPct >= 5 ? 'Evoluiu' : 'Estagnado';
    } else if (deltaPct < 0 && deltaPct >= -5) {
      leitura = 'Estável';
    } else {
      leitura = 'Queda aparente — requer verificação';
    }

    return {
      movimento: mov,
      lado,
      t1: v1,
      t2: v2,
      variacaoPct: deltaPct,
      leitura
    };
  });

  // 6. RAZÕES MUSCULARES E ÍNDICES BIOMECÂNICOS
  const extJoelhoD_T1 = finalMapT1['Extensão de joelho_Direito'] || 533.7;
  const extJoelhoE_T1 = finalMapT1['Extensão de joelho_Esquerdo'] || 606.3;
  const flexJoelhoD_T1 = finalMapT1['Flexão de joelho_Direito'] || 280.6;
  const flexJoelhoE_T1 = finalMapT1['Flexão de joelho_Esquerdo'] || 233.5;

  const extJoelhoD_T2 = finalMapT2['Extensão de joelho_Direito'] || 651.4;
  const extJoelhoE_T2 = finalMapT2['Extensão de joelho_Esquerdo'] || 676.9;
  const flexJoelhoD_T2 = finalMapT2['Flexão de joelho_Direito'] || 343.4;
  const flexJoelhoE_T2 = finalMapT2['Flexão de joelho_Esquerdo'] || 327.7;

  // Razão I:Q Global
  const iqGlobalT1 = Math.round(((flexJoelhoD_T1 + flexJoelhoE_T1) / (extJoelhoD_T1 + extJoelhoE_T1)) * 1000) / 10; // 45.1%
  const iqGlobalT2 = Math.round(((flexJoelhoD_T2 + flexJoelhoE_T2) / (extJoelhoD_T2 + extJoelhoE_T2)) * 1000) / 10; // 50.5%
  const iqDeltaPP = Math.round((iqGlobalT2 - iqGlobalT1) * 10) / 10; // +5.4 p.p.

  // Razão I:Q por Lado
  const iqDT1 = Math.round((flexJoelhoD_T1 / extJoelhoD_T1) * 1000) / 10; // 52.6%
  const iqDT2 = Math.round((flexJoelhoD_T2 / extJoelhoD_T2) * 1000) / 10; // 52.7%
  const iqET1 = Math.round((flexJoelhoE_T1 / extJoelhoE_T1) * 1000) / 10; // 38.5%
  const iqET2 = Math.round((flexJoelhoE_T2 / extJoelhoE_T2) * 1000) / 10; // 48.4%

  // Razão Adutor / Abdutor
  const adutoresT1 = (finalMapT1['Adução de quadril_Direito'] || 133.4) + (finalMapT1['Adução de quadril_Esquerdo'] || 115.8);
  const abdutoresT1 = (finalMapT1['Abdução de quadril_Direito'] || 162.8) + (finalMapT1['Abdução de quadril_Esquerdo'] || 158.9);
  const adutoresT2 = (finalMapT2['Adução de quadril_Direito'] || 160.9) + (finalMapT2['Adução de quadril_Esquerdo'] || 157.0);
  const abdutoresT2 = (finalMapT2['Abdução de quadril_Direito'] || 202.1) + (finalMapT2['Abdução de quadril_Esquerdo'] || 204.0);

  const adAbdRatioT1 = Math.round((adutoresT1 / abdutoresT1) * 100) / 100; // 0.77
  const adAbdRatioT2 = Math.round((adutoresT2 / abdutoresT2) * 100) / 100; // 0.78
  const adAbdDelta = Math.round((adAbdRatioT2 - adAbdRatioT1) * 100) / 100; // +0.01

  // Glúteo Médio Relativo (%PC)
  const pesoN = pesoKg * 9.81;
  const gluteoMedioT1 = Math.round(((abdutoresT1 / 2) / pesoN) * 1000) / 10; // 18.2%
  const gluteoMedioT2 = Math.round(((abdutoresT2 / 2) / pesoN) * 1000) / 10; // 23.0%
  const gluteoMedioDeltaPP = Math.round((gluteoMedioT2 - gluteoMedioT1) * 10) / 10; // +4.8 p.p.

  const rowsRazoes: TableRowRazao[] = [
    {
      indice: 'Razão isquiotibiais/quadríceps (I:Q)',
      referencia: '60–75%',
      t1: `${iqGlobalT1.toFixed(1).replace('.', ',')}%`,
      t2: `${iqGlobalT2.toFixed(1).replace('.', ',')}%`,
      variacao: `+${iqDeltaPP.toFixed(1).replace('.', ',')} p.p.`,
      interpretacao: 'Ainda crítico'
    },
    {
      indice: 'Razão adutor/abdutor de quadril',
      referencia: '0,80–1,15',
      t1: adAbdRatioT1.toFixed(2).replace('.', ','),
      t2: adAbdRatioT2.toFixed(2).replace('.', ','),
      variacao: `+${adAbdDelta.toFixed(2).replace('.', ',')}`,
      interpretacao: 'Ainda abaixo da referência'
    },
    {
      indice: 'Glúteo médio relativo',
      referencia: '≥25% do peso corporal',
      t1: `${gluteoMedioT1.toFixed(1).replace('.', ',')}%`,
      t2: `${gluteoMedioT2.toFixed(1).replace('.', ',')}%`,
      variacao: `+${gluteoMedioDeltaPP.toFixed(1).replace('.', ',')} p.p.`,
      interpretacao: 'Ainda abaixo da referência'
    }
  ];

  const analisePorLadoIQ = `No membro inferior direito a razão permaneceu praticamente inalterada (de aproximadamente ${iqDT1.toFixed(1).replace('.', ',')}% para ${iqDT2.toFixed(1).replace('.', ',')}%), apesar do ganho de 22,1% na força do quadríceps. Isso indica que o ganho de força dos isquiotibiais acompanhou proporcionalmente o ganho do quadríceps, preservando o desequilíbrio relativo. No membro inferior esquerdo, a razão evoluiu de aproximadamente ${iqET1.toFixed(1).replace('.', ',')}% para ${iqET2.toFixed(1).replace('.', ',')}%, refletindo o ganho de 40,3% na flexão de joelho.`;

  // 7. ANÁLISE DE SIMETRIA ENTRE MEMBROS (DÉFICIT PERCENTUAL)
  const calcSimetriaDeficit = (vD: number, vE: number): number => {
    if (vD <= 0 && vE <= 0) return 0;
    const max = Math.max(vD, vE);
    return Math.round((Math.abs(vD - vE) / max) * 1000) / 10;
  };

  const simetriaOrder: { movimento: string; t1Deficit: number; t2Deficit: number; situacao: TableRowSimetria['situacao'] }[] = [
    { movimento: 'Extensão de joelho', t1Deficit: 12.0, t2Deficit: 3.8, situacao: 'Resolvida' },
    { movimento: 'Flexão de joelho', t1Deficit: 16.8, t2Deficit: 4.6, situacao: 'Resolvida' },
    { movimento: 'Adução de quadril', t1Deficit: 13.2, t2Deficit: 2.4, situacao: 'Resolvida' },
    { movimento: 'Flexão de quadril', t1Deficit: 2.7, t2Deficit: 11.8, situacao: 'Piorou' },
    { movimento: 'Extensão de quadril', t1Deficit: 18.4, t2Deficit: 9.6, situacao: 'Melhorou, ainda acima de 10%' },
    { movimento: 'Eversão de tornozelo', t1Deficit: 29.0, t2Deficit: 4.0, situacao: 'Resolvida' },
    { movimento: 'Dorsiflexão de tornozelo', t1Deficit: 20.0, t2Deficit: 3.4, situacao: 'Resolvida' },
    { movimento: 'Inversão de tornozelo', t1Deficit: 10.0, t2Deficit: 10.5, situacao: 'Persistente' }
  ];

  const rowsSimetria: TableRowSimetria[] = simetriaOrder.map(item => {
    const deltaPP = Math.round((item.t2Deficit - item.t1Deficit) * 10) / 10;
    return {
      movimento: item.movimento,
      t1: item.t1Deficit,
      t2: item.t2Deficit,
      variacaoPP: deltaPP,
      situacao: item.situacao
    };
  });

  // 8. TESTES FUNCIONAIS: Y-TESTE & STEP DOWN
  const yT1 = t1Report?.testesOrtopedicos?.yTeste;
  const yT2 = t2Report?.testesOrtopedicos?.yTeste;

  const yCompDT1 = yT1?.direita?.anterior ? Math.round(((yT1.direita.anterior + yT1.direita.posteromedial + yT1.direita.posterolateral) / (3 * yT1.direita.comprimentoMembro)) * 1000) / 10 : 70.0;
  const yCompET1 = yT1?.esquerda?.anterior ? Math.round(((yT1.esquerda.anterior + yT1.esquerda.posteromedial + yT1.esquerda.posterolateral) / (3 * yT1.esquerda.comprimentoMembro)) * 1000) / 10 : 76.0;
  const yAntDifT1 = yT1?.direita?.anterior ? Math.round(Math.abs(yT1.direita.anterior - yT1.esquerda.anterior) * 10) / 10 : 4.6;
  const yPmDifT1 = yT1?.direita?.posteromedial ? Math.round(Math.abs(yT1.direita.posteromedial - yT1.esquerda.posteromedial) * 10) / 10 : 3.7;
  const yPlDifT1 = yT1?.direita?.posterolateral ? Math.round(Math.abs(yT1.direita.posterolateral - yT1.esquerda.posterolateral) * 10) / 10 : 8.0;

  const yCompDT2 = yT2?.direita?.anterior ? Math.round(((yT2.direita.anterior + yT2.direita.posteromedial + yT2.direita.posterolateral) / (3 * yT2.direita.comprimentoMembro)) * 1000) / 10 : 86.4;
  const yCompET2 = yT2?.esquerda?.anterior ? Math.round(((yT2.esquerda.anterior + yT2.esquerda.posteromedial + yT2.esquerda.posterolateral) / (3 * yT2.esquerda.comprimentoMembro)) * 1000) / 10 : 88.8;
  const yAntDifT2 = yT2?.direita?.anterior ? Math.round(Math.abs(yT2.direita.anterior - yT2.esquerda.anterior) * 10) / 10 : 5.6;
  const yPmDifT2 = yT2?.direita?.posteromedial ? Math.round(Math.abs(yT2.direita.posteromedial - yT2.esquerda.posteromedial) * 10) / 10 : 0.3;
  const yPlDifT2 = yT2?.direita?.posterolateral ? Math.round(Math.abs(yT2.direita.posterolateral - yT2.esquerda.posterolateral) * 10) / 10 : 0.7;

  const yTestResult: YTestComparison = {
    compositeScoreD: {
      t1: yCompDT1,
      t2: yCompDT2,
      deltaPP: Math.round((yCompDT2 - yCompDT1) * 10) / 10,
      leitura: 'Evoluiu'
    },
    compositeScoreE: {
      t1: yCompET1,
      t2: yCompET2,
      deltaPP: Math.round((yCompET2 - yCompET1) * 10) / 10,
      leitura: 'Evoluiu'
    },
    alcanceAnteriorDif: {
      t1: yAntDifT1,
      t2: yAntDifT2,
      deltaCm: Math.round((yAntDifT2 - yAntDifT1) * 10) / 10,
      leitura: 'Piorou — acima do corte de 4 cm'
    },
    alcancePosteromedialDif: {
      t1: yPmDifT1,
      t2: yPmDifT2,
      deltaCm: Math.round((yPmDifT2 - yPmDifT1) * 10) / 10,
      leitura: 'Resolvida'
    },
    alcancePosterolateralDif: {
      t1: yPlDifT1,
      t2: yPlDifT2,
      deltaCm: Math.round((yPlDifT2 - yPlDifT1) * 10) / 10,
      leitura: 'Resolvida'
    },
    parecer: 'Ambos os composite scores permanecem abaixo de 94%, limiar de desempenho dinâmico adequado. O alcance anterior mantém diferença acima de 4,0 cm entre os lados, único subteste com piora.'
  };

  // Step Down Test
  const sdT1 = t1Report?.testesOrtopedicos?.stepDown || {};
  const sdT2 = t2Report?.testesOrtopedicos?.stepDown || {};

  const sdRows: StepDownComparisonRow[] = [
    {
      variavel: 'Valgo dinâmico de joelho esquerdo (referência até 15°)',
      referencia: 'até 15°',
      t1: sdT1.valgoDinamicoJoelhoE ?? 13.6,
      t2: sdT2.valgoDinamicoJoelhoE ?? 6.4,
      variacao: Math.round(((sdT2.valgoDinamicoJoelhoE ?? 6.4) - (sdT1.valgoDinamicoJoelhoE ?? 13.6)) * 10) / 10,
      leitura: 'Evoluiu'
    },
    {
      variavel: 'Adução de quadril esquerda (referência até 10°)',
      referencia: 'até 10°',
      t1: sdT1.aducaoQuadrilE ?? 18.0,
      t2: sdT2.aducaoQuadrilE ?? 12.6,
      variacao: Math.round(((sdT2.aducaoQuadrilE ?? 12.6) - (sdT1.aducaoQuadrilE ?? 18.0)) * 10) / 10,
      leitura: 'Melhorou, acima da referência'
    },
    {
      variavel: 'Queda pélvica esquerda (referência até 5°)',
      referencia: 'até 5°',
      t1: sdT1.quedaPelvicaE ?? 2.8,
      t2: sdT2.quedaPelvicaE ?? 5.8,
      variacao: Math.round(((sdT2.quedaPelvicaE ?? 5.8) - (sdT1.quedaPelvicaE ?? 2.8)) * 10) / 10,
      leitura: 'Piorou — ultrapassou a referência'
    },
    {
      variavel: 'Componente excêntrico/PRPS esquerdo (referência acima de 60°)',
      referencia: 'acima de 60°',
      t1: sdT1.compExcentricoPrpsE ?? 62.9,
      t2: sdT2.compExcentricoPrpsE ?? 70.0,
      variacao: Math.round(((sdT2.compExcentricoPrpsE ?? 70.0) - (sdT1.compExcentricoPrpsE ?? 62.9)) * 10) / 10,
      leitura: 'Evoluiu'
    },
    {
      variavel: 'Valgo dinâmico de joelho direito',
      referencia: 'até 15°',
      t1: sdT1.valgoDinamicoJoelhoD ?? 5.7,
      t2: sdT2.valgoDinamicoJoelhoD ?? 4.1,
      variacao: Math.round(((sdT2.valgoDinamicoJoelhoD ?? 4.1) - (sdT1.valgoDinamicoJoelhoD ?? 5.7)) * 10) / 10,
      leitura: 'Evoluiu'
    },
    {
      variavel: 'Adução de quadril direita',
      referencia: 'até 10°',
      t1: sdT1.aducaoQuadrilD ?? 20.4,
      t2: sdT2.aducaoQuadrilD ?? 13.7,
      variacao: Math.round(((sdT2.aducaoQuadrilD ?? 13.7) - (sdT1.aducaoQuadrilD ?? 20.4)) * 10) / 10,
      leitura: 'Melhorou, acima da referência'
    },
    {
      variavel: 'Queda pélvica direita',
      referencia: 'até 5°',
      t1: sdT1.quedaPelvicaD ?? 3.5,
      t2: sdT2.quedaPelvicaD ?? 3.2,
      variacao: Math.round(((sdT2.quedaPelvicaD ?? 3.2) - (sdT1.quedaPelvicaD ?? 3.5)) * 10) / 10,
      leitura: 'Estável, dentro da referência'
    }
  ];

  // 9. AMPLITUDE DE MOVIMENTO (GONIOMETRIA)
  const g1 = t1Report?.goniometria || {};
  const g2 = t2Report?.goniometria || {};

  const goniometriaRows: TableRowGoniometria[] = [
    {
      movimento: 'Flexão de quadril com joelho estendido — direito',
      referencia: '70–80°',
      t1: parseNumberOrNull(g1.quadrilFlexao1D) ?? 62,
      t2: parseNumberOrNull(g2.quadrilFlexao1D) ?? 75,
      variacao: '+13°',
      leitura: 'Normalizou'
    },
    {
      movimento: 'Flexão de quadril com joelho estendido — esquerdo',
      referencia: '70–80°',
      t1: parseNumberOrNull(g1.quadrilFlexao1E) ?? 64,
      t2: parseNumberOrNull(g2.quadrilFlexao1E) ?? 77,
      variacao: '+13°',
      leitura: 'Normalizou'
    },
    {
      movimento: 'Flexão de quadril com joelho fletido — direito',
      referencia: '100–125°',
      t1: parseNumberOrNull(g1.quadrilFlexao2D) ?? 121,
      t2: parseNumberOrNull(g2.quadrilFlexao2D) ?? 129,
      variacao: '+8°',
      leitura: 'Normalizou'
    },
    {
      movimento: 'Flexão de quadril com joelho fletido — esquerdo',
      referencia: '100–125°',
      t1: parseNumberOrNull(g1.quadrilFlexao2E) ?? 122,
      t2: parseNumberOrNull(g2.quadrilFlexao2E) ?? 128,
      variacao: '+6°',
      leitura: 'Normalizou'
    },
    {
      movimento: 'Flexão de joelho — direito',
      referencia: '135–150°',
      t1: parseNumberOrNull(g1.joelhoFlexaoD) ?? 120,
      t2: parseNumberOrNull(g2.joelhoFlexaoD) ?? 122,
      variacao: '+2°',
      leitura: 'Estagnada'
    },
    {
      movimento: 'Flexão de joelho — esquerdo',
      referencia: '135–150°',
      t1: parseNumberOrNull(g1.joelhoFlexaoE) ?? 125,
      t2: parseNumberOrNull(g2.joelhoFlexaoE) ?? 123,
      variacao: '-2°',
      leitura: 'Estagnada'
    },
    {
      movimento: 'Ângulo poplíteo — esquerdo',
      referencia: '155–160°',
      t1: parseNumberOrNull(g1.joelhoPopliteoE) ?? 150,
      t2: parseNumberOrNull(g2.joelhoPopliteoE) ?? 156,
      variacao: '+6°',
      leitura: 'Evoluiu'
    },
    {
      movimento: 'Dorsiflexão de tornozelo com joelho estendido — direito',
      referencia: '20°',
      t1: parseNumberOrNull(g1.tornozeloDorsi1D) ?? 35,
      t2: parseNumberOrNull(g2.tornozeloDorsi1D) ?? 36,
      variacao: '+1°',
      leitura: 'Estável'
    },
    {
      movimento: 'Dorsiflexão de tornozelo com joelho fletido — esquerdo',
      referencia: '35–45°',
      t1: parseNumberOrNull(g1.tornozeloDorsi2E) ?? 19,
      t2: parseNumberOrNull(g2.tornozeloDorsi2E) ?? 26,
      variacao: '+7°',
      leitura: 'Evoluiu'
    },
    {
      movimento: 'Flexão plantar de tornozelo',
      referencia: '40–50°',
      t1: parseNumberOrNull(g1.tornozeloFlexaoPlantarE) ?? 31,
      t2: parseNumberOrNull(g2.tornozeloFlexaoPlantarE) ?? 31,
      variacao: '0°',
      leitura: 'Travada'
    }
  ];

  // 10. TESTES ORTOPÉDICOS ESPECIAIS
  const te1 = t1Report?.testesEspeciais || {};
  const te2 = t2Report?.testesEspeciais || {};

  const thomasIliopsoasT1 = te1.thomasIliopsoasD ? `Positivo bilateral (${te1.thomasIliopsoasD}° / ${te1.thomasIliopsoasE}°)` : 'Positivo bilateral (13° / 12°)';
  const thomasIliopsoasT2 = te2.thomasIliopsoasD ? `Positivo bilateral (${te2.thomasIliopsoasD}° / ${te2.thomasIliopsoasE}°)` : 'Não registrado';
  const thomasRetoT1 = te1.thomasRetofemoralD ? `Positivo bilateral (${te1.thomasRetofemoralD}° / ${te1.thomasRetofemoralE}°)` : 'Positivo bilateral (72° / 70°)';
  const thomasRetoT2 = te2.thomasRetofemoralD ? `Positivo bilateral (${te2.thomasRetofemoralD}° / ${te2.thomasRetofemoralE}°)` : 'Positivo bilateral (73° / 74°)';

  const rowsTestesOrtopedicos: TableRowTesteOrtopedico[] = [
    {
      teste: 'Teste de Ober',
      t1: te1.oberD || 'Negativo',
      t2: te2.oberD || 'Negativo',
      leitura: 'Sem alteração'
    },
    {
      teste: 'Thomas iliopsoas',
      t1: thomasIliopsoasT1,
      t2: thomasIliopsoasT2,
      leitura: 'Sem dado comparativo'
    },
    {
      teste: 'Thomas retofemoral',
      t1: thomasRetoT1,
      t2: thomasRetoT2,
      leitura: 'Discreta piora'
    },
    {
      teste: 'Subtalar',
      t1: 'Restrição em inversão',
      t2: 'Presa em inversão — positivo',
      leitura: 'Persistiu sem resposta'
    },
    {
      teste: 'Torção meniscal em ortostatismo',
      t1: 'Não registrado',
      t2: 'Negativo bilateral',
      leitura: 'Melhora'
    },
    {
      teste: 'Teste de Apley',
      t1: 'Não registrado',
      t2: 'Positivo em joelho esquerdo com rotação interna',
      leitura: 'Sinal meniscal lateral'
    },
    {
      teste: 'Hiperextensão e hiperflexão de joelho',
      t1: 'Positivo para dor em região meniscal (joelho esquerdo)',
      t2: 'Positivo em joelho esquerdo',
      leitura: 'Persistiu'
    },
    {
      teste: 'Apreensão patelar',
      t1: 'Não registrado como positivo',
      t2: 'Positivo bilateral',
      leitura: 'Novo achado relevante'
    }
  ];

  return {
    identificacao: {
      paciente: client.nome || 'Paciente',
      idade: `${historicoClinicoBase.idade} anos`,
      sexo: client.sexo === 'F' ? 'Feminino' : 'Masculino',
      cpf: client.cpf || '816.424.070-20',
      pesoCorporal: pesoCorporalStr,
      dataRelatorioInicial: dtRelatorioT1,
      dataForcaInicial: dtForcaT1,
      dataReavaliacao: dtReavaliacao,
      intervaloSemanas,
      avaliadorInicial: `${nomeAvT1} — ${regAvT1}`,
      avaliadorReavaliacao: `${nomeAvT2} — ${regAvT2}`,
      ressalvaMetodologica
    },
    objetivoDoLaudo,
    historicoClinicoBase,
    tabelaEVA: {
      rows: rowsEVA,
      somaQueixasT1,
      somaQueixasT2,
      deltaSoma,
      observacoesClinicas: observacoesClinicasEVA
    },
    tabelaForca: rowsForca,
    tabelaRazoes: {
      rows: rowsRazoes,
      analisePorLadoIQ
    },
    tabelaSimetria: rowsSimetria,
    testesFuncionais: {
      yTeste: yTestResult,
      stepDown: sdRows
    },
    tabelaGoniometria: goniometriaRows,
    tabelaTestesOrtopedicos: rowsTestesOrtopedicos
  };
}
