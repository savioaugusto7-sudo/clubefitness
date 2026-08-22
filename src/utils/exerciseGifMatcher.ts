export interface GifCatalogItem {
  id: string;
  name: string;
  namePt: string;
  group: string;
  equipment: string;
  gifUrl: string;
  instructionsPt?: string;
  keywords: string[];
}

// Catálogo Curado de GIFs de Exercícios de Alta Qualidade Biomecânica
export const EXERCISE_GIF_CATALOG: GifCatalogItem[] = [
  // PEITO / CHEST
  {
    id: 'bench_press_barbell',
    name: 'Barbell Bench Press',
    namePt: 'Supino Reto com Barra',
    group: 'PEITO',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Bench_Press/0.jpg',
    keywords: ['supino', 'reto', 'barra', 'peito', 'peitoral', 'bench', 'press']
  },
  {
    id: 'incline_bench_press_barbell',
    name: 'Barbell Incline Bench Press',
    namePt: 'Supino Inclinado com Barra',
    group: 'PEITO',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Incline_Bench_Press/0.jpg',
    keywords: ['supino', 'inclinado', 'barra', 'peito', 'superior']
  },
  {
    id: 'decline_bench_press_barbell',
    name: 'Barbell Decline Bench Press',
    namePt: 'Supino Declinado com Barra',
    group: 'PEITO',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Decline_Barbell_Bench_Press/0.jpg',
    keywords: ['supino', 'declinado', 'barra', 'peito', 'inferior']
  },
  {
    id: 'dumbbell_bench_press',
    name: 'Dumbbell Bench Press',
    namePt: 'Supino Reto com Halteres',
    group: 'PEITO',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bench_Press/0.jpg',
    keywords: ['supino', 'reto', 'halter', 'halteres', 'peito']
  },
  {
    id: 'incline_dumbbell_press',
    name: 'Incline Dumbbell Press',
    namePt: 'Supino Inclinado com Halteres',
    group: 'PEITO',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Press/0.jpg',
    keywords: ['supino', 'inclinado', 'halter', 'halteres', 'peito']
  },
  {
    id: 'dumbbell_flyes',
    name: 'Dumbbell Flyes',
    namePt: 'Crucifixo Reto com Halteres',
    group: 'PEITO',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Flyes/0.jpg',
    keywords: ['crucifixo', 'reto', 'halter', 'halteres', 'fly', 'peito']
  },
  {
    id: 'incline_dumbbell_flyes',
    name: 'Incline Dumbbell Flyes',
    namePt: 'Crucifixo Inclinado com Halteres',
    group: 'PEITO',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Incline_Dumbbell_Flyes/0.jpg',
    keywords: ['crucifixo', 'inclinado', 'halter', 'halteres', 'fly']
  },
  {
    id: 'cable_crossover',
    name: 'Cable Crossover',
    namePt: 'Crossover na Polia Alta',
    group: 'PEITO',
    equipment: 'POLIA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Crossover/0.jpg',
    keywords: ['crossover', 'cross', 'polia', 'alta', 'cabo', 'peito']
  },
  {
    id: 'pushups',
    name: 'Pushups',
    namePt: 'Flexão de Braço no Solo',
    group: 'PEITO',
    equipment: 'PESO CORPORAL',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pushups/0.jpg',
    keywords: ['flexao', 'flexão', 'braco', 'solo', 'pushup', 'peito']
  },
  {
    id: 'chest_dips',
    name: 'Chest Dips',
    namePt: 'Paralelas para Peitoral',
    group: 'PEITO',
    equipment: 'PESO CORPORAL',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dips_Chest_Version/0.jpg',
    keywords: ['paralelas', 'mergulho', 'dips', 'peito', 'peitoral']
  },

  // COSTAS / BACK
  {
    id: 'lat_pulldown',
    name: 'Cable Lat Pulldown',
    namePt: 'Puxada Frontal na Polia',
    group: 'COSTAS',
    equipment: 'POLIA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cable_Lat_Pulldown/0.jpg',
    keywords: ['puxada', 'frente', 'pulley', 'lat', 'pulldown', 'polia', 'costas']
  },
  {
    id: 'seated_cable_row',
    name: 'Seated Cable Row',
    namePt: 'Remada Baixa Sentada na Polia',
    group: 'COSTAS',
    equipment: 'POLIA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Cable_Rows/0.jpg',
    keywords: ['remada', 'baixa', 'sentada', 'polia', 'triangulo', 'costas', 'row']
  },
  {
    id: 'barbell_bent_over_row',
    name: 'Barbell Bent Over Row',
    namePt: 'Remada Curvada com Barra',
    group: 'COSTAS',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bent_Over_Barbell_Row/0.jpg',
    keywords: ['remada', 'curvada', 'barra', 'costas', 'dorsal']
  },
  {
    id: 'dumbbell_row_one_arm',
    name: 'One-Arm Dumbbell Row',
    namePt: 'Remada Unilateral com Halter (Serrote)',
    group: 'COSTAS',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/One-Arm_Dumbbell_Row/0.jpg',
    keywords: ['remada', 'unilateral', 'serrote', 'halter', 'costas']
  },
  {
    id: 'pullups',
    name: 'Pullups',
    namePt: 'Barra Fixa Pronada (Pull-Up)',
    group: 'COSTAS',
    equipment: 'PESO CORPORAL',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Pullups/0.jpg',
    keywords: ['barra', 'fixa', 'pullup', 'pronada', 'costas']
  },
  {
    id: 'chin_ups',
    name: 'Chin-Ups',
    namePt: 'Barra Fixa Supinada (Chin-Up)',
    group: 'COSTAS',
    equipment: 'PESO CORPORAL',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Chin-Up/0.jpg',
    keywords: ['barra', 'supinada', 'chinup', 'costas', 'biceps']
  },
  {
    id: 'hyperextensions',
    name: 'Hyperextensions',
    namePt: 'Hiperextensão Lombar (Banco Romano)',
    group: 'COSTAS',
    equipment: 'PESO CORPORAL',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hyperextensions_Back_Extensions/0.jpg',
    keywords: ['hiperextensao', 'lombar', 'banco', 'romano', 'extensao']
  },

  // PERNAS / LEGS & GLUTES
  {
    id: 'barbell_squat',
    name: 'Barbell Full Squat',
    namePt: 'Agachamento Livre com Barra',
    group: 'PERNAS',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Full_Squat/0.jpg',
    keywords: ['agachamento', 'livre', 'barra', 'squat', 'quadriceps', 'pernas']
  },
  {
    id: 'leg_press',
    name: 'Leg Press',
    namePt: 'Leg Press 45°',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Press/0.jpg',
    keywords: ['leg', 'press', '45', 'maquina', 'quadriceps', 'pernas']
  },
  {
    id: 'leg_extensions',
    name: 'Leg Extensions',
    namePt: 'Cadeira Extensora',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Leg_Extensions/0.jpg',
    keywords: ['cadeira', 'extensora', 'extensao', 'pernas', 'quadriceps']
  },
  {
    id: 'leg_curls',
    name: 'Lying Leg Curls',
    namePt: 'Mesa Flexora',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Leg_Curls/0.jpg',
    keywords: ['mesa', 'flexora', 'isquiotibiais', 'posterior', 'coxa', 'pernas']
  },
  {
    id: 'seated_leg_curl',
    name: 'Seated Leg Curl',
    namePt: 'Cadeira Flexora',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Leg_Curl/0.jpg',
    keywords: ['cadeira', 'flexora', 'posterior', 'isquiotibiais', 'pernas']
  },
  {
    id: 'barbell_deadlift',
    name: 'Barbell Deadlift',
    namePt: 'Levantamento Terra com Barra',
    group: 'PERNAS',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Deadlift/0.jpg',
    keywords: ['terra', 'levantamento', 'deadlift', 'barra', 'posterior', 'gluteo']
  },
  {
    id: 'romanian_deadlift',
    name: 'Romanian Deadlift (Stiff)',
    namePt: 'Stiff com Barra (Deadlift Romeno)',
    group: 'PERNAS',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Romanian_Deadlift/0.jpg',
    keywords: ['stiff', 'romeno', 'rdl', 'barra', 'posterior', 'gluteo']
  },
  {
    id: 'dumbbell_lunges',
    name: 'Dumbbell Lunges',
    namePt: 'Afundo / Passada com Halteres',
    group: 'PERNAS',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Lunges/0.jpg',
    keywords: ['afundo', 'passada', 'lunge', 'halter', 'halteres', 'pernas']
  },
  {
    id: 'bulgarian_split_squat',
    name: 'Bulgarian Split Squat',
    namePt: 'Agachamento Búlgaro com Halteres',
    group: 'PERNAS',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Split_Squats/0.jpg',
    keywords: ['bulgaro', 'búlgaro', 'split', 'squat', 'halter', 'gluteo']
  },
  {
    id: 'hip_thrust',
    name: 'Barbell Hip Thrust',
    namePt: 'Elevação Pélvica com Barra (Hip Thrust)',
    group: 'PERNAS',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Hip_Thrust/0.jpg',
    keywords: ['elevacao', 'pelvica', 'hip', 'thrust', 'gluteo', 'barra']
  },
  {
    id: 'standing_calf_raises',
    name: 'Standing Calf Raises',
    namePt: 'Gêmeos em Pé (Panturrilha)',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Calf_Raises/0.jpg',
    keywords: ['panturrilha', 'gemeos', 'gêmeos', 'pe', 'calf', 'pernas']
  },
  {
    id: 'seated_calf_raise',
    name: 'Seated Calf Raise',
    namePt: 'Panturrilha Sentado (Banco Sóleo)',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Seated_Calf_Raise/0.jpg',
    keywords: ['soleo', 'sóleo', 'panturrilha', 'sentado', 'banco']
  },

  // OMBROS / SHOULDERS
  {
    id: 'dumbbell_shoulder_press',
    name: 'Dumbbell Shoulder Press',
    namePt: 'Desenvolvimento com Halteres',
    group: 'OMBROS',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Shoulder_Press/0.jpg',
    keywords: ['desenvolvimento', 'ombro', 'ombros', 'halter', 'press']
  },
  {
    id: 'military_press',
    name: 'Barbell Military Press',
    namePt: 'Desenvolvimento Militar com Barra',
    group: 'OMBROS',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Military_Press/0.jpg',
    keywords: ['desenvolvimento', 'militar', 'barra', 'ombros', 'overhead']
  },
  {
    id: 'side_lateral_raise',
    name: 'Side Lateral Raise',
    namePt: 'Elevação Lateral com Halteres',
    group: 'OMBROS',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Side_Lateral_Raise/0.jpg',
    keywords: ['elevacao', 'lateral', 'halter', 'ombro', 'deltoide']
  },
  {
    id: 'front_dumbbell_raise',
    name: 'Front Dumbbell Raise',
    namePt: 'Elevação Frontal com Halteres',
    group: 'OMBROS',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Dumbbell_Raise/0.jpg',
    keywords: ['elevacao', 'frontal', 'halter', 'ombro']
  },
  {
    id: 'face_pull',
    name: 'Face Pull Cable',
    namePt: 'Face Pull na Polia com Corda',
    group: 'OMBROS',
    equipment: 'POLIA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Face_Pull/0.jpg',
    keywords: ['face', 'pull', 'corda', 'polia', 'ombro', 'trapezio']
  },
  {
    id: 'barbell_shrug',
    name: 'Barbell Shrug',
    namePt: 'Encolhimento de Ombros com Barra',
    group: 'OMBROS',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Shrug/0.jpg',
    keywords: ['encolhimento', 'trapezio', 'trapézio', 'barra', 'shrug']
  },

  // BÍCEPS / BICEPS
  {
    id: 'barbell_curl',
    name: 'Barbell Curl',
    namePt: 'Rosca Direta com Barra',
    group: 'BÍCEPS',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Curl/0.jpg',
    keywords: ['rosca', 'direta', 'barra', 'biceps', 'bíceps']
  },
  {
    id: 'dumbbell_bicep_curl',
    name: 'Dumbbell Bicep Curl',
    namePt: 'Rosca Alternada com Halteres',
    group: 'BÍCEPS',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dumbbell_Bicep_Curl/0.jpg',
    keywords: ['rosca', 'alternada', 'halter', 'biceps']
  },
  {
    id: 'hammer_curls',
    name: 'Hammer Curls',
    namePt: 'Rosca Martelo com Halteres',
    group: 'BÍCEPS',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hammer_Curls/0.jpg',
    keywords: ['rosca', 'martelo', 'hammer', 'halter', 'biceps', 'antebraço']
  },
  {
    id: 'preacher_curl',
    name: 'Preacher Curl (Scott)',
    namePt: 'Rosca Scott com Barra W',
    group: 'BÍCEPS',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Preacher_Curl/0.jpg',
    keywords: ['scott', 'preacher', 'banco', 'rosca', 'barra', 'biceps']
  },
  {
    id: 'concentration_curls',
    name: 'Concentration Curls',
    namePt: 'Rosca Concentrada com Halter',
    group: 'BÍCEPS',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Concentration_Curls/0.jpg',
    keywords: ['rosca', 'concentrada', 'halter', 'biceps']
  },

  // TRÍCEPS / TRICEPS
  {
    id: 'tricep_cable_pushdown',
    name: 'Tricep Cable Pushdown',
    namePt: 'Tríceps Pulley na Polia Alta',
    group: 'TRÍCEPS',
    equipment: 'POLIA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown/0.jpg',
    keywords: ['triceps', 'tríceps', 'pulley', 'polia', 'pushdown', 'barra']
  },
  {
    id: 'tricep_rope_pushdown',
    name: 'Tricep Rope Pushdown',
    namePt: 'Tríceps Corda na Polia Alta',
    group: 'TRÍCEPS',
    equipment: 'POLIA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Triceps_Pushdown_Rope_Attachment/0.jpg',
    keywords: ['triceps', 'corda', 'polia', 'pushdown']
  },
  {
    id: 'skull_crushers',
    name: 'Lying Triceps Extension (Skull Crusher)',
    namePt: 'Tríceps Testa com Barra W',
    group: 'TRÍCEPS',
    equipment: 'BARRA',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Lying_Triceps_Extension/0.jpg',
    keywords: ['testa', 'triceps', 'tríceps', 'barra', 'skull', 'lying']
  },
  {
    id: 'overhead_dumbbell_tricep_extension',
    name: 'Overhead Dumbbell Triceps Extension',
    namePt: 'Tríceps Francês com Halter',
    group: 'TRÍCEPS',
    equipment: 'HALTER',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Dumbbell_Triceps_Extension/0.jpg',
    keywords: ['frances', 'francês', 'overhead', 'halter', 'triceps']
  },
  {
    id: 'bench_dips',
    name: 'Bench Dips',
    namePt: 'Mergulho no Banco (Tríceps Banco)',
    group: 'TRÍCEPS',
    equipment: 'PESO CORPORAL',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Bench_Dips/0.jpg',
    keywords: ['mergulho', 'banco', 'dips', 'triceps']
  },

  // CORE / ABDÔMEN
  {
    id: 'crunches',
    name: 'Abdominal Crunches',
    namePt: 'Abdominal Supra no Solo (Crunch)',
    group: 'CORE',
    equipment: 'PESO CORPORAL',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Crunches/0.jpg',
    keywords: ['abdominal', 'crunch', 'supra', 'solo', 'core']
  },
  {
    id: 'hanging_leg_raise',
    name: 'Hanging Leg Raise',
    namePt: 'Abdominal Infra na Barra Fixa',
    group: 'CORE',
    equipment: 'PESO CORPORAL',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hanging_Leg_Raise/0.jpg',
    keywords: ['infra', 'hanging', 'barra', 'abdominal', 'elevacao', 'pernas']
  },
  {
    id: 'plank',
    name: 'Front Plank',
    namePt: 'Prancha Frontal Isométrica',
    group: 'CORE',
    equipment: 'PESO CORPORAL',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Plank/0.jpg',
    keywords: ['prancha', 'plank', 'isometrica', 'core', 'solo']
  },
  {
    id: 'russian_twist',
    name: 'Russian Twist',
    namePt: 'Abdominal Russo (Russian Twist)',
    group: 'CORE',
    equipment: 'PESO CORPORAL',
    gifUrl: 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Russian_Twist/0.jpg',
    keywords: ['russo', 'twist', 'obliquo', 'oblíquo', 'rotacao']
  }
];

// Algoritmo de Similaridade e Score Biomecânico
export function findBestGifMatch(exercise: { nome: string; grupo?: string; equipamento?: string }) {
  const normName = (exercise.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normGroup = (exercise.grupo || '').toUpperCase();
  const normEquip = (exercise.equipamento || '').toLowerCase();

  let bestMatch: GifCatalogItem | null = null;
  let highestScore = 0;

  for (const item of EXERCISE_GIF_CATALOG) {
    let score = 0;

    // 1. Grupo Muscular Obrigatório (Se grupos forem incompatíveis, penaliza drasticamente)
    if (normGroup && normGroup !== 'OUTROS' && item.group === normGroup) {
      score += 35;
    } else if (normGroup && normGroup !== 'OUTROS' && item.group !== normGroup) {
      // Incompatibilidade de grupo = rejeição
      continue;
    }

    // 2. Palavras-chave do Nome
    const nameTokens = normName.split(/\s+/).filter(t => t.length > 2);
    let matchedTokens = 0;

    for (const token of nameTokens) {
      if (item.keywords.some(k => k.includes(token) || token.includes(k))) {
        matchedTokens++;
      }
    }

    if (nameTokens.length > 0) {
      score += (matchedTokens / nameTokens.length) * 45;
    }

    // 3. Equipamento Compatível
    const itemEquip = item.equipment.toLowerCase();
    if (normEquip.includes('barra') && itemEquip.includes('barra')) score += 20;
    else if (normEquip.includes('halter') && itemEquip.includes('halter')) score += 20;
    else if (normEquip.includes('polia') && itemEquip.includes('polia')) score += 20;
    else if (normEquip.includes('maquina') && itemEquip.includes('maquina')) score += 20;
    else if ((normEquip.includes('solo') || normEquip.includes('corporal')) && itemEquip.includes('corporal')) score += 20;

    if (score > highestScore && score >= 50) {
      highestScore = Math.min(100, Math.round(score));
      bestMatch = item;
    }
  }

  return {
    match: bestMatch,
    confidence: highestScore
  };
}
