/**
 * Motor de Ciclo de Vida Contratual e Histórico de Serviços (Anti-Sobrescrita)
 * Suporte a Multi-Planos Concorrentes e Soma Unificada de Créditos
 * Clube Fitness Fisio
 */

export interface ArchivedContractSnapshot {
  contratoId?: string;
  planoId?: string;
  planoNome: string;
  tipoPlano?: string;
  valorContratado: number;
  formaPagamento?: string;
  parcelas?: number;
  dataInicio: string;
  dataFim: string;
  statusCiclo: 'concluido' | 'renovado' | 'cancelado' | 'migrado_upgrade' | 'expirado_nao_renovou';
  creditosTotalCiclo?: number;
  creditosUtilizadosCiclo?: number;
  responsavelVenda?: string;
  origemVenda?: string;
  observacoes?: string;
  dataArquivamento?: Date;
}

/**
 * Cria um snapshot fiel do contrato atual (dadosComerciais) para arquivamento no historicoContratos
 */
export function buildContractSnapshot(
  com: any,
  statusCiclo: 'concluido' | 'renovado' | 'cancelado' | 'migrado_upgrade' | 'expirado_nao_renovou' = 'concluido',
  motivo: string = ''
): ArchivedContractSnapshot | null {
  if (!com) return null;
  const planoNome = com.planoNome || (com.planoId?.nome) || 'Plano Anterior';
  if (!com.dataInicio && !com.valorUnitario && !com.planoId) return null;

  return {
    contratoId: com.contratoId || com._id,
    planoId: com.planoId?._id || com.planoId,
    planoNome: planoNome,
    tipoPlano: com.duracao === 'anual' ? 'Anual' : (com.criarRecorrenciaMensal ? 'Recorrente' : 'Mensal'),
    valorContratado: Number(com.valorUnitario || com.valorAcordado || 0),
    formaPagamento: com.formaPagamento || 'pix',
    parcelas: Number(com.parcelas || 1),
    dataInicio: com.dataInicio || '',
    dataFim: com.vencimento || '',
    statusCiclo: statusCiclo,
    creditosTotalCiclo: Number(com.creditosTotal || 0),
    creditosUtilizadosCiclo: Number(com.creditosUsados || 0),
    responsavelVenda: com.responsavelVenda || '',
    origemVenda: com.origemCadastro || 'painel_admin',
    observacoes: motivo ? `${com.observacoesContratuais || ''}\n[Encerramento: ${motivo}]`.trim() : (com.observacoesContratuais || ''),
    dataArquivamento: new Date()
  };
}

/**
 * Retorna todos os contratos ativos (Principal em dadosComerciais + Adicionais em contratosAtivos)
 */
export function getActiveContractsList(client: any): any[] {
  if (!client) return [];
  const list: any[] = [];
  const com = client.dadosComerciais;

  // 1. Contrato Principal
  if (com && (com.planoId || com.valorUnitario || com.dataInicio)) {
    const isAtivo = com.status !== 'inativo' && com.status !== 'cancelado' && com.status !== 'finalizado';
    list.push({
      id: 'principal',
      isPrincipal: true,
      planoNome: com.planoNome || com.planoId?.nome || 'Plano Principal',
      planoId: com.planoId,
      tipoPlano: 'Principal',
      valorUnitario: Number(com.valorUnitario || 0),
      formaPagamento: com.formaPagamento || 'pix',
      parcelas: com.parcelas || 1,
      dataInicio: com.dataInicio || '',
      dataFim: com.vencimento || '',
      creditosTotal: Number(com.creditosTotal || 0),
      creditosUsados: Number(com.creditosUsados || 0),
      creditosDisponiveis: Math.max(0, Number(com.creditosTotal || 0) - Number(com.creditosUsados || 0) - Number(com.creditosReservados || 0)),
      creditosMassagemTotal: Number(com.creditosMassagemTotal || 0),
      creditosMassagemUsados: Number(com.creditosMassagemUsados || 0),
      creditosRecoveryTotal: Number(com.creditosRecoveryTotal || 0),
      creditosRecoveryUsados: Number(com.creditosRecoveryUsados || 0),
      status: isAtivo ? 'ativo' : com.status,
      asaasCustomerId: com.asaasCustomerId || ''
    });
  }

  // 2. Contratos Concorrentes / Adicionais
  if (Array.isArray(client.contratosAtivos)) {
    client.contratosAtivos.forEach((c: any, idx: number) => {
      if (c && c.status === 'ativo') {
        list.push({
          id: c._id || `adicional_${idx}`,
          isPrincipal: false,
          planoNome: c.planoNome,
          planoId: c.planoId,
          tipoPlano: c.tipoPlano || 'Adicional',
          valorUnitario: Number(c.valorUnitario || 0),
          formaPagamento: c.formaPagamento || 'pix',
          parcelas: c.parcelas || 1,
          dataInicio: c.dataInicio || '',
          dataFim: c.dataFim || '',
          creditosTotal: Number(c.creditosTotal || 0),
          creditosUsados: Number(c.creditosUsados || 0),
          creditosDisponiveis: Math.max(0, Number(c.creditosTotal || 0) - Number(c.creditosUsados || 0) - Number(c.creditosReservados || 0)),
          creditosMassagemTotal: Number(c.creditosMassagemTotal || 0),
          creditosMassagemUsados: Number(c.creditosMassagemUsados || 0),
          creditosRecoveryTotal: Number(c.creditosRecoveryTotal || 0),
          creditosRecoveryUsados: Number(c.creditosRecoveryUsados || 0),
          status: c.status || 'ativo',
          asaasCustomerId: c.asaasCustomerId || ''
        });
      }
    });
  }

  return list;
}

/**
 * Calcula a soma consolidada de créditos de todos os contratos ativos do cliente
 */
export function getConsolidatedClientCredits(client: any): {
  total: number;
  usados: number;
  reservados: number;
  disponiveis: number;
  massagemDisponiveis: number;
  recoveryDisponiveis: number;
  emergenciaDisponiveis: number;
  detalhamentoPorContrato: any[];
} {
  const activeContracts = getActiveContractsList(client);

  let total = 0;
  let usados = 0;
  let reservados = 0;
  let massagemTotal = 0;
  let massagemUsados = 0;
  let recoveryTotal = 0;
  let recoveryUsados = 0;
  let emergenciaTotal = 0;
  let emergenciaUsados = 0;

  activeContracts.forEach(c => {
    total += Number(c.creditosTotal || 0);
    usados += Number(c.creditosUsados || 0);
    reservados += Number(c.creditosReservados || 0);
    massagemTotal += Number(c.creditosMassagemTotal || 0);
    massagemUsados += Number(c.creditosMassagemUsados || 0);
    recoveryTotal += Number(c.creditosRecoveryTotal || 0);
    recoveryUsados += Number(c.creditosRecoveryUsados || 0);
    emergenciaTotal += Number(c.creditosEmergenciaTotal || 0);
    emergenciaUsados += Number(c.creditosEmergenciaUsados || 0);
  });

  const disponiveis = Math.max(0, total - usados - reservados);
  const massagemDisponiveis = Math.max(0, massagemTotal - massagemUsados);
  const recoveryDisponiveis = Math.max(0, recoveryTotal - recoveryUsados);
  const emergenciaDisponiveis = Math.max(0, emergenciaTotal - emergenciaUsados);

  return {
    total,
    usados,
    reservados,
    disponiveis,
    massagemDisponiveis,
    recoveryDisponiveis,
    emergenciaDisponiveis,
    detalhamentoPorContrato: activeContracts
  };
}
