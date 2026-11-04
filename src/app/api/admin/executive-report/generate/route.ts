import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isSavioAdmin } from '@/lib/auth-savio';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';

const execAsync = util.promisify(exec);

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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
        {
          success: false,
          error: 'Acesso restrito: A geração de Relatórios Financeiros é exclusiva de Administradores.'
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const mesParam = body.mes || '2026-10';
    const tipo = body.tipo || 'fechamento'; // 'fechamento' | 'acompanhamento'

    const downloadFormat = tipo === 'acompanhamento' ? 'acompanhamento' : 'financeiro';

    // Em produção serverless (como Vercel), a renderização ocorre diretamente via HTML/html2pdf no cliente
    // ou visualização print-ready em `/api/admin/executive-report/html`.
    return NextResponse.json({
      success: true,
      message: `Relatório ${tipo === 'acompanhamento' ? 'de Acompanhamento' : 'de Fechamento'} pronto!`,
      downloadUrl: `/api/admin/executive-report/html?tipo=${downloadFormat}&mes=${mesParam}&view=true`
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório executivo via API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro durante a compilação do relatório executivo.'
      },
      { status: 500 }
    );
  }
}


