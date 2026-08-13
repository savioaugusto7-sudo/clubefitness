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

import Contract from '@/models/Contract';
import { createClicksignDocument } from '@/app/api/contracts/route';
import { generateContractPDFBase64 } from '@/utils/serverPdfGenerator';

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
      dadosPreenchidos,
      dispararClicksign,
      contratoPdfBase64,
      contratoTexto
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

    // 3. Se solicitado o disparo no Clicksign, gerar o contrato e acionar o envelope
    if (dispararClicksign) {
      const plan = await Plan.findById(proposal.planoId);
      const isAnual = plan?.tipo === 'Anual' || proposal.duracao === 'anual' || proposal.vigenciaQtd >= 12;
      const numParcelas = Number(parcelasEscolhidas) || 1;
      const planVigencia = isAnual ? 12 : 1;
      const vigenciaMeses = Math.max(planVigencia, numParcelas);

      const startD = new Date((proposal.dataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      startD.setMonth(startD.getMonth() + vigenciaMeses);
      const dataFim = startD.toISOString().split('T')[0];

      const count = await Contract.countDocuments({ clientId: client._id });
      const versao = count + 1;

      const valorLiquido = valorFinalRecalculado || proposal.valorAcordado || plan?.preco || 0;
      const diaVenc = dataVencimentoEscolhida ? parseInt(dataVencimentoEscolhida.split('-')[2] || '5', 10) : new Date().getDate();

      const newContract = await Contract.create({
        clientId: client._id,
        planoId: proposal.planoId,
        planoNome: proposal.planoNome || plan?.nome,
        planoTipo: isAnual ? 'Anual' : 'Mensal',
        valorBruto: plan?.preco || valorLiquido,
        descontoTipo: proposal.descontoTipo === 'fixo' ? 'fixo' : 'percentual',
        descontoValor: proposal.descontoValor || 0,
        valorLiquido,
        parcelas: numParcelas,
        formaPagamento: formaPagamentoEscolhida || 'pix',
        diaVencimento: diaVenc,
        dataPrimeiroVencimento: dataVencimentoEscolhida || '',
        dataInicio: proposal.dataInicio || new Date().toISOString().split('T')[0],
        dataFim,
        vigenciaMeses,
        status: 'pendente',
        contratoTexto: contratoTexto || '',
        dataEmissao: new Date(),
        usuarioEmissor: 'Autoatendimento (Link de Vendas)',
        unidadeContratada: proposal.unidadeContratada || 'Clube Fitness',
        observacoesContratuais: proposal.observacoesContratuais || '',
        versao,
        frequencia: proposal.frequencia || 3,
        creditosTotal: proposal.creditosMensais || (proposal.frequencia * 4 + 1)
      });

      const fileName = `Contrato_${(client.dadosPessoais.nome || 'Aluno').replace(/\s+/g, '_')}_V${versao}.pdf`;
      let base64File = contratoPdfBase64;
      if (!base64File || !base64File.startsWith('data:application/pdf')) {
        base64File = await generateContractPDFBase64(contratoTexto || '');
      }

      try {
        const cSignResult = await createClicksignDocument(
          fileName,
          base64File,
          client.dadosPessoais.email,
          client.dadosPessoais.nome,
          client.dadosPessoais.cpf,
          client.dadosPessoais.dataNascimento || '',
          client.dadosPessoais.telefone
        );

        newContract.clicksignDocKey = cSignResult.docKey;
        newContract.clicksignSignerKey = cSignResult.signerKey;
        newContract.clicksignUrl = cSignResult.signatureUrl;
        newContract.clicksignStatus = 'pendente';
        await newContract.save();

        return NextResponse.json({
          success: true,
          data: proposal,
          contract: newContract,
          signatureUrl: cSignResult.signatureUrl
        });
      } catch (cSignErr: any) {
        console.error('Erro Clicksign no link de vendas:', cSignErr);
        return NextResponse.json({
          success: false,
          error: `Dados salvos, mas ocorreu uma falha na Clicksign: ${cSignErr.message}`
        }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, data: proposal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
