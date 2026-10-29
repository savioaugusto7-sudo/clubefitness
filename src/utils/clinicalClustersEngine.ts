/**
 * Motor de Detecção de Clusters Clínicos e Raciocínio Segmentado
 * Analisa as queixas, goniometrias, testes ortopédicos, dinamometria e anamnese
 * do paciente para gerar laudos 100% personalizados por segmento anatômico.
 */

export interface ClinicalCluster {
  id: 'coluna' | 'ombro' | 'joelho' | 'quadril' | 'tornozelo' | 'postural_funcional';
  nome: string;
  tituloLaudo: string;
  icone: string;
  prioridade: number; // 1 = queixa principal, 2 = achado secundário, 3 = teste complementar
  queixasAssociadas: string[];
  achadosClinicos: string[];
  pontosDeAtencao: string[];
  recomendacoesTerapeuticas: string[];
  metricas: {
    rotulo: string;
    t1: string | number;
    t2: string | number;
    variacao: string;
    status: 'positivo' | 'estavel' | 'alerta';
  }[];
}

export interface ClientClinicalProfile {
  queixasEVA: { queixa: string; t1: number; t2: number; delta: number }[];
  mobilidadeColuna?: {
    flexao?: { t1?: number; t2?: number; eva1?: number; eva2?: number };
    extensao?: { t1?: number; t2?: number; eva1?: number; eva2?: number };
    inclinacaoD?: { t1?: number; t2?: number; eva1?: number; eva2?: number };
    inclinacaoE?: { t1?: number; t2?: number; eva1?: number; eva2?: number };
    rotacaoD?: { t1?: number; t2?: number; eva1?: number; eva2?: number };
    rotacaoE?: { t1?: number; t2?: number; eva1?: number; eva2?: number };
  };
  goniometriaArticular: Record<string, { t1?: number | null; t2?: number | null }>;
  testesOrtopedicos: Record<string, { t1?: string; t2?: string }>;
  dinamometria: { movimento: string; lado: string; t1: number; t2: number; pct: number }[];
  habitos: {
    sonoHoras?: number;
    sonoQualidade?: string;
    estresse?: number;
    atividadeFisica?: string;
  };
}

/**
 * Normaliza texto para busca sem acentos
 */
function normalize(str?: string): string {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Identifica quais clusters clínicos estão ativos para o paciente
 */
export function identifyClinicalClusters(profile: ClientClinicalProfile): ClinicalCluster[] {
  const clusters: ClinicalCluster[] = [];

  const queixasText = profile.queixasEVA.map(q => normalize(q.queixa)).join(' ');

  // ──────────────────────────────────────────────────────────────────────────
  // 1. CLUSTER: COLUNA VERTEBRAL & COMPLEXO PÉLVICO
  // ──────────────────────────────────────────────────────────────────────────
  const isColunaQueixa = queixasText.includes('lombar') || queixasText.includes('coluna') || 
                         queixasText.includes('cervical') || queixasText.includes('toracica') || 
                         queixasText.includes('costas') || queixasText.includes('ciatico') ||
                         queixasText.includes('hernia') || queixasText.includes('escapul');

  const hasMobilidadeColuna = Boolean(profile.mobilidadeColuna && (
    profile.mobilidadeColuna.flexao?.t2 !== undefined || 
    profile.mobilidadeColuna.extensao?.t2 !== undefined ||
    profile.mobilidadeColuna.inclinacaoD?.t2 !== undefined ||
    profile.mobilidadeColuna.rotacaoD?.t2 !== undefined
  ));

  const hasTestesColuna = Boolean(
    profile.testesOrtopedicos['thomasIliopsoas'] ||
    profile.testesOrtopedicos['maigne'] ||
    profile.testesOrtopedicos['diastase']
  );

  if (isColunaQueixa || hasMobilidadeColuna || hasTestesColuna) {
    const achados: string[] = [];
    const atencao: string[] = [];
    const recomendacoes: string[] = [];
    const metricas: ClinicalCluster['metricas'] = [];

    // Analisar Mobilidade de Coluna
    if (profile.mobilidadeColuna) {
      const mc = profile.mobilidadeColuna;
      if (mc.flexao?.t2 !== undefined) {
        const t1 = mc.flexao.t1 ?? 0;
        const t2 = mc.flexao.t2;
        const delta = t2 - t1;
        metricas.push({
          rotulo: 'Flexão de Tronco (Coluna Lombar)',
          t1: `${t1}°`,
          t2: `${t2}°`,
          variacao: `${delta >= 0 ? '+' : ''}${delta}°`,
          status: delta >= 0 ? 'positivo' : 'alerta'
        });
        if (delta > 3) {
          achados.push(`Ganho de ${delta}° na flexão anterior de tronco (${t1}° ➔ ${t2}°), facilitando a mobilidade funcional.`);
        } else if (t2 < 30) {
          atencao.push(`Flexão anterior de tronco em ${t2}° indica restrição na fáscia toracolombar e cadeia posterior.`);
        }
      }

      if (mc.extensao?.t2 !== undefined) {
        const t1 = mc.extensao.t1 ?? 0;
        const t2 = mc.extensao.t2;
        const delta = t2 - t1;
        metricas.push({
          rotulo: 'Extensão de Tronco',
          t1: `${t1}°`,
          t2: `${t2}°`,
          variacao: `${delta >= 0 ? '+' : ''}${delta}°`,
          status: delta >= 0 ? 'positivo' : 'alerta'
        });
        if (t2 < 20) {
          atencao.push(`Extensão de tronco restrita (${t2}°), limitando o controle lordótico fisiológico.`);
        }
      }

      if (mc.rotacaoD?.t2 !== undefined && mc.rotacaoE?.t2 !== undefined) {
        const rotDif = Math.abs((mc.rotacaoD.t2 || 0) - (mc.rotacaoE.t2 || 0));
        metricas.push({
          rotulo: 'Rotações Axiais de Tronco (D/E)',
          t1: `${mc.rotacaoD.t1 || 0}° / ${mc.rotacaoE.t1 || 0}°`,
          t2: `${mc.rotacaoD.t2}° / ${mc.rotacaoE.t2}°`,
          variacao: `Dif: ${rotDif}°`,
          status: rotDif <= 5 ? 'positivo' : 'alerta'
        });
        if (rotDif > 5) {
          atencao.push(`Assimetria rotacional axial de ${rotDif}° entre hemitórax direito e esquerdo.`);
        }
      }
    }

    // Analisar Teste de Thomas (Relação Flexores de Quadril x Lordose Lombar)
    const tThomas = profile.testesOrtopedicos['thomasIliopsoas'] || profile.testesOrtopedicos['thomas'];
    if (tThomas) {
      const isPositivo = normalize(tThomas.t2).includes('positivo');
      metricas.push({
        rotulo: 'Teste de Thomas (Encurtamento Iliopsoas)',
        t1: tThomas.t1 || 'Positivo',
        t2: tThomas.t2 || 'Negativo',
        variacao: isPositivo ? 'Manutenção' : 'Normalizou',
        status: isPositivo ? 'alerta' : 'positivo'
      });
      if (isPositivo) {
        atencao.push('Encurtamento residual de iliopsoas atuando em anteversão pélvica, o que eleva a compressão nas facetas lombares L4-L5 e L5-S1.');
        recomendacoes.push('Liberação miofascial e alongamento de psoas-maior e retofemoral associado a retroversão ativa da pelve.');
      } else {
        achados.push('Normalização do comprimento dos flexores anteriores do quadril, retirando a tração excessiva na lordose lombar.');
      }
    }

    // Queixas de dor de coluna
    const dorColuna = profile.queixasEVA.filter(q => {
      const n = normalize(q.queixa);
      return n.includes('lombar') || n.includes('coluna') || n.includes('cervical') || n.includes('costas');
    });

    dorColuna.forEach(d => {
      if (d.delta < 0) {
        achados.push(`Redução expressiva na queixa dolorosa de ${d.queixa} (de ${d.t1}/10 para ${d.t2}/10 na escala EVA).`);
      } else if (d.t2 > 0) {
        atencao.push(`Sintoma álgico persistente em ${d.queixa} (intensidade ${d.t2}/10).`);
        recomendacoes.push(`Estratégias de analgesia, descompressão axial e estabilização segmentar para ${d.queixa}.`);
      }
    });

    if (recomendacoes.length === 0) {
      recomendacoes.push('Manutenção de exercícios de Core e controle motor para sustentação lombopélvica.');
      recomendacoes.push('Progressão de carga em flexão/extensão preservando o alinhamento neutro da coluna.');
    }

    clusters.push({
      id: 'coluna',
      nome: 'Coluna Vertebral & Pélvis',
      tituloLaudo: 'ANÁLISE BIOMECÂNICA DA COLUNA VERTEBRAL E ESTABILIZAÇÃO LOMBOPÉLVICA',
      icone: 'fa-bone',
      prioridade: isColunaQueixa ? 1 : 2,
      queixasAssociadas: dorColuna.map(d => d.queixa),
      achadosClinicos: achados.length > 0 ? achados : ['Mobilidade e alinhamento axial monitorados com estabilidade funcional.'],
      pontosDeAtencao: atencao.length > 0 ? atencao : ['Manter controle neuromuscular na transição entre sentado e em pé.'],
      recomendacoesTerapeuticas: recomendacoes,
      metricas
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CLUSTER: OMBRO & CINTURA ESCAPULAR
  // ──────────────────────────────────────────────────────────────────────────
  const isOmbroQueixa = queixasText.includes('ombro') || queixasText.includes('manguito') || 
                        queixasText.includes('escapul') || queixasText.includes('brav') || 
                        queixasText.includes('cotovelo') || queixasText.includes('punho') ||
                        queixasText.includes('bursite') || queixasText.includes('trapezio');

  const hasOmbroGonio = Object.keys(profile.goniometriaArticular).some(k => k.toLowerCase().includes('ombro'));
  const hasOmbroForca = profile.dinamometria.some(d => d.movimento.toLowerCase().includes('ombro') || d.movimento.toLowerCase().includes('rotador'));

  if (isOmbroQueixa || hasOmbroGonio || hasOmbroForca) {
    const achados: string[] = [];
    const atencao: string[] = [];
    const recomendacoes: string[] = [];
    const metricas: ClinicalCluster['metricas'] = [];

    // Dinamometria de Ombro
    const forcasOmbro = profile.dinamometria.filter(d => d.movimento.toLowerCase().includes('ombro') || d.movimento.toLowerCase().includes('rotador'));
    forcasOmbro.forEach(f => {
      metricas.push({
        rotulo: `${f.movimento} (${f.lado})`,
        t1: `${f.t1} N`,
        t2: `${f.t2} N`,
        variacao: `${f.pct >= 0 ? '+' : ''}${f.pct}%`,
        status: f.pct >= 5 ? 'positivo' : (f.pct < -5 ? 'alerta' : 'estavel')
      });
      if (f.pct >= 10) {
        achados.push(`Ganho de força em ${f.movimento} (${f.lado}) de +${f.pct}% (${f.t1} N ➔ ${f.t2} N).`);
      } else if (f.pct < 0) {
        atencao.push(`Queda aparente de força em ${f.movimento} (${f.lado}) de ${Math.abs(f.pct)}%.`);
      }
    });

    // Goniometria de Ombro
    Object.entries(profile.goniometriaArticular).forEach(([key, val]) => {
      if (key.toLowerCase().includes('ombro') && val.t2 !== undefined && val.t2 !== null) {
        const delta = (val.t2 || 0) - (val.t1 || 0);
        metricas.push({
          rotulo: `ADM ${key}`,
          t1: `${val.t1 || 0}°`,
          t2: `${val.t2}°`,
          variacao: `${delta >= 0 ? '+' : ''}${delta}°`,
          status: delta >= 0 ? 'positivo' : 'alerta'
        });
      }
    });

    const dorOmbro = profile.queixasEVA.filter(q => {
      const n = normalize(q.queixa);
      return n.includes('ombro') || n.includes('escapul') || n.includes('trapezio') || n.includes('cotovelo');
    });

    dorOmbro.forEach(d => {
      if (d.delta < 0) {
        achados.push(`Alívio na dor de ${d.queixa} (redução de ${d.t1}/10 para ${d.t2}/10).`);
      } else if (d.t2 > 0) {
        atencao.push(`Sintoma doloroso ativo em ${d.queixa} (${d.t2}/10 na escala EVA).`);
        recomendacoes.push(`Fortalecimento de manguito rotador em plano de escápula e estabilização escapulotorácica.`);
      }
    });

    if (recomendacoes.length === 0) {
      recomendacoes.push('Manter fortalecimento de rotadores externos e trapézio inferior para prevenção de impacto subacromial.');
    }

    clusters.push({
      id: 'ombro',
      nome: 'Cintura Escapular & Ombro',
      tituloLaudo: 'ANÁLISE FUNCIONAL DA CINTURA ESCAPULAR E COMPLEXO DO OMBRO',
      icone: 'fa-person-walking-arrow-right',
      prioridade: isOmbroQueixa ? 1 : 2,
      queixasAssociadas: dorOmbro.map(d => d.queixa),
      achadosClinicos: achados.length > 0 ? achados : ['Estabilidade glenoumeral preservada no plano escapular.'],
      pontosDeAtencao: atencao.length > 0 ? atencao : ['Monitorar amplitude em rotação interna e ritmo escapuloumeral.'],
      recomendacoesTerapeuticas: recomendacoes,
      metricas
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CLUSTER: JOELHO & CADEIA CINÉTICA INFERIOR
  // ──────────────────────────────────────────────────────────────────────────
  const isJoelhoQueixa = queixasText.includes('joelho') || queixasText.includes('patel') || 
                         queixasText.includes('menisc') || queixasText.includes('cruzad') ||
                         queixasText.includes('quadriceps') || queixasText.includes('isquio');

  const hasJoelhoForca = profile.dinamometria.some(d => d.movimento.toLowerCase().includes('joelho') || d.movimento.toLowerCase().includes('extensao'));
  const hasJoelhoGonio = Object.keys(profile.goniometriaArticular).some(k => k.toLowerCase().includes('joelho'));

  if (isJoelhoQueixa || hasJoelhoForca || hasJoelhoGonio) {
    const achados: string[] = [];
    const atencao: string[] = [];
    const recomendacoes: string[] = [];
    const metricas: ClinicalCluster['metricas'] = [];

    const dorJoelho = profile.queixasEVA.filter(q => normalize(q.queixa).includes('joelho'));
    dorJoelho.forEach(d => {
      const qNorm = normalize(d.queixa);
      if (d.delta < 0) {
        achados.push(`Redução expressiva dos sintomas dolorosos em ${d.queixa} (de ${d.t1}/10 para ${d.t2}/10 na escala EVA).`);
      } else if (d.t2 > 0) {
        atencao.push(`Sintoma doloroso ativo em ${d.queixa} (${d.t2}/10 no teste atual).`);
      }

      // Análise compartimental cirúrgica (Dra. Rutchelia Novais)
      if (qNorm.includes('lateral') || qNorm.includes('trato iliotibial') || qNorm.includes('stit') || qNorm.includes('biceps femoral')) {
        achados.push('Comprometimento focado no Compartimento Lateral do Joelho (fricção da banda iliotibial no epicôndilo femoral lateral / tendinopatia do bíceps).');
        atencao.push('Zona de vulnerabilidade mecânica próximo a 30° de flexão (zona de fricção de Noble), com atrito intensificado em desacelerações.');
        recomendacoes.push('Prescrição Sala de Musculação: Liberação miofascial e alongamento do TFL/trato iliotibial. Fortalecimento intensivo de abdutores de quadril (glúteo médio) para conter adução fêmur-joelho. Evitar agachamentos repetitivos com pausa na zona crítica de 30° de flexão.');
      } else if (qNorm.includes('anterior') || qNorm.includes('patel') || qNorm.includes('hoffite') || qNorm.includes('femoropatelar')) {
        achados.push('Sobrecarga no Compartimento Anterior do Joelho (estresse patelofemoral / tendão patelar).');
        atencao.push('Pressão de contato retropatelar acentuada em agachamentos profundos e tarefas excêntricas de desaceleração.');
        recomendacoes.push('Prescrição Sala de Musculação: Fortalecimento isométrico do quadríceps na cadeira extensora (60°–45° para tendão, 90°–60° para SDPF). Ativação de glúteo máximo e médio para controle do vetor de valgo dinâmico. Adiar treinos pliométricos e saltos até que a força extensora atinja o limiar protetor (≥ 70% PC).');
      } else if (qNorm.includes('medial') || qNorm.includes('pata de ganso') || qNorm.includes('anserina') || qNorm.includes('lcm') || qNorm.includes('menisco medial') || qNorm.includes('kam') || qNorm.includes('plica')) {
        const isPressao = qNorm.includes('pressao') || qNorm.includes('menisco') || qNorm.includes('osteoartrite') || qNorm.includes('condral') || qNorm.includes('varo') || qNorm.includes('kam');
        const isEstiramento = qNorm.includes('estiramento') || qNorm.includes('pata de ganso') || qNorm.includes('anserina') || qNorm.includes('lcm') || qNorm.includes('valgo') || qNorm.includes('plica');

        if (isPressao) {
          achados.push('Sobrecarga mecânica por COMPRESSÃO no Compartimento Medial do Joelho (elevação do Momento de Adução do Joelho - KAM / estresse axial fêmuro-tibial / menisco medial).');
          atencao.push('Pressão compressiva e cisalhamento aumentados no platô tibial medial e menisco, agravados por padrão de genu varum, predomínio de quadríceps sobre isquiotibiais (I:Q reduzida) ou eventual perda de extensão terminal (flexo articular).');
          recomendacoes.push('Terapia Manual & Conduta: Mobilização tibiofemoral em abertura medial (Graus I–III Maitland) e descompressão por tração longitudinal com mobilização meniscal. Prescrição Sala de Musculação: Fortalecimento excêntrico de isquiotibiais para frear cisalhamento anterior e absorver carga axial; priorizar cadeias cinéticas fechadas com alinhamento rigoroso; evitar pausas sob carga máxima em flexão profunda.');
        } else if (isEstiramento) {
          achados.push('Sobrecarga mecânica por ESTIRAMENTO no Compartimento Medial do Joelho (estresse tênsil decorrente de valgo dinâmico / sobrecarga na inserção anserina ou LCM).');
          atencao.push('Vetor tênsil contínuo em plano frontal (valgo dinâmico), impulsionado por fraqueza estabilizadora de glúteo médio, encurtamento de adutores (teste KFBO com distância >15 cm ou assimetria >2 cm) e restrição de dorsiflexão no lunge test.');
          recomendacoes.push('Terapia Manual & Conduta: Liberação miofascial profunda dos adutores (grácil) e músculos anserinos (sartório, semitendíneo); ganho de abdução passiva (teste KFBO). Prescrição Sala de Musculação: Fortalecimento excêntrico intensivo de glúteo médio e rotadores externos para extinção do valgo dinâmico no Step Down; restauração da dorsiflexão do tornozelo para eliminar a pronação compensatória ascendente.');
        } else {
          achados.push('Tensão concentrada no Compartimento Medial do Joelho (estresse sobre a pata de ganso, LCM ou cisalhamento de menisco medial).');
          atencao.push('Predisposição a colapso medial em valgo dinâmico ou sobrecarga compressiva no KAM, frequentemente associado a desequilíbrio na razão adutor/abdutor.');
          recomendacoes.push('Prescrição Sala de Musculação: Equilíbrio de adutores e rotadores de quadril. Manter alinhamento joelho-segundo dedo durante o agachamento e leg press. Avaliar estabilidade do arco medial do pé e teste KFBO.');
        }
      } else if (qNorm.includes('posterior') || qNorm.includes('baker') || qNorm.includes('popliteo') || qNorm.includes('isquio')) {
        achados.push('Sobrecarga no Compartimento Posterior do Joelho (fossa poplítea / tendinopatia do poplíteo / cisto de Baker).');
        atencao.push('Sensibilidade mecânica terminal na flexão/extensão completa sob carga axial.');
        recomendacoes.push('Prescrição Sala de Musculação: Fortalecimento excêntrico controlado de isquiotibiais sem sobrecarga no arco articular final. Descompressão miofascial da fossa poplítea.');
      }
    });

    clusters.push({
      id: 'joelho',
      nome: 'Joelho & Cadeia Inferior',
      tituloLaudo: 'ANÁLISE BIOMECÂNICA DO JOELHO E DISTRIBUIÇÃO DE CARGAS TIBIOFEMORAIS',
      icone: 'fa-child',
      prioridade: isJoelhoQueixa ? 1 : 2,
      queixasAssociadas: dorJoelho.map(d => d.queixa),
      achadosClinicos: achados.length > 0 ? achados : ['Distribuição de forças com boa tolerância articular.'],
      pontosDeAtencao: atencao.length > 0 ? atencao : ['Monitorar vetor em valgo dinâmico em desacelerações.'],
      recomendacoesTerapeuticas: recomendacoes.length > 0 ? recomendacoes : ['Equilíbrio de forças isquiotibiais/quadríceps e fortalecimento excêntrico.'],
      metricas
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. CLUSTER: TORNOZELO & PÉ
  // ──────────────────────────────────────────────────────────────────────────
  const isTornozeloQueixa = queixasText.includes('tornozelo') || queixasText.includes('pe') || 
                            queixasText.includes('aquiles') || queixasText.includes('fascite') ||
                            queixasText.includes('fascia') || queixasText.includes('calcaneo') ||
                            queixasText.includes('talus') || queixasText.includes('fibul');

  const hasTornozeloGonio = Object.keys(profile.goniometriaArticular).some(k => k.toLowerCase().includes('tornozelo'));

  if (isTornozeloQueixa || hasTornozeloGonio) {
    const achados: string[] = [];
    const atencao: string[] = [];
    const recomendacoes: string[] = [];
    const metricas: ClinicalCluster['metricas'] = [];

    const dorTornozelo = profile.queixasEVA.filter(q => {
      const n = normalize(q.queixa);
      return n.includes('tornozelo') || n.includes('pe') || n.includes('aquiles') || n.includes('fascia') || n.includes('calcaneo');
    });

    dorTornozelo.forEach(d => {
      const qNorm = normalize(d.queixa);
      if (d.delta < 0) {
        achados.push(`Melhora clínica na queixa de ${d.queixa} (redução de ${d.t1}/10 para ${d.t2}/10).`);
      } else if (d.t2 > 0) {
        atencao.push(`Sintoma ativo em ${d.queixa} (${d.t2}/10 na escala EVA).`);
      }

      // Análise compartimental de tornozelo
      if (qNorm.includes('anterior') || qNorm.includes('dorsiflexao') || qNorm.includes('impacto') || qNorm.includes('talus')) {
        achados.push('Comprometimento no Compartimento Anterior do Tornozelo (impacto tibiotársico / restrição de dorsiflexão).');
        atencao.push('Déficit no teste de lunge (WBLT < 10 cm / < 35°), provocando sobrecarga compensatória ascendente no joelho durante o agachamento.');
        recomendacoes.push('Prescrição: Mobilização articular com deslizamento talar posterior, liberação do músculo sóleo e progressão no teste de lunge com carga.');
      } else if (qNorm.includes('lateral') || qNorm.includes('entorse') || qNorm.includes('fibul') || qNorm.includes('talf')) {
        achados.push('Instabilidade / estresse no Compartimento Lateral do Tornozelo (complexo ligamentar lateral TALF/TCF e tendões fibulares).');
        atencao.push('Tempo de reação e força de eversão deficitários, elevando risco de recidiva em saltos e mudanças de direção.');
        recomendacoes.push('Prescrição: Treinamento neuromuscular e fortalecimento de fibulares longo e curto. Treino de propriocepção unipodal e bateria de Hop Tests (meta de LSI ≥ 90%) antes de liberação para corrida intensa.');
      } else if (qNorm.includes('medial') || qNorm.includes('tibial posterior') || qNorm.includes('deltoide') || qNorm.includes('tunel do tarso')) {
        achados.push('Sobrecarga no Compartimento Medial do Tornozelo (insuficiência do tibial posterior / estresse em pronação).');
        atencao.push('Colapso do arco plantar medial induzindo rotação interna da tíbia e estresse no joelho.');
        recomendacoes.push('Prescrição: Fortalecimento excêntrico do tibial posterior com elevação plantar associada à inversão do retropé. Exercícios de short foot para ativação de musculatura intrínseca do pé.');
      } else if (qNorm.includes('posterior') || qNorm.includes('aquiles') || qNorm.includes('calcaneo') || qNorm.includes('fascia')) {
        achados.push('Tensão no Compartimento Posterior / Fáscia Plantar (tendinopatia de Aquiles ou fascite plantar).');
        atencao.push('Rigidez no complexo gastrocnêmio-sóleo e baixa tolerância à deformação elástica.');
        recomendacoes.push('Prescrição: Protocolo de carga pesada e lenta (HSR - Heavy Slow Resistance) para o tendão de Aquiles. Liberação miofascial plantar e fortalecimento de flexores plantares.');
      }
    });

    clusters.push({
      id: 'tornozelo',
      nome: 'Complexo Tornozelo & Pé',
      tituloLaudo: 'ANÁLISE ARTICULAR DO COMPLEXO PÉ-TORNOZELO E DORSICOMPRESSÃO',
      icone: 'fa-shoe-prints',
      prioridade: isTornozeloQueixa ? 1 : 3,
      queixasAssociadas: dorTornozelo.map(q => q.queixa),
      achadosClinicos: achados.length > 0 ? achados : ['Mobilidade e resposta proprioceptiva do retropé preservadas.'],
      pontosDeAtencao: atencao.length > 0 ? atencao : ['Manter dorsiflexão com joelho estendido acima de 20°.'],
      recomendacoesTerapeuticas: recomendacoes.length > 0 ? recomendacoes : ['Mobilização articular tibiotársica e liberação miofascial do tríceps sural.'],
      metricas
    });
  }

  // Ordenar clusters pela prioridade (1 = queixa principal na frente)
  clusters.sort((a, b) => a.prioridade - b.prioridade);

  // Se nenhum cluster específico foi detectado, criar o cluster Postural Global
  if (clusters.length === 0) {
    clusters.push({
      id: 'postural_funcional',
      nome: 'Postura & Equilíbrio Funcional',
      tituloLaudo: 'ANÁLISE DE EQUILÍBRIO BIOMECÂNICO E CAPACIDADE FUNCIONAL GLOBAL',
      icone: 'fa-scale-balanced',
      prioridade: 1,
      queixasAssociadas: [],
      achadosClinicos: ['Acompanhamento de parâmetros biomecânicos e fortalecimento profilático global.'],
      pontosDeAtencao: ['Monitorar simetria entre membros inferiores e estabilização de core.'],
      recomendacoesTerapeuticas: ['Progressão de carga em exercícios multiarticulares e treinamento proprioceptivo.'],
      metricas: []
    });
  }

  return clusters;
}
