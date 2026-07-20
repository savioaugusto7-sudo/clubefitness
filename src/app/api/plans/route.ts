import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Plan from '@/models/Plan';

export async function GET() {
  try {
    await dbConnect();
    const plans = await Plan.find({}).sort({ nome: 1 });
    return NextResponse.json({ success: true, data: plans });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { nome, ativo } = body;

    if (!nome) {
      return NextResponse.json({ success: false, error: 'Nome do plano é obrigatório' }, { status: 400 });
    }

    const plan = await Plan.create({
      nome,
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
    const { id, nome, ativo } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do plano é obrigatório' }, { status: 400 });
    }

    const plan = await Plan.findById(id);
    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plano não encontrado' }, { status: 404 });
    }

    if (nome) plan.nome = nome;
    if (ativo !== undefined) plan.ativo = ativo;

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
