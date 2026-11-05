import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import WellnessLog from '@/models/WellnessLog';
import Appointment from '@/models/Appointment';
import ClientWorkout from '@/models/ClientWorkout';
import { calculateWellness } from '@/utils/wellnessHelper';
import { calculateACWR, calculateWellnessACWRDecision } from '@/utils/acwrEngine';
import { logClientActivity } from '@/utils/auditLogger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId obrigatório' }, { status: 400 });
    }

    let query: any = {};
    try {
      const objId = new mongoose.Types.ObjectId(clientId);
      query = { $or: [{ clienteId: clientId }, { clienteId: objId }] };
    } catch {
      query = { clienteId: clientId };
    }

    // Busca histórico de logs de wellness e dados dos últimos 28 dias para ACWR
    const date28DaysAgo = new Date();
    date28DaysAgo.setDate(date28DaysAgo.getDate() - 30);
    const date28DaysAgoStr = date28DaysAgo.toISOString().split('T')[0];

    const [logs, appointments, clientWorkout] = await Promise.all([
      WellnessLog.find(query)
        .populate('profissionalId', 'nome')
        .sort({ data: -1, createdAt: -1 })
        .limit(60)
        .lean(),
      Appointment.find({
        ...query,
        data: { $gte: date28DaysAgoStr }
      }).lean(),
      ClientWorkout.findOne(query).lean()
    ]);

    const acwr = calculateACWR(appointments, clientWorkout);
    const latestLog = logs && logs.length > 0 ? logs[0] : null;
    const matrizDecisao = calculateWellnessACWRDecision(latestLog, acwr);

    return NextResponse.json({
      success: true,
      data: logs,
      acwr,
      matrizDecisao
    });
  } catch (error: any) {
    console.error('Erro ao buscar logs Wellness e ACWR:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { clienteId, sono, fadiga, dorMuscular, data, horario, profissionalId, appointmentId } = body;

    if (!clienteId) {
      return NextResponse.json({ success: false, error: 'clienteId é obrigatório' }, { status: 400 });
    }

    const s = Number(sono) || 3;
    const f = Number(fadiga) || 3;
    const d = Number(dorMuscular) || 3;

    const wResult = calculateWellness(s, f, d);
    const agora = new Date();
    const dataReg = data || agora.toISOString().split('T')[0];
    const horaReg = horario || `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;

    const newLog = await WellnessLog.create({
      clienteId,
      appointmentId: appointmentId || null,
      profissionalId: profissionalId || null,
      data: dataReg,
      horario: horaReg,
      sono: s,
      fadiga: f,
      dorMuscular: d,
      score: wResult.score,
      status: wResult.status,
      statusLabel: wResult.statusLabel,
      statusColor: wResult.statusColor,
      conduta: wResult.conduta,
      regrasAtivadas: wResult.regrasAtivadas
    });

    // Auditoria de preenchimento de Wellness
    try {
      await logClientActivity({
        clienteId,
        tipoAcao: 'wellness',
        acao: 'Preencheu Questionário Wellness',
        detalhes: `Score: ${wResult.score}/15 (${wResult.statusLabel}) | Sono: ${s}, Fadiga: ${f}, Dor: ${d}`,
        metadata: {
          score: wResult.score,
          statusLabel: wResult.statusLabel,
          appointmentId: appointmentId || null
        },
        request
      });
    } catch (logErr) {
      console.warn('Erro ao registrar log de Wellness:', logErr);
    }

    return NextResponse.json({
      success: true,
      data: newLog,
      wellnessResult: wResult
    });
  } catch (error: any) {
    console.error('Erro ao criar registro de Wellness:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
