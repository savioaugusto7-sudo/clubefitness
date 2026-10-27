/**
 * Catálogo Padronizado de Queixas Fisioterápicas
 * 
 * Estrutura canônica de:
 * 1. Regiões Anatômicas e Sub-regiões Clínicas com Lateralidade
 * 2. Atividades Agravantes baseadas na CIF (Classificação Internacional de Funcionalidade)
 * 3. Fatores de Alívio / Melhora
 * 4. Tipos e Características da Dor
 */

export interface SubRegiaoAnatomica {
  id: string;
  nome: string;
  descricao?: string;
}

export interface RegiaoAnatomica {
  id: string;
  nome: string;
  icone: string;
  lateralidadePermitida: ('Direito' | 'Esquerdo' | 'Bilateral' | 'Central / Axial')[];
  subRegioes: SubRegiaoAnatomica[];
}

export interface CIFAtividadeItem {
  id: string;
  nome: string;
  cifCodigo?: string;
  descricao?: string;
}

export interface CIFCategoriaAtividade {
  id: string;
  categoria: string;
  icone: string;
  atividades: CIFAtividadeItem[];
}

export interface QueixaFisioterapicaItem {
  id?: string;
  // Localização padronizada
  regiao: string;
  subRegiao: string;
  lateralidade: 'Direito' | 'Esquerdo' | 'Bilateral' | 'Central / Axial';

  // Intensidade da dor (EVA 0-10)
  dorIntensidade: number;

  // Atividades agravantes CIF
  atividadesAgravantes: string[];

  // Fatores de melhora / alívio
  fatoresAlivio: string[];

  // Características clínicas
  tempoEvolucao?: string;
  comportamentoDor?: 'Intermitente' | 'Constante / Todo momento';
  dorEvolucao?: 'estavel' | 'aumentando' | 'diminuindo';
  caracteristicaDor?: 'Pontual / Aguda' | 'Queimação' | 'Pontada' | 'Surda / Peso' | 'Latejante' | 'Choque / Irradiada' | 'Outra';

  // Observações livres
  observacoesLivres?: string;

  // Campos sintetizados automaticamente para retrocompatibilidade total:
  dorOnde?: string;
  desencadeiaPiora?: string;
  melhoraDesaparece?: string;
  quandoComecou?: string;
  comoIniciou?: string;
  dorTodoMomento?: 'sim' | 'nao';
  origens?: string[];
}

// 1. CATÁLOGO HIERÁRQUICO DE REGIÕES ANATÔMICAS
export const REGIOES_ANATOMICAS: RegiaoAnatomica[] = [
  {
    id: 'coluna_cervical',
    nome: 'Coluna Cervical',
    icone: 'fa-head-side',
    lateralidadePermitida: ['Central / Axial', 'Direito', 'Esquerdo', 'Bilateral'],
    subRegioes: [
      { id: 'cervical_alta', nome: 'Suboccipital / Cervical Alta (C1–C2)' },
      { id: 'cervical_media_baixa', nome: 'Cervical Média / Baixa (C3–C7)' },
      { id: 'cervicotoracica', nome: 'Transição Cervicotorácica / Trapézio Superior' },
      { id: 'paravertebral_cervical', nome: 'Musculatura Paravertebral Cervical' }
    ]
  },
  {
    id: 'coluna_toracica',
    nome: 'Coluna Torácica',
    icone: 'fa-bone',
    lateralidadePermitida: ['Central / Axial', 'Direito', 'Esquerdo', 'Bilateral'],
    subRegioes: [
      { id: 'toracica_alta', nome: 'Torácica Alta (T1–T4)' },
      { id: 'toracica_media', nome: 'Torácica Média (T5–T8)' },
      { id: 'toracolombar', nome: 'Transição Toracolombar (T9–T12)' },
      { id: 'interescapular', nome: 'Região Interescapular / Romboides' }
    ]
  },
  {
    id: 'coluna_lombar',
    nome: 'Coluna Lombar',
    icone: 'fa-child',
    lateralidadePermitida: ['Central / Axial', 'Direito', 'Esquerdo', 'Bilateral'],
    subRegioes: [
      { id: 'lombar_alta', nome: 'Lombar Alta (L1–L3)' },
      { id: 'lombar_baixa', nome: 'Lombar Baixa (L4–L5)' },
      { id: 'lombossacra', nome: 'Transição Lombossacra (L5–S1)' },
      { id: 'paravertebral_lombar', nome: 'Musculatura Paravertebral Lombar' }
    ]
  },
  {
    id: 'pelve_sacroiliaca',
    nome: 'Pelve / Sacroilíaca',
    icone: 'fa-vector-square',
    lateralidadePermitida: ['Direito', 'Esquerdo', 'Bilateral', 'Central / Axial'],
    subRegioes: [
      { id: 'art_sacroiliaca', nome: 'Articulação Sacroilíaca' },
      { id: 'sacro_coccix', nome: 'Região Sacrococcígea / Cóccix' },
      { id: 'glutea_profunda', nome: 'Região Glútea Profunda / Piriforme' },
      { id: 'sinfise_pubica', nome: 'Sínfise Púbica / Região Inguinal' }
    ]
  },
  {
    id: 'ombro',
    nome: 'Ombro',
    icone: 'fa-hand-holding-hand',
    lateralidadePermitida: ['Direito', 'Esquerdo', 'Bilateral'],
    subRegioes: [
      { id: 'ombro_anterior', nome: 'Anterior / Tendão Bicipital / Coracóide' },
      { id: 'ombro_subacromial', nome: 'Ântero-lateral / Subacromial (Manguito Rotador)' },
      { id: 'ombro_acromioclavicular', nome: 'Superior / Articulação Acromioclavicular' },
      { id: 'ombro_posterior', nome: 'Posterior / Escapuloumeral / Infraespinhal' }
    ]
  },
  {
    id: 'cotovelo',
    nome: 'Cotovelo',
    icone: 'fa-hand-back-fist',
    lateralidadePermitida: ['Direito', 'Esquerdo', 'Bilateral'],
    subRegioes: [
      { id: 'epicondilo_lateral', nome: 'Lateral / Epicôndilo Lateral (Extensores de Punho)' },
      { id: 'epicondilo_medial', nome: 'Medial / Epicôndilo Medial (Flexores de Punho)' },
      { id: 'olecrano_posterior', nome: 'Posterior / Olécrano / Tríceps' },
      { id: 'fossa_cubital', nome: 'Anterior / Fossa Cubital / Bíceps Distal' }
    ]
  },
  {
    id: 'punho_mao',
    nome: 'Punho e Mão',
    icone: 'fa-hand',
    lateralidadePermitida: ['Direito', 'Esquerdo', 'Bilateral'],
    subRegioes: [
      { id: 'punho_radial', nome: 'Radial / 1º Compartimento (De Quervain)' },
      { id: 'punho_volar', nome: 'Volar / Túnel do Carpo (Nervo Mediano)' },
      { id: 'punho_ulnar', nome: 'Ulnar / Complexo Fibrocartilaginoso (CFCT)' },
      { id: 'punho_dorsal', nome: 'Dorsal / Compartimentos Extensores' },
      { id: 'dedos_mao', nome: 'Dedos / Articulações Metacarpofalângicas' }
    ]
  },
  {
    id: 'quadril_coxa',
    nome: 'Quadril e Coxa',
    icone: 'fa-person-walking',
    lateralidadePermitida: ['Direito', 'Esquerdo', 'Bilateral'],
    subRegioes: [
      { id: 'quadril_anterior', nome: 'Anterior / Flexores (Iliopsoas / Reto Femoral)' },
      { id: 'quadril_trocanterica', nome: 'Lateral / Região Trocantérica (Glúteo Médio / TFL)' },
      { id: 'quadril_medial', nome: 'Medial / Adutores de Quadril' },
      { id: 'coxa_posterior', nome: 'Posterior / Isquiotibiais Proximais' },
      { id: 'coxofemoral_profunda', nome: 'Articulação Coxofemoral Profunda (Impacto FAI)' }
    ]
  },
  {
    id: 'joelho',
    nome: 'Joelho',
    icone: 'fa-socks',
    lateralidadePermitida: ['Direito', 'Esquerdo', 'Bilateral'],
    subRegioes: [
      { id: 'patelofemoral', nome: 'Anterior / Patelofemoral (Retropatelar / Tróclea)' },
      { id: 'tendao_patelar', nome: 'Tendão Patelar (Polo Inferior / Tuberosidade da Tíbia)' },
      { id: 'joelho_medial', nome: 'Compartimento Medial (Menisco / Pata de Ganso / LCM)' },
      { id: 'joelho_lateral', nome: 'Compartimento Lateral (Trato Iliotibial / Menisco / LCL)' },
      { id: 'fossa_poplitea', nome: 'Posterior / Fossa Poplítea (Gastrocnêmios / Isquiotibiais)' }
    ]
  },
  {
    id: 'tornozelo_pe',
    nome: 'Tornozelo e Pé',
    icone: 'fa-shoe-prints',
    lateralidadePermitida: ['Direito', 'Esquerdo', 'Bilateral'],
    subRegioes: [
      { id: 'tornozelo_anterior', nome: 'Anterior / Interlinha Articular Tibiotársica' },
      { id: 'maleolo_lateral', nome: 'Lateral (Maléolo Lateral / Ligamento Talofibular)' },
      { id: 'maleolo_medial', nome: 'Medial (Maléolo Medial / Tendão Tibial Posterior)' },
      { id: 'tendao_aquiles', nome: 'Posterior (Tendão de Aquiles / Inserção Calcânea)' },
      { id: 'fascia_plantar', nome: 'Plantar (Fáscia Plantar / Calcanhar)' },
      { id: 'antepe_dedos', nome: 'Antepé (Metatarsos / Dedos / Joanete)' }
    ]
  }
];

// 2. CATÁLOGO CIF DE ATIVIDADES AGRAVANTES (Classificação Internacional de Funcionalidade)
export const CIF_CATEGORIAS_ATIVIDADES: CIFCategoriaAtividade[] = [
  {
    id: 'mobilidade_mudancas',
    categoria: 'Mobilidade & Mudanças de Posição',
    icone: 'fa-arrows-up-down',
    atividades: [
      { id: 'subir_escadas', nome: 'Subir escadas', cifCodigo: 'd4551', descricao: 'Sobrecarga concêntrica e estabilização de joelho/quadril' },
      { id: 'descer_escadas', nome: 'Descer escadas', cifCodigo: 'd4551', descricao: 'Carga excêntrica e alto cisalhamento patelofemoral' },
      { id: 'agachar', nome: 'Agachar (Squatting)', cifCodigo: 'd4101', descricao: 'Flexão profunda de joelhos e quadril' },
      { id: 'ajoelhar', nome: 'Ajoelhar-se / Apoio nos joelhos', cifCodigo: 'd4102', descricao: 'Compressão patelar direta' },
      { id: 'sentar_levantar', nome: 'Levantar da cadeira / Sentar', cifCodigo: 'd4100', descricao: 'Transição da posição sentada para ortostase' },
      { id: 'sentado_prolongado', nome: 'Permanecer sentado prolongado (>30 min)', cifCodigo: 'd4153', descricao: 'Flexão sustentada de quadril/coluna' },
      { id: 'pe_prolongado', nome: 'Permanecer em pé prolongado', cifCodigo: 'd4154', descricao: 'Carga axial estática em coluna e membros inferiores' },
      { id: 'rolar_cama', nome: 'Mudar de posição na cama / Rolar', cifCodigo: 'd4106', descricao: 'Torção de pelve e coluna durante o repouso' }
    ]
  },
  {
    id: 'movimentos_posturas',
    categoria: 'Movimentos do Tronco & Extremidades',
    icone: 'fa-person-booth',
    atividades: [
      { id: 'flexao_tronco', nome: 'Inclinar tronco à frente (Flexão)', cifCodigo: 'd4105', descricao: 'Sobrecarga em disco lombar e cadeia posterior' },
      { id: 'extensao_tronco', nome: 'Inclinar tronco para trás (Extensão)', cifCodigo: 'd4105', descricao: 'Compressão facetária lombar' },
      { id: 'rotacao_tronco', nome: 'Rotacionar o tronco (Torção)', cifCodigo: 'd4105', descricao: 'Cisalhamento axial de coluna e pelve' },
      { id: 'braco_overhead', nome: 'Elevar braço acima da cabeça (Overhead)', cifCodigo: 'd4452', descricao: 'Pinçamento / impacto subacromial de ombro' },
      { id: 'alcance_costas', nome: 'Alcançar atrás das costas', cifCodigo: 'd4452', descricao: 'Rotação interna máxima de ombro' }
    ]
  },
  {
    id: 'locomocao_impacto',
    categoria: 'Locomoção, Marcha & Impacto',
    icone: 'fa-running',
    atividades: [
      { id: 'caminhada_plano', nome: 'Caminhada em terreno plano', cifCodigo: 'd4500', descricao: 'Passadas repetidas' },
      { id: 'caminhada_aclive', nome: 'Caminhada em subida / aclive', cifCodigo: 'd4502', descricao: 'Maior exigência de tríceps sural e flexão dorsal' },
      { id: 'caminhada_prolongada', nome: 'Caminhada prolongada (>20 min)', cifCodigo: 'd4501', descricao: 'Fadiga muscular postural' },
      { id: 'corrida_trote', nome: 'Corrida contínua / Trote', cifCodigo: 'd4552', descricao: 'Impacto cíclico (2 a 3x o peso corporal)' },
      { id: 'saltos_impacto', nome: 'Saltos / Pliometria / Impacto', cifCodigo: 'd4553', descricao: 'Absorção rápida de energia elástica' },
      { id: 'mudanca_direcao', nome: 'Mudança brusca de direção (Giro)', cifCodigo: 'd4559', descricao: 'Carga torcional articular' }
    ]
  },
  {
    id: 'trabalho_cargas',
    categoria: 'Trabalho, Cargas & Posturas Laborais',
    icone: 'fa-briefcase',
    atividades: [
      { id: 'levantar_peso_chao', nome: 'Carregar ou levantar peso do chão', cifCodigo: 'd4300', descricao: 'Alavanca máxima em coluna e joelhos' },
      { id: 'carregar_peso_bracos', nome: 'Carregar peso com as mãos / braços', cifCodigo: 'd4305', descricao: 'Sobrecarga de punho, cotovelo e ombro' },
      { id: 'computador_digitacao', nome: 'Uso de computador / digitação prolongada', cifCodigo: 'd850', descricao: 'Postura cervical anteriorizada e esforço repetitivo' },
      { id: 'uso_smartphone', nome: 'Uso prolongado de celular / tablet', cifCodigo: 'd850', descricao: 'Flexão cervical excessiva (text neck)' },
      { id: 'dirigir_veiculos', nome: 'Dirigir veículos por tempo prolongado', cifCodigo: 'd4751', descricao: 'Vibração e postura sentada contínua' }
    ]
  },
  {
    id: 'avd_autocuidado',
    categoria: 'Autocuidado & Atividades Domésticas',
    icone: 'fa-house-user',
    atividades: [
      { id: 'calcar_sapatos', nome: 'Calçar sapatos / meias / vestir calça', cifCodigo: 'd5400', descricao: 'Flexão de quadril e alcance distal' },
      { id: 'higiene_banho', nome: 'Higiene pessoal / lavar as costas / cabelo', cifCodigo: 'd510', descricao: 'Mobilidade de membros superiores' },
      { id: 'tarefas_domesticas', nome: 'Tarefas domésticas (varrer, aspirar, limpar)', cifCodigo: 'd640', descricao: 'Posturas mantidas e movimentos repetitivos' }
    ]
  },
  {
    id: 'repouso_temporal',
    categoria: 'Repouso & Fatores Temporais',
    icone: 'fa-bed',
    atividades: [
      { id: 'repouso_absoluto', nome: 'Em repouso absoluto / Sem movimento', cifCodigo: 'b2801', descricao: 'Dor inflamatória / neuropática constante' },
      { id: 'dor_noturna', nome: 'Dor noturna (interrompe o sono)', cifCodigo: 'b1343', descricao: 'Sinal de alerta para inflamação ativa' },
      { id: 'rigidez_matinal', nome: 'Rigidez / Dor ao acordar (primeiros passos)', cifCodigo: 'b780', descricao: 'Comum em tendinopatias e fasciopatias' },
      { id: 'fim_do_dia', nome: 'Ao final do dia / após fadiga acumulada', cifCodigo: 'b455', descricao: 'Dor mecânica associada à sobrecarga diária' }
    ]
  }
];

// 3. FATORES DE ALÍVIO / MELHORA COMUNS
export const FATORES_ALIVIO_SUGESTOES: string[] = [
  'Repouso absoluto',
  'Aplicação de Gelo (Crioterapia)',
  'Aplicação de Calor / Bolsa Térmica',
  'Alongamento suave',
  'Mudança de posição / Levantar',
  'Massagem / Liberação miofascial',
  'Uso de analgésico / anti-inflamatório',
  'Aquecimento prévio / início do movimento'
];

// 4. TIPOS E CARACTERÍSTICAS DA DOR
export const TIPOS_CARACTERISTICA_DOR = [
  'Pontual / Aguda',
  'Queimação',
  'Pontada',
  'Surda / Peso',
  'Latejante',
  'Choque / Irradiada',
  'Cansaço / Fadiga muscular',
  'Outra'
] as const;

// 5. HELPER: SINTETIZAR CAMPOS LEGADOS A PARTIR DA ESTRUTURA CANÔNICA
export function synthesizeLegacyFields(q: Partial<QueixaFisioterapicaItem>): {
  dorOnde: string;
  desencadeiaPiora: string;
  melhoraDesaparece: string;
} {
  // dorOnde: "Joelho Direito (Compartimento Medial)" ou "Região Livre Direito (Estrutura Livre)"
  const regiaoVal = (q.regiao && q.regiao !== '__OUTRA__') ? q.regiao.trim() : '';
  const subRegiaoVal = (q.subRegiao && q.subRegiao !== '__OUTRA_SUB__') ? q.subRegiao.trim() : '';

  const parts: string[] = [];
  if (regiaoVal) parts.push(regiaoVal);
  if (q.lateralidade && q.lateralidade !== 'Central / Axial') {
    parts.push(q.lateralidade);
  }
  let onde = parts.join(' ');
  if (subRegiaoVal) {
    onde = onde ? `${onde} (${subRegiaoVal})` : subRegiaoVal;
  }
  if (!onde) onde = q.dorOnde || 'Região não informada';

  // desencadeiaPiora: junta as atividades agravantes selecionadas
  let piora = (q.atividadesAgravantes && q.atividadesAgravantes.length > 0)
    ? q.atividadesAgravantes.join(', ')
    : (q.desencadeiaPiora || '');

  // melhoraDesaparece: junta os fatores de alívio selecionados
  let melhora = (q.fatoresAlivio && q.fatoresAlivio.length > 0)
    ? q.fatoresAlivio.join(', ')
    : (q.melhoraDesaparece || '');

  return {
    dorOnde: onde,
    desencadeiaPiora: piora,
    melhoraDesaparece: melhora
  };
}

// 6. HELPER: RETORNA COR DA ESCALA EVA
export function getEvaColor(eva: number): string {
  if (eva === 0) return '#10b981'; // verde
  if (eva <= 3) return '#34d399';  // verde claro / leve
  if (eva <= 6) return '#f59e0b';  // amarelo / moderada
  if (eva <= 8) return '#f97316';  // laranja / intensa
  return '#ef4444';                // vermelho / severa
}

// 7. HELPER: CLASSIFICAÇÃO TEXTUAL DO EVA
export function getEvaLabel(eva: number): string {
  if (eva === 0) return 'Sem Dor (0/10)';
  if (eva <= 3) return `Dor Leve (${eva}/10)`;
  if (eva <= 6) return `Dor Moderada (${eva}/10)`;
  if (eva <= 8) return `Dor Intensa (${eva}/10)`;
  return `Dor Severa / Incapacitante (${eva}/10)`;
}
