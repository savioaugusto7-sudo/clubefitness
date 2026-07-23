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

    const N = paidPayments.length;
    
    // Project cycles: if 0 paid payments, they are in their 1st cycle, so we keep at least 1 cycle validity.
    const cycles = Math.max(1, N);

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
    console.log(`[syncClientPlanValidity] Client ${client.dadosPessoais?.nome || clientId} validity updated to ${nextValidityIso} based on ${N} paid payments from start date ${baseDateStr}`);
  } catch (error) {
    console.error('Error syncing client plan validity:', error);
  }
}
