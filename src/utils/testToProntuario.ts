/**
 * Conversor Inteligente de Testes Clínicos & Biomecânicos Avulsos em Prontuário Médico/Fisioterápico
 * Gera um texto estruturado, profissional e com valor legal para arquivamento no Prontuário do Aluno e exportação em PDF.
 */

interface FormatTestParams {
  tipoTeste: string;
  data: string;
  dados: any;
  metricas?: any;
  observacoes?: string;
  comparativoAnterior?: any;
}

export function formatTestToProntuarioContent({
  tipoTeste,
  data,
  dados = {},
  metricas = {},
  observacoes = '',
  comparativoAnterior
}: FormatTestParams): string {
  const dataFormatada = data ? data.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
  const lines: string[] = [];

  switch (tipoTeste) {
    case 'QUEIXAS_EVA': {
      lines.push('[AVALIAÇÃO CLÍNICA AVULSA - ESCALA DE DOR EVA]');
      lines.push(`Data da Avaliação: ${dataFormatada}\n`);
      
      const regiao = dados.regiao || 'Não informada';
      const lateralidade = dados.lateralidade || 'Bilateral';
      const subRegiao = dados.subRegiao ? ` (${dados.subRegiao})` : '';
      lines.push(`• Região Anatômica: ${regiao} - ${lateralidade}${subRegiao}`);

      const dor = dados.intensidade ?? metricas.scorePrincipal ?? 0;
      const classif = metricas.classificacao || (dor === 0 ? 'Sem dor' : dor <= 3 ? 'Dor leve' : dor <= 6 ? 'Dor moderada' : 'Dor severa');
      lines.push(`• Escala Visual Analógica (EVA): ${dor}/10 [${classif}]`);

      if (dados.caracteristica) {
        lines.push(`• Característica da Dor: ${dados.caracteristica}`);
      }

      const agravantes = Array.isArray(dados.atividadesAgravantes) && dados.atividadesAgravantes.length > 0
        ? dados.atividadesAgravantes.join(', ')
        : dados.desencadeiaPiora || '';
      if (agravantes) {
        lines.push(`• Atividades que Desencadeiam / Agravam: ${agravantes}`);
      }

      const alivios = Array.isArray(dados.fatoresAlivio) && dados.fatoresAlivio.length > 0
        ? dados.fatoresAlivio.join(', ')
        : dados.melhoraDesaparece || '';
      if (alivios) {
        lines.push(`• Fatores de Alívio: ${alivios}`);
      }

      if (dados.observacoesLivres) {
        lines.push(`• Relato do Paciente: ${dados.observacoesLivres}`);
      }
      break;
    }

    case 'DINAMOMETRIA': {
      lines.push('[TESTE BIOMECÂNICO AVULSO - DINAMOMETRIA ISOMÉTRICA]');
      lines.push(`Data do Teste: ${dataFormatada}\n`);

      const grupo = dados.grupoMuscular || 'Grupo Muscular não especificado';
      const unid = dados.unidade || 'kgf';
      lines.push(`• Grupo Muscular Testado: ${grupo}`);
      lines.push(`• Lado Direito: ${dados.ladoDireito ?? '-'} ${unid}`);
      lines.push(`• Lado Esquerdo: ${dados.ladoEsquerdo ?? '-'} ${unid}`);

      const assim = dados.assimetriaPercentual ?? metricas.assimetriaPercentual;
      if (assim != null) {
        lines.push(`• Assimetria Percentual: ${assim}%`);
      }
      if (metricas.classificacao) {
        lines.push(`• Classificação Clínica: ${metricas.classificacao}`);
      }
      break;
    }

    case 'Y_TEST': {
      lines.push('[TESTE BIOMECÂNICO AVULSO - Y-BALANCE TEST]');
      lines.push(`Data do Teste: ${dataFormatada}\n`);

      if (dados.comprimentoMembroCm) {
        lines.push(`• Comprimento do Membro: ${dados.comprimentoMembroCm} cm`);
      }
      lines.push(`• Alcance Anterior: Direito ${dados.alcanceAnteriorD ?? '-'} cm | Esquerdo ${dados.alcanceAnteriorE ?? '-'} cm`);
      lines.push(`• Alcance Posteromedial: Direito ${dados.alcancePosteromedialD ?? '-'} cm | Esquerdo ${dados.alcancePosteromedialE ?? '-'} cm`);
      lines.push(`• Alcance Posterolateral: Direito ${dados.alcancePosterolateralD ?? '-'} cm | Esquerdo ${dados.alcancePosterolateralE ?? '-'} cm`);

      if (metricas.assimetriaAbsoluta != null) {
        lines.push(`• Assimetria Anterior Absoluta: ${metricas.assimetriaAbsoluta} cm`);
      }
      if (metricas.scorePrincipal != null) {
        lines.push(`• Score Composto Médio: ${metricas.scorePrincipal}%`);
      }
      if (metricas.classificacao) {
        lines.push(`• Classificação de Risco: ${metricas.classificacao}`);
      }
      break;
    }

    case 'STEP_DOWN': {
      lines.push('[TESTE BIOMECÂNICO AVULSO - STEP DOWN TEST]');
      lines.push(`Data do Teste: ${dataFormatada}\n`);

      if (dados.degrauCm) {
        lines.push(`• Altura do Degrau: ${dados.degrauCm} cm`);
      }
      lines.push(`• Membro Direito: ${dados.pontuacaoD ?? 0} pts (Tronco: ${dados.estrategiaTroncoD || 'Normal'}, Valgo: ${dados.valgoD || 'Não'})`);
      lines.push(`• Membro Esquerdo: ${dados.pontuacaoE ?? 0} pts (Tronco: ${dados.estrategiaTroncoE || 'Normal'}, Valgo: ${dados.valgoE || 'Não'})`);
      if (metricas.classificacao) {
        lines.push(`• Classificação de Controle Dinâmico: ${metricas.classificacao}`);
      }
      break;
    }

    case 'HOP_TEST': {
      lines.push('[BATERIA DE HOP TESTS (SALTO UNIPODAL)]');
      lines.push(`Data do Teste: ${dataFormatada}\n`);

      if (dados.membroAfetado) {
        lines.push(`• Membro Afetado / Lesionado: ${dados.membroAfetado}`);
      }
      lines.push(`• Single Hop: Direito ${dados.singleHopD ?? '-'} cm | Esquerdo ${dados.singleHopE ?? '-'} cm`);
      lines.push(`• Triple Hop: Direito ${dados.tripleHopD ?? '-'} cm | Esquerdo ${dados.tripleHopE ?? '-'} cm`);
      lines.push(`• Crossover Hop: Direito ${dados.crossoverHopD ?? '-'} cm | Esquerdo ${dados.crossoverHopE ?? '-'} cm`);
      lines.push(`• 6m Timed Hop: Direito ${dados.timedHopD ?? '-'} s | Esquerdo ${dados.timedHopE ?? '-'} s`);

      if (metricas.lsiMedio != null) {
        lines.push(`• Índice de Simetria Límbica (LSI Médio): ${metricas.lsiMedio}%`);
      }
      if (metricas.classificacao) {
        lines.push(`• Status de Retorno ao Esporte: ${metricas.classificacao}`);
      }
      break;
    }

    case 'VISA_P': {
      lines.push('[QUESTIONÁRIO CLÍNICO VISA-P (TENDINOPATIA PATELAR)]');
      lines.push(`Data do Teste: ${dataFormatada}\n`);

      if (dados.membroAvaliado) {
        lines.push(`• Membro Avaliado: ${dados.membroAvaliado}`);
      }
      const scoreTotal = dados.scoreTotal ?? metricas.scorePrincipal ?? 0;
      lines.push(`• Score Total VISA-P: ${scoreTotal}/100 pts`);
      if (dados.scoreSintomasDor != null) {
        lines.push(`• Sub-escore Dor & Sintomas: ${dados.scoreSintomasDor}/30`);
        lines.push(`• Sub-escore Função com Carga: ${dados.scoreFuncaoCarga}/30`);
        lines.push(`• Sub-escore Capacidade Esportiva: ${dados.scoreCapacidadeEsportiva}/40`);
      }
      if (dados.estagioTendineo) {
        lines.push(`• Estágio Clínico da Tendinopatia: ${dados.estagioTendineo}`);
      }
      if (dados.diretrizTreinador) {
        lines.push(`• Diretriz para a Equipe de Treino: ${dados.diretrizTreinador}`);
      }
      break;
    }

    case 'GONIOMETRIA': {
      lines.push('[AVALIAÇÃO DE AMPLITUDE DE MOVIMENTO - GONIOMETRIA]');
      lines.push(`Data do Teste: ${dataFormatada}\n`);

      const formatField = (label: string, fD: any, fE: any, unit = '°') => {
        const vD = fD?.semForca ?? fD ?? '';
        const vE = fE?.semForca ?? fE ?? '';
        if (vD !== '' || vE !== '') {
          lines.push(`• ${label}: D ${vD !== '' ? vD + unit : '-'} | E ${vE !== '' ? vE + unit : '-'}`);
        }
      };

      formatField('Dorsiflexão Tornozelo (Joelho Fletido)', dados.tornozeloDorsi1D, dados.tornozeloDorsi1E);
      formatField('Dorsiflexão Tornozelo (Joelho Estendido)', dados.tornozeloDorsi2D, dados.tornozeloDorsi2E);
      formatField('Flexão de Joelho', dados.joelhoFlexaoD, dados.joelhoFlexaoE);
      formatField('Ângulo Poplíteo (Joelho)', dados.joelhoPopliteoD, dados.joelhoPopliteoE);
      formatField('Rotação Interna de Ombro', dados.ombroRotIntD, dados.ombroRotIntE);
      formatField('Rotação Externa de Ombro', dados.ombroRotExtD, dados.ombroRotExtE);
      break;
    }

    case 'TESTES_ESPECIAIS': {
      lines.push('[TESTES ORTOPÉDICOS ESPECIAIS AVULSOS]');
      lines.push(`Data do Teste: ${dataFormatada}\n`);

      if (dados.thomas) lines.push(`• Teste de Thomas (Retração Flexores de Quadril): ${dados.thomas}`);
      if (dados.ober) lines.push(`• Teste de Ober (Retração Trato Iliotibial): ${dados.ober}`);
      if (dados.estrelaMaggi) lines.push(`• Teste de Estrela de Maggi: ${dados.estrelaMaggi}`);
      if (dados.kfboD != null || dados.kfboE != null) {
        lines.push(`• KFBO (Rotação Joelho Fletido): D ${dados.kfboD ?? '-'}° | E ${dados.kfboE ?? '-'}°`);
      }
      break;
    }

    case 'COMPOSICAO_CORPORAL': {
      lines.push('[AVALIAÇÃO DE COMPOSIÇÃO CORPORAL AVULSA]');
      lines.push(`Data do Teste: ${dataFormatada}\n`);

      if (dados.peso) lines.push(`• Peso Corporal: ${dados.peso} kg`);
      if (dados.percentualGordura) lines.push(`• Percentual de Gordura: ${dados.percentualGordura}%`);
      if (dados.massaMagraKg) lines.push(`• Massa Magra Estimada: ${dados.massaMagraKg} kg`);
      break;
    }

    case 'PERIMETRIA': {
      lines.push('[PERIMETRIA CORPORAL AVULSA]');
      lines.push(`Data da Medição: ${dataFormatada}\n`);

      if (dados.braçoD || dados.braçoE) lines.push(`• Braço: D ${dados.braçoD || '-'} cm | E ${dados.braçoE || '-'} cm`);
      if (dados.coxaD || dados.coxaE) lines.push(`• Coxa: D ${dados.coxaD || '-'} cm | E ${dados.coxaE || '-'} cm`);
      if (dados.cintura) lines.push(`• Cintura: ${dados.cintura} cm`);
      if (dados.quadril) lines.push(`• Quadril: ${dados.quadril} cm`);
      break;
    }

    default: {
      lines.push(`[REGISTRO CLÍNICO / TESTE AVULSO - ${tipoTeste}]`);
      lines.push(`Data: ${dataFormatada}\n`);
      if (metricas.scorePrincipal != null) {
        lines.push(`• Score: ${metricas.scorePrincipal}`);
      }
      if (metricas.classificacao) {
        lines.push(`• Classificação: ${metricas.classificacao}`);
      }
      break;
    }
  }

  // Comparativo Longitudinal
  if (comparativoAnterior && comparativoAnterior.statusEvolucao) {
    lines.push('\n[COMPARATIVO COM TESTE ANTERIOR]');
    const dataAntFmt = comparativoAnterior.dataAnterior ? comparativoAnterior.dataAnterior.split('-').reverse().join('/') : '-';
    lines.push(`• Data do Teste Anterior: ${dataAntFmt}`);
    lines.push(`• Evolução Clínica: ${comparativoAnterior.statusEvolucao.toUpperCase()}`);
    if (comparativoAnterior.diferencaScore != null) {
      lines.push(`• Variação Absoluta: ${comparativoAnterior.diferencaScore > 0 ? '+' : ''}${comparativoAnterior.diferencaScore}`);
    }
    if (comparativoAnterior.evolucaoPercentual != null) {
      lines.push(`• Variação Percentual: ${comparativoAnterior.evolucaoPercentual > 0 ? '+' : ''}${comparativoAnterior.evolucaoPercentual}%`);
    }
  }

  // Observações do Avaliador
  if (observacoes && observacoes.trim()) {
    lines.push('\n[OBSERVAÇÕES CLÍNICAS & CONDUTA]');
    lines.push(observacoes.trim());
  }

  return lines.join('\n');
}

