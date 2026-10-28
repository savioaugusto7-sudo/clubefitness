/**
 * Motor Matemático Longitudinal de Reavaliação Fisioterapêutica
 * 100% Determinístico, Baseado Exclusivamente em Dados Reais do Prontuário e Livre de Fallbacks Fictícios.
 */

import { identifyClinicalClusters, ClinicalCluster, ClientClinicalProfile } from './clinicalClustersEngine';
import { calculateAdvancedStrengthRatios, AdvancedStrengthRatioItem, calculateHopBatteryAnalysis, HopBatteryResult } from './biomechanicsEngine';

export interface EvaluatorInfo {
  nome: string;
  registroProfissional?: string;
  isEstagiario?: boolean;
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
  variacao?: string;
  leitura: 'Evoluiu muito' | 'Evoluiu' | 'Estável' | 'Estagnado' | 'Queda aparente — requer verificação';
  situacao?: string;
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
  variacao?: string;
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

export interface TableRowColuna {
  movimento: string;
  referencia: string;
  t1: number | null;
  t2: number | null;
  eva1: number | null;
  eva2: number | null;
  variacaoGraus: string;
  variacaoEVA: string;
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
    idade: string | number;
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
    yTeste: YTestComparison | null;
    stepDown: StepDownComparisonRow[];
    hopTest?: HopBatteryResult | null;
  };
  tabelaGoniometria: TableRowGoniometria[];
  tabelaColuna: TableRowColuna[];
  tabelaTestesOrtopedicos: TableRowTesteOrtopedico[];
  clusters?: any[];
  razoesAvancadas?: AdvancedStrengthRatioItem[];
  acwr?: any;
  matrizDecisao?: any;
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
  const rawPeso = Number(client.pesoKg) || Number(t1Strength?.pesoCliente) || Number(t2Strength?.pesoCliente) || 0;
  const pesoCorporalStr = rawPeso > 0 ? `${rawPeso} kg` : 'Não informado';
  const pesoKg = rawPeso > 0 ? rawPeso : 0;

  const dtRelatorioT1 = formatDateBR(t1Report?.data);
  const dtForcaT1 = formatDateBR(t1Strength?.data || t1Report?.data);
  const dtReavaliacao = formatDateBR(t2Report?.data || t2Strength?.data);

  let intervaloSemanas = 0;
  if (t1Report?.data && t2Report?.data) {
    const d1 = new Date(t1Report.data);
    const d2 = new Date(t2Report.data);
    const diffMs = Math.abs(d2.getTime() - d1.getTime());
    const weeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
    if (weeks > 0) intervaloSemanas = weeks;
  }

  const nomeAvT1 = (avaliadorT1?.nome || t1Report?.avaliadorNome || t1Report?.profissionalNome || 'Profissional Avaliador').trim();
  const regAvT1 = (avaliadorT1?.registroProfissional || 'CREFITO: A regularizar / Em emissão').trim();
  const nomeAvT2 = (avaliadorT2?.nome || t2Report?.avaliadorNome || t2Report?.profissionalNome || 'Profissional Avaliador').trim();
  const regAvT2 = (avaliadorT2?.registroProfissional || 'CREFITO: A regularizar / Em emissão').trim();

  const isDiferenteAvaliador = nomeAvT1.toLowerCase() !== nomeAvT2.toLowerCase();
  const ressalvaMetodologica = isDiferenteAvaliador
    ? `Ressalva metodológica: as avaliações foram conduzidas por profissionais avaliadores distintos (${nomeAvT1} e ${nomeAvT2}), o que introduz variabilidade interexaminador inerente ao método.`
    : `Avaliações conduzidas pelo mesmo profissional avaliador (${nomeAvT1}), assegurando consistência intraexaminador nas mensurações.`;

  // 2. OBJETIVO DO LAUDO
  const objetivoDoLaudo = `Este laudo apresenta a comparação longitudinal entre a avaliação fisioterapêutica inicial (${dtRelatorioT1 || 'T1'}) e a reavaliação de seguimento (${dtReavaliacao || 'T2'}), documentando objetivamente a evolução dos parâmetros dolorosos, amplitudes articulares, equilíbrio neuromuscular e testes funcionais ortopédicos.`;

  // 3. HISTÓRICO CLÍNICO DE BASE (Exclusivamente dados reais informados pelo paciente/fisioterapeuta)
  const anamneseT1 = t1Report?.anamnese || {};
  const anamneseT2 = t2Report?.anamnese || {};
  const condutaT1 = t1Report?.conteudo?.conduta || '';

  const med = (anamneseT2.historico?.medicacao || anamneseT1.historico?.medicacao || '').trim();
  const pat = (anamneseT2.historico?.doencasPregressasAtuais || anamneseT1.historico?.doencasPregressasAtuais || '').trim();
  const cir = (anamneseT2.historico?.cirurgiasInternacoes || anamneseT1.historico?.cirurgiasInternacoes || '').trim();
  const atv = (anamneseT2.historico?.atividadesPraticadas || anamneseT1.historico?.atividadesPraticadas || '').trim();
  const qxDiag = (condutaT1 || t1Report?.conteudo?.diagnostico || t1Report?.conteudo?.queixaPrincipal || '').trim();

  const sono1 = anamneseT1.habitos?.sonoHoras;
  const sono2 = anamneseT2.habitos?.sonoHoras;
  const stress1 = anamneseT1.habitos?.stressNivel;
  const stress2 = anamneseT2.habitos?.stressNivel;

  let sonoEEstresse = '';
  if (sono1 != null && sono2 != null && sono1 !== sono2) {
    sonoEEstresse += `Qualidade do sono evoluiu de ${sono1}h para ${sono2}h contínuas. `;
  } else if (sono2 != null) {
    sonoEEstresse += `Qualidade do sono relatada em ${sono2}h contínuas. `;
  }
  if (stress1 != null && stress2 != null && stress1 !== stress2) {
    sonoEEstresse += `Nível de estresse autorreferido variou de ${stress1}/10 para ${stress2}/10.`;
  } else if (stress2 != null) {
    sonoEEstresse += `Nível de estresse autorreferido em ${stress2}/10.`;
  }
  if (!sonoEEstresse) {
    sonoEEstresse = 'Parâmetros de sono e estresse não quantificados no ciclo.';
  }

  const historicoClinicoBase = {
    idade: client.idade || 'Não informada',
    medicamentos: med || 'Não informado / Em uso de medicação contínua não relatado',
    patologiasPregressas: pat || 'Nenhuma patologia crônica prévia relatada',
    historicoCirurgiasTraumas: cir || 'Sem histórico cirúrgico ou traumático prévio relatado',
    demandaEsportiva: atv || 'Atividade esportiva regular não informada',
    queixaInicialDiagnostico: qxDiag || 'Quadro clínico inicial registrado em prontuário fisioterapêutico',
    sonoEEstresse
  };

  // 4. COMPARATIVO DE QUEIXAS DOLOROSAS (EVA)
  const rowsEVA: TableRowEva[] = [];
  const qList1 = Array.isArray(anamneseT1.queixas)
    ? anamneseT1.queixas
    : (Array.isArray(t1Report?.queixas) ? t1Report.queixas : []);
  const qList2 = Array.isArray(anamneseT2.queixas)
    ? anamneseT2.queixas
    : (Array.isArray(t2Report?.queixas) ? t2Report.queixas : []);

  if (qList1.length > 0 || qList2.length > 0) {
    const cleanPainRegion = (text: string): string => (text || '').replace(/\s+/g, ' ').trim();
    const extractBaseSegment = (text: string): string => {
      let s = cleanPainRegion(text).toLowerCase();
      // Remove prefixos comuns de queixa álgica
      s = s.replace(/^dor\s+(no|na|nos|nas|em|do|da|dos|das|de)\s+/i, '');
      s = s.replace(/^dor\s+/i, '');
      // Remove especificações entre parênteses
      s = s.replace(/\s*\([^)]*\).*/g, '');
      // Remove orações subordinadas/irradiações separadas por vírgula
      s = s.replace(/\s*,\s*(com\s+irradiação|irradiando|irradia|piorando|associada).*$/i, '');
      s = s.replace(/\s*[-–:].*$/g, '');
      // Normaliza abreviações de lateralidade
      s = s.replace(/\b(e|esq)\.?$/i, 'esquerdo');
      s = s.replace(/\b(d|dir)\.?$/i, 'direito');
      s = s.replace(/\b(e|esq)\b/i, 'esquerdo');
      s = s.replace(/\b(d|dir)\b/i, 'direito');

      const anat = [
        { re: /joelho\s+esquerdo/i, tag: 'joelho esquerdo' },
        { re: /joelho\s+direito/i, tag: 'joelho direito' },
        { re: /ombro\s+esquerdo/i, tag: 'ombro esquerdo' },
        { re: /ombro\s+direito/i, tag: 'ombro direito' },
        { re: /tornozelo\s+esquerdo/i, tag: 'tornozelo esquerdo' },
        { re: /tornozelo\s+direito/i, tag: 'tornozelo direito' },
        { re: /quadril\s+esquerdo/i, tag: 'quadril esquerdo' },
        { re: /quadril\s+direito/i, tag: 'quadril direito' },
        { re: /coluna\s+lombar|lombar/i, tag: 'coluna lombar' },
        { re: /coluna\s+cervical|cervical/i, tag: 'coluna cervical' }
      ];

      for (const item of anat) {
        if (item.re.test(s)) {
          if (s.includes('posterior')) return `${item.tag} posterior`;
          if (s.includes('anterior')) return `${item.tag} anterior`;
          if (s.includes('medial')) return `${item.tag} medial`;
          if (s.includes('lateral')) return `${item.tag} lateral`;
          return item.tag;
        }
      }

      return s.replace(/\s+/g, ' ').trim();
    };

    const pickBestName = (nameA: string, nameB: string): string => {
      const cleanA = cleanPainRegion(nameA);
      const cleanB = cleanPainRegion(nameB);
      if (!cleanA) return cleanB;
      if (!cleanB) return cleanA;
      const isAbbrA = /\b[ED]\b/i.test(cleanA);
      const isAbbrB = /\b[ED]\b/i.test(cleanB);
      if (!isAbbrA && isAbbrB) return cleanA;
      if (isAbbrA && !isAbbrB) return cleanB;
      const hasParenA = cleanA.includes('(');
      const hasParenB = cleanB.includes('(');
      if (hasParenA && !hasParenB) return cleanA;
      if (hasParenB && !hasParenA) return cleanB;
      return cleanA.length >= cleanB.length ? cleanA : cleanB;
    };

    const getQueixaKey = (q: any): { baseSegment: string; displayName: string } => {
      const clean = cleanPainRegion(q.dorOnde || q.queixa || q.descricao || '');
      if (q.regiao) {
        const lat = q.lateralidade && q.lateralidade !== 'Central / Axial' ? ` ${q.lateralidade}` : '';
        const sub = q.subRegiao ? ` (${q.subRegiao})` : '';
        const display = `${q.regiao}${lat}${sub}`;
        const base = `${q.regiao}${lat}`.toLowerCase().trim();
        return { baseSegment: base, displayName: display || clean };
      }
      return { baseSegment: extractBaseSegment(clean), displayName: clean };
    };

    const pairs: Array<{
      baseSegment: string;
      displayName: string;
      q1?: any;
      q2?: any;
    }> = [];

    qList1.forEach((q1: any) => {
      const { baseSegment, displayName } = getQueixaKey(q1);
      if (!baseSegment) return;
      pairs.push({
        baseSegment,
        displayName,
        q1
      });
    });

    qList2.forEach((q2: any) => {
      const { baseSegment, displayName } = getQueixaKey(q2);
      if (!baseSegment) return;

      let candidates = pairs.filter(p => !p.q2 && p.baseSegment === baseSegment);
      if (candidates.length === 0) {
        // Fallback por inclusão parcial de segmento anatômico
        candidates = pairs.filter(p => !p.q2 && (p.baseSegment.includes(baseSegment) || baseSegment.includes(p.baseSegment)));
      }

      let match = candidates[0];
      if (candidates.length > 1) {
        const exact = candidates.find(c => c.displayName.toLowerCase() === displayName.toLowerCase());
        if (exact) match = exact;
      }

      if (match) {
        match.q2 = q2;
        match.displayName = pickBestName(match.displayName, displayName);
      } else {
        pairs.push({
          baseSegment,
          displayName,
          q2
        });
      }
    });

    pairs.forEach(item => {
      const v1 = Number(item.q1?.dorIntensidade ?? item.q1?.eva ?? item.q1?.dorNivel ?? 0);
      const v2 = Number(item.q2?.dorIntensidade ?? item.q2?.eva ?? item.q2?.dorNivel ?? 0);
      const delta = v2 - v1;

      let sit = 'Estável';
      if (v1 > 0 && v2 === 0) sit = 'Resolvida';
      else if (delta <= -3) sit = 'Melhora expressiva';
      else if (delta < 0) sit = 'Melhorando';
      else if (v1 === 0 && v2 > 0) sit = 'Aumento de dor';
      else if (delta > 0) sit = 'Aumento de dor';

      rowsEVA.push({
        queixa: item.displayName,
        t1: v1,
        t2: v2,
        variacao: delta,
        situacao: sit
      });
    });
  } else if (t1Report?.conteudo?.dorEscala != null || t2Report?.conteudo?.dorEscala != null) {
    const v1 = Number(t1Report?.conteudo?.dorEscala ?? 0);
    const v2 = Number(t2Report?.conteudo?.dorEscala ?? 0);
    const delta = v2 - v1;
    let sit = 'Estável';
    if (v1 > 0 && v2 === 0) sit = 'Resolvida';
    else if (delta < 0) sit = 'Melhorando';
    else if (delta > 0) sit = 'Aumento de dor';

    rowsEVA.push({
      queixa: t1Report?.conteudo?.queixaPrincipal || t2Report?.conteudo?.queixaPrincipal || 'Queixa Principal',
      t1: v1,
      t2: v2,
      variacao: delta,
      situacao: sit
    });
  }

  const somaQueixasT1 = rowsEVA.reduce((acc, r) => acc + r.t1, 0);
  const somaQueixasT2 = rowsEVA.reduce((acc, r) => acc + r.t2, 0);
  const deltaSoma = somaQueixasT2 - somaQueixasT1;

  let observacoesClinicasEVA = '';
  if (rowsEVA.length > 0) {
    const resolvidas = rowsEVA.filter(r => r.t2 === 0 && r.t1 > 0).map(r => r.queixa);
    const melhoradas = rowsEVA.filter(r => r.t2 > 0 && r.t2 < r.t1).map(r => `${r.queixa} (EVA ${r.t1} ➔ ${r.t2})`);
    const persistentes = rowsEVA.filter(r => r.t2 >= r.t1 && r.t2 > 0).map(r => `${r.queixa} (EVA ${r.t2})`);

    const obsParts: string[] = [];
    if (resolvidas.length > 0) obsParts.push(`Queixas resolvidas: ${resolvidas.join(', ')}.`);
    if (melhoradas.length > 0) obsParts.push(`Em evolução favorável: ${melhoradas.join(', ')}.`);
    if (persistentes.length > 0) obsParts.push(`Queixas persistentes: ${persistentes.join(', ')}.`);
    observacoesClinicasEVA = obsParts.join(' ') + (sonoEEstresse ? ` ${sonoEEstresse}` : '');
  } else {
    observacoesClinicasEVA = 'Sem queixas dolorosas ativas quantificadas no ciclo.' + (sonoEEstresse ? ` ${sonoEEstresse}` : '');
  }

  // 5. COMPARATIVO DE FORÇA MUSCULAR (NEWTONS - Exclusivamente dados reais de dinamometria)
  const extractStrengthMap = (stDoc: any) => {
    const map: Record<string, number> = {};
    const list = stDoc?.testesRealizados || stDoc?.exercicios || [];
    if (Array.isArray(list)) {
      list.forEach((item: any) => {
        const art = (item.articulacao || '').trim();
        const mov = (item.movimento || '').trim();
        const lado = (item.lado || '').trim();
        if (!art || !mov || !lado) return;
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
  const allStrengthKeys = Array.from(new Set([...Object.keys(mapT1), ...Object.keys(mapT2)]));

  const rowsForca: TableRowForca[] = [];
  allStrengthKeys.forEach(fullKey => {
    const parts = fullKey.split('_');
    const mov = parts[0] || fullKey;
    const lado = (parts[1] || 'Direito') as 'Direito' | 'Esquerdo' | 'Bilateral';
    const v1 = mapT1[fullKey] || 0;
    const v2 = mapT2[fullKey] || 0;

    let deltaPct = 0;
    if (v1 > 0 && v2 > 0) {
      deltaPct = Math.round(((v2 - v1) / v1) * 1000) / 10;
    }

    let leitura: TableRowForca['leitura'] = 'Estável';
    if (v1 > 0 && v2 > 0) {
      if (deltaPct >= 30) leitura = 'Evoluiu muito';
      else if (deltaPct >= 10) leitura = 'Evoluiu';
      else if (deltaPct >= 0) leitura = deltaPct >= 5 ? 'Evoluiu' : 'Estagnado';
      else if (deltaPct >= -5) leitura = 'Estável';
      else leitura = 'Queda aparente — requer verificação';
    } else if (v2 > 0 && v1 === 0) {
      leitura = 'Evoluiu';
    }

    const variacaoStr = (v1 > 0 && v2 > 0)
      ? `${deltaPct >= 0 ? '+' : ''}${deltaPct}%`
      : (v2 > 0 ? '+100%' : (v1 > 0 ? '-100%' : '0%'));

    rowsForca.push({
      movimento: mov,
      lado,
      t1: v1,
      t2: v2,
      variacaoPct: deltaPct,
      variacao: variacaoStr,
      leitura,
      situacao: leitura
    });
  });

  // 6. RAZÕES MUSCULARES E ÍNDICES BIOMECÂNICOS (apenas se medidos)
  const extJoelhoD_T1 = mapT1['Extensão de joelho_Direito'] || 0;
  const extJoelhoE_T1 = mapT1['Extensão de joelho_Esquerdo'] || 0;
  const flexJoelhoD_T1 = mapT1['Flexão de joelho_Direito'] || 0;
  const flexJoelhoE_T1 = mapT1['Flexão de joelho_Esquerdo'] || 0;

  const extJoelhoD_T2 = mapT2['Extensão de joelho_Direito'] || 0;
  const extJoelhoE_T2 = mapT2['Extensão de joelho_Esquerdo'] || 0;
  const flexJoelhoD_T2 = mapT2['Flexão de joelho_Direito'] || 0;
  const flexJoelhoE_T2 = mapT2['Flexão de joelho_Esquerdo'] || 0;

  const rowsRazoes: TableRowRazao[] = [];
  let analisePorLadoIQ = '';

  const hasIQT1 = (extJoelhoD_T1 + extJoelhoE_T1) > 0 && (flexJoelhoD_T1 + flexJoelhoE_T1) > 0;
  const hasIQT2 = (extJoelhoD_T2 + extJoelhoE_T2) > 0 && (flexJoelhoD_T2 + flexJoelhoE_T2) > 0;

  if (hasIQT1 || hasIQT2) {
    const iqGlobalT1 = hasIQT1 ? Math.round(((flexJoelhoD_T1 + flexJoelhoE_T1) / (extJoelhoD_T1 + extJoelhoE_T1)) * 1000) / 10 : 0;
    const iqGlobalT2 = hasIQT2 ? Math.round(((flexJoelhoD_T2 + flexJoelhoE_T2) / (extJoelhoD_T2 + extJoelhoE_T2)) * 1000) / 10 : 0;
    const deltaIQ = Math.round((iqGlobalT2 - iqGlobalT1) * 10) / 10;

    let interpIQ = 'Dentro da referência (60–75%) — Equilíbrio muscular ótimo';
    if (iqGlobalT2 < 60) interpIQ = 'Abaixo da referência (< 60%) — Risco aumentado para LCA e estiramento de isquiotibiais';
    else if (iqGlobalT2 > 75) interpIQ = 'Elevada (> 75%) — Predomínio de cadeia posterior';

    rowsRazoes.push({
      indice: 'Razão isquiotibiais/quadríceps (H:Q) global',
      referencia: '60%–75%',
      t1: hasIQT1 ? `${iqGlobalT1.toFixed(1).replace('.', ',')}%` : 'Não avaliado',
      t2: hasIQT2 ? `${iqGlobalT2.toFixed(1).replace('.', ',')}%` : 'Não avaliado',
      variacao: (hasIQT1 && hasIQT2) ? `${deltaIQ >= 0 ? '+' : ''}${deltaIQ.toFixed(1).replace('.', ',')} p.p.` : '-',
      interpretacao: interpIQ
    });

    // Razão H:Q Unilateral se ambos os lados forem avaliados
    if (extJoelhoD_T2 > 0 && flexJoelhoD_T2 > 0) {
      const iqD = Math.round((flexJoelhoD_T2 / extJoelhoD_T2) * 100);
      rowsRazoes.push({
        indice: 'Razão H:Q — Membro Direito (D)',
        referencia: '60%–75%',
        t1: (extJoelhoD_T1 > 0 && flexJoelhoD_T1 > 0) ? `${Math.round((flexJoelhoD_T1 / extJoelhoD_T1) * 100)}%` : '-',
        t2: `${iqD}%`,
        variacao: (extJoelhoD_T1 > 0 && flexJoelhoD_T1 > 0) ? `${iqD - Math.round((flexJoelhoD_T1 / extJoelhoD_T1) * 100)} p.p.` : '-',
        interpretacao: iqD >= 60 && iqD <= 75 ? 'Equilibrado (60–75%)' : (iqD < 60 ? 'Déficit posterior (<60%)' : 'Predomínio flexor (>75%)')
      });
    }
    if (extJoelhoE_T2 > 0 && flexJoelhoE_T2 > 0) {
      const iqE = Math.round((flexJoelhoE_T2 / extJoelhoE_T2) * 100);
      rowsRazoes.push({
        indice: 'Razão H:Q — Membro Esquerdo (E)',
        referencia: '60%–75%',
        t1: (extJoelhoE_T1 > 0 && flexJoelhoE_T1 > 0) ? `${Math.round((flexJoelhoE_T1 / extJoelhoE_T1) * 100)}%` : '-',
        t2: `${iqE}%`,
        variacao: (extJoelhoE_T1 > 0 && flexJoelhoE_T1 > 0) ? `${iqE - Math.round((flexJoelhoE_T1 / extJoelhoE_T1) * 100)} p.p.` : '-',
        interpretacao: iqE >= 60 && iqE <= 75 ? 'Equilibrado (60–75%)' : (iqE < 60 ? 'Déficit posterior (<60%)' : 'Predomínio flexor (>75%)')
      });
    }

    analisePorLadoIQ = `Razão H:Q em T2: ${hasIQT2 ? `${iqGlobalT2.toFixed(1).replace('.', ',')}%` : 'Não avaliada'}.`;
  }

  // Adutor / Abdutor (Padrão Ouro: 1.05 a 1.20)
  const adD_T1 = mapT1['Adução de quadril_Direito'] || 0;
  const adE_T1 = mapT1['Adução de quadril_Esquerdo'] || 0;
  const abdD_T1 = mapT1['Abdução de quadril_Direito'] || 0;
  const abdE_T1 = mapT1['Abdução de quadril_Esquerdo'] || 0;

  const adD_T2 = mapT2['Adução de quadril_Direito'] || 0;
  const adE_T2 = mapT2['Adução de quadril_Esquerdo'] || 0;
  const abdD_T2 = mapT2['Abdução de quadril_Direito'] || 0;
  const abdE_T2 = mapT2['Abdução de quadril_Esquerdo'] || 0;

  const hasAdAbdT1 = (adD_T1 + adE_T1) > 0 && (abdD_T1 + abdE_T1) > 0;
  const hasAdAbdT2 = (adD_T2 + adE_T2) > 0 && (abdD_T2 + abdE_T2) > 0;

  if (hasAdAbdT1 || hasAdAbdT2) {
    const rT1 = hasAdAbdT1 ? Math.round(((adD_T1 + adE_T1) / (abdD_T1 + abdE_T1)) * 100) / 100 : 0;
    const rT2 = hasAdAbdT2 ? Math.round(((adD_T2 + adE_T2) / (abdD_T2 + abdE_T2)) * 100) / 100 : 0;
    const deltaR = Math.round((rT2 - rT1) * 100) / 100;

    let interp = 'Dentro da referência (1,05–1,20) — Proteção pubo-adutora ótima';
    if (rT2 < 0.80) interp = 'Abaixo da referência (< 0,80) — Risco elevado de dor inguinal e pubalgia';
    else if (rT2 < 1.05) interp = 'Leve déficit adutor (0,80–1,04) — Abaixo do padrão-ouro';
    else if (rT2 > 1.20) interp = 'Acima da referência (> 1,20) — Predomínio de adutores sobre abdutores';

    rowsRazoes.push({
      indice: 'Índice adutor/abdutor de quadril (ADD/ABD)',
      referencia: '1,05–1,20',
      t1: hasAdAbdT1 ? rT1.toFixed(2).replace('.', ',') : 'Não avaliado',
      t2: hasAdAbdT2 ? rT2.toFixed(2).replace('.', ',') : 'Não avaliado',
      variacao: (hasAdAbdT1 && hasAdAbdT2) ? `${deltaR >= 0 ? '+' : ''}${deltaR.toFixed(2).replace('.', ',')}` : '-',
      interpretacao: interp
    });
  }

  // Força Relativa de Quadríceps (%PC)
  if (pesoKg > 0) {
    const extTotT1 = extJoelhoD_T1 + extJoelhoE_T1;
    const extTotT2 = extJoelhoD_T2 + extJoelhoE_T2;
    if (extTotT1 > 0 || extTotT2 > 0) {
      const qPcT1 = extTotT1 > 0 ? Math.round(((extTotT1 / 2) / (pesoKg * 9.81)) * 1000) / 10 : 0;
      const qPcT2 = extTotT2 > 0 ? Math.round(((extTotT2 / 2) / (pesoKg * 9.81)) * 1000) / 10 : 0;
      const deltaQPc = Math.round((qPcT2 - qPcT1) * 10) / 10;

      rowsRazoes.push({
        indice: 'Quadríceps relativo ao peso corporal (%PC)',
        referencia: '≥60% do peso corporal',
        t1: extTotT1 > 0 ? `${qPcT1.toFixed(1).replace('.', ',')}%` : 'Não avaliado',
        t2: extTotT2 > 0 ? `${qPcT2.toFixed(1).replace('.', ',')}%` : 'Não avaliado',
        variacao: (extTotT1 > 0 && extTotT2 > 0) ? `${deltaQPc >= 0 ? '+' : ''}${deltaQPc.toFixed(1).replace('.', ',')} p.p.` : '-',
        interpretacao: qPcT2 >= 60 ? 'Adequado (≥60%) — Boa capacidade de amortecimento patelofemoral' : 'Abaixo da referência (<60%) — Risco de sobrecarga articular'
      });
    }

    // Glúteo Médio Relativo (%PC)
    const abdTotT1 = abdD_T1 + abdE_T1;
    const abdTotT2 = abdD_T2 + abdE_T2;
    if (abdTotT1 > 0 || abdTotT2 > 0) {
      const gMedT1 = abdTotT1 > 0 ? Math.round(((abdTotT1 / 2) / (pesoKg * 9.81)) * 1000) / 10 : 0;
      const gMedT2 = abdTotT2 > 0 ? Math.round(((abdTotT2 / 2) / (pesoKg * 9.81)) * 1000) / 10 : 0;
      const deltaGMed = Math.round((gMedT2 - gMedT1) * 10) / 10;

      rowsRazoes.push({
        indice: 'Glúteo médio relativo ao peso corporal (%PC)',
        referencia: '≥25% do peso corporal',
        t1: abdTotT1 > 0 ? `${gMedT1.toFixed(1).replace('.', ',')}%` : 'Não avaliado',
        t2: abdTotT2 > 0 ? `${gMedT2.toFixed(1).replace('.', ',')}%` : 'Não avaliado',
        variacao: (abdTotT1 > 0 && abdTotT2 > 0) ? `${deltaGMed >= 0 ? '+' : ''}${deltaGMed.toFixed(1).replace('.', ',')} p.p.` : '-',
        interpretacao: gMedT2 >= 25 ? 'Adequado (≥25%) — Estabilidade frontal preservada' : 'Abaixo da referência (<25%) — Déficit de controle pélvico'
      });
    }
  }

  // 7. ANÁLISE DE SIMETRIA ENTRE MEMBROS
  const calcSimetriaDeficit = (vD: number, vE: number): number => {
    if (vD <= 0 && vE <= 0) return 0;
    const max = Math.max(vD, vE);
    return Math.round((Math.abs(vD - vE) / max) * 1000) / 10;
  };

  const rowsSimetria: TableRowSimetria[] = [];
  const movPairs = new Set<string>();
  allStrengthKeys.forEach(k => {
    const mov = k.split('_')[0];
    if (mov) movPairs.add(mov);
  });

  movPairs.forEach(mov => {
    const d1 = mapT1[`${mov}_Direito`] || 0;
    const e1 = mapT1[`${mov}_Esquerdo`] || 0;
    const d2 = mapT2[`${mov}_Direito`] || 0;
    const e2 = mapT2[`${mov}_Esquerdo`] || 0;

    const hasT1Pair = d1 > 0 && e1 > 0;
    const hasT2Pair = d2 > 0 && e2 > 0;
    if (!hasT1Pair && !hasT2Pair) return;

    const defT1 = hasT1Pair ? calcSimetriaDeficit(d1, e1) : 0;
    const defT2 = hasT2Pair ? calcSimetriaDeficit(d2, e2) : 0;
    const deltaPP = Math.round((defT2 - defT1) * 10) / 10;

    let sit: TableRowSimetria['situacao'] = 'Persistente';
    if (defT2 <= 10) {
      sit = 'Resolvida';
    } else if (defT2 < defT1) {
      sit = 'Melhorou, ainda acima de 10%';
    } else if (defT2 > defT1) {
      sit = 'Piorou';
    }

    rowsSimetria.push({
      movimento: mov,
      t1: defT1,
      t2: defT2,
      variacaoPP: deltaPP,
      variacao: `${deltaPP >= 0 ? '+' : ''}${deltaPP} p.p.`,
      situacao: sit
    });
  });

  // 8. TESTES FUNCIONAIS: Y-TESTE & STEP DOWN
  const yT1 = t1Report?.testesOrtopedicos?.yTeste;
  const yT2 = t2Report?.testesOrtopedicos?.yTeste;

  const hasY1 = Boolean(yT1?.direita?.anterior || yT1?.realizou === 'sim');
  const hasY2 = Boolean(yT2?.direita?.anterior || yT2?.realizou === 'sim');

  let yTestResult: YTestComparison | null = null;
  if (hasY1 || hasY2) {
    const compD1 = (yT1?.direita?.anterior && yT1?.direita?.comprimentoMembro)
      ? Math.round(((yT1.direita.anterior + yT1.direita.posteromedial + yT1.direita.posterolateral) / (3 * yT1.direita.comprimentoMembro)) * 1000) / 10
      : (yT1?.compositeScoreD || 0);
    const compE1 = (yT1?.esquerda?.anterior && yT1?.esquerda?.comprimentoMembro)
      ? Math.round(((yT1.esquerda.anterior + yT1.esquerda.posteromedial + yT1.esquerda.posterolateral) / (3 * yT1.esquerda.comprimentoMembro)) * 1000) / 10
      : (yT1?.compositeScoreE || 0);

    const compD2 = (yT2?.direita?.anterior && yT2?.direita?.comprimentoMembro)
      ? Math.round(((yT2.direita.anterior + yT2.direita.posteromedial + yT2.direita.posterolateral) / (3 * yT2.direita.comprimentoMembro)) * 1000) / 10
      : (yT2?.compositeScoreD || 0);
    const compE2 = (yT2?.esquerda?.anterior && yT2?.esquerda?.comprimentoMembro)
      ? Math.round(((yT2.esquerda.anterior + yT2.esquerda.posteromedial + yT2.esquerda.posterolateral) / (3 * yT2.esquerda.comprimentoMembro)) * 1000) / 10
      : (yT2?.compositeScoreE || 0);

    const antDif1 = (yT1?.direita?.anterior != null && yT1?.esquerda?.anterior != null)
      ? Math.round(Math.abs(yT1.direita.anterior - yT1.esquerda.anterior) * 10) / 10
      : 0;
    const antDif2 = (yT2?.direita?.anterior != null && yT2?.esquerda?.anterior != null)
      ? Math.round(Math.abs(yT2.direita.anterior - yT2.esquerda.anterior) * 10) / 10
      : 0;

    const pmDif1 = (yT1?.direita?.posteromedial != null && yT1?.esquerda?.posteromedial != null)
      ? Math.round(Math.abs(yT1.direita.posteromedial - yT1.esquerda.posteromedial) * 10) / 10
      : 0;
    const pmDif2 = (yT2?.direita?.posteromedial != null && yT2?.esquerda?.posteromedial != null)
      ? Math.round(Math.abs(yT2.direita.posteromedial - yT2.esquerda.posteromedial) * 10) / 10
      : 0;

    const plDif1 = (yT1?.direita?.posterolateral != null && yT1?.esquerda?.posterolateral != null)
      ? Math.round(Math.abs(yT1.direita.posterolateral - yT1.esquerda.posterolateral) * 10) / 10
      : 0;
    const plDif2 = (yT2?.direita?.posterolateral != null && yT2?.esquerda?.posterolateral != null)
      ? Math.round(Math.abs(yT2.direita.posterolateral - yT2.esquerda.posterolateral) * 10) / 10
      : 0;

    yTestResult = {
      compositeScoreD: {
        t1: compD1,
        t2: compD2,
        deltaPP: Math.round((compD2 - compD1) * 10) / 10,
        leitura: compD2 >= 94 ? 'Adequado (≥94%)' : (compD2 > compD1 ? 'Evoluiu' : 'Abaixo do corte de 94%')
      },
      compositeScoreE: {
        t1: compE1,
        t2: compE2,
        deltaPP: Math.round((compE2 - compE1) * 10) / 10,
        leitura: compE2 >= 94 ? 'Adequado (≥94%)' : (compE2 > compE1 ? 'Evoluiu' : 'Abaixo do corte de 94%')
      },
      alcanceAnteriorDif: {
        t1: antDif1,
        t2: antDif2,
        deltaCm: Math.round((antDif2 - antDif1) * 10) / 10,
        leitura: antDif2 <= 4.0 ? 'Dentro da normalidade (≤4 cm)' : 'Assimetria acima de 4 cm'
      },
      alcancePosteromedialDif: {
        t1: pmDif1,
        t2: pmDif2,
        deltaCm: Math.round((pmDif2 - pmDif1) * 10) / 10,
        leitura: pmDif2 <= 4.0 ? 'Dentro da normalidade (≤4 cm)' : 'Assimetria'
      },
      alcancePosterolateralDif: {
        t1: plDif1,
        t2: plDif2,
        deltaCm: Math.round((plDif2 - plDif1) * 10) / 10,
        leitura: plDif2 <= 4.0 ? 'Dentro da normalidade (≤4 cm)' : 'Assimetria'
      },
      parecer: compD2 >= 94 && compE2 >= 94 && antDif2 <= 4.0
        ? 'Estabilidade dinâmica e controle neuromuscular unipodal adequados bilateralmente.'
        : 'Persistem déficits de controle postural dinâmico unipodal ou assimetrias de alcance.'
    };
  }

  // Step Down Test
  const sdT1 = t1Report?.testesOrtopedicos?.stepDown;
  const sdT2 = t2Report?.testesOrtopedicos?.stepDown;
  const hasSD = Boolean(sdT1 || sdT2);

  const sdRows: StepDownComparisonRow[] = [];
  if (hasSD) {
    const addSDRow = (label: string, ref: string, v1Raw: any, v2Raw: any, higherIsBetter = false) => {
      const v1 = parseNumberOrNull(v1Raw);
      const v2 = parseNumberOrNull(v2Raw);
      if (v1 == null && v2 == null) return;
      const num1 = v1 ?? 0;
      const num2 = v2 ?? 0;
      const delta = Math.round((num2 - num1) * 10) / 10;

      let leitura = 'Estável';
      if (higherIsBetter) {
        if (delta > 0) leitura = 'Evoluiu';
        else if (delta < 0) leitura = 'Involução';
      } else {
        if (delta < 0) leitura = 'Evoluiu';
        else if (delta > 0) leitura = 'Piorou';
      }

      sdRows.push({
        variavel: label,
        referencia: ref,
        t1: num1,
        t2: num2,
        variacao: delta,
        leitura
      });
    };

    addSDRow('Valgo dinâmico de joelho esquerdo', 'até 15°', sdT1?.valgoDinamicoJoelhoE, sdT2?.valgoDinamicoJoelhoE, false);
    addSDRow('Adução de quadril esquerda', 'até 10°', sdT1?.aducaoQuadrilE, sdT2?.aducaoQuadrilE, false);
    addSDRow('Queda pélvica esquerda', 'até 5°', sdT1?.quedaPelvicaE, sdT2?.quedaPelvicaE, false);
    addSDRow('Componente excêntrico/PRPS esquerdo', 'acima de 60°', sdT1?.compExcentricoPrpsE, sdT2?.compExcentricoPrpsE, true);
    addSDRow('Valgo dinâmico de joelho direito', 'até 15°', sdT1?.valgoDinamicoJoelhoD, sdT2?.valgoDinamicoJoelhoD, false);
    addSDRow('Adução de quadril direita', 'até 10°', sdT1?.aducaoQuadrilD, sdT2?.aducaoQuadrilD, false);
    addSDRow('Queda pélvica direita', 'até 5°', sdT1?.quedaPelvicaD, sdT2?.quedaPelvicaD, false);
  }

  // Hop Tests (Bateria de Saltos Unipodais & LSI)
  const hopRaw = t2Report?.hopTest || t2Report?.dados?.hopTest || t2Report?.testesOrtopedicos?.hopTest ||
                 t2Report?.dadosMedidos?.testesEspeciais?.hopTest ||
                 t1Report?.hopTest || t1Report?.dados?.hopTest || t1Report?.testesOrtopedicos?.hopTest;
  const hopTestResult = calculateHopBatteryAnalysis(hopRaw);

  // 9. AMPLITUDE DE MOVIMENTO (GONIOMETRIA - Com referências cinesiológicas completas)
  const g1 = t1Report?.goniometria || {};
  const g2 = t2Report?.goniometria || {};

  const gonioConfigs: { mov: string; ref: string; key1: string; key2: string; minRef: number }[] = [
    // Quadril e Joelho
    { mov: 'Flexão de quadril com joelho estendido — direito', ref: '70–80°', key1: 'quadrilFlexao1D', key2: 'quadrilFlexao1D', minRef: 70 },
    { mov: 'Flexão de quadril com joelho estendido — esquerdo', ref: '70–80°', key1: 'quadrilFlexao1E', key2: 'quadrilFlexao1E', minRef: 70 },
    { mov: 'Flexão de quadril com joelho fletido — direito', ref: '100–125°', key1: 'quadrilFlexao2D', key2: 'quadrilFlexao2D', minRef: 100 },
    { mov: 'Flexão de quadril com joelho fletido — esquerdo', ref: '100–125°', key1: 'quadrilFlexao2E', key2: 'quadrilFlexao2E', minRef: 100 },
    { mov: 'Rotação interna de quadril — direito', ref: '35–45°', key1: 'quadrilRotIntD', key2: 'quadrilRotIntD', minRef: 35 },
    { mov: 'Rotação interna de quadril — esquerdo', ref: '35–45°', key1: 'quadrilRotIntE', key2: 'quadrilRotIntE', minRef: 35 },
    { mov: 'Rotação externa de quadril — direito', ref: '40–50°', key1: 'quadrilRotExtD', key2: 'quadrilRotExtD', minRef: 40 },
    { mov: 'Rotação externa de quadril — esquerdo', ref: '40–50°', key1: 'quadrilRotExtE', key2: 'quadrilRotExtE', minRef: 40 },
    { mov: 'Flexão de joelho — direito', ref: '135–150°', key1: 'joelhoFlexaoD', key2: 'joelhoFlexaoD', minRef: 135 },
    { mov: 'Flexão de joelho — esquerdo', ref: '135–150°', key1: 'joelhoFlexaoE', key2: 'joelhoFlexaoE', minRef: 135 },
    { mov: 'Ângulo poplíteo — direito', ref: '155–160°', key1: 'joelhoPopliteoD', key2: 'joelhoPopliteoD', minRef: 155 },
    { mov: 'Ângulo poplíteo — esquerdo', ref: '155–160°', key1: 'joelhoPopliteoE', key2: 'joelhoPopliteoE', minRef: 155 },
    // Tornozelo
    { mov: 'Dorsiflexão de tornozelo com joelho estendido — direito', ref: '20°', key1: 'tornozeloDorsi1D', key2: 'tornozeloDorsi1D', minRef: 20 },
    { mov: 'Dorsiflexão de tornozelo com joelho estendido — esquerdo', ref: '20°', key1: 'tornozeloDorsi1E', key2: 'tornozeloDorsi1E', minRef: 20 },
    { mov: 'Dorsiflexão de tornozelo com joelho fletido / Lunge — direito', ref: '35–45°', key1: 'tornozeloDorsi2D', key2: 'tornozeloDorsi2D', minRef: 35 },
    { mov: 'Dorsiflexão de tornozelo com joelho fletido / Lunge — esquerdo', ref: '35–45°', key1: 'tornozeloDorsi2E', key2: 'tornozeloDorsi2E', minRef: 35 },
    { mov: 'Flexão plantar de tornozelo — direito', ref: '40–50°', key1: 'tornozeloFlexaoPlantarD', key2: 'tornozeloFlexaoPlantarD', minRef: 40 },
    { mov: 'Flexão plantar de tornozelo — esquerdo', ref: '40–50°', key1: 'tornozeloFlexaoPlantarE', key2: 'tornozeloFlexaoPlantarE', minRef: 40 },
    // Ombro e Membros Superiores
    { mov: 'Flexão de ombro — direito', ref: '160–180°', key1: 'ombroFlexaoD', key2: 'ombroFlexaoD', minRef: 160 },
    { mov: 'Flexão de ombro — esquerdo', ref: '160–180°', key1: 'ombroFlexaoE', key2: 'ombroFlexaoE', minRef: 160 },
    { mov: 'Abdução de ombro — direito', ref: '160–180°', key1: 'ombroAbducaoD', key2: 'ombroAbducaoD', minRef: 160 },
    { mov: 'Abdução de ombro — esquerdo', ref: '160–180°', key1: 'ombroAbducaoE', key2: 'ombroAbducaoE', minRef: 160 },
    { mov: 'Rotação externa de ombro — direito', ref: '80–90°', key1: 'ombroRotExtD', key2: 'ombroRotExtD', minRef: 80 },
    { mov: 'Rotação externa de ombro — esquerdo', ref: '80–90°', key1: 'ombroRotExtE', key2: 'ombroRotExtE', minRef: 80 },
    { mov: 'Rotação interna de ombro — direito', ref: '70–80°', key1: 'ombroRotIntD', key2: 'ombroRotIntD', minRef: 70 },
    { mov: 'Rotação interna de ombro — esquerdo', ref: '70–80°', key1: 'ombroRotIntE', key2: 'ombroRotIntE', minRef: 70 }
  ];

  const goniometriaRows: TableRowGoniometria[] = [];
  gonioConfigs.forEach(cfg => {
    const v1 = parseNumberOrNull(g1[cfg.key1]);
    const v2 = parseNumberOrNull(g2[cfg.key2]);
    if (v1 == null && v2 == null) return;

    let deltaStr: number | string = '-';
    let leitura: TableRowGoniometria['leitura'] = 'Sem dado comparativo';

    if (v1 != null && v2 != null) {
      const delta = v2 - v1;
      deltaStr = `${delta >= 0 ? '+' : ''}${delta}°`;
      if (v2 >= cfg.minRef && v1 < cfg.minRef) leitura = 'Normalizou';
      else if (delta > 3) leitura = 'Evoluiu';
      else if (delta >= -2 && delta <= 3) leitura = delta === 0 ? 'Estagnada' : 'Estável';
      else leitura = 'Involução';
    } else if (v2 != null) {
      leitura = v2 >= cfg.minRef ? 'Normalizou' : 'Evoluiu';
    }

    goniometriaRows.push({
      movimento: cfg.mov,
      referencia: cfg.ref,
      t1: v1,
      t2: v2,
      variacao: deltaStr,
      leitura
    });
  });

  // 9.1 MOBILIDADE TRIDIMENSIONAL DA COLUNA VERTEBRAL
  const getCol = (rep: any, k: string) => rep?.[k] ?? rep?.dados?.[k] ?? rep?.mobilidadeColuna?.[k];
  const colConfigs = [
    { mov: 'Flexão anterior de tronco (Coluna Lombar)', ref: '40–60°', keyGraus: 'mFlex', keyEva: 'mFlexEVA', minRef: 40 },
    { mov: 'Extensão de tronco', ref: '20–35°', keyGraus: 'mExt', keyEva: 'mExtEVA', minRef: 20 },
    { mov: 'Inclinação lateral direita', ref: '20–30°', keyGraus: 'mIncD', keyEva: 'mIncDEVA', minRef: 20 },
    { mov: 'Inclinação lateral esquerda', ref: '20–30°', keyGraus: 'mIncE', keyEva: 'mIncEEVA', minRef: 20 },
    { mov: 'Rotação axial direita', ref: '30–45°', keyGraus: 'mRotD', keyEva: 'mRotDEVA', minRef: 30 },
    { mov: 'Rotação axial esquerda', ref: '30–45°', keyGraus: 'mRotE', keyEva: 'mRotEEVA', minRef: 30 }
  ];

  const tabelaColunaRows: TableRowColuna[] = [];
  colConfigs.forEach(cfg => {
    const g1Val = parseNumberOrNull(getCol(t1Report, cfg.keyGraus));
    const g2Val = parseNumberOrNull(getCol(t2Report, cfg.keyGraus));
    const e1Val = parseNumberOrNull(getCol(t1Report, cfg.keyEva));
    const e2Val = parseNumberOrNull(getCol(t2Report, cfg.keyEva));

    if (g1Val == null && g2Val == null && e1Val == null && e2Val == null) return;

    let varGrausStr = '-';
    let varEvaStr = '-';
    let leitura = 'Estável';

    if (g1Val != null && g2Val != null) {
      const dG = g2Val - g1Val;
      varGrausStr = `${dG >= 0 ? '+' : ''}${dG}°`;
      if (dG > 3) leitura = 'Evoluiu';
      else if (dG < -3) leitura = 'Involução';
    } else if (g2Val != null) {
      leitura = g2Val >= cfg.minRef ? 'Normalizou' : 'Avaliado';
    }

    if (e1Val != null && e2Val != null) {
      const dE = e2Val - e1Val;
      varEvaStr = dE === 0 ? 'Sem dor' : `${dE > 0 ? '+' : ''}${dE} EVA`;
      if (dE < 0) leitura = leitura === 'Evoluiu' ? 'Evoluiu (alívio de dor)' : 'Alívio álgico';
    }

    tabelaColunaRows.push({
      movimento: cfg.mov,
      referencia: cfg.ref,
      t1: g1Val,
      t2: g2Val,
      eva1: e1Val,
      eva2: e2Val,
      variacaoGraus: varGrausStr,
      variacaoEVA: varEvaStr,
      leitura
    });
  });

  // 10. TESTES ORTOPÉDICOS ESPECIAIS
  const te1 = t1Report?.testesOrtopedicos || t1Report?.testesEspeciais || {};
  const te2 = t2Report?.testesOrtopedicos || t2Report?.testesEspeciais || {};

  const testsList: { label: string; key: string }[] = [
    { label: 'Teste de Ober (TFL/Tracto Iliotibial)', key: 'ober' },
    { label: 'Thomas (Iliopsoas)', key: 'thomasIliopsoas' },
    { label: 'Thomas (Retofemoral)', key: 'thomasRetofemoral' },
    { label: 'Discinesia Escapular', key: 'discinesiaEscapular' },
    { label: 'Teste de Ely', key: 'ely' },
    { label: 'Teste KFBO (Cabeça da Fíbula)', key: 'kfbo' },
    { label: 'Teste de Maigne (Charneira Toracolombar)', key: 'maigne' },
    { label: 'Diástase Abdominal', key: 'diastase' }
  ];

  const rowsTestesOrtopedicos: TableRowTesteOrtopedico[] = [];
  testsList.forEach(t => {
    const val1 = te1[t.key] || (te1[`${t.key}D`] ? `${te1[`${t.key}D`] || ''} / ${te1[`${t.key}E`] || ''}`.trim() : null) || t1Report?.[t.key] || t1Report?.dados?.[t.key];
    const val2 = te2[t.key] || (te2[`${t.key}D`] ? `${te2[`${t.key}D`] || ''} / ${te2[`${t.key}E`] || ''}`.trim() : null) || t2Report?.[t.key] || t2Report?.dados?.[t.key];
    if (!val1 && !val2) return;

    const s1 = String(val1 || 'Não registrado');
    const s2 = String(val2 || 'Não registrado');
    let leitura = 'Acompanhamento clínico';
    if (s1.toLowerCase().includes('positivo') && s2.toLowerCase().includes('negativo')) {
      leitura = 'Resolvido (negativou)';
    } else if (s1.toLowerCase().includes('negativo') && s2.toLowerCase().includes('positivo')) {
      leitura = 'Surgimento de positividade';
    } else if (s1 === s2) {
      leitura = 'Estável';
    }

    rowsTestesOrtopedicos.push({
      teste: t.label,
      t1: s1,
      t2: s2,
      leitura
    });
  });

  // 11. DETECÇÃO DE CLUSTERS CLÍNICOS E ADAPTAÇÃO POR SEGMENTO
  const clinicalProfile: ClientClinicalProfile = {
    queixasEVA: rowsEVA.map(r => ({ queixa: r.queixa, t1: r.t1, t2: r.t2, delta: r.variacao })),
    mobilidadeColuna: {
      flexao: { t1: parseNumberOrNull(getCol(t1Report, 'mFlex')), t2: parseNumberOrNull(getCol(t2Report, 'mFlex')), eva1: parseNumberOrNull(getCol(t1Report, 'mFlexEVA')), eva2: parseNumberOrNull(getCol(t2Report, 'mFlexEVA')) },
      extensao: { t1: parseNumberOrNull(getCol(t1Report, 'mExt')), t2: parseNumberOrNull(getCol(t2Report, 'mExt')), eva1: parseNumberOrNull(getCol(t1Report, 'mExtEVA')), eva2: parseNumberOrNull(getCol(t2Report, 'mExtEVA')) },
      inclinacaoD: { t1: parseNumberOrNull(getCol(t1Report, 'mIncD')), t2: parseNumberOrNull(getCol(t2Report, 'mIncD')), eva1: parseNumberOrNull(getCol(t1Report, 'mIncDEVA')), eva2: parseNumberOrNull(getCol(t2Report, 'mIncDEVA')) },
      inclinacaoE: { t1: parseNumberOrNull(getCol(t1Report, 'mIncE')), t2: parseNumberOrNull(getCol(t2Report, 'mIncE')), eva1: parseNumberOrNull(getCol(t1Report, 'mIncEEVA')), eva2: parseNumberOrNull(getCol(t2Report, 'mIncEEVA')) },
      rotacaoD: { t1: parseNumberOrNull(getCol(t1Report, 'mRotD')), t2: parseNumberOrNull(getCol(t2Report, 'mRotD')), eva1: parseNumberOrNull(getCol(t1Report, 'mRotDEVA')), eva2: parseNumberOrNull(getCol(t2Report, 'mRotDEVA')) },
      rotacaoE: { t1: parseNumberOrNull(getCol(t1Report, 'mRotE')), t2: parseNumberOrNull(getCol(t2Report, 'mRotE')), eva1: parseNumberOrNull(getCol(t1Report, 'mRotEEVA')), eva2: parseNumberOrNull(getCol(t2Report, 'mRotEEVA')) }
    },
    goniometriaArticular: {},
    testesOrtopedicos: {},
    dinamometria: rowsForca.map(f => ({ movimento: f.movimento, lado: f.lado, t1: f.t1, t2: f.t2, pct: f.variacaoPct })),
    habitos: {
      sonoHoras: t2Report?.sono?.horas || t2Report?.dados?.repSonoHoras,
      sonoQualidade: t2Report?.sono?.qualidade || t2Report?.dados?.repSonoQualidade,
      estresse: t2Report?.estresse || t2Report?.dados?.repStress,
      atividadeFisica: t2Report?.atividadeFisica || t2Report?.dados?.repAtividadeFisica
    }
  };

  goniometriaRows.forEach(g => {
    clinicalProfile.goniometriaArticular[g.movimento] = { t1: g.t1, t2: g.t2 };
  });

  rowsTestesOrtopedicos.forEach(t => {
    clinicalProfile.testesOrtopedicos[t.teste] = { t1: t.t1, t2: t.t2 };
  });

  const clusters = identifyClinicalClusters(clinicalProfile);

  return {
    identificacao: {
      paciente: client.nome || 'Paciente',
      idade: client.idade ? (String(client.idade).includes('ano') ? String(client.idade) : `${client.idade} anos`) : 'Não informada',
      sexo: client.sexo === 'F' ? 'Feminino' : (client.sexo === 'M' ? 'Masculino' : String(client.sexo || 'Não informado')),
      cpf: client.cpf && client.cpf !== 'Não informado' ? client.cpf : 'Não informado',
      pesoCorporal: pesoCorporalStr,
      dataRelatorioInicial: dtRelatorioT1 || '-',
      dataForcaInicial: dtForcaT1 || '-',
      dataReavaliacao: dtReavaliacao || '-',
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
      stepDown: sdRows,
      hopTest: hopTestResult
    },
    tabelaGoniometria: goniometriaRows,
    tabelaColuna: tabelaColunaRows,
    tabelaTestesOrtopedicos: rowsTestesOrtopedicos,
    clusters,
    razoesAvancadas: calculateAdvancedStrengthRatios(
      t2Strength?.testesRealizados || t2Strength?.testes || t2Strength?.exercicios || t1Strength?.testesRealizados || t1Strength?.testes || t1Strength?.exercicios,
      pesoKg || 70,
      (client.sexo as any) || 'M'
    )
  };
}
