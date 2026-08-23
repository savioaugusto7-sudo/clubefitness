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

    // TRATAMENTO FACTUAL DE LEADS E CADASTROS SEM CONTRATO:
    // Se for Lead ou não tiver data de início nem pagamentos nem contrato emitido, NÃO INVENTAR DATAS!
    const paymentsList = clientPayments || client?.payments || [];
    const hasPaidPayments = Array.isArray(paymentsList) && paymentsList.some((p: any) => p.status === 'Pago');
    const isLeadStatus = statusSaved === 'lead';
    const isUncontracted = !com.dataInicio && !com.vencimento && !hasPaidPayments && !isDynamus;

    if (isLeadStatus || (isUncontracted && statusSaved !== 'ativo')) {
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
        daysLeft: 0,
        daysLeftText: isLeadStatus ? 'Aguardando Venda' : 'Sem Contrato',
        statusKey: 'lead',
        statusLabel: isLeadStatus ? '🟣 Lead / Novo Cadastro' : 'Sem Contrato Emitido',
        badgeColor: '#a855f7',
        badgeBg: 'rgba(168, 85, 247, 0.12)',
        badgeBorder: 'rgba(168, 85, 247, 0.35)',
        isLead: true,
        isUncontracted: true
      };
    }

    const isAnual = com.duracao === 'anual' || (!com.duracao && planObj?.tipo === 'Anual') || (planObj?.nome || '').toLowerCase().includes('anual');
    
    // Regra Oficial da Empresa: Não usamos 'semestral'. Contratos por meses usam duracao: 'mensal' e duracaoQtd: N
    let duracao = isAnual ? 'anual' : (com.duracao || 'mensal');
    let vigenciaQtd = isDynamus ? 1 : (Number(com.duracaoQtd) || Number(com.vigenciaQtd) || 1);
    const dataInicioRaw = com.dataInicio || client?.createdAt || new Date();
    
    // RECORRÊNCIA É EXCLUSIVAMENTE QUANDO HÁ CONFIGURAÇÃO EXPLÍCITA DE ASSINATURA RECORRENTE
    const isRecorrente = isDynamus ? false : Boolean(com.criarRecorrenciaMensal || com.recorrenciaVigencia);

    const dataInicio = safeFormatYYYYMMDD(safeParseDate(dataInicioRaw));

    // Data Fim do Ciclo Contratual Total
    let dataFimCicloTotal = calculateContractEndDate(dataInicio, duracao, vigenciaQtd, undefined, false);
    let dataFimRecorrencia = dataFimCicloTotal;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = safeFormatYYYYMMDD(today);

    const isPaidStatus = (s: string) => {
      const st = (s || '').toLowerCase();
      return st === 'pago' || st === 'received' || st === 'confirmed' || st === 'received_in_cash' || st === 'recebido';
    };

    // Detecção de inadimplência pontual de parcelas
    const atrasadas = (Array.isArray(paymentsList) ? paymentsList : []).filter((p: any) => {
      if (isPaidStatus(p.status)) return false;
      if (p.status === 'Atrasado' || p.status === 'OVERDUE') return true;
      return p.vencimento && p.vencimento < todayStr;
    });
    const hasOverdueInstallment = atrasadas.length > 0;
    const pagas = (Array.isArray(paymentsList) ? paymentsList : []).filter((p: any) => isPaidStatus(p.status));
    const parcelasInfo = `${pagas.length}/${(paymentsList || []).length || vigenciaQtd} pagas`;

    let dataFim = dataFimCicloTotal;
    let isExpired = false;
    let isExpiringSoon = false;
    let daysLeft = 0;
    let daysLeftText = '';

    // =========================================================================
    // 🅰️ CASO 1: SEM RECORRÊNCIA (Planos Fechados: À vista, Parcelado 10x/12x)
    // A Data Fim é 100% INDEPENDENTE dos pagamentos! (Data Início + Duração)
    // =========================================================================
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

    if (!isRecorrente) {
      dataFim = isDynamus ? dataFimCicloTotal : calculateContractEndDate(dataInicio, duracao, vigenciaQtd, undefined, false);
      const endD = safeParseDate(dataFim);
      endD.setHours(0, 0, 0, 0);
      const diffTime = endD.getTime() - today.getTime();
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      isExpired = daysLeft < 0;
      isExpiringSoon = !isExpired && daysLeft <= 30;

      if (isExpired) {
        daysLeftText = `Vencido há ${Math.abs(daysLeft)}d`;
      } else if (isExpiringSoon) {
        daysLeftText = daysLeft === 0 ? 'Vence hoje' : `Vence em ${daysLeft}d`;
      } else if (isWithinTolerance) {
        daysLeftText = `Tolerância • ${toleranceDaysLeft}d restantes`;
      } else if (hasOverdueInstallment) {
        daysLeftText = `Parcela em atraso (${overdueDays}d) • ${daysLeft}d restantes`;
      } else {
        daysLeftText = `${daysLeft}d restantes`;
      }
    } else {
      // =========================================================================
      // 🅱️ CASO 2: COM RECORRÊNCIA ATIVADA (Assinatura Mensal Contínua)
      // A ÂNCORA É SEMPRE O DIA DA DATA DE INÍCIO (ex: dia 01, dia 24)
      // O pagamento da mensalidade é o START para estender +1 ciclo a partir da âncora
      // =========================================================================
      const startD = safeParseDate(dataInicio);
      let cyclesUnlocked = 1;

      if (pagas.length > 0) {
        const pagasSorted = [...pagas].sort((a: any, b: any) => (a.vencimento || '').localeCompare(b.vencimento || ''));
        const lastPaid = pagasSorted[pagasSorted.length - 1];
        if (lastPaid?.vencimento) {
          const lastPaidDate = safeParseDate(lastPaid.vencimento);
          const monthDiff = (lastPaidDate.getFullYear() - startD.getFullYear()) * 12 + (lastPaidDate.getMonth() - startD.getMonth()) + 1;
          cyclesUnlocked = Math.max(1, monthDiff);
        } else {
          cyclesUnlocked = Math.max(1, pagas.length);
        }
      }

      const cycleEndD = new Date(startD);
      cycleEndD.setMonth(cycleEndD.getMonth() + cyclesUnlocked);
      dataFim = safeFormatYYYYMMDD(cycleEndD);

      const endD = safeParseDate(dataFim);
      endD.setHours(0, 0, 0, 0);
      const diffTime = endD.getTime() - today.getTime();
      daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      isExpired = false;
      isExpiringSoon = false;

      if (isWithinTolerance) {
        daysLeftText = `Tolerância de 5d • ${toleranceDaysLeft}d restantes`;
      } else if (hasOverdueInstallment) {
        daysLeftText = `Mensalidade em atraso há ${overdueDays}d`;
      } else if (daysLeft >= 0) {
        daysLeftText = `Ciclo ativo até ${formatPtBr(dataFim)}`;
      } else {
        daysLeftText = `Ciclo encerrado em ${formatPtBr(dataFim)}`;
      }
    }

    // Status Badge
    let statusKey: 'ativo' | 'vencendo' | 'vencido' | 'congelado' | 'lead' | 'inativo' | 'finalizado' = 'ativo';
    let statusLabel = isRecorrente ? 'Contrato Vigente (Recorrência)' : 'Contrato Ativo';
    let badgeColor = '#10b981';
    let badgeBg = 'rgba(16, 185, 129, 0.12)';
    let badgeBorder = 'rgba(16, 185, 129, 0.3)';

    if (isExpired) {
      statusKey = 'vencido';
      statusLabel = isRecorrente ? 'Recorrência Vencida' : 'Contrato Vencido';
      badgeColor = '#ef4444';
      badgeBg = 'rgba(239, 68, 68, 0.12)';
      badgeBorder = 'rgba(239, 68, 68, 0.3)';
    } else if (isExpiringSoon) {
      statusKey = 'vencendo';
      statusLabel = 'Renovação <30d';
      badgeColor = '#f59e0b';
      badgeBg = 'rgba(245, 158, 11, 0.12)';
      badgeBorder = 'rgba(245, 158, 11, 0.3)';
    } else if (isWithinTolerance) {
      statusKey = 'ativo';
      statusLabel = `Tolerância Ativa (${toleranceDaysLeft}d)`;
      badgeColor = '#eab308';
      badgeBg = 'rgba(234, 179, 8, 0.15)';
      badgeBorder = 'rgba(234, 179, 8, 0.4)';
    } else if (hasOverdueInstallment) {
      statusKey = 'ativo';
      statusLabel = 'Vigente • Parcela em Atraso';
      badgeColor = '#f97316';
      badgeBg = 'rgba(249, 115, 22, 0.12)';
      badgeBorder = 'rgba(249, 115, 22, 0.3)';
    }

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
    }

    const isEndOfRecurrenceCycle = Boolean(isRecorrente && isExpiringSoon);
    const recorrenciaMeses = 12;

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
