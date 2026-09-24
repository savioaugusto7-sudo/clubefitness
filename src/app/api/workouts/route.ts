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

    // 🌟 Processar datas de validade e histórico de carga para cada ficha
    const processSheetData = (sheets: any[], existingCategorySheets: any[] = []) => {
      if (!Array.isArray(sheets)) return sheets;
      const todayStr = new Date().toISOString().split('T')[0];

      return sheets.map(sheet => {
        const existingSheet = existingCategorySheets.find(s => String(s.id).toUpperCase() === String(sheet.id).toUpperCase());
        
        // Validade
        let validadeDias = sheet.validadeDias ? Number(sheet.validadeDias) : (existingSheet?.validadeDias ? Number(existingSheet.validadeDias) : undefined);
        let dataInicio = sheet.dataInicio || existingSheet?.dataInicio || '';
        let dataExpiracao = sheet.dataExpiracao || existingSheet?.dataExpiracao || '';

        if (validadeDias && [15, 30, 60].includes(validadeDias)) {
          if (!dataInicio) {
            dataInicio = todayStr;
          }
          const baseDate = new Date(dataInicio + 'T12:00:00');
          baseDate.setDate(baseDate.getDate() + validadeDias);
          dataExpiracao = baseDate.toISOString().split('T')[0];
        }

        // Exercícios e histórico de carga
        const exercicios = (sheet.exercicios || []).map((ex: any) => {
          const exNome = typeof ex.exercicioId === 'object' ? ex.exercicioId?.nome : ex.exercicioId;
          const existingEx = (existingSheet?.exercicios || []).find((e: any) => {
            const eNome = typeof e.exercicioId === 'object' ? e.exercicioId?.nome : e.exercicioId;
            return eNome === exNome || (e._id && String(e._id) === String(ex._id));
          });

          let historicoCargas: any[] = Array.isArray(ex.historicoCargas) && ex.historicoCargas.length > 0 
            ? [...ex.historicoCargas] 
            : (Array.isArray(existingEx?.historicoCargas) ? [...existingEx.historicoCargas] : []);

          const currentCarga = ex.carga !== undefined && ex.carga !== null && String(ex.carga).trim() !== '' ? String(ex.carga).trim() : null;

          if (currentCarga) {
            const lastEntry = historicoCargas[historicoCargas.length - 1];
            const lastCargaStr = lastEntry ? String(lastEntry.carga).trim() : null;

            if (!lastEntry || lastCargaStr !== currentCarga) {
              historicoCargas.push({
                data: todayStr,
                carga: currentCarga,
                unidadeCarga: ex.unidadeCarga || lastEntry?.unidadeCarga || 'kg',
                reps: String(ex.repeticoes || ''),
                origem: 'prescricao'
              });
            }
          }

          return {
            ...ex,
            historicoCargas
          };
        });

        return {
          ...sheet,
          validadeDias,
          dataInicio,
          dataExpiracao,
          exercicios
        };
      });
    };

    // 🌟 1. Trava de Segurança e Auditoria de Snapshot
    const existingWorkout = await ClientWorkout.findOne({ clienteId: clientId });

    if (updateQuery.fichasMonitorado) {
      updateQuery.fichasMonitorado = processSheetData(updateQuery.fichasMonitorado, existingWorkout?.fichasMonitorado || []);
    }
    if (updateQuery.fichasLivre) {
      updateQuery.fichasLivre = processSheetData(updateQuery.fichasLivre, existingWorkout?.fichasLivre || []);
    }

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
