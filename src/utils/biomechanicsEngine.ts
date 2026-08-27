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

  if (data.thomasIliopsoasDStatus === 'positivo' || ilioD > 5) {
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

  if (data.thomasIliopsoasEStatus === 'positivo' || ilioE > 5) {
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

  if (data.thomasRetofemoralDStatus === 'positivo' || (retoD > 0 && retoD < 80)) {
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

  if (data.thomasRetofemoralEStatus === 'positivo' || (retoE > 0 && retoE < 80)) {
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
  if (oberD === 'positivo') {
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
  if (oberE === 'positivo') {
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

