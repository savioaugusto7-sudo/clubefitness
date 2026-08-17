import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Prontuario from '@/models/Prontuario';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';

export async function GET(request: Request) {
  try {
    await dbConnect();

    const _client = Client;
    const _prof = Professional;

    let user: any = null;
    let authError: string | null = null;
    try {
      const result = await checkSessionPermission(['admin', 'professional', 'client'], undefined, request);
      user = result.user;
    } catch (authErr: any) {
      authError = authErr.message;
      console.error('[prontuarios GET] Auth error:', authErr.message);
    }

    if (!user) {
      return NextResponse.json(
        { success: true, data: [], auth_required: true, auth_error: authError },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const roles: string[] = (user.activeRoles || [user.role]) as string[];
    let query: any = {};
    const isClientOnly = roles.includes('client') && !roles.includes('admin') && !roles.includes('professional');
    if (isClientOnly) {
      query = { clienteId: user.clientProfileId };
    }

    let records: any[] = [];
    try {
      records = await Prontuario.find(query)
        .populate({ path: 'clienteId', select: 'dadosPessoais.nome dadosPessoais.cpf dadosPessoais.sexo dadosPessoais.dataNascimento dadosComerciais.status', strictPopulate: false })
        .populate({ path: 'profissionalId', select: 'nome email', strictPopulate: false })
        .lean();
    } catch (popErr) {
      console.warn('[prontuarios GET] Populate failed, using raw find:', popErr);
      records = await Prontuario.find(query).lean();
    }

    console.log('[prontuarios GET] returning', records.length, 'records');
    return NextResponse.json(
      { success: true, data: records },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error: any) {
    console.error('[prontuarios GET] Fatal error:', error.message);
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
