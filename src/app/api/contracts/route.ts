import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Contract from '@/models/Contract';
import Payment from '@/models/Payment';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import { createAsaasCustomer, createAsaasPayment, getAsaasPixQrCode } from '@/utils/asaas';
import { generateContractPDFBase64 } from '@/utils/serverPdfGenerator';

import { syncContractStatus } from '@/app/api/clicksign/route';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clientId = searchParams.get('clientId');
    const includeAnexo = searchParams.get('includeAnexo') === 'true';

    let query: any = {};
    if (id) {
      query._id = id;
    } else if (clientId) {
      query.clientId = clientId;
    }

    // Excluir base64 pesados das listagens para economizar tráfego e acelerar resposta
    const selectProjection = (!id && !includeAnexo)
      ? '-contratoAnexo -assinaturaPresencialImage'
      : '';

    let contracts = await Contract.find(query)
      .select(selectProjection)
      .populate('planoId')
      .sort({ versao: -1 });

    const token = process.env.CLICKSIGN_ACCESS_TOKEN;
    const baseUrl = process.env.CLICKSIGN_API_URL || 'https://sandbox.clicksign.com';

    if (token) {
      const pendingClicksign = contracts.filter((c: any) => c.clicksignDocKey && (c.status === 'pendente' || c.clicksignStatus === 'pendente'));
      if (pendingClicksign.length > 0) {
        await Promise.all(pendingClicksign.map(c => syncContractStatus(c, token, baseUrl)));
        contracts = await Contract.find(query)
          .select(selectProjection)
          .populate('planoId')
          .sort({ versao: -1 });
      }
    }

    return NextResponse.json({ success: true, data: contracts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


// ============================================================
// Integração Clicksign API v3 (Envelope) — documentação oficial
// https://developers.clicksign.com
// ============================================================
function formatClicksignPhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  // Se vier com 12 ou 13 dígitos começando com 55 (DDI), remove o 55 para manter os 10 ou 11 dígitos padrão
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.substring(2);
  }
  return digits;
}

export async function createClicksignDocument(
  fileName: string,
  base64File: string,
  signerEmail: string,
  signerName: string,
  signerCpf: string,
  _signerBirthday: string,  // reservado para uso futuro
  signerPhone?: string
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
  // content_base64 deve incluir o prefixo "data:application/pdf;base64,"
  // ──────────────────────────────────────────────────────────
  let finalBase64 = base64File;
  if (!finalBase64.startsWith('data:application/pdf')) {
    const rawContent = base64File.includes(',') ? Buffer.from(base64File.split(',')[1], 'base64').toString('utf-8') : base64File;
    finalBase64 = await generateContractPDFBase64(rawContent);
  }
  const b64Raw = finalBase64.includes(',') ? finalBase64.split(',')[1] : finalBase64;
  const safeName = fileName.replace(/\.[^/.]+$/, '');

  const docRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/documents`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'documents',
        attributes: {
          filename: `${safeName}.pdf`,
          content_base64: `data:application/pdf;base64,${b64Raw}`
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
  const formattedPhone = formatClicksignPhone(signerPhone || '');
  const signerBody: any = {
    data: {
      type: 'signers',
      attributes: {
        name: signerName,
        email: signerEmail,
        ...(formattedPhone ? {
          phone_number: formattedPhone,
          communicate_events: {
            signature_request: 'whatsapp',
            signature_reminder: 'none',
            document_signed: 'whatsapp'
          }
        } : {})
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
  // ──────────────────────────────────────────────────────────
  // PASSO 4a — Requisito de Qualificação do Aluno (Contratante)
  // action: "agree", role: "contractor" (Contratante)
  // ──────────────────────────────────────────────────────────
  const reqQualRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/requirements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'requirements',
        attributes: {
          action: 'agree',
          role: 'contractor'
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
  // PASSO 4b — Requisito de Autenticação do Aluno (WhatsApp)
  // action: "provide_evidence", auth: "whatsapp"
  // ──────────────────────────────────────────────────────────
  const reqAuthRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/requirements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'requirements',
        attributes: {
          action: 'provide_evidence',
          auth: 'whatsapp'
        },
        relationships: {
          document: { data: { type: 'documents', id: documentId } },
          signer: { data: { type: 'signers', id: signerId } }
        }
      }
    })
  });
  await handleError(reqAuthRes, 'Criar Requisito de Autenticação via WhatsApp');

  // ──────────────────────────────────────────────────────────
  // PASSO 4c — Adicionar Signatário da Clínica (Albert Nunes Queiroz dos Santos - E-mail)
  // ──────────────────────────────────────────────────────────
  const adminName = process.env.CLICKSIGN_ADMIN_NAME || 'Albert Nunes Queiroz dos Santos';
  const adminEmail = process.env.CLICKSIGN_ADMIN_EMAIL || 'clubefitnessbh@gmail.com';

  const adminSignerRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/signers`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      data: {
        type: 'signers',
        attributes: {
          name: adminName,
          email: adminEmail,
          communicate_events: {
            signature_request: 'email',
            signature_reminder: 'none',
            document_signed: 'email'
          }
        }
      }
    })
  });

  const adminSignerData = await handleError(adminSignerRes, 'Adicionar Signatário da Clínica');
  const adminSignerId = adminSignerData.data?.id;

  if (adminSignerId) {
    // Qualificação da Clínica (Contratada)
    const clinicQualRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/requirements`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          type: 'requirements',
          attributes: {
            action: 'agree',
            role: 'contractee'
          },
          relationships: {
            document: { data: { type: 'documents', id: documentId } },
            signer: { data: { type: 'signers', id: adminSignerId } }
          }
        }
      })
    });
    await handleError(clinicQualRes, 'Criar Requisito de Qualificação da Clínica');

    // Autenticação da Clínica via E-mail
    const clinicAuthRes = await fetch(`${baseUrl}/api/v3/envelopes/${envelopeId}/requirements`, {
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
            signer: { data: { type: 'signers', id: adminSignerId } }
          }
        }
      })
    });
    await handleError(clinicAuthRes, 'Criar Requisito de Autenticação da Clínica');
  }

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

  return { docKey: `${envelopeId}:${documentId}`, signerKey: signerId, signatureUrl };
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
      enviarAsaas,
      contratoHtmlBase64,
      contratoPdfBase64,
      frequencia,
      creditosTotal,
      assinaturaPresencialImage,
      trilhaAuditoria
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

    const numParcelas = Number(parcelas) || 1;

    // 2. Definir Vigência (Anual = 12 meses, ou especificada em vigenciaMeses)
    const isAnual = body.planoTipo === 'Anual' || 
                    plan.tipo === 'Anual' || 
                    (plan.nome || '').toLowerCase().includes('anual') || 
                    Number(body.vigenciaMeses) >= 12;
    const planVigencia = isAnual ? 12 : (Number(body.vigenciaMeses) || numParcelas || 1);
    const vigenciaMeses = Math.max(planVigencia, numParcelas);

    // Calcular data de fim de vigência
    let dataFim = manualDataFim;
    if (!dataFim) {
      const startD = new Date(dataInicio + 'T00:00:00');
      startD.setMonth(startD.getMonth() + vigenciaMeses);
      dataFim = startD.toISOString().split('T')[0];
    }

    // 3. Cálculos de Descontos e Valores - Prioriza valor informado/negociado na tela
    const valorBruto = Number(body.valorBruto) || Number(body.valorUnitario) || Number(client.dadosComerciais?.valorUnitario) || Number(plan.preco) || 0;
    const descVal = Number(descontoValor) || 0;
    let valorLiquido = body.valorLiquido !== undefined && body.valorLiquido !== null && Number(body.valorLiquido) > 0
      ? Number(body.valorLiquido)
      : valorBruto;

    if (!body.valorLiquido && descVal > 0) {
      if (descontoTipo === 'percentual') {
        valorLiquido = valorBruto * (1 - descVal / 100);
      } else {
        valorLiquido = Math.max(0, valorBruto - descVal);
      }
    }

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
      if (!client.dadosPessoais?.telefone) {
        return NextResponse.json({ success: false, error: 'O aluno precisa de um número de celular/WhatsApp cadastrado para assinar pela Clicksign.' }, { status: 400 });
      }

      const cleanPhone = (client.dadosPessoais.telefone || '').replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        return NextResponse.json({ success: false, error: 'O número de celular/WhatsApp do aluno deve conter DDD e pelo menos 10 ou 11 dígitos válidos.' }, { status: 400 });
      }

      const fileName = `Contrato_${client.dadosPessoais.nome.replace(/\s+/g, '_')}_V${versao}.pdf`;
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
          client.dadosPessoais.nascimento || '',
          client.dadosPessoais.telefone
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

    // Asaas integration
    let asaasPaymentId = '';
    let asaasInvoiceUrl = '';
    let asaasBoletoPdf = '';
    let asaasPixCopyPaste = '';
    let asaasPixQrCode = '';
    let asaasBillingStatus = 'pendente';

    if (enviarAsaas) {
      try {
        let asaasCustomerId = client.dadosComerciais?.asaasCustomerId;
        if (!asaasCustomerId) {
          console.log('Criando cliente no Asaas...');
          asaasCustomerId = await createAsaasCustomer(client);
          client.dadosComerciais.asaasCustomerId = asaasCustomerId;
          await client.save();
        }

        console.log('Gerando cobrança no Asaas...');
        const paymentResult = await createAsaasPayment({
          customerId: asaasCustomerId,
          formaPagamento,
          value: valorLiquido,
          dueDate: dataPrimeiroVencimento || dataInicio,
          description: `Contrato de Plano: ${plan.nome}`,
          parcelas: numParcelas
        });

        asaasPaymentId = paymentResult.paymentId;
        asaasInvoiceUrl = paymentResult.invoiceUrl;
        asaasBoletoPdf = paymentResult.bankSlipUrl;
        asaasBillingStatus = paymentResult.billingStatus;

        if (formaPagamento === 'pix') {
          const pixDetails = await getAsaasPixQrCode(asaasPaymentId);
          if (pixDetails) {
            asaasPixQrCode = pixDetails.encodedImage;
            asaasPixCopyPaste = pixDetails.payload;
          }
        }
      } catch (err: any) {
        console.error('Asaas API Error:', err);
        return NextResponse.json({ success: false, error: `Falha no Asaas: ${err.message}` }, { status: 500 });
      }
    }

    // 4. Criar o Contrato
    const calcCreditos = creditosTotal !== undefined ? Number(creditosTotal) : (typeof frequencia === 'number' ? (frequencia * 4 + 1) : (plan.creditosTotal || 0));
    const newContract = await Contract.create({
      clicksignDocKey,
      clicksignSignerKey,
      clicksignUrl,
      clicksignStatus,
      assinaturaPresencialImage: assinaturaPresencialImage || '',
      trilhaAuditoria: trilhaAuditoria || null,
      asaasPaymentId,
      asaasInvoiceUrl,
      asaasBoletoPdf,
      asaasPixCopyPaste,
      asaasPixQrCode,
      asaasBillingStatus,
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
      frequencia: frequencia !== undefined ? Number(frequencia) : 3,
      creditosTotal: calcCreditos,
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

    // Generate payments/installments list
    const addMonths = (dateStr: string, months: number): string => {
      const d = new Date(dateStr + 'T12:00:00');
      d.setMonth(d.getMonth() + months);
      return d.toISOString().split('T')[0];
    };

    const paymentRecords = [];
    const installmentValue = Number((valorLiquido / numParcelas).toFixed(2));
    for (let i = 0; i < numParcelas; i++) {
      const dueDate = i === 0 ? dataPrimeiroVencimento : addMonths(dataPrimeiroVencimento, i);
      paymentRecords.push({
        clientId: client._id,
        clientNome: client.dadosPessoais?.nome || 'Sem Nome',
        contractId: newContract._id,
        planoNome: plan.nome,
        valor: installmentValue,
        vencimento: dueDate,
        status: (installmentValue === 0 || (status === 'assinado' && i === 0 && formaPagamento !== 'asaas')) ? 'Pago' : 'Pendente',
        dataPagamento: (installmentValue === 0 || (status === 'assinado' && i === 0 && formaPagamento !== 'asaas')) ? new Date().toISOString().split('T')[0] : '',
        formaPagamento: formaPagamento === 'asaas' ? 'Asaas' : 
                        (formaPagamento === 'pix' ? 'Pix Manual' : 
                         (formaPagamento === 'cartao' ? 'Cartão Manual' : 'Dinheiro')),
        asaasPaymentId: formaPagamento === 'asaas' ? asaasPaymentId : '',
        asaasInvoiceUrl: formaPagamento === 'asaas' ? asaasInvoiceUrl : '',
        parcelaNumero: i + 1,
      });
    }
    // Parcelas no financeiro são lançadas exclusivamente pelo botão "Lançar Parcelas no Financeiro"
    // await Payment.insertMany(paymentRecords);

    // 5. Arquivar contrato anterior no historicoContratos se existente (Anti-Sobrescrita)
    if (client.dadosComerciais && (client.dadosComerciais.planoId || client.dadosComerciais.valorUnitario || client.dadosComerciais.dataInicio)) {
      const { buildContractSnapshot } = await import('@/utils/contractLifecycle');
      const prevSnapshot = buildContractSnapshot(
        client.dadosComerciais, 
        client.dadosComerciais.status === 'ativo' ? 'renovado' : 'concluido', 
        `Substituído por novo contrato V${versao} (${plan.nome})`
      );
      if (prevSnapshot) {
        if (!Array.isArray(client.historicoContratos)) client.historicoContratos = [];
        const alreadyArchived = client.historicoContratos.some((h: any) => h.dataInicio === prevSnapshot.dataInicio && String(h.planoId) === String(prevSnapshot.planoId));
        if (!alreadyArchived) {
          client.historicoContratos.push(prevSnapshot);
        }
      }
    }

    // 6. Atualizar o perfil comercial do cliente com os dados do contrato emitido
    const targetClientStatus = status === 'assinado' ? 'ativo' : 'pendente';

    Object.assign(client.dadosComerciais, {
      planoId: planoId,
      vencimento: dataFim,
      status: targetClientStatus,
      parcelas: numParcelas,
      descontoValor: descVal,
      descontoTipo: descontoTipo || 'percentual',
      duracao: isAnual ? 'anual' : 'mensal',
      duracaoQtd: isAnual ? 1 : (Number(vigenciaMeses) || 1),
      vigenciaQtd: isAnual ? 1 : (Number(vigenciaMeses) || 1),
      formaPagamento: formaPagamento,
      dataInicio: dataInicio,
      responsavelVenda: responsavelVenda || '',
      observacoesContratuais: observacoesContratuais || '',
      frequencia: frequencia !== undefined ? Number(frequencia) : client.dadosComerciais.frequencia,
      creditosTotal: calcCreditos,
      creditosUsados: 0,
      creditosReservados: 0,
      creditosMassagemTotal: isAnual ? 1 : 0,
      creditosMassagemUsados: 0,
      creditosMassagemReservados: 0,
      contratoAnexo: contratoAnexo || contratoPdfBase64 || client.dadosComerciais?.contratoAnexo || '',
      contratoPdfBase64: contratoPdfBase64 || contratoAnexo || client.dadosComerciais?.contratoPdfBase64 || ''
    });
    if (contratoAnexo || contratoPdfBase64) {
      client.contratoAnexo = contratoAnexo || contratoPdfBase64;
    }

    if (!client.bloqueioCadastral?.bloqueado) {
      client.bloqueioCadastral = {
        bloqueado: true,
        motivo: client.bloqueioCadastral?.dadosInformadosPeloCliente
          ? 'Informação fornecida pelo contratante'
          : 'Dado consolidado em contrato',
        dadosInformadosPeloCliente: Boolean(client.bloqueioCadastral?.dadosInformadosPeloCliente),
        origemCadastro: client.bloqueioCadastral?.origemCadastro || 'admin_painel',
        historicoDesbloqueios: client.bloqueioCadastral?.historicoDesbloqueios || []
      };
    }

    await client.save();

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
      contract.clicksignStatus = 'assinado';
      contract.assinaturaNome = assinaturaNome || client.dadosPessoais.nome;
      contract.assinaturaData = new Date();
      await contract.save();

      if (contract.formaPagamento !== 'asaas') {
        await Payment.updateOne(
          { contractId: contract._id, parcelaNumero: 1 },
          { status: 'Pago', dataPagamento: new Date().toISOString().split('T')[0] }
        );
      }

      // Atualizar dados do cliente comercialmente
      const plan = await Plan.findById(contract.planoId);
      const isAnual = contract.planoTipo === 'Anual' || contract.vigenciaMeses >= 12;

      Object.assign(client.dadosComerciais, {
        planoId: contract.planoId,
        vencimento: contract.dataFim,
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
      await client.save();

      // Se formaPagamento for BOLETO e não possuir cobrança Asaas, gerar no Asaas
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
            await contract.save();
          }
        } catch (asaasErr: any) {
          console.warn('Erro ao criar cobrança Asaas na assinatura do contrato:', asaasErr.message);
        }
      }

      return NextResponse.json({ success: true, data: contract });
    }

    if (action === 'cancel') {
      contract.status = 'cancelado';
      await contract.save();

      await Payment.updateMany(
        { contractId: contract._id, status: 'Pendente' },
        { status: 'Cancelado' }
      );

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
