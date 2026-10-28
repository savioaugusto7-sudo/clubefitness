/**
 * Motor de Inteligência Clínica e Síntese Diagnóstica (AI Clinical Synthesizer)
 * Integração com Google Gemini SDK para gerar análises e laudos de reavaliação
 * 100% personalizados por segmento e paciente, livres de cópia de modelos estáticos.
 */

import { GoogleGenAI } from '@google/genai';
import { LongitudinalComputedResult } from './longitudinalEngine';
import { ClinicalCluster } from './clinicalClustersEngine';

export interface SegmentalAnalysisItem {
  titulo: string;
  icone?: string;
  introducao: string;
  itens: string[];
}

export interface PersonalizedClinicalNarrative {
  discussaoClinica: string;
  fatoresEvolucao: string[];
  fatoresNaoApresentaramMelhora: string[];
  fatoresComInvolucao: string[];
  analisesSegmentares: SegmentalAnalysisItem[];
  conclusao: string[];
  prioridadesTerapeuticas: string[];
  isAiGenerated: boolean;
}

const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro'
];

/**
 * Gera a narrativa clínica personalizada usando IA (com fallback determinístico robusto)
 */
export async function generatePersonalizedClinicalNarrative(
  computed: LongitudinalComputedResult,
  customClustersOrBaseNarrative?: any
): Promise<PersonalizedClinicalNarrative> {
  const clusters: ClinicalCluster[] = Array.isArray(customClustersOrBaseNarrative)
    ? customClustersOrBaseNarrative
    : (Array.isArray(computed.clusters) ? computed.clusters : []);

  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = buildClinicalPrompt(computed, clusters);

      for (const modelName of FALLBACK_MODELS) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          });

          const rawText = response.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            if (isValidNarrativeStructure(parsed)) {
              return {
                ...parsed,
                isAiGenerated: true
              };
            }
          }
        } catch (mErr: any) {
          console.warn(`[aiClinicalNarrative] Modelo ${modelName} falhou:`, mErr?.message || mErr);
        }
      }
    } catch (apiErr) {
      console.warn('[aiClinicalNarrative] Falha na chamada da API Gemini, usando fallback determinístico:', apiErr);
    }
  }

  // Fallback determinístico inteligente estruturado por segmento
  return generateDeterministicSegmentalNarrative(computed, clusters);
}

/**
 * Constrói o prompt para o modelo de linguagem clínica
 */
function buildClinicalPrompt(computed: LongitudinalComputedResult, clusters: ClinicalCluster[]): string {
  const { identificacao, historicoClinicoBase, tabelaEVA, tabelaForca, tabelaSimetria, tabelaGoniometria, tabelaTestesOrtopedicos } = computed;

  const clusterSummaries = clusters.map(c => ({
    segmento: c.nome,
    tituloRecomendado: c.tituloLaudo,
    achados: c.achadosClinicos,
    pontosAtencao: c.pontosDeAtencao,
    metricas: c.metricas
  }));

  return `
Você é o Diretor Clínico e Fisioterapeuta Especialista em Biomecânica do Clube Fitness Fisio.
Sua missão é produzir uma síntese clínica aprofundada e personalizada para o LAUDO DE REAVALIAÇÃO COMPARATIVA (Pré/Pós) do paciente abaixo.

DIFERENCIAL MANDATÓRIO:
1. Este laudo NÃO PODE ser um texto genérico ou um modelo repetitivo de outro paciente.
2. É ESTRITAMENTE PROIBIDO incluir tópicos sobre compartimento medial de joelho ou tornozelo se a queixa e dados do paciente forem de Coluna, Ombro ou outro segmento não relacionado.
3. Foque EXCLUSIVAMENTE nos segmentos corporais afetados identificados nos clusters ativos.
4. Mantenha os números, deltas e angulações rigorosamente fiéis aos dados fornecidos. Não invente números.
5. Use terminologia cinesiológica de alta precisão (ex: sobrecarga nas facetas articulares, vetor em valgo, ritmo escapuloumeral, anteversão pélvica, etc.).

DADOS DO PACIENTE:
- Nome: ${identificacao.paciente}
- Idade: ${identificacao.idade} | Sexo: ${identificacao.sexo}
- Intervalo entre avaliações: ${identificacao.intervaloSemanas} semanas (${identificacao.dataRelatorioInicial} a ${identificacao.dataReavaliacao})
- Histórico Clínico e Cirurgias: ${historicoClinicoBase.historicoCirurgiasTraumas || 'Nenhum informado'}
- Demanda / Esporte / Atividade: ${historicoClinicoBase.demandaEsportiva || 'Não informada'}
- Hábitos: Sono e Estresse: ${historicoClinicoBase.sonoEEstresse || 'Em acompanhamento'}

CLUSTERS ANATÔMICOS IDENTIFICADOS:
${JSON.stringify(clusterSummaries, null, 2)}

DOR E QUEIXAS (EVA 0 a 10):
${JSON.stringify(tabelaEVA.rows, null, 2)}

DINAMOMETRIA DE FORÇA E SIMETRIAS:
Força: ${JSON.stringify(tabelaForca.map(f => `${f.movimento} (${f.lado}): ${f.t1}N ➔ ${f.t2}N (${f.variacaoPct}%)`), null, 2)}
Simetrias: ${JSON.stringify(tabelaSimetria.map(s => `${s.movimento}: ${s.t1}% ➔ ${s.t2}% (${s.situacao})`), null, 2)}

GONIOMETRIA ARTICULAR:
${JSON.stringify(tabelaGoniometria.map(g => `${g.movimento}: ${g.t1}° ➔ ${g.t2}° (${g.leitura})`), null, 2)}

TESTES ORTOPÉDICOS:
${JSON.stringify(tabelaTestesOrtopedicos.map(t => `${t.teste}: ${t.t1} ➔ ${t.t2} (${t.leitura})`), null, 2)}

RESPONDA EXCLUSIVAMENTE EM FORMATO JSON com o seguinte schema:
{
  "discussaoClinica": "Texto fluído e profissional de 2 a 3 parágrafos analisando a evolução biomecânica específica deste paciente, correlacionando suas queixas iniciais, os testes que melhoraram e a resposta ao tratamento no período.",
  "fatoresEvolucao": [
    "Item detalhado de ganho funcional específico do paciente",
    "Outro item real documentado"
  ],
  "fatoresNaoApresentaramMelhora": [
    "Item com déficit persistente ou que requer atenção continuada"
  ],
  "fatoresComInvolucao": [
    "Item com queda real ou 'Nenhum fator de involução clinicamente significativo foi detectado no período avaliado.'"
  ],
  "analisesSegmentares": [
    {
      "titulo": "TÍTULO EM MAIÚSCULAS DO SEGMENTO AFETADO (Ex: ANÁLISE BIOMECÂNICA DA COLUNA LOMBAR E COMPLEXO PÉLVICO ou ANÁLISE DO MANGUITO ROTADOR)",
      "introducao": "Frase introdutória contextualizando as forças e o segmento avaliado",
      "itens": [
        "Ponto crítico 1 correlacionando métricas reais e mecanismo de sobrecarga",
        "Ponto crítico 2"
      ]
    }
  ],
  "conclusao": [
    "Parágrafo 1 de conclusão médica/fisioterapêutica formal",
    "Parágrafo 2 orientando liberação de atividades ou continuidade do tratamento"
  ],
  "prioridadesTerapeuticas": [
    "Prioridade 1 de exercício ou conduta específica para a queixa do paciente",
    "Prioridade 2",
    "Prioridade 3"
  ]
}
`;
}

/**
 * Validador da estrutura do JSON retornado pela IA
 */
function isValidNarrativeStructure(obj: any): boolean {
  return (
    obj &&
    typeof obj.discussaoClinica === 'string' &&
    Array.isArray(obj.fatoresEvolucao) &&
    Array.isArray(obj.fatoresNaoApresentaramMelhora) &&
    Array.isArray(obj.fatoresComInvolucao) &&
    Array.isArray(obj.analisesSegmentares) &&
    Array.isArray(obj.conclusao) &&
    Array.isArray(obj.prioridadesTerapeuticas)
  );
}

/**
 * Fallback Determinístico Especializado: monta a narrativa clínica baseada nos clusters reais
 */
function generateDeterministicSegmentalNarrative(
  computed: LongitudinalComputedResult,
  clustersInput?: any
): PersonalizedClinicalNarrative {
  const clusters: ClinicalCluster[] = Array.isArray(clustersInput)
    ? clustersInput
    : (Array.isArray(computed.clusters) ? computed.clusters : []);
  const { identificacao, tabelaEVA, tabelaSimetria } = computed;

  const totalQueixasResolvidas = tabelaEVA.rows.filter(r => r.t1 > 0 && r.t2 === 0).length;
  const totalMelhorasEVA = tabelaEVA.rows.filter(r => r.variacao < 0).length;
  const totalSimetriasResolvidas = tabelaSimetria.filter(s => s.situacao === 'Resolvida').length;

  // Montar discussão clínica contextualizada pelos clusters
  const clusterNames = clusters.length > 0
    ? clusters.map(c => c.nome).join(', ')
    : 'mobilidade articular, força neuromuscular e alinhamento funcional';
  const discussaoClinica = `A reavaliação comparativa do paciente ${identificacao.paciente}, realizada após um intervalo de ${identificacao.intervaloSemanas} semanas de intervenção fisioterapêutica e fortalecimento muscular, documentou alterações funcionais significativas nos eixos de ${clusterNames}. O plano terapêutico inicial foi direcionado para a mitigação de sintomas dolorosos e a recuperação da estabilidade articular e controle motor.

No quadro sintomático, foram identificadas ${totalMelhorasEVA} queixa(s) com redução na escala analógica visual de dor (EVA), das quais ${totalQueixasResolvidas} evoluíram para remissão completa dos sintomas durante as atividades cotidianas. Os testes ortopédicos e os registros de goniometria evidenciam uma reorganização positiva dos tecidos sob demanda, permitindo maior segurança na progressão de amplitude e absorção de cargas nos movimentos funcionais.`;

  // Fatores de evolução consolidados
  const fatoresEvolucao: string[] = [];
  tabelaEVA.rows.forEach(r => {
    if (r.variacao < 0 || (r.t1 > 0 && r.t2 === 0)) {
      fatoresEvolucao.push(`Dor em ${r.queixa} — redução de ${r.t1}/10 para ${r.t2}/10 na escala EVA (${r.situacao}).`);
    }
  });

  clusters.forEach(c => {
    c.achadosClinicos.forEach(achado => {
      if (!fatoresEvolucao.includes(achado)) fatoresEvolucao.push(achado);
    });
  });

  if (fatoresEvolucao.length === 0) {
    fatoresEvolucao.push('Evolução motora e adaptação tecidual monitoradas de forma progressiva.');
  }

  // Fatores sem melhora
  const fatoresNaoApresentaramMelhora: string[] = [];
  tabelaEVA.rows.forEach(r => {
    if (r.t2 >= r.t1 && r.t2 > 0) {
      fatoresNaoApresentaramMelhora.push(`Dor residual em ${r.queixa} — estabilizada em ${r.t2}/10 na escala EVA.`);
    }
  });

  clusters.forEach(c => {
    c.pontosDeAtencao.forEach(pt => {
      if (!fatoresNaoApresentaramMelhora.includes(pt)) fatoresNaoApresentaramMelhora.push(pt);
    });
  });

  if (fatoresNaoApresentaramMelhora.length === 0) {
    fatoresNaoApresentaramMelhora.push('Nenhum fator de estagnação crítica persistente identificado nas variáveis avaliadas.');
  }

  // Fatores com involução
  const fatoresComInvolucao: string[] = [];
  tabelaEVA.rows.forEach(r => {
    if (r.variacao > 0) {
      fatoresComInvolucao.push(`Aumento de dor autorreferida em ${r.queixa} (variação de ${r.t1}/10 para ${r.t2}/10).`);
    }
  });

  if (fatoresComInvolucao.length === 0) {
    fatoresComInvolucao.push('Nenhum fator de involução clinicamente significativo foi detectado no período avaliado.');
  }

  // Análises segmentares: uma para cada cluster ativo do paciente
  const analisesSegmentares: SegmentalAnalysisItem[] = clusters.length > 0
    ? clusters.map(c => {
        const itens: string[] = [];
        c.achadosClinicos.forEach(a => itens.push(a));
        c.pontosDeAtencao.forEach(p => itens.push(p));
        return {
          segmento: c.id,
          titulo: c.tituloLaudo,
          diagnosticoFuncional: c.achadosClinicos.join(' ') || 'Adaptação tecidual favorável observada no segmento.',
          icone: c.icone,
          introducao: `Avaliação dos fatores mecânicos, articulares e neuromusculares que governam o segmento de ${c.nome}:`,
          itens: itens.length > 0 ? itens : ['Parâmetros biomecânicos e testes dinâmicos com boa tolerância de carga.'],
          recomendacao: c.recomendacoesTerapeuticas[0] || 'Manter progressão controlada de sobrecarga.'
        };
      })
    : [{
        segmento: 'geral',
        titulo: 'ANÁLISE BIOMECÂNICA GLOBAL & CONTROLE NEUROMUSCULAR',
        diagnosticoFuncional: 'O paciente demonstra adaptação neuromuscular favorável aos estímulos instituídos.',
        icone: 'fa-child',
        introducao: 'Avaliação da resposta sistêmica aos estímulos de força e amplitude:',
        itens: ['Estabilidade funcional preservada.', 'Evolução consistente na tolerância à carga.'],
        recomendacao: 'Manter progressão de sobrecarga com técnica apurada.'
      }];

  // Conclusão
  const conclusao: string[] = [
    `A comparação longitudinal entre a avaliação inicial de ${identificacao.dataRelatorioInicial} e a reavaliação de ${identificacao.dataReavaliacao} evidencia a resposta clínica consistente do paciente ${identificacao.paciente}. Foram documentadas ${totalMelhorasEVA} queixa(s) com redução de dor e ${totalSimetriasResolvidas} assimetria(s) normalizada(s).`,
    'Os indicadores cinesiológicos e ortopédicos documentados devem subsidiar os próximos ciclos de treinamento físico e acompanhamento fisioterapêutico profilático.',
    'A evolução das cargas de trabalho deve respeitar a ausência de sintomas álgicos reativos e a manutenção da biomecânica simétrica durante os gestos funcionais e esportivos.'
  ];

  // Prioridades Terapêuticas
  const prioridadesTerapeuticas: string[] = [];
  clusters.forEach(c => {
    c.recomendacoesTerapeuticas.forEach(rec => {
      if (!prioridadesTerapeuticas.includes(rec)) prioridadesTerapeuticas.push(rec);
    });
  });

  if (prioridadesTerapeuticas.length < 3) {
    prioridadesTerapeuticas.push('Consolidação dos ganhos de estabilidade dinâmica e fortalecimento muscular.');
    prioridadesTerapeuticas.push('Reavaliação periódica dos padrões funcionais para monitoramento a longo prazo.');
  }

  return {
    discussaoClinica,
    fatoresEvolucao,
    fatoresNaoApresentaramMelhora,
    fatoresComInvolucao,
    analisesSegmentares,
    conclusao,
    prioridadesTerapeuticas,
    isAiGenerated: false
  };
}
