import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Exercise from '@/models/Exercise';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const filter: any = {};
    if (status) {
      filter.status = status;
    }

    const records = await Exercise.find(filter);
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { nome, grupo, equipamento, instrucoes, gifUrl, status, solicitadoPorNome } = body;

    if (!nome || !grupo || !equipamento) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const record = await Exercise.create({
      nome,
      grupo,
      equipamento,
      instrucoes: instrucoes || '',
      gifUrl: gifUrl || '',
      status: status || 'approved',
      solicitadoPorNome: solicitadoPorNome || ''
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, ids, nome, grupo, equipamento, instrucoes, status, gifUrl, action } = body;

    // Suporte a ações em lote
    if (ids && Array.isArray(ids) && ids.length > 0) {
      if (action === 'approved' || status === 'approved') {
        await Exercise.updateMany(
          { _id: { $in: ids } },
          { $set: { status: 'approved' } }
        );
        return NextResponse.json({ success: true, count: ids.length, message: `${ids.length} exercícios aprovados com sucesso.` });
      } else if (action === 'rejected' || action === 'delete') {
        await Exercise.deleteMany({ _id: { $in: ids } });
        return NextResponse.json({ success: true, count: ids.length, message: `${ids.length} solicitações excluídas com sucesso.` });
      }
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (grupo !== undefined) updateData.grupo = grupo;
    if (equipamento !== undefined) updateData.equipamento = equipamento;
    if (instrucoes !== undefined) updateData.instrucoes = instrucoes;
    if (status !== undefined) updateData.status = status;
    if (gifUrl !== undefined) updateData.gifUrl = gifUrl;

    const updated = await Exercise.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean);
      await Exercise.deleteMany({ _id: { $in: ids } });
      return NextResponse.json({ success: true, message: `${ids.length} exercícios excluídos` });
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    await Exercise.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Exercise deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
