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

    const scriptFile = tipo === 'acompanhamento'
      ? 'generate_acompanhamento_pdf.js'
      : 'generate_10page_master_pdf.js';

    const scriptPath = path.join(process.cwd(), 'scripts', scriptFile);

    if (!fs.existsSync(scriptPath)) {
      return NextResponse.json(
        { success: false, error: `Script gerador ${scriptFile} não encontrado no servidor.` },
        { status: 404 }
      );
    }

    // Executa a compilação do relatório
    const { stdout, stderr } = await execAsync(`node "${scriptPath}" "${mesParam}"`, {
      timeout: 120000,
      cwd: process.cwd()
    });

    console.log(`[Generate ${tipo} Report Output]:`, stdout);
    if (stderr) console.warn(`[Generate ${tipo} Report Stderr]:`, stderr);

    const downloadFormat = tipo === 'acompanhamento' ? 'acompanhamento' : 'financeiro';

    return NextResponse.json({
      success: true,
      message: `Relatório ${tipo === 'acompanhamento' ? 'de Acompanhamento' : 'de Fechamento'} gerado com sucesso!`,
      downloadUrl: `/api/admin/executive-report/download?format=${downloadFormat}&mes=${mesParam}`
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


