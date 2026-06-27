import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const payload = await request.json();
    console.log('Clicksign Webhook received:', JSON.stringify(payload));

    // Clicksign API v3 webhook payload:
    // { "event": { "type": "envelope.finished", "data": { "envelope": { "id": "uuid" } } } }
    // Clicksign API v1 webhook payload (legacy):
    // { "event": { "name": "sign", "data": { "document": { "key": "uuid" } } } }

    const eventType: string = payload.event?.type || payload.event?.name || '';

    const docKey: string | null =
      payload.event?.data?.envelope?.id ||
      payload.event?.data?.document?.key ||
      payload.data?.id ||
      null;

    // Retornar 200 para qualquer evento sem docKey para evitar reenvios desnecessários
    if (!docKey) {
      console.log('Webhook: no envelope/document key found in payload, ignoring event:', eventType);
      return NextResponse.json({ success: true });
    }

    const isSignEvent = ['envelope.finished', 'signatory.signed', 'sign', 'close']
      .some(e => eventType.includes(e));

    const isCancelEvent = ['envelope.canceled', 'cancel']
      .some(e => eventType.includes(e));

    if (isSignEvent) {
      // ── EVENTO DE ASSINATURA / CONCLUSÃO ──────────────────
      const contract = await Contract.findOne({ clicksignDocKey: docKey });

      if (!contract) {
        console.log(`Webhook: Contract with Clicksign key ${docKey} not found.`);
        return NextResponse.json({ success: true }); // 200 para não re-tentar
      }

      if (contract.status !== 'assinado') {
        // Cancelar qualquer outro contrato assinado anterior do mesmo cliente
        await Contract.updateMany(
          { clientId: contract.clientId, _id: { $ne: contract._id }, status: 'assinado' },
          { status: 'cancelado' }
        );

        // Marcar contrato como assinado
        contract.status = 'assinado';
        contract.clicksignStatus = 'assinado';
        contract.assinaturaNome = contract.assinaturaNome || 'Assinatura Eletrônica Clicksign';
        contract.assinaturaData = new Date();
        await contract.save();

        // Ativar cadastro comercial do cliente
        const client = await Client.findById(contract.clientId);
        if (client) {
          const plan = await Plan.findById(contract.planoId);
          const isAnual = contract.planoTipo === 'Anual';

          Object.assign(client.dadosComerciais, {
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
          });
          await client.save();
          console.log(`Webhook: Client ${client.dadosPessoais?.nome} activated via Clicksign.`);
        }
      }
    } else if (isCancelEvent) {
      // ── EVENTO DE CANCELAMENTO ────────────────────────────
      const contract = await Contract.findOne({ clicksignDocKey: docKey });

      if (contract) {
        contract.status = 'cancelado';
        contract.clicksignStatus = 'cancelado';
        await contract.save();

        const client = await Client.findById(contract.clientId);
        if (client && client.dadosComerciais?.planoId?.toString() === contract.planoId?.toString()) {
          client.dadosComerciais.status = 'inativo';
          await client.save();
          console.log(`Webhook: Client ${client.dadosPessoais?.nome} inactivated via Clicksign cancel.`);
        }
      }
    } else {
      // ── EVENTOS INFORMATIVOS (sem ação necessária) ────────
      console.log(`Webhook: informational event "${eventType}" received — no action needed.`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Clicksign Webhook error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
