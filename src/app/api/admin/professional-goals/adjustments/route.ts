import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import ScoreAdjustment from '@/models/ScoreAdjustment';
import Professional from '@/models/Professional';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const mesParam = searchParams.get('mes');
    const profissionalId = searchParams.get('profissionalId');

    const query: any = {};
    if (mesParam) {
      query.mesReferencia = mesParam;
    }
    if (profissionalId) {
      query.profissionalId = profissionalId;
    }

    const adjustments = await ScoreAdjustment.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: adjustments
    });
  } catch (error: any) {
    console.error('Erro ao buscar ajustes de metas:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao buscar ajustes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    const {
      profissionalId,
      mesReferencia,
      tipo,
      pontos,
      motivo,
      registroOrigemId,
      criadoPor,
      criadoPorNome
    } = body;

    if (!profissionalId || !mesReferencia || !tipo || pontos === undefined || !motivo) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios ausentes: profissionalId, mesReferencia, tipo, pontos, motivo' },
        { status: 400 }
      );
    }

    // Buscar nome do profissional caso não fornecido
    let profNome = body.profissionalNome;
    if (!profNome) {
      const prof = await Professional.findById(profissionalId).lean();
      profNome = (prof as any)?.nome || (prof as any)?.name || 'Profissional';
    }

    const adjustment = await ScoreAdjustment.create({
      profissionalId,
      profissionalNome: profNome,
      mesReferencia,
      tipo,
      pontos: Number(pontos),
      motivo: String(motivo).trim(),
      registroOrigemId: registroOrigemId || '',
      criadoPor: criadoPor || 'admin',
      criadoPorNome: criadoPorNome || 'Gestor'
    });

    return NextResponse.json({
      success: true,
      data: adjustment,
      message: 'Ajuste de pontuação salvo com sucesso!'
    });
  } catch (error: any) {
    console.error('Erro ao salvar ajuste de metas:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao salvar ajuste' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // query param was empty
      }
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do ajuste não fornecido' },
        { status: 400 }
      );
    }

    const deleted = await ScoreAdjustment.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Ajuste não encontrado para exclusão' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Ajuste excluído/estornado com sucesso!'
    });
  } catch (error: any) {
    console.error('Erro ao excluir ajuste de metas:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao excluir ajuste' },
      { status: 500 }
    );
  }
}

