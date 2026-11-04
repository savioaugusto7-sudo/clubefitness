import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isSavioAdmin } from '@/lib/auth-savio';
import { getAcompanhamentoHtml, getFechamentoHtml } from '@/utils/executiveReportTemplates';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const isAuthorized =
      isSavioAdmin(user) ||
      user?.role === 'admin' ||
      user?.tipo === 'admin' ||
      (Array.isArray(user?.activeRoles) && user.activeRoles.includes('admin'));

    if (!user || !isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Acesso restrito a administradores.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get('mes') || searchParams.get('month') || '2026-10';
    const tipoParam = searchParams.get('tipo') || searchParams.get('format') || 'acompanhamento';
    const isView = searchParams.get('view') === 'true';

    const isFechamento = tipoParam === 'fechamento' || tipoParam === 'financeiro' || tipoParam === 'master';

    const html = isFechamento
      ? await getFechamentoHtml(mesParam)
      : await getAcompanhamentoHtml(mesParam);

    const filename = isFechamento
      ? `ClubeFitness_Fechamento_${mesParam}.pdf`
      : `ClubeFitness_Acompanhamento_${mesParam}.pdf`;

    if (isView) {
      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    return NextResponse.json({
      success: true,
      html,
      filename,
      mes: mesParam,
      tipo: tipoParam
    });
  } catch (error: any) {
    console.error('Erro ao renderizar relatório HTML:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao gerar relatório HTML.' },
      { status: 500 }
    );
  }
}

