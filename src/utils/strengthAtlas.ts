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
  // Hotspots anatômicos em coordenadas 1264x848
  hotspotsAnterior: Array<{ x: number; y: number; rx: number; ry: number }>;
  hotspotsPosterior: Array<{ x: number; y: number; rx: number; ry: number }>;
  pinAnterior: { x: number; y: number; badgeX: number; badgeY: number };
  pinPosterior: { x: number; y: number; badgeX: number; badgeY: number };
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
    descricaoCompleta: 'Gastrocnêmio medial/lateral, sóleo, tibial posterior, tendão calcâneo',
    hotspotsAnterior: [
      { x: 325, y: 755, rx: 22, ry: 35 },
      { x: 405, y: 755, rx: 22, ry: 35 }
    ],
    hotspotsPosterior: [
      { x: 855, y: 745, rx: 26, ry: 40 },
      { x: 935, y: 745, rx: 26, ry: 40 }
    ],
    pinAnterior: { x: 325, y: 755, badgeX: 200, badgeY: 755 },
    pinPosterior: { x: 935, y: 745, badgeX: 1060, badgeY: 745 }
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
    descricaoCompleta: 'Reto femoral, vastos (medial, lateral, intermédio), isquiotibiais, poplíteo',
    hotspotsAnterior: [
      { x: 325, y: 585, rx: 28, ry: 42 },
      { x: 405, y: 585, rx: 28, ry: 42 }
    ],
    hotspotsPosterior: [
      { x: 855, y: 585, rx: 28, ry: 42 },
      { x: 935, y: 585, rx: 28, ry: 42 }
    ],
    pinAnterior: { x: 325, y: 585, badgeX: 200, badgeY: 585 },
    pinPosterior: { x: 935, y: 585, badgeX: 1060, badgeY: 585 }
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
    descricaoCompleta: 'Glúteos, piriforme, obturadores, quadrado femoral, iliopsoas, oblíquos',
    hotspotsAnterior: [
      { x: 365, y: 440, rx: 50, ry: 35 }
    ],
    hotspotsPosterior: [
      { x: 895, y: 445, rx: 65, ry: 45 }
    ],
    pinAnterior: { x: 335, y: 440, badgeX: 200, badgeY: 440 },
    pinPosterior: { x: 945, y: 445, badgeX: 1060, badgeY: 445 }
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
    descricaoCompleta: 'Deltoide, supraespinhal, infraespinhal, redondo maior/menor, subescapular, romboides',
    hotspotsAnterior: [
      { x: 270, y: 240, rx: 30, ry: 36 },
      { x: 460, y: 240, rx: 30, ry: 36 }
    ],
    hotspotsPosterior: [
      { x: 800, y: 240, rx: 30, ry: 36 },
      { x: 990, y: 240, rx: 30, ry: 36 }
    ],
    pinAnterior: { x: 270, y: 240, badgeX: 150, badgeY: 240 },
    pinPosterior: { x: 990, y: 240, badgeX: 1110, badgeY: 240 }
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
    descricaoCompleta: 'Bíceps braquial, braquial anterior, braquiorradial, tríceps braquial, ancôneo',
    hotspotsAnterior: [
      { x: 215, y: 345, rx: 24, ry: 32 },
      { x: 515, y: 345, rx: 24, ry: 32 }
    ],
    hotspotsPosterior: [
      { x: 745, y: 345, rx: 24, ry: 32 },
      { x: 1045, y: 345, rx: 24, ry: 32 }
    ],
    pinAnterior: { x: 215, y: 345, badgeX: 110, badgeY: 345 },
    pinPosterior: { x: 1045, y: 345, badgeX: 1150, badgeY: 345 }
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
    descricaoCompleta: 'Extensores radiais e ulnar do carpo, extensores dos dedos, flexores',
    hotspotsAnterior: [
      { x: 165, y: 440, rx: 22, ry: 30 },
      { x: 565, y: 440, rx: 22, ry: 30 }
    ],
    hotspotsPosterior: [
      { x: 695, y: 440, rx: 22, ry: 30 },
      { x: 1095, y: 440, rx: 22, ry: 30 }
    ],
    pinAnterior: { x: 165, y: 440, badgeX: 75, badgeY: 440 },
    pinPosterior: { x: 1095, y: 440, badgeX: 1185, badgeY: 440 }
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

  if (activeList.length === 0 || activeList.length === 6) {
    return 'ALL_6';
  }
  return activeList.join('_');
}

/**
 * Renderiza o Grid de 6 Cartões no Rodapé do Atlas em HTML/CSS para o PDF
 */
export function renderStrengthAtlasFooterHtml(activeJoints: Set<string>): string {
  const cardsHtml = JOINT_DEFINITIONS.map(j => {
    const isActive = activeJoints.size === 0 || activeJoints.has(j.id);
    
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
 * Converte cor hex (#ef4444) em rgba com opacidade personalizada
 */
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Renderiza dinamicamente o Atlas Anatômico Dual-Body (Anterior + Posterior) em Base64
 * Suporta as 63 combinações de articulações testadas, aplicando brilho muscular e pins numerados
 */
export async function getDynamicStrengthAtlasBase64(
  atlasKey: string = 'ALL_6',
  testedJoints?: Set<string>
): Promise<string> {
  const baseDualBodyPath = '/images/anatomy/atlas_j_q.png';

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

  // Se estiver em ambiente sem Canvas (SSR/Node)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return toBase64(baseDualBodyPath);
  }

  // Se a chave for exatamente J_Q (Joelho + Quadril), podemos usar a chapa direta
  if (atlasKey.toUpperCase() === 'J_Q' && (!testedJoints || (testedJoints.has('J') && testedJoints.has('Q') && testedJoints.size === 2))) {
    const directB64 = await toBase64(baseDualBodyPath);
    if (directB64 && directB64.startsWith('data:image')) {
      return directB64;
    }
  }

  try {
    // Carrega a imagem base Dual-Body
    const baseImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Falha ao carregar imagem base do atlas'));
      img.src = baseDualBodyPath;
    });

    const canvasWidth = baseImg.naturalWidth || 1264;
    const canvasHeight = baseImg.naturalHeight || 848;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return toBase64(baseDualBodyPath);

    // Fundo branco limpo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Desenha a imagem base anatômica Dual-Body
    ctx.drawImage(baseImg, 0, 0, canvasWidth, canvasHeight);

    // Determina quais articulações devem ser destacadas
    const activeSet = testedJoints && testedJoints.size > 0 
      ? testedJoints 
      : new Set(JOINT_DEFINITIONS.map(j => j.id));

    // Se já é J_Q puro, os destaques já estão na arte base
    const needsAdditionalOverlays = !(activeSet.size === 2 && activeSet.has('J') && activeSet.has('Q'));

    if (needsAdditionalOverlays) {
      JOINT_DEFINITIONS.forEach(joint => {
        if (!activeSet.has(joint.id)) return;

        // Se for J ou Q, a imagem base já possui realces suaves, então desenhamos pins e reforço
        const isJorQ = joint.id === 'J' || joint.id === 'Q';

        // 1. Destaques Anatômicos Musculares (Glow / Radial Gradients)
        if (!isJorQ) {
          ctx.save();
          ctx.globalCompositeOperation = 'multiply';
          
          // Anterior hotspots
          joint.hotspotsAnterior.forEach(h => {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(h.x, h.y, h.rx, h.ry, 0, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(h.x, h.y, 2, h.x, h.y, Math.max(h.rx, h.ry));
            grad.addColorStop(0, hexToRgba(joint.corHex, 0.75));
            grad.addColorStop(0.65, hexToRgba(joint.corHex, 0.45));
            grad.addColorStop(1, hexToRgba(joint.corHex, 0));
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();
          });

          // Posterior hotspots
          joint.hotspotsPosterior.forEach(h => {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(h.x, h.y, h.rx, h.ry, 0, 0, Math.PI * 2);
            const grad = ctx.createRadialGradient(h.x, h.y, 2, h.x, h.y, Math.max(h.rx, h.ry));
            grad.addColorStop(0, hexToRgba(joint.corHex, 0.75));
            grad.addColorStop(0.65, hexToRgba(joint.corHex, 0.45));
            grad.addColorStop(1, hexToRgba(joint.corHex, 0));
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.restore();
          });
          ctx.restore();
        }

        // 2. Badges de Articulação Numerados com Linhas de Chamada
        if (!isJorQ) {
          const drawBadgeCallout = (pin: { x: number; y: number; badgeX: number; badgeY: number }, isRightSide: boolean) => {
            ctx.save();
            
            // Linha de chamada com estilo cinesiológico
            ctx.beginPath();
            ctx.strokeStyle = hexToRgba(joint.corHex, 0.7);
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.moveTo(pin.x, pin.y);
            ctx.lineTo(pin.badgeX + (isRightSide ? -8 : 8), pin.badgeY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Ponto central no músculo
            ctx.beginPath();
            ctx.arc(pin.x, pin.y, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = joint.corHex;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Pílula / Badge
            const text = `${joint.num} ${joint.nome.toUpperCase()}`;
            ctx.font = 'bold 12px Outfit, Inter, sans-serif';
            const metrics = ctx.measureText(text);
            const badgeW = metrics.width + 28;
            const badgeH = 24;
            const bx = isRightSide ? pin.badgeX : pin.badgeX - badgeW;
            const by = pin.badgeY - badgeH / 2;
            const radius = 12;

            // Fundo da pílula
            ctx.beginPath();
            ctx.moveTo(bx + radius, by);
            ctx.lineTo(bx + badgeW - radius, by);
            ctx.quadraticCurveTo(bx + badgeW, by, bx + badgeW, by + radius);
            ctx.lineTo(bx + badgeW, by + badgeH - radius);
            ctx.quadraticCurveTo(bx + badgeW, by + badgeH, bx + badgeW - radius, by + badgeH);
            ctx.lineTo(bx + radius, by + badgeH);
            ctx.quadraticCurveTo(bx, by + badgeH, bx, by + badgeH - radius);
            ctx.lineTo(bx, by + radius);
            ctx.quadraticCurveTo(bx, by, bx + radius, by);
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = joint.corHex;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Círculo com o número
            const circleX = bx + 12;
            const circleY = by + badgeH / 2;
            ctx.beginPath();
            ctx.arc(circleX, circleY, 8, 0, Math.PI * 2);
            ctx.fillStyle = joint.corHex;
            ctx.fill();

            // Número no círculo
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px Outfit, Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(joint.num), circleX, circleY + 0.5);

            // Nome da articulação
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 10px Outfit, Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(joint.nome.toUpperCase(), circleX + 11, circleY + 0.5);

            ctx.restore();
          };

          drawBadgeCallout(joint.pinAnterior, false);
          drawBadgeCallout(joint.pinPosterior, true);
        }
      });
    }

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    return dataUrl;
  } catch (err) {
    console.error('Erro ao compor Atlas Anatômico dinâmico:', err);
    return toBase64(baseDualBodyPath);
  }
}
