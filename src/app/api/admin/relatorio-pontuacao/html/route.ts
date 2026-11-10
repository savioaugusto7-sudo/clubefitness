import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isSavioAdmin } from '@/lib/auth-savio';
import { getRelatorioPontuacaoHtml } from '@/utils/scoreReportTemplates';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

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
        { success: false, error: 'Acesso restrito: Relatório de Pontuação disponível exclusivamente para a Gestão.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get('mes') || searchParams.get('month') || '2026-10';
    const profissionalId = searchParams.get('profissionalId') || undefined;
    const isView = searchParams.get('view') === 'true';

    const html = await getRelatorioPontuacaoHtml({
      mes: mesParam,
      profissionalId: profissionalId && profissionalId !== 'todos' ? profissionalId : undefined
    });

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
      mes: mesParam,
      profissionalId
    });

  } catch (error: any) {
    console.error('Erro ao renderizar Relatório de Pontuação HTML:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao gerar Relatório de Pontuação.' },
      { status: 500 }
    );
  }
}

