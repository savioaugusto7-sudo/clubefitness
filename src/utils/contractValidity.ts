/**
 * Motor Unificado de Vigência e Status Contratual (Smart Validity Engine)
 * Clube Fitness - Sistema de Gestão
 */

export interface ContractValidityInfo {
  dataInicio: string;
  dataFim: string;
  dataFimRecorrencia: string;
  dataFimCicloTotal: string;
  dataInicioFormatted: string;
  dataFimFormatted: string;
  dataFimRecorrenciaFormatted: string;
  dataFimCicloTotalFormatted: string;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysLeft: number;
  daysLeftText: string;
  statusKey: 'ativo' | 'vencendo' | 'vencido' | 'congelado' | 'lead' | 'inativo' | 'finalizado';
  statusLabel: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  parcelasInfo?: string;
  hasOverdueInstallment?: boolean;
  isEndOfRecurrenceCycle?: boolean;
  recorrenciaMeses?: number;
}

function safeParseDate(input: any): Date {
  if (!input) return new Date();
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? new Date() : new Date(input.getTime());
  }
  const str = String(input).trim();
  if (!str) return new Date();

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(str + 'T12:00:00');
    return isNaN(d.getTime()) ? new Date() : d;
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [dia, mes, ano] = str.split('/');
    const d = new Date(`${ano}-${mes}-${dia}T12:00:00`);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? new Date() : d;
}

function safeFormatYYYYMMDD(d: Date): string {
  try {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

const formatPtBr = (dStr: string) => {
  try {
    if (!dStr) return '';
    const [y, m, d] = dStr.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    const parsed = safeParseDate(dStr);
    return parsed.toLocaleDateString('pt-BR');
  } catch {
    return dStr;
  }
};

export function calculateContractEndDate(
  dataInicioStr?: any,
  duracao?: 'anual' | 'semestral' | 'mensal' | 'semana' | 'indeterminado' | string,
  vigenciaQtd?: number,
  currentVencimento?: any,
  isRecorrente?: boolean
): string {
  try {
    const startD = safeParseDate(dataInicioStr);
    const qty = Number(vigenciaQtd) && Number(vigenciaQtd) > 0 ? Number(vigenciaQtd) : 1;
    const dur = (duracao || 'mensal').toString().toLowerCase();

    // Para planos de período fechado: cálculo contratual direto a partir da data de início
    if (!isRecorrente) {
      const endD = new Date(startD);
      if (dur === 'anual') {
        const anos = qty >= 12 ? 1 : qty;
        endD.setFullYear(endD.getFullYear() + anos);
      } else if (dur === 'semestral') {
        const meses = qty >= 6 ? qty : qty * 6;
        endD.setMonth(endD.getMonth() + meses);
      } else if (dur === 'semana') {
        endD.setDate(endD.getDate() + (qty * 7));
      } else if (dur === 'indeterminado') {
        endD.setFullYear(endD.getFullYear() + 10);
      } else {
        // mensal
        endD.setMonth(endD.getMonth() + qty);
      }
      return safeFormatYYYYMMDD(endD);
    }

    // Para planos recorrentes: a vigência mensal de acesso é computada estritamente a partir da data de início
    const endD = new Date(startD);
    endD.setMonth(endD.getMonth() + (qty > 0 ? qty : 1));
    return safeFormatYYYYMMDD(endD);
  } catch (err) {
    console.error('[calculateContractEndDate] Error calculating date:', err);
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);
    return safeFormatYYYYMMDD(now);
  }
}

export function getContractValidityInfo(client: any, planObj?: any, clientPayments?: any[]): ContractValidityInfo {
  try {
    const com = client?.dadosComerciais || {};
    const dp = client?.dadosPessoais || {};
    const statusSaved = (com.status || client?.status || 'ativo').toString().toLowerCase();

    // Detecção de Convênio Dynamus
    const isDynamus = Boolean(
      planObj?.nome?.toLowerCase().includes('dynamus') ||
      com.planoNome?.toLowerCase().includes('dynamus') ||
      dp.email?.toLowerCase().includes('dynamus') ||
      client?.codigo?.toUpperCase().includes('DYN') ||
      client?.dadosClinicos?.observacoes?.toLowerCase().includes('dynamus')
    );

    const isSemestral = (com.duracao || '').toLowerCase().includes('semestral') || 
                        (planObj?.nome || '').toLowerCase().includes('semestral') || 
                        com.parcelas === 6;
    const isAnual = !isSemestral && (com.duracao === 'anual' || (!com.duracao && planObj?.tipo === 'Anual') || (planObj?.nome || '').toLowerCase().includes('anual'));
    
    let duracao = isSemestral ? 'semestral' : (isAnual ? 'anual' : (com.duracao || 'mensal'));
    let vigenciaQtd = isDynamus ? 1 : (com.duracaoQtd || com.vigenciaQtd || (isAnual || isSemestral ? 1 : 1));
    const dataInicioRaw = com.dataInicio || client?.createdAt || new Date();
    const isRecorrente = isDynamus ? false : Boolean(com.criarRecorrenciaMensal || com.recorrenciaVigencia);

    const dataInicio = safeFormatYYYYMMDD(safeParseDate(dataInicioRaw));

    // 1. DATA FIM DA RECORRÊNCIA (Ciclo Contratual Total de 12 Meses)
    // Para planos recorrentes: calcula a partir de recorrenciaMeses (padrão 12 meses)
    let dataFimRecorrencia = '';
    const recorrenciaMeses = Number(com.recorrenciaMeses) > 0 ? Number(com.recorrenciaMeses) : 12;

    if (isRecorrente) {
      const startD = safeParseDate(dataInicio);
      const recEndD = new Date(startD);
      recEndD.setMonth(recEndD.getMonth() + recorrenciaMeses);
      dataFimRecorrencia = safeFormatYYYYMMDD(recEndD);
    } else {
      dataFimRecorrencia = calculateContractEndDate(dataInicio, duracao, vigenciaQtd, undefined, false);
    }
    const dataFimCicloTotal = dataFimRecorrencia;

    // 2. DATA FIM DO MÊS (Vigência de Acesso Mensal liberada pelas parcelas pagas)
    // O ciclo de acesso é SEMPRE calculado a partir da Data de Início (dataInicio)
    const paymentsList = clientPayments || client?.payments || [];
    let dynamicEndDate: string | null = null;
    let parcelasInfo = '';
    let hasOverdueInstallment = false;
    let isEndOfRecurrenceCycle = false;

    if (isRecorrente) {
      const startD = safeParseDate(dataInicio);
      const accessEndD = new Date(startD);

      if (Array.isArray(paymentsList) && paymentsList.length > 0) {
        // Considerar pagamentos vinculados ao contrato atual (a partir da data de início)
        const thresholdDate = new Date(startD);
        thresholdDate.setDate(thresholdDate.getDate() - 25);
        const thresholdStr = safeFormatYYYYMMDD(thresholdDate);

        const currentContractPayments = paymentsList.filter((p: any) => (p.vencimento || '') >= thresholdStr);
        const pagas = currentContractPayments.filter((p: any) => p.status === 'Pago');
        const atrasadas = currentContractPayments.filter((p: any) => p.status === 'Atrasado');

        parcelasInfo = `${pagas.length}/${currentContractPayments.length || recorrenciaMeses} pagas`;

        if (atrasadas.length > 0) {
          hasOverdueInstallment = true;
        }

        // Cada parcela paga do contrato atual estende +1 mês a partir da data de início
        const mesesLiberados = Math.min(recorrenciaMeses, Math.max(1, pagas.length));
        accessEndD.setMonth(accessEndD.getMonth() + mesesLiberados);
        dynamicEndDate = safeFormatYYYYMMDD(accessEndD);
      } else {
        // Ciclo inicial: 1 mês a partir da data de início
        accessEndD.setMonth(accessEndD.getMonth() + 1);
        dynamicEndDate = safeFormatYYYYMMDD(accessEndD);
      }
    }

    // Vigência oficial de acesso mensal para o aluno
    let dataFim = isDynamus
      ? dataFimCicloTotal
      : (dynamicEndDate || calculateContractEndDate(dataInicio, duracao, vigenciaQtd, com.vencimento, isRecorrente));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endD = safeParseDate(dataFim);
    endD.setHours(0, 0, 0, 0);
    const diffTime = endD.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Análise de Fim de Ciclo Anual (Data Fim da Recorrência - 12 Meses)
    const cicloEndD = safeParseDate(dataFimRecorrencia);
    cicloEndD.setHours(0, 0, 0, 0);
    const diffCicloTime = cicloEndD.getTime() - today.getTime();
    const diffCicloDays = Math.ceil(diffCicloTime / (1000 * 60 * 60 * 24));

    let isExpired = false;
    let isExpiringSoon = false;
    let daysLeftText = '';

    if (hasOverdueInstallment) {
      isExpired = true;
      daysLeftText = 'Parcela em atraso';
    } else if (isRecorrente) {
      // REGRA FUNDAMENTAL DE RECORRÊNCIA:
      // O filtro e status de "Renovação <30d" lê EXCLUSIVAMENTE a dataFimRecorrencia (ciclo de 12 meses).
      // Durante os meses 1 a 11, o aluno permanece em dia e NÃO entra em renovação.
      if (diffDays < 0) {
        isExpired = true;
        daysLeftText = `Ciclo pago venceu há ${Math.abs(diffDays)}d`;
      } else if (diffCicloDays <= 30) {
        isExpiringSoon = true;
        daysLeftText = diffCicloDays <= 0 ? 'Ciclo de 12m Encerrado' : `Renovação Anual em ${diffCicloDays}d`;
      } else {
        // Aluno em dia mês a mês durante o ciclo de 12 meses
        daysLeftText = `Próx. Parcela em ${diffDays}d`;
      }
    } else {
      // Planos de período fechado normais (sem recorrência)
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
    }

    // Status Badge
    let statusKey: 'ativo' | 'vencendo' | 'vencido' | 'congelado' | 'lead' | 'inativo' | 'finalizado' = 'ativo';
    let statusLabel = isRecorrente ? 'Contrato Vigente (Recorrência)' : 'Contrato Ativo';
    let badgeColor = '#10b981';
    let badgeBg = 'rgba(16, 185, 129, 0.12)';
    let badgeBorder = 'rgba(16, 185, 129, 0.3)';

    if (statusSaved === 'finalizado') {
      statusKey = 'finalizado';
      statusLabel = 'Finalizado (Não Renovou)';
      badgeColor = '#9ca3af';
      badgeBg = 'rgba(107, 114, 128, 0.15)';
      badgeBorder = 'rgba(107, 114, 128, 0.35)';
      daysLeftText = 'Encerrado';
      isExpired = false;
      isExpiringSoon = false;
    } else if (statusSaved === 'congelado') {
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
    } else if (hasOverdueInstallment) {
      statusKey = 'vencido';
      statusLabel = 'Inadimplente (Asaas)';
      badgeColor = '#ef4444';
      badgeBg = 'rgba(239, 68, 68, 0.12)';
      badgeBorder = 'rgba(239, 68, 68, 0.3)';
    } else if (isExpired) {
      statusKey = 'vencido';
      statusLabel = isRecorrente ? 'Recorrência Vencida' : 'Vencido';
      badgeColor = '#ef4444';
      badgeBg = 'rgba(239, 68, 68, 0.12)';
      badgeBorder = 'rgba(239, 68, 68, 0.3)';
    } else if (isExpiringSoon) {
      statusKey = 'vencendo';
      statusLabel = isRecorrente ? 'Renovação Anual (<30d)' : 'Vencendo em Breve';
      badgeColor = '#f59e0b';
      badgeBg = 'rgba(245, 158, 11, 0.12)';
      badgeBorder = 'rgba(245, 158, 11, 0.3)';
    }

    return {
      dataInicio,
      dataFim,
      dataFimRecorrencia,
      dataFimCicloTotal,
      dataInicioFormatted: formatPtBr(dataInicio),
      dataFimFormatted: formatPtBr(dataFim),
      dataFimRecorrenciaFormatted: formatPtBr(dataFimRecorrencia),
      dataFimCicloTotalFormatted: formatPtBr(dataFimCicloTotal),
      isExpired,
      isExpiringSoon,
      daysLeft: diffDays,
      daysLeftText,
      statusKey,
      statusLabel,
      badgeColor,
      badgeBg,
      badgeBorder,
      parcelasInfo,
      hasOverdueInstallment,
      isEndOfRecurrenceCycle,
      recorrenciaMeses
    };
  } catch (err) {
    console.error('[getContractValidityInfo] Error:', err);
    return {
      dataInicio: '2026-01-01',
      dataFim: '2026-02-01',
      dataFimRecorrencia: '2027-01-01',
      dataFimCicloTotal: '2027-01-01',
      dataInicioFormatted: '01/01/2026',
      dataFimFormatted: '01/02/2026',
      dataFimRecorrenciaFormatted: '01/01/2027',
      dataFimCicloTotalFormatted: '01/01/2027',
      isExpired: false,
      isExpiringSoon: false,
      daysLeft: 365,
      daysLeftText: '365d restantes',
      statusKey: 'ativo',
      statusLabel: 'Contrato Ativo',
      badgeColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.12)',
      badgeBorder: 'rgba(16, 185, 129, 0.3)'
    };
  }
}
