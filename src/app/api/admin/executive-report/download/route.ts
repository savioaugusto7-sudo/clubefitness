import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isSavioAdmin } from '@/lib/auth-savio';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    // 1. Autorização estrita: Apenas Sávio Augusto Oliveira
    if (!user || !isSavioAdmin(user)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Acesso restrito: O Relatório Executivo Auditado é de acesso exclusivo de Sávio Augusto Oliveira.'
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get('mes') || '2026-10';
    const formatParam = searchParams.get('format') || 'desktop'; // 'desktop' ou 'mobile'

    const fileName = formatParam === 'mobile'
      ? `relatorio_pontuacao_${mesParam}_mobile.pdf`
      : `relatorio_pontuacao_${mesParam}_desktop.pdf`;

    // Caminhos de busca (prioriza storage/reports da aplicação)
    const storagePath = path.join(process.cwd(), 'storage', 'reports', fileName);
    const fallbackPath = formatParam === 'mobile'
      ? 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026_mobile.pdf'
      : 'C:/Users/user/.gemini/antigravity/brain/abdac8a5-d79c-4a8d-b6f5-b3894f8eb65b/relatorio_pontuacao_outubro_2026.pdf';

    let targetPath = '';
    if (fs.existsSync(storagePath)) {
      targetPath = storagePath;
    } else if (fs.existsSync(fallbackPath)) {
      targetPath = fallbackPath;
    }

    if (!targetPath) {
      return NextResponse.json(
        {
          success: false,
          error: `Relatório fechado para o mês ${mesParam} no formato ${formatParam} ainda não foi processado.`
        },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(targetPath);
    const responseFileName = formatParam === 'mobile'
      ? `ClubeFitness_Fechamento_${mesParam}_Mobile.pdf`
      : `ClubeFitness_Fechamento_${mesParam}_Oficial.pdf`;

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
