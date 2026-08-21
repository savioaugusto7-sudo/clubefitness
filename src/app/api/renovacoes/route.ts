import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import RenewalProposal from '@/models/RenewalProposal';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import Contract from '@/models/Contract';
import { createClicksignDocument } from '@/app/api/contracts/route';
import { generateContractTemplate } from '@/utils/contractTemplate';
import { generateContractPDFBase64 } from '@/utils/serverPdfGenerator';

export const maxDuration = 30;

// Helper para calcular data + N meses
function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID da renovação não fornecido.' }, { status: 400 });
    }

    const _client = Client;
    const _plan = Plan;

    const renewal = await RenewalProposal.findById(id)
      .populate('clientId')
      .populate('planoId');

    if (!renewal) {
      return NextResponse.json({ success: false, error: 'Link de renovação não encontrado ou expirado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: renewal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { clientId, customValorUnitario } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'ID do aluno é obrigatório.' }, { status: 400 });
    }

    // Buscar dados do aluno e último contrato em paralelo para resposta instantânea
    const [client, lastContract, fallbackPlan] = await Promise.all([
      Client.findById(clientId).populate('dadosComerciais.planoId').lean(),
      Contract.findOne({ clientId }).select('dataFim valorLiquido valorBruto vigenciaMeses frequencia planoTipo').sort({ createdAt: -1 }).lean(),
      Plan.findOne({ ativo: true }).lean()
    ]);

    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado.' }, { status: 404 });
    }

    const com = client.dadosComerciais || {};
    const plan = com.planoId || fallbackPlan;
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Nenhum plano comercial configurado.' }, { status: 400 });
    }

    // Determinar data fim do contrato anterior
    const todayStr = new Date().toISOString().split('T')[0];
    const dataFimAnterior = com.vencimento || lastContract?.dataFim || todayStr;
    const isExpired = dataFimAnterior < todayStr;

    // Regra acordada: Data de Início = Data Fim do contrato atual ou último contrato
    const dataInicioRenovacao = dataFimAnterior;

    // Renovação sempre oferece o PLANO ANUAL (12 meses)
    const vigenciaMeses = 12;
    const dataFimCalculada = addMonths(dataInicioRenovacao, vigenciaMeses);

    // Determinar valor unitario base
    let valorUnitario = Number(customValorUnitario);
    if (!valorUnitario) {
      valorUnitario = Number(com.valorUnitario) || Number(com.valorAcordado) || Number(lastContract?.valorLiquido) || Number(plan?.preco) || 0;
    }

    // Identificar com segurança se o contrato anterior é ANUAL ou MENSAL:
    let isAnual = false;
    const durLower = String(com.duracao || '').toLowerCase();
    
    if (durLower.includes('anual') || durLower.includes('ano') || durLower.includes('12')) {
      isAnual = true;
    } else if (Number(com.vigenciaQtd) >= 12 || Number(com.recorrenciaMeses) >= 12) {
      isAnual = true;
    } else if (lastContract && (lastContract.planoTipo === 'Anual' || lastContract.vigenciaMeses >= 12)) {
      isAnual = true;
    } else if (com.dataInicio && com.vencimento) {
      const dStart = new Date(com.dataInicio + 'T12:00:00').getTime();
      const dEnd = new Date(com.vencimento + 'T12:00:00').getTime();
      const diffDays = Math.abs(dEnd - dStart) / (1000 * 60 * 60 * 24);
      if (diffDays > 60) {
        isAnual = true;
      }
    }

    // Cálculo do valor total anual da renovação:
    // - Se for anual: o valorUnitario já é o total anual do plano -> apenas aplica +5%
    // - Se for estritamente mensal: valorUnitario é 1 mês -> multiplica por 12 e aplica +5%
    let valorTotalAnual = 0;
    if (isAnual) {
      valorTotalAnual = valorUnitario * 1.05;
    } else {
      valorTotalAnual = (valorUnitario * 12) * 1.05;
    }

    valorTotalAnual = Math.round(valorTotalAnual * 100) / 100;

    const frequencia = Number(com.frequencia) || lastContract?.frequencia || 3;
    const creditosMensais = frequencia * 4 + 1;

    const renewal = await RenewalProposal.create({
      clientId: client._id,
      planoId: plan._id,
      planoNome: plan.nome || 'Clube Fitness - Monitorado',
      planoTipo: 'Anual',
      valorAnterior: valorUnitario,
      reajustePercentual: 5,
      valorReajustado: valorTotalAnual, // Armazena o valor total anual base do plano
      frequencia,
      creditosMensais,
      dataFimAnterior,
      dataInicioRenovacao,
      dataFimCalculada,
      vigenciaMeses: 12,
      isExpired,
      status: 'pendente'
    });

    return NextResponse.json({
      success: true,
      data: renewal,
      url: `/renovacao/${renewal._id}`
    });
  } catch (error: any) {
    console.error('Erro ao gerar link de renovação:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, dataPrimeiroVencimento, formaPagamento, parcelas, dadosPreenchidos } = body;

    if (!id || !dataPrimeiroVencimento || !formaPagamento) {
      return NextResponse.json({ success: false, error: 'Dados obrigatórios ausentes (id, dataPrimeiroVencimento, formaPagamento).' }, { status: 400 });
    }

    const renewal = await RenewalProposal.findById(id).populate('clientId planoId');
    if (!renewal) {
      return NextResponse.json({ success: false, error: 'Renovação não encontrada.' }, { status: 404 });
    }

    if (renewal.status === 'aceita') {
      return NextResponse.json({ success: false, error: 'Esta renovação já foi concluída anteriormente.' }, { status: 400 });
    }

    const client = await Client.findById(renewal.clientId._id);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado.' }, { status: 404 });
    }

    // 1. Atualizar dados cadastrais se informados
    if (dadosPreenchidos) {
      client.dadosPessoais = {
        ...client.dadosPessoais,
        ...dadosPreenchidos
      };
    }

    // 2. Calcular valor final conforme forma de pagamento:
    // Cartão: +5% sobre o valor total anual, max 12x
    // Boleto: valor anual base, max 10x
    // PIX: valor anual base, max 1x
    let valorFinalTotal = renewal.valorReajustado;
    let maxParc = 1;

    if (formaPagamento === 'cartao') {
      valorFinalTotal = Math.round(renewal.valorReajustado * 1.05 * 100) / 100;
      maxParc = 12;
    } else if (formaPagamento === 'boleto') {
      valorFinalTotal = renewal.valorReajustado;
      maxParc = 10;
    } else {
      valorFinalTotal = renewal.valorReajustado;
      maxParc = 1;
    }

    const numParcelas = Math.min(Math.max(1, Number(parcelas) || 1), maxParc);
    const valorParcela = Math.round((valorFinalTotal / numParcelas) * 100) / 100;

    // 3. Atualizar dados comerciais com o novo ciclo anual
    const diaVenc = Number(dataPrimeiroVencimento.split('-')[2]) || 10;
    
    if (!client.dadosComerciais) {
      client.dadosComerciais = {};
    }

    client.dadosComerciais.status = 'ativo';
    client.dadosComerciais.planoId = renewal.planoId._id;
    client.dadosComerciais.duracao = 'anual';
    client.dadosComerciais.duracaoQtd = 1;
    client.dadosComerciais.vigenciaQtd = 1;
    client.dadosComerciais.valorUnitario = valorFinalTotal;
    client.dadosComerciais.valorAcordado = valorFinalTotal;
    client.dadosComerciais.dataInicio = renewal.dataInicioRenovacao;
    client.dadosComerciais.vencimento = renewal.dataFimCalculada;
    client.dadosComerciais.frequencia = renewal.frequencia;
    client.dadosComerciais.creditosTotal = renewal.creditosMensais;
    client.dadosComerciais.recorrenciaVigencia = true;
    client.dadosComerciais.diaVencimento = diaVenc;
    client.dadosComerciais.formaPagamento = formaPagamento;
    client.dadosComerciais.parcelas = numParcelas;

    await client.save();

    // 4. Gerar template do contrato
    const pes = client.dadosPessoais || {};
    const contractHtml = generateContractTemplate({
      clientNome: pes.nome || 'Aluno',
      clientCpf: pes.cpf || '—',
      clientEmail: pes.email || '',
      clientTelefone: pes.telefone || '',
      clientEndereco: pes.endereco || '',
      clientNumero: pes.numero || '',
      clientComplemento: pes.complemento || '',
      clientBairro: pes.bairro || '',
      clientCidade: pes.cidade || 'Belo Horizonte',
      clientEstado: pes.estado || 'MG',
      clientCep: pes.cep || '',
      planNome: renewal.planoNome,
      planTipo: 'Anual',
      planPreco: valorFinalTotal,
      creditosMensais: renewal.creditosMensais,
      dataInicio: renewal.dataInicioRenovacao,
      dataVencimento: dataPrimeiroVencimento,
      formaPagamento,
      parcelas: numParcelas,
      vigenciaQtd: 12,
      recorrenciaMeses: 12,
      criarRecorrenciaMensal: true,
      unidadeContratada: 'Clube Fitness'
    });

    // 5. Integração com Clicksign (criação do envelope oficial de assinatura)
    let clicksignDocKey = '';
    let clicksignSignerKey = '';
    let clicksignUrl = '';
    let clicksignStatus = 'pendente';

    try {
      const fileName = `Contrato_Renovacao_${(pes.nome || 'Aluno').replace(/\s+/g, '_')}.pdf`;
      const base64File = await generateContractPDFBase64(contractHtml);

      const cSignResult = await createClicksignDocument(
        fileName,
        base64File,
        pes.email || 'atendimento@clubefitness.com.br',
        pes.nome || 'Aluno',
        pes.cpf || '',
        pes.dataNascimento || '',
        pes.telefone || ''
      );

      if (cSignResult && cSignResult.docKey) {
        clicksignDocKey = cSignResult.docKey;
        clicksignSignerKey = cSignResult.signerKey;
        clicksignUrl = cSignResult.signatureUrl || '';
        clicksignStatus = 'enviado';
      }
    } catch (csErr: any) {
      console.warn('Aviso: Clicksign não pôde ser gerado automaticamente:', csErr.message);
    }

    // 6. Criar registro oficial de Contrato
    const newContract = await Contract.create({
      clientId: client._id,
      planoId: renewal.planoId._id,
      planoNome: renewal.planoNome,
      planoTipo: 'Anual',
      valorBruto: valorFinalTotal,
      descontoTipo: 'fixo',
      descontoValor: 0,
      valorLiquido: valorParcela,
      formaPagamento,
      parcelas: numParcelas,
      dataPrimeiroVencimento,
      diaVencimento: diaVenc,
      dataInicio: renewal.dataInicioRenovacao,
      dataFim: renewal.dataFimCalculada,
      vigenciaMeses: 12,
      responsavelVenda: 'Auto-Renovação Online (Clicksign)',
      unidadeContratada: 'Clube Fitness',
      frequencia: renewal.frequencia,
      creditosTotal: renewal.creditosMensais,
      status: 'pendente', // pendente de assinatura Clicksign
      clicksignDocKey,
      clicksignSignerKey,
      clicksignUrl,
      clicksignStatus,
      contratoTexto: contractHtml,
      observacoesContratuais: `Renovação de contrato anual (12 meses). Início contínuo em ${renewal.dataInicioRenovacao}. Condição: ${numParcelas}x de R$ ${valorParcela.toFixed(2)} via ${formaPagamento.toUpperCase()}.`
    });

    // 7. Atualizar a proposta de renovação
    renewal.status = 'aceita';
    renewal.dataPrimeiroVencimento = dataPrimeiroVencimento;
    renewal.formaPagamento = formaPagamento;
    renewal.parcelas = numParcelas;
    renewal.clicksignDocKey = clicksignDocKey;
    renewal.clicksignUrl = clicksignUrl;
    renewal.clicksignStatus = clicksignStatus;
    renewal.dadosAceite = {
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      dataHora: new Date(),
      userAgent: request.headers.get('user-agent') || '',
      nomeAssinante: pes.nome || ''
    };

    await renewal.save();

    return NextResponse.json({
      success: true,
      message: 'Renovação enviada para o Clicksign com sucesso!',
      contractId: newContract._id,
      clicksignUrl
    });
  } catch (error: any) {
    console.error('Erro ao efetivar renovação:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
