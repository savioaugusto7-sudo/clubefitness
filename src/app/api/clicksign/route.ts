import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';

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
      await fetch(`${baseUrl}/api/v1/documents/${contract.clicksignDocKey}/cancel?access_token=${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
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

    // Fetch document list to get signature request key
    const docRes = await fetch(`${baseUrl}/api/v1/documents/${contract.clicksignDocKey}?access_token=${token}`);
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
