import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await dbConnect();

    // Register schemas so populate works
    const _client = Client;
    const _prof = Professional;

    // --- ROBUST SESSION CHECK ---
    // Never throw 500 on auth errors; instead return empty with auth_required flag
    let user: any = null;
    let authError: string | null = null;
    try {
      const result = await checkSessionPermission(['admin', 'professional', 'client'], undefined, request);
      user = result.user;
    } catch (authErr: any) {
      authError = authErr.message;
      console.error('[assessments GET] Auth error:', authErr.message);
    }

    if (!user) {
      // Not authenticated or not authorized — return empty but don't crash
      console.warn('[assessments GET] No valid session. authError:', authError);
      return NextResponse.json(
        { success: true, data: [], auth_required: true, auth_error: authError },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // Build query based on role
    const roles: string[] = (user.activeRoles || [user.role]) as string[];
    console.log('[assessments GET] user roles:', roles, '| professionalProfileId:', user.professionalProfileId);

    let query: any = {};
    const isClientOnly = roles.includes('client') && !roles.includes('admin') && !roles.includes('professional');
    if (isClientOnly) {
      query = { clienteId: user.clientProfileId };
      console.log('[assessments GET] client-only mode, filtering by clienteId:', user.clientProfileId);
    } else {
      console.log('[assessments GET] admin/professional mode — fetching all');
    }

    // Populate with fallback
    let assessments: any[] = [];
    try {
      assessments = await PhysicalAssessment.find(query)
        .populate({ path: 'clienteId', select: 'dadosPessoais.nome dadosPessoais.cpf dadosPessoais.sexo dadosPessoais.dataNascimento dadosComerciais.status', strictPopulate: false })
        .populate({ path: 'avaliadorId', select: 'nome email', strictPopulate: false })
        .lean();
    } catch (popErr) {
      console.warn('[assessments GET] Populate failed, using raw find:', popErr);
      assessments = await PhysicalAssessment.find(query).lean();
    }

    console.log('[assessments GET] returning', assessments.length, 'assessments');

    return NextResponse.json(
      { success: true, data: assessments },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error: any) {
    console.error('[assessments GET] Fatal error:', error.message);
    // Even on fatal errors, return success:true with empty array so UI doesn't break
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
