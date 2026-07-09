import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AgendaConfig from '@/models/AgendaConfig';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const configs = await AgendaConfig.find().sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: configs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { tipo, horario, acao, diaSemana, dataEspecifica, capacidadePersonalizada, servico } = body;

    if (!tipo || !horario || !acao) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios: tipo, horario, acao' }, { status: 400 });
    }

    // Criar a regra de configuração
    const newConfig = await AgendaConfig.create({
      tipo,
      horario,
      acao,
      diaSemana: diaSemana !== undefined ? diaSemana : null,
      dataEspecifica: dataEspecifica || null,
      capacidadePersonalizada: capacidadePersonalizada !== undefined ? capacidadePersonalizada : null,
      servico: servico || null
    });

    return NextResponse.json({ success: true, data: newConfig });
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
      return NextResponse.json({ success: false, error: 'ID ausente' }, { status: 400 });
    }

    await AgendaConfig.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Configuração removida com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
