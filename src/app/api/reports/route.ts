import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import PhysioReport from '@/models/PhysioReport';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
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

    // Fast query without populate - frontend matches client names by ID
    const reports = await PhysioReport.find(query)
      .sort({ data: -1 })
      .lean()
      .maxTimeMS(8000);

    return NextResponse.json(
      { success: true, data: reports },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('[reports GET] Error:', error.message);
    return NextResponse.json(
      { success: true, data: [], server_error: error.message },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    await checkSessionPermission(['admin', 'professional'], undefined, request);

    const body = await request.json();
    const { clienteId, profissionalId, data, conteudo, anamnese, goniometria, testesEspeciais, termografia, testesOrtopedicos, pdfName, pdf_url, tempoGastoSegundos } = body;

    if (!clienteId || !profissionalId || !data || !conteudo) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const report = await PhysioReport.create({
      clienteId,
      profissionalId,
      data,
      conteudo,
      anamnese,
      goniometria,
      testesEspeciais,
      termografia,
      testesOrtopedicos,
      pdfName,
      pdf_url: pdf_url || '',
      tempoGastoSegundos: Number(tempoGastoSegundos) || 0
    });

    const populatedReport = await PhysioReport.findById(report._id)
      .populate('clienteId')
      .populate('profissionalId');

    return NextResponse.json({ success: true, data: populatedReport });
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

    await PhysioReport.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Physiotherapy report deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
