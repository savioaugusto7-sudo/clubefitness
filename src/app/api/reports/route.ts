import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import PhysioReport from '@/models/PhysioReport';
import '@/models/Client';
import '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

function toValidObjectId(val: any, fallback?: string): mongoose.Types.ObjectId | null {
  if (!val) return fallback ? new mongoose.Types.ObjectId(fallback) : null;
  const str = String(val).trim();
  if (mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str)) {
    try {
      return new mongoose.Types.ObjectId(str);
    } catch {
      return fallback ? new mongoose.Types.ObjectId(fallback) : null;
    }
  }
  return fallback ? new mongoose.Types.ObjectId(fallback) : null;
}

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const paramClientId = searchParams.get('clientId');
    const id = searchParams.get('id');

    // Single full document by ID (for modal / PDF download with heavy base64/thermography)
    if (id) {
      const validId = toValidObjectId(id);
      if (!validId) {
        return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
      }
      const fullDoc = await PhysioReport.findById(validId).lean().maxTimeMS(12000);
      return NextResponse.json(
        { success: true, data: fullDoc },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    let query: any = {};
    if (paramClientId) {
      const objId = toValidObjectId(paramClientId);
      query = objId ? { $or: [{ clienteId: paramClientId }, { clienteId: objId }] } : { clienteId: paramClientId };
    }

    // Ultra-lightweight select projection: strictly what table needs, excluding heavy base64/termografia
    const reports = await PhysioReport.find(query)
      .select('clienteId profissionalId data conteudo.queixaPrincipal conteudo.dorEscala pdfName createdAt')
      .sort({ data: -1 })
      .lean()
      .maxTimeMS(12000);

    return NextResponse.json(
      { success: true, data: reports, count: reports.length },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('[reports GET] Error:', error.message);
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'JSON inválido no corpo da requisição.' }, { status: 400 });
    }

    const { clienteId, profissionalId, data, conteudo, anamnese, goniometria, testesEspeciais, termografia, testesOrtopedicos, pdfName, pdf_url, tempoGastoSegundos } = body;

    if (!clienteId || !data || !conteudo) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes (cliente, data, conteúdo).' }, { status: 400 });
    }

    const validClienteId = toValidObjectId(clienteId);
    if (!validClienteId) {
      return NextResponse.json({ success: false, error: 'ID do cliente inválido.' }, { status: 400 });
    }

    const validProfId = toValidObjectId(profissionalId, '6668ab030303030303030302') || new mongoose.Types.ObjectId('6668ab030303030303030302');

    const report = await PhysioReport.create({
      clienteId: validClienteId,
      profissionalId: validProfId,
      data,
      conteudo,
      anamnese,
      goniometria,
      testesEspeciais,
      termografia,
      testesOrtopedicos,
      pdfName: pdfName || '',
      pdf_url: pdf_url || '',
      tempoGastoSegundos: Number(tempoGastoSegundos) || 0
    });

    const populatedReport = await PhysioReport.findById(report._id)
      .populate('clienteId')
      .populate('profissionalId')
      .lean();

    return NextResponse.json({ success: true, data: populatedReport || report });
  } catch (error: any) {
    console.error('[reports POST] Error:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || 'Erro interno ao salvar relatório fisioterápico.' }, { status: 500 });
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

    const validId = toValidObjectId(id);
    if (!validId) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    await PhysioReport.findByIdAndDelete(validId);
    return NextResponse.json({ success: true, message: 'Physiotherapy report deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
