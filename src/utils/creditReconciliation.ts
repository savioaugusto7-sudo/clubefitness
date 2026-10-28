/**
 * Motor Centralizado de Cálculo e Reconciliação de Créditos por Ciclo Mensal
 * Single Source of Truth (SSOT) derivado diretamente dos Agendamentos Reais
 * Clube Fitness Fisio
 */

import { SERVICOS_CONFIG } from '@/app/api/appointments/route';

export interface CycleCreditSummary {
  total: number;
  usados: number;
  reservados: number;
  disponiveis: number;
  percent: number;
}

export interface ClientCycleLedger {
  monthKey: string;
  monthLabel: string;
  isCurrentMonth: boolean;
  academia: CycleCreditSummary;
  massagem: CycleCreditSummary;
  emergencia: CycleCreditSummary;
}

/**
 * Identifica a categoria de crédito e o custo com base no nome do serviço
 */
export function getServiceCreditCategory(servico: string, isDynamus = false): {
  tipoCredito: 'academia' | 'massagem' | 'emergencia' | 'nenhum';
  cost: number;
} {
  const normalized = (servico || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (isDynamus) {
    if (
      normalized.includes('avaliacao fisica') ||
      normalized.includes('fisioterapica') ||
      normalized.includes('teste de forca') ||
      normalized.includes('terapia manual') ||
      normalized.includes('emergencia')
    ) {
      return { tipoCredito: 'academia', cost: 3 };
    }
    if (
      normalized.includes('treino monitorado') ||
      normalized.includes('recovery') ||
      normalized.includes('treino livre') ||
      normalized.includes('consulta') ||
      normalized.includes('atendimento individual') ||
      normalized.includes('quiro')
    ) {
      return { tipoCredito: 'academia', cost: 1 };
    }
    if (normalized.includes('massagem') || normalized.includes('massoterapia') || normalized.includes('miofascial')) {
      return { tipoCredito: 'massagem', cost: 1 };
    }
    return { tipoCredito: 'nenhum', cost: 0 };
  }

  // Planos Padrão Clube Fitness
  if (normalized.includes('massagem') || normalized.includes('massoterapia') || normalized.includes('miofascial')) {
    return { tipoCredito: 'massagem', cost: 1 };
  }
  if (normalized.includes('emergencia')) {
    return { tipoCredito: 'emergencia', cost: 1 };
  }
  if (
    normalized.includes('treino livre') ||
    normalized.includes('recovery') ||
    normalized.includes('continua')
  ) {
    return { tipoCredito: 'nenhum', cost: 0 };
  }

  // Serviços da academia que consomem crédito (Treino Monitorado, Avaliações, Terapia Manual, Consultas, Quiro)
  return { tipoCredito: 'academia', cost: 1 };
}

/**
 * Calcula dinamicamente o consumo de créditos de um cliente para um determinado mês (YYYY-MM).
 * Totalmente desacoplado de campos estáticos congelados do banco de dados.
 */
export function calculateCycleCredits(
  client: any,
  appointments: any[],
  targetMonthKey?: string
): ClientCycleLedger {
  const now = new Date();
  const currentMonthKey = targetMonthKey || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = currentMonthKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [ano, mes] = currentMonthKey.split('-');
  const d = new Date(Number(ano), Number(mes) - 1, 1);
  const rawLabel = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  const com = client?.dadosComerciais || {};
  const isDynamus = Boolean(com.planoId?.nome?.toLowerCase().includes('dynamus') || com.isConvenioDynamus);

  // 1. Determinar cota contratada do mês
  let totalAcademia = Number(com.creditosTotal || 0);
  if (totalAcademia === 0 && com.frequencia) {
    totalAcademia = Math.round(Number(com.frequencia) * 4.33);
  }
  const totalMassagem = Number(com.creditosMassagemTotal || 0);
  const totalEmergencia = Number(com.creditosEmergenciaTotal || 0);

  let usadosAcademia = 0;
  let reservadosAcademia = 0;

  let usadosMassagem = 0;
  let reservadosMassagem = 0;

  let usadosEmergencia = 0;
  let reservadosEmergencia = 0;

  // 2. Analisar todos os agendamentos do mês alvo
  const monthAppointments = (appointments || []).filter(
    (a: any) => a.data && a.data.startsWith(currentMonthKey)
  );

  monthAppointments.forEach((a: any) => {
    const { tipoCredito, cost } = getServiceCreditCategory(a.servico || a.tipoServico || '', isDynamus);
    if (tipoCredito === 'nenhum' || cost <= 0) return;

    // Verificar se é futuro em relação a este exato momento
    const aptDateTime = new Date(`${a.data}T${a.horario || '00:00'}:00-03:00`);
    const isFuture = aptDateTime.getTime() >= now.getTime();

    // 2.1 Presença confirmada ou Falta (ambos debitam o crédito contratado no mês)
    if (a.status === 'presenca' || a.status === 'falta') {
      if (tipoCredito === 'academia') usadosAcademia += cost;
      else if (tipoCredito === 'massagem') usadosMassagem += cost;
      else if (tipoCredito === 'emergencia') usadosEmergencia += cost;
    }
    // 2.2 Agendado para o futuro (reserva vaga e retém temporariamente o crédito)
    else if (a.status === 'agendado' && isFuture) {
      if (tipoCredito === 'academia') reservadosAcademia += cost;
      else if (tipoCredito === 'massagem') reservadosMassagem += cost;
      else if (tipoCredito === 'emergencia') reservadosEmergencia += cost;
    }
    // Agendamentos passados com status 'agendado' que não tiveram presença NÃO prendem créditos futuros
  });

  const dispAcademia = Math.max(0, totalAcademia - usadosAcademia - reservadosAcademia);
  const dispMassagem = Math.max(0, totalMassagem - usadosMassagem - reservadosMassagem);
  const dispEmergencia = Math.max(0, totalEmergencia - usadosEmergencia - reservadosEmergencia);

  return {
    monthKey: currentMonthKey,
    monthLabel,
    isCurrentMonth,
    academia: {
      total: totalAcademia,
      usados: usadosAcademia,
      reservados: reservadosAcademia,
      disponiveis: dispAcademia,
      percent: totalAcademia > 0 ? Math.min(100, Math.round(((usadosAcademia + reservadosAcademia) / totalAcademia) * 100)) : 0
    },
    massagem: {
      total: totalMassagem,
      usados: usadosMassagem,
      reservados: reservadosMassagem,
      disponiveis: dispMassagem,
      percent: totalMassagem > 0 ? Math.min(100, Math.round(((usadosMassagem + reservadosMassagem) / totalMassagem) * 100)) : 0
    },
    emergencia: {
      total: totalEmergencia,
      usados: usadosEmergencia,
      reservados: reservadosEmergencia,
      disponiveis: dispEmergencia,
      percent: totalEmergencia > 0 ? Math.min(100, Math.round(((usadosEmergencia + reservadosEmergencia) / totalEmergencia) * 100)) : 0
    }
  };
}
