import { formatDateSafeBR } from '@/utils/dateFormatter';

export interface EvolutionDataPoint {
  data: string; // YYYY-MM-DD
  dataFormatada: string;
  valor: number;
  valorTexto?: string;
  avaliador?: string;
  observacao?: string;
  detalhes?: Record<string, any>;
}

export type SemanticGoal = 'increase_good' | 'decrease_good' | 'neutral' | 'symmetric_good';

export interface MetricEvolution {
  id: string;
  grupoId: string;
  nome: string;
  unidade: string;
  categoria: string;
  semantica: SemanticGoal;
  historico: EvolutionDataPoint[];
  primeiroValor: number;
  penultimoValor: number;
  ultimoValor: number;
  deltaRecente: number;
  deltaRecentePercent: number;
  deltaTotal: number;
  deltaTotalPercent: number;
  isMelhora: boolean;
  sparklineSvgPoints: string; // pontos para polyline/path SVG
  dadosAdicionais?: Record<string, any>;
}

export interface SymmetryEvolution {
  id: string;
  nome: string;
  unidade: string;
  articulacao?: string;
  movimento?: string;
  historico: {
    data: string;
    dataFormatada: string;
    valorD: number;
    valorE: number;
    diferenca: number;
    indiceSimetria: number; // 0 a 100%
    classificacao: 'Equilibrado' | 'Assimetria Leve' | 'Assimetria Relevante';
  }[];
  ultimoD: number;
  ultimoE: number;
  ultimaDiferenca: number;
  ultimoIndiceSimetria: number;
  ultimaClassificacao: 'Equilibrado' | 'Assimetria Leve' | 'Assimetria Relevante';
  penultimoIndiceSimetria?: number;
  evolucaoSimetriaDelta?: number; // positivo significa que melhorou a simetria
}

export interface EvolutionGroup {
  id: string;
  titulo: string;
  subtitulo: string;
  icone: string;
  cor: string;
  metricas: MetricEvolution[];
  simetrias?: SymmetryEvolution[];
  totalElegiveis: number;
}

export interface EvolutionSummary {
  alunoId: string;
  totalMetricasAtivas: number;
  grupos: Record<string, EvolutionGroup>;
  gruposOrdenados: EvolutionGroup[];
}

function parseNum(val: any): number {
  if (val === null || val === undefined || val === '') return NaN;
  if (typeof val === 'number') return isNaN(val) ? NaN : val;
  if (typeof val === 'object') {
    // Para casos como goniometria { semForca: 90, comForca: 95 }
    const n = Number(val.semForca) || Number(val.comForca) || Number(val.valor) || Number(val.graus);
    return isNaN(n) ? NaN : n;
  }
  const clean = String(val).replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? NaN : parsed;
}

function calculateSparkline(points: number[], width = 100, height = 28): string {
  if (points.length < 2) return '';
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const padY = 4;
  const usableH = height - padY * 2;

  return points
    .map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - padY - ((val - min) / range) * usableH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function buildMetric(
  id: string,
  grupoId: string,
  nome: string,
  unidade: string,
  categoria: string,
  semantica: SemanticGoal,
  pontosBrutos: { data: string; valor: any; avaliador?: string; obs?: string; detalhes?: any }[]
): MetricEvolution | null {
  // Filtra apenas pontos com números válidos e ordena cronologicamente
  const validPoints: EvolutionDataPoint[] = pontosBrutos
    .map(p => {
      const num = parseNum(p.valor);
      return {
        data: p.data,
        dataFormatada: formatDateSafeBR(p.data),
        valor: num,
        avaliador: p.avaliador,
        observacao: p.obs,
        detalhes: p.detalhes
      };
    })
    .filter(p => !isNaN(p.valor))
    .sort((a, b) => a.data.localeCompare(b.data));

  // REGRA DE OURO: Mínimo 2 registros para comparativo
  if (validPoints.length < 2) {
    return null;
  }

  const values = validPoints.map(p => p.valor);
  const primeiro = values[0];
  const penultimo = values[values.length - 2];
  const ultimo = values[values.length - 1];

  const deltaRecente = Number((ultimo - penultimo).toFixed(2));
  const deltaRecentePercent = penultimo !== 0 ? Number(((deltaRecente / Math.abs(penultimo)) * 100).toFixed(1)) : 0;

  const deltaTotal = Number((ultimo - primeiro).toFixed(2));
  const deltaTotalPercent = primeiro !== 0 ? Number(((deltaTotal / Math.abs(primeiro)) * 100).toFixed(1)) : 0;

  let isMelhora = false;
  if (semantica === 'increase_good') {
    isMelhora = deltaRecente > 0;
  } else if (semantica === 'decrease_good') {
    isMelhora = deltaRecente < 0;
  } else {
    isMelhora = true; // neutro
  }

  return {
    id,
    grupoId,
    nome,
    unidade,
    categoria,
    semantica,
    historico: validPoints,
    primeiroValor: primeiro,
    penultimoValor: penultimo,
    ultimoValor: ultimo,
    deltaRecente,
    deltaRecentePercent,
    deltaTotal,
    deltaTotalPercent,
    isMelhora,
    sparklineSvgPoints: calculateSparkline(values)
  };
}

export function processStudentEvolution(
  assessments: any[] = [],
  strengthTests: any[] = [],
  reports: any[] = [],
  wellnessLogs: any[] = [],
  workoutsHistory: any[] = []
): EvolutionSummary {
  // 1. COMPOSIÇÃO CORPORAL & ANTROPOMETRIA
  const compMetrics: MetricEvolution[] = [];
  const sortedAs = [...assessments].sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  // Peso
  const pesoM = buildMetric(
    'peso',
    'composicao',
    'Peso Corporal',
    'kg',
    'Antropometria',
    'decrease_good',
    sortedAs.map(a => ({
      data: a.data,
      valor: a.dadosMedidos?.peso,
      avaliador: a.avaliadorId?.nome || a.avaliadorNome
    }))
  );
  if (pesoM) compMetrics.push(pesoM);

  // % Gordura
  const gordM = buildMetric(
    'gordura',
    'composicao',
    'Gordura Corporal',
    '%',
    'Composição',
    'decrease_good',
    sortedAs.map(a => ({
      data: a.data,
      valor: a.resultadosCalculados?.percentualGordura ?? a.dadosMedidos?.gordura,
      avaliador: a.avaliadorId?.nome || a.avaliadorNome
    }))
  );
  if (gordM) compMetrics.push(gordM);

  // Massa Magra
  const magraM = buildMetric(
    'massaMagra',
    'composicao',
    'Massa Muscular Magra',
    'kg',
    'Composição',
    'increase_good',
    sortedAs.map(a => {
      let mm = a.resultadosCalculados?.massaMagraKg ?? a.resultadosCalculados?.massaMagra ?? a.dadosMedidos?.massaMagra;
      const peso = parseNum(a.dadosMedidos?.peso);
      const bf = parseNum(a.resultadosCalculados?.percentualGordura ?? a.dadosMedidos?.gordura);
      if (!mm && peso > 0 && bf > 0) {
        mm = peso * (1 - bf / 100);
      }
      return {
        data: a.data,
        valor: mm,
        avaliador: a.avaliadorId?.nome || a.avaliadorNome
      };
    })
  );
  if (magraM) compMetrics.push(magraM);

  // Massa Gorda
  const gordaM = buildMetric(
    'massaGorda',
    'composicao',
    'Massa Gorda',
    'kg',
    'Composição',
    'decrease_good',
    sortedAs.map(a => {
      let mg = a.resultadosCalculados?.massaGordaKg ?? a.resultadosCalculados?.massaGorda ?? a.dadosMedidos?.massaGorda;
      const peso = parseNum(a.dadosMedidos?.peso);
      const bf = parseNum(a.resultadosCalculados?.percentualGordura ?? a.dadosMedidos?.gordura);
      if (!mg && peso > 0 && bf > 0) {
        mg = (peso * bf) / 100;
      }
      return {
        data: a.data,
        valor: mg,
        avaliador: a.avaliadorId?.nome || a.avaliadorNome
      };
    })
  );
  if (gordaM) compMetrics.push(gordaM);

  // IMC
  const imcM = buildMetric(
    'imc',
    'composicao',
    'IMC (Índice de Massa Corporal)',
    'kg/m²',
    'Antropometria',
    'neutral',
    sortedAs.map(a => ({
      data: a.data,
      valor: a.resultadosCalculados?.imc,
      avaliador: a.avaliadorId?.nome || a.avaliadorNome
    }))
  );
  if (imcM) compMetrics.push(imcM);

  // RCQ (Relação Cintura-Quadril)
  const rcqM = buildMetric(
    'rcq',
    'composicao',
    'Relação Cintura-Quadril (RCQ)',
    '',
    'Antropometria',
    'decrease_good',
    sortedAs.map(a => ({
      data: a.data,
      valor: a.resultadosCalculados?.rcq,
      avaliador: a.avaliadorId?.nome || a.avaliadorNome
    }))
  );
  if (rcqM) compMetrics.push(rcqM);

  // 2. PERIMETRIA & CIRCUNFERÊNCIAS
  const perimetriaDef: { key: string; label: string; semantica: SemanticGoal; isWaist?: boolean }[] = [
    { key: 'cintura', label: 'Cintura (Linha Fina)', semantica: 'decrease_good', isWaist: true },
    { key: 'abdomen', label: 'Abdômen (Cintura Umbilical)', semantica: 'decrease_good', isWaist: true },
    { key: 'quadril', label: 'Quadril', semantica: 'neutral' },
    { key: 'torax', label: 'Tórax', semantica: 'increase_good' },
    { key: 'ombros', label: 'Ombros', semantica: 'increase_good' },
    { key: 'pescoco', label: 'Pescoço', semantica: 'neutral' },
    { key: 'braçoD', label: 'Braço Direito', semantica: 'increase_good' },
    { key: 'braçoE', label: 'Braço Esquerdo', semantica: 'increase_good' },
    { key: 'antebraçoD', label: 'Antebraço Direito', semantica: 'increase_good' },
    { key: 'antebraçoE', label: 'Antebraço Esquerdo', semantica: 'increase_good' },
    { key: 'coxaD', label: 'Coxa Direita', semantica: 'increase_good' },
    { key: 'coxaE', label: 'Coxa Esquerda', semantica: 'increase_good' },
    { key: 'panturrilhaD', label: 'Panturrilha Direita', semantica: 'increase_good' },
    { key: 'panturrilhaE', label: 'Panturrilha Esquerda', semantica: 'increase_good' }
  ];

  const perimetriaMetrics: MetricEvolution[] = [];
  const perimetriaSymmetries: SymmetryEvolution[] = [];

  perimetriaDef.forEach(def => {
    const m = buildMetric(
      `circ_${def.key}`,
      'perimetria',
      def.label,
      'cm',
      def.isWaist ? 'Linha Central' : 'Perímetro Muscular',
      def.semantica,
      sortedAs.map(a => ({
        data: a.data,
        valor: a.dadosMedidos?.circunferencias?.[def.key],
        avaliador: a.avaliadorId?.nome || a.avaliadorNome
      }))
    );
    if (m) perimetriaMetrics.push(m);
  });

  // Simetrias bilaterais de perimetria (Braço, Coxa, Panturrilha)
  const bilateralPairs = [
    { id: 'sim_braco', nome: 'Simetria de Braços', dKey: 'braçoD', eKey: 'braçoE' },
    { id: 'sim_coxa', nome: 'Simetria de Coxas', dKey: 'coxaD', eKey: 'coxaE' },
    { id: 'sim_panturrilha', nome: 'Simetria de Panturrilhas', dKey: 'panturrilhaD', eKey: 'panturrilhaE' }
  ];

  bilateralPairs.forEach(pair => {
    const pontos = sortedAs
      .map(a => {
        const circ = a.dadosMedidos?.circunferencias || {};
        const d = parseNum(circ[pair.dKey]);
        const e = parseNum(circ[pair.eKey]);
        if (isNaN(d) || isNaN(e) || d <= 0 || e <= 0) return null;
        const diff = Math.abs(d - e);
        const maior = Math.max(d, e);
        const simetria = maior > 0 ? Number(((1 - diff / maior) * 100).toFixed(1)) : 100;
        const classificacao = diff <= 0.5 ? 'Equilibrado' : diff <= 1.5 ? 'Assimetria Leve' : 'Assimetria Relevante';
        return {
          data: a.data,
          dataFormatada: formatDateSafeBR(a.data),
          valorD: d,
          valorE: e,
          diferenca: Number(diff.toFixed(1)),
          indiceSimetria: simetria,
          classificacao: classificacao as any
        };
      })
      .filter(Boolean) as SymmetryEvolution['historico'];

    if (pontos.length >= 2) {
      const ult = pontos[pontos.length - 1];
      const pen = pontos[pontos.length - 2];
      perimetriaSymmetries.push({
        id: pair.id,
        nome: pair.nome,
        unidade: 'cm',
        historico: pontos,
        ultimoD: ult.valorD,
        ultimoE: ult.valorE,
        ultimaDiferenca: ult.diferenca,
        ultimoIndiceSimetria: ult.indiceSimetria,
        ultimaClassificacao: ult.classificacao,
        penultimoIndiceSimetria: pen.indiceSimetria,
        evolucaoSimetriaDelta: Number((ult.indiceSimetria - pen.indiceSimetria).toFixed(1))
      });
    }
  });

  // 3. DOBRAS CUTÂNEAS (PLICOMETRIA)
  const dobrasDef = [
    { key: 'peitoral', label: 'Dobra Peitoral' },
    { key: 'triceps', label: 'Dobra Tríceps' },
    { key: 'subescapular', label: 'Dobra Subescapular' },
    { key: 'subaxilar', label: 'Dobra Subaxilar / Axilar Média' },
    { key: 'suprailiaca', label: 'Dobra Suprailíaca' },
    { key: 'abdomen', label: 'Dobra Abdominal' },
    { key: 'coxa', label: 'Dobra Coxa' },
    { key: 'panturrilha', label: 'Dobra Panturrilha' }
  ];

  const dobrasMetrics: MetricEvolution[] = [];
  dobrasDef.forEach(def => {
    const m = buildMetric(
      `dobra_${def.key}`,
      'dobras',
      def.label,
      'mm',
      'Espessura Subcutânea',
      'decrease_good',
      sortedAs.map(a => ({
        data: a.data,
        valor: a.dadosMedidos?.dobras?.[def.key],
        avaliador: a.avaliadorId?.nome || a.avaliadorNome
      }))
    );
    if (m) dobrasMetrics.push(m);
  });

  // Soma de Dobras
  const somaM = buildMetric(
    'dobras_soma',
    'dobras',
    'Soma Total de Dobras (Σ)',
    'mm',
    'Adipometria Geral',
    'decrease_good',
    sortedAs.map(a => ({
      data: a.data,
      valor: a.dadosMedidos?.somaDobras,
      avaliador: a.avaliadorId?.nome || a.avaliadorNome
    }))
  );
  if (somaM) dobrasMetrics.push(somaM);

  // 4. GONIOMETRIA & ADM (AMPLITUDE ARTICULAR)
  const gonioPairsDef = [
    { id: 'quadril_flex1', label: 'Quadril - Flexão com Joelho Estendido', dKey: 'quadrilFlexao1D', eKey: 'quadrilFlexao1E' },
    { id: 'quadril_flex2', label: 'Quadril - Flexão com Joelho Dobrado', dKey: 'quadrilFlexao2D', eKey: 'quadrilFlexao2E' },
    { id: 'quadril_rot_int', label: 'Quadril - Rotação Interna', dKey: 'quadrilRotIntD', eKey: 'quadrilRotIntE' },
    { id: 'quadril_rot_ext', label: 'Quadril - Rotação Externa', dKey: 'quadrilRotExtD', eKey: 'quadrilRotExtE' },
    { id: 'joelho_flex', label: 'Joelho - Flexão', dKey: 'joelhoFlexaoD', eKey: 'joelhoFlexaoE' },
    { id: 'joelho_popliteo', label: 'Joelho - Ângulo Poplíteo', dKey: 'joelhoPopliteoD', eKey: 'joelhoPopliteoE' },
    { id: 'tornozelo_dorsi1', label: 'Tornozelo - Dorsiflexão Joelho Estendido', dKey: 'tornozeloDorsi1D', eKey: 'tornozeloDorsi1E' },
    { id: 'tornozelo_dorsi2', label: 'Tornozelo - Dorsiflexão Joelho Fletido', dKey: 'tornozeloDorsi2D', eKey: 'tornozeloDorsi2E' },
    { id: 'tornozelo_plantar', label: 'Tornozelo - Flexão Plantar', dKey: 'tornozeloFlexaoPlantarD', eKey: 'tornozeloFlexaoPlantarE' },
    { id: 'ombro_rot_int', label: 'Ombro - Rotação Interna', dKey: 'ombroRotIntD', eKey: 'ombroRotIntE' },
    { id: 'ombro_rot_ext', label: 'Ombro - Rotação Externa', dKey: 'ombroRotExtD', eKey: 'ombroRotExtE' },
    { id: 'ombro_abducao', label: 'Ombro - Abdução', dKey: 'ombroAbducaoD', eKey: 'ombroAbducaoE' },
    { id: 'ombro_flexao', label: 'Ombro - Flexão', dKey: 'ombroFlexaoD', eKey: 'ombroFlexaoE' }
  ];

  const gonioMetrics: MetricEvolution[] = [];
  const gonioSymmetries: SymmetryEvolution[] = [];

  gonioPairsDef.forEach(pair => {
    // Métrica lado Direito
    const mD = buildMetric(
      `gonio_${pair.dKey}`,
      'mobilidade',
      `${pair.label} (Direito)`,
      '°',
      'ADM Articular',
      'increase_good',
      sortedAs.map(a => ({
        data: a.data,
        valor: a.dadosMedidos?.goniometria?.[pair.dKey],
        avaliador: a.avaliadorId?.nome || a.avaliadorNome
      }))
    );
    if (mD) gonioMetrics.push(mD);

    // Métrica lado Esquerdo
    const mE = buildMetric(
      `gonio_${pair.eKey}`,
      'mobilidade',
      `${pair.label} (Esquerdo)`,
      '°',
      'ADM Articular',
      'increase_good',
      sortedAs.map(a => ({
        data: a.data,
        valor: a.dadosMedidos?.goniometria?.[pair.eKey],
        avaliador: a.avaliadorId?.nome || a.avaliadorNome
      }))
    );
    if (mE) gonioMetrics.push(mE);

    // Simetria bilateral de ADM
    const pontos = sortedAs
      .map(a => {
        const gonio = a.dadosMedidos?.goniometria || {};
        const d = parseNum(gonio[pair.dKey]);
        const e = parseNum(gonio[pair.eKey]);
        if (isNaN(d) || isNaN(e) || d <= 0 || e <= 0) return null;
        const diff = Math.abs(d - e);
        const maior = Math.max(d, e);
        const simetria = maior > 0 ? Number(((1 - diff / maior) * 100).toFixed(1)) : 100;
        const classificacao = diff <= 5 ? 'Equilibrado' : diff <= 10 ? 'Assimetria Leve' : 'Assimetria Relevante';
        return {
          data: a.data,
          dataFormatada: formatDateSafeBR(a.data),
          valorD: d,
          valorE: e,
          diferenca: Number(diff.toFixed(1)),
          indiceSimetria: simetria,
          classificacao: classificacao as any
        };
      })
      .filter(Boolean) as SymmetryEvolution['historico'];

    if (pontos.length >= 2) {
      const ult = pontos[pontos.length - 1];
      const pen = pontos[pontos.length - 2];
      gonioSymmetries.push({
        id: `sim_${pair.id}`,
        nome: `Simetria: ${pair.label}`,
        unidade: '°',
        historico: pontos,
        ultimoD: ult.valorD,
        ultimoE: ult.valorE,
        ultimaDiferenca: ult.diferenca,
        ultimoIndiceSimetria: ult.indiceSimetria,
        ultimaClassificacao: ult.classificacao,
        penultimoIndiceSimetria: pen.indiceSimetria,
        evolucaoSimetriaDelta: Number((ult.indiceSimetria - pen.indiceSimetria).toFixed(1))
      });
    }
  });

  // 5. TESTES FUNCIONAIS & ESPECIAIS (STEP DOWN, THOMAS, Y-TEST)
  const funcionaisMetrics: MetricEvolution[] = [];

  // Step Down Test
  const stepDownPoints = sortedAs
    .map(a => {
      const sdRaw = a.dadosMedidos?.testesEspeciais?.stepDown;
      if (!sdRaw) return null;
      let score = parseNum(sdRaw);
      if (isNaN(score) && typeof sdRaw === 'string') {
        const match = sdRaw.match(/\d+/);
        if (match) score = parseInt(match[0], 10);
      }
      return {
        data: a.data,
        valor: score,
        obs: typeof sdRaw === 'string' ? sdRaw : undefined
      };
    })
    .filter(Boolean) as any[];

  const stepDownM = buildMetric(
    'test_step_down',
    'funcionais',
    'Step Down Test (Escore de Compensação)',
    'pts',
    'Estabilidade de Quadril/Joelho',
    'decrease_good', // menor escore = melhor controle (0 é excelente)
    stepDownPoints
  );
  if (stepDownM) funcionaisMetrics.push(stepDownM);

  // Thomas Test (Iliopsoas)
  const thomasIliopsoasD = buildMetric(
    'thomas_iliopsoas_d',
    'funcionais',
    'Teste de Thomas - Iliopsoas Direito',
    '°',
    'Comprimento Muscular',
    'increase_good',
    sortedAs.map(a => ({
      data: a.data,
      valor: a.dadosMedidos?.testesEspeciais?.thomasIliopsoasD
    }))
  );
  if (thomasIliopsoasD) funcionaisMetrics.push(thomasIliopsoasD);

  const thomasIliopsoasE = buildMetric(
    'thomas_iliopsoas_e',
    'funcionais',
    'Teste de Thomas - Iliopsoas Esquerdo',
    '°',
    'Comprimento Muscular',
    'increase_good',
    sortedAs.map(a => ({
      data: a.data,
      valor: a.dadosMedidos?.testesEspeciais?.thomasIliopsoasE
    }))
  );
  if (thomasIliopsoasE) funcionaisMetrics.push(thomasIliopsoasE);

  // 6. DINAMOMETRIA & TESTES DE FORÇA
  const sortedSt = [...strengthTests].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const forcaMetrics: MetricEvolution[] = [];
  const forcaSymmetries: SymmetryEvolution[] = [];

  // Exercícios de Força em Aparelhos / 1RM
  const nomesExerciciosForca = [
    'Supino Reto',
    'Remada Curvada / Máquina',
    'Puxada Alta / Lat Pulldown',
    'Desenvolvimento de Ombros',
    'Leg Press',
    'Agachamento',
    'Extensora',
    'Flexora'
  ];

  nomesExerciciosForca.forEach(nomeEx => {
    const pontosEx = sortedSt
      .map(st => {
        const match = st.exercicios?.find((e: any) =>
          (e.nome || '').toLowerCase().includes(nomeEx.toLowerCase().split(' ')[0])
        );
        const carga = match ? parseNum(match.carga) : NaN;
        return {
          data: st.data,
          valor: carga,
          detalhes: match ? { reps: match.reps } : undefined
        };
      })
      .filter(p => !isNaN(p.valor));

    const exM = buildMetric(
      `forca_ex_${nomeEx.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      'forca',
      `Força Máxima: ${nomeEx}`,
      'kg',
      'Sobrecarga / 1RM',
      'increase_good',
      pontosEx
    );
    if (exM) forcaMetrics.push(exM);
  });

  // Dinamometria Isométrica Estruturada (testesRealizados & comparativos)
  const testesArticulacoes = ['Ombro - Rotação Externa', 'Ombro - Rotação Interna', 'Quadril - Abdução', 'Joelho - Extensão', 'Joelho - Flexão'];

  testesArticulacoes.forEach(artNome => {
    const pontosD: any[] = [];
    const pontosE: any[] = [];

    sortedSt.forEach(st => {
      if (!st.testesRealizados || !Array.isArray(st.testesRealizados)) return;
      st.testesRealizados.forEach((tr: any) => {
        const fullDesc = `${tr.articulacao || ''} - ${tr.movimento || ''}`.trim();
        if (fullDesc.toLowerCase().includes(artNome.toLowerCase().split(' - ')[1] || '')) {
          if (tr.lado === 'Direito') {
            pontosD.push({ data: st.data, valor: parseNum(tr.valorObtido || tr.forcaN) });
          } else if (tr.lado === 'Esquerdo') {
            pontosE.push({ data: st.data, valor: parseNum(tr.valorObtido || tr.forcaN) });
          }
        }
      });
    });

    const mD = buildMetric(`dinam_${artNome}_d`, 'forca', `Dinamometria: ${artNome} (D)`, 'kgf', 'Força Isométrica', 'increase_good', pontosD);
    const mE = buildMetric(`dinam_${artNome}_e`, 'forca', `Dinamometria: ${artNome} (E)`, 'kgf', 'Força Isométrica', 'increase_good', pontosE);
    if (mD) forcaMetrics.push(mD);
    if (mE) forcaMetrics.push(mE);
  });

  // 7. DOR, QUEIXA CLÍNICA & ESCALA EVA
  const sortedReports = [...reports].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const clinicaMetrics: MetricEvolution[] = [];

  const evaPoints = sortedReports
    .map(r => ({
      data: r.data,
      valor: r.conteudo?.dorEscala !== undefined ? parseNum(r.conteudo.dorEscala) : NaN,
      obs: r.conteudo?.queixaPrincipal || r.conteudo?.evolucao
    }))
    .filter(p => !isNaN(p.valor));

  const evaM = buildMetric(
    'clinica_eva',
    'clinica',
    'Escala Visual Analógica de Dor (EVA)',
    '/10',
    'Conforto & Reabilitação',
    'decrease_good', // Menos dor é melhora clínica
    evaPoints
  );
  if (evaM) clinicaMetrics.push(evaM);

  // 8. WELLNESS & PRONTIDÃO
  const sortedWellness = [...wellnessLogs].sort((a, b) => (a.data || '').localeCompare(b.data || ''));
  const wellnessMetrics: MetricEvolution[] = [];

  const sonoM = buildMetric(
    'well_sono',
    'wellness',
    'Qualidade do Sono',
    'pts',
    'Recuperação',
    'increase_good',
    sortedWellness.map(w => ({ data: w.data, valor: w.sono }))
  );
  if (sonoM) wellnessMetrics.push(sonoM);

  const fadigaM = buildMetric(
    'well_fadiga',
    'wellness',
    'Nível de Fadiga',
    'pts',
    'Prontidão',
    'decrease_good',
    sortedWellness.map(w => ({ data: w.data, valor: w.fadiga }))
  );
  if (fadigaM) wellnessMetrics.push(fadigaM);

  const dorMuscularM = buildMetric(
    'well_dor',
    'wellness',
    'Dor Muscular Tardia',
    'pts',
    'Recuperação',
    'decrease_good',
    sortedWellness.map(w => ({ data: w.data, valor: w.dorMuscular }))
  );
  if (dorMuscularM) wellnessMetrics.push(dorMuscularM);

  // MONTA OS GRUPOS ESTRUTURADOS
  const grupos: Record<string, EvolutionGroup> = {
    composicao: {
      id: 'composicao',
      titulo: 'Composição Corporal',
      subtitulo: 'Peso, massa magra, gordura corporal e índices antropométricos',
      icone: 'fa-chart-pie',
      cor: '#10b981',
      metricas: compMetrics,
      totalElegiveis: compMetrics.length
    },
    perimetria: {
      id: 'perimetria',
      titulo: 'Medidas & Perimetria',
      subtitulo: 'Circunferências musculares, linha de cintura e simetrias de membros',
      icone: 'fa-ruler-combined',
      cor: '#38bdf8',
      metricas: perimetriaMetrics,
      simetrias: perimetriaSymmetries,
      totalElegiveis: perimetriaMetrics.length + perimetriaSymmetries.length
    },
    dobras: {
      id: 'dobras',
      titulo: 'Dobras Cutâneas',
      subtitulo: 'Espessura subcutânea milimétrica e soma das dobras',
      icone: 'fa-compress',
      cor: '#a855f7',
      metricas: dobrasMetrics,
      totalElegiveis: dobrasMetrics.length
    },
    mobilidade: {
      id: 'mobilidade',
      titulo: 'Mobilidade & Goniometria',
      subtitulo: 'Amplitude de movimento articular e equilíbrio bilateral em graus',
      icone: 'fa-arrows-spin',
      cor: '#f59e0b',
      metricas: gonioMetrics,
      simetrias: gonioSymmetries,
      totalElegiveis: gonioMetrics.length + gonioSymmetries.length
    },
    forca: {
      id: 'forca',
      titulo: 'Força & Cargas',
      subtitulo: 'Dinamometria isométrica computadorizada e progressão de 1RM',
      icone: 'fa-dumbbell',
      cor: '#06b6d4',
      metricas: forcaMetrics,
      simetrias: forcaSymmetries,
      totalElegiveis: forcaMetrics.length + forcaSymmetries.length
    },
    funcionais: {
      id: 'funcionais',
      titulo: 'Testes Biomecânicos',
      subtitulo: 'Step Down, estabilidade articular e testes ortopédicos especiais',
      icone: 'fa-person-walking',
      cor: '#ec4899',
      metricas: funcionaisMetrics,
      totalElegiveis: funcionaisMetrics.length
    },
    clinica: {
      id: 'clinica',
      titulo: 'Dor & Fisioterapia',
      subtitulo: 'Escala Visual Analógica (EVA), alívio de sintomas e evolução clínica',
      icone: 'fa-stethoscope',
      cor: '#14b8a6',
      metricas: clinicaMetrics,
      totalElegiveis: clinicaMetrics.length
    },
    wellness: {
      id: 'wellness',
      titulo: 'Bem-Estar & Prontidão',
      subtitulo: 'Qualidade de sono, controle de fadiga e prontidão neuromuscular',
      icone: 'fa-heart-pulse',
      cor: '#6366f1',
      metricas: wellnessMetrics,
      totalElegiveis: wellnessMetrics.length
    }
  };

  const gruposOrdenados = Object.values(grupos);
  const totalMetricasAtivas = gruposOrdenados.reduce((acc, g) => acc + g.totalElegiveis, 0);

  return {
    alunoId: '',
    totalMetricasAtivas,
    grupos,
    gruposOrdenados
  };
}
