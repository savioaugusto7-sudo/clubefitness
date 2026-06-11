import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import FixedSchedule from '@/models/FixedSchedule';
import Client from '@/models/Client';
import Professional from '@/models/Professional';

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Register schemas for populate
    const _client = Client;
    const _prof = Professional;

    const schedules = await FixedSchedule.find({})
      .populate('clienteId')
      .populate('profissionalId');

    return NextResponse.json({ success: true, data: schedules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { clienteId, profissionalId, diaSemana, horario, servico, dataInicio } = body;

    if (!clienteId || !profissionalId || diaSemana === undefined || !horario || !servico || !dataInicio) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const schedule = await FixedSchedule.create({
      clienteId,
      profissionalId,
      diaSemana: Number(diaSemana),
      horario,
      servico,
      dataInicio
    });

    return NextResponse.json({ success: true, data: schedule });
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

    await FixedSchedule.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Fixed schedule deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
