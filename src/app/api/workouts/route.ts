import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import ClientWorkout from '@/models/ClientWorkout';
import WorkoutHistory from '@/models/WorkoutHistory';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const includeHistory = searchParams.get('history') === 'true';

    if (!clientId) {
      const workouts = await ClientWorkout.find({});
      return NextResponse.json({ success: true, data: workouts });
    }

    // Se solicitar histórico de versões anteriores
    if (includeHistory) {
      const history = await WorkoutHistory.find({ clienteId: clientId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      return NextResponse.json({ success: true, data: history });
    }

    let workout = await ClientWorkout.findOne({ clienteId: clientId });
    if (!workout) {
      const defaultWorksheets = [
        { id: 'A', nome: 'Ficha A', ultimaAtualizacao: '', observacoesGerais: '', exercicios: [] },
        { id: 'B', nome: 'Ficha B', ultimaAtualizacao: '', observacoesGerais: '', exercicios: [] },
        { id: 'C', nome: 'Ficha C', ultimaAtualizacao: '', observacoesGerais: '', exercicios: [] }
      ];
      workout = await ClientWorkout.create({
        clienteId: clientId,
        fichasMonitorado: defaultWorksheets,
        fichasLivre: defaultWorksheets
      });
    }

    return NextResponse.json({ success: true, data: workout });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      clientId,
      category,
      workoutData,
      fichasMonitorado,
      fichasLivre,
      confirmEmpty,
      profissionalId,
      profissionalNome,
      action,
      historyId
    } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Missing required field: clientId' }, { status: 400 });
    }

    // Caso de RESTAURAÇÃO de versão anterior do histórico
    if (action === 'restore' && historyId) {
      const historyEntry = await WorkoutHistory.findOne({ _id: historyId, clienteId: clientId });
      if (!historyEntry) {
        return NextResponse.json({ success: false, error: 'Versão do histórico não encontrada.' }, { status: 404 });
      }

      // Salvar snapshot da versão atual antes de restaurar
      const currentDoc = await ClientWorkout.findOne({ clienteId: clientId });
      if (currentDoc) {
        await WorkoutHistory.create({
          clienteId: clientId,
          profissionalId,
          profissionalNome: profissionalNome || 'Sistema',
          motivo: 'Backup antes da restauração de versão histórica',
          categoriaAlterada: 'ambas',
          snapshot: {
            fichasMonitorado: currentDoc.fichasMonitorado || [],
            fichasLivre: currentDoc.fichasLivre || []
          }
        });
      }

      const restoredWorkout = await ClientWorkout.findOneAndUpdate(
        { clienteId: clientId },
        {
          $set: {
            fichasMonitorado: historyEntry.snapshot?.fichasMonitorado || [],
            fichasLivre: historyEntry.snapshot?.fichasLivre || []
          }
        },
        { new: true }
      );

      return NextResponse.json({
        success: true,
        message: 'Ficha de treino restaurada com sucesso!',
        data: restoredWorkout
      });
    }

    let updateQuery: any = {};
    if (category && workoutData) {
      updateQuery[category] = workoutData;
    } else {
      if (fichasMonitorado) updateQuery.fichasMonitorado = fichasMonitorado;
      if (fichasLivre) updateQuery.fichasLivre = fichasLivre;
    }

    if (Object.keys(updateQuery).length === 0) {
      return NextResponse.json({ success: false, error: 'No update data provided' }, { status: 400 });
    }

    // 🌟 1. Trava de Segurança e Auditoria de Snapshot
    const existingWorkout = await ClientWorkout.findOne({ clienteId: clientId });

    if (existingWorkout) {
      // Calcular quantos exercícios existiam antes
      const prevMonitoradoCount = (existingWorkout.fichasMonitorado || []).reduce((acc: number, f: any) => acc + (f.exercicios?.length || 0), 0);
      const prevLivreCount = (existingWorkout.fichasLivre || []).reduce((acc: number, f: any) => acc + (f.exercicios?.length || 0), 0);
      const totalPrevExercises = prevMonitoradoCount + prevLivreCount;

      // Calcular quantos exercícios estão sendo enviados agora
      let targetMonitorado = updateQuery.fichasMonitorado !== undefined ? updateQuery.fichasMonitorado : existingWorkout.fichasMonitorado;
      let targetLivre = updateQuery.fichasLivre !== undefined ? updateQuery.fichasLivre : existingWorkout.fichasLivre;

      const newMonCount = (targetMonitorado || []).reduce((acc: number, f: any) => acc + (f.exercicios?.length || 0), 0);
      const newLivCount = (targetLivre || []).reduce((acc: number, f: any) => acc + (f.exercicios?.length || 0), 0);

      // Trava: se a categoria continha exercícios e a nova lista nessa categoria ficou vazia (0 exercícios) sem confirmação explícita
      const monEmptied = prevMonitoradoCount > 0 && newMonCount === 0 && updateQuery.fichasMonitorado !== undefined;
      const livEmptied = prevLivreCount > 0 && newLivCount === 0 && updateQuery.fichasLivre !== undefined;

      if ((monEmptied || livEmptied) && !confirmEmpty) {
        return NextResponse.json({
          success: false,
          requireConfirmation: true,
          error: 'A ficha deste aluno continha exercícios cadastrados. A operação atual deixará a ficha vazia (sem exercícios). Confirme para sobrescrever.'
        }, { status: 400 });
      }

      // Se havia algum exercício cadastrado, gerar snapshot histórico imutável antes de aplicar as mudanças
      if (totalPrevExercises > 0) {
        try {
          await WorkoutHistory.create({
            clienteId: clientId,
            profissionalId,
            profissionalNome: profissionalNome || '',
            motivo: body.motivo || (monEmptied || livEmptied ? 'Esvaziamento de ficha' : 'Atualização de ficha de treino'),
            categoriaAlterada: category || 'ambas',
            snapshot: {
              fichasMonitorado: existingWorkout.fichasMonitorado || [],
              fichasLivre: existingWorkout.fichasLivre || []
            }
          });
        } catch (histErr) {
          console.error('[Workouts POST] Falha ao gravar histórico:', histErr);
        }
      }
    }
    
    const executeSave = async () => {
      return await ClientWorkout.findOneAndUpdate(
        { clienteId: clientId },
        { $set: updateQuery },
        { new: true, upsert: true }
      );
    };

    try {
      const workout = await executeSave();
      return NextResponse.json({ success: true, data: workout });
    } catch (dbErr: any) {
      const isSslOrConnError = dbErr.message && (
        dbErr.message.includes('SSL') || 
        dbErr.message.includes('tlsv1') || 
        dbErr.message.includes('ECONNRESET') || 
        dbErr.message.includes('topology') ||
        dbErr.message.includes('closed')
      );

      if (isSslOrConnError) {
        console.warn('[Workouts POST] Reconnecting after SSL/socket error:', dbErr.message);
        await dbConnect(true);
        const retryWorkout = await executeSave();
        return NextResponse.json({ success: true, data: retryWorkout });
      }
      throw dbErr;
    }
  } catch (error: any) {
    console.error('Error saving workout:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
