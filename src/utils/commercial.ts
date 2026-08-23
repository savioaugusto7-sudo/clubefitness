import dbConnect from './dbConnect';
import Client from '@/models/Client';
import Payment from '@/models/Payment';

export async function syncClientPlanValidity(clientId: string): Promise<void> {
  try {
    await dbConnect();
    const client = await Client.findById(clientId);
    if (!client || !client.dadosComerciais) return;

    const com = client.dadosComerciais;
    const isRecurring = Boolean(com.criarRecorrenciaMensal || com.recorrenciaVigencia);

    // If client does NOT have recurrence active, do not auto-extend validity based on paid installments!
    if (!isRecurring) return;

    // Find all paid payments (non-zero or zero payments, status === 'Pago')
    const paidPayments = await Payment.find({
      clientId: client._id,
      status: 'Pago'
    }).sort({ vencimento: 1 });

    let cycles = 1;
    if (paidPayments.length > 0) {
      const lastPaid = paidPayments[paidPayments.length - 1];
      const lastPaidDateStr = lastPaid.vencimento || lastPaid.dataPagamento;
      if (lastPaidDateStr) {
        const dStr = (lastPaidDateStr.includes('T') ? lastPaidDateStr.split('T')[0] : lastPaidDateStr);
        const lastPaidDate = new Date(dStr + 'T00:00:00');
        const baseD = new Date((com.dataInicio || dStr) + 'T00:00:00');
        const monthDiff = (lastPaidDate.getFullYear() - baseD.getFullYear()) * 12 + (lastPaidDate.getMonth() - baseD.getMonth()) + 1;
        cycles = Math.max(1, monthDiff);
      } else {
        cycles = Math.max(1, paidPayments.length);
      }
    }

    // Calculate new validity end date (+cycles relative to dataInicio)
    // "vigencia comercial atualizada deve ser atrelada a data de inicio, nao deve ser relacionada a data de vencimento e nem pagamento"
    const todayStr = new Date().toISOString().split('T')[0];
    const baseDateStr = com.dataInicio || (paidPayments[0] ? paidPayments[0].vencimento : null) || todayStr;
    const baseDate = new Date((baseDateStr.includes('T') ? baseDateStr.split('T')[0] : baseDateStr) + 'T00:00:00');
    
    const duracao = com.duracao || 'mensal';
    const duracaoQtd = Number(com.duracaoQtd) || 1;

    const nextValidityDate = new Date(baseDate);
    if (duracao === 'semana') {
      nextValidityDate.setDate(nextValidityDate.getDate() + (cycles * duracaoQtd * 7));
    } else if (duracao === 'anual') {
      nextValidityDate.setMonth(nextValidityDate.getMonth() + (cycles * duracaoQtd * 12));
    } else {
      nextValidityDate.setMonth(nextValidityDate.getMonth() + (cycles * duracaoQtd));
    }

    const nextValidityIso = nextValidityDate.toISOString().split('T')[0];

    // Update the client commercial validity vencimento
    com.vencimento = nextValidityIso;
    await client.save();
    console.log(`[syncClientPlanValidity] Client ${client.dadosPessoais?.nome || clientId} validity updated to ${nextValidityIso} based on ${paidPayments.length} paid payments from start date ${baseDateStr}`);
  } catch (error) {
    console.error('Error syncing client plan validity:', error);
  }
}
