import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Exercise from '@/models/Exercise';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const records = await Exercise.find({});
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { nome, grupo, equipamento, instrucoes, gifUrl } = body;

    if (!nome || !grupo || !equipamento) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const record = await Exercise.create({
      nome,
      grupo,
      equipamento,
      instrucoes: instrucoes || '',
      gifUrl: gifUrl || ''
    });

    return NextResponse.json({ success: true, data: record });
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
