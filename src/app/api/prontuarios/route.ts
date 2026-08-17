import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Prontuario from '@/models/Prontuario';
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
    // admin e professional: query = {} → vê todos os prontuários

    let records: any[] = [];
    try {
      records = await Prontuario.find(query)
        .populate({ path: 'clienteId', select: 'dadosPessoais.nome dadosPessoais.cpf dadosPessoais.sexo dadosPessoais.dataNascimento dadosComerciais.status', strictPopulate: false })
        .populate({ path: 'profissionalId', select: 'nome email', strictPopulate: false })
        .lean();
    } catch (popErr) {
      console.warn('Populate failed in prontuarios, using raw find:', popErr);
      records = await Prontuario.find(query).lean();
    }

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error('Error in GET /api/prontuarios:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    await checkSessionPermission(['admin', 'professional']);

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
    
    await checkSessionPermission(['admin', 'professional']);

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
