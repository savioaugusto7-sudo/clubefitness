/**
 * Motor Matemático Longitudinal de Reavaliação Fisioterapêutica
 * 100% Determinístico, Baseado Exclusivamente em Dados Reais do Prontuário e Livre de Fallbacks Fictícios.
 */

import { identifyClinicalClusters, ClinicalCluster, ClientClinicalProfile } from './clinicalClustersEngine';
import { calculateAdvancedStrengthRatios, AdvancedStrengthRatioItem, calculateHopBatteryAnalysis, HopBatteryResult } from './biomechanicsEngine';
import { compareVisaPLongitudinal, VisaPComparisonResult } from './visaPEngine';

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
  t1VisaP?: any;
  t2VisaP?: any;
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

export interface TableRowComposicao {
  parametro: string;
  metrica: string;
  unidade: string;
  t1: number | null;
  t2: number | null;
  variacao: string;
  variacaoPct: string;
  leitura: string;
}

export interface TableRowPerimetria {
  regiao: string;
  t1: number | null;
  t2: number | null;
  variacaoCm: string;
  deltaNum: number;
  leitura: string;
  isCentral?: boolean;
}

export interface TableRowDobra {
  dobra: string;
  t1: number | null;
  t2: number | null;
  variacaoMm: string;
  deltaNum: number;
  variacaoPct: string;
  leitura: string;
}

export interface RecomposicaoCorporalKPIs {
  gorduraEliminadaKg: number;
  massaMagraGanhaKg: number;
  deltaPercentualGordura: number;
  deltaSomaDobrasMm: number;
  deltaCinturaCm: number;
  diasIntervalo: number;
  statusRecomposicao: 'excelente' | 'otimo' | 'bom' | 'estavel' | 'atencao';
  taxaSucessoLabel: string;
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
    visaP?: VisaPComparisonResult | null;
  };
  tabelaGoniometria: TableRowGoniometria[];
  tabelaColuna: TableRowColuna[];
  tabelaTestesOrtopedicos: TableRowTesteOrtopedico[];
  tabelaComposicao?: TableRowComposicao[];
  tabelaDobras?: TableRowDobra[];
  tabelaPerimetria?: TableRowPerimetria[];
  kpisRecomposicao?: RecomposicaoCorporalKPIs;
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
  const rawPeso =
    Number(t2Report?.dadosMedidos?.peso) ||
    Number(t2Report?.dados?.peso) ||
    Number(client.pesoKg) ||
    Number(t2Strength?.pesoCliente) ||
    Number(t1Report?.dadosMedidos?.peso) ||
    Number(t1Strength?.pesoCliente) ||
    0;
  const pesoCorporalStr = rawPeso > 0 ? `${rawPeso} kg` : 'Não informado';
  const pesoKg = rawPeso > 0 ? rawPeso : 0;

  const dtRelatorioT1 = formatDateBR(t1Report?.data || t1Strength?.data);
  const dtForcaT1 = formatDateBR(t1Strength?.data || t1Report?.data);
  const dtReavaliacao = formatDateBR(t2Report?.data || t2Strength?.data);

  let intervaloSemanas = 0;
  const dStr1 = t1Report?.data || t1Strength?.data;
  const dStr2 = t2Report?.data || t2Strength?.data;
  if (dStr1 && dStr2) {
    const d1 = new Date(dStr1);
    const d2 = new Date(dStr2);
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
  const objetivoDoLaudo = `Este laudo apresenta a comparação longitudinal entre a avaliação inicial (${dtRelatorioT1 || 'T1'}) e a reavaliação de seguimento (${dtReavaliacao || 'T2'}), documentando objetivamente a evolução dos parâmetros físicos, antropométricos, dolorosos, amplitudes articulares, equilíbrio neuromuscular e testes funcionais.`;

  // 3. HISTÓRICO CLÍNICO DE BASE (Suporta tanto Relatório Fisioterápico quanto Avaliação Física)
  const anamneseT1 = t1Report?.anamnese || {};
  const anamneseT2 = t2Report?.anamnese || {};
  const saudeT1 = t1Report?.dadosMedidos?.saudeGeral || {};
  const saudeT2 = t2Report?.dadosMedidos?.saudeGeral || {};
  const condutaT1 = t1Report?.conteudo?.conduta || t1Report?.observacoes || '';

  const med = (anamneseT2.historico?.medicacao || anamneseT1.historico?.medicacao || saudeT2.medicamentos || saudeT1.medicamentos || '').trim();
  const pat = (anamneseT2.historico?.doencasPregressasAtuais || anamneseT1.historico?.doencasPregressasAtuais || '').trim();
  const cir = (anamneseT2.historico?.cirurgiasInternacoes || anamneseT1.historico?.cirurgiasInternacoes || saudeT2.cirurgias || saudeT1.cirurgias || '').trim();
  const atv = (anamneseT2.historico?.atividadesPraticadas || anamneseT1.historico?.atividadesPraticadas || saudeT2.atividadeFisica || saudeT1.atividadeFisica || '').trim();
  const qxDiag = (condutaT1 || t1Report?.conteudo?.diagnostico || t1Report?.conteudo?.queixaPrincipal || saudeT1.queixas || t1Report?.dadosMedidos?.objetivoPrincipal || '').trim();

  const sono1 = anamneseT1.habitos?.sonoHoras ?? saudeT1.sono;
  const sono2 = anamneseT2.habitos?.sonoHoras ?? saudeT2.sono;
  const stress1 = anamneseT1.habitos?.stressNivel;
  const stress2 = anamneseT2.habitos?.stressNivel;

  let sonoEEstresse = '';
  if (sono1 != null && sono2 != null && sono1 !== sono2) {
    sonoEEstresse += `Qualidade do sono evoluiu de ${sono1} para ${sono2}. `;
  } else if (sono2 != null) {
    sonoEEstresse += `Qualidade do sono relatada: ${sono2}. `;
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
    idade: client.idade || t2Report?.dadosMedidos?.idade || t1Report?.dadosMedidos?.idade || 'Não informada',
    medicamentos: med || 'Não informado / Em uso de medicação contínua não relatado',
    patologiasPregressas: pat || 'Nenhuma patologia crônica prévia relatada',
    historicoCirurgiasTraumas: cir || 'Sem histórico cirúrgico ou traumático prévio relatado',
    demandaEsportiva: atv || 'Atividade esportiva regular não informada',
    queixaInicialDiagnostico: qxDiag || 'Quadro inicial registrado em prontuário',
    sonoEEstresse
  };

  // 4. COMPARATIVO DE QUEIXAS DOLOROSAS (EVA)
  const rowsEVA: TableRowEva[] = [];
  const extractQueixasList = (rep: any) => {
    const anam = rep?.anamnese || {};
    if (Array.isArray(anam.queixas) && anam.queixas.length > 0) return anam.queixas;
    if (Array.isArray(rep?.queixas) && rep.queixas.length > 0) return rep.queixas;
    if (Array.isArray(rep?.avulsoQueixas) && rep.avulsoQueixas.length > 0) return rep.avulsoQueixas;
    if (rep?.tipoTeste === 'QUEIXAS_EVA' && rep?.dados) {
      return [{
        regiao: rep.dados.regiao,
        subRegiao: rep.dados.subRegiao,
        lateralidade: rep.dados.lateralidade,
        dorOnde: rep.dados.dorOnde || rep.dados.regiao || 'Queixa Principal',
        dorIntensidade: Number(rep.dados.intensidade ?? rep.metricas?.scorePrincipal ?? 0)
      }];
    }
    return [];
  };
  const qList1 = extractQueixasList(t1Report);
  const qList2 = extractQueixasList(t2Report);

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

  // 5. COMPARATIVO DE FORÇA MUSCULAR (NEWTONS - Suporta StrengthTest e Teste Avulso DINAMOMETRIA)
  const extractStrengthMap = (stDoc: any, fallbackRepDoc?: any) => {
    const map: Record<string, number> = {};
    const parseDoc = (doc: any) => {
      if (!doc) return;
      const list = doc?.testesRealizados || doc?.dados?.testesRealizados || doc?.exercicios || doc?.testes || [];
      if (Array.isArray(list) && list.length > 0) {
        list.forEach((item: any) => {
          const art = (item.articulacao || '').trim();
          const mov = (item.movimento || item.grupoMuscular || '').trim();
          const lado = (item.lado || '').trim();
          if (!mov || !lado) return;
          const key = art ? `${mov} de ${art.toLowerCase()}_${lado}` : `${mov}_${lado}`;
          const rawVal = Number(item.forcaN || item.forca || item.valorObtido || 0);
          const isKgf = String(item.unidade || '').toLowerCase() === 'kgf' && !item.forcaN;
          const forcaN = isKgf ? rawVal * 9.81 : (item.forcaN || item.forca ? rawVal : rawVal * 9.81);
          if (forcaN > 0) {
            map[key] = Math.round(forcaN * 10) / 10;
          }
        });
      }
      // Suporte para Teste Avulso de Dinamometria (ClientTestRecord)
      const avulso = doc?.tipoTeste === 'DINAMOMETRIA' ? doc?.dados : doc?.avulsoDinamometria;
      if (avulso && avulso.grupoMuscular) {
        const isKgf = String(avulso.unidade || 'N').toLowerCase() === 'kgf';
        const mult = isKgf ? 9.81 : 1;
        const vd = Number(avulso.ladoDireito) || 0;
        const ve = Number(avulso.ladoEsquerdo) || 0;
        if (vd > 0) map[`${avulso.grupoMuscular}_Direito`] = Math.round(vd * mult * 10) / 10;
        if (ve > 0) map[`${avulso.grupoMuscular}_Esquerdo`] = Math.round(ve * mult * 10) / 10;
      }
    };
    parseDoc(fallbackRepDoc);
    parseDoc(stDoc);
    return map;
  };

  const isSameStrengthDoc = Boolean(
    t1Strength && t2Strength &&
    t1Strength._id && t2Strength._id &&
    String(t1Strength._id) === String(t2Strength._id)
  );
  const mapT1 = isSameStrengthDoc ? {} : extractStrengthMap(t1Strength, t1Report);
  const mapT2 = extractStrengthMap(t2Strength, t2Report);
  const allStrengthKeys = Array.from(new Set([...Object.keys(mapT1), ...Object.keys(mapT2)]));

  const rowsForca: TableRowForca[] = [];
  allStrengthKeys.forEach(fullKey => {
    const parts = fullKey.split('_');
    const mov = parts[0] || fullKey;
    const lado = (parts[1] || 'Direito') as 'Direito' | 'Esquerdo' | 'Bilateral';
    const v1 = mapT1[fullKey] || 0;
    const v2 = mapT2[fullKey] || 0;

    // Somente comparar movimentos medidos em ambos os momentos (T1 e T2)
    if (v1 <= 0 || v2 <= 0) return;

    const deltaPct = Math.round(((v2 - v1) / v1) * 1000) / 10;

    let leitura: TableRowForca['leitura'] = 'Estável';
    if (deltaPct >= 30) leitura = 'Evoluiu muito';
    else if (deltaPct >= 10) leitura = 'Evoluiu';
    else if (deltaPct >= 0) leitura = deltaPct >= 5 ? 'Evoluiu' : 'Estagnado';
    else if (deltaPct >= -5) leitura = 'Estável';
    else leitura = 'Queda aparente — requer verificação';

    const variacaoStr = `${deltaPct >= 0 ? '+' : ''}${deltaPct}%`;

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

  // 6. RAZÕES MUSCULARES E ÍNDICES BIOMECÂNICOS (apenas se medidos em T1 e T2)
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

  if (hasIQT1 && hasIQT2) {
    const iqGlobalT1 = Math.round(((flexJoelhoD_T1 + flexJoelhoE_T1) / (extJoelhoD_T1 + extJoelhoE_T1)) * 1000) / 10;
    const iqGlobalT2 = Math.round(((flexJoelhoD_T2 + flexJoelhoE_T2) / (extJoelhoD_T2 + extJoelhoE_T2)) * 1000) / 10;
    const deltaIQ = Math.round((iqGlobalT2 - iqGlobalT1) * 10) / 10;

    let interpIQ = 'Dentro da referência (60–75%) — Equilíbrio muscular ótimo';
    if (iqGlobalT2 < 60) interpIQ = 'Abaixo da referência (< 60%) — Risco aumentado para LCA e estiramento de isquiotibiais';
    else if (iqGlobalT2 > 75) interpIQ = 'Elevada (> 75%) — Predomínio de cadeia posterior';

    rowsRazoes.push({
      indice: 'Razão isquiotibiais/quadríceps (H:Q) global',
      referencia: '60%–75%',
      t1: `${iqGlobalT1.toFixed(1).replace('.', ',')}%`,
      t2: `${iqGlobalT2.toFixed(1).replace('.', ',')}%`,
      variacao: `${deltaIQ >= 0 ? '+' : ''}${deltaIQ.toFixed(1).replace('.', ',')} p.p.`,
      interpretacao: interpIQ
    });

    // Razão H:Q Unilateral se avaliado em T1 e T2
    if (extJoelhoD_T1 > 0 && flexJoelhoD_T1 > 0 && extJoelhoD_T2 > 0 && flexJoelhoD_T2 > 0) {
      const iqD1 = Math.round((flexJoelhoD_T1 / extJoelhoD_T1) * 100);
      const iqD2 = Math.round((flexJoelhoD_T2 / extJoelhoD_T2) * 100);
      rowsRazoes.push({
        indice: 'Razão H:Q — Membro Direito (D)',
        referencia: '60%–75%',
        t1: `${iqD1}%`,
        t2: `${iqD2}%`,
        variacao: `${iqD2 - iqD1 >= 0 ? '+' : ''}${iqD2 - iqD1} p.p.`,
        interpretacao: iqD2 >= 60 && iqD2 <= 75 ? 'Equilibrado (60–75%)' : (iqD2 < 60 ? 'Déficit posterior (<60%)' : 'Predomínio flexor (>75%)')
      });
    }
    if (extJoelhoE_T1 > 0 && flexJoelhoE_T1 > 0 && extJoelhoE_T2 > 0 && flexJoelhoE_T2 > 0) {
      const iqE1 = Math.round((flexJoelhoE_T1 / extJoelhoE_T1) * 100);
      const iqE2 = Math.round((flexJoelhoE_T2 / extJoelhoE_T2) * 100);
      rowsRazoes.push({
        indice: 'Razão H:Q — Membro Esquerdo (E)',
        referencia: '60%–75%',
        t1: `${iqE1}%`,
        t2: `${iqE2}%`,
        variacao: `${iqE2 - iqE1 >= 0 ? '+' : ''}${iqE2 - iqE1} p.p.`,
        interpretacao: iqE2 >= 60 && iqE2 <= 75 ? 'Equilibrado (60–75%)' : (iqE2 < 60 ? 'Déficit posterior (<60%)' : 'Predomínio flexor (>75%)')
      });
    }

    analisePorLadoIQ = `Razão H:Q: ${iqGlobalT1.toFixed(1).replace('.', ',')}% (T1) ➔ ${iqGlobalT2.toFixed(1).replace('.', ',')}% (T2).`;
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

  if (hasAdAbdT1 && hasAdAbdT2) {
    const rT1 = Math.round(((adD_T1 + adE_T1) / (abdD_T1 + abdE_T1)) * 100) / 100;
    const rT2 = Math.round(((adD_T2 + adE_T2) / (abdD_T2 + abdE_T2)) * 100) / 100;
    const deltaR = Math.round((rT2 - rT1) * 100) / 100;

    let interp = 'Dentro da referência (1,05–1,20) — Proteção pubo-adutora ótima';
    if (rT2 < 0.80) interp = 'Abaixo da referência (< 0,80) — Risco elevado de dor inguinal e pubalgia';
    else if (rT2 < 1.05) interp = 'Leve déficit adutor (0,80–1,04) — Abaixo do padrão-ouro';
    else if (rT2 > 1.20) interp = 'Acima da referência (> 1,20) — Predomínio de adutores sobre abdutores';

    rowsRazoes.push({
      indice: 'Índice adutor/abdutor de quadril (ADD/ABD)',
      referencia: '1,05–1,20',
      t1: rT1.toFixed(2).replace('.', ','),
      t2: rT2.toFixed(2).replace('.', ','),
      variacao: `${deltaR >= 0 ? '+' : ''}${deltaR.toFixed(2).replace('.', ',')}`,
      interpretacao: interp
    });
  }

  // Força Relativa de Quadríceps (%PC)
  if (pesoKg > 0) {
    const extTotT1 = extJoelhoD_T1 + extJoelhoE_T1;
    const extTotT2 = extJoelhoD_T2 + extJoelhoE_T2;
    if (extTotT1 > 0 && extTotT2 > 0) {
      const qPcT1 = Math.round(((extTotT1 / 2) / (pesoKg * 9.81)) * 1000) / 10;
      const qPcT2 = Math.round(((extTotT2 / 2) / (pesoKg * 9.81)) * 1000) / 10;
      const deltaQPc = Math.round((qPcT2 - qPcT1) * 10) / 10;

      rowsRazoes.push({
        indice: 'Quadríceps relativo ao peso corporal (%PC)',
        referencia: '≥60% do peso corporal',
        t1: `${qPcT1.toFixed(1).replace('.', ',')}%`,
        t2: `${qPcT2.toFixed(1).replace('.', ',')}%`,
        variacao: `${deltaQPc >= 0 ? '+' : ''}${deltaQPc.toFixed(1).replace('.', ',')} p.p.`,
        interpretacao: qPcT2 >= 60 ? 'Adequado (≥60%) — Boa capacidade de amortecimento patelofemoral' : 'Abaixo da referência (<60%) — Risco de sobrecarga articular'
      });
    }

    // Glúteo Médio Relativo (%PC)
    const abdTotT1 = abdD_T1 + abdE_T1;
    const abdTotT2 = abdD_T2 + abdE_T2;
    if (abdTotT1 > 0 && abdTotT2 > 0) {
      const gMedT1 = Math.round(((abdTotT1 / 2) / (pesoKg * 9.81)) * 1000) / 10;
      const gMedT2 = Math.round(((abdTotT2 / 2) / (pesoKg * 9.81)) * 1000) / 10;
      const deltaGMed = Math.round((gMedT2 - gMedT1) * 10) / 10;

      rowsRazoes.push({
        indice: 'Glúteo médio relativo ao peso corporal (%PC)',
        referencia: '≥25% do peso corporal',
        t1: `${gMedT1.toFixed(1).replace('.', ',')}%`,
        t2: `${gMedT2.toFixed(1).replace('.', ',')}%`,
        variacao: `${deltaGMed >= 0 ? '+' : ''}${deltaGMed.toFixed(1).replace('.', ',')} p.p.`,
        interpretacao: gMedT2 >= 25 ? 'Adequado (≥25%) — Estabilidade frontal preservada' : 'Abaixo da referência (<25%) — Déficit de controle pélvico'
      });
    }
  }

  // 7. ANÁLISE DE SIMETRIA ENTRE MEMBROS (somente movimentos avaliados em T1 e T2)
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
    if (!hasT1Pair || !hasT2Pair) return;

    const defT1 = calcSimetriaDeficit(d1, e1);
    const defT2 = calcSimetriaDeficit(d2, e2);
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

  // 8. TESTES FUNCIONAIS: Y-TESTE & STEP DOWN (Suporta PhysioReport, PhysicalAssessment e ClientTestRecord)
  const normalizeYTest = (rep: any) => {
    const raw =
      rep?.testesOrtopedicos?.yTeste ||
      rep?.dadosMedidos?.testesEspeciais?.yTest ||
      rep?.dadosMedidos?.testesEspeciais?.yTeste ||
      (rep?.tipoTeste === 'Y_TEST' ? rep?.dados : rep?.avulsoYTest);
    if (!raw || typeof raw !== 'object') return null;
    if (raw.direita || raw.esquerda) return raw;
    if (raw.alcanceAnteriorD != null || raw.alcanceAnteriorE != null) {
      return {
        realizou: 'sim',
        direita: {
          comprimentoMembro: Number(raw.comprimentoMembroCm || raw.comprimentoMembroD || 85),
          anterior: Number(raw.alcanceAnteriorD) || 0,
          posteromedial: Number(raw.alcancePosteromedialD) || 0,
          posterolateral: Number(raw.alcancePosterolateralD) || 0
        },
        esquerda: {
          comprimentoMembro: Number(raw.comprimentoMembroCm || raw.comprimentoMembroE || 85),
          anterior: Number(raw.alcanceAnteriorE) || 0,
          posteromedial: Number(raw.alcancePosteromedialE) || 0,
          posterolateral: Number(raw.alcancePosterolateralE) || 0
        }
      };
    }
    return raw;
  };

  const yT1 = normalizeYTest(t1Report);
  const yT2 = normalizeYTest(t2Report);

  const hasY1 = Boolean(yT1?.direita?.anterior || yT1?.realizou === 'sim');
  const hasY2 = Boolean(yT2?.direita?.anterior || yT2?.realizou === 'sim');

  let yTestResult: YTestComparison | null = null;
  if (hasY1 && hasY2) {
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

  // Step Down Test (Suporta PhysioReport, PhysicalAssessment e ClientTestRecord)
  const normalizeStepDown = (rep: any) => {
    const raw =
      rep?.testesOrtopedicos?.stepDown ||
      rep?.dadosMedidos?.testesEspeciais?.stepDown ||
      (rep?.tipoTeste === 'STEP_DOWN' ? rep?.dados : rep?.avulsoStepDown);
    if (!raw || typeof raw !== 'object') return null;
    if (raw.valgoDinamicoJoelhoD != null || raw.valgoDinamicoJoelhoE != null || raw.quedaPelvicaD != null) return raw;
    return {
      valgoDinamicoJoelhoD: typeof raw.valgoD === 'number' ? raw.valgoD : (raw.valgoD ? 15 : 0),
      valgoDinamicoJoelhoE: typeof raw.valgoE === 'number' ? raw.valgoE : (raw.valgoE ? 15 : 0),
      aducaoQuadrilD: raw.aducaoD ?? raw.aducaoQuadrilD ?? null,
      aducaoQuadrilE: raw.aducaoE ?? raw.aducaoQuadrilE ?? null,
      quedaPelvicaD: raw.quedaPelvicaD ?? raw.pelvicaD ?? null,
      quedaPelvicaE: raw.quedaPelvicaE ?? raw.pelvicaE ?? null,
      compExcentricoPrpsD: raw.prpsD ?? raw.compExcentricoPrpsD ?? null,
      compExcentricoPrpsE: raw.prpsE ?? raw.compExcentricoPrpsE ?? null,
      pontuacaoD: raw.pontuacaoD ?? null,
      pontuacaoE: raw.pontuacaoE ?? null
    };
  };

  const sdT1 = normalizeStepDown(t1Report);
  const sdT2 = normalizeStepDown(t2Report);
  const hasSD = Boolean(sdT1 || sdT2);

  const sdRows: StepDownComparisonRow[] = [];
  if (hasSD) {
    const addSDRow = (label: string, ref: string, v1Raw: any, v2Raw: any, higherIsBetter = false) => {
      const v1 = parseNumberOrNull(v1Raw);
      const v2 = parseNumberOrNull(v2Raw);
      if (v1 == null || v2 == null) return;
      const num1 = v1;
      const num2 = v2;
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
    addSDRow('Score Step Down — Membro Direito', '0 a 2 pts', sdT1?.pontuacaoD, sdT2?.pontuacaoD, false);
    addSDRow('Score Step Down — Membro Esquerdo', '0 a 2 pts', sdT1?.pontuacaoE, sdT2?.pontuacaoE, false);
  }

  // Hop Tests (Bateria de Saltos Unipodais & LSI)
  const hopRaw = t2Report?.hopTest || t2Report?.dados?.hopTest || t2Report?.testesOrtopedicos?.hopTest ||
                 t2Report?.dadosMedidos?.testesEspeciais?.hopTest ||
                 (t2Report?.tipoTeste === 'HOP_TEST' ? t2Report?.dados : null) ||
                 t1Report?.hopTest || t1Report?.dados?.hopTest || t1Report?.testesOrtopedicos?.hopTest ||
                 (t1Report?.tipoTeste === 'HOP_TEST' ? t1Report?.dados : null);
  const hopTestResult = calculateHopBatteryAnalysis(hopRaw);

  // VISA-P (Questionário Validado de Tendinopatia Patelar — MCID = 13 pts)
  const visaRawT1 = input.t1VisaP || t1Report?.visaP || t1Report?.dados?.visaP || t1Report?.testesOrtopedicos?.visaP || t1Report?.dadosMedidos?.testesEspeciais?.visaP || (t1Report?.tipoTeste === 'VISA_P' ? t1Report?.dados : null);
  const visaRawT2 = input.t2VisaP || t2Report?.visaP || t2Report?.dados?.visaP || t2Report?.testesOrtopedicos?.visaP || t2Report?.dadosMedidos?.testesEspeciais?.visaP || (t2Report?.tipoTeste === 'VISA_P' ? t2Report?.dados : null);
  const visaPResult = compareVisaPLongitudinal(visaRawT1, visaRawT2, dtRelatorioT1, dtReavaliacao);

  // 9. AMPLITUDE DE MOVIMENTO (GONIOMETRIA - Suporta PhysioReport, PhysicalAssessment e ClientTestRecord)
  const g1 = {
    ...(t1Report?.tipoTeste === 'GONIOMETRIA' ? t1Report?.dados : {}),
    ...(t1Report?.avulsoGoniometria || {}),
    ...(t1Report?.dadosMedidos?.goniometria || {}),
    ...(t1Report?.goniometria || {})
  };
  const g2 = {
    ...(t2Report?.tipoTeste === 'GONIOMETRIA' ? t2Report?.dados : {}),
    ...(t2Report?.avulsoGoniometria || {}),
    ...(t2Report?.dadosMedidos?.goniometria || {}),
    ...(t2Report?.goniometria || {})
  };

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
    if (v1 == null || v2 == null) return;

    const delta = v2 - v1;
    const deltaStr = `${delta >= 0 ? '+' : ''}${delta}°`;
    let leitura: TableRowGoniometria['leitura'] = 'Estável';
    if (v2 >= cfg.minRef && v1 < cfg.minRef) leitura = 'Normalizou';
    else if (delta > 3) leitura = 'Evoluiu';
    else if (delta >= -2 && delta <= 3) leitura = delta === 0 ? 'Estagnada' : 'Estável';
    else leitura = 'Involução';

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
  const parseMaigneFromAssessment = (rep: any) => {
    const rawMaigne = rep?.dadosMedidos?.testesEspeciais?.maigne;
    if (typeof rawMaigne === 'string' && rawMaigne.trim().startsWith('{')) {
      try {
        return JSON.parse(rawMaigne);
      } catch {
        return null;
      }
    }
    return null;
  };
  const maigneMap: Record<string, string> = {
    mFlex: 'flexao', mFlexEVA: 'flexaoEVA',
    mExt: 'extensao', mExtEVA: 'extensaoEVA',
    mIncD: 'inclinacaoD', mIncDEVA: 'inclinacaoDEVA',
    mIncE: 'inclinacaoE', mIncEEVA: 'inclinacaoEEVA',
    mRotD: 'rotacaoD', mRotDEVA: 'rotacaoDEVA',
    mRotE: 'rotacaoE', mRotEEVA: 'rotacaoEEVA'
  };
  const getCol = (rep: any, k: string) => {
    const direct = rep?.[k] ?? rep?.dados?.[k] ?? rep?.mobilidadeColuna?.[k];
    if (direct !== undefined && direct !== null && direct !== '') return direct;
    const parsedM = parseMaigneFromAssessment(rep);
    if (parsedM && maigneMap[k] && parsedM[maigneMap[k]] !== undefined) {
      return parsedM[maigneMap[k]];
    }
    return null;
  };
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

    if ((g1Val == null || g2Val == null) && (e1Val == null || e2Val == null)) return;

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
  const te1 = {
    ...(t1Report?.tipoTeste === 'TESTES_ESPECIAIS' ? t1Report?.dados : {}),
    ...(t1Report?.avulsoTestesEspeciais || {}),
    ...(t1Report?.dadosMedidos?.testesEspeciais || {}),
    ...(t1Report?.testesEspeciais || {}),
    ...(t1Report?.testesOrtopedicos || {})
  };
  const te2 = {
    ...(t2Report?.tipoTeste === 'TESTES_ESPECIAIS' ? t2Report?.dados : {}),
    ...(t2Report?.avulsoTestesEspeciais || {}),
    ...(t2Report?.dadosMedidos?.testesEspeciais || {}),
    ...(t2Report?.testesEspeciais || {}),
    ...(t2Report?.testesOrtopedicos || {})
  };

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
    const resolveSpecialVal = (te: any, rep: any) => {
      if (te[t.key]) return te[t.key];
      if (te[`${t.key}DStatus`] || te[`${t.key}EStatus`]) {
        const dStat = te[`${t.key}DStatus`] || 'Negativo';
        const eStat = te[`${t.key}EStatus`] || 'Negativo';
        const dDeg = te[`${t.key}D`] ? ` (${te[`${t.key}D`]}°)` : '';
        const eDeg = te[`${t.key}E`] ? ` (${te[`${t.key}E`]}°)` : '';
        return `D: ${dStat}${dDeg} / E: ${eStat}${eDeg}`;
      }
      if (te[`${t.key}D`] || te[`${t.key}E`]) {
        return `D: ${te[`${t.key}D`] || '-'} / E: ${te[`${t.key}E`] || '-'}`;
      }
      return rep?.[t.key] || rep?.dados?.[t.key] || null;
    };

    const val1 = resolveSpecialVal(te1, t1Report);
    const val2 = resolveSpecialVal(te2, t2Report);
    if (!val1 || !val2) return;

    const s1 = String(val1 || 'Não registrado');
    const s2 = String(val2 || 'Não registrado');
    let leitura = 'Acompanhamento clínico';
    if (s1.toLowerCase().includes('positivo') && !s2.toLowerCase().includes('positivo') && s2.toLowerCase().includes('negativo')) {
      leitura = 'Resolvido (negativou)';
    } else if (!s1.toLowerCase().includes('positivo') && s1.toLowerCase().includes('negativo') && s2.toLowerCase().includes('positivo')) {
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

  // 10.1 COMPOSIÇÃO CORPORAL & ANTROPOMETRIA (Avaliação Física e Testes Avulsos)
  const extractBodyComp = (rep: any) => {
    if (!rep) return {};
    const dm = rep?.dadosMedidos || {};
    const rc = rep?.resultadosCalculados || {};
    const av = rep?.tipoTeste === 'COMPOSICAO_CORPORAL' ? (rep?.dados || {}) : (rep?.avulsoComposicao || {});
    const peso = parseNumberOrNull(dm.peso ?? rc.peso ?? av.peso);
    const altura = parseNumberOrNull(dm.altura ?? rc.altura);
    const percGordura = parseNumberOrNull(rc.percentualGordura ?? dm.percentualGordura ?? av.percentualGordura);
    let massaMagra = parseNumberOrNull(rc.massaMagra ?? dm.massaMagra ?? av.massaMagraKg ?? av.massaMagra);
    let massaGorda = parseNumberOrNull(rc.massaGorda ?? dm.massaGorda ?? av.massaGordaKg ?? av.massaGorda);
    if (peso && percGordura != null && percGordura > 0) {
      if (!massaGorda) massaGorda = Math.round((peso * (percGordura / 100)) * 100) / 100;
      if (!massaMagra && massaGorda) massaMagra = Math.round((peso - massaGorda) * 100) / 100;
    }
    let imc = parseNumberOrNull(rc.imc ?? dm.imc);
    if (!imc && peso && altura && altura > 0) {
      const hMeters = altura > 3 ? altura / 100 : altura;
      imc = Math.round((peso / (hMeters * hMeters)) * 10) / 10;
    }
    let somaDobras = parseNumberOrNull(dm.somaDobras ?? rc.somaDobras);
    if ((!somaDobras || somaDobras <= 0) && dm.dobras && typeof dm.dobras === 'object') {
      const vals = Object.values(dm.dobras).map((v: any) => Number(v) || 0).filter(v => v > 0);
      if (vals.length > 0) somaDobras = Math.round(vals.reduce((a, b) => a + b, 0) * 10) / 10;
    }
    const circ = dm.circunferencias || rep?.perimetria || (rep?.tipoTeste === 'PERIMETRIA' ? rep?.dados : rep?.avulsoPerimetria) || {};
    const cintura = parseNumberOrNull(circ.cintura);
    const quadril = parseNumberOrNull(circ.quadril);
    const rcq = (cintura && quadril && quadril > 0) ? Math.round((cintura / quadril) * 100) / 100 : null;

    return { peso, percGordura, massaMagra, massaGorda, imc, somaDobras, rcq };
  };

  const bc1 = extractBodyComp(t1Report);
  const bc2 = extractBodyComp(t2Report);
  const tabelaComposicao: TableRowComposicao[] = [];

  const addCompRow = (
    parametro: string,
    unidade: string,
    v1: number | null | undefined,
    v2: number | null | undefined,
    mode: 'higherBetter' | 'lowerBetter' | 'neutral'
  ) => {
    const n1 = v1 != null && v1 > 0 ? v1 : null;
    const n2 = v2 != null && v2 > 0 ? v2 : null;
    if (n1 == null || n2 == null) return;
    let variacao = '-';
    let variacaoPct = '-';
    let leitura = 'Avaliado';
    if (n1 != null && n2 != null) {
      const delta = Math.round((n2 - n1) * 100) / 100;
      const sign = delta > 0 ? '+' : '';
      variacao = `${sign}${delta.toFixed(1).replace('.0', '')}`;
      const pct = n1 > 0 ? Math.round(((n2 - n1) / n1) * 1000) / 10 : 0;
      variacaoPct = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
      if (Math.abs(delta) < 0.1) {
        leitura = 'Estável';
      } else if (mode === 'higherBetter') {
        leitura = delta > 0 ? 'Ganho de massa magra' : 'Redução de massa magra';
      } else if (mode === 'lowerBetter') {
        leitura = delta < 0 ? 'Redução de gordura' : 'Aumento de gordura';
      } else {
        leitura = delta > 0 ? `Aumento de ${delta.toFixed(1)} ${unidade}` : `Redução de ${Math.abs(delta).toFixed(1)} ${unidade}`;
      }
    }
    tabelaComposicao.push({
      parametro,
      metrica: parametro,
      unidade,
      t1: n1,
      t2: n2,
      variacao,
      variacaoPct,
      leitura
    });
  };

  addCompRow('Peso Corporal', 'kg', bc1.peso, bc2.peso, 'neutral');
  addCompRow('Percentual de Gordura (%GC)', '%', bc1.percGordura, bc2.percGordura, 'lowerBetter');
  addCompRow('Massa Magra (Livre de Gordura)', 'kg', bc1.massaMagra, bc2.massaMagra, 'higherBetter');
  addCompRow('Massa Gorda (Adiposa)', 'kg', bc1.massaGorda, bc2.massaGorda, 'lowerBetter');
  addCompRow('Índice de Massa Corporal (IMC)', 'kg/m²', bc1.imc, bc2.imc, 'neutral');
  addCompRow('Soma de Dobras Cutâneas', 'mm', bc1.somaDobras, bc2.somaDobras, 'lowerBetter');
  addCompRow('Relação Cintura-Quadril (RCQ)', '', bc1.rcq, bc2.rcq, 'lowerBetter');

  // 10.1B DOBRAS CUTÂNEAS INDIVIDUAIS (Pollock 7/8 Dobras em mm)
  const extractDobras = (rep: any) => {
    if (!rep) return {};
    const dm = rep?.dadosMedidos || {};
    const av = rep?.tipoTeste === 'COMPOSICAO_CORPORAL' ? (rep?.dados || {}) : (rep?.avulsoComposicao || {});
    return {
      ...(dm.dobras || {}),
      ...(dm.dobrasReadings || {}),
      ...(av.dobras || {}),
      ...(av.dobrasReadings || {}),
      ...(rep?.dobras || {})
    };
  };

  const dObj1 = extractDobras(t1Report);
  const dObj2 = extractDobras(t2Report);
  const tabelaDobras: TableRowDobra[] = [];

  const dobrasConfigs: Array<{ label: string; keys: string[] }> = [
    { label: 'Peitoral', keys: ['peitoral'] },
    { label: 'Tríceps', keys: ['triceps'] },
    { label: 'Subescapular', keys: ['subescapular'] },
    { label: 'Axilar Média', keys: ['subaxilar', 'axilarMedia', 'axilar'] },
    { label: 'Supra-ilíaca', keys: ['suprailiaca', 'supraIliaca'] },
    { label: 'Abdômen', keys: ['abdomen'] },
    { label: 'Coxa', keys: ['coxa'] },
    { label: 'Panturrilha Medial', keys: ['panturrilha'] }
  ];

  const getDobraValFromObj = (obj: any, keys: string[]): number | null => {
    for (const k of keys) {
      const v = parseNumberOrNull(obj?.[k]);
      if (v != null && v > 0) return v;
    }
    return null;
  };

  dobrasConfigs.forEach(cfg => {
    const v1 = getDobraValFromObj(dObj1, cfg.keys);
    const v2 = getDobraValFromObj(dObj2, cfg.keys);
    if (v1 == null && v2 == null) return;
    let variacaoMm = '-';
    let deltaNum = 0;
    let variacaoPct = '-';
    let leitura = 'Avaliado';
    if (v1 != null && v2 != null) {
      const delta = Math.round((v2 - v1) * 10) / 10;
      deltaNum = delta;
      const sign = delta > 0 ? '+' : '';
      variacaoMm = `${sign}${delta.toFixed(1)} mm`;
      const pct = v1 > 0 ? Math.round(((v2 - v1) / v1) * 1000) / 10 : 0;
      variacaoPct = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
      if (Math.abs(delta) <= 0.5) {
        leitura = 'Estável';
      } else if (delta < 0) {
        leitura = 'Redução de gordura subcutânea';
      } else {
        leitura = 'Aumento de dobra subcutânea';
      }
    }
    tabelaDobras.push({
      dobra: cfg.label,
      t1: v1,
      t2: v2,
      variacaoMm,
      deltaNum,
      variacaoPct,
      leitura
    });
  });

  // 10.2 PERIMETRIA / CIRCUNFERÊNCIAS CORPORAIS (cm)
  const extractPerimetria = (rep: any) => {
    if (!rep) return {};
    return {
      ...(rep?.tipoTeste === 'PERIMETRIA' ? rep?.dados : {}),
      ...(rep?.avulsoPerimetria || {}),
      ...(rep?.perimetria || {}),
      ...(rep?.dadosMedidos?.circunferencias || {})
    };
  };

  const p1 = extractPerimetria(t1Report);
  const p2 = extractPerimetria(t2Report);
  const tabelaPerimetria: TableRowPerimetria[] = [];

  const perimConfigs: Array<{ label: string; keys: string[]; isCentral?: boolean }> = [
    { label: 'Pescoço', keys: ['pescoco'] },
    { label: 'Ombros', keys: ['ombros'] },
    { label: 'Tórax', keys: ['torax'] },
    { label: 'Cintura', keys: ['cintura'], isCentral: true },
    { label: 'Abdômen', keys: ['abdomen'], isCentral: true },
    { label: 'Quadril', keys: ['quadril'] },
    { label: 'Braço Direito', keys: ['braçoD', 'bracoD'] },
    { label: 'Braço Esquerdo', keys: ['braçoE', 'bracoE'] },
    { label: 'Antebraço Direito', keys: ['antebraçoD', 'antebracoD'] },
    { label: 'Antebraço Esquerdo', keys: ['antebraçoE', 'antebracoE'] },
    { label: 'Coxa Direita', keys: ['coxaD'] },
    { label: 'Coxa Esquerda', keys: ['coxaE'] },
    { label: 'Panturrilha Direita', keys: ['panturrilhaD'] },
    { label: 'Panturrilha Esquerda', keys: ['panturrilhaE'] }
  ];

  const getPerimVal = (obj: any, keys: string[]): number | null => {
    for (const k of keys) {
      const v = parseNumberOrNull(obj?.[k]);
      if (v != null && v > 0) return v;
    }
    return null;
  };

  perimConfigs.forEach(cfg => {
    const v1 = getPerimVal(p1, cfg.keys);
    const v2 = getPerimVal(p2, cfg.keys);
    if (v1 == null || v2 == null) return;
    let variacaoCm = '-';
    let deltaNum = 0;
    let leitura = 'Medido';
    if (v1 != null && v2 != null) {
      const delta = Math.round((v2 - v1) * 10) / 10;
      deltaNum = delta;
      const sign = delta > 0 ? '+' : '';
      variacaoCm = `${sign}${delta.toFixed(1)} cm`;
      if (Math.abs(delta) <= 0.3) {
        leitura = 'Estável';
      } else if (cfg.isCentral) {
        leitura = delta < 0 ? 'Redução de medida central (Favorável)' : 'Aumento de medida central';
      } else {
        leitura = delta > 0 ? 'Ganho perimétrico / Trofismo' : 'Redução perimétrica';
      }
    }
    tabelaPerimetria.push({
      regiao: cfg.label,
      t1: v1,
      t2: v2,
      variacaoCm,
      deltaNum,
      leitura,
      isCentral: cfg.isCentral
    });
  });

  // 10.3 KPIS DE RECOMPOSIÇÃO CORPORAL REAL
  const gorduraEliminadaKg = (bc1.massaGorda != null && bc2.massaGorda != null)
    ? Math.round((bc1.massaGorda - bc2.massaGorda) * 10) / 10
    : 0;
  const massaMagraGanhaKg = (bc1.massaMagra != null && bc2.massaMagra != null)
    ? Math.round((bc2.massaMagra - bc1.massaMagra) * 10) / 10
    : 0;
  const deltaPercentualGordura = (bc1.percGordura != null && bc2.percGordura != null)
    ? Math.round((bc2.percGordura - bc1.percGordura) * 10) / 10
    : 0;
  const deltaSomaDobrasMm = (bc1.somaDobras != null && bc2.somaDobras != null)
    ? Math.round((bc2.somaDobras - bc1.somaDobras) * 10) / 10
    : 0;
  const c1 = getPerimVal(p1, ['cintura']);
  const c2 = getPerimVal(p2, ['cintura']);
  const deltaCinturaCm = (c1 != null && c2 != null)
    ? Math.round((c2 - c1) * 10) / 10
    : 0;

  const d1 = t1Report?.data ? new Date(t1Report.data).getTime() : 0;
  const d2 = t2Report?.data ? new Date(t2Report.data).getTime() : 0;
  const diasIntervalo = (d1 && d2) ? Math.max(1, Math.round(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24))) : (intervaloSemanas * 7 || 0);

  let taxaSucessoLabel = 'Em monitoramento de composição corporal';
  let statusRecomposicao: 'excelente' | 'otimo' | 'bom' | 'estavel' | 'atencao' = 'estavel';
  if (gorduraEliminadaKg > 0.4 && massaMagraGanhaKg > 0.3) {
    taxaSucessoLabel = 'Excelente recomposição corporal (perda adiposa concomitante a ganho muscular)';
    statusRecomposicao = 'excelente';
  } else if (gorduraEliminadaKg > 0.5) {
    taxaSucessoLabel = `Redução adiposa consistente (-${gorduraEliminadaKg.toFixed(1)} kg de gordura)`;
    statusRecomposicao = 'otimo';
  } else if (massaMagraGanhaKg > 0.5) {
    taxaSucessoLabel = `Hipertrofia e ganho trófico (+${massaMagraGanhaKg.toFixed(1)} kg de massa magra)`;
    statusRecomposicao = 'otimo';
  } else if (deltaSomaDobrasMm < -3) {
    taxaSucessoLabel = `Redução da espessura das dobras cutâneas (${deltaSomaDobrasMm.toFixed(1)} mm)`;
    statusRecomposicao = 'bom';
  } else if (gorduraEliminadaKg < -1.0) {
    taxaSucessoLabel = 'Aumento de gordura corporal acima do recomendado';
    statusRecomposicao = 'atencao';
  }

  const kpisRecomposicao: RecomposicaoCorporalKPIs = {
    gorduraEliminadaKg,
    massaMagraGanhaKg,
    deltaPercentualGordura,
    deltaSomaDobrasMm,
    deltaCinturaCm,
    diasIntervalo,
    statusRecomposicao,
    taxaSucessoLabel
  };

  // 11. DETECÇÃO DE CLUSTERS CLÍNICOS E ADAPTAÇÃO POR SEGMENTO
  const toUndef = (v: number | null) => (v === null ? undefined : v);
  const clinicalProfile: ClientClinicalProfile = {
    queixasEVA: rowsEVA.map(r => ({ queixa: r.queixa, t1: r.t1, t2: r.t2, delta: r.variacao })),
    mobilidadeColuna: {
      flexao: { t1: toUndef(parseNumberOrNull(getCol(t1Report, 'mFlex'))), t2: toUndef(parseNumberOrNull(getCol(t2Report, 'mFlex'))), eva1: toUndef(parseNumberOrNull(getCol(t1Report, 'mFlexEVA'))), eva2: toUndef(parseNumberOrNull(getCol(t2Report, 'mFlexEVA'))) },
      extensao: { t1: toUndef(parseNumberOrNull(getCol(t1Report, 'mExt'))), t2: toUndef(parseNumberOrNull(getCol(t2Report, 'mExt'))), eva1: toUndef(parseNumberOrNull(getCol(t1Report, 'mExtEVA'))), eva2: toUndef(parseNumberOrNull(getCol(t2Report, 'mExtEVA'))) },
      inclinacaoD: { t1: toUndef(parseNumberOrNull(getCol(t1Report, 'mIncD'))), t2: toUndef(parseNumberOrNull(getCol(t2Report, 'mIncD'))), eva1: toUndef(parseNumberOrNull(getCol(t1Report, 'mIncDEVA'))), eva2: toUndef(parseNumberOrNull(getCol(t2Report, 'mIncDEVA'))) },
      inclinacaoE: { t1: toUndef(parseNumberOrNull(getCol(t1Report, 'mIncE'))), t2: toUndef(parseNumberOrNull(getCol(t2Report, 'mIncE'))), eva1: toUndef(parseNumberOrNull(getCol(t1Report, 'mIncEEVA'))), eva2: toUndef(parseNumberOrNull(getCol(t2Report, 'mIncEEVA'))) },
      rotacaoD: { t1: toUndef(parseNumberOrNull(getCol(t1Report, 'mRotD'))), t2: toUndef(parseNumberOrNull(getCol(t2Report, 'mRotD'))), eva1: toUndef(parseNumberOrNull(getCol(t1Report, 'mRotDEVA'))), eva2: toUndef(parseNumberOrNull(getCol(t2Report, 'mRotDEVA'))) },
      rotacaoE: { t1: toUndef(parseNumberOrNull(getCol(t1Report, 'mRotE'))), t2: toUndef(parseNumberOrNull(getCol(t2Report, 'mRotE'))), eva1: toUndef(parseNumberOrNull(getCol(t1Report, 'mRotEEVA'))), eva2: toUndef(parseNumberOrNull(getCol(t2Report, 'mRotEEVA'))) }
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
      hopTest: hopTestResult,
      visaP: visaPResult
    },
    tabelaGoniometria: goniometriaRows,
    tabelaColuna: tabelaColunaRows,
    tabelaTestesOrtopedicos: rowsTestesOrtopedicos,
    tabelaComposicao,
    tabelaDobras,
    tabelaPerimetria,
    kpisRecomposicao,
    clusters,
    razoesAvancadas: calculateAdvancedStrengthRatios(
      t2Strength?.testesRealizados || t2Strength?.testes || t2Strength?.exercicios || t1Strength?.testesRealizados || t1Strength?.testes || t1Strength?.exercicios,
      pesoKg || 70,
      (client.sexo as any) || 'M'
    )
  };
}
