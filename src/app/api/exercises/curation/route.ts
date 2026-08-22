import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Exercise from '@/models/Exercise';
import { findBestGifMatch, EXERCISE_GIF_CATALOG } from '@/utils/exerciseGifMatcher';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all'; // 'all', 'locked', 'suggestions', 'has_gif', 'no_gif'
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const exercises = await Exercise.find({}).lean();

    let lockedCount = 0;
    let hasGifCount = 0;
    let suggestionsCount = 0;
    let noGifCount = 0;

    const processed = exercises.map((ex: any) => {
      const isLocked = Boolean(ex.isLocked);
      const hasGif = Boolean(ex.gifUrl && ex.gifUrl.trim() !== '');

      if (isLocked) lockedCount++;
      if (hasGif) hasGifCount++;

      // Se já tem GIF ou está blindado, não gera sugestão automática
      let suggestion = null;
      if (!hasGif && !isLocked) {
        const matchResult = findBestGifMatch(ex);
        if (matchResult.match && matchResult.confidence >= 65) {
          suggestion = {
            gifUrl: matchResult.match.gifUrl,
            catalogName: matchResult.match.namePt,
            confidence: matchResult.confidence
          };
          suggestionsCount++;
        } else {
          noGifCount++;
        }
      } else if (!hasGif && isLocked) {
        noGifCount++;
      }

      return {
        ...ex,
        suggestion
      };
    });

    let filtered = processed;

    if (filter === 'locked') {
      filtered = processed.filter(e => e.isLocked);
    } else if (filter === 'suggestions') {
      filtered = processed.filter(e => !e.isLocked && !e.gifUrl && e.suggestion);
    } else if (filter === 'has_gif') {
      filtered = processed.filter(e => e.gifUrl && e.gifUrl.trim() !== '');
    } else if (filter === 'no_gif') {
      filtered = processed.filter(e => !e.gifUrl && !e.suggestion);
    }

    if (search) {
      filtered = filtered.filter(e => 
        (e.nome && e.nome.toLowerCase().includes(search)) ||
        (e.grupo && e.grupo.toLowerCase().includes(search)) ||
        (e.equipamento && e.equipamento.toLowerCase().includes(search)) ||
        (e.lockReason && e.lockReason.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({
      success: true,
      stats: {
        total: exercises.length,
        locked: lockedCount,
        hasGif: hasGifCount,
        suggestions: suggestionsCount,
        noGif: noGifCount,
        catalogSize: EXERCISE_GIF_CATALOG.length
      },
      data: filtered
    });
  } catch (error: any) {
    console.error('[curation GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { action, exerciseId, gifUrl, exerciseIds } = body;

    // 1. Aprovação Individual de GIF
    if (action === 'approve' && exerciseId && gifUrl) {
      const target = await Exercise.findById(exerciseId);
      if (!target) {
        return NextResponse.json({ success: false, error: 'Exercício não encontrado.' }, { status: 404 });
      }

      if (target.isLocked) {
        return NextResponse.json({ 
          success: false, 
          error: `Este exercício está blindado (${target.lockReason || 'Protegido'}). Não é permitido sobrescrever.` 
        }, { status: 403 });
      }

      target.gifUrl = gifUrl;
      await target.save();

      return NextResponse.json({ success: true, message: `GIF aprovado com sucesso para "${target.nome}".` });
    }

    // 2. Aprovação em Lote (Apenas de Alta Confiança e Não Blindados)
    if (action === 'batch_approve' && Array.isArray(exerciseIds) && exerciseIds.length > 0) {
      let approvedCount = 0;

      for (const id of exerciseIds) {
        const ex = await Exercise.findById(id);
        if (ex && !ex.isLocked && (!ex.gifUrl || ex.gifUrl.trim() === '')) {
          const matchResult = findBestGifMatch(ex);
          if (matchResult.match && matchResult.confidence >= 80) {
            ex.gifUrl = matchResult.match.gifUrl;
            await ex.save();
            approvedCount++;
          }
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: `${approvedCount} exercício(s) enriquecidos com sucesso!` 
      });
    }

    return NextResponse.json({ success: false, error: 'Ação não suportada.' }, { status: 400 });
  } catch (error: any) {
    console.error('[curation POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
