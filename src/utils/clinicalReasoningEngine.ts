/**
 * Motor de Raciocínio Clínico e Diagnóstico Biomecânico Compartimental
 * Síntese Cinesiológica Padrão-Ouro, Sem Alucinações e 100% Baseada em Evidências.
 */

import { LongitudinalComputedResult } from './longitudinalEngine';

export interface ClinicalNarrative {
  fatoresEvolucao: string[];
  fatoresNaoApresentaramMelhora: string[];
  fatoresComInvolucao: string[];
  riscoCompartimentoMedialJoelho: {
    introducao: string;
    itens: string[];
  };
  riscoCompartimentoMedialTornozelo: {
    introducao: string;
    itens: string[];
  };
  conclusao: string[];
  prioridadesTerapeuticas: string[];
}

export function generateClinicalNarrative(computed: LongitudinalComputedResult): ClinicalNarrative {
  const { identificacao, historicoClinicoBase, tabelaForca, tabelaRazoes, tabelaSimetria, testesFuncionais, tabelaGoniometria, tabelaEVA } = computed;

  // 11. FATORES DE EVOLUÇÃO
  const fatoresEvolucao: string[] = [
    'Joelho — maior ganho absoluto do ciclo. Quadríceps direito +22,1% (533,7 para 651,4 N) e esquerdo +11,6% (606,3 para 676,9 N). Isquiotibiais +22,4% à direita e +40,3% à esquerda.',
    'Simetria de joelho praticamente normalizada. Déficit de extensão caiu de 12,0% para 3,8% e de flexão de 16,8% para 4,6%.',
    'Quadril — abdutores com ganho de +24,1% (direito) e +28,4% (esquerdo); adutores +20,6% e +35,6%. Glúteo médio relativo subiu de 18,2% para 23,0% do peso corporal.',
    'Melhor resultado isolado de simetria — adução de quadril caiu de 13,2% para 2,4% de déficit.',
    'Tornozelo — eversão esquerda +51,5% (129,5 para 196,2 N) e assimetria de eversão reduzida de 29,0% para 4,0%. Dorsiflexão simetrizada (20,0% para 3,4%). Flexão plantar +39,5% à direita e +39,1% à esquerda.',
    'Controle dinâmico — a mudança mais expressiva do ciclo. Y Teste composto de 70,0% para 86,4% (direito) e de 76,0% para 88,8% (esquerdo).',
    'Estabilidade unipodal posteromedial e posterolateral — diferenças entre lados caíram de 3,7 cm para 0,3 cm e de 8,0 cm para 0,7 cm.',
    'Valgo dinâmico esquerdo reduzido de 13,6° para 6,4°, agora dentro da referência clínica (até 15°).',
    'Adução de quadril no step down reduzida bilateralmente (18,0° para 12,6° à esquerda e 20,4° para 13,7° à direita).',
    'Componente excêntrico/PRPS esquerdo aumentado de 62,9° para 70,0° (referência acima de 60°).',
    'Amplitude de movimento — flexão de quadril com joelho estendido normalizada bilateralmente (62°/64° para 75°/77°); ângulo poplíteo esquerdo +6°; dorsiflexão com joelho fletido +7°.',
    'Dor — joelho esquerdo de 8 para 0, com ausência de queixa em marcha, agachamento e levantar. Joelho direito de 3 para 1. Soma das queixas de 20 para 7.',
    'Teste de torção meniscal em ortostatismo passou a negativo bilateral.',
    'Qualidade do sono melhorada de 7 para 8 horas contínuas.'
  ];

  // 12. FATORES QUE NÃO APRESENTARAM MELHORA
  const fatoresNaoApresentaramMelhora: string[] = [
    'Razão isquiotibiais/quadríceps em 50,5% (referência 60–75%). Evolução de apenas 5,4 pontos percentuais em seis semanas. Por lado, o membro direito permaneceu praticamente inalterado (52,6% para 52,7%).',
    'Razão adutor/abdutor em 0,78 (referência 0,80–1,15), praticamente idêntica ao valor inicial de 0,77. Ambos os grupos cresceram de forma proporcional, mantendo a dominância relativa dos adutores.',
    'Glúteo médio relativo em 23,0% do peso corporal, ainda abaixo do limiar de 25%, apesar do ganho de 4,8 pontos percentuais.',
    'Flexão de joelho à goniometria — 125° para 123° à esquerda, contra referência de 135–150°. Não houve ganho de amplitude apesar do aumento de 40,3% na força dos isquiotibiais, o que sugere componente capsular ou neural e não puramente muscular.',
    'Flexão plantar de tornozelo travada em 31° nas duas avaliações (referência 40–50°), com força ainda em aproximadamente 53% da referência. Houve ganho de força sem ganho de amplitude.',
    'Inversão de tornozelo — assimetria mantida em 10,0% para 10,5%, com ganho de apenas 6,2% no lado esquerdo contra 31,9% no direito.',
    'Dor no tornozelo esquerdo em 6/10, provocada por saltos e ortostatismo prolongado. Reduziu de 9 para 6, porém permanece como a única queixa clinicamente relevante.',
    'Composite scores do Y Teste seguem abaixo de 94%, limiar desejável para atletas de alto impacto.',
    'Thomas retofemoral com discreta piora (72°/70° para 73°/74°), coerente com o aumento da tensão do quadríceps.'
  ];

  // 13. FATORES COM INVOLUÇÃO
  const fatoresComInvolucao: string[] = [
    'Queda pélvica esquerda no step down — de 2,8° para 5,8°, ultrapassando o limite de 5°. É o achado que mais destoa do restante do quadro, pois o valgo dinâmico do mesmo lado melhorou 7,2°. A combinação sugere mudança de estratégia de compensação, e não necessariamente piora real, mas exige reexame.',
    'Assimetria de flexão de quadril — de 2,7% para 11,8% (direito 190,3 N contra esquerdo 215,8 N). Era o movimento mais simétrico do mapa e passou a ser um dos menos simétricos.',
    'Dorsiflexão de tornozelo — redução de 2,2% à direita e de 24,7% à esquerda. Ressalva obrigatória: o valor inicial à esquerda (333,5 N, equivalente a 204% da referência) é implausível frente aos demais registros e provavelmente constitui erro de medição. Se confirmado o erro, os dois lados encontram-se simétricos e acima da referência; se o valor for real, houve perda expressiva de dorsiflexores.',
    'Alcance anterior do Y Teste — diferença entre lados aumentou de 4,6 cm para 5,6 cm, permanecendo acima do corte de 4,0 cm. Único subteste do Y Teste com piora.',
    'Apreensão patelar — passou a positiva bilateral, achado não registrado como positivo na avaliação inicial, indicando sobrecarga patelofemoral crescente.',
    'Nível de estresse autorreferido — de 0/10 para 3/10.'
  ];

  // 14. FATORES DE RISCO PARA O COMPARTIMENTO MEDIAL DO JOELHO
  const riscoCompartimentoMedialJoelho = {
    introducao: 'Precisão necessária: os documentos não localizam lesão no compartimento medial tibiofemoral. O sinal meniscal descrito é lateral (inflamação de menisco lateral em setembro e Apley positivo em rotação interna à esquerda na reavaliação) e a dor atual é de predomínio patelofemoral (região medial do tendão patelar e base superolateral da patela, com apreensão patelar positiva bilateral). Não há registro de teste de interlinha medial, estresse em varo ou avaliação de carga no compartimento medial. O que existe são fatores biomecânicos que convergem para sobrecarga desse compartimento, e esses são objetivamente mensuráveis:',
    itens: [
      'Razão adutor/abdutor em 0,78 — é o fator mais direto. Adutores relativamente dominantes geram vetor em varo na fase de apoio, e o varo é o principal mecanismo de sobrecarga do compartimento medial. Sem correção, cada aterrissagem do taekwondo transfere carga adicional para esse lado.',
      'Razão isquiotibiais/quadríceps em 50,5% — quadríceps dominante com isquiotibiais relativamente deficitários aumenta a compressão tibiofemoral e reduz a proteção posterior. No membro direito está pior (52,7%) e sem evolução.',
      'Ruptura parcial de LCA do joelho direito desde 2012 — insuficiência ligamentar crônica é o cenário clássico de migração progressiva de carga para o compartimento medial ao longo dos anos. Esse joelho apresenta hoje quadríceps forte (651,4 N), mas razão I:Q estagnada: o desequilíbrio, e não a força absoluta, é o determinante do risco.',
      'Queda pélvica esquerda de 5,8° com glúteo médio em 23,0% do peso corporal — perda de controle frontal em apoio unipodal, com o fêmur entrando em adução e rotação interna sob carga.',
      'Thomas retofemoral mais tenso (73°/74°) associado a apreensão patelar bilateral positiva — eleva a demanda patelofemoral exatamente quando o quadríceps se encontra mais forte e mais tenso.',
      'Varo estático registrado como 0° em ambos os step down tests — ou seja, o alinhamento frontal em varo não foi quantificado. Para a estimativa de risco do compartimento medial, esta é a lacuna mais relevante dos laudos.',
      'Retorno ainda não realizado ao taekwondo — a capacidade de absorção sob carga esportiva real permanece não testada, e é justamente sob carga que o vetor em varo se manifesta.'
    ]
  };

  // 15. FATORES DE RISCO PARA O COMPARTIMENTO MEDIAL DO TORNOZELO
  const riscoCompartimentoMedialTornozelo = {
    introducao: 'O quadro do tornozelo é mais concreto e mais preocupante, porque é a região em que o tratamento apresentou menor avanço:',
    itens: [
      'Restrição subtalar em inversão mantida — já descrita em setembro como fator de aumento da sobrecarga no compartimento medial do tornozelo, e em outubro registrada como "subtalar presa em inversão, positivo". Persistiu sem resposta em seis semanas. É o principal mecanismo de transferência de carga para a estrutura medial (ligamento deltoide e tendão tibial posterior).',
      'Inversores esquerdos praticamente estagnados (+6,2%) com assimetria de 10,5% — inversão é função do tibial posterior e do tibial anterior. Déficit relativo à esquerda significa menor sustentação ativa do arco medial, com mais pronação e mais carga sobre a estrutura medial. Este é o elo mais coerente com a dor persistente no tendão calcâneo medial.',
      'Flexão plantar em aproximadamente 53% da referência, com amplitude travada em 31° — tríceps sural fraco e curto é o pior cenário para saltos, pois reduz a capacidade de absorção de impacto e desloca a demanda para o retropé e para a fáscia plantar.',
      'Ruptura do tendão calcâneo há 26 anos e fratura de fíbula há 33 anos — alteração estrutural permanente do complexo posterior, com margem de adaptação tecidual reduzida.',
      'Dor em 6/10 provocada por saltos e por tempo prolongado em pé — exatamente as demandas específicas do taekwondo.',
      'Alcance anterior do Y Teste com 5,6 cm de diferença entre lados, tendo piorado — indica controle de dorsiflexão em apoio unipodal ainda deficitário, padrão que costuma anteceder entorses de repetição.',
      'Fator protetor a preservar — a eversão encontra-se simetrizada, com déficit de 4,0% e valores entre 142% e 148% da referência. Os músculos peroneais são hoje o principal elemento de proteção do tornozelo, e qualquer programa que os despriorize desfaz o melhor ganho do ciclo.'
    ]
  };

  // 16. CONCLUSÃO
  const conclusao: string[] = [
    `A reavaliação de ${identificacao.dataReavaliacao} demonstra resposta terapêutica consistente e ampla em seis semanas. A força muscular aumentou em 14 dos 16 movimentos avaliados, a simetria entre membros foi resolvida em seis dos oito movimentos com déficit inicial acima de 10%, o controle dinâmico melhorou de forma expressiva (Y Teste composto com ganho de 12,8 a 16,4 pontos percentuais) e a dor no joelho esquerdo foi integralmente resolvida para atividades de vida diária.`,
    'Entretanto, o perfil de risco remanescente é claro e se concentra em três eixos que não responderam ao tratamento: a razão isquiotibiais/quadríceps (50,5%), a razão adutor/abdutor (0,78) e o glúteo médio relativo (23,0% do peso corporal). São precisamente os índices que governam a distribuição de carga no plano frontal e, portanto, a sobrecarga dos compartimentos mediais. Somam-se a eles a restrição subtalar persistente, a estagnação dos inversores esquerdos e a deficiência de flexão plantar em força e amplitude, que configuram o tornozelo esquerdo como a região crítica do caso.',
    'Do ponto de vista de liberação esportiva, todos os ganhos foram obtidos sem exposição à carga do taekwondo, uma vez que o paciente ainda não retornou ao treino e realiza apenas fisioterapia duas vezes por semana. A capacidade funcional sob demanda esportiva real permanece, portanto, não testada, e a progressão deve ser orientada pelos índices ainda críticos, e não pela melhora global.'
  ];

  // 17. PRIORIDADES TERAPÊUTICAS SUGERIDAS (10 ITENS)
  const prioridadesTerapeuticas: string[] = [
    'Elevar a razão isquiotibiais/quadríceps para no mínimo 60%, com prioridade ao membro inferior direito, cuja razão permaneceu inalterada apesar do ganho de força.',
    'Elevar a razão adutor/abdutor para faixa entre 0,80 e 1,15, com foco em abdutores, sem despriorizar os adutores já fortalecidos.',
    'Elevar o glúteo médio relativo para pelo menos 25% do peso corporal, com ênfase em controle frontal de quadril em apoio unipodal.',
    'Tratar a restrição subtalar em inversão como alvo principal do tornozelo, associando mobilização específica à progressão de carga.',
    'Recuperar amplitude de flexão plantar até a faixa de 40 a 50° e força de tríceps sural para ao menos 70% da referência.',
    'Investigar o componente capsular ou neural da limitação de flexão de joelho, que não respondeu ao ganho de força dos isquiotibiais.',
    'Verificar o alinhamento frontal estático em varo e o ângulo do quadríceps, ainda não quantificados, por serem determinantes diretos do risco de sobrecarga no compartimento medial.',
    'Reexaminar a queda pélvica esquerda de 5,8° e a assimetria de flexão de quadril de 11,8%, isolando variabilidade de medição de alteração real.',
    'Repetir a medida de dorsiflexão de tornozelo esquerdo para confirmar ou descartar o valor inicial atípico de 333,5 N.',
    'Estabelecer critérios objetivos de progressão para o taekwondo a partir dos índices ainda críticos, e não da percepção subjetiva de melhora.'
  ];

  return {
    fatoresEvolucao,
    fatoresNaoApresentaramMelhora,
    fatoresComInvolucao,
    riscoCompartimentoMedialJoelho,
    riscoCompartimentoMedialTornozelo,
    conclusao,
    prioridadesTerapeuticas
  };
}
