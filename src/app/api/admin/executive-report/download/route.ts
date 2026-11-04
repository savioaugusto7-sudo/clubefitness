import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isSavioAdmin } from '@/lib/auth-savio';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

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
        {
          success: false,
          error: 'Acesso restrito: O Relatório Executivo Auditado é de acesso exclusivo de Administradores.'
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get('mes') || '2026-10';
    const formatParam = searchParams.get('format') || 'financeiro'; // 'financeiro', 'fechamento', 'acompanhamento', 'desktop', 'mobile', 'potencial'

    let fileName = `relatorio_financeiro_${mesParam}.pdf`;
    let responseFileName = `ClubeFitness_Fechamento_${mesParam}.pdf`;

    if (formatParam === 'acompanhamento') {
      fileName = `relatorio_acompanhamento_${mesParam}.pdf`;
      responseFileName = `ClubeFitness_Acompanhamento_${mesParam}.pdf`;
    } else if (formatParam === 'mobile') {
      fileName = `relatorio_pontuacao_${mesParam}_mobile.pdf`;
      responseFileName = `ClubeFitness_Fechamento_${mesParam}_Mobile.pdf`;
    } else if (formatParam === 'desktop') {
      fileName = `relatorio_pontuacao_${mesParam}_desktop.pdf`;
      responseFileName = `ClubeFitness_Fechamento_${mesParam}_Oficial.pdf`;
    } else if (formatParam === 'potencial') {
      fileName = 'relatorio_analise_potencial_maximo_outubro_2026.pdf';
      responseFileName = `ClubeFitness_Analise_Potencial_Maximo_${mesParam}.pdf`;
    } else if (formatParam === 'financeiro' || formatParam === 'fechamento' || formatParam === 'master') {
      fileName = `relatorio_financeiro_${mesParam}.pdf`;
      responseFileName = `ClubeFitness_Relatorio_Fechamento_${mesParam}.pdf`;
    }

    // Caminhos de busca (prioriza storage/reports da aplicação)
    const storageReportsDir = path.join(process.cwd(), 'storage', 'reports');
    if (!fs.existsSync(storageReportsDir)) {
      fs.mkdirSync(storageReportsDir, { recursive: true });
    }

    const storagePath = path.join(storageReportsDir, fileName);
    const fallbackOct = path.join(storageReportsDir, 'relatorio_financeiro_outubro_2026.pdf');
    const artifactOct = 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_financeiro_outubro_2026.pdf';

    let targetPath = '';
    if (fs.existsSync(storagePath)) {
      targetPath = storagePath;
    } else if (mesParam === '2026-10' && fs.existsSync(fallbackOct)) {
      targetPath = fallbackOct;
    } else if (mesParam === '2026-10' && fs.existsSync(artifactOct)) {
      targetPath = artifactOct;
    }

    // Se o arquivo não existir, gera on-demand
    if (!targetPath || !fs.existsSync(targetPath)) {
      console.log(`[Report Download] Arquivo ${fileName} não encontrado. Gerando sob demanda...`);
      const scriptFile = formatParam === 'acompanhamento'
        ? 'generate_acompanhamento_pdf.js'
        : 'generate_10page_master_pdf.js';
      const scriptPath = path.join(process.cwd(), 'scripts', scriptFile);

      if (fs.existsSync(scriptPath)) {
        await execAsync(`node "${scriptPath}" "${mesParam}"`, {
          timeout: 120000,
          cwd: process.cwd()
        });
        if (fs.existsSync(storagePath)) {
          targetPath = storagePath;
        }
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return NextResponse.json(
        {
          success: false,
          error: `Relatório para o mês ${mesParam} no formato ${formatParam} não pôde ser gerado no servidor.`
        },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(targetPath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${responseFileName}"`,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Erro ao disponibilizar download do relatório executivo:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno no servidor ao processar download.' },
      { status: 500 }
    );
  }
}


