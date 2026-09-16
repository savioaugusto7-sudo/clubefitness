/**
 * Motor Anatômico de Teste de Força (Strength Atlas Engine)
 * Mapeamento das 6 Regiões Articulares e 63 Combinações Cromáticas
 * Padrão Dual-Body de Alta Fidelidade (Anterior + Posterior)
 * Clube Fitness Fisio
 */

export interface JointDefinition {
  id: string; // 'T', 'J', 'Q', 'O', 'C', 'P'
  num: number; // 1 a 6
  nome: string;
  articulacao: string;
  corHex: string;
  corNome: string;
  bgLight: string;
  borderLight: string;
  musculos: string;
  descricaoCompleta: string;
}

export const JOINT_DEFINITIONS: JointDefinition[] = [
  {
    id: 'T',
    num: 1,
    nome: 'Tornozelo',
    articulacao: 'Tornozelo',
    corHex: '#ef4444',
    corNome: 'Vermelho Radiante',
    bgLight: 'rgba(239, 68, 68, 0.08)',
    borderLight: 'rgba(239, 68, 68, 0.4)',
    musculos: 'Tríceps sural (gastrocnêmio e sóleo), tibial anterior/posterior e tendão de Aquiles',
    descricaoCompleta: 'Gastrocnêmio medial/lateral, sóleo, tibial posterior, tendão calcâneo'
  },
  {
    id: 'J',
    num: 2,
    nome: 'Joelho',
    articulacao: 'Joelho',
    corHex: '#22c55e',
    corNome: 'Verde Clínico',
    bgLight: 'rgba(34, 197, 94, 0.08)',
    borderLight: 'rgba(34, 197, 94, 0.4)',
    musculos: 'Quadríceps, isquiotibiais (bíceps femoral, semitendíneo, semimembranáceo) e poplíteo',
    descricaoCompleta: 'Reto femoral, vastos (medial, lateral, intermédio), isquiotibiais, poplíteo'
  },
  {
    id: 'Q',
    num: 3,
    nome: 'Quadril',
    articulacao: 'Quadril',
    corHex: '#eab308',
    corNome: 'Amarelo Dourado',
    bgLight: 'rgba(234, 179, 8, 0.08)',
    borderLight: 'rgba(234, 179, 8, 0.4)',
    musculos: 'Glúteo máximo, glúteo médio, rotadores profundos (piriforme, obturadores) e core complex',
    descricaoCompleta: 'Glúteos, piriforme, obturadores, quadrado femoral, iliopsoas, oblíquos'
  },
  {
    id: 'O',
    num: 4,
    nome: 'Ombro',
    articulacao: 'Ombro',
    corHex: '#f97316',
    corNome: 'Laranja Energético',
    bgLight: 'rgba(249, 115, 22, 0.08)',
    borderLight: 'rgba(249, 115, 22, 0.4)',
    musculos: 'Deltoide (anterior, lateral, posterior), manguito rotador, redondo maior/menor e romboides',
    descricaoCompleta: 'Deltoide, supraespinhal, infraespinhal, redondo maior/menor, subescapular, romboides'
  },
  {
    id: 'C',
    num: 5,
    nome: 'Cotovelo',
    articulacao: 'Cotovelo',
    corHex: '#3b82f6',
    corNome: 'Azul Royal',
    bgLight: 'rgba(59, 130, 246, 0.08)',
    borderLight: 'rgba(59, 130, 246, 0.4)',
    musculos: 'Bíceps braquial, braquiorradial, tríceps braquial (cabeças longa/lateral/medial) e ancôneo',
    descricaoCompleta: 'Bíceps braquial, braquial anterior, braquiorradial, tríceps braquial, ancôneo'
  },
  {
    id: 'P',
    num: 6,
    nome: 'Punho',
    articulacao: 'Punho',
    corHex: '#a855f7',
    corNome: 'Roxo Biomecânico',
    bgLight: 'rgba(168, 85, 247, 0.08)',
    borderLight: 'rgba(168, 85, 247, 0.4)',
    musculos: 'Extensores e flexores do antebraço (radial, ulnar, dedos, indicador) e intrínsecos',
    descricaoCompleta: 'Extensores radiais e ulnar do carpo, extensores dos dedos, flexores'
  }
];

/**
 * Extrai o conjunto de articulações testadas a partir dos testes e comparativos
 */
export function extractActiveJoints(testesRealizados: any[] = [], comparativos: any[] = []): Set<string> {
  const joints = new Set<string>();

  const checkText = (text: string) => {
    const t = (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (t.includes('tornozelo')) joints.add('T');
    if (t.includes('joelho')) joints.add('J');
    if (t.includes('quadril')) joints.add('Q');
    if (t.includes('ombro')) joints.add('O');
    if (t.includes('cotovelo')) joints.add('C');
    if (t.includes('punho') || t.includes('mao')) joints.add('P');
  };

  testesRealizados.forEach(t => {
    checkText(t.articulacao);
    checkText(t.movimento);
    checkText(t.grupoMuscular);
  });

  comparativos.forEach(c => {
    checkText(c.articulacao);
    checkText(c.movimento);
  });

  return joints;
}

/**
 * Gera a chave única de combinação (entre 1 e 63 combinações)
 * Exemplos: 'T', 'T_J', 'T_J_Q', 'ALL_6'
 */
export function getStrengthAtlasKey(testesRealizados: any[] = [], comparativos: any[] = []): string {
  const activeJoints = extractActiveJoints(testesRealizados, comparativos);
  const order = ['T', 'J', 'Q', 'O', 'C', 'P'];
  const activeList = order.filter(k => activeJoints.has(k));

  if (activeList.length === 0) {
    return 'NEUTRAL';
  }
  if (activeList.length === 6) {
    return 'ALL_6';
  }
  return activeList.join('_');
}

/**
 * Renderiza o Grid de 6 Cartões no Rodapé do Atlas em HTML/CSS para o PDF
 */
export function renderStrengthAtlasFooterHtml(activeJoints: Set<string>): string {
  const cardsHtml = JOINT_DEFINITIONS.map(j => {
    const isActive = activeJoints.has(j.id);
    
    if (isActive) {
      return `
        <div style="flex: 1; min-width: 0; border-radius: 6px; padding: 6px 7px; border: 1.5px solid ${j.corHex}; background: ${j.bgLight}; box-sizing: border-box;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="background: ${j.corHex}; color: #ffffff; width: 14px; height: 14px; border-radius: 50%; font-size: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; line-height: 1;">${j.num}</span>
              <strong style="color: #0f172a; font-size: 8px; text-transform: uppercase; font-family: 'Outfit', sans-serif; letter-spacing: 0.2px;">${j.nome}</strong>
            </div>
            <span style="font-size: 6.5px; font-weight: 800; color: ${j.corHex}; background: #ffffff; padding: 1px 4px; border-radius: 3px; border: 1px solid ${j.corHex}; text-transform: uppercase;">AVALIADO</span>
          </div>
          <p style="margin: 0; font-size: 6.5px; color: #334155; line-height: 1.25; font-weight: 500;">
            ${j.musculos}
          </p>
        </div>
      `;
    } else {
      return `
        <div style="flex: 1; min-width: 0; border-radius: 6px; padding: 6px 7px; border: 1px solid #e2e8f0; background: #f8fafc; opacity: 0.55; box-sizing: border-box;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <span style="background: #94a3b8; color: #ffffff; width: 14px; height: 14px; border-radius: 50%; font-size: 8px; font-weight: 800; display: flex; align-items: center; justify-content: center; line-height: 1;">${j.num}</span>
              <strong style="color: #64748b; font-size: 8px; text-transform: uppercase; font-family: 'Outfit', sans-serif;">${j.nome}</strong>
            </div>
            <span style="font-size: 6.5px; font-weight: 600; color: #94a3b8; background: #ffffff; padding: 1px 4px; border-radius: 3px; border: 1px solid #cbd5e1; text-transform: uppercase;">NÃO AVALIADO</span>
          </div>
          <p style="margin: 0; font-size: 6.5px; color: #94a3b8; line-height: 1.25;">
            ${j.musculos}
          </p>
        </div>
      `;
    }
  }).join('');

  return `
    <div style="display: flex; gap: 6px; width: 100%; margin-top: 8px; box-sizing: border-box;">
      ${cardsHtml}
    </div>
  `;
}

/**
 * Carrega e retorna em Base64 a chapa anatômica correspondente à combinação exata de articulações
 * Base 100% neutra em escala de cinza para articulações não avaliadas,
 * e preenchimento anatômico com badges oficiais para as articulações avaliadas.
 */
export async function getDynamicStrengthAtlasBase64(
  atlasKey: string = 'NEUTRAL',
  testedJoints?: Set<string>
): Promise<string> {
  const toBase64 = async (url: string): Promise<string> => {
    try {
      const res = await fetch(url);
      if (!res.ok) return url;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  };

  // Se testedJoints for passado, recalcula a chave exata
  let effectiveKey = atlasKey;
  if (testedJoints) {
    const order = ['T', 'J', 'Q', 'O', 'C', 'P'];
    const activeList = order.filter(k => testedJoints.has(k));
    if (activeList.length === 0) {
      effectiveKey = 'NEUTRAL';
    } else if (activeList.length === 6) {
      effectiveKey = 'ALL_6';
    } else {
      effectiveKey = activeList.join('_');
    }
  }

  const cleanKey = effectiveKey.toLowerCase();

  // Lista de candidatos em ordem de prioridade
  const candidates: string[] = [];

  if (cleanKey === 'neutral') {
    candidates.push('/images/anatomy/atlas_neutral.png');
  } else {
    candidates.push(`/images/anatomy/atlas_${cleanKey}.png`);
    if (cleanKey === 'all_6') {
      candidates.push('/images/anatomy/atlas_t_j_q_o_c_p.png');
    }
  }

  // Fallbacks seguros (sempre no padrão dual-body neutro)
  candidates.push('/images/anatomy/atlas_neutral.png');

  for (const path of candidates) {
    try {
      const b64 = await toBase64(path);
      if (b64 && b64.startsWith('data:image')) {
        return b64;
      }
    } catch {}
  }

  return '/images/anatomy/atlas_neutral.png';
}
