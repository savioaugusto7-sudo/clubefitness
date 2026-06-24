import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Exercise from '@/models/Exercise';

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
    const { id, nome, grupo, equipamento, instrucoes, status } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    const updated = await Exercise.findByIdAndUpdate(
      id,
      { nome, grupo, equipamento, instrucoes, status },
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

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    await Exercise.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Exercise deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
