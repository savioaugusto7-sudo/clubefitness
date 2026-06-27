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


// ============================================================
// Integração Clicksign API v3 (Envelope) — documentação oficial
// https://developers.clicksign.com
// ============================================================
async function createClicksignDocument(
  fileName: string,
  base64File: string,
  signerEmail: string,
  signerName: string,
  signerCpf: string,
  _signerBirthday: string  // reservado para uso futuro
) {
  const token = process.env.CLICKSIGN_ACCESS_TOKEN;
  const baseUrl = (process.env.CLICKSIGN_API_URL || 'https://sandbox.clicksign.com').replace(/\/$/, '');

  if (!token) {
    throw new Error('CLICKSIGN_ACCESS_TOKEN não configurado nas variáveis de ambiente.');
  }

  const headers = {
    'Content-Type': 'application/vnd.api+json',
    'Accept': 'application/vnd.api+json',
    'Authorization': token
  };

  // Helper: lança erro legível com detalhes da API
  const handleError = async (res: Response, label: string) => {
    if (!res.ok) {
      let errData: any = {};
      try { errData = await res.json(); } catch {}
      const detail =
        (Array.isArray(errData?.errors) && errData.errors[0]?.detail) ||
        errData?.error ||
        errData?.message ||
        `HTTP ${res.status}`;
      throw new Error(`Clicksign – ${label}: ${detail}`);
    }
    return res.json();
  };

  // ──────────────────────────────────────────────────────────
  // PASSO 1 — Criar Envelope (status draft)
  // POST /api/v3/envelopes
  // ──────────────────────────────────────────────────────────
  const envelopeRes = await fetch(`${baseUrl}/api/v3/envelopes`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'envelopes',
        attributes: {
          name: fileName.replace(/\.[^/.]+$/, ''),
          locale: 'pt-BR',
          auto_close: true
        }
      }
    })
  });
  const envelopeData = await handleError(envelopeRes, 'Criar Envelope');
  const envelopeId: string = envelopeData.data?.id;
  if (!envelopeId) throw new Error('Clicksign não retornou o ID do Envelope.');

  // ──────────────────────────────────────────────────────────
  // PASSO 2 — Adicionar Documento ao Envelope
  // POST /api/v3/envelopes/:envelope_id/documents
  // content_base64 deve incluir o prefixo "data:...;base64,"
  // ──────────────────────────────────────────────────────────
  const b64Raw = base64File.includes(',') ? base64File.split(',')[1] : base64File;
  const mimeType = base64File.startsWith('data:text/html') ? 'text/html' : 'application/pdf';
  const ext = mimeType === 'text/html' ? 'html' : 'pdf';
  const safeName = fileName.replace(/\.[^/.]+$/, '');

  const docRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'documents',
        attributes: {
          filename: `${safeName}.${ext}`,
          content_base64: `data:${mimeType};base64,${b64Raw}`
        }
      }
    })
  });
  const docData = await handleError(docRes, 'Adicionar Documento');
  const documentId: string = docData.data?.id;
  if (!documentId) throw new Error('Clicksign não retornou o ID do Documento.');

  // ──────────────────────────────────────────────────────────
  // PASSO 3 — Adicionar Signatário ao Envelope
  // POST /api/v3/envelopes/:envelope_id/signers
  // ──────────────────────────────────────────────────────────
  let formattedCpf = '';
  const digits = signerCpf.replace(/\D/g, '');
  if (digits.length === 11) {
    formattedCpf = `${digits.substring(0, 3)}.${digits.substring(3, 6)}.${digits.substring(6, 9)}-${digits.substring(9, 11)}`;
  } else {
    formattedCpf = signerCpf;
  }
  const signerBody: any = {
    data: {
      type: 'signers',
      attributes: {
        name: signerName,
        email: signerEmail
      }
    }
  };
  if (formattedCpf) signerBody.data.attributes.documentation = formattedCpf;

  const signerRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/signers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(signerBody)
  });
  const signerData = await handleError(signerRes, 'Adicionar Signatário');
  const signerId: string = signerData.data?.id;
  if (!signerId) throw new Error('Clicksign não retornou o ID do Signatário.');

  // ──────────────────────────────────────────────────────────
  // PASSO 4a — Requisito de Qualificação (obrigatório)
  // action: "agree", role: "sign"
  // POST /api/v3/envelopes/:envelope_id/requirements
  // Usa relationships para vincular signer e document
  // ──────────────────────────────────────────────────────────
  const reqQualRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/requirements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'requirements',
        attributes: {
          action: 'agree',
          role: 'sign'
        },
        relationships: {
          document: { data: { type: 'documents', id: documentId } },
          signer: { data: { type: 'signers', id: signerId } }
        }
      }
    })
  });
  await handleError(reqQualRes, 'Criar Requisito de Qualificação');

  // ──────────────────────────────────────────────────────────
  // PASSO 4b — Requisito de Autenticação (obrigatório)
  // action: "provide_evidence", auth: "email"
  // POST /api/v3/envelopes/:envelope_id/requirements
  // ──────────────────────────────────────────────────────────
  const reqAuthRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/requirements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'requirements',
        attributes: {
          action: 'provide_evidence',
          auth: 'email'
        },
        relationships: {
          document: { data: { type: 'documents', id: documentId } },
          signer: { data: { type: 'signers', id: signerId } }
        }
      }
    })
  });
  await handleError(reqAuthRes, 'Criar Requisito de Autenticação');

  // ──────────────────────────────────────────────────────────
  // PASSO 4c — Adicionar Signatário da Clínica (Contratado)
  // ──────────────────────────────────────────────────────────
  const clinicEmail = process.env.CLICKSIGN_CLINIC_EMAIL || 'clubefitnessbh@gmail.com';
  const clinicName = process.env.CLICKSIGN_CLINIC_NAME || 'Albert Nunes Queiroz dos Santos LTDA';
  const clinicCnpj = '52.883.492/0001-04';

  const clinicSignerBody: any = {
    data: {
      type: 'signers',
      attributes: {
        name: clinicName,
        email: clinicEmail,
        documentation: clinicCnpj
      }
    }
  };

  const clinicSignerRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/signers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(clinicSignerBody)
  });
  const clinicSignerData = await handleError(clinicSignerRes, 'Adicionar Signatário da Clínica');
  const clinicSignerId: string = clinicSignerData.data?.id;
  if (!clinicSignerId) throw new Error('Clicksign não retornou o ID do Signatário da Clínica.');

  // ──────────────────────────────────────────────────────────
  // PASSO 4d — Requisitos do Signatário da Clínica
  // ──────────────────────────────────────────────────────────
  const clinicReqQualRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/requirements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'requirements',
        attributes: {
          action: 'agree',
          role: 'sign'
        },
        relationships: {
          document: { data: { type: 'documents', id: documentId } },
          signer: { data: { type: 'signers', id: clinicSignerId } }
        }
      }
    })
  });
  await handleError(clinicReqQualRes, 'Criar Requisito de Qualificação da Clínica');

  const clinicReqAuthRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/requirements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'requirements',
        attributes: {
          action: 'provide_evidence',
          auth: 'email'
        },
        relationships: {
          document: { data: { type: 'documents', id: documentId } },
          signer: { data: { type: 'signers', id: clinicSignerId } }
        }
      }
    })
  });
  await handleError(clinicReqAuthRes, 'Criar Requisito de Autenticação da Clínica');

  // ──────────────────────────────────────────────────────────
  // PASSO 5 — Ativar Envelope (draft → running)
  // PATCH /api/v3/envelopes/:envelope_id
  // ──────────────────────────────────────────────────────────
  const activateRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      data: {
        id: envelopeId,
        type: 'envelopes',
        attributes: { status: 'running' }
      }
    })
  });
  await handleError(activateRes, 'Ativar Envelope');

  // ──────────────────────────────────────────────────────────
  // PASSO 6 — Notificar Signatários
  // POST /api/v3/envelopes/:envelope_id/notifications
  // ──────────────────────────────────────────────────────────
  await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/notifications`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'notifications',
        attributes: {}
      }
    })
  });
  // Nota: ignoramos erro de notificação propositalmente — o envelope já está ativo

  // A URL de assinatura pode vir no objeto do signatário ou ser construída manualmente
  const signatureUrl =
    signerData.data?.attributes?.link ||
    signerData.data?.attributes?.signature_url ||
    `${baseUrl}/sign/${signerId}` ||
    '';

  return { docKey: envelopeId, signerKey: signerId, signatureUrl };
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
      contratoHtmlBase64,
      contratoPdfBase64
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

      const fileName = `Contrato_${client.dadosPessoais.nome.replace(/\s+/g, '_')}_V${versao}.pdf`;
      const base64File = contratoPdfBase64 || contratoHtmlBase64 || `data:text/html;base64,${Buffer.from(contratoTexto || '').toString('base64')}`;

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
      Object.assign(client.dadosComerciais, {
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
      });
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
        creditosTotal: plan?.creditosTotal || (contract.valorBruto > 0 ? 12 : 0), // Fallback se plan inexistente
        creditosUsados: 0,
        creditosReservados: 0,
        creditosMassagemTotal: isAnual ? 1 : 0,
        creditosMassagemUsados: 0,
        creditosMassagemReservados: 0
      });
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
