import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/utils/dbConnect';
import ClientWorkout from '@/models/ClientWorkout';
import WorkoutHistory from '@/models/WorkoutHistory';
import Client from '@/models/Client';
import { buildWorkoutEvolutionSummary } from '@/utils/workoutAnalyticsEngine';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId obrigatório.' }, { status: 400 });
    }

    // 1. Obter dados do aluno
    const client = await Client.findById(clientId).select('nome email');
    const clientName = client?.nome || 'Aluno';

    // 2. Obter treino ativo
    const activeWorkout = await ClientWorkout.findOne({ clienteId: clientId });
    const allActiveSheets = [
      ...(activeWorkout?.fichasMonitorado || []),
      ...(activeWorkout?.fichasLivre || [])
    ];

    // 3. Obter histórico de ciclos
    const historyList = await WorkoutHistory.find({ clienteId: clientId })
      .sort({ createdAt: -1 })
      .lean();

    // 4. Executar agregação e inteligência de evolução
    const evolutionSummary = buildWorkoutEvolutionSummary(clientName, allActiveSheets, historyList);

    // 5. Preparar dados formatados dos ciclos para diff
    const cycleSnapshots = historyList.map(h => ({
      _id: String(h._id),
      motivo: h.motivo,
      sheetNome: h.sheetNome,
      createdAt: h.createdAt,
      statusCiclo: h.statusCiclo,
      exerciciosCount: h.exerciciosCount || 0,
      volumeKg: h.volumeKg || 0,
      fichasMonitorado: h.snapshot?.fichasMonitorado || [],
      fichasLivre: h.snapshot?.fichasLivre || []
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: evolutionSummary,
        activeWorkout: {
          fichasMonitorado: activeWorkout?.fichasMonitorado || [],
          fichasLivre: activeWorkout?.fichasLivre || []
        },
        cycleSnapshots
      }
    });
  } catch (error: any) {
    console.error('[API workouts/evolution] Erro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
