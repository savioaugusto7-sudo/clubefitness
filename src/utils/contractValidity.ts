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

export function calculateContractEndDate(
  dataInicioStr?: any,
  duracao?: 'anual' | 'mensal' | 'semana' | 'indeterminado' | string,
  vigenciaQtd?: number,
  currentVencimento?: any,
  isRecorrente?: boolean
): string {
  try {
    const startD = safeParseDate(dataInicioStr);
    const qty = Number(vigenciaQtd) && Number(vigenciaQtd) > 0 ? Number(vigenciaQtd) : 1;
    const dur = (duracao || 'mensal').toString().toLowerCase();

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
      return safeFormatYYYYMMDD(endD);
    }

    // Para planos recorrentes: a vigência é a data da competência da última parcela/ciclo ativo
    if (currentVencimento) {
      const vencD = safeParseDate(currentVencimento);
      return safeFormatYYYYMMDD(vencD);
    }

    // Fallback para recorrente inicial
    const endD = new Date(startD);
    endD.setMonth(endD.getMonth() + 1);
    return safeFormatYYYYMMDD(endD);
  } catch (err) {
    console.error('[calculateContractEndDate] Error calculating date:', err);
    const now = new Date();
    now.setFullYear(now.getFullYear() + 1);
    return safeFormatYYYYMMDD(now);
  }
}

export function getContractValidityInfo(client: any, planObj?: any): ContractValidityInfo {
  try {
    const com = client?.dadosComerciais || {};
    const statusSaved = (com.status || 'ativo').toString().toLowerCase();

    const isAnual = com.duracao === 'anual' || (!com.duracao && planObj?.tipo === 'Anual');
    const duracao = isAnual ? 'anual' : (com.duracao || 'mensal');
    const vigenciaQtd = com.duracaoQtd || com.vigenciaQtd || (isAnual ? 1 : 1);
    const dataInicioRaw = com.dataInicio || client?.createdAt || new Date();
    const isRecorrente = Boolean(com.criarRecorrenciaMensal);

    const dataInicio = safeFormatYYYYMMDD(safeParseDate(dataInicioRaw));

    // Calcula a data fim oficial
    const dataFim = calculateContractEndDate(dataInicio, duracao, vigenciaQtd, com.vencimento, isRecorrente);

    // Análise de Dias Restantes e Status
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endD = safeParseDate(dataFim);
    endD.setHours(0, 0, 0, 0);
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
        const parsed = safeParseDate(dStr);
        return parsed.toLocaleDateString('pt-BR');
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
  } catch (err) {
    console.error('[getContractValidityInfo] Error:', err);
    return {
      dataInicio: '2026-01-01',
      dataFim: '2027-01-01',
      dataInicioFormatted: '01/01/2026',
      dataFimFormatted: '01/01/2027',
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
