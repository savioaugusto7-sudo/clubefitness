export interface GifCatalogItem {
  id: string;
  name: string;
  namePt: string;
  group: 'PEITO' | 'COSTAS' | 'PERNAS' | 'OMBROS' | 'BÍCEPS' | 'TRÍCEPS' | 'CORE' | 'MOBILIDADE';
  equipment: 'BARRA' | 'HALTER' | 'POLIA' | 'MÁQUINA' | 'PESO CORPORAL' | 'ELÁSTICO';
  angle?: 'INCLINADO' | 'DECLINADO' | 'RETO' | 'UNILATERAL' | 'GERAL';
  gifUrl: string;
  synonyms: string[];
  keywords: string[];
}

// Catálogo Oficial de Animações 3D Anatômicas em Loop com Músculos Destacados
export const EXERCISE_GIF_CATALOG: GifCatalogItem[] = [
  // ==========================================
  // PEITO / CHEST (Animações 3D)
  // ==========================================
  {
    id: 'supino_reto_barra',
    name: 'Barbell Bench Press',
    namePt: 'Supino Reto com Barra',
    group: 'PEITO',
    equipment: 'BARRA',
    angle: 'RETO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Bench-Press.gif',
    synonyms: ['supino reto', 'supino reto barra', 'bench press', 'flat bench press', 'supino plano'],
    keywords: ['supino', 'reto', 'barra', 'peitoral', 'peito', 'bench', 'press']
  },
  {
    id: 'supino_inclinado_barra',
    name: 'Barbell Incline Bench Press',
    namePt: 'Supino Inclinado com Barra',
    group: 'PEITO',
    equipment: 'BARRA',
    angle: 'INCLINADO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Barbell-Bench-Press.gif',
    synonyms: ['supino inclinado barra', 'supino 30', 'supino 45', 'incline barbell press'],
    keywords: ['supino', 'inclinado', 'barra', 'peito', 'superior', 'incline']
  },
  {
    id: 'supino_declinado_barra',
    name: 'Barbell Decline Bench Press',
    namePt: 'Supino Declinado com Barra',
    group: 'PEITO',
    equipment: 'BARRA',
    angle: 'DECLINADO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Decline-Barbell-Bench-Press.gif',
    synonyms: ['supino declinado barra', 'decline barbell press', 'supino canadense'],
    keywords: ['supino', 'declinado', 'barra', 'peito', 'inferior', 'decline']
  },
  {
    id: 'supino_reto_halter',
    name: 'Dumbbell Bench Press',
    namePt: 'Supino Reto com Halteres',
    group: 'PEITO',
    equipment: 'HALTER',
    angle: 'RETO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Press.gif',
    synonyms: ['supino reto halter', 'supino com halteres', 'dumbbell bench press', 'supino reto halteres'],
    keywords: ['supino', 'reto', 'halter', 'halteres', 'dumbbell', 'press', 'peito']
  },
  {
    id: 'supino_inclinado_halter',
    name: 'Incline Dumbbell Press',
    namePt: 'Supino Inclinado com Halteres',
    group: 'PEITO',
    equipment: 'HALTER',
    angle: 'INCLINADO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Press.gif',
    synonyms: ['supino inclinado halter', 'supino 30 halter', 'supino 45 halter', 'incline dumbbell press'],
    keywords: ['supino', 'inclinado', 'halter', 'halteres', 'superior', 'peito']
  },
  {
    id: 'crucifixo_reto_halter',
    name: 'Dumbbell Flyes',
    namePt: 'Crucifixo Reto com Halteres',
    group: 'PEITO',
    equipment: 'HALTER',
    angle: 'RETO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Fly.gif',
    synonyms: ['crucifixo reto', 'crucifixo halter', 'dumbbell fly', 'fly reto', 'abertura peitoral'],
    keywords: ['crucifixo', 'fly', 'flyes', 'reto', 'halter', 'halteres', 'peitoral']
  },
  {
    id: 'crucifixo_inclinado_halter',
    name: 'Incline Dumbbell Flyes',
    namePt: 'Crucifixo Inclinado com Halteres',
    group: 'PEITO',
    equipment: 'HALTER',
    angle: 'INCLINADO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Incline-Dumbbell-Fly.gif',
    synonyms: ['crucifixo inclinado', 'incline dumbbell fly', 'fly inclinado'],
    keywords: ['crucifixo', 'inclinado', 'fly', 'halter', 'halteres', 'peito']
  },
  {
    id: 'crossover_polia_alta',
    name: 'Cable Crossover',
    namePt: 'Crossover na Polia Alta',
    group: 'PEITO',
    equipment: 'POLIA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Cable-Crossover.gif',
    synonyms: ['crossover', 'cross over', 'polia alta peito', 'cable fly', 'cross polia'],
    keywords: ['crossover', 'cross', 'polia', 'alta', 'cabo', 'peito', 'peitoral']
  },
  {
    id: 'flexao_solo',
    name: 'Push-Up',
    namePt: 'Flexão de Braço no Solo',
    group: 'PEITO',
    equipment: 'PESO CORPORAL',
    angle: 'RETO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Push-Up.gif',
    synonyms: ['flexao de braco', 'flexao no solo', 'push up', 'flexoes', 'marinheiro'],
    keywords: ['flexao', 'flexão', 'braco', 'braço', 'solo', 'pushup', 'push-up']
  },
  {
    id: 'paralelas_peito',
    name: 'Chest Dips',
    namePt: 'Paralelas para Peitoral (Dips)',
    group: 'PEITO',
    equipment: 'PESO CORPORAL',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Chest-Dip.gif',
    synonyms: ['paralelas peito', 'mergulho paralelas', 'dips', 'chest dips'],
    keywords: ['paralelas', 'mergulho', 'dips', 'peitoral', 'peito']
  },

  // ==========================================
  // COSTAS / BACK (Animações 3D)
  // ==========================================
  {
    id: 'puxada_frente_pulley',
    name: 'Lat Pulldown',
    namePt: 'Puxada Frontal no Pulley',
    group: 'COSTAS',
    equipment: 'POLIA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lat-Pulldown.gif',
    synonyms: ['puxada frente', 'puxada frontal', 'lat pulldown', 'puxada aberta', 'pulley costas'],
    keywords: ['puxada', 'frontal', 'frente', 'pulley', 'lat', 'pulldown', 'costas', 'dorsal']
  },
  {
    id: 'remada_baixa_sentada',
    name: 'Seated Cable Row',
    namePt: 'Remada Baixa Sentada na Polia',
    group: 'COSTAS',
    equipment: 'POLIA',
    angle: 'RETO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Cable-Row.gif',
    synonyms: ['remada baixa', 'remada sentada polia', 'seated row', 'remada triangulo'],
    keywords: ['remada', 'baixa', 'sentada', 'polia', 'triangulo', 'cabo', 'costas']
  },
  {
    id: 'remada_curvada_barra',
    name: 'Barbell Bent Over Row',
    namePt: 'Remada Curvada com Barra',
    group: 'COSTAS',
    equipment: 'BARRA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Bent-Over-Barbell-Row.gif',
    synonyms: ['remada curvada', 'remada curvada barra', 'barbell row', 'bent over row'],
    keywords: ['remada', 'curvada', 'barra', 'costas', 'dorsal', 'row']
  },
  {
    id: 'remada_unilateral_serrote',
    name: 'One-Arm Dumbbell Row (Saw)',
    namePt: 'Remada Unilateral com Halter (Serrote)',
    group: 'COSTAS',
    equipment: 'HALTER',
    angle: 'UNILATERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Row.gif',
    synonyms: ['serrote', 'remada unilateral', 'remada serrote', 'one arm row', 'remada halter'],
    keywords: ['remada', 'unilateral', 'serrote', 'halter', 'halteres', 'costas']
  },
  {
    id: 'barra_fixa_pronada',
    name: 'Pull-Up',
    namePt: 'Barra Fixa Pronada (Pull-Up)',
    group: 'COSTAS',
    equipment: 'PESO CORPORAL',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pull-up.gif',
    synonyms: ['barra fixa', 'pull up', 'pullup', 'barra pronada', 'costas barra'],
    keywords: ['barra', 'fixa', 'pullup', 'pull-up', 'pronada', 'costas']
  },
  {
    id: 'barra_fixa_supinada',
    name: 'Chin-Up',
    namePt: 'Barra Fixa Supinada (Chin-Up)',
    group: 'COSTAS',
    equipment: 'PESO CORPORAL',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Chin-Up.gif',
    synonyms: ['chin up', 'chinup', 'barra supinada', 'barra fixa supinada'],
    keywords: ['barra', 'supinada', 'chinup', 'chin-up', 'costas', 'biceps']
  },
  {
    id: 'pullover_halter',
    name: 'Dumbbell Pullover',
    namePt: 'Pullover com Halter',
    group: 'COSTAS',
    equipment: 'HALTER',
    angle: 'RETO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Pullover.gif',
    synonyms: ['pullover', 'pull over', 'pullover halter'],
    keywords: ['pullover', 'pull', 'over', 'halter', 'costas', 'dorsal']
  },

  // ==========================================
  // PERNAS E GLÚTEOS / LEGS & GLUTES (Animações 3D)
  // ==========================================
  {
    id: 'agachamento_livre_barra',
    name: 'Barbell Full Squat',
    namePt: 'Agachamento Livre com Barra',
    group: 'PERNAS',
    equipment: 'BARRA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/BARBELL-SQUAT.gif',
    synonyms: ['agachamento livre', 'agachamento barra', 'squat', 'agachamento costas', 'barbell squat'],
    keywords: ['agachamento', 'livre', 'barra', 'squat', 'quadriceps', 'pernas', 'gluteo']
  },
  {
    id: 'leg_press_45',
    name: 'Leg Press 45°',
    namePt: 'Leg Press 45°',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Leg-Press.gif',
    synonyms: ['leg 45', 'leg press 45', 'legpress', 'prensa inclinada'],
    keywords: ['leg', 'press', '45', 'maquina', 'máquina', 'quadriceps', 'pernas']
  },
  {
    id: 'cadeira_extensora',
    name: 'Leg Extensions',
    namePt: 'Cadeira Extensora',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/LEG-EXTENSION.gif',
    synonyms: ['cadeira extensora', 'extensora', 'extensao de pernas', 'leg extension'],
    keywords: ['cadeira', 'extensora', 'extensao', 'quadriceps', 'pernas', 'maquina']
  },
  {
    id: 'mesa_flexora',
    name: 'Lying Leg Curls',
    namePt: 'Mesa Flexora',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Leg-Curl.gif',
    synonyms: ['mesa flexora', 'flexora deitada', 'lying leg curl', 'flexora posterior'],
    keywords: ['mesa', 'flexora', 'isquiotibiais', 'posterior', 'coxa', 'pernas']
  },
  {
    id: 'cadeira_flexora',
    name: 'Seated Leg Curl',
    namePt: 'Cadeira Flexora Sentada',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Seated-Leg-Curl.gif',
    synonyms: ['cadeira flexora', 'flexora sentada', 'seated leg curl'],
    keywords: ['cadeira', 'flexora', 'sentada', 'posterior', 'isquiotibiais', 'pernas']
  },
  {
    id: 'stiff_barra',
    name: 'Barbell Romanian Deadlift (Stiff)',
    namePt: 'Stiff com Barra (Deadlift Romeno)',
    group: 'PERNAS',
    equipment: 'BARRA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Romanian-Deadlift.gif',
    synonyms: ['stiff', 'stiff barra', 'deadlift romeno', 'rdl', 'stiff com barra'],
    keywords: ['stiff', 'romeno', 'rdl', 'deadlift', 'barra', 'posterior', 'gluteo']
  },
  {
    id: 'levantamento_terra_barra',
    name: 'Barbell Deadlift',
    namePt: 'Levantamento Terra com Barra',
    group: 'PERNAS',
    equipment: 'BARRA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Deadlift.gif',
    synonyms: ['levantamento terra', 'terra barra', 'deadlift', 'terra convencional'],
    keywords: ['levantamento', 'terra', 'deadlift', 'barra', 'posterior', 'gluteo']
  },
  {
    id: 'afundo_halteres',
    name: 'Dumbbell Lunges',
    namePt: 'Afundo / Passada com Halteres',
    group: 'PERNAS',
    equipment: 'HALTER',
    angle: 'UNILATERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lunge.gif',
    synonyms: ['afundo', 'passada', 'lunge', 'afundo halter', 'passada halteres'],
    keywords: ['afundo', 'passada', 'lunge', 'halter', 'halteres', 'unilateral', 'gluteo']
  },
  {
    id: 'agachamento_bulgaro',
    name: 'Bulgarian Split Squat',
    namePt: 'Agachamento Búlgaro com Halteres',
    group: 'PERNAS',
    equipment: 'HALTER',
    angle: 'UNILATERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/05/Bulgarian-Split-Squat.gif',
    synonyms: ['bulgaro', 'búlgaro', 'agachamento bulgaro', 'split squat', 'bulgarian squat'],
    keywords: ['bulgaro', 'búlgaro', 'agachamento', 'split', 'squat', 'halter', 'gluteo']
  },
  {
    id: 'elevacao_pelvica_hip_thrust',
    name: 'Barbell Hip Thrust',
    namePt: 'Elevação Pélvica com Barra (Hip Thrust)',
    group: 'PERNAS',
    equipment: 'BARRA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Hip-Thrust.gif',
    synonyms: ['elevacao pelvica', 'hip thrust', 'elevacao de quadril', 'ponte barra'],
    keywords: ['elevacao', 'elevação', 'pelvica', 'pélvica', 'hip', 'thrust', 'gluteo', 'barra']
  },
  {
    id: 'panturrilha_em_pe',
    name: 'Standing Calf Raise',
    namePt: 'Gêmeos em Pé (Panturrilha Máquina)',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Standing-Calf-Raise.gif',
    synonyms: ['gemeos em pe', 'panturrilha em pe', 'standing calf', 'panturrilha maquina'],
    keywords: ['panturrilha', 'gemeos', 'gêmeos', 'pe', 'pé', 'calf', 'pernas']
  },
  {
    id: 'panturrilha_sentado_soleo',
    name: 'Seated Calf Raise (Soleus)',
    namePt: 'Panturrilha Sentado (Banco Sóleo)',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Calf-Raise.gif',
    synonyms: ['banco soleo', 'soleo', 'panturrilha sentada', 'seated calf'],
    keywords: ['soleo', 'sóleo', 'banco', 'panturrilha', 'sentado', 'maquina']
  },
  {
    id: 'cadeira_abdutora',
    name: 'Seated Hip Abduction',
    namePt: 'Cadeira Abdutora',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Hip-Abduction.gif',
    synonyms: ['cadeira abdutora', 'abdutora', 'abducao de quadril', 'hip abduction'],
    keywords: ['abdutora', 'abducao', 'abdução', 'quadril', 'gluteo', 'maquina']
  },
  {
    id: 'cadeira_adutora',
    name: 'Seated Hip Adduction',
    namePt: 'Cadeira Adutora',
    group: 'PERNAS',
    equipment: 'MÁQUINA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/06/Seated-Hip-Adduction.gif',
    synonyms: ['cadeira adutora', 'adutora', 'aducao de quadril', 'hip adduction'],
    keywords: ['adutora', 'aducao', 'adução', 'quadril', 'pernas', 'maquina']
  },

  // ==========================================
  // OMBROS / SHOULDERS (Animações 3D)
  // ==========================================
  {
    id: 'desenvolvimento_halteres',
    name: 'Dumbbell Shoulder Press',
    namePt: 'Desenvolvimento com Halteres',
    group: 'OMBROS',
    equipment: 'HALTER',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Shoulder-Press.gif',
    synonyms: ['desenvolvimento halter', 'desenvolvimento com halteres', 'shoulder press', 'overhead press halter'],
    keywords: ['desenvolvimento', 'ombro', 'ombros', 'halter', 'halteres', 'press', 'deltoide']
  },
  {
    id: 'desenvolvimento_militar_barra',
    name: 'Barbell Military Press',
    namePt: 'Desenvolvimento Militar com Barra',
    group: 'OMBROS',
    equipment: 'BARRA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Military-Press.gif',
    synonyms: ['desenvolvimento militar', 'militar barra', 'overhead press barra', 'desenvolvimento barra'],
    keywords: ['desenvolvimento', 'militar', 'barra', 'ombros', 'deltoide', 'overhead']
  },
  {
    id: 'elevacao_lateral_halteres',
    name: 'Side Lateral Raise',
    namePt: 'Elevação Lateral com Halteres',
    group: 'OMBROS',
    equipment: 'HALTER',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Lateral-Raise.gif',
    synonyms: ['elevacao lateral', 'abducao de ombros halter', 'lateral raise', 'abducao lateral'],
    keywords: ['elevacao', 'elevação', 'lateral', 'halter', 'halteres', 'ombro', 'deltoide']
  },
  {
    id: 'elevacao_frontal_halteres',
    name: 'Front Dumbbell Raise',
    namePt: 'Elevação Frontal com Halteres',
    group: 'OMBROS',
    equipment: 'HALTER',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Front-Raise.gif',
    synonyms: ['elevacao frontal', 'front raise', 'flexao de ombros halter'],
    keywords: ['elevacao', 'elevação', 'frontal', 'halter', 'halteres', 'ombro']
  },
  {
    id: 'crucifixo_inverso_halter',
    name: 'Rear Delt Fly (Reverse Fly)',
    namePt: 'Crucifixo Inverso com Halteres',
    group: 'OMBROS',
    equipment: 'HALTER',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Rear-Delt-Fly.gif',
    synonyms: ['crucifixo inverso', 'deltoide posterior', 'rear delt fly', 'voador invertido'],
    keywords: ['crucifixo', 'inverso', 'posterior', 'ombro', 'halter', 'deltoide']
  },
  {
    id: 'face_pull_polia',
    name: 'Face Pull Cable',
    namePt: 'Face Pull na Polia com Corda',
    group: 'OMBROS',
    equipment: 'POLIA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Face-Pull.gif',
    synonyms: ['face pull', 'facepull', 'puxada facial', 'polia corda ombro'],
    keywords: ['face', 'pull', 'corda', 'polia', 'ombro', 'trapezio', 'rotadores']
  },
  {
    id: 'encolhimento_barra_trapezio',
    name: 'Barbell Shrug',
    namePt: 'Encolhimento de Ombros com Barra (Trapézio)',
    group: 'OMBROS',
    equipment: 'BARRA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Shrug.gif',
    synonyms: ['encolhimento', 'shrug', 'encolhimento barra', 'trapezio barra'],
    keywords: ['encolhimento', 'trapezio', 'trapézio', 'barra', 'shrug']
  },

  // ==========================================
  // BÍCEPS / BICEPS (Animações 3D)
  // ==========================================
  {
    id: 'rosca_direta_barra',
    name: 'Barbell Bicep Curl',
    namePt: 'Rosca Direta com Barra',
    group: 'BÍCEPS',
    equipment: 'BARRA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Barbell-Curl.gif',
    synonyms: ['rosca direta', 'rosca direta barra', 'bicep curl', 'rosca barra reta', 'rosca barra w'],
    keywords: ['rosca', 'direta', 'barra', 'biceps', 'bíceps', 'curl']
  },
  {
    id: 'rosca_alternada_halteres',
    name: 'Dumbbell Bicep Curl',
    namePt: 'Rosca Alternada com Halteres',
    group: 'BÍCEPS',
    equipment: 'HALTER',
    angle: 'UNILATERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Dumbbell-Curl.gif',
    synonyms: ['rosca alternada', 'rosca simultanea halter', 'rosca halter', 'dumbbell curl'],
    keywords: ['rosca', 'alternada', 'halter', 'halteres', 'biceps', 'curl']
  },
  {
    id: 'rosca_martelo_halteres',
    name: 'Hammer Curls',
    namePt: 'Rosca Martelo com Halteres',
    group: 'BÍCEPS',
    equipment: 'HALTER',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hammer-Curl.gif',
    synonyms: ['rosca martelo', 'martelo halter', 'hammer curl', 'martelo alternado'],
    keywords: ['rosca', 'martelo', 'hammer', 'halter', 'halteres', 'biceps', 'antebraço']
  },
  {
    id: 'rosca_scott_barra_w',
    name: 'Preacher Curl (Scott)',
    namePt: 'Rosca Scott com Barra W',
    group: 'BÍCEPS',
    equipment: 'BARRA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Z-Bar-Preacher-Curl.gif',
    synonyms: ['rosca scott', 'banco scott', 'preacher curl', 'scott barra w'],
    keywords: ['scott', 'preacher', 'banco', 'rosca', 'barra', 'biceps']
  },
  {
    id: 'rosca_concentrada_halter',
    name: 'Concentration Curl',
    namePt: 'Rosca Concentrada com Halter',
    group: 'BÍCEPS',
    equipment: 'HALTER',
    angle: 'UNILATERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Concentration-Curl.gif',
    synonyms: ['rosca concentrada', 'concentrada halter', 'concentration curl'],
    keywords: ['rosca', 'concentrada', 'halter', 'biceps', 'unilateral']
  },

  // ==========================================
  // TRÍCEPS / TRICEPS (Animações 3D)
  // ==========================================
  {
    id: 'triceps_pulley_barra',
    name: 'Tricep Cable Pushdown',
    namePt: 'Tríceps Pulley na Polia Alta',
    group: 'TRÍCEPS',
    equipment: 'POLIA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Pushdown.gif',
    synonyms: ['triceps pulley', 'triceps polia', 'triceps pushdown', 'triceps barra reta polia'],
    keywords: ['triceps', 'tríceps', 'pulley', 'polia', 'pushdown', 'barra', 'cabo']
  },
  {
    id: 'triceps_corda_polia',
    name: 'Tricep Rope Pushdown',
    namePt: 'Tríceps Corda na Polia Alta',
    group: 'TRÍCEPS',
    equipment: 'POLIA',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Rope-Pushdown.gif',
    synonyms: ['triceps corda', 'corda polia', 'rope pushdown', 'triceps corda pulley'],
    keywords: ['triceps', 'tríceps', 'corda', 'polia', 'pushdown']
  },
  {
    id: 'triceps_testa_barra_w',
    name: 'Lying Triceps Extension (Skull Crusher)',
    namePt: 'Tríceps Testa com Barra W',
    group: 'TRÍCEPS',
    equipment: 'BARRA',
    angle: 'RETO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Lying-Triceps-Extension.gif',
    synonyms: ['triceps testa', 'testa barra', 'skull crusher', 'extensao de triceps deitado'],
    keywords: ['testa', 'triceps', 'tríceps', 'barra', 'skull', 'crusher', 'lying']
  },
  {
    id: 'triceps_frances_halter',
    name: 'Overhead Dumbbell Triceps Extension',
    namePt: 'Tríceps Francês com Halter',
    group: 'TRÍCEPS',
    equipment: 'HALTER',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Seated-Dumbbell-Triceps-Extension.gif',
    synonyms: ['triceps frances', 'frances halter', 'overhead triceps', 'triceps sentado halter'],
    keywords: ['frances', 'francês', 'overhead', 'halter', 'triceps', 'tríceps']
  },
  {
    id: 'triceps_mergulho_banco',
    name: 'Bench Dips',
    namePt: 'Mergulho no Banco (Tríceps Banco)',
    group: 'TRÍCEPS',
    equipment: 'PESO CORPORAL',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Bench-Dips.gif',
    synonyms: ['triceps banco', 'mergulho banco', 'bench dips', 'triceps no banco'],
    keywords: ['mergulho', 'banco', 'dips', 'triceps', 'tríceps', 'corporal']
  },

  // ==========================================
  // CORE / ABDÔMEN (Animações 3D)
  // ==========================================
  {
    id: 'abdominal_crunch_solo',
    name: 'Abdominal Crunch',
    namePt: 'Abdominal Supra no Solo (Crunch)',
    group: 'CORE',
    equipment: 'PESO CORPORAL',
    angle: 'RETO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Crunch.gif',
    synonyms: ['abdominal supra', 'crunch', 'abdominal solo', 'abdominal tradicional'],
    keywords: ['abdominal', 'crunch', 'supra', 'solo', 'core', 'abdomen']
  },
  {
    id: 'prancha_frontal_isometrica',
    name: 'Front Plank',
    namePt: 'Prancha Frontal Isométrica',
    group: 'CORE',
    equipment: 'PESO CORPORAL',
    angle: 'RETO',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Plank.gif',
    synonyms: ['prancha frontal', 'prancha', 'plank', 'prancha isometrica'],
    keywords: ['prancha', 'plank', 'frontal', 'isometrica', 'isométrica', 'core', 'solo']
  },
  {
    id: 'abdominal_infra_barra',
    name: 'Hanging Leg Raise',
    namePt: 'Abdominal Infra na Barra Fixa (Leg Raise)',
    group: 'CORE',
    equipment: 'PESO CORPORAL',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Hanging-Leg-Raise.gif',
    synonyms: ['abdominal infra', 'infra barra', 'hanging leg raise', 'elevacao de pernas barra'],
    keywords: ['infra', 'hanging', 'barra', 'abdominal', 'elevacao', 'pernas', 'core']
  },
  {
    id: 'abdominal_russo_twist',
    name: 'Russian Twist',
    namePt: 'Abdominal Russo (Russian Twist)',
    group: 'CORE',
    equipment: 'PESO CORPORAL',
    angle: 'GERAL',
    gifUrl: 'https://fitnessprogramer.com/wp-content/uploads/2021/02/Russian-Twist.gif',
    synonyms: ['russian twist', 'abdominal russo', 'torcao russa', 'obliquos solo'],
    keywords: ['russo', 'twist', 'obliquo', 'oblíquo', 'rotacao', 'core']
  }
];

// ==========================================
// MOTOR DE CRUZAMENTO INTELIGENTE (4 FATORES)
// ==========================================
export function findBestGifMatch(exercise: { nome: string; grupo?: string; equipamento?: string }) {
  const normName = (exercise.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const normGroup = (exercise.grupo || '').toUpperCase().trim();
  const normEquip = (exercise.equipamento || '').toLowerCase().trim();

  let bestMatch: GifCatalogItem | null = null;
  let highestScore = 0;

  for (const item of EXERCISE_GIF_CATALOG) {
    // -----------------------------------------------------------------
    // FATOR 1: TRAVA RIGOROSA DE GRUPO MUSCULAR (Zero Tolerância)
    // -----------------------------------------------------------------
    if (normGroup && normGroup !== 'OUTROS' && item.group !== normGroup) {
      // Grupos incompatíveis = rejeição imediata (Score 0)
      continue;
    }

    let score = 0;

    // -----------------------------------------------------------------
    // FATOR 2: VALIDAÇÃO DE EQUIPAMENTO (Halter / Barra / Polia / Máquina)
    // -----------------------------------------------------------------
    const itemEquip = item.equipment.toLowerCase();
    const isEquipMatching = 
      (normEquip.includes('barra') && itemEquip.includes('barra')) ||
      (normEquip.includes('halter') && itemEquip.includes('halter')) ||
      (normEquip.includes('polia') && itemEquip.includes('polia')) ||
      (normEquip.includes('maquina') && itemEquip.includes('maquina')) ||
      ((normEquip.includes('solo') || normEquip.includes('corporal')) && itemEquip.includes('corporal'));

    const isEquipConflicting =
      (normEquip.includes('halter') && !itemEquip.includes('halter')) ||
      (normEquip.includes('barra') && !itemEquip.includes('barra')) ||
      (normEquip.includes('polia') && !itemEquip.includes('polia'));

    if (isEquipConflicting) {
      // Conflito severo de equipamento = rejeita para não trocar halter por barra
      continue;
    }

    if (isEquipMatching) {
      score += 25;
    }

    // -----------------------------------------------------------------
    // FATOR 3: FILTRO DE ÂNGULO E VARIAÇÃO POSTURAL (Inclinado/Declinado/Reto)
    // -----------------------------------------------------------------
    if (item.angle && item.angle !== 'GERAL') {
      const isInclineInName = normName.includes('inclinado') || normName.includes('30') || normName.includes('45');
      const isDeclineInName = normName.includes('declinado') || normName.includes('canadense');
      const isUnilateralInName = normName.includes('unilateral') || normName.includes('alternado') || normName.includes('serrote');

      if (item.angle === 'INCLINADO' && !isInclineInName && !normName.includes('supino')) {
        continue;
      }
      if (item.angle === 'DECLINADO' && !isDeclineInName) {
        continue;
      }
      if (item.angle === 'UNILATERAL' && isUnilateralInName) {
        score += 15;
      }
    }

    // -----------------------------------------------------------------
    // FATOR 4: SINÔNIMOS TÉCNICOS E ALINHAMENTO SEMÂNTICO (PT-BR ↔ EN)
    // -----------------------------------------------------------------
    // Checagem de sinônimos exatos
    const isExactSynonym = item.synonyms.some(syn => {
      const normSyn = syn.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normName === normSyn || normName.includes(normSyn);
    });

    if (isExactSynonym) {
      score += 50;
    } else {
      // Correspondência por tokens de palavras-chave
      const nameTokens = normName.split(/[\s\-+]+/).filter(t => t.length > 2);
      let matchedTokens = 0;

      for (const token of nameTokens) {
        if (item.keywords.some(k => k.includes(token) || token.includes(k))) {
          matchedTokens++;
        }
      }

      if (nameTokens.length > 0) {
        const tokenRatio = matchedTokens / nameTokens.length;
        score += Math.round(tokenRatio * 40);
      }
    }

    // Bonificação por Grupo Muscular coincidente
    if (normGroup === item.group) {
      score += 20;
    }

    const finalScore = Math.min(100, Math.round(score));

    if (finalScore > highestScore && finalScore >= 65) {
      highestScore = finalScore;
      bestMatch = item;
    }
  }

  return {
    match: bestMatch,
    confidence: highestScore
  };
}
