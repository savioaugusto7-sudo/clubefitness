import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import StrengthTest from '@/models/StrengthTest';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';

export async function GET(request: Request) {
  try {
    await dbConnect();

    // Register schemas
    const _client = Client;
    const _prof = Professional;

    const { user } = await checkSessionPermission(['admin', 'professional', 'client']);

    let query = {};
    const roles: string[] = (user.activeRoles || [user.role]) as string[];
    const isClientOnly = roles.includes('client') && !roles.includes('admin') && !roles.includes('professional');
    if (isClientOnly) {
      query = { clienteId: user.clientProfileId };
    }

    let tests: any[] = [];
    try {
      tests = await StrengthTest.find(query)
        .populate({ path: 'clienteId', select: 'dadosPessoais.nome dadosPessoais.cpf dadosPessoais.sexo dadosPessoais.dataNascimento dadosComerciais.status', strictPopulate: false })
        .populate({ path: 'profissionalId', select: 'nome email', strictPopulate: false })
        .lean();
    } catch (popErr) {
      console.warn('Populate failed in strength-tests, using raw find:', popErr);
      tests = await StrengthTest.find(query).lean();
    }

    return NextResponse.json({ success: true, data: tests });
  } catch (error: any) {
    console.error('Error in GET /api/strength-tests:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    await checkSessionPermission(['admin', 'professional']);

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
    
    await checkSessionPermission(['admin', 'professional']);

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
