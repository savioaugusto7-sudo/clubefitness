import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import RenewalProposal from '@/models/RenewalProposal';
import Client from '@/models/Client';
import Plan from '@/models/Plan';
import Contract from '@/models/Contract';
import { generateContractTemplate } from '@/utils/contractTemplate';

// Helper para calcular data + N dias
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

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
    const { clientId, customValorAnterior, customVigenciaMeses } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'ID do aluno é obrigatório.' }, { status: 400 });
    }

    const client = await Client.findById(clientId).populate('dadosComerciais.planoId');
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado.' }, { status: 404 });
    }

    // Buscar último contrato assinado/ativo do aluno se existir
    const lastContract = await Contract.findOne({ clientId: client._id })
      .sort({ createdAt: -1 });

    const com = client.dadosComerciais || {};
    const plan = com.planoId || (await Plan.findOne({ ativo: true }));
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Nenhum plano comercial configurado.' }, { status: 400 });
    }

    // Determinar data fim do contrato anterior
    const todayStr = new Date().toISOString().split('T')[0];
    const dataFimAnterior = com.vencimento || lastContract?.dataFim || todayStr;
    const isExpired = dataFimAnterior < todayStr;

    // Regra: Renovação sempre inicia 1 dia após o término anterior
    const dataInicioRenovacao = addDays(dataFimAnterior, 1);

    const vigenciaMeses = Number(customVigenciaMeses) || Number(com.vigenciaQtd) || lastContract?.vigenciaMeses || 12;
    const dataFimCalculada = addMonths(dataInicioRenovacao, vigenciaMeses);

    // Determinar valor anterior
    let valorAnterior = Number(customValorAnterior);
    if (!valorAnterior) {
      valorAnterior = Number(com.valorAcordado) || Number(lastContract?.valorLiquido) || Number(plan.preco) || 299;
    }

    // Aplicar reajuste automático de 5%
    const reajustePercentual = 5;
    const valorReajustado = Math.round(valorAnterior * (1 + reajustePercentual / 100) * 100) / 100;

    const frequencia = Number(com.frequencia) || lastContract?.frequencia || 3;
    const creditosMensais = frequencia * 4 + 1;

    const renewal = await RenewalProposal.create({
      clientId: client._id,
      planoId: plan._id,
      planoNome: plan.nome || 'Clube Fitness - Monitorado',
      planoTipo: plan.tipo || 'Mensal',
      valorAnterior,
      reajustePercentual,
      valorReajustado,
      frequencia,
      creditosMensais,
      dataFimAnterior,
      dataInicioRenovacao,
      dataFimCalculada,
      vigenciaMeses,
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
    const { id, dataPrimeiroVencimento, formaPagamento, parcelas, dadosPreenchidos, assinarClicksign } = body;

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

    // 2. Atualizar dados comerciais com o novo ciclo
    const diaVenc = Number(dataPrimeiroVencimento.split('-')[2]) || 10;
    
    if (!client.dadosComerciais) {
      client.dadosComerciais = {};
    }

    client.dadosComerciais.status = 'ativo';
    client.dadosComerciais.planoId = renewal.planoId._id;
    client.dadosComerciais.dataInicio = renewal.dataInicioRenovacao;
    client.dadosComerciais.vencimento = renewal.dataFimCalculada;
    client.dadosComerciais.valorAcordado = renewal.valorReajustado;
    client.dadosComerciais.frequencia = renewal.frequencia;
    client.dadosComerciais.creditosTotal = renewal.creditosMensais;
    client.dadosComerciais.recorrenciaVigencia = true;
    client.dadosComerciais.diaVencimento = diaVenc;
    client.dadosComerciais.formaPagamento = formaPagamento;
    client.dadosComerciais.parcelas = Number(parcelas) || 1;

    await client.save();

    // 3. Criar registro oficial de Contrato
    const newContract = await Contract.create({
      clientId: client._id,
      planoId: renewal.planoId._id,
      planoNome: renewal.planoNome,
      planoTipo: renewal.planoTipo,
      valorBruto: renewal.valorReajustado * renewal.vigenciaMeses,
      descontoTipo: 'fixo',
      descontoValor: 0,
      valorLiquido: renewal.valorReajustado,
      formaPagamento,
      parcelas: Number(parcelas) || 1,
      dataPrimeiroVencimento,
      diaVencimento: diaVenc,
      dataInicio: renewal.dataInicioRenovacao,
      dataFim: renewal.dataFimCalculada,
      vigenciaMeses: renewal.vigenciaMeses,
      responsavelVenda: 'Auto-Renovação Online (Link do Aluno)',
      unidadeContratada: 'Clube Fitness',
      frequencia: renewal.frequencia,
      creditosTotal: renewal.creditosMensais,
      status: 'assinado',
      assinaturaNome: client.dadosPessoais?.nome || 'Aluno',
      assinaturaData: new Date(),
      observacoesContratuais: `Renovação de contrato com reajuste anual de 5% sobre o valor anterior (R$ ${renewal.valorAnterior.toFixed(2)} -> R$ ${renewal.valorReajustado.toFixed(2)}). Início contínuo em ${renewal.dataInicioRenovacao}.`
    });

    // 4. Atualizar o status da proposta de renovação
    renewal.status = 'aceita';
    renewal.dataPrimeiroVencimento = dataPrimeiroVencimento;
    renewal.formaPagamento = formaPagamento;
    renewal.parcelas = Number(parcelas) || 1;
    renewal.dadosAceite = {
      ip: request.headers.get('x-forwarded-for') || '127.0.0.1',
      dataHora: new Date(),
      userAgent: request.headers.get('user-agent') || '',
      nomeAssinante: client.dadosPessoais?.nome || ''
    };

    await renewal.save();

    return NextResponse.json({
      success: true,
      message: 'Renovação concluída com sucesso! Seu plano foi renovado.',
      contractId: newContract._id
    });
  } catch (error: any) {
    console.error('Erro ao efetivar renovação:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
