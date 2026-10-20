import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import Payment from '@/models/Payment';
import { syncClientPlanValidity } from '@/utils/commercial';

export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ success: true, status: 'online', service: 'Asaas Webhook Listener' });
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    // 1. Validação de Token de Autenticação do Webhook
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    const receivedToken = request.headers.get('asaas-access-token');

    if (webhookToken && receivedToken && receivedToken !== webhookToken && receivedToken !== process.env.ASAAS_API_KEY) {
      console.warn(`[Asaas Webhook] Token recebido '${receivedToken}' diverge de ASAAS_WEBHOOK_TOKEN.`);
    }

    const payload = await request.json();
    const { event, payment } = payload;

    if (!payment) {
      return NextResponse.json({ success: true, message: 'Evento de ping/teste recebido com sucesso' });
    }

    console.log(`[Asaas Webhook] Evento=${event}, PaymentId=${payment.id}, Customer=${payment.customer}, Status=${payment.status}`);

    // 2. Localizar o contrato associado (pelo ID da cobrança, parcelamento ou assinatura recorrente)
    const queryConds: any[] = [{ asaasPaymentId: payment.id }];
    if (payment.installment) {
      queryConds.push({ asaasPaymentId: payment.installment });
    }
    if (payment.subscription) {
      queryConds.push({ asaasSubscriptionId: payment.subscription });
    }

    let contract = await Contract.findOne({ $or: queryConds });

    // Fallback: se não achou pelo ID direto, buscar pelo cliente do Asaas
    let client = null;
    if (contract) {
      client = await Client.findById(contract.clientId);
    } else if (payment.customer) {
      client = await Client.findOne({ 'dadosComerciais.asaasCustomerId': payment.customer });
      if (client) {
        contract = await Contract.findOne({
          clientId: client._id,
          status: { $in: ['assinado', 'ativo', 'vigente', 'pendente'] }
        }).sort({ versao: -1, dataEmissao: -1 });

        // Auto-vincular assinatura recorrente ao contrato ativo se aplicável
        if (contract && payment.subscription && !contract.asaasSubscriptionId) {
          contract.asaasSubscriptionId = payment.subscription;
          contract.isRecorrente = true;
          contract.criarRecorrenciaMensal = true;
          await contract.save();
        }
      }
    }

    const isPaymentConfirmed = (
      event === 'PAYMENT_RECEIVED' ||
      event === 'PAYMENT_CONFIRMED' ||
      event === 'PAYMENT_RECEIVED_IN_CASH' ||
      payment.status === 'RECEIVED' ||
      payment.status === 'CONFIRMED'
    );

    const isPaymentOverdue = (
      event === 'PAYMENT_OVERDUE' ||
      payment.status === 'OVERDUE'
    );

    const isPaymentDeleted = (
      event === 'PAYMENT_DELETED' ||
      payment.status === 'DELETED'
    );

    // 3. Localizar ou registrar o pagamento na coleção Payment
    let dbPayment = await Payment.findOne({ asaasPaymentId: payment.id });
    if (!dbPayment && client) {
      dbPayment = await Payment.findOne({ clientId: client._id, vencimento: payment.dueDate });
    }

    if (isPaymentConfirmed) {
      console.log(`[Asaas Webhook] Confirmando pagamento: PaymentId=${payment.id}, Aluno=${client?.dadosPessoais?.nome || 'N/A'}`);

      if (!dbPayment && client) {
        const totalCount = await Payment.countDocuments({ clientId: client._id });
        dbPayment = await Payment.create({
          clientId: client._id,
          clientNome: client.dadosPessoais?.nome || 'Aluno',
          contractId: contract?._id,
          planoNome: contract?.planoNome || (payment.subscription ? 'Assinatura Recorrente' : 'Mensalidade'),
          valor: payment.value,
          vencimento: payment.dueDate,
          status: 'Pago',
          dataPagamento: payment.paymentDate || new Date().toISOString().split('T')[0],
          formaPagamento: 'Asaas',
          asaasPaymentId: payment.id,
          asaasInvoiceUrl: payment.invoiceUrl,
          parcelaNumero: totalCount + 1,
          parcelasTotal: contract?.parcelas || (contract?.criarRecorrenciaMensal ? 12 : 1),
          observacoes: `Fatura paga via Asaas ${payment.subscription ? `(Assinatura ${payment.subscription})` : ''}`
        });
      } else if (dbPayment) {
        dbPayment.status = 'Pago';
        dbPayment.dataPagamento = payment.paymentDate || new Date().toISOString().split('T')[0];
        if (contract && !dbPayment.contractId) dbPayment.contractId = contract._id;
        if (payment.invoiceUrl) dbPayment.asaasInvoiceUrl = payment.invoiceUrl;
        await dbPayment.save();
      }

      if (contract) {
        contract.asaasBillingStatus = 'pago';
        await contract.save();
      }

      if (client) {
        await syncClientPlanValidity(client._id.toString());
      }

      return NextResponse.json({ success: true, message: 'Pagamento confirmado e vigência sincronizada com sucesso' });
    } else if (isPaymentOverdue) {
      console.log(`[Asaas Webhook] Pagamento em atraso: PaymentId=${payment.id}, Aluno=${client?.dadosPessoais?.nome || 'N/A'}`);

      if (dbPayment) {
        dbPayment.status = 'Atrasado';
        await dbPayment.save();
      }

      if (contract) {
        contract.asaasBillingStatus = 'vencido';
        await contract.save();
      }

      return NextResponse.json({ success: true, message: 'Mensalidade marcada como em atraso' });
    } else if (isPaymentDeleted) {
      console.log(`[Asaas Webhook] Pagamento excluído: PaymentId=${payment.id}`);

      if (dbPayment) {
        dbPayment.status = 'Cancelado';
        await dbPayment.save();
      }

      if (contract) {
        contract.asaasBillingStatus = 'cancelado';
        await contract.save();
      }

      return NextResponse.json({ success: true, message: 'Mensalidade cancelada' });
    } else if (event === 'PAYMENT_CREATED' && payment.subscription && client) {
      if (!dbPayment) {
        const count = await Payment.countDocuments({ clientId: client._id });
        const newPayment = await Payment.create({
          clientId: client._id,
          clientNome: client.dadosPessoais?.nome || 'Aluno',
          contractId: contract?._id,
          planoNome: contract?.planoNome || 'Assinatura: Recorrência',
          valor: payment.value,
          vencimento: payment.dueDate,
          status: 'Pendente',
          formaPagamento: 'Asaas',
          asaasPaymentId: payment.id,
          asaasInvoiceUrl: payment.invoiceUrl,
          parcelaNumero: count + 1,
          parcelasTotal: contract?.recorrenciaMeses || 12,
          observacoes: `Fatura gerada automaticamente pela assinatura Asaas ${payment.subscription}`
        });
        return NextResponse.json({ success: true, message: 'Nova fatura de assinatura registrada', data: newPayment });
      }
    } else if (contract) {
      contract.asaasBillingStatus = (payment.status || '').toLowerCase();
      await contract.save();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no processamento do webhook do Asaas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
