import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Contract from '@/models/Contract';
import Payment from '@/models/Payment';
import FixedSchedule from '@/models/FixedSchedule';
import Professional from '@/models/Professional';
import Appointment from '@/models/Appointment';
import { getContractValidityInfo } from '@/utils/contractValidity';

/**
 * Helper para gerar agendamentos na grade a partir de regras de horário fixo
 */
export async function generateAppointmentsForSchedulesList(schedules: any[]) {
  try {
    if (!schedules || schedules.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const defaultProf = await Professional.findOne();
    const defaultProfId = defaultProf?._id;

    const allAppointmentsToCreate: any[] = [];
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

      if (endDate < effectiveStart) continue;

      const targetDayOfWeek = Number(schedule.diaSemana);
      const current = new Date(effectiveStart);

      while (current.getDay() !== targetDayOfWeek) {
        current.setDate(current.getDate() + 1);
      }

      while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        scheduleDatePairs.push({ schedule, dateStr });
        current.setDate(current.getDate() + 7);
      }
    }

    if (scheduleDatePairs.length === 0) return 0;

    const rawClientIds = Array.from(new Set(schedules.map(s => s.clienteId)));
    const idStrings = rawClientIds.map(id => String(id?._id || id));
    const idObjects: any[] = [];
    const mongoose = require('mongoose');
    idStrings.forEach(id => {
      if (mongoose.Types.ObjectId.isValid(id)) {
        idObjects.push(new mongoose.Types.ObjectId(id));
      }
    });

    const dateStrings = Array.from(new Set(scheduleDatePairs.map(p => p.dateStr)));

    const existingAppointments = await Appointment.find({
      $or: [
        { clienteId: { $in: [...idStrings, ...idObjects] } },
        { clientId: { $in: [...idStrings, ...idObjects] } }
      ],
      data: { $in: dateStrings },
      status: { $ne: 'cancelado' }
    }).select('clienteId clientId data horario').lean();

    const existingSet = new Set(
      existingAppointments.map((a: any) => {
        const raw = a.clienteId || a.clientId;
        const cIdStr = String(raw?._id || raw);
        return `${cIdStr}_${a.data}_${a.horario}`;
      })
    );

    // Buscar profissionais para mapeamento de agendas dedicadas (Dr. Albert / Dr. Guilherme)
    const allProfs = await Professional.find({}).lean();
    const profMap = new Map<string, any>();
    allProfs.forEach((p: any) => profMap.set(String(p._id), p));

    for (const pair of scheduleDatePairs) {
      const cIdStr = String(pair.schedule.clienteId?._id || pair.schedule.clienteId);
      const key = `${cIdStr}_${pair.dateStr}_${pair.schedule.horario}`;
      if (!existingSet.has(key)) {
        existingSet.add(key); // Prevenir duplicação intra-lote
        const hasSpecificProf = Boolean(pair.schedule.profissionalId);
        const profId = pair.schedule.profissionalId || defaultProfId;
        if (profId) {
          let resolvedTipo: 'academia' | 'consultorio' | 'dr_albert' | 'dr_guilherme' = 'academia';

          if (hasSpecificProf) {
            const profObj = profMap.get(String(profId?._id || profId));
            const profName = (profObj?.nome || '').toLowerCase();
            const serv = (pair.schedule.servico || '').toLowerCase();
            const isDoctorAlbert = profName.includes('albert');
            const isDoctorGuilherme = profName.includes('guilherme');
            const isConsultorio = isDoctorAlbert || isDoctorGuilherme || serv.includes('avalia') || serv.includes('fisioterap') || serv.includes('consulta') || serv.includes('quiroprax') || serv.includes('individual');

            if (isDoctorAlbert) {
              resolvedTipo = 'dr_albert';
            } else if (isDoctorGuilherme) {
              resolvedTipo = 'dr_guilherme';
            } else if (isConsultorio) {
              resolvedTipo = 'consultorio';
            }
          } else {
            // Quando não há profissional específico (Treino / Geral - Agenda Geral)
            resolvedTipo = 'academia';
          }

          allAppointmentsToCreate.push({
            data: pair.dateStr,
            horario: pair.schedule.horario,
            tipo: resolvedTipo,
            servico: pair.schedule.servico || (resolvedTipo !== 'academia' ? 'Atendimento Individual' : 'Treino Monitorado'),
            consumeCredito: true,
            tipoCredito: 'academia',
            profissionalId: profId,
            clienteId: pair.schedule.clienteId,
            status: 'agendado',
            origemHorarioFixo: true,
            fixedScheduleId: pair.schedule._id
          });
        }
      }
    }

    if (allAppointmentsToCreate.length > 0) {
      await Appointment.insertMany(allAppointmentsToCreate);
    }

    return allAppointmentsToCreate.length;
  } catch (error) {
    console.error('Erro ao gerar agendamentos para fixedschedules:', error);
    return 0;
  }
}

/**
 * Recalcula e propaga a dataFim oficial do contrato/recorrência para todas as regras
 * de horário fixo do aluno e gera as aulas futuras na grade.
 */
export async function syncClientFixedSchedulesValidity(clientId: string) {
  try {
    await dbConnect();

    const client = await Client.findById(clientId).lean();
    if (!client) return { success: false, error: 'Cliente não encontrado' };

    const [payments, contracts, schedules] = await Promise.all([
      Payment.find({ clientId }).lean(),
      Contract.find({ clientId }).lean(),
      FixedSchedule.find({ clienteId: clientId })
    ]);

    if (!schedules || schedules.length === 0) {
      return { success: true, message: 'Cliente sem regras de horário fixo cadastradas.', updated: 0 };
    }

    const valInfo = getContractValidityInfo(client, payments, contracts);
    const officialDataFim = valInfo?.dataFim;

    if (!officialDataFim || valInfo.isExpired) {
      return { success: true, message: 'Cliente sem vigência ativa futura.', updated: 0 };
    }

    // Atualizar todas as regras do cliente que possuem vigência vinculada a contrato
    const updatedSchedules: any[] = [];
    for (const sched of schedules) {
      if (sched.dataFim !== officialDataFim) {
        sched.dataFim = officialDataFim;
        await sched.save();
        updatedSchedules.push(sched);
      } else {
        updatedSchedules.push(sched);
      }
    }

    const createdCount = await generateAppointmentsForSchedulesList(updatedSchedules);

    return {
      success: true,
      dataFim: officialDataFim,
      schedulesUpdated: updatedSchedules.length,
      appointmentsCreated: createdCount
    };
  } catch (error: any) {
    console.error('Erro ao sincronizar vigência de horários fixos do cliente:', error);
    return { success: false, error: error.message };
  }
}
