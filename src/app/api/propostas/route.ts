import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Proposal from '@/models/Proposal';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import { checkSessionPermission } from '@/utils/authHelper';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clientId = searchParams.get('clientId');

    // Force model registration
    const _plan = Plan;

    // Public access to fetch a specific proposal by ID for the client checkout
    if (id) {
      const proposal = await Proposal.findById(id).populate('clientId').populate('planoId');
      if (!proposal) {
        return NextResponse.json({ success: false, error: 'Proposta não encontrada.' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: proposal });
    }

    // Authenticated access for admin/receptionist to view proposals
    await checkSessionPermission(['admin', 'receptionist']);

    let query = {};
    if (clientId) {
      query = { clientId };
    }

    const proposals = await Proposal.find(query)
      .populate('planoId')
      .populate('clientId')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: proposals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    await checkSessionPermission(['admin', 'receptionist']);

    const body = await request.json();
    const {
      clientId,
      planoId,
      valorAcordado,
      creditosMensais,
      frequencia,
      duracao,
      valorUnitario,
      vigenciaQtd,
      dataInicio,
      criarRecorrenciaMensal,
      recorrenciaMeses,
      descontoTipo,
      descontoValor,
      observacoesContratuais,
      unidadeContratada
    } = body;

    if (!clientId || !planoId || valorAcordado === undefined || !creditosMensais) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const plan = await Plan.findById(planoId);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plano não encontrado.' }, { status: 404 });
    }

    const proposal = await Proposal.create({
      clientId,
      planoId,
      planoNome: plan.nome,
      planoTipo: plan.tipo,
      valorAcordado,
      creditosMensais,
      frequencia,
      duracao,
      valorUnitario,
      vigenciaQtd,
      dataInicio,
      criarRecorrenciaMensal,
      recorrenciaMeses,
      descontoTipo,
      descontoValor,
      observacoesContratuais,
      unidadeContratada,
      status: 'pendente'
    });

    return NextResponse.json({ success: true, data: proposal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID da proposta não informado.' }, { status: 400 });
    }

    const body = await request.json();
    const {
      formaPagamentoEscolhida,
      parcelasEscolhidas,
      valorFinalRecalculado,
      dataVencimentoEscolhida,
      dadosPreenchidos
    } = body;

    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return NextResponse.json({ success: false, error: 'Proposta não encontrada.' }, { status: 404 });
    }

    const client = await Client.findById(proposal.clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente correspondente não encontrado.' }, { status: 404 });
    }

    // 1. Update client's personal and address details in DB
    const pes = client.dadosPessoais || {};
    client.dadosPessoais = {
      ...pes,
      nome: dadosPreenchidos.nome || pes.nome,
      cpf: dadosPreenchidos.cpf || pes.cpf,
      telefone: dadosPreenchidos.telefone || pes.telefone,
      cep: dadosPreenchidos.cep || pes.cep,
      endereco: dadosPreenchidos.endereco || pes.endereco,
      numero: dadosPreenchidos.numero || pes.numero,
      complemento: dadosPreenchidos.complemento || pes.complemento,
      bairro: dadosPreenchidos.bairro || pes.bairro,
      cidade: dadosPreenchidos.cidade || pes.cidade,
      estado: dadosPreenchidos.estado || pes.estado
    };

    await client.save();

    // 2. Update Proposal details and status to 'respondida'
    proposal.status = 'respondida';
    proposal.formaPagamentoEscolhida = formaPagamentoEscolhida;
    proposal.parcelasEscolhidas = parcelasEscolhidas;
    proposal.valorFinalRecalculado = valorFinalRecalculado;
    proposal.dataVencimentoEscolhida = dataVencimentoEscolhida || '';
    proposal.dadosPreenchidos = dadosPreenchidos;

    await proposal.save();

    return NextResponse.json({ success: true, data: proposal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
