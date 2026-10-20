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
  statusKey: 'ativo' | 'vencendo' | 'vencido' | 'congelado' | 'lead' | 'inativo' | 'finalizado' | 'pendente';
  statusLabel: string;
  badgeColor: string;
  badgeBg: string;
  badgeBorder: string;
  parcelasInfo?: string;
  hasOverdueInstallment?: boolean;
  isEndOfRecurrenceCycle?: boolean;
  isRecorrente?: boolean;
  recorrenciaMeses?: number;
  isWithinTolerance?: boolean;
  toleranceDaysLeft?: number;
  overdueDays?: number;
  canSchedule?: boolean;
  isLead?: boolean;
  isUncontracted?: boolean;
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

import { formatDateSafeBR } from './dateFormatter';

const formatPtBr = (dStr: string) => {
  return formatDateSafeBR(dStr);
};

function addMonthsWithClamping(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = (result.getMonth() + months) % 12;
  result.setMonth(result.getMonth() + months);
  if (result.getMonth() !== targetMonth) {
    result.setDate(0);
  }
  return result;
}

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
      if (dur === 'anual') {
        const endD = new Date(startD);
        const anos = qty >= 12 ? 1 : qty;
        endD.setFullYear(endD.getFullYear() + anos);
        return safeFormatYYYYMMDD(endD);
      } else if (dur === 'semestral') {
        const meses = qty >= 6 ? qty : qty * 6;
        return safeFormatYYYYMMDD(addMonthsWithClamping(startD, meses));
      } else if (dur === 'semana') {
        const endD = new Date(startD);
        endD.setDate(endD.getDate() + (qty * 7));
        return safeFormatYYYYMMDD(endD);
      } else if (dur === 'indeterminado') {
        const endD = new Date(startD);
        endD.setFullYear(endD.getFullYear() + 10);
        return safeFormatYYYYMMDD(endD);
      } else {
        // mensal
        return safeFormatYYYYMMDD(addMonthsWithClamping(startD, qty));
      }
    }

    // Para planos recorrentes: a vigência mensal de acesso é computada estritamente a partir da data de início (ciclo inicial)
    const qtyMonths = qty > 0 ? qty : 1;
    return safeFormatYYYYMMDD(addMonthsWithClamping(startD, qtyMonths));
  } catch (err) {
    console.error('[calculateContractEndDate] Error calculating date:', err);
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);
    return safeFormatYYYYMMDD(now);
  }
}

export function getContractValidityInfo(
  client: any, 
  planObj?: any, 
  clientPayments?: any[],
  latestContractOrContracts?: any
): ContractValidityInfo {
  try {
    // Normalização flexível de parâmetros (suporte a polimorfismo de chamadas)
    let resolvedPlan = planObj;
    let resolvedPayments = clientPayments;
    let resolvedContracts = latestContractOrContracts;

    if (Array.isArray(planObj) && !clientPayments && !latestContractOrContracts) {
      resolvedPayments = planObj;
      resolvedPlan = undefined;
    } else if (Array.isArray(planObj) && Array.isArray(clientPayments) && !latestContractOrContracts) {
      const firstItem = planObj[0];
      const isPayment = firstItem && (firstItem.vencimento !== undefined || firstItem.dataPagamento !== undefined || firstItem.status !== undefined);
      if (isPayment) {
        resolvedPayments = planObj;
        resolvedContracts = clientPayments;
        resolvedPlan = undefined;
      }
    }

    // 1. Resolução do Contrato Oficial Único (Prioridade Máxima e Absoluta)
    let contract: any = null;
    if (resolvedContracts) {
      if (Array.isArray(resolvedContracts)) {
        const sorted = [...resolvedContracts].sort((a: any, b: any) => {
          const vA = Number(a.versao || 0);
          const vB = Number(b.versao || 0);
          if (vB !== vA) return vB - vA;
          return (b.dataFim || '').localeCompare(a.dataFim || '');
        });
        contract = sorted.find((c: any) => c.status === 'assinado' || c.status === 'ativo') || sorted[0] || null;
      } else if (typeof resolvedContracts === 'object') {
        contract = resolvedContracts;
      }
    }

    if (!contract && client?.latestContract) {
      contract = client.latestContract;
    }

    // Proteção de assinatura: se o array de pagamentos na verdade contiver contratos
    let paymentsList = resolvedPayments || client?.payments || [];
    if (Array.isArray(paymentsList) && paymentsList.length > 0 && (paymentsList[0]?.versao !== undefined || paymentsList[0]?.clicksignStatus !== undefined)) {
      if (!contract) {
        const sorted = [...paymentsList].sort((a: any, b: any) => {
          const vA = Number(a.versao || 0);
          const vB = Number(b.versao || 0);
          if (vB !== vA) return vB - vA;
          return (b.dataFim || '').localeCompare(a.dataFim || '');
        });
        contract = sorted.find((c: any) => c.status === 'assinado' || c.status === 'ativo') || sorted[0] || null;
      }
      paymentsList = client?.payments || [];
    }

    const com = client?.dadosComerciais || {};
    const dp = client?.dadosPessoais || {};

    // Detecção de Convênio Dynamus
    const isDynamus = Boolean(
      com.isConvenioDynamus ||
      resolvedPlan?.nome?.toLowerCase().includes('dynamus') ||
      com.planoNome?.toLowerCase().includes('dynamus') ||
      dp.email?.toLowerCase().includes('dynamus') ||
      client?.codigo?.toUpperCase().includes('DYN') ||
      client?.dadosClinicos?.observacoes?.toLowerCase().includes('dynamus')
    );

    const hasClubePlan = Boolean(com.planoId && !resolvedPlan?.nome?.toLowerCase().includes('dynamus'));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = safeFormatYYYYMMDD(today);

    // =========================================================================
    // 🅰️ CENÁRIO 1: ALUNO COM CONTRATO OFICIAL (Coleção Contract)
    // O contrato é a AUTORIDADE ÚNICA E ABSOLUTA (Zero Fallback Ambíguo)
    // =========================================================================
    if (contract && (contract.status || contract.dataInicio || contract.dataFim)) {
      const contractStatus = String(contract.status || 'assinado').toLowerCase();
      const isAnual = contract.duracao === 'anual' || (contract.planoNome || '').toLowerCase().includes('anual') || (Number(contract.vigenciaMeses) >= 12);
      const duracao = isAnual ? 'anual' : (contract.duracao || 'mensal');
      const vigenciaQtd = isAnual ? 1 : (Number(contract.vigenciaMeses) || Number(contract.vigenciaQtd) || 1);
      const isRecorrente = Boolean(
        contract.criarRecorrenciaMensal ||
        contract.isRecorrente ||
        contract.recorrenciaVigencia ||
        com.criarRecorrenciaMensal ||
        com.isRecorrente ||
        com.recorrenciaVigencia
      );

      const dataInicioRaw = contract.dataInicio || contract.dataEmissao || contract.createdAt || todayStr;
      const dataInicio = safeFormatYYYYMMDD(safeParseDate(dataInicioRaw));

      const isPaidStatus = (s: string) => {
        const st = (s || '').toLowerCase();
        return st === 'pago' || st === 'received' || st === 'confirmed' || st === 'received_in_cash' || st === 'recebido';
      };

      const pagas = (Array.isArray(paymentsList) ? paymentsList : []).filter((p: any) => isPaidStatus(p.status));
      const atrasadas = (Array.isArray(paymentsList) ? paymentsList : []).filter((p: any) => {
        if (isPaidStatus(p.status)) return false;
        if (p.status === 'Atrasado' || p.status === 'OVERDUE') return true;
        return p.vencimento && p.vencimento < todayStr;
      });
      const hasOverdueInstallment = atrasadas.length > 0;

      let isWithinTolerance = false;
      let toleranceDaysLeft = 0;
      let overdueDays = 0;

      if (hasOverdueInstallment && atrasadas.length > 0) {
        const earliestOverdue = [...atrasadas].sort((a: any, b: any) => (a.vencimento || '').localeCompare(b.vencimento || ''))[0];
        if (earliestOverdue?.vencimento) {
          const overD = safeParseDate(earliestOverdue.vencimento);
          overD.setHours(0, 0, 0, 0);
          overdueDays = Math.max(1, Math.ceil((today.getTime() - overD.getTime()) / (1000 * 60 * 60 * 24)));
          if (overdueDays <= 5) {
            isWithinTolerance = true;
            toleranceDaysLeft = Math.max(0, 5 - overdueDays);
          }
        }
      }

      // Separação de Horizontes para Recorrência:
      const recorrenciaMeses = Number(contract.recorrenciaMeses || com.recorrenciaMeses) || 12;
      const dataFimRecorrencia = isRecorrente
        ? (contract.dataFimRecorrencia || safeFormatYYYYMMDD(addMonthsWithClamping(safeParseDate(dataInicio), recorrenciaMeses)))
        : (contract.dataFim || calculateContractEndDate(dataInicio, duracao, vigenciaQtd, undefined, false));
      const dataFimCicloTotal = dataFimRecorrencia;

      // Vigência do Ciclo Atual de Acesso (dataFim)
      let dataFim = '';
      if (isRecorrente) {
        // Encontrar a próxima fatura pendente futura para definir o término do ciclo pago
        const pendingPayments = (Array.isArray(paymentsList) ? paymentsList : [])
          .filter((p: any) => !isPaidStatus(p.status) && p.vencimento && p.vencimento >= todayStr)
          .sort((a: any, b: any) => (a.vencimento || '').localeCompare(b.vencimento || ''));

        if (pendingPayments.length > 0 && pendingPayments[0]?.vencimento) {
          dataFim = safeFormatYYYYMMDD(safeParseDate(pendingPayments[0].vencimento));
        } else if (pagas.length > 0) {
          const distinctMonths = new Set<string>();
          pagas.forEach((p: any) => {
            const raw = p.vencimento || p.dataPagamento;
            if (raw) distinctMonths.add(raw.slice(0, 7));
          });
          const paidCycles = Math.max(1, distinctMonths.size);
          dataFim = safeFormatYYYYMMDD(addMonthsWithClamping(safeParseDate(dataInicio), paidCycles));
        } else if (com.vencimento && com.vencimento >= todayStr) {
          dataFim = safeFormatYYYYMMDD(safeParseDate(com.vencimento));
        } else if (contract.dataFim && contract.dataFim >= todayStr) {
          dataFim = safeFormatYYYYMMDD(safeParseDate(contract.dataFim));
        } else {
          dataFim = safeFormatYYYYMMDD(addMonthsWithClamping(safeParseDate(dataInicio), 1));
        }
      } else {
        dataFim = safeFormatYYYYMMDD(safeParseDate(contract.dataFim || calculateContractEndDate(dataInicio, duracao, vigenciaQtd, undefined, false)));
      }

      const parcelasInfo = isRecorrente
        ? `${pagas.length}/${(paymentsList || []).length || recorrenciaMeses} pagas`
        : `${pagas.length}/${(paymentsList || []).length || vigenciaQtd} pagas`;

      // Análise de Dias Restantes e Expiração
      let daysLeft = 0;
      let isExpired = false;
      let isExpiringSoon = false;

      if (isRecorrente) {
        const endRecD = safeParseDate(dataFimRecorrencia);
        endRecD.setHours(0, 0, 0, 0);
        const diffRecDays = Math.ceil((endRecD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const endCycleD = safeParseDate(dataFim);
        endCycleD.setHours(0, 0, 0, 0);
        const diffCycleDays = Math.ceil((endCycleD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        daysLeft = diffCycleDays;

        if (hasOverdueInstallment && !isWithinTolerance) {
          isExpired = true;
          isExpiringSoon = false;
        } else if (diffRecDays < 0) {
          // Ciclo de 12 meses totalmente encerrado
          isExpired = true;
          isExpiringSoon = false;
        } else if (diffRecDays <= 30) {
          // Fim do ciclo de 12 meses chegando
          isExpired = false;
          isExpiringSoon = true;
        } else {
          // Aluno em dia
          isExpired = false;
          isExpiringSoon = false;
        }
      } else {
        const endD = safeParseDate(dataFim);
        endD.setHours(0, 0, 0, 0);
        daysLeft = Math.ceil((endD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        isExpired = daysLeft < 0;
        isExpiringSoon = !isExpired && daysLeft <= 30;
      }

      // Rescisão ou Cancelamento Formal
      if (contractStatus === 'cancelado') {
        return {
          dataInicio,
          dataFim,
          dataFimRecorrencia,
          dataFimCicloTotal,
          dataInicioFormatted: formatPtBr(dataInicio),
          dataFimFormatted: formatPtBr(dataFim),
          dataFimRecorrenciaFormatted: formatPtBr(dataFimRecorrencia),
          dataFimCicloTotalFormatted: formatPtBr(dataFimCicloTotal),
          isExpired: true,
          isExpiringSoon: false,
          isWithinTolerance: false,
          toleranceDaysLeft: 0,
          overdueDays: 0,
          canSchedule: false,
          daysLeft,
          daysLeftText: 'Cancelado',
          statusKey: 'inativo',
          statusLabel: 'Contrato Cancelado',
          badgeColor: '#64748b',
          badgeBg: 'rgba(100, 116, 139, 0.12)',
          badgeBorder: 'rgba(100, 116, 139, 0.3)',
          parcelasInfo,
          hasOverdueInstallment: false,
          isEndOfRecurrenceCycle: false,
          isRecorrente,
          isLead: false,
          isUncontracted: false
        };
      }

      // Finalizado (Não Renovou)
      if (contractStatus === 'finalizado') {
        return {
          dataInicio,
          dataFim,
          dataFimRecorrencia,
          dataFimCicloTotal,
          dataInicioFormatted: formatPtBr(dataInicio),
          dataFimFormatted: formatPtBr(dataFim),
          dataFimRecorrenciaFormatted: formatPtBr(dataFimRecorrencia),
          dataFimCicloTotalFormatted: formatPtBr(dataFimCicloTotal),
          isExpired: false,
          isExpiringSoon: false,
          isWithinTolerance: false,
          toleranceDaysLeft: 0,
          overdueDays: 0,
          canSchedule: false,
          daysLeft,
          daysLeftText: 'Encerrado',
          statusKey: 'finalizado',
          statusLabel: 'Finalizado (Não Renovou)',
          badgeColor: '#9ca3af',
          badgeBg: 'rgba(107, 114, 128, 0.15)',
          badgeBorder: 'rgba(107, 114, 128, 0.35)',
          parcelasInfo,
          hasOverdueInstallment: false,
          isEndOfRecurrenceCycle: false,
          isRecorrente,
          isLead: false,
          isUncontracted: false
        };
      }

      // Aguardando Assinatura
      if (contractStatus === 'pendente') {
        return {
          dataInicio,
          dataFim,
          dataFimRecorrencia,
          dataFimCicloTotal,
          dataInicioFormatted: formatPtBr(dataInicio),
          dataFimFormatted: formatPtBr(dataFim),
          dataFimRecorrenciaFormatted: formatPtBr(dataFimRecorrencia),
          dataFimCicloTotalFormatted: formatPtBr(dataFimCicloTotal),
          isExpired: false,
          isExpiringSoon: false,
          isWithinTolerance: false,
          toleranceDaysLeft: 0,
          overdueDays: 0,
          canSchedule: false,
          daysLeft,
          daysLeftText: 'Aguardando Assinatura',
          statusKey: 'pendente',
          statusLabel: 'Aguardando Assinatura',
          badgeColor: '#f59e0b',
          badgeBg: 'rgba(245, 158, 11, 0.12)',
          badgeBorder: 'rgba(245, 158, 11, 0.3)',
          parcelasInfo,
          hasOverdueInstallment: false,
          isEndOfRecurrenceCycle: false,
          isRecorrente,
          isLead: false,
          isUncontracted: false
        };
      }

      // Contrato Assinado / Ativo
      let statusKey: 'ativo' | 'vencendo' | 'vencido' = 'ativo';
      let statusLabel = isRecorrente ? 'Contrato Vigente (Recorrência)' : 'Contrato Ativo';
      let badgeColor = '#10b981';
      let badgeBg = 'rgba(16, 185, 129, 0.12)';
      let badgeBorder = 'rgba(16, 185, 129, 0.3)';
      let daysLeftText = `${daysLeft}d restantes`;

      if (isRecorrente) {
        const endRecD = safeParseDate(dataFimRecorrencia);
        endRecD.setHours(0, 0, 0, 0);
        const diffRecDays = Math.ceil((endRecD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (hasOverdueInstallment && !isWithinTolerance) {
          statusKey = 'vencido';
          statusLabel = 'Recorrência Inadimplente';
          badgeColor = '#ef4444';
          badgeBg = 'rgba(239, 68, 68, 0.12)';
          badgeBorder = 'rgba(239, 68, 68, 0.3)';
          daysLeftText = `Parcela em atraso (${overdueDays}d)`;
        } else if (diffRecDays < 0) {
          statusKey = 'vencido';
          statusLabel = 'Recorrência Vencida';
          badgeColor = '#ef4444';
          badgeBg = 'rgba(239, 68, 68, 0.12)';
          badgeBorder = 'rgba(239, 68, 68, 0.3)';
          daysLeftText = `Ciclo anual encerrado há ${Math.abs(diffRecDays)}d`;
        } else if (diffRecDays <= 30) {
          statusKey = 'vencendo';
          statusLabel = 'Renovação Anual <30d';
          badgeColor = '#f59e0b';
          badgeBg = 'rgba(245, 158, 11, 0.12)';
          badgeBorder = 'rgba(245, 158, 11, 0.3)';
          daysLeftText = diffRecDays === 0 ? 'Vence hoje' : `Renovação Anual em ${diffRecDays}d`;
        } else if (isWithinTolerance) {
          statusKey = 'ativo';
          statusLabel = `Tolerância Ativa (${toleranceDaysLeft}d)`;
          badgeColor = '#eab308';
          badgeBg = 'rgba(234, 179, 8, 0.15)';
          badgeBorder = 'rgba(234, 179, 8, 0.4)';
          daysLeftText = `Tolerância • ${toleranceDaysLeft}d restantes`;
        } else {
          statusKey = 'ativo';
          statusLabel = 'Contrato Vigente (Recorrência)';
          badgeColor = '#10b981';
          badgeBg = 'rgba(16, 185, 129, 0.12)';
          badgeBorder = 'rgba(16, 185, 129, 0.3)';
          daysLeftText = daysLeft >= 0 ? (daysLeft === 0 ? 'Fatura vence hoje' : `Próx. fatura em ${daysLeft}d`) : 'Recorrência em dia';
        }
      } else {
        if (isExpired) {
          statusKey = 'vencido';
          statusLabel = 'Contrato Vencido';
          badgeColor = '#ef4444';
          badgeBg = 'rgba(239, 68, 68, 0.12)';
          badgeBorder = 'rgba(239, 68, 68, 0.3)';
          daysLeftText = `Vencido há ${Math.abs(daysLeft)}d`;
        } else if (isExpiringSoon) {
          statusKey = 'vencendo';
          statusLabel = 'Renovação <30d';
          badgeColor = '#f59e0b';
          badgeBg = 'rgba(245, 158, 11, 0.12)';
          badgeBorder = 'rgba(245, 158, 11, 0.3)';
          daysLeftText = daysLeft === 0 ? 'Vence hoje' : `Vence em ${daysLeft}d`;
        } else if (isWithinTolerance) {
          statusKey = 'ativo';
          statusLabel = `Tolerância Ativa (${toleranceDaysLeft}d)`;
          badgeColor = '#eab308';
          badgeBg = 'rgba(234, 179, 8, 0.15)';
          badgeBorder = 'rgba(234, 179, 8, 0.4)';
          daysLeftText = `Tolerância • ${toleranceDaysLeft}d restantes`;
        } else if (hasOverdueInstallment) {
          statusKey = 'ativo';
          statusLabel = 'Vigente • Parcela em Atraso';
          badgeColor = '#f97316';
          badgeBg = 'rgba(249, 115, 22, 0.12)';
          badgeBorder = 'rgba(249, 115, 22, 0.3)';
          daysLeftText = `Parcela em atraso (${overdueDays}d) • ${daysLeft}d restantes`;
        }
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
        isWithinTolerance,
        toleranceDaysLeft,
        overdueDays,
        canSchedule: !isExpired && (!hasOverdueInstallment || isWithinTolerance),
        daysLeft,
        daysLeftText,
        statusKey,
        statusLabel,
        badgeColor,
        badgeBg,
        badgeBorder,
        parcelasInfo,
        hasOverdueInstallment,
        isEndOfRecurrenceCycle: Boolean(isRecorrente && isExpiringSoon),
        isRecorrente,
        isLead: false,
        isUncontracted: false
      };
    }

    // =========================================================================
    // 🅱️ CENÁRIO 2: ALUNO CONVÊNIO DYNAMUS
    // =========================================================================
    if (isDynamus) {
      const dataInicioRaw = com.dataInicio || client?.createdAt || todayStr;
      const dataInicio = safeFormatYYYYMMDD(safeParseDate(dataInicioRaw));
      const dataFim = com.vigenciaDynamusFim || calculateContractEndDate(dataInicio, 'anual', 1, undefined, false);

      const endD = safeParseDate(dataFim);
      endD.setHours(0, 0, 0, 0);
      const diffTime = endD.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isExpired = daysLeft < 0;

      return {
        dataInicio,
        dataFim,
        dataFimRecorrencia: dataFim,
        dataFimCicloTotal: dataFim,
        dataInicioFormatted: formatPtBr(dataInicio),
        dataFimFormatted: formatPtBr(dataFim),
        dataFimRecorrenciaFormatted: formatPtBr(dataFim),
        dataFimCicloTotalFormatted: formatPtBr(dataFim),
        isExpired,
        isExpiringSoon: !isExpired && daysLeft <= 30,
        isWithinTolerance: false,
        toleranceDaysLeft: 0,
        overdueDays: 0,
        canSchedule: !isExpired,
        daysLeft,
        daysLeftText: isExpired ? `Vencido há ${Math.abs(daysLeft)}d` : `${daysLeft}d restantes`,
        statusKey: isExpired ? 'vencido' : 'ativo',
        statusLabel: '⚡ Convênio Dynamus',
        badgeColor: '#06b6d4',
        badgeBg: 'rgba(6, 182, 212, 0.12)',
        badgeBorder: 'rgba(6, 182, 212, 0.35)',
        parcelasInfo: 'Convênio',
        hasOverdueInstallment: false,
        isEndOfRecurrenceCycle: false,
        isRecorrente: false,
        isLead: false,
        isUncontracted: false
      };
    }

    // =========================================================================
    // 🅲 CENÁRIO 3: ALUNO SEM CONTRATO OFICIAL (Lead / Novo Cadastro)
    // ZERO Fallback a datas fantasmas em dadosComerciais!
    // NUNCA marcar como "Contrato Vencido" quem não tem contrato emitido!
    // =========================================================================
    const isLeadOrUncontracted = true;
    return {
      dataInicio: '',
      dataFim: '',
      dataFimRecorrencia: '',
      dataFimCicloTotal: '',
      dataInicioFormatted: '-',
      dataFimFormatted: '-',
      dataFimRecorrenciaFormatted: '-',
      dataFimCicloTotalFormatted: '-',
      isExpired: false,
      isExpiringSoon: false,
      isWithinTolerance: false,
      toleranceDaysLeft: 0,
      overdueDays: 0,
      canSchedule: false,
      daysLeft: 0,
      daysLeftText: 'Sem Contrato',
      statusKey: 'lead',
      statusLabel: '🟣 Lead / Sem Contrato Emitido',
      badgeColor: '#8b5cf6',
      badgeBg: 'rgba(139, 92, 246, 0.12)',
      badgeBorder: 'rgba(139, 92, 246, 0.35)',
      parcelasInfo: '0/0',
      hasOverdueInstallment: false,
      isEndOfRecurrenceCycle: false,
      isRecorrente: false,
      isLead: true,
      isUncontracted: true
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
