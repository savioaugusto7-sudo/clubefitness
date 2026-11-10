import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import RenewalProposal from '@/models/RenewalProposal';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import Contract from '@/models/Contract';
import { createClicksignDocument } from '@/app/api/contracts/route';
import { generateContractTemplate } from '@/utils/contractTemplate';
import { generateContractPDFBase64 } from '@/utils/serverPdfGenerator';
import { syncClientFixedSchedulesValidity } from '@/utils/fixedScheduleSync';

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

    // Registrar visualização / abertura do link em tempo real
    const now = new Date();
    renewal.primeiraAberturaEm = renewal.primeiraAberturaEm || renewal.abertoEm || now;
    renewal.abertoEm = now; // Sempre grava a ÚLTIMA visualização
    renewal.visualizado = true;
    renewal.visualizacoesCount = (renewal.visualizacoesCount || 0) + 1;
    await renewal.save();

    return NextResponse.json({ success: true, data: renewal });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      clientId,
      planoId,
      planoNome,
      frequencia,
      creditosMensais,
      valorAnterior,
      reajusteTipo = 'padrao_5',
      reajustePercentual = 5,
      valorReajustado,
      duracaoTipo = 'anual',
      vigenciaMeses = 12,
      dataFimAnterior,
      dataInicioRenovacao,
      dataFimCalculada,
      formaPagamento = '',
      formaPagamentoFixada = '',
      permitir12xBoleto = false
    } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'ID do aluno é obrigatório.' }, { status: 400 });
    }

    // Modo Estrito (Zero Fallbacks): Todos os parâmetros comerciais devem ser explícitos
    if (!planoId || valorReajustado === undefined || valorReajustado === null || !frequencia || !dataInicioRenovacao || !vigenciaMeses || !dataFimCalculada) {
      return NextResponse.json({
        success: false,
        error: 'Modo Estrito: Todos os parâmetros da proposta de renovação (planoId, frequencia, valorReajustado, vigenciaMeses, dataInicioRenovacao, dataFimCalculada) devem ser informados explicitamente pelo configurador.'
      }, { status: 400 });
    }

    const [client, plan] = await Promise.all([
      Client.findById(clientId).lean(),
      Plan.findById(planoId).lean()
    ]);

    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado.' }, { status: 404 });
    }
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plano comercial não encontrado.' }, { status: 404 });
    }

    const vMeses = Number(vigenciaMeses) || 12;
    const freq = Number(frequencia) || 3;
    const creds = Number(creditosMensais) > 0 ? Number(creditosMensais) : (freq * 4 + 1);
    const finalValor = Number(valorReajustado);
    const baseValor = valorAnterior !== undefined ? Number(valorAnterior) : finalValor;

    const todayStr = new Date().toISOString().split('T')[0];
    const prevEnd = dataFimAnterior || client.dadosComerciais?.vencimento || dataInicioRenovacao;
    const isExpired = prevEnd < todayStr;

    const planoTipoCalculado = vMeses >= 12 ? 'Anual' : (vMeses === 1 ? 'Mensal' : `${vMeses} Meses`);

    const renewal = await RenewalProposal.create({
      clientId: client._id,
      planoId: plan._id,
      planoNome: planoNome || plan.nome || 'Clube Fitness - Personalizado',
      planoTipo: planoTipoCalculado,
      valorAnterior: baseValor,
      reajusteTipo,
      reajustePercentual: Number(reajustePercentual) || 0,
      valorReajustado: finalValor,
      frequencia: freq,
      creditosMensais: creds,
      dataFimAnterior: prevEnd,
      dataInicioRenovacao,
      dataFimCalculada,
      vigenciaMeses: vMeses,
      duracaoTipo: duracaoTipo || (vMeses >= 12 ? 'anual' : 'mensal'),
      formaPagamento: formaPagamento || '',
      formaPagamentoFixada: formaPagamentoFixada || '',
      permitir12xBoleto: Boolean(permitir12xBoleto),
      maxParcelasBoleto: permitir12xBoleto ? 12 : 10,
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
    // Boleto: valor anual base, max 10x (ou 12x para links especiais/configurados)
    // PIX: valor anual base, max 1x
    let valorFinalTotal = renewal.valorReajustado;
    let maxParc = 1;

    const is12xBoletoAllowed = Boolean(
      renewal.permitir12xBoleto ||
      renewal.maxParcelasBoleto === 12 ||
      renewal._id?.toString() === '6adf7ba94815c0ab1b676a1c' ||
      id === '6adf7ba94815c0ab1b676a1c'
    );

    const isDueDateLocked = Boolean(
      renewal.vencimentoFixo ||
      renewal._id?.toString() === '6adf7ba94815c0ab1b676a1c' ||
      id === '6adf7ba94815c0ab1b676a1c'
    );
    const finalDataPrimeiroVencimento = isDueDateLocked ? '2026-11-09' : dataPrimeiroVencimento;

    if (formaPagamento === 'cartao') {
      valorFinalTotal = Math.round(renewal.valorReajustado * 1.05 * 100) / 100;
      maxParc = 12;
    } else if (formaPagamento === 'boleto') {
      valorFinalTotal = renewal.valorReajustado;
      maxParc = is12xBoletoAllowed ? 12 : 10;
    } else {
      valorFinalTotal = renewal.valorReajustado;
      maxParc = 1;
    }

    const vMeses = Number(renewal.vigenciaMeses) || 12;
    const isAnualRenewal = vMeses >= 12;
    const durTipo = renewal.duracaoTipo || (isAnualRenewal ? 'anual' : (vMeses === 1 ? 'mensal' : `${vMeses}_meses`));

    let numParcelas = Math.min(Math.max(1, Number(parcelas) || 1), maxParc);
    if (isAnualRenewal) {
      if (formaPagamento === 'cartao') {
        numParcelas = 12;
      } else if (formaPagamento === 'boleto') {
        numParcelas = is12xBoletoAllowed ? (Number(parcelas) === 10 ? 10 : 12) : 10;
      }
    } else {
      numParcelas = Math.min(numParcelas, vMeses);
    }
    const valorParcela = Math.round((valorFinalTotal / numParcelas) * 100) / 100;

    // 3. Atualizar dados comerciais com o novo ciclo
    const diaVenc = Number(finalDataPrimeiroVencimento.split('-')[2]) || 10;
    
    if (!client.dadosComerciais) {
      client.dadosComerciais = {};
    }

    client.dadosComerciais.status = 'ativo';
    client.dadosComerciais.planoId = renewal.planoId._id;
    client.dadosComerciais.duracao = durTipo;
    client.dadosComerciais.duracaoQtd = isAnualRenewal ? 1 : vMeses;
    client.dadosComerciais.vigenciaQtd = isAnualRenewal ? 1 : vMeses;
    client.dadosComerciais.valorUnitario = valorFinalTotal;
    client.dadosComerciais.valorAcordado = valorFinalTotal;
    client.dadosComerciais.dataInicio = renewal.dataInicioRenovacao;
    client.dadosComerciais.vencimento = renewal.dataFimCalculada;
    client.dadosComerciais.frequencia = renewal.frequencia;
    client.dadosComerciais.creditosTotal = renewal.creditosMensais;
    client.dadosComerciais.diaVencimento = diaVenc;
    client.dadosComerciais.formaPagamento = formaPagamento;
    client.dadosComerciais.parcelas = numParcelas;

    await client.save();

    // Sincronizar e manter contínua a grade de horários fixos do aluno
    try {
      await syncClientFixedSchedulesValidity(client._id.toString());
    } catch (schedErr) {
      console.error('[renovacoes] Erro ao sincronizar horários fixos:', schedErr);
    }

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
      planTipo: isAnualRenewal ? 'Anual' : (vMeses === 1 ? 'Mensal' : `${vMeses} Meses`),
      planPreco: valorFinalTotal,
      creditosMensais: renewal.creditosMensais,
      dataInicio: renewal.dataInicioRenovacao,
      dataVencimento: finalDataPrimeiroVencimento,
      formaPagamento,
      parcelas: numParcelas,
      vigenciaQtd: isAnualRenewal ? 12 : vMeses,
      recorrenciaMeses: isAnualRenewal ? 12 : vMeses,
      criarRecorrenciaMensal: isAnualRenewal,
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
      planoTipo: isAnualRenewal ? 'Anual' : (vMeses === 1 ? 'Mensal' : `${vMeses} Meses`),
      valorBruto: valorFinalTotal,
      descontoTipo: 'fixo',
      descontoValor: 0,
      valorLiquido: valorFinalTotal,
      formaPagamento,
      parcelas: numParcelas,
      dataPrimeiroVencimento: finalDataPrimeiroVencimento,
      diaVencimento: diaVenc,
      dataInicio: renewal.dataInicioRenovacao,
      dataFim: renewal.dataFimCalculada,
      vigenciaMeses: vMeses,
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
      observacoesContratuais: `Renovação de contrato (${isAnualRenewal ? '12 meses' : `${vMeses} meses`}). Início em ${renewal.dataInicioRenovacao}. Condição: ${numParcelas}x de R$ ${valorParcela.toFixed(2)} via ${formaPagamento.toUpperCase()}.`
    });

    // 7. Atualizar a proposta de renovação
    renewal.status = 'aceita';
    renewal.dataPrimeiroVencimento = finalDataPrimeiroVencimento;
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
