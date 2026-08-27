import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import FixedSchedule from '@/models/FixedSchedule';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import Appointment from '@/models/Appointment';

export const maxDuration = 30;

// Helper otimizado para gerar agendamentos reais na grade a partir de regras de horário fixo
async function generateAppointmentsForFixedSchedules(schedules: any[]) {
  try {
    if (!schedules || schedules.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const defaultProf = await Professional.findOne();
    const defaultProfId = defaultProf?._id;

    const allAppointmentsToCreate: any[] = [];
    const allCandidateDatesByClient: { clienteId: string; dateStr: string; horario: string }[] = [];

    // Pre-calcular todas as datas para todas as regras
    const scheduleDatePairs: { schedule: any; dateStr: string }[] = [];

    for (const schedule of schedules) {
      const startDate = new Date((schedule.dataInicio || today.toISOString().split('T')[0]) + 'T12:00:00');
      const effectiveStart = startDate < today ? today : startDate;

      let endDate: Date;
      if (schedule.dataFim) {
        endDate = new Date(schedule.dataFim + 'T23:59:59');
      } else {
        endDate = new Date(effectiveStart);
        endDate.setDate(endDate.getDate() + 16 * 7); // 16 semanas
      }

      const targetDayOfWeek = Number(schedule.diaSemana);
      const current = new Date(effectiveStart);

      while (current.getDay() !== targetDayOfWeek) {
        current.setDate(current.getDate() + 1);
      }

      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        scheduleDatePairs.push({ schedule, dateStr });
        allCandidateDatesByClient.push({
          clienteId: String(schedule.clienteId),
          dateStr,
          horario: schedule.horario
        });
        current.setDate(current.getDate() + 7);
      }
    }

    if (scheduleDatePairs.length === 0) return;

    // Buscar agendamentos existentes de uma só vez em lote
    const clientIds = Array.from(new Set(schedules.map(s => s.clienteId)));
    const dateStrings = Array.from(new Set(scheduleDatePairs.map(p => p.dateStr)));

    const existingAppointments = await Appointment.find({
      clienteId: { $in: clientIds },
      data: { $in: dateStrings },
      status: { $ne: 'cancelado' }
    }).select('clienteId data horario').lean();

    const existingSet = new Set(
      existingAppointments.map((a: any) => `${a.clienteId}_${a.data}_${a.horario}`)
    );

    for (const pair of scheduleDatePairs) {
      const key = `${pair.schedule.clienteId}_${pair.dateStr}_${pair.schedule.horario}`;
      if (!existingSet.has(key)) {
        const profId = pair.schedule.profissionalId || defaultProfId;
        if (profId) {
          const serv = (pair.schedule.servico || '').toLowerCase();
          const isConsultorio = serv.includes('avalia') || serv.includes('fisioterap') || serv.includes('consulta') || serv.includes('quiroprax') || Boolean(pair.schedule.profissionalId);

          allAppointmentsToCreate.push({
            data: pair.dateStr,
            horario: pair.schedule.horario,
            tipo: isConsultorio ? 'consultorio' : 'academia',
            servico: pair.schedule.servico || (isConsultorio ? 'Avaliação Fisioterápica' : 'Treino Monitorado'),
            consumeCredito: true,
            tipoCredito: isConsultorio ? 'consultorio' : 'academia',
            profissionalId: profId,
            clienteId: pair.schedule.clienteId,
            status: 'agendado',
            origemHorarioFixo: true,
            fixedScheduleId: pair.schedule._id
          });
          existingSet.add(key); // evitar duplicatas dentro do mesmo lote
        }
      }
    }

    if (allAppointmentsToCreate.length > 0) {
      await Appointment.insertMany(allAppointmentsToCreate, { ordered: false });
    }
  } catch (err) {
    console.error('Erro ao gerar agendamentos em lote para horários fixos:', err);
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
      await generateAppointmentsForFixedSchedules(allSchedules);
      return NextResponse.json({ success: true, message: 'Todas as regras foram sincronizadas com a grade da agenda.' });
    }

    if (!clienteId || !servico || !dataInicio) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes (clienteId, servico, dataInicio).' }, { status: 400 });
    }

    // Sanitização de dataFim: se vier dataFim no passado (< dataInicio), corrigir ou anular para modo contínuo
    let validDataFim = dataFim || null;
    if (validDataFim && validDataFim < dataInicio) {
      const clientObj = await Client.findById(clienteId);
      const com = clientObj?.dadosComerciais || {};
      if (com.vencimento && com.vencimento >= dataInicio) {
        validDataFim = com.vencimento;
      } else if (com.dataFim && com.dataFim >= dataInicio) {
        validDataFim = com.dataFim;
      } else {
        validDataFim = null;
      }
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
          dataFim: validDataFim
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
        dataFim: validDataFim
      });
    } else {
      return NextResponse.json({ success: false, error: 'Nenhum dia ou horário informado.' }, { status: 400 });
    }

    const createdSchedules = await FixedSchedule.insertMany(itemsToCreate);

    // Gerar agendamentos reais em lote de forma instantânea
    await generateAppointmentsForFixedSchedules(createdSchedules);

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
