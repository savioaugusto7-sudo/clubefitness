import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import StrengthTest from '@/models/StrengthTest';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();

    const _client = Client;
    const _prof = Professional;

    // --- PARAMETERS & QUERY ---
    const { searchParams } = new URL(request.url);
    const paramClientId = searchParams.get('clientId');

    let query: any = {};
    if (paramClientId) {
      query = { clienteId: paramClientId };
    }

    let tests: any[] = [];
    try {
      tests = await StrengthTest.find(query)
        .populate({ path: 'clienteId', select: 'dadosPessoais.nome dadosPessoais.cpf dadosPessoais.sexo dadosPessoais.dataNascimento dadosComerciais.status', strictPopulate: false })
        .populate({ path: 'profissionalId', select: 'nome email', strictPopulate: false })
        .sort({ data: -1 })
        .lean();
    } catch (popErr) {
      console.warn('[strength-tests GET] Populate failed, using raw find:', popErr);
      tests = await StrengthTest.find(query).sort({ data: -1 }).lean();
    }

    console.log('[strength-tests GET] returning', tests.length, 'tests');
    return NextResponse.json(
      { success: true, data: tests },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error: any) {
    console.error('[strength-tests GET] Fatal error:', error.message);
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
    const { clienteId, profissionalId, data, exercicio, cargaMax, repeticoes, exercicios, analise, observacoes, pdfName, pdfB64, pesoCliente, testesRealizados, comparativos, tempoGastoSegundos } = body;

    if (!clienteId || !profissionalId || !data) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const test = await StrengthTest.create({
      clienteId,
      profissionalId,
      data,
      exercicio,
      cargaMax,
      repeticoes,
      exercicios,
      analise,
      observacoes,
      pdfName,
      pdfB64,
      pesoCliente,
      testesRealizados,
      comparativos,
      tempoGastoSegundos: Number(tempoGastoSegundos) || 0
    });

    return NextResponse.json({ success: true, data: test });
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

    await StrengthTest.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Strength test deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
