import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const payload = await request.json();
    console.log('Received Clicksign Webhook payload:', JSON.stringify(payload));

    // Clicksign webhook payload standard:
    // { "event": { "name": "sign", "data": { "document": { "key": "...", "status": "..." } } } }
    const eventName = payload.event?.name;
    const docKey = payload.event?.data?.document?.key;

    if (!docKey) {
      return NextResponse.json({ success: false, error: 'Document key not found in payload' }, { status: 400 });
    }

    // Tratamento robusto para múltiplos eventos da Clicksign
    if (eventName === 'sign' || eventName === 'close') {
      const contract = await Contract.findOne({ clicksignDocKey: docKey });
      if (!contract) {
        console.log(`Contract with Clicksign key ${docKey} not found.`);
        return NextResponse.json({ success: false, error: 'Contract not found' }, { status: 404 });
      }

      if (contract.status !== 'assinado') {
        // Cancelar qualquer outro contrato assinado anterior
        await Contract.updateMany(
          { clientId: contract.clientId, _id: { $ne: contract._id }, status: 'assinado' },
          { status: 'cancelado' }
        );

        // Atualizar contrato
        contract.status = 'assinado';
        contract.clicksignStatus = 'assinado';
        contract.assinaturaNome = contract.assinaturaNome || 'Assinatura Eletrônica Clicksign';
        contract.assinaturaData = new Date();
        await contract.save();

        // Atualizar cadastro comercial do cliente
        const client = await Client.findById(contract.clientId);
        if (client) {
          const plan = await Plan.findById(contract.planoId);
          const isAnual = contract.planoTipo === 'Anual';

          client.dadosComerciais = {
            ...client.dadosComerciais,
            planoId: contract.planoId,
            vencimento: contract.dataPrimeiroVencimento || contract.dataInicio,
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
          };
          await client.save();
          console.log(`Client ${client.dadosPessoais?.nome} activated successfully via Clicksign webhook.`);
        }
      }
    } else if (eventName === 'cancel') {
      // Tratar cancelamento de documento feito diretamente pelo painel da Clicksign
      const contract = await Contract.findOne({ clicksignDocKey: docKey });
      if (contract) {
        contract.status = 'cancelado';
        contract.clicksignStatus = 'cancelado';
        await contract.save();

        const client = await Client.findById(contract.clientId);
        if (client && client.dadosComerciais?.planoId?.toString() === contract.planoId.toString()) {
          client.dadosComerciais.status = 'inativo';
          await client.save();
          console.log(`Client ${client.dadosPessoais?.nome} inactivated via Clicksign cancel webhook.`);
        }
      }
    } else {
      // Outros eventos informativos (ex: document_created, signer_created, list_created)
      // Apenas registrar nos logs do servidor sem precisar alterar dados
      console.log(`Webhook received event: ${eventName}. No commercial state action needed.`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
