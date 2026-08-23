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

    // 2. Localizar o contrato associado (pelo ID da cobrança ou pelo ID do parcelamento)
    const queryConds: any[] = [{ asaasPaymentId: payment.id }];
    if (payment.installment) {
      queryConds.push({ asaasPaymentId: payment.installment });
    }

    const contract = await Contract.findOne({ $or: queryConds });
    if (!contract) {
      console.log(`[Asaas Webhook] Buscando mensalidade direta para PaymentId=${payment.id}...`);
      
      let dbPayment = await Payment.findOne({ asaasPaymentId: payment.id });
      if (!dbPayment && payment.customer) {
        const client = await Client.findOne({ 'dadosComerciais.asaasCustomerId': payment.customer });
        if (client) {
          dbPayment = await Payment.findOne({ clientId: client._id, vencimento: payment.dueDate });
        }
      }

      if (dbPayment) {
        if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED' || event === 'PAYMENT_RECEIVED_IN_CASH' || payment.status === 'RECEIVED' || payment.status === 'CONFIRMED') {
          dbPayment.status = 'Pago';
          dbPayment.dataPagamento = payment.paymentDate || new Date().toISOString().split('T')[0];
          await dbPayment.save();
          await syncClientPlanValidity(dbPayment.clientId.toString());
        } else if (event === 'PAYMENT_OVERDUE' || payment.status === 'OVERDUE') {
          dbPayment.status = 'Atrasado';
          await dbPayment.save();
        } else if (event === 'PAYMENT_DELETED') {
          dbPayment.status = 'Cancelado';
          await dbPayment.save();
        }
        console.log(`[Asaas Webhook] Mensalidade ${dbPayment._id} atualizada com status: ${dbPayment.status}.`);
        return NextResponse.json({ success: true, message: 'Mensalidade atualizada com sucesso' });
      }

      // Se for nova fatura de assinatura recorrente gerada no Asaas
      if (event === 'PAYMENT_CREATED' && payment.subscription) {
        const client = await Client.findOne({ 'dadosComerciais.asaasCustomerId': payment.customer });
        if (client) {
          const newPayment = await Payment.create({
            clientId: client._id,
            clientNome: client.dadosPessoais?.nome || 'Avulso',
            planoNome: `Assinatura: Recorrência`,
            valor: payment.value,
            vencimento: payment.dueDate,
            status: 'Pendente',
            formaPagamento: 'Asaas',
            asaasPaymentId: payment.id,
            asaasInvoiceUrl: payment.invoiceUrl,
            parcelaNumero: 1,
            parcelasTotal: 1,
            observacoes: `Fatura gerada automaticamente pela assinatura Asaas ${payment.subscription}`
          });
          console.log(`Criado novo registro de fatura de assinatura para o aluno ${client.dadosPessoais?.nome}`);
          return NextResponse.json({ success: true, message: 'Nova fatura de assinatura registrada', data: newPayment });
        }
      }

      return NextResponse.json({ success: true, message: 'Cobrança não vinculada a nenhum contrato ou pagamento avulso no sistema' });
    }

    const client = await Client.findById(contract.clientId);
    if (!client) {
      console.warn(`Cliente não encontrado para o contrato: ID=${contract._id}`);
      return NextResponse.json({ success: true, message: 'Cliente do contrato não encontrado' });
    }

    // 3. Tratar cada evento de pagamento do Asaas
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      console.log(`Confirmando pagamento para contrato: ID=${contract._id}, Aluno=${client.dadosPessoais?.nome}`);

      // Atualizar status financeiro do contrato no Asaas (mantém o contrato status inalterado)
      contract.asaasBillingStatus = 'pago';
      await contract.save();

      // Atualizar status do pagamento correspondente na coleção Payment
      await Payment.findOneAndUpdate(
        { asaasPaymentId: payment.id },
        { status: 'Pago', dataPagamento: payment.paymentDate || new Date().toISOString().split('T')[0] }
      );
      console.log(`Mensalidade correspondente ao pagamento Asaas ${payment.id} marcada como Pago.`);
      await syncClientPlanValidity(client._id.toString());
    } else if (event === 'PAYMENT_OVERDUE') {
      console.log(`Pagamento em atraso no Asaas para contrato: ID=${contract._id}, Aluno=${client.dadosPessoais?.nome}`);
      contract.asaasBillingStatus = 'vencido';
      await contract.save();

      // Atualizar status do pagamento na coleção Payment
      await Payment.findOneAndUpdate(
        { asaasPaymentId: payment.id },
        { status: 'Atrasado' }
      );
      console.log(`Mensalidade correspondente ao pagamento Asaas ${payment.id} marcada como Atrasada.`);
    } else if (event === 'PAYMENT_DELETED') {
      console.log(`Pagamento excluído no Asaas para contrato: ID=${contract._id}`);
      contract.asaasBillingStatus = 'cancelado';
      await contract.save();

      // Desativar plano se for o atual
      if (client.dadosComerciais?.planoId?.toString() === contract.planoId.toString()) {
        client.dadosComerciais.status = 'inativo';
        await client.save();
      }

      // Atualizar status do pagamento na coleção Payment
      await Payment.findOneAndUpdate(
        { asaasPaymentId: payment.id },
        { status: 'Cancelado' }
      );
      console.log(`Mensalidade correspondente ao pagamento Asaas ${payment.id} marcada como Cancelada.`);
    } else {
      // Outros eventos apenas salvam o status atualizado da transação
      contract.asaasBillingStatus = payment.status.toLowerCase();
      await contract.save();
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no processamento do webhook do Asaas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
