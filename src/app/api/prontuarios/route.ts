import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import Prontuario from '@/models/Prontuario';
import { checkSessionPermission } from '@/utils/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const paramClientId = searchParams.get('clientId');
    const id = searchParams.get('id');

    // Single full document by ID
    if (id) {
      const fullDoc = await Prontuario.findById(id).lean().maxTimeMS(12000);
      return NextResponse.json(
        { success: true, data: fullDoc },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    let query: any = {};
    if (paramClientId) {
      try {
        const objId = new mongoose.Types.ObjectId(paramClientId);
        query = { $or: [{ clienteId: paramClientId }, { clienteId: objId }] };
      } catch {
        query = { clienteId: paramClientId };
      }
    }

    // Lightweight select projection for instant dashboard table rendering (<150ms)
    const records = await Prontuario.find(query)
      .select('clienteId profissionalId data conteudo createdAt')
      .sort({ data: -1 })
      .lean()
      .maxTimeMS(12000);

    return NextResponse.json(
      { success: true, data: records, count: records.length },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('[prontuarios GET] Error:', error.message);
    return NextResponse.json(
      { success: false, data: [], error: error.message },
      { headers: { 'Cache-Control': 'no-store' }, status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    await checkSessionPermission(['admin', 'professional'], undefined, request);

    const body = await request.json();
    const { clienteId, profissionalId, data, conteudo } = body;

    if (!clienteId || !profissionalId || !data || !conteudo) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const record = await Prontuario.create({
      clienteId,
      profissionalId,
      data,
      conteudo
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    
    await checkSessionPermission(['admin', 'professional'], undefined, request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    await Prontuario.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Clinical record deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
