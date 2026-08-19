import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import WellnessLog from '@/models/WellnessLog';
import { calculateWellness } from '@/utils/wellnessHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId obrigatório' }, { status: 400 });
    }

    let query: any = {};
    try {
      const objId = new mongoose.Types.ObjectId(clientId);
      query = { $or: [{ clienteId: clientId }, { clienteId: objId }] };
    } catch {
      query = { clienteId: clientId };
    }

    const logs = await WellnessLog.find(query)
      .populate('profissionalId', 'nome')
      .sort({ data: -1, createdAt: -1 })
      .limit(60)
      .lean();

    return NextResponse.json({
      success: true,
      data: logs
    });
  } catch (error: any) {
    console.error('Erro ao buscar logs Wellness:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
