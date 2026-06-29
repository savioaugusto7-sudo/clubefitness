import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';

export async function POST(request: Request) {
  try {
    await dbConnect();

    // 1. Validar Token de Autenticação do Webhook
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
    const receivedToken = request.headers.get('asaas-access-token');

    if (webhookToken && receivedToken !== webhookToken) {
      console.warn('Alerta: Recebido webhook do Asaas com token de autenticação inválido.');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const payload = await request.json();
    const { event, payment } = payload;

    if (!payment) {
      return NextResponse.json({ success: true, message: 'Evento sem dados de pagamento ignorado' });
    }

    console.log(`Recebido webhook do Asaas: Evento=${event}, PaymentId=${payment.id}, InstallmentId=${payment.installment || 'N/A'}`);

    // 2. Localizar o contrato associado (pelo ID da cobrança ou pelo ID do parcelamento)
    const queryConds: any[] = [{ asaasPaymentId: payment.id }];
    if (payment.installment) {
      queryConds.push({ asaasPaymentId: payment.installment });
    }

    const contract = await Contract.findOne({ $or: queryConds });
    if (!contract) {
      console.warn(`Contrato não encontrado no sistema para a cobrança do Asaas: ID=${payment.id}`);
      return NextResponse.json({ success: true, message: 'Cobrança não vinculada a nenhum contrato no sistema' });
    }

    const client = await Client.findById(contract.clientId);
    if (!client) {
      console.warn(`Cliente não encontrado para o contrato: ID=${contract._id}`);
      return NextResponse.json({ success: true, message: 'Cliente do contrato não encontrado' });
    }

    // 3. Tratar cada evento de pagamento do Asaas
    if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
      console.log(`Confirmando pagamento para contrato: ID=${contract._id}, Aluno=${client.dadosPessoais?.nome}`);

      // Cancelar qualquer outro contrato assinado anterior para evitar duplicidade de planos
      await Contract.updateMany(
        { clientId: contract.clientId, _id: { $ne: contract._id }, status: 'assinado' },
        { status: 'cancelado' }
      );

      // Atualizar status do contrato
      contract.status = 'assinado';
      contract.asaasBillingStatus = 'pago';
      if (!contract.assinaturaNome) {
        contract.assinaturaNome = client.dadosPessoais?.nome || 'Aceite via Asaas';
        contract.assinaturaData = new Date();
      }
      await contract.save();

      // Sincronizar dados comerciais do aluno
      const plan = await Plan.findById(contract.planoId);
      const isAnual = contract.planoTipo === 'Anual';

      Object.assign(client.dadosComerciais, {
        planoId: contract.planoId,
        vencimento: contract.dataPrimeiroVencimento || contract.dataFim,
        status: 'ativo',
        parcelas: contract.parcelas,
        descontoValor: contract.descontoValor,
        descontoTipo: contract.descontoTipo,
        duracao: isAnual ? 'anual' : 'mensal',
        formaPagamento: contract.formaPagamento,
        dataInicio: contract.dataInicio,
        responsavelVenda: contract.responsavelVenda || '',
        unidadeContratada: contract.unidadeContratada || '',
        observacoesContratuais: contract.observacoesContratuais || '',
        creditosTotal: plan?.creditosTotal || (contract.valorBruto > 0 ? 12 : 0),
        creditosUsados: 0,
        creditosReservados: 0,
        creditosMassagemTotal: isAnual ? 1 : 0,
        creditosMassagemUsados: 0,
        creditosMassagemReservados: 0
      });

      await client.save();
      console.log(`Aluno ${client.dadosPessoais?.nome} ativado com sucesso via Asaas!`);
    } else if (event === 'PAYMENT_OVERDUE') {
      console.log(`Pagamento em atraso no Asaas para contrato: ID=${contract._id}, Aluno=${client.dadosPessoais?.nome}`);
      contract.asaasBillingStatus = 'vencido';
      await contract.save();

      // Suspender/marcar aluno como vencido
      client.dadosComerciais.status = 'vencido';
      await client.save();
    } else if (event === 'PAYMENT_DELETED') {
      console.log(`Pagamento excluído no Asaas para contrato: ID=${contract._id}`);
      contract.status = 'cancelado';
      contract.asaasBillingStatus = 'cancelado';
      await contract.save();

      // Desativar plano se for o atual
      if (client.dadosComerciais?.planoId?.toString() === contract.planoId.toString()) {
        client.dadosComerciais.status = 'inativo';
        await client.save();
      }
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
