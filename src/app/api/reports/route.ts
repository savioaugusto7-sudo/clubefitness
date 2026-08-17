import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import PhysioReport from '@/models/PhysioReport';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';

export async function GET(request: Request) {
  try {
    await dbConnect();

    // Register schemas so populate works
    const _client = Client;
    const _prof = Professional;

    // --- ROBUST SESSION CHECK ---
    let user: any = null;
    let authError: string | null = null;
    try {
      const result = await checkSessionPermission(['admin', 'professional', 'client']);
      user = result.user;
    } catch (authErr: any) {
      authError = authErr.message;
      console.error('[reports GET] Auth error:', authErr.message);
    }

    if (!user) {
      console.warn('[reports GET] No valid session. authError:', authError);
      return NextResponse.json(
        { success: true, data: [], auth_required: true, auth_error: authError },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const roles: string[] = (user.activeRoles || [user.role]) as string[];
    console.log('[reports GET] user roles:', roles);

    let query: any = {};
    const isClientOnly = roles.includes('client') && !roles.includes('admin') && !roles.includes('professional');
    if (isClientOnly) {
      query = { clienteId: user.clientProfileId };
      console.log('[reports GET] client-only, filtering by clienteId:', user.clientProfileId);
    } else {
      console.log('[reports GET] admin/professional mode — fetching all');
    }

    let reports: any[] = [];
    try {
      reports = await PhysioReport.find(query)
        .populate({ path: 'clienteId', select: 'dadosPessoais.nome dadosPessoais.cpf dadosPessoais.sexo dadosPessoais.dataNascimento dadosComerciais.status', strictPopulate: false })
        .populate({ path: 'profissionalId', select: 'nome email', strictPopulate: false })
        .lean();
    } catch (popErr) {
      console.warn('[reports GET] Populate failed, using raw find:', popErr);
      reports = await PhysioReport.find(query).lean();
    }

    console.log('[reports GET] returning', reports.length, 'reports');

    return NextResponse.json(
      { success: true, data: reports },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error: any) {
    console.error('[reports GET] Fatal error:', error.message);
    return NextResponse.json(
      { success: true, data: [], server_error: error.message },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    await checkSessionPermission(['admin', 'professional']);

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

    // Populate so the PDF generator has access to client and professional names
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
    
    await checkSessionPermission(['admin', 'professional']);

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
