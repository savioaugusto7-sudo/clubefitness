import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import { getAsaasPaymentDetails, getAsaasPixQrCode } from '@/utils/asaas';

export async function GET(request: Request) {
  try {
    await dbConnect();

    // Buscar todos os contratos que foram enviados para o Asaas (que possuem ID de cobrança)
    const contracts = await Contract.find({ asaasPaymentId: { $ne: '' } })
      .populate('clientId')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: contracts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { contractId } = body;

    if (!contractId) {
      return NextResponse.json({ success: false, error: 'contractId é obrigatório' }, { status: 400 });
    }

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
    }

    if (!contract.asaasPaymentId) {
      return NextResponse.json({ success: false, error: 'Contrato não está vinculado ao Asaas' }, { status: 400 });
    }

    console.log(`Iniciando sincronização manual do Asaas para o contrato: ID=${contract._id}, PaymentId=${contract.asaasPaymentId}`);

    // Consultar dados atualizados diretamente na API do Asaas
    const payment = await getAsaasPaymentDetails(contract.asaasPaymentId);
    const apiStatus = payment.status; // ex: PENDING, RECEIVED, CONFIRMED, OVERDUE, DELETED

    const client = await Client.findById(contract.clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    // Atualizar status no banco com base no retorno do Asaas
    if (apiStatus === 'RECEIVED' || apiStatus === 'CONFIRMED') {
      // Ativar contrato e dados comerciais do cliente
      contract.status = 'assinado';
      contract.asaasBillingStatus = 'pago';
      if (!contract.assinaturaNome) {
        contract.assinaturaNome = client.dadosPessoais?.nome || 'Sincronização Manual Asaas';
        contract.assinaturaData = new Date();
      }
      await contract.save();

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
    } else if (apiStatus === 'OVERDUE') {
      contract.asaasBillingStatus = 'vencido';
      await contract.save();

      client.dadosComerciais.status = 'vencido';
      await client.save();
    } else if (apiStatus === 'DELETED') {
      contract.status = 'cancelado';
      contract.asaasBillingStatus = 'cancelado';
      await contract.save();

      if (client.dadosComerciais?.planoId?.toString() === contract.planoId.toString()) {
        client.dadosComerciais.status = 'inativo';
        await client.save();
      }
    } else {
      // Apenas atualiza o status de cobrança
      contract.asaasBillingStatus = apiStatus.toLowerCase();

      // Se a cobrança for Pix e por acaso as chaves Pix não estiverem salvas localmente, tentar buscar e salvar
      if (contract.formaPagamento === 'pix' && !contract.asaasPixCopyPaste) {
        const pixDetails = await getAsaasPixQrCode(contract.asaasPaymentId);
        if (pixDetails) {
          contract.asaasPixQrCode = pixDetails.encodedImage;
          contract.asaasPixCopyPaste = pixDetails.payload;
        }
      }
      await contract.save();
    }

    return NextResponse.json({ success: true, data: contract });
  } catch (error: any) {
    console.error('Erro na sincronização manual com Asaas:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
