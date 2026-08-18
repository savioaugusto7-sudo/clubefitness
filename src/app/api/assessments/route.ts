import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();

    // Register schemas so populate works
    const _client = Client;
    const _prof = Professional;

    // --- PARAMETERS & QUERY ---
    const { searchParams } = new URL(request.url);
    const paramClientId = searchParams.get('clientId');
    const detail = searchParams.get('detail');

    let query: any = {};
    if (paramClientId) {
      query = { clienteId: paramClientId };
    }

    // For listing, select only fields needed for the table
    const listingFields = 'clienteId avaliadorId data dadosMedidos.peso dadosMedidos.altura dadosMedidos.sexo dadosMedidos.idade resultadosCalculados.percentualGordura resultadosCalculados.massaMagra resultadosCalculados.massaGorda resultadosCalculados.imc resultadosCalculados.imcClassificacao metas observacoes pdfName pdf_url createdAt';

    let assessments: any[] = [];
    try {
      if (detail === 'full') {
        // Full document for PDF generation / detail view
        assessments = await PhysicalAssessment.find(query)
          .populate({ path: 'clienteId', select: 'dadosPessoais.nome dadosPessoais.cpf dadosPessoais.sexo dadosPessoais.dataNascimento dadosComerciais.status', strictPopulate: false })
          .populate({ path: 'avaliadorId', select: 'nome email', strictPopulate: false })
          .sort({ data: -1 })
          .lean()
          .maxTimeMS(8000);
      } else {
        // Lightweight listing for dashboard table
        assessments = await PhysicalAssessment.find(query)
          .select(listingFields)
          .populate({ path: 'clienteId', select: 'dadosPessoais.nome dadosPessoais.cpf dadosPessoais.sexo dadosPessoais.dataNascimento dadosComerciais.status', strictPopulate: false })
          .populate({ path: 'avaliadorId', select: 'nome email', strictPopulate: false })
          .sort({ data: -1 })
          .lean()
          .maxTimeMS(8000);
      }
    } catch (popErr: any) {
      console.warn('[assessments GET] Populate/query failed, trying raw:', popErr.message);
      try {
        assessments = await PhysicalAssessment.find(query)
          .select(listingFields)
          .sort({ data: -1 })
          .lean()
          .maxTimeMS(8000);
      } catch (rawErr: any) {
        console.warn('[assessments GET] Raw find also failed:', rawErr.message);
        // Last resort: just get IDs and dates
        assessments = await PhysicalAssessment.find(query)
          .select('clienteId avaliadorId data')
          .sort({ data: -1 })
          .lean()
          .maxTimeMS(5000);
      }
    }

    console.log('[assessments GET] returning', assessments.length, 'assessments');

    return NextResponse.json(
      { success: true, data: assessments },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error: any) {
    console.error('[assessments GET] Fatal error:', error.message);
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
