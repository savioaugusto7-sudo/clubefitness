import { NextResponse } from 'next/server';
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

    let query: any = {};
    if (paramClientId) {
      query = { clienteId: paramClientId };
    }

    let assessments: any[] = [];

    // 1. Primary fast query
    try {
      assessments = await PhysicalAssessment.find(query)
        .sort({ data: -1 })
        .lean()
        .maxTimeMS(5000);
    } catch (findErr: any) {
      console.warn('[assessments GET] find error, falling back to native collection:', findErr.message);
      // 2. Native driver fallback (bypasses all Mongoose schema cast issues)
      const rawDocs = await PhysicalAssessment.collection
        .find(query)
        .sort({ data: -1 })
        .toArray();
      
      assessments = rawDocs.map((doc: any) => ({
        ...doc,
        _id: doc._id?.toString() || doc._id,
        clienteId: doc.clienteId?.toString() || doc.clienteId,
        avaliadorId: doc.avaliadorId?.toString() || doc.avaliadorId,
      }));
    }

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
