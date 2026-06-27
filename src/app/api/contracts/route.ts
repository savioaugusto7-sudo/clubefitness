import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Client from '@/models/Client';
import Plan from '@/models/Plan';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
    }

    const contracts = await Contract.find({ clientId })
      .populate('planoId')
      .sort({ versao: -1 });

    return NextResponse.json({ success: true, data: contracts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


// Função auxiliar de envio para a Clicksign
async function createClicksignDocument(
  fileName: string,
  base64File: string,
  signerEmail: string,
  signerName: string,
  signerCpf: string,
  signerBirthday: string
) {
  const token = process.env.CLICKSIGN_ACCESS_TOKEN;
  const baseUrl = process.env.CLICKSIGN_API_URL || 'https://sandbox.clicksign.com';

  if (!token) {
    throw new Error('CLICKSIGN_ACCESS_TOKEN não configurado nas variáveis de ambiente.');
  }

  // 1. Criar Documento na Clicksign
  // O arquivo de texto/html ou pdf precisa estar no formato base64 completo
  const docRes = await fetch(`${baseUrl}/api/v1/documents?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      document: {
        path: `/Contratos/${fileName}`,
        file: base64File
      }
    })
  });
  const docData = await docRes.json();
  if (!docRes.ok || !docData.document) {
    throw new Error(docData.errors ? docData.errors.join(', ') : 'Erro ao criar documento na Clicksign');
  }
  const docKey = docData.document.key;

  // 2. Criar Assinante na Clicksign
  const cleanCpf = signerCpf.replace(/\D/g, '');
  const signerRes = await fetch(`${baseUrl}/api/v1/signers?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      signer: {
        email: signerEmail,
        auth_type: 'email',
        name: signerName,
        documentation: cleanCpf || undefined,
        birthday: signerBirthday || undefined,
        has_documentation: !!cleanCpf,
        delivery: 'email'
      }
    })
  });
  const signerData = await signerRes.json();
  if (!signerRes.ok || !signerData.signer) {
    throw new Error(signerData.errors ? signerData.errors.join(', ') : 'Erro ao criar assinante na Clicksign');
  }
  const signerKey = signerData.signer.key;

  // 3. Vincular Assinante ao Documento (List)
  const listRes = await fetch(`${baseUrl}/api/v1/lists?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      list: {
        document_key: docKey,
        signer_key: signerKey,
        sign_as: 'contractor'
      }
    })
  });
  const listData = await listRes.json();
  if (!listRes.ok || !listData.list) {
    throw new Error(listData.errors ? listData.errors.join(', ') : 'Erro ao vincular assinante ao contrato na Clicksign');
  }
  const signatureKey = listData.list.request_signature_key;
  const signatureUrl = listData.list.url;

  // 4. Disparar Notificação por e-mail automaticamente
  await fetch(`${baseUrl}/api/v1/notifications?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      request_signature_key: signatureKey,
      message: 'Por favor, assine o contrato da clínica Clube Fitness.'
    })
  });

  return { docKey, signerKey, signatureUrl };
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      clientId,
      planoId,
      descontoTipo,
      descontoValor,
      parcelas,
      formaPagamento,
      dataPrimeiroVencimento,
      dataInicio,
      responsavelVenda,
      unidadeContratada,
      observacoesContratuais,
      status,
      assinaturaNome,
      contratoTexto,
      usuarioEmissor,
      contratoAnexo,
      dataFim: manualDataFim,
      enviarClicksign,
      contratoHtmlBase64
    } = body;

    if (!clientId || !planoId || !dataInicio) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    const plan = await Plan.findById(planoId);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plano não encontrado' }, { status: 404 });
    }

    // 1. Contar contratos do cliente para definir a versão
    const count = await Contract.countDocuments({ clientId });
    const versao = count + 1;

    // 2. Definir Vigência (Anual = 12 meses, Mensal = 1 mês)
    const isAnual = plan.tipo === 'Anual';
    const vigenciaMeses = isAnual ? 12 : 1;

    // Calcular data de fim de vigência
    let dataFim = manualDataFim;
    if (!dataFim) {
      const startD = new Date(dataInicio + 'T00:00:00');
      startD.setMonth(startD.getMonth() + vigenciaMeses);
      dataFim = startD.toISOString().split('T')[0];
    }

    // 3. Cálculos de Descontos e Valores
    const valorBruto = plan.preco;
    const descVal = Number(descontoValor) || 0;
    let valorLiquido = valorBruto;
    if (descontoTipo === 'percentual') {
      valorLiquido = valorBruto * (1 - descVal / 100);
    } else {
      valorLiquido = Math.max(0, valorBruto - descVal);
    }

    const numParcelas = Number(parcelas) || 1;
    const diaVenc = dataPrimeiroVencimento ? parseInt(dataPrimeiroVencimento.split('-')[2] || '5', 10) : new Date().getDate();

    // Se houver contratos ativos assinados, podemos marcá-los como cancelados/inativos ao assinar o novo
    if (status === 'assinado') {
      await Contract.updateMany({ clientId, status: 'assinado' }, { status: 'cancelado' });
    }

    // Se enviar para clicksign estiver ativo, disparar fluxos da Clicksign API
    let clicksignDocKey = '';
    let clicksignSignerKey = '';
    let clicksignUrl = '';
    let clicksignStatus = 'pendente';

    if (enviarClicksign) {
      if (!client.dadosPessoais?.email) {
        return NextResponse.json({ success: false, error: 'O aluno precisa de um e-mail cadastrado para assinar pela Clicksign.' }, { status: 400 });
      }
      if (!client.dadosPessoais?.cpf) {
        return NextResponse.json({ success: false, error: 'O aluno precisa de um CPF cadastrado para assinar pela Clicksign.' }, { status: 400 });
      }

      const fileName = `Contrato_${client.dadosPessoais.nome.replace(/\s+/g, '_')}_V${versao}.html`;
      const base64File = contratoHtmlBase64 || `data:text/html;base64,${Buffer.from(contratoTexto || '').toString('base64')}`;

      try {
        const cSignResult = await createClicksignDocument(
          fileName,
          base64File,
          client.dadosPessoais.email,
          client.dadosPessoais.nome,
          client.dadosPessoais.cpf,
          client.dadosPessoais.nascimento || ''
        );
        clicksignDocKey = cSignResult.docKey;
        clicksignSignerKey = cSignResult.signerKey;
        clicksignUrl = cSignResult.signatureUrl;
        clicksignStatus = 'pendente';
      } catch (err: any) {
        console.error('Clicksign API Error:', err);
        return NextResponse.json({ success: false, error: `Falha na Clicksign: ${err.message}` }, { status: 500 });
      }
    }

    // 4. Criar o Contrato
    const newContract = await Contract.create({
      clicksignDocKey,
      clicksignSignerKey,
      clicksignUrl,
      clicksignStatus,
      clientId,
      planoId,
      planoNome: plan.nome,
      planoTipo: plan.tipo,
      valorBruto,
      descontoTipo: descontoTipo || 'percentual',
      descontoValor: descVal,
      valorLiquido,
      formaPagamento,
      parcelas: numParcelas,
      dataPrimeiroVencimento,
      diaVencimento: diaVenc,
      dataInicio,
      dataFim,
      vigenciaMeses,
      responsavelVenda: responsavelVenda || '',
      unidadeContratada: unidadeContratada || plan.unidadeAtendimento || '',
      observacoesContratuais: observacoesContratuais || '',
      servicosInclusos: plan.servicosPermitidos || [],
      beneficiosInclusos: plan.beneficiosInclusos || [],
      status: status || 'pendente',
      versao,
      assinaturaNome: status === 'assinado' ? (assinaturaNome || client.dadosPessoais.nome) : '',
      assinaturaData: status === 'assinado' ? new Date() : undefined,
      contratoTexto: contratoTexto || '',
      contratoAnexo: contratoAnexo || '',
      usuarioEmissor: usuarioEmissor || ''
    });

    // 5. Se o contrato for emitido como ASSINADO, atualizar o cadastro do cliente
    if (status === 'assinado') {
      client.dadosComerciais = {
        ...client.dadosComerciais,
        planoId: planoId,
        vencimento: dataPrimeiroVencimento || dataFim,
        status: 'ativo',
        parcelas: numParcelas,
        descontoValor: descVal,
        descontoTipo: descontoTipo || 'percentual',
        duracao: isAnual ? 'anual' : 'mensal',
        formaPagamento: formaPagamento,
        dataInicio: dataInicio,
        responsavelVenda: responsavelVenda || '',
        unidadeContratada: unidadeContratada || plan.unidadeAtendimento || '',
        observacoesContratuais: observacoesContratuais || '',
        creditosTotal: plan.creditosTotal || 0,
        creditosUsados: 0,
        creditosReservados: 0,
        creditosMassagemTotal: isAnual ? 1 : 0,
        creditosMassagemUsados: 0,
        creditosMassagemReservados: 0
      };
      await client.save();
    }

    return NextResponse.json({ success: true, data: newContract });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, action, assinaturaNome, dataInicio, duracaoDias, observacoes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do contrato é obrigatório' }, { status: 400 });
    }

    const contract = await Contract.findById(id);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contrato não encontrado' }, { status: 404 });
    }

    const client = await Client.findById(contract.clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente vinculado não encontrado' }, { status: 404 });
    }

    if (action === 'sign') {
      // Cancelar qualquer outro contrato assinado anterior
      await Contract.updateMany(
        { clientId: contract.clientId, _id: { $ne: contract._id }, status: 'assinado' },
        { status: 'cancelado' }
      );

      contract.status = 'assinado';
      contract.assinaturaNome = assinaturaNome || client.dadosPessoais.nome;
      contract.assinaturaData = new Date();
      await contract.save();

      // Atualizar dados do cliente comercialmente
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
        creditosTotal: plan?.creditosTotal || contract.valorBruto > 0 ? 12 : 0, // Fallback se plan inexistente
        creditosUsados: 0,
        creditosReservados: 0,
        creditosMassagemTotal: isAnual ? 1 : 0,
        creditosMassagemUsados: 0,
        creditosMassagemReservados: 0
      };
      await client.save();

      return NextResponse.json({ success: true, data: contract });
    }

    if (action === 'cancel') {
      contract.status = 'cancelado';
      await contract.save();

      // Se o contrato cancelado era o atual do cliente, marcar cliente como inativo
      if (client.dadosComerciais?.planoId?.toString() === contract.planoId.toString()) {
        client.dadosComerciais.status = 'inativo';
        await client.save();
      }

      return NextResponse.json({ success: true, data: contract });
    }

    if (action === 'congelar') {
      if (contract.planoTipo !== 'Anual') {
        return NextResponse.json({ success: false, error: 'Apenas planos Anuais permitem congelamento' }, { status: 400 });
      }
      if (contract.status !== 'assinado') {
        return NextResponse.json({ success: false, error: 'O contrato precisa estar assinado para ser congelado' }, { status: 400 });
      }

      const duracao = Number(duracaoDias) || 30;
      if (duracao > 30 || duracao <= 0) {
        return NextResponse.json({ success: false, error: 'O congelamento deve ser de no máximo 30 dias' }, { status: 400 });
      }

      // Calcular fim do congelamento
      const conD = new Date(dataInicio + 'T00:00:00');
      conD.setDate(conD.getDate() + duracao);
      const dataFim = conD.toISOString().split('T')[0];

      contract.congelamento = {
        dataInicio,
        duracaoDias: duracao,
        dataFim,
        dataSolicitacao: new Date()
      };
      // Opcional: Alterar status do contrato ou manter assinado mas registrar congelamento
      contract.status = 'congelado';
      await contract.save();

      // Atualizar status do cliente para suspenso
      client.dadosComerciais.status = 'suspenso';
      await client.save();

      return NextResponse.json({ success: true, data: contract });
    }

    return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
