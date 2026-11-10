import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isSavioAdmin } from '@/lib/auth-savio';

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
    const profissionalId = searchParams.get('profissionalId') || '';

    let redirectUrl = `/api/admin/relatorio-pontuacao/html?mes=${encodeURIComponent(mesParam)}&view=true`;
    if (profissionalId && profissionalId !== 'todos') {
      redirectUrl += `&profissionalId=${encodeURIComponent(profissionalId)}`;
    }

    const targetUrl = new URL(redirectUrl, request.url);
    return NextResponse.redirect(targetUrl, 307);

  } catch (error: any) {
    console.error('Erro ao processar download do relatório de pontuação:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao processar download.' },
      { status: 500 }
    );
  }
}

