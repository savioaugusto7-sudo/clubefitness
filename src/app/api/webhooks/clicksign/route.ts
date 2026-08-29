import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    await dbConnect();
    const payload = await request.json();
    console.log('Clicksign Webhook received:', JSON.stringify(payload));

    // Clicksign API v3 webhook payload:
    // { "event": { "type": "envelope.finished", "data": { "envelope": { "id": "uuid" } } } }
    // Clicksign API v1 webhook payload (legacy):
    // { "event": { "name": "sign", "data": { "document": { "key": "uuid" } } } }

    const eventType: string =
      payload.data?.attributes?.event ||     // evento v3 JSON:API
      payload.event?.type ||                  // alternativa v3 / sandbox
      payload.event?.name ||                  // legado / v1
      '';

    const docKey: string | null =
      payload.data?.attributes?.data?.envelope_id ||  // ID do envelope v3
      payload.data?.attributes?.data?.document_id ||  // ID do documento v3
      payload.event?.data?.envelope?.id ||            // alternativa v3
      payload.event?.data?.document?.key ||           // legado / v1
      null;

    // Retornar 200 para qualquer evento sem docKey para evitar reenvios desnecessários
    if (!docKey) {
      console.log('Webhook: no envelope/document key found in payload, ignoring event:', eventType);
      return NextResponse.json({ success: true });
    }

    const isSignEvent = ['envelope.finished', 'envelope.closed', 'signatory.signed', 'signer.signed', 'document.signed', 'sign', 'close']
      .some(e => eventType.toLowerCase().includes(e));

    const isCancelEvent = ['envelope.canceled', 'cancel', 'closed_canceled']
      .some(e => eventType.toLowerCase().includes(e));

    if (isSignEvent) {
      // ── EVENTO DE ASSINATURA / CONCLUSÃO ──────────────────
      const contract = await Contract.findOne({
        $or: [
          { clicksignDocKey: docKey },
          { clicksignDocKey: new RegExp(docKey) }
        ]
      });

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
          const isAnual = contract.planoTipo === 'Anual' || contract.vigenciaMeses >= 12;

          // Arquivar contrato anterior se existente (Anti-Sobrescrita)
          // Arquivar contrato anterior se existente (Anti-Sobrescrita)
          if (client.dadosComerciais && client.dadosComerciais.status === 'ativo' && client.dadosComerciais.dataInicio && client.dadosComerciais.vencimento) {
            const { buildContractSnapshot } = await import('@/utils/contractLifecycle');
            const prevSnapshot = buildContractSnapshot(
              client.dadosComerciais,
              'renovado',
              `Ativação de novo contrato via Clicksign (${contract.planoNome || plan?.nome})`
            );
            if (prevSnapshot && prevSnapshot.dataInicio && prevSnapshot.dataFim) {
              if (!Array.isArray(client.historicoContratos)) client.historicoContratos = [];
              const alreadyArchived = client.historicoContratos.some((h: any) => h.dataInicio === prevSnapshot.dataInicio && String(h.planoId) === String(prevSnapshot.planoId));
              if (!alreadyArchived) {
                client.historicoContratos.push(prevSnapshot);
              }
            }
          }

          Object.assign(client.dadosComerciais, {
            planoId: contract.planoId,
            vencimento: contract.dataFim || contract.dataPrimeiroVencimento || contract.dataInicio,
            status: 'ativo',
            parcelas: contract.parcelas,
            descontoValor: contract.descontoValor,
            descontoTipo: contract.descontoTipo,
            duracao: isAnual ? 'anual' : 'mensal',
            duracaoQtd: isAnual ? 1 : (contract.vigenciaMeses || 1),
            formaPagamento: contract.formaPagamento,
            dataInicio: contract.dataInicio,
            responsavelVenda: contract.responsavelVenda || '',
            unidadeContratada: contract.unidadeContratada || '',
            observacoesContratuais: contract.observacoesContratuais || '',
            frequencia: contract.frequencia !== undefined ? contract.frequencia : client.dadosComerciais.frequencia,
            creditosTotal: contract.creditosTotal || plan?.creditosTotal || (contract.valorBruto > 0 ? 12 : 0),
            creditosUsados: 0,
            creditosReservados: 0,
            creditosMassagemTotal: isAnual ? 1 : 0,
            creditosMassagemUsados: 0,
            creditosMassagemReservados: 0
          });

          client.bloqueioCadastral = {
            bloqueado: false,
            motivo: 'Contrato assinado via Clicksign',
            dadosInformadosPeloCliente: true,
            origemCadastro: client.bloqueioCadastral?.origemCadastro || 'clicksign',
            historicoDesbloqueios: client.bloqueioCadastral?.historicoDesbloqueios || []
          };

          await client.save();

          // Se a forma de pagamento for BOLETO e ainda não possuir cobrança Asaas gerada, criar automaticamente
          if (contract.formaPagamento === 'boleto' && !contract.asaasPaymentId && process.env.ASAAS_API_KEY) {
            try {
              let asaasCustomerId = client.dadosComerciais?.asaasCustomerId;
              if (!asaasCustomerId) {
                const { createAsaasCustomer } = await import('@/utils/asaas');
                asaasCustomerId = await createAsaasCustomer(client);
                client.dadosComerciais.asaasCustomerId = asaasCustomerId;
                await client.save();
              }
              const { createAsaasPayment } = await import('@/utils/asaas');
              const numParcelas = Number(contract.parcelas) || 1;
              let totalLiquido = Number(contract.valorLiquido) || Number(contract.valorBruto) || 0;
              // Trava de segurança: se o contrato for parcelado e o valorLiquido for compatível com uma única parcela, usar valorBruto
              if (numParcelas > 1 && contract.valorBruto && totalLiquido < (contract.valorBruto * 0.75) && (!contract.descontoValor || contract.descontoValor === 0)) {
                totalLiquido = Number(contract.valorBruto);
              }
              const valorParcela = numParcelas > 1 ? Number((totalLiquido / numParcelas).toFixed(2)) : totalLiquido;
              const dueDate = contract.dataPrimeiroVencimento || contract.dataInicio || new Date().toISOString().split('T')[0];

              const asaasResult = await createAsaasPayment({
                customerId: asaasCustomerId,
                formaPagamento: 'boleto',
                value: totalLiquido,
                dueDate: dueDate,
                description: `Contrato ${plan?.nome || 'Plano'} - ${numParcelas > 1 ? `${numParcelas}x` : 'À vista'}`,
                parcelas: numParcelas
              });

              if (asaasResult && asaasResult.paymentId) {
                contract.asaasPaymentId = asaasResult.paymentId;
                contract.asaasInvoiceUrl = asaasResult.invoiceUrl || '';
                contract.asaasBoletoPdf = asaasResult.bankSlipUrl || '';
                contract.asaasBillingStatus = 'gerada';
                await contract.save();
              }
            } catch (asaasErr: any) {
              console.warn('Erro ao criar cobrança Asaas no webhook do Clicksign:', asaasErr.message);
            }
          }

          console.log(`Webhook: Client ${client.dadosPessoais?.nome} activated via Clicksign with vencimento ${client.dadosComerciais?.vencimento}.`);
        }
      }
    } else if (isCancelEvent) {
      // ── EVENTO DE CANCELAMENTO ────────────────────────────
      const contract = await Contract.findOne({
        $or: [
          { clicksignDocKey: docKey },
          { clicksignDocKey: new RegExp(docKey) }
        ]
      });

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
