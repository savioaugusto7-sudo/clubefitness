import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import PhysicalAssessment from '@/models/PhysicalAssessment';
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

    // If fetching full single assessment (e.g. for PDF download)
    if (id) {
      const fullDoc = await PhysicalAssessment.findById(id).lean().maxTimeMS(4000);
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

    // Light select projection for instant dashboard table rendering (<150ms)
    const assessments = await PhysicalAssessment.find(query)
      .select('clienteId avaliadorId data dadosMedidos.peso dadosMedidos.altura dadosMedidos.sexo dadosMedidos.idade resultadosCalculados.percentualGordura resultadosCalculados.massaMagra resultadosCalculados.massaGorda resultadosCalculados.imc resultadosCalculados.rcq createdAt')
      .sort({ data: -1 })
      .lean()
      .maxTimeMS(4000);

    return NextResponse.json(
      { success: true, data: assessments, count: assessments.length },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('[assessments GET] Error:', error.message);
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
    const { clienteId, avaliadorId, data, dadosMedidos, resultadosCalculados, metas, observacoes, pdfName, pdf_url, tempoGastoSegundos } = body;

    if (!clienteId || !avaliadorId || !data || !dadosMedidos) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const assessment = await PhysicalAssessment.create({
      clienteId,
      avaliadorId,
      data,
      dadosMedidos,
      resultadosCalculados,
      metas,
      observacoes,
      pdfName,
      pdf_url: pdf_url || '',
      tempoGastoSegundos: Number(tempoGastoSegundos) || 0
    });

    return NextResponse.json({ success: true, data: assessment });
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

    await PhysicalAssessment.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Physical assessment deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
