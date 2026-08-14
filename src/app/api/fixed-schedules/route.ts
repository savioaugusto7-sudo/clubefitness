import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import FixedSchedule from '@/models/FixedSchedule';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import Appointment from '@/models/Appointment';

// Helper para gerar agendamentos reais na grade a partir de uma regra de horário fixo
async function generateAppointmentsForFixedSchedule(schedule: any) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(schedule.dataInicio + 'T12:00:00');
    const effectiveStart = startDate < today ? today : startDate;

    let endDate: Date;
    if (schedule.dataFim) {
      endDate = new Date(schedule.dataFim + 'T23:59:59');
    } else {
      // Se indeterminado, gera para as próximas 16 semanas (4 meses)
      endDate = new Date(effectiveStart);
      endDate.setDate(endDate.getDate() + 16 * 7);
    }

    // Obter profissional padrão para vinculação do Schema se não houver um específico
    let profId = schedule.profissionalId;
    if (!profId) {
      const defaultProf = await Professional.findOne();
      profId = defaultProf?._id;
    }

    const targetDayOfWeek = Number(schedule.diaSemana); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    const current = new Date(effectiveStart);

    // Ajustar para o primeiro dia da semana alvo a partir da data de início
    while (current.getDay() !== targetDayOfWeek) {
      current.setDate(current.getDate() + 1);
    }

    const appointmentsToCreate = [];

    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0];

      // Verificar se já existe agendamento neste dia e horário para o aluno
      const existing = await Appointment.findOne({
        clienteId: schedule.clienteId,
        data: dateStr,
        horario: schedule.horario,
        status: { $ne: 'cancelado' }
      });

      if (!existing && profId) {
        appointmentsToCreate.push({
          data: dateStr,
          horario: schedule.horario,
          tipo: 'academia',
          servico: schedule.servico || 'Treino Monitorado',
          consumeCredito: true,
          tipoCredito: 'academia',
          profissionalId: profId,
          clienteId: schedule.clienteId,
          status: 'agendado',
          origemHorarioFixo: true,
          fixedScheduleId: schedule._id
        });
      }

      // Avançar 7 dias (próxima semana)
      current.setDate(current.getDate() + 7);
    }

    if (appointmentsToCreate.length > 0) {
      await Appointment.insertMany(appointmentsToCreate);
    }
  } catch (err) {
    console.error('Erro ao gerar agendamentos para horário fixo:', err);
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Register schemas for populate
    const _client = Client;
    const _prof = Professional;

    const schedules = await FixedSchedule.find({})
      .populate('clienteId')
      .populate('profissionalId')
      .sort({ 'clienteId.dadosPessoais.nome': 1, diaSemana: 1, horario: 1 });

    return NextResponse.json({ success: true, data: schedules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { clienteId, profissionalId, slots, diaSemana, horario, servico, dataInicio, duracaoSemanas, dataFim, syncAll } = body;

    // Sincronização em massa de todas as regras existentes
    if (syncAll) {
      const allSchedules = await FixedSchedule.find({});
      for (const fs of allSchedules) {
        await generateAppointmentsForFixedSchedule(fs);
      }
      return NextResponse.json({ success: true, message: 'Todas as regras foram sincronizadas com a grade da agenda.' });
    }

    if (!clienteId || !servico || !dataInicio) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes (clienteId, servico, dataInicio).' }, { status: 400 });
    }

    // Suporte a criação de múltiplos slots de dia/horário em lote
    const itemsToCreate: any[] = [];

    if (Array.isArray(slots) && slots.length > 0) {
      for (const slot of slots) {
        itemsToCreate.push({
          clienteId,
          profissionalId: profissionalId || null,
          diaSemana: Number(slot.diaSemana),
          horario: slot.horario,
          servico,
          dataInicio,
          duracaoSemanas: duracaoSemanas ? Number(duracaoSemanas) : null,
          dataFim: dataFim || null
        });
      }
    } else if (diaSemana !== undefined && horario) {
      itemsToCreate.push({
        clienteId,
        profissionalId: profissionalId || null,
        diaSemana: Number(diaSemana),
        horario,
        servico,
        dataInicio,
        duracaoSemanas: duracaoSemanas ? Number(duracaoSemanas) : null,
        dataFim: dataFim || null
      });
    } else {
      return NextResponse.json({ success: false, error: 'Nenhum dia ou horário informado.' }, { status: 400 });
    }

    const createdSchedules = await FixedSchedule.insertMany(itemsToCreate);

    // Gerar agendamentos reais na grade para todas as regras criadas
    for (const schedule of createdSchedules) {
      await generateAppointmentsForFixedSchedule(schedule);
    }

    return NextResponse.json({ success: true, data: createdSchedules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clientId = searchParams.get('clientId');

    if (id) {
      await FixedSchedule.findByIdAndDelete(id);
      
      // Remover agendamentos futuros gerados por esta regra que ainda estão como 'agendado'
      const todayStr = new Date().toISOString().split('T')[0];
      await Appointment.deleteMany({
        fixedScheduleId: id,
        status: 'agendado',
        data: { $gte: todayStr }
      });

      return NextResponse.json({ success: true, message: 'Horário fixo e agendamentos futuros cancelados com sucesso.' });
    }

    if (clientId) {
      const clientSchedules = await FixedSchedule.find({ clienteId: clientId });
      const scheduleIds = clientSchedules.map(s => s._id);

      await FixedSchedule.deleteMany({ clienteId: clientId });

      const todayStr = new Date().toISOString().split('T')[0];
      await Appointment.deleteMany({
        fixedScheduleId: { $in: scheduleIds },
        status: 'agendado',
        data: { $gte: todayStr }
      });

      return NextResponse.json({ success: true, message: 'Todos os horários fixos do aluno foram removidos.' });
    }

    return NextResponse.json({ success: false, error: 'ID ou clientId não fornecido.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
