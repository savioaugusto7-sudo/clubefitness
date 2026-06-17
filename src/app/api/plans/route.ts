import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Plan from '@/models/Plan';

export async function GET() {
  try {
    await dbConnect();
    const plans = await Plan.find({}).sort({ preco: 1 });
    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { nome, validadeDias, limiteSessoesAcademia, limiteSessoesConsultorio, preco, creditosTotal, servicosPermitidos, tipo, beneficiosInclusos, unidadeAtendimento, ativo } = body;

    if (!nome || preco === undefined) {
      return NextResponse.json({ success: false, error: 'Nome e Preço são obrigatórios' }, { status: 400 });
    }

    const plan = await Plan.create({
      nome,
      validadeDias: validadeDias || 30,
      limiteSessoesAcademia: limiteSessoesAcademia || 0,
      limiteSessoesConsultorio: limiteSessoesConsultorio || 0,
      preco: Number(preco),
      creditosTotal: creditosTotal || 0,
      servicosPermitidos: servicosPermitidos || [],
      tipo: tipo || 'Mensal',
      beneficiosInclusos: beneficiosInclusos || [],
      unidadeAtendimento: unidadeAtendimento || '',
      ativo: ativo !== undefined ? ativo : true
    });

    return NextResponse.json({ success: true, data: plan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, nome, validadeDias, limiteSessoesAcademia, limiteSessoesConsultorio, preco, creditosTotal, servicosPermitidos, tipo, beneficiosInclusos, unidadeAtendimento, ativo } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do plano é obrigatório' }, { status: 400 });
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plano não encontrado' }, { status: 404 });
    }

    plan.nome = nome || plan.nome;
    plan.validadeDias = validadeDias !== undefined ? Number(validadeDias) : plan.validadeDias;
    plan.limiteSessoesAcademia = limiteSessoesAcademia !== undefined ? Number(limiteSessoesAcademia) : plan.limiteSessoesAcademia;
    plan.limiteSessoesConsultorio = limiteSessoesConsultorio !== undefined ? Number(limiteSessoesConsultorio) : plan.limiteSessoesConsultorio;
    plan.preco = preco !== undefined ? Number(preco) : plan.preco;
    plan.creditosTotal = creditosTotal !== undefined ? Number(creditosTotal) : plan.creditosTotal;
    plan.servicosPermitidos = servicosPermitidos || plan.servicosPermitidos;
    plan.tipo = tipo || plan.tipo;
    plan.beneficiosInclusos = beneficiosInclusos || plan.beneficiosInclusos;
    plan.unidadeAtendimento = unidadeAtendimento !== undefined ? unidadeAtendimento : plan.unidadeAtendimento;
    plan.ativo = ativo !== undefined ? ativo : plan.ativo;

    await plan.save();
    return NextResponse.json({ success: true, data: plan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do plano é obrigatório' }, { status: 400 });
    }

    await Plan.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Plano excluído com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
