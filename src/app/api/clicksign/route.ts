import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';

export const dynamic = 'force-dynamic';

async function syncContractStatus(contract: any, token: string, baseUrl: string) {
  const [envelopeId, documentId] = contract.clicksignDocKey.split(':');
  const actualEnvelopeId = envelopeId;
  const actualDocumentId = documentId || envelopeId;

  try {
    let clicksignStatus = 'pendente';
    let finishedAt = null;

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
            frequencia: contract.frequencia !== undefined ? contract.frequencia : client.dadosComerciais.frequencia,
            creditosTotal: contract.creditosTotal || plan?.creditosTotal || (contract.valorBruto > 0 ? 12 : 0),
            creditosUsados: 0,
            creditosReservados: 0,
            creditosMassagemTotal: isAnual ? 1 : 0,
            creditosMassagemUsados: 0,
            creditosMassagemReservados: 0
          });
          await client.save();
          console.log(`Sync status: Client ${client.dadosPessoais?.nome} activated via clicksign sync.`);
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
    }
  } catch (error) {
    console.error(`Erro ao sincronizar contrato ${contract._id}:`, error);
  }
}


export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const query: any = { clicksignDocKey: { $exists: true, $ne: '' } };
    if (status && status !== 'todos') {
      query.clicksignStatus = status;
    }

    const contracts = await Contract.find(query)
      .sort({ createdAt: -1 })
      .limit(200);

    const token = process.env.CLICKSIGN_ACCESS_TOKEN;
    const baseUrl = process.env.CLICKSIGN_API_URL || 'https://sandbox.clicksign.com';

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

// Reenviar notificação de e-mail para assinante
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
    const actualDocumentId = documentId || envelopeId;

    // Fetch document list to get signature request key
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
