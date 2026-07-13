import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import ActivityLog from '@/models/ActivityLog';
import Professional from '@/models/Professional';
import Client from '@/models/Client';

export async function GET() {
  try {
    await dbConnect();
    // Force register models to avoid populate errors
    const _prof = Professional;
    const _cli = Client;

    const logs = await ActivityLog.find({})
      .populate('profissionalId')
      .populate('clienteId')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { profissionalId, clienteId, acao, detalhes, origem } = body;

    if (!profissionalId || !acao || !origem) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    const log = await ActivityLog.create({
      profissionalId,
      clienteId: clienteId || null,
      acao,
      detalhes: detalhes || '',
      origem
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
