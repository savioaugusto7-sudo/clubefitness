/**
 * Motor de Inteligência Biomecânica, Goniometria e Dinamometria Isométrica
 * Regras Clínicas de Prevenção de Lesões, Razões Musculares e Alertas Ortopédicos.
 */

export interface BiomechanicAlert {
  tipo: 'critico' | 'atencao' | 'normal';
  titulo: string;
  descricao: string;
  articulacao: string;
  lado?: 'Direito' | 'Esquerdo' | 'Bilateral';
  valorCalculado?: string | number;
  referenciaIdeal?: string;
  riscoClinico: string;
}

/**
 * 1. Análise Clínica e Alertas de Goniometria & Mobilidade Articular
 */
export function calculateGoniometryAlerts(gonio: any): BiomechanicAlert[] {
  const alerts: BiomechanicAlert[] = [];
  if (!gonio) return alerts;

  const getNum = (v: any) => {
    if (!v) return 0;
    if (typeof v === 'object') return Number(v.semForca || v.ativo || v.comForca || v.passivo) || 0;
    return Number(v) || 0;
  };

  // QUADRIL - Rotação Interna e Externa
  const rotIntD = getNum(gonio.quadrilRotIntD);
  const rotIntE = getNum(gonio.quadrilRotIntE);
  const rotExtD = getNum(gonio.quadrilRotExtD);
  const rotExtE = getNum(gonio.quadrilRotExtE);

  // 1.1 Soma RI + RE < 85° (SIF / Arco Total de Movimento)
  if (rotIntD > 0 && rotExtD > 0 && (rotIntD + rotExtD) < 85) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Alerta SIF (Arco Total Reduzido)',
      articulacao: 'Quadril',
      lado: 'Direito',
      valorCalculado: `${rotIntD + rotExtD}°`,
      referenciaIdeal: '≥ 85°',
      descricao: `Soma de RI (${rotIntD}°) + RE (${rotExtD}°) = ${rotIntD + rotExtD}° está abaixo de 85°.`,
      riscoClinico: 'Impacto femoroacetabular (SIF), risco elevado de lesão labral e dor crônica na virilha.'
    });
  }
  if (rotIntE > 0 && rotExtE > 0 && (rotIntE + rotExtE) < 85) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Alerta SIF (Arco Total Reduzido)',
      articulacao: 'Quadril',
      lado: 'Esquerdo',
      valorCalculado: `${rotIntE + rotExtE}°`,
      referenciaIdeal: '≥ 85°',
      descricao: `Soma de RI (${rotIntE}°) + RE (${rotExtE}°) = ${rotIntE + rotExtE}° está abaixo de 85°.`,
      riscoClinico: 'Impacto femoroacetabular (SIF), risco elevado de lesão labral e dor crônica na virilha.'
    });
  }

  // 1.2 Rotação Interna Isolada < 20° (SIF Severo)
  if (rotIntD > 0 && rotIntD < 20) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Impacto Femoroacetabular (RI < 20°)',
      articulacao: 'Quadril',
      lado: 'Direito',
      valorCalculado: `${rotIntD}°`,
      referenciaIdeal: '40° - 45°',
      descricao: `Rotação interna isolada de ${rotIntD}° severamente restrita.`,
      riscoClinico: 'Impacto femoroacetabular direto (SIF) e alta predisposição a dor de virilha/quadril.'
    });
  } else if (rotIntD >= 20 && rotIntD < 30) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Risco de Valgo Dinâmico (RI < 30°)',
      articulacao: 'Quadril',
      lado: 'Direito',
      valorCalculado: `${rotIntD}°`,
      referenciaIdeal: '40° - 45°',
      descricao: `Rotação interna moderada (${rotIntD}°).`,
      riscoClinico: 'Risco elevado de valgo dinâmico de joelho e sobrecarga medial.'
    });
  }

  if (rotIntE > 0 && rotIntE < 20) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Impacto Femoroacetabular (RI < 20°)',
      articulacao: 'Quadril',
      lado: 'Esquerdo',
      valorCalculado: `${rotIntE}°`,
      referenciaIdeal: '40° - 45°',
      descricao: `Rotação interna isolada de ${rotIntE}° severamente restrita.`,
      riscoClinico: 'Impacto femoroacetabular direto (SIF) e alta predisposição a dor de virilha/quadril.'
    });
  } else if (rotIntE >= 20 && rotIntE < 30) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Risco de Valgo Dinâmico (RI < 30°)',
      articulacao: 'Quadril',
      lado: 'Esquerdo',
      valorCalculado: `${rotIntE}°`,
      referenciaIdeal: '40° - 45°',
      descricao: `Rotação interna moderada (${rotIntE}°).`,
      riscoClinico: 'Risco elevado de valgo dinâmico de joelho e sobrecarga medial.'
    });
  }

  // 1.3 Rotação Externa Isolada < 35° (Cisalhamento Meniscal Medial)
  if (rotExtD > 0 && rotExtD < 35) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Cisalhamento de Menisco Medial (RE < 35°)',
      articulacao: 'Quadril',
      lado: 'Direito',
      valorCalculado: `${rotExtD}°`,
      referenciaIdeal: '40° - 45°',
      descricao: `Rotação externa de ${rotExtD}° abaixo do limiar de 35°.`,
      riscoClinico: 'Cisalhamento excessivo sobre o menisco MEDIAL e ligamento colateral medial.'
    });
  }
  if (rotExtE > 0 && rotExtE < 35) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Cisalhamento de Menisco Medial (RE < 35°)',
      articulacao: 'Quadril',
      lado: 'Esquerdo',
      valorCalculado: `${rotExtE}°`,
      referenciaIdeal: '40° - 45°',
      descricao: `Rotação externa de ${rotExtE}° abaixo do limiar de 35°.`,
      riscoClinico: 'Cisalhamento excessivo sobre o menisco MEDIAL e ligamento colateral medial.'
    });
  }

  // 1.4 Flexão de Quadril com Joelho Fletido < 120°
  const flexQuadJoelhoD = getNum(gonio.quadrilFlexao2D || gonio.quadrilFlexaoJoelhoFletidoD);
  const flexQuadJoelhoE = getNum(gonio.quadrilFlexao2E || gonio.quadrilFlexaoJoelhoFletidoE);
  if (flexQuadJoelhoD > 0 && flexQuadJoelhoD < 120) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Restrição de Flexão de Quadril (< 120°)',
      articulacao: 'Quadril',
      lado: 'Direito',
      valorCalculado: `${flexQuadJoelhoD}°`,
      referenciaIdeal: '120° - 135°',
      descricao: `Flexão com joelho fletido de ${flexQuadJoelhoD}° restrita.`,
      riscoClinico: 'Risco de Síndrome da Dor Patelofemoral (SDPF), sobrecarga de LCA e tensão no trato iliotibial.'
    });
  }
  if (flexQuadJoelhoE > 0 && flexQuadJoelhoE < 120) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Restrição de Flexão de Quadril (< 120°)',
      articulacao: 'Quadril',
      lado: 'Esquerdo',
      valorCalculado: `${flexQuadJoelhoE}°`,
      referenciaIdeal: '120° - 135°',
      descricao: `Flexão com joelho fletido de ${flexQuadJoelhoE}° restrita.`,
      riscoClinico: 'Risco de Síndrome da Dor Patelofemoral (SDPF), sobrecarga de LCA e tensão no trato iliotibial.'
    });
  }

  // 1.5 Teste KFBO (Assimetria de Cabeça da Fíbula > 15 cm)
  const kfboD = getNum(gonio.kfboD);
  const kfboE = getNum(gonio.kfboE);
  if (kfboD > 0 && kfboE > 0) {
    const diffKfbo = Math.abs(kfboD - kfboE);
    if (diffKfbo > 15) {
      alerts.push({
        tipo: 'critico',
        titulo: 'Assimetria Crítica no Teste KFBO (> 15 cm)',
        articulacao: 'Joelho / Fíbula',
        lado: 'Bilateral',
        valorCalculado: `${diffKfbo.toFixed(1)} cm`,
        referenciaIdeal: '≤ 15 cm',
        descricao: `Diferença de ${diffKfbo.toFixed(1)} cm entre Direito (${kfboD} cm) e Esquerdo (${kfboE} cm).`,
        riscoClinico: '2.3x mais chance de valgo dinâmico e lesão do compartimento medial do joelho.'
      });
    }
  }

  // 1.6 Tornozelo — Dorsiflexão com Joelho Estendido (tornozeloDorsi1, ref: 20°) e Joelho Fletido / Lunge (tornozeloDorsi2, ref: 35-45°)
  const dorsi1D = getNum(gonio.tornozeloDorsi1D);
  const dorsi1E = getNum(gonio.tornozeloDorsi1E);
  if (dorsi1D > 0 && dorsi1D < 15) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Déficit Severo de Dorsiflexão - Joelho Estendido (< 15°)',
      articulacao: 'Tornozelo',
      lado: 'Direito',
      valorCalculado: `${dorsi1D}°`,
      referenciaIdeal: '20°',
      descricao: `Dorsiflexão de ${dorsi1D}° com joelho estendido abaixo do ideal (tensão passiva biarticular dos gastrocnêmios).`,
      riscoClinico: 'Risco aumentado de tendinopatia de Aquiles, fascite plantar e compensações em cadeia ascendente.'
    });
  } else if (dorsi1D >= 15 && dorsi1D < 20) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Atenção / Encurtamento de Dorsiflexão - Joelho Estendido (15-19°)',
      articulacao: 'Tornozelo',
      lado: 'Direito',
      valorCalculado: `${dorsi1D}°`,
      referenciaIdeal: '20°',
      descricao: `Dorsiflexão de ${dorsi1D}° com joelho estendido reduzida (tensão de gastrocnêmio).`,
      riscoClinico: 'Risco aumentado de tendinopatia de Aquiles, fascite plantar e sobrecarga patelar.'
    });
  }
  if (dorsi1E > 0 && dorsi1E < 15) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Déficit Severo de Dorsiflexão - Joelho Estendido (< 15°)',
      articulacao: 'Tornozelo',
      lado: 'Esquerdo',
      valorCalculado: `${dorsi1E}°`,
      referenciaIdeal: '20°',
      descricao: `Dorsiflexão de ${dorsi1E}° com joelho estendido abaixo do ideal (tensão passiva biarticular dos gastrocnêmios).`,
      riscoClinico: 'Risco aumentado de tendinopatia de Aquiles, fascite plantar e compensações em cadeia ascendente.'
    });
  } else if (dorsi1E >= 15 && dorsi1E < 20) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Atenção / Encurtamento de Dorsiflexão - Joelho Estendido (15-19°)',
      articulacao: 'Tornozelo',
      lado: 'Esquerdo',
      valorCalculado: `${dorsi1E}°`,
      referenciaIdeal: '20°',
      descricao: `Dorsiflexão de ${dorsi1E}° com joelho estendido reduzida (tensão de gastrocnêmio).`,
      riscoClinico: 'Risco aumentado de tendinopatia de Aquiles, fascite plantar e sobrecarga patelar.'
    });
  }

  const dorsi2D = getNum(gonio.tornozeloDorsi2D);
  const dorsi2E = getNum(gonio.tornozeloDorsi2E);
  if (dorsi2D > 0 && dorsi2D < 25) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Déficit Severo de Dorsiflexão - Joelho Fletido / Lunge (< 25°)',
      articulacao: 'Tornozelo',
      lado: 'Direito',
      valorCalculado: `${dorsi2D}°`,
      referenciaIdeal: '35° - 45°',
      descricao: `Dorsiflexão de ${dorsi2D}° com joelho fletido / Lunge abaixo do ideal (restrição tibiotársica / sóleo).`,
      riscoClinico: 'Risco de valgo dinâmico compensatório no agachamento/salto e tendinopatia patelar.'
    });
  } else if (dorsi2D >= 25 && dorsi2D < 35) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Encurtamento de Dorsiflexão - Joelho Fletido / Lunge (25-34°)',
      articulacao: 'Tornozelo',
      lado: 'Direito',
      valorCalculado: `${dorsi2D}°`,
      referenciaIdeal: '35° - 45°',
      descricao: `Dorsiflexão de ${dorsi2D}° com joelho fletido / Lunge encurtada (restrição tibiotársica / sóleo).`,
      riscoClinico: 'Risco de valgo dinâmico compensatório no agachamento/salto e tendinopatia patelar.'
    });
  }
  if (dorsi2E > 0 && dorsi2E < 25) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Déficit Severo de Dorsiflexão - Joelho Fletido / Lunge (< 25°)',
      articulacao: 'Tornozelo',
      lado: 'Esquerdo',
      valorCalculado: `${dorsi2E}°`,
      referenciaIdeal: '35° - 45°',
      descricao: `Dorsiflexão de ${dorsi2E}° com joelho fletido / Lunge abaixo do ideal (restrição tibiotársica / sóleo).`,
      riscoClinico: 'Risco de valgo dinâmico compensatório no agachamento/salto e tendinopatia patelar.'
    });
  } else if (dorsi2E >= 25 && dorsi2E < 35) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Encurtamento de Dorsiflexão - Joelho Fletido / Lunge (25-34°)',
      articulacao: 'Tornozelo',
      lado: 'Esquerdo',
      valorCalculado: `${dorsi2E}°`,
      referenciaIdeal: '35° - 45°',
      descricao: `Dorsiflexão de ${dorsi2E}° com joelho fletido / Lunge encurtada (restrição tibiotársica / sóleo).`,
      riscoClinico: 'Risco de valgo dinâmico compensatório no agachamento/salto e tendinopatia patelar.'
    });
  }

  // 1.7 Ombro — GIRD (Déficit de Rotação Interna > 20°)
  const ombroRotIntD = getNum(gonio.ombroRotIntD);
  const ombroRotIntE = getNum(gonio.ombroRotIntE);
  if (ombroRotIntD > 0 && ombroRotIntE > 0) {
    const diffOmbroRI = Math.abs(ombroRotIntD - ombroRotIntE);
    if (diffOmbroRI > 20) {
      alerts.push({
        tipo: 'critico',
        titulo: 'Alerta GIRD Glenoumeral (> 20°)',
        articulacao: 'Ombro',
        lado: 'Bilateral',
        valorCalculado: `${diffOmbroRI.toFixed(1)}°`,
        referenciaIdeal: '≤ 20°',
        descricao: `Assimetria de ${diffOmbroRI.toFixed(1)}° na rotação interna entre braço direito (${ombroRotIntD}°) e esquerdo (${ombroRotIntE}°).`,
        riscoClinico: 'Síndrome do impacto subacromial, lesão do manguito rotador e instabilidade glenoumeral.'
      });
    }
  }

  // 1.8 Cinemática de Corrida (Adução de Quadril > 15° na fase de apoio)
  const aducaoCorridaD = getNum(gonio.cinematicaAducaoQuadrilD);
  const aducaoCorridaE = getNum(gonio.cinematicaAducaoQuadrilE);
  if (aducaoCorridaD > 15 || aducaoCorridaE > 15) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Pico de Adução Excessivo na Corrida (> 15°)',
      articulacao: 'Quadril / Joelho',
      lado: aducaoCorridaD > 15 && aducaoCorridaE > 15 ? 'Bilateral' : aducaoCorridaD > 15 ? 'Direito' : 'Esquerdo',
      valorCalculado: `${Math.max(aducaoCorridaD, aducaoCorridaE)}°`,
      referenciaIdeal: '≤ 15°',
      descricao: 'Adução excessiva de quadril identificada na fase de apoio da marcha/corrida.',
      riscoClinico: 'Preditor biomecânico direto de Síndrome do Trato Iliotibial (STIT) e dor lateral de joelho.'
    });
  }

  return alerts;
}

/**
 * 2. Análise Clínica e Alertas dos Testes de Força Muscular (Dinamometria)
 */
export function calculateStrengthTestAlerts(testesList: any, pesoKg: number = 70, sexo: 'M' | 'F' = 'M', extraData?: any): BiomechanicAlert[] {
  const alerts: BiomechanicAlert[] = [];
  if (!testesList) return alerts;

  let list: any[] = [];
  if (Array.isArray(testesList)) {
    list = testesList;
  } else if (typeof testesList === 'object') {
    list = Array.isArray(testesList.testesRealizados)
      ? testesList.testesRealizados
      : Array.isArray(testesList.exercicios)
      ? testesList.exercicios
      : Array.isArray(testesList.testes)
      ? testesList.testes
      : [];
  }

  if (list.length === 0) return alerts;

  // Mapa de forças em Newtons por movimento e lado
  const map: Record<string, { D: number; E: number; max: number }> = {};

  list.forEach(t => {
    if (!t) return;
    const key = `${t.articulacao || ''}_${t.movimento || ''}`.toLowerCase().trim();
    if (!key || key === '_') return;
    if (!map[key]) map[key] = { D: 0, E: 0, max: 0 };
    const forcaN = Number(t.forcaN) || (Number(t.valorObtido) * (t.unidade === 'kgf' ? 9.80665 : 1)) || 0;
    if (t.lado === 'Direito') map[key].D = forcaN;
    if (t.lado === 'Esquerdo') map[key].E = forcaN;
    map[key].max = Math.max(map[key].max, forcaN);
  });

  const getForca = (art: string, mov: string) => {
    const k = `${art}_${mov}`.toLowerCase().trim();
    return map[k] || { D: 0, E: 0, max: 0 };
  };

  // 2.0 Assimetrias Bilaterais Direita vs Esquerda (> 10%)
  const bilateralGroups: Record<string, { articulacao: string; movimento: string; D: number; E: number }> = {};
  list.forEach(t => {
    if (!t) return;
    const key = `${t.articulacao || ''}_${t.movimento || ''}`.toLowerCase().trim();
    if (!key || key === '_') return;
    if (!bilateralGroups[key]) {
      bilateralGroups[key] = { articulacao: t.articulacao, movimento: t.movimento, D: 0, E: 0 };
    }
    const fN = Number(t.forcaN) || (Number(t.valorObtido) * (t.unidade === 'kgf' ? 9.80665 : 1)) || 0;
    if (t.lado === 'Direito') bilateralGroups[key].D = fN;
    if (t.lado === 'Esquerdo') bilateralGroups[key].E = fN;
  });

  Object.values(bilateralGroups).forEach(bg => {
    if (bg.D > 0 && bg.E > 0) {
      const minV = Math.min(bg.D, bg.E);
      const maxV = Math.max(bg.D, bg.E);
      const deficit = maxV > 0 ? ((maxV - minV) / maxV) * 100 : 0;
      if (deficit > 10) {
        alerts.push({
          tipo: deficit > 15 ? 'critico' : 'atencao',
          titulo: `Assimetria Bilateral em ${bg.articulacao} - ${bg.movimento} (> 10%)`,
          articulacao: bg.articulacao,
          valorCalculado: `${deficit.toFixed(1)}%`,
          referenciaIdeal: '≤ 10%',
          descricao: `Diferença de ${deficit.toFixed(1)}% entre lado direito (${bg.D.toFixed(1)} N) e esquerdo (${bg.E.toFixed(1)} N).`,
          riscoClinico: 'Sobrecarga mecânica assimétrica e compensação postural em cadeia cinética fechada.'
        });
      }
    }
  });

  // 2.1 Razão Adutor / Abdutor de Quadril
  const adutores = getForca('Quadril', 'Adução');
  const abdutores = getForca('Quadril', 'Abdução');
  if (adutores.max > 0 && abdutores.max > 0) {
    const ratioAdAbd = adutores.max / abdutores.max;
    if (ratioAdAbd < 0.80) {
      alerts.push({
        tipo: 'critico',
        titulo: 'Razão Adutor / Abdutor Baixa (< 80%)',
        articulacao: 'Quadril',
        valorCalculado: `${(ratioAdAbd * 100).toFixed(0)}%`,
        referenciaIdeal: '80% - 100% (1:1)',
        descricao: `Força de adutores representa apenas ${(ratioAdAbd * 100).toFixed(0)}% dos abdutores.`,
        riscoClinico: 'Risco iminente de dor inguinal e desequilíbrio pubo-adutor.'
      });
    } else if (ratioAdAbd > 1.15) {
      alerts.push({
        tipo: 'critico',
        titulo: 'Razão Adutor / Abdutor Elevada (> 1.15)',
        articulacao: 'Quadril',
        valorCalculado: ratioAdAbd.toFixed(2),
        referenciaIdeal: '0.80 - 1.15',
        descricao: `Adutores ${(ratioAdAbd * 100).toFixed(0)}% mais fortes que abdutores.`,
        riscoClinico: 'Risco elevado de Pubalgia atlética e estresse na sínfise púbica.'
      });
    } else if (ratioAdAbd < 1.0) {
      alerts.push({
        tipo: 'atencao',
        titulo: 'Leve Déficit Adutor (< 1:1)',
        articulacao: 'Quadril',
        valorCalculado: ratioAdAbd.toFixed(2),
        referenciaIdeal: '1.0 (Equilíbrio 1:1)',
        descricao: 'Adutores levemente inferiores aos abdutores.',
        riscoClinico: 'Risco aumentado de instabilidade medial e entorse de joelho.'
      });
    }
  }

  // 2.2 Razão Rotação Interna / Rotação Externa de Quadril
  const rotIntQuad = getForca('Quadril', 'Rotação Interna');
  const rotExtQuad = getForca('Quadril', 'Rotação Externa');
  if (rotIntQuad.max > 0 && rotExtQuad.max > 0) {
    const ratioRiReQuad = rotIntQuad.max / rotExtQuad.max;
    if (ratioRiReQuad > 1.20) {
      alerts.push({
        tipo: 'critico',
        titulo: 'Razão RI / RE Quadril Elevada (> 1.20)',
        articulacao: 'Quadril',
        valorCalculado: ratioRiReQuad.toFixed(2),
        referenciaIdeal: '1.0 (1:1)',
        descricao: `Rotação interna ${((ratioRiReQuad - 1) * 100).toFixed(0)}% mais forte que a externa.`,
        riscoClinico: 'Predisposição a Impacto Femoroacetabular e perda de controle rotacional.'
      });
    }
  }

  // 2.3 Razão I:Q (Isquiotibiais / Quadríceps)
  const isquios = getForca('Joelho', 'Flexão');
  const quad = getForca('Joelho', 'Extensão');
  if (isquios.max > 0 && quad.max > 0) {
    const ratioIQ = isquios.max / quad.max;
    if (ratioIQ < 0.60) {
      alerts.push({
        tipo: 'critico',
        titulo: 'Razão I:Q Crítica (< 60%)',
        articulacao: 'Joelho',
        valorCalculado: `${(ratioIQ * 100).toFixed(0)}%`,
        referenciaIdeal: '60% - 75%',
        descricao: `Isquiotibiais representam ${(ratioIQ * 100).toFixed(0)}% da força do quadríceps.`,
        riscoClinico: 'Risco crítico de ruptura de LCA e estiramento de isquiotibiais (2 a 8x maior com lesão pregressa).'
      });
    }
  }

  // 2.4 Força Relativa de Quadríceps (% Peso Corporal)
  if (quad.max > 0 && pesoKg > 0) {
    const quadPc = (quad.max / 9.80665) / pesoKg * 100;
    const minPc = sexo === 'M' ? 70 : 60;
    if (quadPc < minPc) {
      alerts.push({
        tipo: 'critico',
        titulo: `Força de Quadríceps Abaixo do Ideal (< ${minPc}% PC)`,
        articulacao: 'Joelho',
        valorCalculado: `${quadPc.toFixed(1)}% PC`,
        referenciaIdeal: `> ${minPc}% do Peso Corporal (${sexo === 'M' ? 'Homens' : 'Mulheres'})`,
        descricao: `Quadríceps atingiu ${quadPc.toFixed(1)}% do peso corporal.`,
        riscoClinico: 'Sobrecarga femoropatelar, instabilidade articular e risco aumentado de lesão de joelho.'
      });
    }
  }

  // 2.5 Força de Glúteo Médio / Abdutores (% Peso Corporal)
  if (abdutores.max > 0 && pesoKg > 0) {
    const glutPc = (abdutores.max / 9.80665) / pesoKg * 100;
    const minGlut = sexo === 'M' ? 25 : 20;
    if (glutPc < minGlut) {
      alerts.push({
        tipo: 'critico',
        titulo: `Glúteo Médio Fraco (< ${minGlut}% PC)`,
        articulacao: 'Quadril',
        valorCalculado: `${glutPc.toFixed(1)}% PC`,
        referenciaIdeal: `> ${minGlut}% do Peso Corporal`,
        descricao: `Glúteo médio/abdutores atingiram apenas ${glutPc.toFixed(1)}% do peso.`,
        riscoClinico: 'Forte correlação com Síndrome da Dor Patelofemoral (SDPF) e valgo dinâmico.'
      });
    }
  }

  // 2.6 Tronco — Extensão, Flexão e Rotação
  const extTronco = getForca('Coluna / Tronco', 'Extensão');
  const flexTronco = getForca('Coluna / Tronco', 'Flexão');
  const rotTronco = getForca('Coluna / Tronco', 'Rotação');

  if (extTronco.max > 0 && pesoKg > 0) {
    const extTroncoPc = (extTronco.max / 9.80665) / pesoKg * 100;
    if (extTroncoPc < 100) {
      alerts.push({
        tipo: 'atencao',
        titulo: 'Extensão de Tronco Fraca (< 100% PC)',
        articulacao: 'Coluna',
        valorCalculado: `${extTroncoPc.toFixed(0)}% PC`,
        referenciaIdeal: '≥ 100% do Peso Corporal',
        descricao: `Extensores paravertebrais atingiram ${extTroncoPc.toFixed(0)}% do peso corporal.`,
        riscoClinico: 'Predisposição a dor lombar crônica e fadiga postural.'
      });
    }
  }

  if (flexTronco.max > 0 && extTronco.max > 0) {
    const ratioFlexExtTronco = flexTronco.max / extTronco.max;
    if (ratioFlexExtTronco < 0.70 || ratioFlexExtTronco > 0.85) {
      alerts.push({
        tipo: 'atencao',
        titulo: 'Desequilíbrio Flexão / Extensão de Tronco',
        articulacao: 'Coluna',
        valorCalculado: ratioFlexExtTronco.toFixed(2),
        referenciaIdeal: '0.70 - 0.80',
        descricao: `Razão flexores/extensores de tronco em ${ratioFlexExtTronco.toFixed(2)}.`,
        riscoClinico: 'Desequilíbrio de carga na coluna lombar e aumento do estresse discal.'
      });
    }
  }

  if (rotTronco.D > 0 && rotTronco.E > 0) {
    const diffRot = Math.abs(rotTronco.D - rotTronco.E) / Math.max(rotTronco.D, rotTronco.E) * 100;
    if (diffRot > 10) {
      alerts.push({
        tipo: 'atencao',
        titulo: 'Assimetria de Rotação de Tronco (> 10%)',
        articulacao: 'Coluna',
        valorCalculado: `${diffRot.toFixed(0)}%`,
        referenciaIdeal: '≤ 10%',
        descricao: `Assimetria rotacional entre lado direito e esquerdo de ${diffRot.toFixed(0)}%.`,
        riscoClinico: 'Sobrecarga assimétrica nos discos intervertebrais e dor lombar unilateral.'
      });
    }
  }

  // 2.7 Membro Superior — Remada / Supino & Puxada / Desenvolvimento
  const remada = getForca('Membro Superior', 'Remada');
  const supino = getForca('Membro Superior', 'Supino');
  if (remada.max > 0 && supino.max > 0) {
    const ratioRemSup = remada.max / supino.max;
    if (ratioRemSup < 0.80) {
      alerts.push({
        tipo: 'atencao',
        titulo: 'Razão Remada / Supino Baixa (< 0.80)',
        articulacao: 'Ombro',
        valorCalculado: ratioRemSup.toFixed(2),
        referenciaIdeal: '≥ 0.80 - 1.0',
        descricao: `Remada representa ${(ratioRemSup * 100).toFixed(0)}% da carga do supino.`,
        riscoClinico: 'Protração escapular excessiva, instabilidade anterior e dor no ombro.'
      });
    }
  }

  const puxada = getForca('Membro Superior', 'Puxada');
  const desenv = getForca('Membro Superior', 'Desenvolvimento');
  if (puxada.max > 0 && desenv.max > 0) {
    const ratioPuxDes = puxada.max / desenv.max;
    if (ratioPuxDes < 1.0) {
      alerts.push({
        tipo: 'atencao',
        titulo: 'Fraqueza Escapular (Puxada / Desenvolvimento < 1.0)',
        articulacao: 'Ombro / Escápula',
        valorCalculado: ratioPuxDes.toFixed(2),
        referenciaIdeal: '≥ 1.0 - 1.1',
        descricao: `Relação vertical em ${ratioPuxDes.toFixed(2)}.`,
        riscoClinico: 'Fraqueza de estabilizadores escapulares (trapézio inferior e serrátil anterior).'
      });
    }
  }

  // 2.8 Ombro — Rotadores Externos / Internos (< 0.70)
  const rotExtOmbro = getForca('Ombro', 'Rotação Externa');
  const rotIntOmbro = getForca('Ombro', 'Rotação Interna');
  if (rotExtOmbro.max > 0 && rotIntOmbro.max > 0) {
    const ratioReRiOmbro = rotExtOmbro.max / rotIntOmbro.max;
    if (ratioReRiOmbro < 0.70) {
      alerts.push({
        tipo: 'critico',
        titulo: 'Razão Rotadores Ext / Int Ombro Baixa (< 0.70)',
        articulacao: 'Ombro',
        valorCalculado: ratioReRiOmbro.toFixed(2),
        referenciaIdeal: '0.70 - 0.85',
        descricao: `Rotadores externos representam ${(ratioReRiOmbro * 100).toFixed(0)}% dos internos.`,
        riscoClinico: 'Síndrome do Impacto Subacromial e tendinopatia do supraespinal.'
      });
    }
  }

  // 2.9 Tornozelo — Inversão/Eversão & Panturrilha/Tibial
  const inversao = getForca('Tornozelo', 'Inversão');
  const eversao = getForca('Tornozelo', 'Eversão');
  if (inversao.max > 0 && eversao.max > 0) {
    const diffInvEv = Math.abs(inversao.max - eversao.max) / Math.max(inversao.max, eversao.max) * 100;
    if (diffInvEv > 15) {
      alerts.push({
        tipo: 'atencao',
        titulo: 'Assimetria Inversão / Eversão de Tornozelo',
        articulacao: 'Tornozelo',
        valorCalculado: `${diffInvEv.toFixed(0)}%`,
        referenciaIdeal: 'Equilíbrio 1:1 (Dif ≤ 10%)',
        descricao: `Diferença de ${diffInvEv.toFixed(0)}% entre inversores e eversores.`,
        riscoClinico: 'Risco de entorse de tornozelo por instabilidade ligamentar lateral.'
      });
    }
  }

  const panturrilha = getForca('Tornozelo', 'Flexão Plantar');
  const tibial = getForca('Tornozelo', 'Dorsiflexão');
  if (panturrilha.max > 0 && tibial.max > 0) {
    const ratioPantTib = panturrilha.max / tibial.max;
    if (ratioPantTib < 2.5 || ratioPantTib > 4.5) {
      alerts.push({
        tipo: 'atencao',
        titulo: 'Razão Panturrilha / Tibial Fora do Padrão',
        articulacao: 'Tornozelo',
        valorCalculado: `${ratioPantTib.toFixed(1)} : 1`,
        referenciaIdeal: '3.4 : 1',
        descricao: `Razão flexores plantares/tibiais em ${ratioPantTib.toFixed(1)}:1.`,
        riscoClinico: 'Sobrecarga na tíbia (canelite) ou tendinopatia de Aquiles.'
      });
    }
  }

  // 2.10 NOVO ÍNDICE: ICAI (Capacidade de Absorção de Impacto)
  if (quad.max > 0 && pesoKg > 0) {
    const quadPc = (quad.max / 9.80665) / pesoKg * 100;
    const dfGonio = Number(extraData?.dorsiflexaoTornozelo || extraData?.goniometria?.tornozeloDorsiflexaoD || extraData?.testesEspeciais?.lungeTestD || 0);
    const lungeVal = Number(extraData?.lungeCm || extraData?.testesEspeciais?.lungeTestD || 0);
    if (quadPc < 60 && ((dfGonio > 0 && dfGonio < 35) || (lungeVal > 0 && lungeVal < 10))) {
      alerts.push(...calculateImpactAbsorptionCapacityAlerts({
        quadricepsPc: quadPc,
        dorsiflexaoGraus: dfGonio,
        lungeCm: lungeVal
      }));
    }
  }

  // 2.11 NOVO ÍNDICE: CORE COMPLEX (Estabilidade Lombopélvica de Janda)
  const extTroncoForce = getForca('Coluna / Tronco', 'Extensão').max || getForca('Tronco', 'Extensão').max || getForca('Coluna', 'Extensão').max;
  const flexTroncoForce = getForca('Coluna / Tronco', 'Flexão').max || getForca('Tronco', 'Flexão').max || getForca('Coluna', 'Flexão').max;
  const extTroncoPc = extTroncoForce > 0 && pesoKg > 0 ? (extTroncoForce / 9.80665) / pesoKg * 100 : 0;
  const isThomas = extraData?.thomasPositivo === true || 
                   extraData?.testesEspeciais?.thomasIliopsoasDStatus === 'positivo' || 
                   extraData?.testesEspeciais?.thomasIliopsoasEStatus === 'positivo';
  if (isThomas && extTroncoPc > 0 && extTroncoPc < 100) {
    alerts.push(...calculateLumbopelvicStabilityAlerts({
      thomasPositivo: true,
      extensoresTroncoPc: extTroncoPc,
      razaoFlexExt: (flexTroncoForce > 0 && extTroncoForce > 0) ? (flexTroncoForce / extTroncoForce) : undefined
    }));
  }

  // 2.12 NOVO ÍNDICE: ISE (Saúde Escapulotorácica)
  const remadaForce = getForca('Membro Superior', 'Remada').max || getForca('Ombro', 'Remada').max || getForca('Tronco', 'Remada').max;
  const supinoForce = getForca('Membro Superior', 'Supino').max || getForca('Ombro', 'Supino').max || getForca('Tórax', 'Supino').max;
  const disc = extraData?.discinesiaEscapular || extraData?.testesEspeciais?.discinesiaEscapular || extraData?.testesEspeciais?.kibler;
  if (disc && remadaForce > 0 && supinoForce > 0 && (remadaForce / supinoForce) < 0.80) {
    alerts.push(...calculateScapulothoracicHealthAlerts({
      discinesiaTipo: String(disc),
      razaoRemadaSupino: remadaForce / supinoForce,
      remadaN: remadaForce,
      supinoN: supinoForce
    }));
  }

  return alerts;
}

/**
 * 3. Análise Clínica e Alertas do Y-Balance Test (Y-Test) em Tempo Real
 */
export interface YTestAnalysis {
  compostoD: number;
  compostoE: number;
  assimetriaAnt: number;
  assimetriaPM: number;
  assimetriaPL: number;
  assimetriaComposta: number;
  alerts: BiomechanicAlert[];
}

export function calculateYTestAnalysis(data: {
  lenD?: number | string;
  lenE?: number | string;
  antD?: number | string;
  antE?: number | string;
  pmD?: number | string;
  pmE?: number | string;
  plD?: number | string;
  plE?: number | string;
}): YTestAnalysis {
  const toNum = (v: any) => Number(v) || 0;
  const lenD = toNum(data.lenD);
  const lenE = toNum(data.lenE);
  const antD = toNum(data.antD);
  const antE = toNum(data.antE);
  const pmD = toNum(data.pmD);
  const pmE = toNum(data.pmE);
  const plD = toNum(data.plD);
  const plE = toNum(data.plE);

  const somaD = antD + pmD + plD;
  const somaE = antE + pmE + plE;

  const compostoD = lenD > 0 && somaD > 0 ? Number(((somaD / (3 * lenD)) * 100).toFixed(1)) : 0;
  const compostoE = lenE > 0 && somaE > 0 ? Number(((somaE / (3 * lenE)) * 100).toFixed(1)) : 0;

  const assimetriaAnt = (antD > 0 && antE > 0) ? Number(Math.abs(antD - antE).toFixed(1)) : 0;
  const assimetriaPM = (pmD > 0 && pmE > 0) ? Number(Math.abs(pmD - pmE).toFixed(1)) : 0;
  const assimetriaPL = (plD > 0 && plE > 0) ? Number(Math.abs(plD - plE).toFixed(1)) : 0;
  const assimetriaComposta = (compostoD > 0 && compostoE > 0) ? Number(Math.abs(compostoD - compostoE).toFixed(1)) : 0;

  const alerts: BiomechanicAlert[] = [];

  if (assimetriaAnt >= 4.0) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Assimetria Anterior Crítica (≥ 4.0 cm)',
      articulacao: 'Membro Inferior / Joelho',
      lado: antD < antE ? 'Direito' : 'Esquerdo',
      valorCalculado: `${assimetriaAnt} cm`,
      referenciaIdeal: '< 4.0 cm',
      descricao: `Diferença de ${assimetriaAnt} cm no alcance anterior entre os membros.`,
      riscoClinico: '2.5x a 3.8x mais chance de lesão ligamentar de membro inferior (especialmente LCA).'
    });
  } else if (assimetriaAnt >= 3.0) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Leve Assimetria Anterior (3.0 a 3.9 cm)',
      articulacao: 'Membro Inferior',
      lado: antD < antE ? 'Direito' : 'Esquerdo',
      valorCalculado: `${assimetriaAnt} cm`,
      referenciaIdeal: '< 4.0 cm',
      descricao: `Diferença de ${assimetriaAnt} cm em alcance anterior.`,
      riscoClinico: 'Atenção ao controle de estabilidade unipodal na desaceleração.'
    });
  }

  if (assimetriaPM >= 6.0 || assimetriaPL >= 6.0) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Assimetria Posterior Relevante (≥ 6.0 cm)',
      articulacao: 'Quadril / Tornozelo',
      lado: 'Bilateral',
      valorCalculado: `PM: ${assimetriaPM}cm | PL: ${assimetriaPL}cm`,
      referenciaIdeal: '< 6.0 cm',
      descricao: 'Diferença significativa nos alcances posteromediais ou posterolaterais.',
      riscoClinico: 'Déficit de mobilidade rotacional e estabilidade dinâmica do quadril e tornozelo.'
    });
  }

  if ((compostoD > 0 && compostoD < 94) || (compostoE > 0 && compostoE < 94)) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Escore Composto Abaixo do Ideal (< 94%)',
      articulacao: 'Global Unipodal',
      lado: compostoD < 94 && compostoE < 94 ? 'Bilateral' : compostoD < 94 ? 'Direito' : 'Esquerdo',
      valorCalculado: `D: ${compostoD}% | E: ${compostoE}%`,
      referenciaIdeal: '≥ 94% - 100%',
      descricao: 'Escore composto relativo ao comprimento do membro inferior reduzido.',
      riscoClinico: 'Menor equilíbrio dinâmico global e menor capacidade de amortecimento de impacto.'
    });
  }

  return {
    compostoD,
    compostoE,
    assimetriaAnt,
    assimetriaPM,
    assimetriaPL,
    assimetriaComposta,
    alerts
  };
}

/**
 * 4. Análise Clínica e Alertas do Step Down Test em Tempo Real
 * Baseado na metodologia de controle cinemático (Piva et al., Herman et al., Earl et al.)
 * O score real é uma contagem de erros (0 a 4 pontos por membro) e não a soma direta de graus angulares.
 */
export interface StepDownAnalysis {
  scoreD: number;
  scoreE: number;
  classificacaoD: string;
  classificacaoE: string;
  alerts: BiomechanicAlert[];
}

export function calculateStepDownAnalysis(data: {
  pelvicaD?: number | string;
  pelvicaE?: number | string;
  aducaoD?: number | string;
  aducaoE?: number | string;
  valgoD?: number | string;
  valgoE?: number | string;
  varoD?: number | string;
  varoE?: number | string;
  prpsD?: number | string;
  prpsE?: number | string;
  sexo?: string;
}): StepDownAnalysis {
  const toNum = (v: any) => (v !== '' && v !== null && v !== undefined && !isNaN(Number(v))) ? Number(v) : null;
  const pelvicaD = toNum(data.pelvicaD);
  const pelvicaE = toNum(data.pelvicaE);
  const aducaoD = toNum(data.aducaoD);
  const aducaoE = toNum(data.aducaoE);
  const valgoD = toNum(data.valgoD);
  const valgoE = toNum(data.valgoE);
  const varoD = toNum(data.varoD);
  const varoE = toNum(data.varoE);
  const prpsD = toNum(data.prpsD);
  const prpsE = toNum(data.prpsE);
  const isFeminino = (data.sexo || '').trim().toUpperCase().startsWith('F');
  const valgoLimit = isFeminino ? 15 : 10;

  const alerts: BiomechanicAlert[] = [];

  // Avaliação de Erros por Critério Clínico
  let scoreD = 0;
  let scoreE = 0;

  // 1. Queda Pélvica (Ref: até 5°)
  if (pelvicaD !== null && pelvicaD > 5) {
    scoreD += 1;
    alerts.push({
      tipo: pelvicaD > 8 ? 'critico' : 'atencao',
      titulo: 'Queda Pélvica Excessiva no Step Down (> 5°)',
      articulacao: 'Quadril / Pelve',
      lado: 'Direito',
      valorCalculado: `${pelvicaD}°`,
      referenciaIdeal: '≤ 5°',
      descricao: `Queda pélvica de ${pelvicaD}° no apoio unipodal direito.`,
      riscoClinico: 'Indica fraqueza de abdutores/glúteo médio contralateral ou instabilidade do core.'
    });
  }
  if (pelvicaE !== null && pelvicaE > 5) {
    scoreE += 1;
    alerts.push({
      tipo: pelvicaE > 8 ? 'critico' : 'atencao',
      titulo: 'Queda Pélvica Excessiva no Step Down (> 5°)',
      articulacao: 'Quadril / Pelve',
      lado: 'Esquerdo',
      valorCalculado: `${pelvicaE}°`,
      referenciaIdeal: '≤ 5°',
      descricao: `Queda pélvica de ${pelvicaE}° no apoio unipodal esquerdo.`,
      riscoClinico: 'Indica fraqueza de abdutores/glúteo médio contralateral ou instabilidade do core.'
    });
  }

  // 2. Adução do Quadril (Ref: até 10°)
  if (aducaoD !== null && aducaoD > 10) {
    scoreD += 1;
    alerts.push({
      tipo: aducaoD > 15 ? 'critico' : 'atencao',
      titulo: 'Adução do Quadril Aumentada no Step Down (> 10°)',
      articulacao: 'Quadril',
      lado: 'Direito',
      valorCalculado: `${aducaoD}°`,
      referenciaIdeal: '≤ 10°',
      descricao: `Adução femoral de ${aducaoD}° no apoio unipodal direito.`,
      riscoClinico: 'Sobrecarga no trato iliotibial (STIT) e aumento do vetor de valgo no joelho.'
    });
  }
  if (aducaoE !== null && aducaoE > 10) {
    scoreE += 1;
    alerts.push({
      tipo: aducaoE > 15 ? 'critico' : 'atencao',
      titulo: 'Adução do Quadril Aumentada no Step Down (> 10°)',
      articulacao: 'Quadril',
      lado: 'Esquerdo',
      valorCalculado: `${aducaoE}°`,
      referenciaIdeal: '≤ 10°',
      descricao: `Adução femoral de ${aducaoE}° no apoio unipodal esquerdo.`,
      riscoClinico: 'Sobrecarga no trato iliotibial (STIT) e aumento do vetor de valgo no joelho.'
    });
  }

  // 3. Valgo Dinâmico do Joelho (Ref: M ≤ 10° | F ≤ 15°)
  if (valgoD !== null && valgoD > valgoLimit) {
    scoreD += 1;
    alerts.push({
      tipo: valgoD > valgoLimit + 5 ? 'critico' : 'atencao',
      titulo: `Colapso em Valgo Dinâmico no Step Down (> ${valgoLimit}°)`,
      articulacao: 'Joelho',
      lado: 'Direito',
      valorCalculado: `${valgoD}°`,
      referenciaIdeal: `≤ ${valgoLimit}° (${isFeminino ? 'Feminino' : 'Masculino'})`,
      descricao: `Valgo de joelho de ${valgoD}° durante a descida excêntrica.`,
      riscoClinico: 'Forte correlação com Síndrome da Dor Patelofemoral (SDPF), estresse de LCA e menisco lateral.'
    });
  }
  if (valgoE !== null && valgoE > valgoLimit) {
    scoreE += 1;
    alerts.push({
      tipo: valgoE > valgoLimit + 5 ? 'critico' : 'atencao',
      titulo: `Colapso em Valgo Dinâmico no Step Down (> ${valgoLimit}°)`,
      articulacao: 'Joelho',
      lado: 'Esquerdo',
      valorCalculado: `${valgoE}°`,
      referenciaIdeal: `≤ ${valgoLimit}° (${isFeminino ? 'Feminino' : 'Masculino'})`,
      descricao: `Valgo de joelho de ${valgoE}° durante a descida excêntrica.`,
      riscoClinico: 'Forte correlação com Síndrome da Dor Patelofemoral (SDPF), estresse de LCA e menisco lateral.'
    });
  }

  // 3.1 Varo de Joelho (Ref: até 5° | Acima de 5°: RISCO DE LESÃO)
  if (varoD !== null && varoD > 5) {
    scoreD += 1;
    alerts.push({
      tipo: 'critico',
      titulo: 'RISCO DE LESÃO: Varo de Joelho Excessivo no Step Down (> 5°)',
      articulacao: 'Joelho',
      lado: 'Direito',
      valorCalculado: `${varoD}°`,
      referenciaIdeal: '≤ 5°',
      descricao: `Varo de joelho de ${varoD}° durante a descida unipodal direita.`,
      riscoClinico: 'RISCO DE LESÃO: Sobrecarga acentuada no compartimento femorotibial medial, cisalhamento no menisco medial e estresse no ligamento colateral lateral (LCL).'
    });
  }
  if (varoE !== null && varoE > 5) {
    scoreE += 1;
    alerts.push({
      tipo: 'critico',
      titulo: 'RISCO DE LESÃO: Varo de Joelho Excessivo no Step Down (> 5°)',
      articulacao: 'Joelho',
      lado: 'Esquerdo',
      valorCalculado: `${varoE}°`,
      referenciaIdeal: '≤ 5°',
      descricao: `Varo de joelho de ${varoE}° durante a descida unipodal esquerda.`,
      riscoClinico: 'RISCO DE LESÃO: Sobrecarga acentuada no compartimento femorotibial medial, cisalhamento no menisco medial e estresse no ligamento colateral lateral (LCL).'
    });
  }

  // 4. Ângulo Excêntrico / PRPS (Ref: acima de 60°)
  if (prpsD !== null && prpsD > 0 && prpsD < 60) {
    scoreD += 1;
    alerts.push({
      tipo: 'atencao',
      titulo: 'Amplitude Excêntrica Reduzida no Step Down (< 60°)',
      articulacao: 'Joelho / Tornozelo',
      lado: 'Direito',
      valorCalculado: `${prpsD}°`,
      referenciaIdeal: '≥ 60°',
      descricao: `Flexão excêntrica de apenas ${prpsD}° antes de compensar.`,
      riscoClinico: 'Déficit de dorsiflexão de tornozelo ou fraqueza excêntrica de quadríceps.'
    });
  }
  if (prpsE !== null && prpsE > 0 && prpsE < 60) {
    scoreE += 1;
    alerts.push({
      tipo: 'atencao',
      titulo: 'Amplitude Excêntrica Reduzida no Step Down (< 60°)',
      articulacao: 'Joelho / Tornozelo',
      lado: 'Esquerdo',
      valorCalculado: `${prpsE}°`,
      referenciaIdeal: '≥ 60°',
      descricao: `Flexão excêntrica de apenas ${prpsE}° antes de compensar.`,
      riscoClinico: 'Déficit de dorsiflexão de tornozelo ou fraqueza excêntrica de quadríceps.'
    });
  }

  const getClass = (score: number) => {
    if (score <= 1) return 'Excelente / Bom (0 a 1 erro)';
    if (score === 2) return 'Moderado (2 erros)';
    return 'Pobre / Risco Elevado (≥ 3 erros)';
  };

  const classificacaoD = getClass(scoreD);
  const classificacaoE = getClass(scoreE);

  // Alerta global somente se houver falhas múltiplas (≥ 3 erros)
  if (scoreD >= 3 || scoreE >= 3) {
    alerts.unshift({
      tipo: 'critico',
      titulo: 'Controle Cinemático Global Pobre no Step Down (≥ 3 Erros)',
      articulacao: 'Membro Inferior',
      lado: scoreD >= 3 && scoreE >= 3 ? 'Bilateral' : scoreD >= 3 ? 'Direito' : 'Esquerdo',
      valorCalculado: `D: ${scoreD}/4 erros | E: ${scoreE}/4 erros`,
      referenciaIdeal: '0 a 1 erro (Bom)',
      descricao: 'Múltiplas compensações biomecânicas simultâneas observadas no teste.',
      riscoClinico: 'Elevada sobrecarga articular no joelho, quadril e tornozelo durante desacelerações.'
    });
  }

  return {
    scoreD,
    scoreE,
    classificacaoD,
    classificacaoE,
    alerts
  };
}

/**
 * 5. Análise do Teste de Thomas em Tempo Real
 */
export function calculateThomasAlerts(data: {
  thomasIliopsoasDStatus?: string;
  thomasIliopsoasEStatus?: string;
  thomasRetofemoralDStatus?: string;
  thomasRetofemoralEStatus?: string;
  thomasIliopsoasD?: number | string;
  thomasIliopsoasE?: number | string;
  thomasRetofemoralD?: number | string;
  thomasRetofemoralE?: number | string;
}): BiomechanicAlert[] {
  const alerts: BiomechanicAlert[] = [];
  const toNum = (v: any) => Number(v) || 0;

  const ilioD = toNum(data.thomasIliopsoasD);
  const ilioE = toNum(data.thomasIliopsoasE);
  const retoD = toNum(data.thomasRetofemoralD);
  const retoE = toNum(data.thomasRetofemoralE);

  const statusIlioD = String(data.thomasIliopsoasDStatus || '').toLowerCase();
  const statusIlioE = String(data.thomasIliopsoasEStatus || '').toLowerCase();
  const statusRetoD = String(data.thomasRetofemoralDStatus || '').toLowerCase();
  const statusRetoE = String(data.thomasRetofemoralEStatus || '').toLowerCase();

  if (statusIlioD === 'positivo' || ilioD > 5) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Encurtamento de Iliopsoas Direito',
      articulacao: 'Quadril',
      lado: 'Direito',
      valorCalculado: ilioD > 0 ? `${ilioD}°` : 'Positivo',
      referenciaIdeal: '0° (Coxa apoiada na maca)',
      descricao: 'Coxa direita não atinge o plano horizontal da maca.',
      riscoClinico: 'Hiperlordose lombar compensatória, dor lombar e inibição glútea recíproca.'
    });
  }

  if (statusIlioE === 'positivo' || ilioE > 5) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Encurtamento de Iliopsoas Esquerdo',
      articulacao: 'Quadril',
      lado: 'Esquerdo',
      valorCalculado: ilioE > 0 ? `${ilioE}°` : 'Positivo',
      referenciaIdeal: '0° (Coxa apoiada na maca)',
      descricao: 'Coxa esquerda não atinge o plano horizontal da maca.',
      riscoClinico: 'Hiperlordose lombar compensatória, dor lombar e inibição glútea recíproca.'
    });
  }

  if (statusRetoD === 'positivo' || (retoD > 0 && retoD < 80)) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Encurtamento de Retofemoral Direito',
      articulacao: 'Joelho / Quadril',
      lado: 'Direito',
      valorCalculado: retoD > 0 ? `${retoD}°` : 'Positivo',
      referenciaIdeal: '≥ 90° de flexão de joelho',
      descricao: 'Joelho direito não atinge 90° de flexão passiva.',
      riscoClinico: 'Tensão anterior no joelho, estresse no tendão patelar e sobrecarga femoropatelar.'
    });
  }

  if (statusRetoE === 'positivo' || (retoE > 0 && retoE < 80)) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Encurtamento de Retofemoral Esquerdo',
      articulacao: 'Joelho / Quadril',
      lado: 'Esquerdo',
      valorCalculado: retoE > 0 ? `${retoE}°` : 'Positivo',
      referenciaIdeal: '≥ 90° de flexão de joelho',
      descricao: 'Joelho esquerdo não atinge 90° de flexão passiva.',
      riscoClinico: 'Tensão anterior no joelho, estresse no tendão patelar e sobrecarga femoropatelar.'
    });
  }

  return alerts;
}

/**
 * 6. Análise do Teste de Ober em Tempo Real
 */
export function calculateOberAlerts(oberD: string, oberE: string): BiomechanicAlert[] {
  const alerts: BiomechanicAlert[] = [];
  const oD = String(oberD || '').toLowerCase();
  const oE = String(oberE || '').toLowerCase();
  if (oD === 'positivo') {
    alerts.push({
      tipo: 'critico',
      titulo: 'Teste de Ober Positivo (Direito)',
      articulacao: 'Quadril / Joelho',
      lado: 'Direito',
      referenciaIdeal: 'Negativo (Membro aduz livremente)',
      descricao: 'Retração do Trato Iliotibial e Tensor da Fáscia Lata no membro direito.',
      riscoClinico: 'Fricção do trato iliotibial no côndilo lateral do fêmur (STIT) e dor lateral de joelho.'
    });
  }
  if (oE === 'positivo') {
    alerts.push({
      tipo: 'critico',
      titulo: 'Teste de Ober Positivo (Esquerdo)',
      articulacao: 'Quadril / Joelho',
      lado: 'Esquerdo',
      referenciaIdeal: 'Negativo (Membro aduz livremente)',
      descricao: 'Retração do Trato Iliotibial e Tensor da Fáscia Lata no membro esquerdo.',
      riscoClinico: 'Fricção do trato iliotibial no côndilo lateral do fêmur (STIT) e dor lateral de joelho.'
    });
  }
  return alerts;
}

/**
 * 7. Índice de Capacidade de Absorção de Impacto (ICAI)
 * Cruza a força de Quadríceps (%PC) com a Dorsiflexão de Tornozelo em Carga (Lunge Test / Goniometria).
 * Se Quadríceps < 60% e Dorsiflexão < 35° -> Alerta Crítico.
 */
export function calculateImpactAbsorptionCapacityAlerts(data: {
  quadricepsPc?: number;
  dorsiflexaoGraus?: number;
  lungeCm?: number;
  lado?: 'Direito' | 'Esquerdo' | 'Bilateral';
}): BiomechanicAlert[] {
  const alerts: BiomechanicAlert[] = [];
  const quad = Number(data.quadricepsPc) || 0;
  const df = Number(data.dorsiflexaoGraus) || 0;
  const lunge = Number(data.lungeCm) || 0;

  // Condição: Quadríceps < 60% E (Dorsiflexão < 35° OU Lunge < 10cm)
  const hasDorsiflexionDeficit = (df > 0 && df < 35) || (lunge > 0 && lunge < 10);
  const hasQuadDeficit = quad > 0 && quad < 60;

  if (hasQuadDeficit && hasDorsiflexionDeficit) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Incapacidade de Amortecimento Excêntrico (ICAI)',
      articulacao: 'Joelho / Tornozelo',
      lado: data.lado || 'Bilateral',
      valorCalculado: `Quad: ${quad.toFixed(0)}% PC | DF: ${df > 0 ? df + '°' : lunge + ' cm'}`,
      referenciaIdeal: 'Quadríceps ≥ 60% PC | Dorsiflexão ≥ 35° (Lunge ≥ 10 cm)',
      descricao: `Força de quadríceps em ${quad.toFixed(0)}% do peso corporal associada a déficit de dorsiflexão em cadeia fechada (${df > 0 ? df + '°' : lunge + ' cm'}).`,
      riscoClinico: 'Incapacidade de Amortecimento Excêntrico; Proibir pliometria de alto impacto e saltos até restauração do arco articular.'
    });
  }

  return alerts;
}

/**
 * 8. Índice de Estabilidade Lombopélvica (CORE COMPLEX)
 * Cruza Força de Extensores de Tronco (%PC) + Razão Flex/Ext + Teste de Thomas.
 * Se Thomas (+) com Extensores < 100% -> Alerta Crítico.
 */
export function calculateLumbopelvicStabilityAlerts(data: {
  thomasPositivo?: boolean | string;
  extensoresTroncoPc?: number;
  razaoFlexExt?: number;
}): BiomechanicAlert[] {
  const alerts: BiomechanicAlert[] = [];
  const isThomasPos = data.thomasPositivo === true || data.thomasPositivo === 'positivo' || String(data.thomasPositivo).toLowerCase().includes('pos');
  const extTronco = Number(data.extensoresTroncoPc) || 0;
  const ratioFlexExt = Number(data.razaoFlexExt) || 0;

  if (isThomasPos && extTronco > 0 && extTronco < 100) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Síndrome Cruzada Pélvica de Janda (CORE COMPLEX)',
      articulacao: 'Coluna Lombar / Pelve / Quadril',
      lado: 'Bilateral',
      valorCalculado: `Thomas (+) | Ext. Tronco: ${extTronco.toFixed(0)}% PC${ratioFlexExt > 0 ? ` | Razão F/E: ${ratioFlexExt.toFixed(2)}` : ''}`,
      referenciaIdeal: 'Thomas Negativo | Extensores Tronco ≥ 100% PC | Razão Flex/Ext 0.70 - 0.80',
      descricao: `Encurtamento de flexores de quadril no Teste de Thomas com fraqueza da cadeia extensora do tronco (${extTronco.toFixed(0)}% PC).`,
      riscoClinico: 'Síndrome Cruzada Pélvica de Janda (Hiperlordose com inibição glútea e sobrecarga discal em L5-S1).'
    });
  }

  return alerts;
}

/**
 * 9. Índice de Saúde Escapulotorácica (ISE)
 * Cruza Discinesia Escapular (Kibler) + GIRD de Ombro + Razão Remada/Supino.
 * Se Discinesia Tipo I/II + Remada/Supino < 0.80 -> Alerta Crítico.
 */
export function calculateScapulothoracicHealthAlerts(data: {
  discinesiaTipo?: string;
  razaoRemadaSupino?: number;
  remadaN?: number;
  supinoN?: number;
  hasGird?: boolean;
}): BiomechanicAlert[] {
  const alerts: BiomechanicAlert[] = [];
  const disc = String(data.discinesiaTipo || '').trim().toUpperCase();
  const isDiscinesiaIouII = disc.includes('I') || disc.includes('II') || disc.includes('1') || disc.includes('2') || disc.includes('TIPO I') || disc.includes('TIPO II');
  
  let ratio = Number(data.razaoRemadaSupino) || 0;
  if (!ratio && data.remadaN && data.supinoN && data.supinoN > 0) {
    ratio = data.remadaN / data.supinoN;
  }

  if (isDiscinesiaIouII && ratio > 0 && ratio < 0.80) {
    alerts.push({
      tipo: 'critico',
      titulo: 'Risco Escapulotorácico Crítico (ISE)',
      articulacao: 'Ombro / Cintura Escapular',
      lado: 'Bilateral',
      valorCalculado: `Discinesia ${data.discinesiaTipo || 'Tipo I/II'} | Remada/Supino: ${(ratio * 100).toFixed(0)}%`,
      referenciaIdeal: 'Sem Discinesia (Tipo 0) | Razão Remada/Supino ≥ 0.80 - 1.0',
      descricao: `Discinesia escapular associada a predomínio excessivo de força de empurrar sobre puxar (${(ratio * 100).toFixed(0)}%).`,
      riscoClinico: 'Risco Crítico de Tendinopatia do Manguito e Bursite Subacromial em Exercícios de Empurre.'
    });
  }

  return alerts;
}

/**
 * 10. Avaliador Integrado Transdisciplinar
 * Cruza Força Muscular, Goniometria e Testes Especiais para disparar alertas completos e índices avançados (ICAI, CORE COMPLEX, ISE).
 */
export function calculateIntegratedCrossDisciplinaryAlerts(params: {
  goniometria?: any;
  testesEspeciais?: any;
  testesForcaList?: any[];
  pesoKg?: number;
  sexo?: 'M' | 'F';
}): BiomechanicAlert[] {
  const alerts: BiomechanicAlert[] = [];
  const g = params.goniometria || {};
  const te = params.testesEspeciais || {};
  const tf = params.testesForcaList || [];
  const peso = Number(params.pesoKg) || 70;
  const sexo = params.sexo || 'M';

  // 1. Alertas de Goniometria
  alerts.push(...calculateGoniometryAlerts(g));

  // 2. Alertas de Testes de Força
  alerts.push(...calculateStrengthTestAlerts(tf, peso, sexo));

  // 3. Alertas de Y-Test
  if (te.yTest) {
    const yRes = calculateYTestAnalysis(te.yTest);
    alerts.push(...yRes.alerts);
  }

  // 4. Alertas de Step Down
  if (te.stepDown) {
    const sdRes = calculateStepDownAnalysis({ ...te.stepDown, sexo });
    alerts.push(...sdRes.alerts);
  }

  // 5. Alertas de Thomas
  alerts.push(...calculateThomasAlerts(te));

  // 6. Alertas de Ober
  if (te.oberD || te.oberE) {
    alerts.push(...calculateOberAlerts(te.oberD, te.oberE));
  }

  // Extrair forças relevantes para os 3 novos índices
  const getForcaMax = (art: string, mov: string) => {
    const matching = tf.filter((t: any) => 
      (t.articulacao || '').toLowerCase().includes(art.toLowerCase()) && 
      (t.movimento || '').toLowerCase().includes(mov.toLowerCase())
    );
    if (matching.length === 0) return 0;
    return Math.max(...matching.map((t: any) => Number(t.forcaN) || (Number(t.valorObtido) * (t.unidade === 'kgf' ? 9.80665 : 1)) || 0));
  };

  const quadN = getForcaMax('Joelho', 'Extensão');
  const quadPc = quadN > 0 && peso > 0 ? (quadN / 9.80665) / peso * 100 : 0;

  const extTroncoN = getForcaMax('Coluna', 'Extensão') || getForcaMax('Tronco', 'Extensão');
  const flexTroncoN = getForcaMax('Coluna', 'Flexão') || getForcaMax('Tronco', 'Flexão');
  const extTroncoPc = extTroncoN > 0 && peso > 0 ? (extTroncoN / 9.80665) / peso * 100 : 0;
  const ratioFlexExt = flexTroncoN > 0 && extTroncoN > 0 ? flexTroncoN / extTroncoN : 0;

  const remadaN = getForcaMax('Ombro', 'Remada') || getForcaMax('Tronco', 'Remada') || getForcaMax('Escápula', 'Retração');
  const supinoN = getForcaMax('Ombro', 'Supino') || getForcaMax('Tórax', 'Supino') || getForcaMax('Ombro', 'Flexão');
  const ratioRemadaSupino = remadaN > 0 && supinoN > 0 ? remadaN / supinoN : 0;

  // Goniometria de Tornozelo / Lunge
  const getGonioNum = (v: any) => {
    if (!v) return 0;
    if (typeof v === 'object') return Number(v.semForca || v.ativo || v.comForca || v.passivo) || 0;
    return Number(v) || 0;
  };
  const dfD = getGonioNum(g.tornozeloDorsiflexaoD);
  const dfE = getGonioNum(g.tornozeloDorsiflexaoE);
  const minDf = dfD > 0 && dfE > 0 ? Math.min(dfD, dfE) : (dfD || dfE || 0);
  const lungeMin = Math.min(Number(te.lungeTestD) || 99, Number(te.lungeTestE) || 99);

  // 7. NOVO ÍNDICE: ICAI (Capacidade de Absorção de Impacto)
  if (quadPc > 0 && (minDf > 0 || lungeMin < 99)) {
    alerts.push(...calculateImpactAbsorptionCapacityAlerts({
      quadricepsPc: quadPc,
      dorsiflexaoGraus: minDf,
      lungeCm: lungeMin < 99 ? lungeMin : undefined
    }));
  }

  // 8. NOVO ÍNDICE: CORE COMPLEX (Estabilidade Lombopélvica de Janda)
  const isThomasPos = te.thomasIliopsoasDStatus === 'positivo' || te.thomasIliopsoasEStatus === 'positivo' || 
                      te.thomasRetofemoralDStatus === 'positivo' || te.thomasRetofemoralEStatus === 'positivo';
  if (isThomasPos && extTroncoPc > 0) {
    alerts.push(...calculateLumbopelvicStabilityAlerts({
      thomasPositivo: true,
      extensoresTroncoPc: extTroncoPc,
      razaoFlexExt: ratioFlexExt
    }));
  }

  // 9. NOVO ÍNDICE: ISE (Saúde Escapulotorácica)
  const discinesia = te.discinesiaEscapular || te.kibler || te.discinesia;
  if (discinesia && ratioRemadaSupino > 0) {
    alerts.push(...calculateScapulothoracicHealthAlerts({
      discinesiaTipo: String(discinesia),
      razaoRemadaSupino: ratioRemadaSupino,
      remadaN,
      supinoN
    }));
  }

  return alerts;
}

/**
 * 10. MOTOR DE EVOLUÇÃO TEMPORAL & COMPARATIVO CIENTÍFICO DE FORÇA
 * Cruza o teste atual com o teste anterior para extrair deltas de força, ganho percentual,
 * evolução de simetria bilateral e transição funcional entre ciclos de avaliação.
 */
export interface StrengthEvolutionItem {
  articulacao: string;
  movimento: string;
  lado: string;
  forcaAntN: number | null;
  forcaAntKgf: number | null;
  forcaAtualN: number;
  forcaAtualKgf: number;
  deltaN: number | null;
  deltaKgf: number | null;
  deltaPct: number | null;
  classificacaoAnt?: string;
  classificacaoAtual?: string;
  pcPercentAnt?: number | null;
  pcPercentAtual?: number | null;
  status: 'melhora' | 'estavel' | 'regressao' | 'novo';
}

export interface SymmetryEvolutionItem {
  articulacao: string;
  movimento: string;
  simetriaAnt: number | null;
  simetriaAtual: number;
  deficitAnt: number | null;
  deficitAtual: number;
  deltaSimetria: number | null;
  classificacaoAnt?: string;
  classificacaoAtual?: string;
  status: 'excelente' | 'aceitavel' | 'atencao' | 'assimetria';
}

export interface RatioEvolutionItem {
  nome: string;
  articulacao: string;
  referencia: string;
  valorAnt: string | null;
  valorAtual: string;
  delta: string | null;
  status: 'EQUILIBRADO' | 'ATENÇÃO' | 'RISCO CRÍTICO';
  badgeClass: string;
}

export interface StrengthEvolutionReport {
  hasPrevious: boolean;
  dataAnterior?: string;
  dataAtual: string;
  diasIntervalo?: number;
  pesoAnterior?: number;
  pesoAtual: number;
  items: StrengthEvolutionItem[];
  symmetries: SymmetryEvolutionItem[];
  ratios: RatioEvolutionItem[];
  kpis: {
    maiorGanhoPct: number;
    maiorGanhoNome: string;
    mediaGanhoPct: number;
    simetriaMediaAtual: number;
    simetriaMediaAnt: number | null;
    totalMovimentosAvaliados: number;
    totalMelhoras: number;
    alertasMitigadosCount: number;
  };
}

function normalizeKey(str: string): string {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function normalizeSide(side: string): string {
  const s = String(side || '').toLowerCase().trim();
  if (s.startsWith('d')) return 'Direito';
  if (s.startsWith('e')) return 'Esquerdo';
  return side;
}

export function calculateStrengthEvolutionComparison(
  currSt: any,
  prevSt: any,
  clientWeightCurrent?: number,
  clientWeightPrevious?: number
): StrengthEvolutionReport {
  const dataAtual = currSt?.data || (currSt?.createdAt ? String(currSt.createdAt).split('T')[0] : '');
  const dataAnterior = prevSt?.data || (prevSt?.createdAt ? String(prevSt.createdAt).split('T')[0] : '');
  
  const pesoAtual = Number(currSt?.pesoCliente || clientWeightCurrent || 70);
  const pesoAnterior = prevSt ? Number(prevSt?.pesoCliente || clientWeightPrevious || pesoAtual) : undefined;

  let diasIntervalo: number | undefined = undefined;
  if (dataAtual && dataAnterior) {
    try {
      const d1 = new Date(dataAtual);
      const d2 = new Date(dataAnterior);
      const diffMs = Math.abs(d1.getTime() - d2.getTime());
      diasIntervalo = Math.round(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      diasIntervalo = undefined;
    }
  }

  // Extrair lista de testes atuais
  const currTests: any[] = currSt?.testesRealizados || [];
  const prevTests: any[] = prevSt?.testesRealizados || [];

  const hasPrevious = Boolean(prevSt && (prevTests.length > 0 || (prevSt.exercicios && prevSt.exercicios.length > 0)));

  // Mapear testes anteriores por chave: articulacao + movimento + lado
  const prevMap: Record<string, any> = {};
  prevTests.forEach(t => {
    const k = `${normalizeKey(t.articulacao)}_${normalizeKey(t.movimento)}_${normalizeSide(t.lado)}`;
    prevMap[k] = t;
  });

  const items: StrengthEvolutionItem[] = [];
  let sumGainsPct = 0;
  let countGainsPct = 0;
  let maiorGanhoPct = 0;
  let maiorGanhoNome = '';
  let totalMelhoras = 0;

  currTests.forEach(curr => {
    const k = `${normalizeKey(curr.articulacao)}_${normalizeKey(curr.movimento)}_${normalizeSide(curr.lado)}`;
    const prev = prevMap[k];

    const forcaAtualN = Number(curr.forcaN ?? curr.valorObtido ?? 0);
    const forcaAtualKgf = Number((forcaAtualN / 9.80665).toFixed(1));

    let forcaAntN: number | null = null;
    let forcaAntKgf: number | null = null;
    let deltaN: number | null = null;
    let deltaKgf: number | null = null;
    let deltaPct: number | null = null;
    let status: 'melhora' | 'estavel' | 'regressao' | 'novo' = 'novo';

    if (prev) {
      forcaAntN = Number(prev.forcaN ?? prev.valorObtido ?? 0);
      forcaAntKgf = Number((forcaAntN / 9.80665).toFixed(1));
      deltaN = Number((forcaAtualN - forcaAntN).toFixed(1));
      deltaKgf = Number((forcaAtualKgf - forcaAntKgf).toFixed(1));

      if (forcaAntN > 0) {
        deltaPct = Number(((deltaN / forcaAntN) * 100).toFixed(1));
        sumGainsPct += deltaPct;
        countGainsPct++;

        if (deltaPct > maiorGanhoPct) {
          maiorGanhoPct = deltaPct;
          maiorGanhoNome = `${curr.articulacao} - ${curr.movimento} (${curr.lado})`;
        }

        if (deltaPct > 2.0) {
          status = 'melhora';
          totalMelhoras++;
        } else if (deltaPct < -2.0) {
          status = 'regressao';
        } else {
          status = 'estavel';
        }
      } else {
        status = forcaAtualN > 0 ? 'melhora' : 'estavel';
      }
    }

    items.push({
      articulacao: curr.articulacao,
      movimento: curr.movimento,
      lado: curr.lado,
      forcaAntN,
      forcaAntKgf,
      forcaAtualN,
      forcaAtualKgf,
      deltaN,
      deltaKgf,
      deltaPct,
      classificacaoAnt: prev?.classificacao,
      classificacaoAtual: curr.classificacao,
      pcPercentAnt: prev?.pcPercent,
      pcPercentAtual: curr.pcPercent,
      status
    });
  });

  // Mapear Simetrias Bilaterais
  const currComps: any[] = currSt?.comparativos || [];
  const prevComps: any[] = prevSt?.comparativos || [];
  const prevCompMap: Record<string, any> = {};

  prevComps.forEach(c => {
    const k = `${normalizeKey(c.articulacao)}_${normalizeKey(c.movimento)}`;
    prevCompMap[k] = c;
  });

  const symmetries: SymmetryEvolutionItem[] = [];
  let sumSimAtual = 0;
  let sumSimAnt = 0;
  let countSimAnt = 0;

  currComps.forEach(currC => {
    const k = `${normalizeKey(currC.articulacao)}_${normalizeKey(currC.movimento)}`;
    const prevC = prevCompMap[k];

    const simetriaAtual = Number(Number(currC.simetria ?? 100).toFixed(1));
    const deficitAtual = Number(Number(currC.deficit ?? 0).toFixed(1));
    sumSimAtual += simetriaAtual;

    let simetriaAnt: number | null = null;
    let deficitAnt: number | null = null;
    let deltaSimetria: number | null = null;

    if (prevC) {
      simetriaAnt = Number(Number(prevC.simetria ?? 100).toFixed(1));
      deficitAnt = Number(Number(prevC.deficit ?? 0).toFixed(1));
      deltaSimetria = Number((simetriaAtual - simetriaAnt).toFixed(1));
      sumSimAnt += simetriaAnt;
      countSimAnt++;
    }

    let status: 'excelente' | 'aceitavel' | 'atencao' | 'assimetria' = 'excelente';
    if (simetriaAtual < 85) status = 'assimetria';
    else if (simetriaAtual < 90) status = 'atencao';
    else if (simetriaAtual < 95) status = 'aceitavel';

    symmetries.push({
      articulacao: currC.articulacao,
      movimento: currC.movimento,
      simetriaAnt,
      simetriaAtual,
      deficitAnt,
      deficitAtual,
      deltaSimetria,
      classificacaoAnt: prevC?.classificacaoSimetria,
      classificacaoAtual: currC.classificacaoSimetria,
      status
    });
  });

  // Cálculo de Razões Biomecânicas (Atual vs Anterior)
  const getAvgForce = (tests: any[], art: string, mov: string): number => {
    const d = tests.find(t => normalizeKey(t.articulacao) === normalizeKey(art) && normalizeKey(t.movimento) === normalizeKey(mov) && normalizeSide(t.lado) === 'Direito');
    const e = tests.find(t => normalizeKey(t.articulacao) === normalizeKey(art) && normalizeKey(t.movimento) === normalizeKey(mov) && normalizeSide(t.lado) === 'Esquerdo');
    const vD = Number(d?.forcaN ?? d?.valorObtido ?? 0);
    const vE = Number(e?.forcaN ?? e?.valorObtido ?? 0);
    if (vD > 0 && vE > 0) return (vD + vE) / 2;
    return vD || vE || 0;
  };

  const ratios: RatioEvolutionItem[] = [];

  // Razão I:Q (Joelho)
  const extJCurr = getAvgForce(currTests, 'Joelho', 'Extensão');
  const flexJCurr = getAvgForce(currTests, 'Joelho', 'Flexão');
  const extJPrev = getAvgForce(prevTests, 'Joelho', 'Extensão');
  const flexJPrev = getAvgForce(prevTests, 'Joelho', 'Flexão');

  if (extJCurr > 0 && flexJCurr > 0) {
    const iqCurr = (flexJCurr / extJCurr) * 100;
    const iqPrev = extJPrev > 0 && flexJPrev > 0 ? (flexJPrev / extJPrev) * 100 : null;
    const isCrit = iqCurr < 60;
    const isAlt = iqCurr < 65 || iqCurr > 80;
    ratios.push({
      nome: 'Razão I:Q (Isquiotibiais / Quadríceps)',
      articulacao: 'Joelho',
      referencia: '60% a 75%',
      valorAnt: iqPrev !== null ? `${iqPrev.toFixed(1)}%` : null,
      valorAtual: `${iqCurr.toFixed(1)}%`,
      delta: iqPrev !== null ? `${(iqCurr - iqPrev) >= 0 ? '+' : ''}${(iqCurr - iqPrev).toFixed(1)}%` : null,
      status: isCrit ? 'RISCO CRÍTICO' : (isAlt ? 'ATENÇÃO' : 'EQUILIBRADO'),
      badgeClass: isCrit ? 'badge-red' : (isAlt ? 'badge-orange' : 'badge-green')
    });
  }

  // Razão Adutor / Abdutor (Quadril)
  const abdQCurr = getAvgForce(currTests, 'Quadril', 'Abdução');
  const addQCurr = getAvgForce(currTests, 'Quadril', 'Adução');
  const abdQPrev = getAvgForce(prevTests, 'Quadril', 'Abdução');
  const addQPrev = getAvgForce(prevTests, 'Quadril', 'Adução');

  if (abdQCurr > 0 && addQCurr > 0) {
    const ratioCurr = addQCurr / abdQCurr;
    const ratioPrev = abdQPrev > 0 && addQPrev > 0 ? addQPrev / abdQPrev : null;
    const isCrit = ratioCurr > 1.15 || ratioCurr < 0.80;
    ratios.push({
      nome: 'Razão Adutor / Abdutor',
      articulacao: 'Quadril',
      referencia: '0.80 a 1.15',
      valorAnt: ratioPrev !== null ? ratioPrev.toFixed(2) : null,
      valorAtual: ratioCurr.toFixed(2),
      delta: ratioPrev !== null ? `${(ratioCurr - ratioPrev) >= 0 ? '+' : ''}${(ratioCurr - ratioPrev).toFixed(2)}` : null,
      status: isCrit ? 'RISCO CRÍTICO' : 'EQUILIBRADO',
      badgeClass: isCrit ? 'badge-red' : 'badge-green'
    });
  }

  // Glúteo Médio Relativo (%PC)
  if (abdQCurr > 0 && pesoAtual > 0) {
    const gmPcCurr = (abdQCurr / 9.80665 / pesoAtual) * 100;
    const gmPcPrev = abdQPrev > 0 && pesoAnterior && pesoAnterior > 0 ? (abdQPrev / 9.80665 / pesoAnterior) * 100 : null;
    const isLow = gmPcCurr < 20;
    ratios.push({
      nome: 'Glúteo Médio Relativo (%PC)',
      articulacao: 'Quadril',
      referencia: '≥ 20% PC',
      valorAnt: gmPcPrev !== null ? `${gmPcPrev.toFixed(1)}% PC` : null,
      valorAtual: `${gmPcCurr.toFixed(1)}% PC`,
      delta: gmPcPrev !== null ? `${(gmPcCurr - gmPcPrev) >= 0 ? '+' : ''}${(gmPcCurr - gmPcPrev).toFixed(1)}%` : null,
      status: isLow ? 'ATENÇÃO' : 'EQUILIBRADO',
      badgeClass: isLow ? 'badge-orange' : 'badge-green'
    });
  }

  // Alertas mitigados
  const alertsCurr = calculateStrengthTestAlerts(currTests, pesoAtual, 'M');
  const alertsPrev = hasPrevious ? calculateStrengthTestAlerts(prevTests, pesoAnterior || pesoAtual, 'M') : [];
  const alertasMitigadosCount = Math.max(0, alertsPrev.length - alertsCurr.length);

  return {
    hasPrevious,
    dataAnterior,
    dataAtual,
    diasIntervalo,
    pesoAnterior,
    pesoAtual,
    items,
    symmetries,
    ratios,
    kpis: {
      maiorGanhoPct,
      maiorGanhoNome,
      mediaGanhoPct: countGainsPct > 0 ? Number((sumGainsPct / countGainsPct).toFixed(1)) : 0,
      simetriaMediaAtual: currComps.length > 0 ? Number((sumSimAtual / currComps.length).toFixed(1)) : 100,
      simetriaMediaAnt: countSimAnt > 0 ? Number((sumSimAnt / countSimAnt).toFixed(1)) : null,
      totalMovimentosAvaliados: currTests.length,
      totalMelhoras,
      alertasMitigadosCount
    }
  };
}

/**
 * 🌟 PROPOSTA 1 (Fase 1): Motor de Índices Dinamométricos Avançados & Força Relativa (% Peso Corporal)
 * Base Científica: Curso Avançado de Reabilitação e Fisioterapia Esportiva (Dra. Rutchelia Novais)
 */
export interface AdvancedStrengthRatioItem {
  id: 'hq' | 'add_abd' | 'ri_re_quad' | 'quad_pc' | 'gluteo_pc';
  nome: string;
  subtitulo: string;
  articulacao: string;
  valorD: number | null;
  valorE: number | null;
  valorGeral: number | null;
  unidade: string;
  referenciaMin: number;
  referenciaMax: number;
  referenciaFormatada: string;
  statusD: 'otimo' | 'atencao' | 'critico' | 'nao_avaliado';
  statusE: 'otimo' | 'atencao' | 'critico' | 'nao_avaliado';
  statusGeral: 'otimo' | 'atencao' | 'critico';
  diagnosticoClinico: string;
  diretrizTreinador: string;
}

export function calculateAdvancedStrengthRatios(
  testesList: any,
  pesoKg: number = 70,
  sexo: 'M' | 'F' = 'M'
): AdvancedStrengthRatioItem[] {
  const results: AdvancedStrengthRatioItem[] = [];
  if (!testesList) return results;

  let list: any[] = [];
  if (Array.isArray(testesList)) {
    list = testesList;
  } else if (typeof testesList === 'object') {
    list = Array.isArray(testesList.testesRealizados)
      ? testesList.testesRealizados
      : Array.isArray(testesList.exercicios)
      ? testesList.exercicios
      : Array.isArray(testesList.testes)
      ? testesList.testes
      : [];
  }

  if (list.length === 0) return results;

  const normalize = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Mapear movimentos para kgf
  const map: Record<string, { D: number; E: number; max: number }> = {};
  list.forEach(t => {
    if (!t) return;

    let art = normalize(t.articulacao);
    let mov = normalize(t.movimento);
    const combinedText = normalize(`${t.articulacao || ''} ${t.movimento || ''} ${t.nome || ''} ${t.exercicio || ''} ${t.teste || ''}`);

    if (!art || !mov) {
      if ((combinedText.includes('extens') || combinedText.includes('quadriceps')) && (combinedText.includes('joelho') || combinedText.includes('perna') || !art)) {
        art = 'joelho';
        mov = 'extensao';
      } else if ((combinedText.includes('flex') || combinedText.includes('isquio') || combinedText.includes('posterior')) && (combinedText.includes('joelho') || combinedText.includes('perna') || !art)) {
        art = 'joelho';
        mov = 'flexao';
      } else if ((combinedText.includes('abduc') || combinedText.includes('gluteo medio')) && (combinedText.includes('quadril') || !art)) {
        art = 'quadril';
        mov = 'abducao';
      } else if ((combinedText.includes('aduc') || combinedText.includes('adutor')) && (combinedText.includes('quadril') || !art)) {
        art = 'quadril';
        mov = 'aducao';
      } else if ((combinedText.includes('rotacao interna') || combinedText.includes('rotacao medial') || /\b(ri|rot\s*int|rot\s*med)\b/i.test(combinedText)) && (combinedText.includes('quadril') || !art)) {
        art = 'quadril';
        mov = 'rotacao interna';
      } else if ((combinedText.includes('rotacao externa') || combinedText.includes('rotacao lateral') || /\b(re|rot\s*ext|rot\s*lat)\b/i.test(combinedText)) && (combinedText.includes('quadril') || !art)) {
        art = 'quadril';
        mov = 'rotacao externa';
      }
    }

    if (!art || !mov) return;
    const key = `${art}_${mov}`;
    if (!map[key]) map[key] = { D: 0, E: 0, max: 0 };

    // Suporte a formato com colunas lado a lado (direito/esquerdo ou d/e)
    const rawValD = t.direito ?? t.d ?? t.valorD ?? t.forcaD ?? t.forcaDireita ?? null;
    const rawValE = t.esquerdo ?? t.e ?? t.valorE ?? t.forcaE ?? t.forcaEsquerda ?? null;

    const toKgf = (val: any) => {
      if (val == null || val === '') return 0;
      const n = Number(val);
      if (isNaN(n) || n <= 0) return 0;
      // Se unidade for Newton (ou se valor > 120 e não for kgf explícito, provável Newton)
      if (t.unidade === 'N' || (t.forcaN != null && n > 150)) {
        return n / 9.80665;
      }
      return n;
    };

    if (rawValD !== null || rawValE !== null) {
      if (rawValD !== null) {
        const kgfD = toKgf(rawValD);
        map[key].D = Math.max(map[key].D, kgfD);
        map[key].max = Math.max(map[key].max, kgfD);
      }
      if (rawValE !== null) {
        const kgfE = toKgf(rawValE);
        map[key].E = Math.max(map[key].E, kgfE);
        map[key].max = Math.max(map[key].max, kgfE);
      }
    } else {
      // Formato com linha individual por lado
      let kgf = 0;
      if (t.forcaN != null && Number(t.forcaN) > 0) {
        kgf = Number(t.forcaN) / 9.80665;
      } else if (t.forca != null && Number(t.forca) > 0) {
        kgf = toKgf(t.forca);
      } else if (t.valorObtido != null && Number(t.valorObtido) > 0) {
        kgf = toKgf(t.valorObtido);
      } else if (t.valor != null && Number(t.valor) > 0) {
        kgf = toKgf(t.valor);
      }

      const lado = normalize(t.lado);
      if (lado.startsWith('d') || lado === 'direito') {
        map[key].D = Math.max(map[key].D, kgf);
      } else if (lado.startsWith('e') || lado === 'esquerdo') {
        map[key].E = Math.max(map[key].E, kgf);
      }
      map[key].max = Math.max(map[key].max, kgf);
    }
  });

  const getF = (art: string, mov: string) => {
    const k = `${normalize(art)}_${normalize(mov)}`;
    return map[k] || { D: 0, E: 0, max: 0 };
  };

  const extJoelho = getF('Joelho', 'Extensão');
  const flexJoelho = getF('Joelho', 'Flexão');
  const abdQuadril = getF('Quadril', 'Abdução');
  const adQuadril = getF('Quadril', 'Adução');
  const rotIntQuad = getF('Quadril', 'Rotação Interna');
  const rotExtQuad = getF('Quadril', 'Rotação Externa');

  // 1. RAZÃO H:Q (Isquiotibiais / Quadríceps)
  const hasExtJ = extJoelho.max > 0;
  const hasFlexJ = flexJoelho.max > 0;
  if (hasExtJ && hasFlexJ) {
    const vD = (extJoelho.D > 0 && flexJoelho.D > 0) ? Math.round((flexJoelho.D / extJoelho.D) * 100) : null;
    const vE = (extJoelho.E > 0 && flexJoelho.E > 0) ? Math.round((flexJoelho.E / extJoelho.E) * 100) : null;
    const vTotExt = (extJoelho.D + extJoelho.E) || extJoelho.max;
    const vTotFlex = (flexJoelho.D + flexJoelho.E) || flexJoelho.max;
    const vGeral = vTotExt > 0 ? Math.round((vTotFlex / vTotExt) * 100) : null;

    const evalStatus = (v: number | null): 'otimo' | 'atencao' | 'critico' | 'nao_avaliado' => {
      if (v === null) return 'nao_avaliado';
      if (v < 60) return 'critico';
      if (v <= 75) return 'otimo';
      return 'atencao';
    };

    const sD = evalStatus(vD);
    const sE = evalStatus(vE);
    const sGeral = evalStatus(vGeral) === 'nao_avaliado' ? 'critico' : evalStatus(vGeral);

    let diag = 'Equilíbrio funcional preservado entre cadeia anterior e posterior do joelho.';
    let dir = 'Manter progressão balanceada de carga em flexores e extensores.';
    if (vGeral !== null && vGeral < 60) {
      diag = `Razão H:Q reduzida (${vGeral}%). Déficit de força de isquiotibiais em relação ao quadríceps. Risco acentuado de lesão de LCA e estiramento de posteriores.`;
      dir = 'Priorizar fortalecimento excêntrico de isquiotibiais (Nordic hamstring, stiff unilateral, mesa flexora controlada). Evitar dominância de quadríceps.';
    } else if (vGeral !== null && vGeral > 75) {
      diag = `Razão H:Q elevada (${vGeral}%). Predomínio de isquiotibiais sobre o quadríceps.`;
      dir = 'Aumentar estímulo de extensão de joelho (cadeira extensora, leg press) para recuperar a capacidade de frenagem do quadríceps.';
    }

    results.push({
      id: 'hq',
      nome: 'Razão H:Q (Isquiotibiais / Quadríceps)',
      subtitulo: 'Equilíbrio agonista/antagonista do joelho',
      articulacao: 'Joelho',
      valorD: vD,
      valorE: vE,
      valorGeral: vGeral,
      unidade: '%',
      referenciaMin: 60,
      referenciaMax: 75,
      referenciaFormatada: '60% – 75%',
      statusD: sD,
      statusE: sE,
      statusGeral: sGeral as any,
      diagnosticoClinico: diag,
      diretrizTreinador: dir
    });
  }

  // 2. ÍNDICE ADD/ABD (Adutores / Abdutores do Quadril)
  const hasAdQ = adQuadril.max > 0;
  const hasAbdQ = abdQuadril.max > 0;
  if (hasAdQ && hasAbdQ) {
    const vD = (abdQuadril.D > 0 && adQuadril.D > 0) ? Math.round((adQuadril.D / abdQuadril.D) * 100) / 100 : null;
    const vE = (abdQuadril.E > 0 && adQuadril.E > 0) ? Math.round((adQuadril.E / abdQuadril.E) * 100) / 100 : null;
    const vTotAbd = (abdQuadril.D + abdQuadril.E) || abdQuadril.max;
    const vTotAd = (adQuadril.D + adQuadril.E) || adQuadril.max;
    const vGeral = vTotAbd > 0 ? Math.round((vTotAd / vTotAbd) * 100) / 100 : null;

    const evalStatus = (v: number | null): 'otimo' | 'atencao' | 'critico' | 'nao_avaliado' => {
      if (v === null) return 'nao_avaliado';
      if (v < 0.80) return 'critico';
      if (v >= 1.05 && v <= 1.20) return 'otimo';
      return 'atencao';
    };

    const sD = evalStatus(vD);
    const sE = evalStatus(vE);
    const sGeral = evalStatus(vGeral) === 'nao_avaliado' ? 'critico' : evalStatus(vGeral);

    let diag = 'Razão Adutor/Abdutor adequada para estabilização pélvica e proteção pubo-adutora.';
    let dir = 'Manter estímulo simétrico em planos frontal e sagital.';
    if (vGeral !== null && vGeral < 0.80) {
      diag = `Déficit adutor expressivo (${vGeral.toFixed(2)}x). Risco elevado de dor inguinal, pubalgia e colapso dinâmico em valgo.`;
      dir = 'Adicionar fortalecimento específico de adutores (Copenhagen plank adaptada, adução em polia baixa com controle excêntrico).';
    } else if (vGeral !== null && vGeral > 1.20) {
      diag = `Predomínio adutor sobre abdutores (${vGeral.toFixed(2)}x). Possível sobrecarga medial do joelho.`;
      dir = 'Reforçar glúteo médio e mínimo (abdução com miniband, elevação pélvica unilateral) para estabilização da pelve.';
    }

    results.push({
      id: 'add_abd',
      nome: 'Índice ADD/ABD (Adutores / Abdutores)',
      subtitulo: 'Equilíbrio frontal do quadril e estabilização pélvica',
      articulacao: 'Quadril',
      valorD: vD,
      valorE: vE,
      valorGeral: vGeral,
      unidade: 'x',
      referenciaMin: 1.05,
      referenciaMax: 1.20,
      referenciaFormatada: '1.05 – 1.20',
      statusD: sD,
      statusE: sE,
      statusGeral: sGeral as any,
      diagnosticoClinico: diag,
      diretrizTreinador: dir
    });
  }

  // 3. FORÇA RELATIVA DO QUADRÍCEPS (% PESO CORPORAL)
  if (extJoelho.max > 0 && pesoKg > 0) {
    const vD = extJoelho.D > 0 ? Math.round((extJoelho.D / pesoKg) * 100) : null;
    const vE = extJoelho.E > 0 ? Math.round((extJoelho.E / pesoKg) * 100) : null;
    const vMedia = Math.round((extJoelho.max / pesoKg) * 100);
    const corteMin = sexo === 'M' ? 70 : 60;

    const sD = vD !== null ? (vD >= corteMin ? 'otimo' : vD >= 50 ? 'atencao' : 'critico') : 'nao_avaliado';
    const sE = vE !== null ? (vE >= corteMin ? 'otimo' : vE >= 50 ? 'atencao' : 'critico') : 'nao_avaliado';
    const sGeral = vMedia >= corteMin ? 'otimo' : vMedia >= 50 ? 'atencao' : 'critico';

    let diag = `Força de quadríceps atinge o limiar protetor de blindagem articular (${vMedia}% PC).`;
    let dir = 'Apto para progressão de volume e exercícios de sobrecarga em agachamentos e leg press.';
    if (vMedia < corteMin) {
      diag = `Força relativa do quadríceps abaixo do limiar protetor (${vMedia}% PC vs meta ≥ ${corteMin}% PC). Risco de sobrecarga femoropatelar e dor anterior no joelho.`;
      dir = 'Priorizar ganho de força pura no aparelho extensor (cadeira extensora isométrica e concêntrica) antes de treinos de salto ou impacto.';
    }

    results.push({
      id: 'quad_pc',
      nome: 'Quadríceps Relativo ao Peso (%PC)',
      subtitulo: 'Capacidade de amortecimento articular do joelho',
      articulacao: 'Joelho',
      valorD: vD,
      valorE: vE,
      valorGeral: vMedia,
      unidade: '% PC',
      referenciaMin: corteMin,
      referenciaMax: 100,
      referenciaFormatada: `≥ ${corteMin}% PC`,
      statusD: sD as any,
      statusE: sE as any,
      statusGeral: sGeral as any,
      diagnosticoClinico: diag,
      diretrizTreinador: dir
    });
  }

  // 4. FORÇA RELATIVA DE GLÚTEO MÉDIO / ABDUTORES (% PESO CORPORAL)
  if (abdQuadril.max > 0 && pesoKg > 0) {
    const vD = abdQuadril.D > 0 ? Math.round((abdQuadril.D / pesoKg) * 100) : null;
    const vE = abdQuadril.E > 0 ? Math.round((abdQuadril.E / pesoKg) * 100) : null;
    const vMedia = Math.round((abdQuadril.max / pesoKg) * 100);
    const corteMin = sexo === 'M' ? 30 : 25;

    const sD = vD !== null ? (vD >= corteMin ? 'otimo' : 'critico') : 'nao_avaliado';
    const sE = vE !== null ? (vE >= corteMin ? 'otimo' : 'critico') : 'nao_avaliado';
    const sGeral = vMedia >= corteMin ? 'otimo' : 'critico';

    let diag = `Estabilização do plano frontal da pelve adequada (${vMedia}% PC).`;
    let dir = 'Manter exercícios funcionais unipodais para preservação do controle dinâmico.';
    if (vMedia < corteMin) {
      diag = `Fraqueza de abdutores de quadril (${vMedia}% PC vs meta ≥ ${corteMin}% PC). Forte correlação com valgo dinâmico, queda pélvica e dor femoropatelar.`;
      dir = 'Incorporar ativação isolada de glúteo médio e mínimo (abdução com elástico, marcha lateral, elevação pélvica unilateral).';
    }

    results.push({
      id: 'gluteo_pc',
      nome: 'Glúteo Médio Relativo ao Peso (%PC)',
      subtitulo: 'Estabilidade do plano frontal e prevenção de valgo',
      articulacao: 'Quadril',
      valorD: vD,
      valorE: vE,
      valorGeral: vMedia,
      unidade: '% PC',
      referenciaMin: corteMin,
      referenciaMax: 50,
      referenciaFormatada: `≥ ${corteMin}% PC`,
      statusD: sD as any,
      statusE: sE as any,
      statusGeral: sGeral as any,
      diagnosticoClinico: diag,
      diretrizTreinador: dir
    });
  }

  // 5. RAZÃO ROTACIONAL RI/RE DE QUADRIL
  if (rotIntQuad.max > 0 && rotExtQuad.max > 0) {
    const vTotRI = (rotIntQuad.D + rotIntQuad.E) || rotIntQuad.max;
    const vTotRE = (rotExtQuad.D + rotExtQuad.E) || rotExtQuad.max;
    const vGeral = vTotRE > 0 ? Math.round((vTotRI / vTotRE) * 100) / 100 : null;

    if (vGeral !== null) {
      const sGeral = (vGeral >= 0.90 && vGeral <= 1.15) ? 'otimo' : 'atencao';
      results.push({
        id: 'ri_re_quad',
        nome: 'Razão Rotação Interna / Externa (RI/RE)',
        subtitulo: 'Simetria rotacional do complexo coxofemoral',
        articulacao: 'Quadril',
        valorD: (rotExtQuad.D > 0 && rotIntQuad.D > 0) ? Math.round((rotIntQuad.D / rotExtQuad.D) * 100) / 100 : null,
        valorE: (rotExtQuad.E > 0 && rotIntQuad.E > 0) ? Math.round((rotIntQuad.E / rotExtQuad.E) * 100) / 100 : null,
        valorGeral: vGeral,
        unidade: 'x',
        referenciaMin: 0.90,
        referenciaMax: 1.15,
        referenciaFormatada: '0.90 – 1.15 (≈ 1:1)',
        statusD: 'otimo',
        statusE: 'otimo',
        statusGeral: sGeral,
        diagnosticoClinico: sGeral === 'otimo' ? 'Equilíbrio rotacional simétrico no quadril.' : 'Desequilíbrio rotacional coxofemoral.',
        diretrizTreinador: sGeral === 'otimo' ? 'Manter mobilidade e força rotacional.' : 'Ajustar rotações de quadril com foco no rotador deficitário.'
      });
    }
  }

  return results;
}

// ==============================================================================
// 12. BATERIA DE HOP TESTS & CÁLCULO DE LSI (LIMB SYMMETRY INDEX ≥ 90%)
// ==============================================================================

export interface HopTestItem {
  id: 'single_hop' | 'triple_hop' | 'crossover_hop' | 'timed_hop';
  nome: string;
  subtitulo: string;
  unidade: 'cm' | 's';
  valorD: number;
  valorE: number;
  lsiPct: number;
  referenciaCorte: number;
  status: 'otimo' | 'atencao' | 'critico';
  ladoDominante: 'D > E' | 'E > D' | 'Simétrico';
  interpretacao: string;
}

export interface HopBatteryResult {
  realizou: boolean;
  data?: string;
  membroAfetado?: 'Direito' | 'Esquerdo' | 'Bilateral' | 'Nenhum';
  testes: HopTestItem[];
  lsiMedio: number;
  statusGeral: 'liberado' | 'fase_intermediaria' | 'retencao';
  badgeStatus: string;
  badgeBg: string;
  badgeCor: string;
  parecerRTS: string;
  diretrizTreinador: string;
}

export interface HopBatteryInput {
  membroAfetado?: 'Direito' | 'Esquerdo' | 'Bilateral' | 'Nenhum';
  singleHopD?: number | string;
  singleHopE?: number | string;
  tripleHopD?: number | string;
  tripleHopE?: number | string;
  crossoverHopD?: number | string;
  crossoverHopE?: number | string;
  timedHopD?: number | string;
  timedHopE?: number | string;
  data?: string;
}

export function calculateHopBatteryAnalysis(input: HopBatteryInput | any): HopBatteryResult | null {
  if (!input) return null;

  const toN = (v: any) => {
    if (v === null || v === undefined || v === '') return 0;
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  };

  const dObj = input.dados || input;
  const membroAfetado = dObj.membroAfetado || 'Nenhum';

  const sHopD = toN(dObj.singleHopD ?? dObj.singleHop?.d ?? dObj.singleHop?.direito);
  const sHopE = toN(dObj.singleHopE ?? dObj.singleHop?.e ?? dObj.singleHop?.esquerdo);

  const tHopD = toN(dObj.tripleHopD ?? dObj.tripleHop?.d ?? dObj.tripleHop?.direito);
  const tHopE = toN(dObj.tripleHopE ?? dObj.tripleHop?.e ?? dObj.tripleHop?.esquerdo);

  const cHopD = toN(dObj.crossoverHopD ?? dObj.crossoverHop?.d ?? dObj.crossoverHop?.direito);
  const cHopE = toN(dObj.crossoverHopE ?? dObj.crossoverHop?.e ?? dObj.crossoverHop?.esquerdo);

  const timedD = toN(dObj.timedHopD ?? dObj.timedHop?.d ?? dObj.timedHop?.direito ?? dObj.timed6mD);
  const timedE = toN(dObj.timedHopE ?? dObj.timedHop?.e ?? dObj.timedHop?.esquerdo ?? dObj.timed6mE);

  const testes: HopTestItem[] = [];

  const calcLsiDist = (vD: number, vE: number): number => {
    if (vD <= 0 || vE <= 0) return 0;
    if (membroAfetado === 'Direito') return Math.round((vD / vE) * 1000) / 10;
    if (membroAfetado === 'Esquerdo') return Math.round((vE / vD) * 1000) / 10;
    return Math.round((Math.min(vD, vE) / Math.max(vD, vE)) * 1000) / 10;
  };

  const calcLsiTime = (tD: number, tE: number): number => {
    if (tD <= 0 || tE <= 0) return 0;
    if (membroAfetado === 'Direito') return Math.round((tE / tD) * 1000) / 10;
    if (membroAfetado === 'Esquerdo') return Math.round((tD / tE) * 1000) / 10;
    return Math.round((Math.min(tD, tE) / Math.max(tD, tE)) * 1000) / 10;
  };

  const getDominance = (vD: number, vE: number, isTimed = false): 'D > E' | 'E > D' | 'Simétrico' => {
    const diff = Math.abs(vD - vE);
    if (diff < (isTimed ? 0.05 : 2)) return 'Simétrico';
    if (isTimed) return vD < vE ? 'D > E' : 'E > D';
    return vD > vE ? 'D > E' : 'E > D';
  };

  const getStatus = (lsi: number): 'otimo' | 'atencao' | 'critico' => {
    if (lsi >= 90) return 'otimo';
    if (lsi >= 80) return 'atencao';
    return 'critico';
  };

  // 1. Single Hop for Distance
  if (sHopD > 0 && sHopE > 0) {
    const lsi = calcLsiDist(sHopD, sHopE);
    const status = getStatus(lsi);
    testes.push({
      id: 'single_hop',
      nome: 'Single Hop for Distance',
      subtitulo: 'Salto unipodal simples para distância horizontal',
      unidade: 'cm',
      valorD: sHopD,
      valorE: sHopE,
      lsiPct: lsi,
      referenciaCorte: 90,
      status,
      ladoDominante: getDominance(sHopD, sHopE),
      interpretacao: status === 'otimo'
        ? 'Potência horizontal simétrica no salto simples.'
        : `Déficit de simetria de ${Math.round(100 - lsi)}% no salto simples.`
    });
  }

  // 2. Triple Hop for Distance
  if (tHopD > 0 && tHopE > 0) {
    const lsi = calcLsiDist(tHopD, tHopE);
    const status = getStatus(lsi);
    testes.push({
      id: 'triple_hop',
      nome: 'Triple Hop for Distance',
      subtitulo: 'Três saltos consecutivos lineares em sequência',
      unidade: 'cm',
      valorD: tHopD,
      valorE: tHopE,
      lsiPct: lsi,
      referenciaCorte: 90,
      status,
      ladoDominante: getDominance(tHopD, tHopE),
      interpretacao: status === 'otimo'
        ? 'Capacidade reativa e acumulação elástica simétrica.'
        : `Fadiga desacelerativa evidente entre saltos consecutivos (LSI ${lsi}%).`
    });
  }

  // 3. Crossover Hop for Distance
  if (cHopD > 0 && cHopE > 0) {
    const lsi = calcLsiDist(cHopD, cHopE);
    const status = getStatus(lsi);
    testes.push({
      id: 'crossover_hop',
      nome: 'Crossover Hop for Distance',
      subtitulo: 'Três saltos cruzando faixa central de 15 cm',
      unidade: 'cm',
      valorD: cHopD,
      valorE: cHopE,
      lsiPct: lsi,
      referenciaCorte: 90,
      status,
      ladoDominante: getDominance(cHopD, cHopE),
      interpretacao: status === 'otimo'
        ? 'Excelente estabilização no plano frontal/transverso em saltos cruzados.'
        : `Instabilidade e receio de rotação/valgo dinâmico nos saltos cruzados (LSI ${lsi}%).`
    });
  }

  // 4. 6-Meter Timed Hop
  if (timedD > 0 && timedE > 0) {
    const lsi = calcLsiTime(timedD, timedE);
    const status = getStatus(lsi);
    testes.push({
      id: 'timed_hop',
      nome: '6-Meter Timed Hop',
      subtitulo: 'Salto unipodal contínuo por 6 metros cronometrado',
      unidade: 's',
      valorD: timedD,
      valorE: timedE,
      lsiPct: lsi,
      referenciaCorte: 90,
      status,
      ladoDominante: getDominance(timedD, timedE, true),
      interpretacao: status === 'otimo'
        ? 'Velocidade e cadência de salto plenamente simétricas.'
        : `Lentificação motora e tempo de contato aumentado no membro afetado (LSI ${lsi}%).`
    });
  }

  if (testes.length === 0) return null;

  const somaLsi = testes.reduce((acc, t) => acc + t.lsiPct, 0);
  const lsiMedio = Math.round((somaLsi / testes.length) * 10) / 10;

  const hasCritico = testes.some(t => t.status === 'critico') || lsiMedio < 80;
  const hasAtencao = testes.some(t => t.status === 'atencao') || (lsiMedio >= 80 && lsiMedio < 90);

  let statusGeral: 'liberado' | 'fase_intermediaria' | 'retencao' = 'liberado';
  let badgeStatus = '🟢 Apto para Corrida / RTS (LSI ≥ 90%)';
  let badgeBg = 'rgba(16, 185, 129, 0.18)';
  let badgeCor = '#10b981';
  let parecerRTS = `Índice de Simetria de Membros (LSI Médio: ${lsiMedio}%) atinge o padrão ouro internacional de 90%. O aluno demonstra simetria de potência horizontal, capacidade de frenagem e estabilidade rotacional suficientes para liberação segura de corrida na esteira e exercícios pliométricos controlados.`;
  let diretrizTreinador = 'Liberado para treinos de corrida contínua, agachamento dinâmico e pliometria moderada. Manter controle de volume load e monitoramento do relato de dor pós-treino.';

  if (hasCritico) {
    statusGeral = 'retencao';
    badgeStatus = `🔴 Retenção de Impacto (LSI ${lsiMedio}%)`;
    badgeBg = 'rgba(239, 68, 68, 0.18)';
    badgeCor = '#ef4444';
    parecerRTS = `Assimetria funcional severa nos saltos unipodais (LSI Médio: ${lsiMedio}% vs meta ≥ 90%). Déficit mecânico de desaceleração que eleva expressivamente o risco de relesão (LCA, menisco ou entorse de tornozelo) e sobrecarga patelofemoral.`;
    diretrizTreinador = 'VEDADO: Corrida na esteira, saltos unipodais e exercícios de impacto/pliometria. Foco exclusivo em força muscular em cadeia cinética fechada (leg press, cadeira extensora isométrica, agachamento bipodal estável) até normalizar simetria.';
  } else if (hasAtencao) {
    statusGeral = 'fase_intermediaria';
    badgeStatus = `🟡 Fase Intermediária (LSI ${lsiMedio}%)`;
    badgeBg = 'rgba(245, 158, 11, 0.18)';
    badgeCor = '#f59e0b';
    parecerRTS = `Simetria funcional em fase de transição (LSI Médio: ${lsiMedio}%). Embora haja boa resposta estática, o membro acometido ainda não tolera cargas excêntricas máximas de desaceleração.`;
    diretrizTreinador = 'Permitido trote linear leve (máx 8 km/h na esteira). PROIBIDOS: Sprints de alta velocidade, saltos de profundidade (drop jumps) e paradas bruscas com mudança de direção. Priorizar potência unipodal progressiva.';
  }

  return {
    realizou: true,
    data: dObj.data || new Date().toISOString().split('T')[0],
    membroAfetado,
    testes,
    lsiMedio,
    statusGeral,
    badgeStatus,
    badgeBg,
    badgeCor,
    parecerRTS,
    diretrizTreinador
  };
}


