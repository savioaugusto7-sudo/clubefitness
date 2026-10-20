import dbConnect from './dbConnect';
import Client from '@/models/Client';
import Payment from '@/models/Payment';
import Contract from '@/models/Contract';

function safeFormatYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addMonthsWithClamping(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = (result.getMonth() + months) % 12;
  result.setMonth(result.getMonth() + months);
  if (result.getMonth() !== (targetMonth < 0 ? targetMonth + 12 : targetMonth)) {
    result.setDate(0);
  }
  return result;
}

export async function syncClientPlanValidity(clientId: string): Promise<void> {
  try {
    await dbConnect();
    const client = await Client.findById(clientId);
    if (!client || !client.dadosComerciais) return;

    const com = client.dadosComerciais;
    const activeContract = await Contract.findOne({
      clientId: client._id,
      status: { $in: ['assinado', 'ativo', 'vigente'] }
    }).sort({ versao: -1, dataEmissao: -1 });

    const isRecurring = Boolean(
      com.criarRecorrenciaMensal ||
      com.isRecorrente ||
      com.recorrenciaVigencia ||
      activeContract?.criarRecorrenciaMensal ||
      activeContract?.isRecorrente ||
      activeContract?.recorrenciaVigencia
    );

    // If client does NOT have recurrence active, do not auto-extend validity based on paid installments,
    // but still ensure fixed schedules validity and appointments are in sync!
    if (!isRecurring) {
      try {
        const { syncClientFixedSchedulesValidity } = await import('./fixedScheduleSync');
        await syncClientFixedSchedulesValidity(clientId);
      } catch (schedErr) {
        console.error('[syncClientPlanValidity] Erro ao sincronizar horários fixos para não recorrente:', schedErr);
      }
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = safeFormatYYYYMMDD(today);

    // Find all payments for this client
    const allPayments = await Payment.find({ clientId: client._id }).sort({ vencimento: 1 });

    const isPaid = (st: string) => {
      const s = (st || '').toLowerCase();
      return s === 'pago' || s === 'received' || s === 'confirmed' || s === 'received_in_cash';
    };

    const paidPayments = allPayments.filter((p: any) => isPaid(p.status));
    const pendingFuturePayments = allPayments.filter((p: any) => !isPaid(p.status) && p.vencimento && p.vencimento >= todayStr);

    // Trava de competência mensal (meses distintos pagos)
    const paidCompetenceMonths = new Set<string>();
    paidPayments.forEach((p: any) => {
      const rawDate = p.vencimento || p.dataPagamento;
      if (rawDate) {
        const dStr = (rawDate.includes('T') ? rawDate.split('T')[0] : rawDate);
        const ym = dStr.slice(0, 7);
        if (ym && ym.length === 7) {
          paidCompetenceMonths.add(ym);
        }
      }
    });

    const distinctPaidCount = paidCompetenceMonths.size;
    const maxRecorrencia = Number(activeContract?.recorrenciaMeses || com.recorrenciaMeses) || 12;

    const baseDateStr = activeContract?.dataInicio || com.dataInicio || (paidPayments[0] ? paidPayments[0].vencimento : null) || todayStr;
    const baseDate = new Date((baseDateStr.includes('T') ? baseDateStr.split('T')[0] : baseDateStr) + 'T12:00:00');

    // 1. Horizonte 1: Compromisso Anual da Recorrência (12 meses)
    const recEnd = addMonthsWithClamping(baseDate, maxRecorrencia);
    const dataFimRecorrencia = safeFormatYYYYMMDD(recEnd);

    // 2. Horizonte 2: Ciclo de Acesso Pago Atual (dataFim)
    let nextValidityIso = '';
    if (pendingFuturePayments.length > 0 && pendingFuturePayments[0]?.vencimento) {
      // Coberto até o próximo vencimento da assinatura
      nextValidityIso = pendingFuturePayments[0].vencimento.includes('T')
        ? pendingFuturePayments[0].vencimento.split('T')[0]
        : pendingFuturePayments[0].vencimento;
    } else if (distinctPaidCount > 0) {
      const paidCycleDate = addMonthsWithClamping(baseDate, distinctPaidCount);
      nextValidityIso = safeFormatYYYYMMDD(paidCycleDate);
    } else {
      const initialMonth = addMonthsWithClamping(baseDate, 1);
      nextValidityIso = safeFormatYYYYMMDD(initialMonth);
    }

    // Update Client dadosComerciais
    com.dataFim = nextValidityIso;
    com.vencimento = nextValidityIso;
    com.dataFimCicloAtual = nextValidityIso;
    com.dataFimRecorrencia = dataFimRecorrencia;
    com.criarRecorrenciaMensal = true;
    com.isRecorrente = true;
    com.recorrenciaMeses = maxRecorrencia;
    if (com.status !== 'cancelado' && com.status !== 'cancelado_agendado' && com.status !== 'finalizado') {
      com.status = 'ativo';
    }
    client.markModified('dadosComerciais');
    await client.save();

    // Update Contract document
    if (activeContract) {
      activeContract.dataFim = nextValidityIso;
      activeContract.dataFimCicloAtual = nextValidityIso;
      activeContract.dataFimRecorrencia = dataFimRecorrencia;
      activeContract.criarRecorrenciaMensal = true;
      activeContract.isRecorrente = true;
      activeContract.recorrenciaMeses = maxRecorrencia;
      if (paidPayments.length > 0) {
        activeContract.asaasBillingStatus = 'pago';
      }
      await activeContract.save();
    }

    console.log(`[syncClientPlanValidity] Recorrência do aluno ${client.dadosPessoais?.nome || clientId} sincronizada: ciclo até ${nextValidityIso}, compromisso até ${dataFimRecorrencia}`);

    // Propagar automaticamente para as regras de horários fixos e gerar agendamentos na grade
    try {
      const { syncClientFixedSchedulesValidity } = await import('./fixedScheduleSync');
      await syncClientFixedSchedulesValidity(clientId);
    } catch (schedErr) {
      console.error('[syncClientPlanValidity] Erro ao sincronizar horários fixos:', schedErr);
    }
  } catch (error) {
    console.error('Error syncing client plan validity:', error);
  }
}
