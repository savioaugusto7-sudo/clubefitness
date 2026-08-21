import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

import { createAsaasCustomer, createAsaasPayment } from '@/utils/asaas';

export async function syncContractStatus(contract: any, token: string, baseUrl: string) {
  if (!contract?.clicksignDocKey) return;
  const [envelopeId, documentId] = contract.clicksignDocKey.split(':');
  const actualEnvelopeId = envelopeId;
  const actualDocumentId = documentId || envelopeId;

  try {
    let clicksignStatus = 'pendente';
    let finishedAt: any = null;

    if (actualEnvelopeId && actualEnvelopeId.length === 36) {
      console.log(`Sync status: Fetching clicksign v3 for envelope ${actualEnvelopeId}`);
      const res = await fetch(`${baseUrl}/api/v3/envelopes/${actualEnvelopeId}`, {
        method: 'GET',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        },
        cache: 'no-store'
      });
      console.log(`Sync status: Fetch clicksign v3 response status: ${res.status}`);
      if (res.ok) {
        const data = await res.json();
        const status = data.data?.attributes?.status;
        console.log(`Sync status: Envelope ${actualEnvelopeId} status: ${status}`);
        if (status === 'finished' || status === 'closed') {
          clicksignStatus = 'assinado';
          finishedAt = data.data?.attributes?.finished_at || new Date();
        } else if (status === 'canceled') {
          clicksignStatus = 'cancelado';
        } else {
          // Checar também os signatários do envelope
          try {
            const signersRes = await fetch(`${baseUrl}/api/v3/envelopes/${actualEnvelopeId}/signers`, {
              headers: {
                'Authorization': token,
                'Content-Type': 'application/vnd.api+json',
                'Accept': 'application/vnd.api+json'
              },
              cache: 'no-store'
            });
            if (signersRes.ok) {
              const signersData = await signersRes.json();
              const signersList = signersData.data || [];
              const studentSigner = signersList.find((s: any) => s.id === contract.clicksignSignerKey) || signersList[0];
              if (studentSigner) {
                const sStatus = studentSigner.attributes?.status;
                const sSigned = studentSigner.attributes?.has_signed || studentSigner.attributes?.signed_at;
                if (sStatus === 'signed' || sSigned) {
                  clicksignStatus = 'assinado';
                  finishedAt = studentSigner.attributes?.signed_at || new Date();
                }
              }
            }
          } catch (sErr) {
            console.warn('Erro ao checar signatários do envelope:', sErr);
          }
        }
      } else {
        console.log(`Sync status: Fallback to clicksign v1 for document ${actualDocumentId}`);
        const fallbackRes = await fetch(`${baseUrl}/api/v1/documents/${actualDocumentId}?access_token=${token}`, {
          cache: 'no-store'
        });
        console.log(`Sync status: Fetch clicksign v1 response status: ${fallbackRes.status}`);
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          const status = data.document?.status;
          console.log(`Sync status: Document ${actualDocumentId} status: ${status}`);
          if (status === 'finished' || status === 'closed') {
            clicksignStatus = 'assinado';
            finishedAt = data.document?.finished_at || new Date();
          } else if (status === 'canceled') {
            clicksignStatus = 'cancelado';
          }
        }
      }
    }

    if (clicksignStatus !== contract.clicksignStatus) {
      // Cancelar qualquer outro contrato assinado anterior do mesmo cliente se esse foi assinado
      if (clicksignStatus === 'assinado') {
        await Contract.updateMany(
          { clientId: contract.clientId, _id: { $ne: contract._id }, status: 'assinado' },
          { status: 'cancelado' }
        );
      }

      contract.clicksignStatus = clicksignStatus;
      contract.status = clicksignStatus;

      if (clicksignStatus === 'assinado') {
        contract.assinaturaNome = contract.assinaturaNome || 'Assinatura Eletrônica Clicksign';
        contract.assinaturaData = finishedAt ? new Date(finishedAt) : new Date();

        const client = await Client.findById(contract.clientId);
        if (client) {
          const plan = await Plan.findById(contract.planoId);
          const isAnual = contract.planoTipo === 'Anual' || contract.vigenciaMeses >= 12;

          Object.assign(client.dadosComerciais, {
            planoId: contract.planoId,
            vencimento: contract.dataFim || contract.dataPrimeiroVencimento || contract.dataInicio,
            status: 'ativo',
            parcelas: contract.parcelas,
            descontoValor: contract.descontoValor,
            descontoTipo: contract.descontoTipo,
            duracao: isAnual ? 'anual' : 'mensal',
            duracaoQtd: isAnual ? 12 : (contract.vigenciaMeses || 1),
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
          await client.save();

          // Se a forma de pagamento for BOLETO e ainda não possuir cobrança Asaas gerada, criar automaticamente
          if (contract.formaPagamento === 'boleto' && !contract.asaasPaymentId && process.env.ASAAS_API_KEY) {
            try {
              let asaasCustomerId = client.dadosComerciais?.asaasCustomerId;
              if (!asaasCustomerId) {
                asaasCustomerId = await createAsaasCustomer(client);
                client.dadosComerciais.asaasCustomerId = asaasCustomerId;
                await client.save();
              }
              const numParcelas = Number(contract.parcelas) || 1;
              const totalLiquido = Number(contract.valorLiquido) || Number(contract.valorBruto) || 0;
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
              }
            } catch (asaasErr: any) {
              console.warn('Erro ao criar cobrança Asaas no sync do Clicksign:', asaasErr.message);
            }
          }

          console.log(`Sync status: Client ${client.dadosPessoais?.nome} activated via clicksign sync with vencimento ${client.dadosComerciais?.vencimento}.`);
        }
      } else if (clicksignStatus === 'cancelado') {
        const client = await Client.findById(contract.clientId);
        if (client && client.dadosComerciais?.planoId?.toString() === contract.planoId?.toString()) {
          client.dadosComerciais.status = 'inativo';
          await client.save();
          console.log(`Sync status: Client ${client.dadosPessoais?.nome} inactivated via clicksign cancel sync.`);
        }
      }
      await contract.save();
    } else if (contract.status === 'assinado' || clicksignStatus === 'assinado') {
      // Reconciliação caso o contrato já esteja assinado mas o perfil do cliente mantivesse 'lead' ou dados desatualizados
      const client = await Client.findById(contract.clientId);
      if (client && (client.dadosComerciais?.status !== 'ativo' || !client.dadosComerciais?.planoId)) {
        const plan = await Plan.findById(contract.planoId);
        const isAnual = contract.planoTipo === 'Anual' || (contract.vigenciaMeses || 1) >= 12;

        Object.assign(client.dadosComerciais, {
          planoId: contract.planoId,
          vencimento: contract.dataFim || contract.dataPrimeiroVencimento || contract.dataInicio,
          status: 'ativo',
          parcelas: contract.parcelas,
          descontoValor: contract.descontoValor,
          descontoTipo: contract.descontoTipo,
          duracao: isAnual ? 'anual' : 'mensal',
          duracaoQtd: isAnual ? 12 : (contract.vigenciaMeses || 1),
          formaPagamento: contract.formaPagamento,
          dataInicio: contract.dataInicio,
          responsavelVenda: contract.responsavelVenda || '',
          observacoesContratuais: contract.observacoesContratuais || '',
          frequencia: contract.frequencia !== undefined ? contract.frequencia : client.dadosComerciais?.frequencia,
          creditosTotal: contract.creditosTotal || plan?.creditosTotal || (contract.valorBruto > 0 ? 12 : 0)
        });
        await client.save();
        console.log(`Sync status: Reconciled client ${client.dadosPessoais?.nome} to 'ativo' for signed contract.`);
      }
    }
  } catch (error) {
    console.error(`Erro ao sincronizar contrato ${contract._id}:`, error);
  }
}


export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const token = process.env.CLICKSIGN_ACCESS_TOKEN;
    const baseUrl = process.env.CLICKSIGN_API_URL || 'https://sandbox.clicksign.com';

    if (contractId) {
      const contract = await Contract.findById(contractId);
      if (!contract) {
        return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
      }
      if (token) {
        await syncContractStatus(contract, token, baseUrl);
      }
      const updatedContract = await Contract.findById(contractId);
      return NextResponse.json({ success: true, data: updatedContract });
    }

    const query: any = { clicksignDocKey: { $exists: true, $ne: '' } };
    if (status && status !== 'todos') {
      query.clicksignStatus = status;
    }

    const contracts = await Contract.find(query)
      .sort({ createdAt: -1 })
      .limit(200);

    if (token) {
      const pendingContracts = contracts.filter((c: any) => c.status === 'pendente' || c.clicksignStatus === 'pendente');
      await Promise.all(pendingContracts.map(c => syncContractStatus(c, token, baseUrl)));
    }

    // Enrich with client data
    const enriched = await Promise.all(contracts.map(async (c: any) => {
      const client = await Client.findById(c.clientId);
      return {
        _id: c._id,
        clienteNome: client?.dadosPessoais?.nome || 'Desconhecido',
        clienteEmail: client?.dadosPessoais?.email || '',
        clienteCpf: client?.dadosPessoais?.cpf || '',
        planoNome: c.planoNome,
        planoTipo: c.planoTipo,
        valorLiquido: c.valorLiquido,
        dataInicio: c.dataInicio,
        dataFim: c.dataFim,
        status: c.status,
        clicksignStatus: c.clicksignStatus,
        clicksignDocKey: c.clicksignDocKey,
        clicksignUrl: c.clicksignUrl,
        assinaturaData: c.assinaturaData,
        dataEmissao: c.dataEmissao,
        responsavelVenda: c.responsavelVenda,
        versao: c.versao,
      };
    }));

    // Filter by search if provided
    const filtered = search
      ? enriched.filter(c =>
          c.clienteNome.toLowerCase().includes(search.toLowerCase()) ||
          c.clienteEmail.toLowerCase().includes(search.toLowerCase()) ||
          c.clienteCpf.includes(search)
        )
      : enriched;

    // Stats
    const stats = {
      total: enriched.length,
      pendente: enriched.filter(c => c.clicksignStatus === 'pendente').length,
      assinado: enriched.filter(c => c.clicksignStatus === 'assinado').length,
      cancelado: enriched.filter(c => c.clicksignStatus === 'cancelado').length,
    };

    return NextResponse.json({ success: true, data: filtered, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Cancelar um documento na Clicksign
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('id');

    if (!contractId) {
      return NextResponse.json({ success: false, error: 'ID obrigatório' }, { status: 400 });
    }

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
    }

    const token = process.env.CLICKSIGN_ACCESS_TOKEN;
    const baseUrl = process.env.CLICKSIGN_API_URL || 'https://sandbox.clicksign.com';

    if (contract.clicksignDocKey && token) {
      const [envelopeId, documentId] = contract.clicksignDocKey.split(':');
      const actualEnvelopeId = envelopeId;
      const actualDocumentId = documentId || envelopeId;

      // Tenta o cancelamento via API v3 (Envelope)
      const docsRes = await fetch(`${baseUrl}/api/v3/envelopes/${actualEnvelopeId}/documents`, {
        method: 'GET',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        }
      });

      if (docsRes.ok) {
        const docsData = await docsRes.json();
        const docs = docsData.data || [];
        for (const doc of docs) {
          if (doc.id) {
            await fetch(`${baseUrl}/api/v3/envelopes/${actualEnvelopeId}/documents/${doc.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': token,
                'Content-Type': 'application/vnd.api+json',
                'Accept': 'application/vnd.api+json'
              },
              body: JSON.stringify({
                data: {
                  id: doc.id,
                  type: 'documents',
                  attributes: {
                    status: 'canceled'
                  }
                }
              })
            });
          }
        }
      } else {
        // Fallback para API v1 (Documentos diretos)
        await fetch(`${baseUrl}/api/v1/documents/${actualDocumentId}/cancel?access_token=${token}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    contract.status = 'cancelado';
    contract.clicksignStatus = 'cancelado';
    await contract.save();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Reenviar notificação para assinante (WhatsApp / E-mail)
export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { contractId } = body;

    const contract = await Contract.findById(contractId);
    if (!contract?.clicksignDocKey) {
      return NextResponse.json({ success: false, error: 'Contrato ou chave Clicksign não encontrada' }, { status: 404 });
    }

    const token = process.env.CLICKSIGN_ACCESS_TOKEN;
    const baseUrl = process.env.CLICKSIGN_API_URL || 'https://sandbox.clicksign.com';

    if (!token) {
      return NextResponse.json({ success: false, error: 'CLICKSIGN_ACCESS_TOKEN não configurado' }, { status: 500 });
    }

    const [envelopeId, documentId] = contract.clicksignDocKey.split(':');
    const actualEnvelopeId = envelopeId;
    const actualDocumentId = documentId || envelopeId;

    if (actualEnvelopeId && actualEnvelopeId.length === 36) {
      // Clicksign API v3: Disparar notificação do envelope
      const v3Res = await fetch(`${baseUrl}/api/v3/envelopes/${actualEnvelopeId}/notifications`, {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        },
        body: JSON.stringify({
          data: {
            type: 'notifications',
            attributes: {}
          }
        })
      });

      if (!v3Res.ok) {
        let errData: any = {};
        try { errData = await v3Res.json(); } catch {}
        const detail = (Array.isArray(errData?.errors) && errData.errors[0]?.detail) || errData?.error || `HTTP ${v3Res.status}`;
        return NextResponse.json({ success: false, error: `Falha ao reenviar: ${detail}` }, { status: 400 });
      }

      return NextResponse.json({ success: true, message: 'Notificação reenviada com sucesso via WhatsApp!' });
    }

    // Fallback para API v1 (documentos diretos)
    const docRes = await fetch(`${baseUrl}/api/v1/documents/${actualDocumentId}?access_token=${token}`);
    const docData = await docRes.json();

    if (!docRes.ok) {
      return NextResponse.json({ success: false, error: 'Erro ao buscar documento na Clicksign' }, { status: 500 });
    }

    // Re-send notifications to all pending signers
    const lists = docData.document?.lists || [];
    for (const list of lists) {
      if (list.signed_at === null && list.request_signature_key) {
        await fetch(`${baseUrl}/api/v1/notifications?access_token=${token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_signature_key: list.request_signature_key,
            message: 'Lembrete: Por favor, assine o contrato da clínica Clube Fitness.'
          })
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Notificação reenviada com sucesso!' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Emissão direta de contrato via Clicksign ou Sincronização sob demanda
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    // Sincronização pontual sob demanda de envelope / contrato
    if (body.action === 'sync_doc' || body.action === 'sync') {
      const { docKey, contractId, clientId } = body;
      let contract: any = null;
      if (contractId) {
        contract = await Contract.findById(contractId);
      } else if (docKey) {
        contract = await Contract.findOne({ clicksignDocKey: docKey });
      } else if (clientId) {
        contract = await Contract.findOne({ clientId }).sort({ createdAt: -1 });
      }

      if (!contract) {
        return NextResponse.json({ success: false, error: 'Contrato não encontrado para sincronização' }, { status: 404 });
      }

      const token = process.env.CLICKSIGN_ACCESS_TOKEN;
      const baseUrl = process.env.CLICKSIGN_API_URL || 'https://sandbox.clicksign.com';
      if (token) {
        await syncContractStatus(contract, token, baseUrl);
      }

      const updatedContract = await Contract.findById(contract._id);
      return NextResponse.json({ success: true, data: updatedContract });
    }

    const {
      clientId,
      planoId,
      valorFinal,
      valorLiquido,
      formaPagamento,
      parcelas,
      dataVencimento,
      dataInicio,
      duracao,
      duracaoQtd
    } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    const effectivePlanId = planoId || client.dadosComerciais?.planoId;
    const plan = effectivePlanId ? await Plan.findById(effectivePlanId) : null;

    const count = await Contract.countDocuments({ clientId });
    const versao = count + 1;

    const newContract = new Contract({
      clientId,
      planoId: effectivePlanId,
      planoNome: plan?.nome || 'Plano Clube Fitness',
      planoTipo: plan?.tipo || (duracao === 'anual' ? 'Anual' : 'Mensal'),
      valorLiquido: valorFinal || valorLiquido || plan?.preco || 0,
      valorBruto: valorFinal || valorLiquido || plan?.preco || 0,
      formaPagamento: formaPagamento || 'pix',
      parcelas: Number(parcelas) || 1,
      dataInicio: dataInicio || new Date().toISOString().split('T')[0],
      dataPrimeiroVencimento: dataVencimento || dataInicio || new Date().toISOString().split('T')[0],
      status: 'pendente',
      clicksignStatus: 'pendente',
      versao
    });

    await newContract.save();

    return NextResponse.json({
      success: true,
      data: newContract,
      message: 'Contrato registrado com sucesso!'
    });
  } catch (error: any) {
    console.error('[POST /api/clicksign] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

