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

  // 1.6 Tornozelo — Dorsiflexão (< 35° a 40°)
  const dorsiD = getNum(gonio.tornozeloDorsi1D);
  const dorsiE = getNum(gonio.tornozeloDorsi1E);
  if (dorsiD > 0 && dorsiD < 35) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Déficit de Dorsiflexão (< 35°)',
      articulacao: 'Tornozelo',
      lado: 'Direito',
      valorCalculado: `${dorsiD}°`,
      referenciaIdeal: '35° - 45°',
      descricao: `Dorsiflexão de ${dorsiD}° reduzida.`,
      riscoClinico: 'Risco aumentado de tendinopatia patelar, tendinite de Aquiles e fascite plantar.'
    });
  }
  if (dorsiE > 0 && dorsiE < 35) {
    alerts.push({
      tipo: 'atencao',
      titulo: 'Déficit de Dorsiflexão (< 35°)',
      articulacao: 'Tornozelo',
      lado: 'Esquerdo',
      valorCalculado: `${dorsiE}°`,
      referenciaIdeal: '35° - 45°',
      descricao: `Dorsiflexão de ${dorsiE}° reduzida.`,
      riscoClinico: 'Risco aumentado de tendinopatia patelar, tendinite de Aquiles e fascite plantar.'
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
export function calculateStrengthTestAlerts(testesList: any[], pesoKg: number = 70, sexo: 'M' | 'F' = 'M'): BiomechanicAlert[] {
  const alerts: BiomechanicAlert[] = [];
  if (!testesList || testesList.length === 0) return alerts;

  // Mapa de forças em Newtons por movimento e lado
  const map: Record<string, { D: number; E: number; max: number }> = {};

  testesList.forEach(t => {
    const key = `${t.articulacao}_${t.movimento}`.toLowerCase().trim();
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

  return alerts;
}
