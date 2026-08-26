import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Proposal from '@/models/Proposal';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import { checkSessionPermission } from '@/utils/authHelper';
import { isMinorFromBirthDate } from '@/utils/dateUtils';

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

      const now = new Date();
      const createdTime = new Date(proposal.createdAt).getTime();
      const diffDays = (now.getTime() - createdTime) / (1000 * 60 * 60 * 24);

      // 1. Checar se a proposta expirou (mais de 3 dias)
      if (diffDays > 3 && proposal.status === 'pendente') {
        proposal.status = 'expirada';
        proposal.expiradoEm = proposal.expiradoEm || now;
        await proposal.save();
      }

      // 2. Registrar visualização / abertura do link
      if (!proposal.abertoEm) {
        proposal.abertoEm = now;
        proposal.visualizado = true;
        await proposal.save();
      }

      return NextResponse.json({ success: true, data: proposal });
    }

    // Authenticated access for admin/receptionist to view proposals
    await checkSessionPermission(['admin', 'receptionist']);

    // Expirar em lote propostas pendentes com mais de 3 dias
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await Proposal.updateMany(
      { status: 'pendente', createdAt: { $lt: threeDaysAgo } },
      { $set: { status: 'expirada', expiradoEm: new Date() } }
    );

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
      unidadeContratada,
      isMinor
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

    const clientBirthDate = client.dadosPessoais?.dataNascimento || (client.dadosPessoais as any)?.nascimento;
    const isMinorCalculated = isMinor !== undefined ? Boolean(isMinor) : isMinorFromBirthDate(clientBirthDate);

    // 1. Expirar automaticamente qualquer proposta pendente anterior do mesmo cliente
    await Proposal.updateMany(
      { clientId: client._id, status: 'pendente' },
      { $set: { status: 'expirada', expiradoEm: new Date() } }
    );

    // 2. Criar nova proposta com status pendente
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
      isMinor: isMinorCalculated,
      status: 'pendente'
    });

    // 3. Atualizar status do cliente para proposta_enviada se não for um contrato já assinado/ativo
    if (client.dadosComerciais) {
      if (client.dadosComerciais.status !== 'ativo' && client.dadosComerciais.status !== 'finalizado') {
        client.dadosComerciais.status = 'proposta_enviada';
        await client.save();
      }
    }

    return NextResponse.json({ success: true, data: proposal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import Contract from '@/models/Contract';
import { createClicksignDocument } from '@/app/api/contracts/route';
import { generateContractPDFBase64 } from '@/utils/serverPdfGenerator';

export const maxDuration = 30;

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

    // 1. Update client's personal and address details, and sync commercial terms in DB
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

    const planObj = await Plan.findById(proposal.planoId);
    const isAnualPlan = planObj?.tipo === 'Anual' || proposal.duracao === 'anual' || (proposal.vigenciaQtd && proposal.vigenciaQtd >= 12);
    const numVigenciaQtd = isAnualPlan ? 1 : (Number(proposal.vigenciaQtd) || 1);
    const duracaoTipo = proposal.duracao || (isAnualPlan ? 'anual' : 'mensal');

    const startDCalc = new Date((proposal.dataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
    const endDCalc = new Date(startDCalc);
    if (duracaoTipo === 'semana') {
      endDCalc.setDate(endDCalc.getDate() + (numVigenciaQtd * 7));
    } else if (duracaoTipo === 'anual' || isAnualPlan) {
      endDCalc.setFullYear(endDCalc.getFullYear() + (numVigenciaQtd >= 12 ? 1 : numVigenciaQtd));
    } else {
      endDCalc.setMonth(endDCalc.getMonth() + numVigenciaQtd);
    }
    const dataFimCalculadaComercial = endDCalc.toISOString().split('T')[0];

    const comCurrent = client.dadosComerciais || {};
    client.dadosComerciais = {
      ...comCurrent,
      planoId: proposal.planoId,
      planoNome: proposal.planoNome || planObj?.nome || comCurrent.planoNome,
      status: 'ativo',
      formaPagamento: formaPagamentoEscolhida || comCurrent.formaPagamento || 'pix',
      duracao: duracaoTipo,
      duracaoQtd: numVigenciaQtd,
      valorUnitario: proposal.valorUnitario || (proposal.valorAcordado / (numVigenciaQtd > 0 ? numVigenciaQtd : 1)),
      valorTotal: valorFinalRecalculado || proposal.valorAcordado,
      parcelas: Number(parcelasEscolhidas) || 1,
      dataInicio: proposal.dataInicio || new Date().toISOString().split('T')[0],
      dataPrimeiroVencimento: dataVencimentoEscolhida || '',
      vencimento: dataFimCalculadaComercial,
      frequencia: proposal.frequencia || planObj?.frequencia || comCurrent.frequencia || 3,
      creditosTotal: proposal.creditosMensais || comCurrent.creditosTotal || 0,
      unidadeContratada: proposal.unidadeContratada || comCurrent.unidadeContratada || 'Clube Fitness',
      observacoesContratuais: proposal.observacoesContratuais || comCurrent.observacoesContratuais || '',
      descontoTipo: proposal.descontoTipo || 'percentual',
      descontoValor: proposal.descontoValor || 0,
      criarRecorrenciaMensal: Boolean(proposal.criarRecorrenciaMensal),
      recorrenciaMeses: proposal.recorrenciaMeses || 12
    };

    client.bloqueioCadastral = {
      bloqueado: true,
      motivo: 'Informação fornecida pelo contratante no aceite da proposta de venda',
      dadosInformadosPeloCliente: true,
      origemCadastro: client.bloqueioCadastral?.origemCadastro || 'link_venda',
      historicoDesbloqueios: client.bloqueioCadastral?.historicoDesbloqueios || []
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
      const isAnual = plan?.tipo === 'Anual' || proposal.duracao === 'anual' || (proposal.vigenciaQtd && proposal.vigenciaQtd >= 12);
      const numParcelas = Number(parcelasEscolhidas) || 1;
      const vigenciaMeses = isAnual ? 12 : (Number(proposal.vigenciaQtd) || 1);

      const startD = new Date((proposal.dataInicio || new Date().toISOString().split('T')[0]) + 'T00:00:00');
      const endD = new Date(startD);
      if (proposal.duracao === 'semana') {
        endD.setDate(endD.getDate() + (vigenciaMeses * 7));
      } else if (isAnual) {
        endD.setFullYear(endD.getFullYear() + (vigenciaMeses >= 12 ? 1 : vigenciaMeses));
      } else {
        endD.setMonth(endD.getMonth() + vigenciaMeses);
      }
      const dataFim = endD.toISOString().split('T')[0];

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
        formaPagamento: formaPagamentoEscolhida || 'boleto',
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

      // Quando menor: usar dados do responsável legal como signatário do Clicksign
      const signerNome = (proposal.isMinor && dadosPreenchidos?.responsavelNome)
        ? dadosPreenchidos.responsavelNome
        : client.dadosPessoais.nome;
      const signerCpf = (proposal.isMinor && dadosPreenchidos?.responsavelCpf)
        ? dadosPreenchidos.responsavelCpf
        : client.dadosPessoais.cpf;
      const signerEmail = client.dadosPessoais.email; // já foi sobrescrito com o do responsável no step 1
      const signerTelefone = client.dadosPessoais.telefone; // idem

      try {
        const cSignResult = await createClicksignDocument(
          fileName,
          base64File,
          signerEmail,
          signerNome,
          signerCpf,
          client.dadosPessoais.dataNascimento || '',
          signerTelefone
        );

        newContract.clicksignDocKey = cSignResult.docKey;
        newContract.clicksignSignerKey = cSignResult.signerKey;
        newContract.clicksignUrl = cSignResult.signatureUrl;
        newContract.clicksignStatus = 'pendente';
        await newContract.save();

        proposal.status = 'aceita';
        proposal.contractId = newContract._id;
        await proposal.save();

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

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    await checkSessionPermission(['admin', 'receptionist']);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clientId = searchParams.get('clientId');

    if (id) {
      await Proposal.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: 'Proposta excluída com sucesso.' });
    }

    if (clientId) {
      await Proposal.deleteMany({ clientId });
      return NextResponse.json({ success: true, message: 'Propostas do cliente excluídas com sucesso.' });
    }

    return NextResponse.json({ success: false, error: 'ID ou clientId não fornecido.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

