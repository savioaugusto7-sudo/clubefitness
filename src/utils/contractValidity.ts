/**
 * Motor Unificado de Vigência e Status Contratual (Smart Validity Engine)
 * Clube Fitness - Sistema de Gestão
 */

export interface ContractValidityInfo {
  dataInicio: string;
  dataFim: string;
  dataInicioFormatted: string;
  dataFimFormatted: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysLeft: number;
  daysLeftText: string;
  statusKey: 'ativo' | 'vencendo' | 'vencido' | 'congelado' | 'lead' | 'inativo';
  statusLabel: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
}

export function calculateContractEndDate(
  dataInicioStr?: string,
  duracao?: 'anual' | 'mensal' | 'semana' | 'indeterminado' | string,
  vigenciaQtd?: number,
  currentVencimento?: string,
  isRecorrente?: boolean
): string {
  const effectiveDataInicio = dataInicioStr || new Date().toISOString().split('T')[0];
  const startD = new Date(effectiveDataInicio + 'T00:00:00');
  const qty = Number(vigenciaQtd) && Number(vigenciaQtd) > 0 ? Number(vigenciaQtd) : 1;
  const dur = (duracao || 'mensal').toLowerCase();

  // Para planos de período fechado (sem recorrência): cálculo contratual direto a partir da data de início
  if (!isRecorrente) {
    const endD = new Date(startD);
    if (dur === 'anual') {
      endD.setFullYear(endD.getFullYear() + qty);
    } else if (dur === 'semana') {
      endD.setDate(endD.getDate() + (qty * 7));
    } else if (dur === 'indeterminado') {
      endD.setFullYear(endD.getFullYear() + 10);
    } else {
      // mensal
      endD.setMonth(endD.getMonth() + qty);
    }
    return endD.toISOString().split('T')[0];
  }

  // Para planos recorrentes: a vigência é a data da competência da última parcela/ciclo ativo
  if (currentVencimento) {
    return currentVencimento;
  }

  // Fallback para recorrente inicial
  const endD = new Date(startD);
  endD.setMonth(endD.getMonth() + 1);
  return endD.toISOString().split('T')[0];
}

export function getContractValidityInfo(client: any, planObj?: any): ContractValidityInfo {
  const com = client?.dadosComerciais || {};
  const statusSaved = (com.status || 'ativo').toLowerCase();

  const isAnual = com.duracao === 'anual' || (!com.duracao && planObj?.tipo === 'Anual');
  const duracao = isAnual ? 'anual' : (com.duracao || 'mensal');
  const vigenciaQtd = com.duracaoQtd || com.vigenciaQtd || (isAnual ? 1 : 1);
  const dataInicio = com.dataInicio || client?.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
  const isRecorrente = Boolean(com.criarRecorrenciaMensal);

  // Calcula a data fim oficial
  const dataFim = calculateContractEndDate(dataInicio, duracao, vigenciaQtd, com.vencimento, isRecorrente);

  // Análise de Dias Restantes e Status
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endD = new Date(dataFim + 'T00:00:00');
  const diffTime = endD.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let isExpired = false;
  let isExpiringSoon = false;
  let daysLeftText = '';

  if (diffDays < 0) {
    isExpired = true;
    daysLeftText = `Vencido há ${Math.abs(diffDays)}d`;
  } else if (diffDays === 0) {
    isExpiringSoon = true;
    daysLeftText = 'Vence hoje';
  } else if (diffDays <= 30) {
    isExpiringSoon = true;
    daysLeftText = `Vence em ${diffDays}d`;
  } else {
    daysLeftText = `${diffDays}d restantes`;
  }

  // Status Badge
  let statusKey: 'ativo' | 'vencendo' | 'vencido' | 'congelado' | 'lead' | 'inativo' = 'ativo';
  let statusLabel = 'Contrato Ativo';
  let badgeColor = '#10b981';
  let badgeBg = 'rgba(16, 185, 129, 0.12)';
  let badgeBorder = 'rgba(16, 185, 129, 0.3)';

  if (statusSaved === 'congelado') {
    statusKey = 'congelado';
    statusLabel = 'Congelado';
    badgeColor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.12)';
    badgeBorder = 'rgba(245, 158, 11, 0.3)';
  } else if (statusSaved === 'lead') {
    statusKey = 'lead';
    statusLabel = 'Lead / Avaliação';
    badgeColor = '#8b5cf6';
    badgeBg = 'rgba(139, 92, 246, 0.12)';
    badgeBorder = 'rgba(139, 92, 246, 0.3)';
  } else if (statusSaved === 'inativo') {
    statusKey = 'inativo';
    statusLabel = 'Inativo';
    badgeColor = '#64748b';
    badgeBg = 'rgba(100, 116, 139, 0.12)';
    badgeBorder = 'rgba(100, 116, 139, 0.3)';
  } else if (isExpired) {
    statusKey = 'vencido';
    statusLabel = 'Vencido';
    badgeColor = '#ef4444';
    badgeBg = 'rgba(239, 68, 68, 0.12)';
    badgeBorder = 'rgba(239, 68, 68, 0.3)';
  } else if (isExpiringSoon) {
    statusKey = 'vencendo';
    statusLabel = 'Vencendo em Breve';
    badgeColor = '#f59e0b';
    badgeBg = 'rgba(245, 158, 11, 0.12)';
    badgeBorder = 'rgba(245, 158, 11, 0.3)';
  }

  const formatPtBr = (dStr: string) => {
    try {
      const [y, m, d] = dStr.split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return new Date(dStr + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch {
      return dStr;
    }
  };

  return {
    dataInicio,
    dataFim,
    dataInicioFormatted: formatPtBr(dataInicio),
    dataFimFormatted: formatPtBr(dataFim),
    isExpired,
    isExpiringSoon,
    daysLeft: diffDays,
    daysLeftText,
    statusKey,
    statusLabel,
    badgeColor,
    badgeBg,
    badgeBorder
  };
}
