import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Contract from '@/models/Contract';
import Payment from '@/models/Payment';
import FixedSchedule from '@/models/FixedSchedule';
import Professional from '@/models/Professional';
import Appointment from '@/models/Appointment';
import { getContractValidityInfo } from '@/utils/contractValidity';

function safeFormatYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Helper para gerar agendamentos na grade a partir de regras de horário fixo
 * vinculando estritamente à AGENDA (tipo) e desacoplando profissionalId.
 */
export async function generateAppointmentsForSchedulesList(schedules: any[]) {
  try {
    if (!schedules || schedules.length === 0) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = safeFormatYYYYMMDD(today);

    const allAppointmentsToCreate: any[] = [];
    const scheduleDatePairs: { schedule: any; dateStr: string }[] = [];

    for (const schedule of schedules) {
      const parts = (schedule.dataInicio || todayStr).split('-');
      const startDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
      const effectiveStart = startDate < today ? today : startDate;

      let endDate: Date;
      if (schedule.dataFim) {
        const endParts = schedule.dataFim.split('-');
        endDate = new Date(Number(endParts[0]), Number(endParts[1]) - 1, Number(endParts[2]), 23, 59, 59);
      } else {
        endDate = new Date(effectiveStart);
        endDate.setDate(endDate.getDate() + 16 * 7); // 16 semanas à frente
      }

      if (endDate < effectiveStart) continue;

      const targetDayOfWeek = Number(schedule.diaSemana);
      const current = new Date(effectiveStart);

      while (current.getDay() !== targetDayOfWeek) {
        current.setDate(current.getDate() + 1);
      }

      const stepWeeks = Math.max(1, Number(schedule.intervaloSemanas) || (schedule.frequenciaRepeticao === 'quinzenal' ? 2 : schedule.frequenciaRepeticao === 'a_cada_3_semanas' ? 3 : 1));

      while (current <= endDate) {
        const dateStr = safeFormatYYYYMMDD(current);
        scheduleDatePairs.push({ schedule, dateStr });
        current.setDate(current.getDate() + 7 * stepWeeks);
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

        const profId = pair.schedule.profissionalId || null;
        let resolvedTipo: 'academia' | 'dr_albert' | 'dr_guilherme' = 'academia';

        if (profId) {
          const profObj = profMap.get(String(profId?._id || profId));
          const profName = (profObj?.nome || '').toLowerCase();
          if (profName.includes('albert')) {
            resolvedTipo = 'dr_albert';
          } else if (profName.includes('guilherme')) {
            resolvedTipo = 'dr_guilherme';
          }
        } else {
          // Quando não há profissional específico (Treino / Geral - Agenda Geral)
          resolvedTipo = 'academia';
        }

        allAppointmentsToCreate.push({
          data: pair.dateStr,
          horario: pair.schedule.horario,
          tipo: resolvedTipo,
          servico: pair.schedule.servico || 'Treino Monitorado',
          consumeCredito: true,
          tipoCredito: 'academia',
          profissionalId: resolvedTipo === 'academia' ? null : profId,
          clienteId: pair.schedule.clienteId,
          status: 'agendado',
          origemHorarioFixo: true,
          fixedScheduleId: pair.schedule._id
        });
      }
    }

    if (allAppointmentsToCreate.length > 0) {
      await Appointment.insertMany(allAppointmentsToCreate, { ordered: false });
    }

    return allAppointmentsToCreate.length;
  } catch (error) {
    console.error('Erro ao gerar agendamentos para fixedschedules:', error);
    return 0;
  }
}

/**
 * Recalcula e propaga a dataFim oficial do contrato/recorrência para todas as regras
 * de horário fixo do aluno e gera as aulas futuras na grade (16 semanas garantidas).
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = safeFormatYYYYMMDD(today);

    // Se o cliente não estiver expirado e a vigência for futura, atualizar dataFim
    const isFutureActive = officialDataFim && officialDataFim >= todayStr;
    const targetDataFim = isFutureActive ? officialDataFim : null;

    const updatedSchedules: any[] = [];
    for (const sched of schedules) {
      if (targetDataFim && sched.dataFim !== targetDataFim) {
        sched.dataFim = targetDataFim;
        await sched.save();
        updatedSchedules.push(sched);
      } else {
        updatedSchedules.push(sched);
      }
    }

    const createdCount = await generateAppointmentsForSchedulesList(updatedSchedules);

    return {
      success: true,
      dataFim: targetDataFim,
      schedulesUpdated: updatedSchedules.length,
      appointmentsCreated: createdCount
    };
  } catch (error: any) {
    console.error('Erro ao sincronizar vigência de horários fixos do cliente:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Sincronização em massa de TODOS os horários fixos de todos os alunos ativos,
 * reparando dataFim defasada e garantindo a grade preenchida nas próximas 16 semanas.
 */
export async function syncAllFixedSchedulesValidity() {
  try {
    await dbConnect();

    const allSchedules = await FixedSchedule.find({});
    if (!allSchedules || allSchedules.length === 0) {
      return { success: true, total: 0, appointmentsCreated: 0 };
    }

    const clientIds = Array.from(new Set(allSchedules.map(s => String(s.clienteId?._id || s.clienteId))));
    const [allClients, allContracts, allPayments] = await Promise.all([
      Client.find({ _id: { $in: clientIds } }).lean(),
      Contract.find({ clientId: { $in: clientIds } }).lean(),
      Payment.find({ clientId: { $in: clientIds } }).lean()
    ]);

    const clientMap = new Map<string, any>();
    allClients.forEach((c: any) => clientMap.set(String(c._id), c));

    const contractMap = new Map<string, any[]>();
    allContracts.forEach((ct: any) => {
      const cId = String(ct.clientId);
      if (!contractMap.has(cId)) contractMap.set(cId, []);
      contractMap.get(cId)!.push(ct);
    });

    const paymentMap = new Map<string, any[]>();
    allPayments.forEach((p: any) => {
      const cId = String(p.clientId);
      if (!paymentMap.has(cId)) paymentMap.set(cId, []);
      paymentMap.get(cId)!.push(p);
    });

    const todayStr = safeFormatYYYYMMDD(new Date());

    for (const sched of allSchedules) {
      const cId = String(sched.clienteId?._id || sched.clienteId);
      const client = clientMap.get(cId);
      if (client) {
        const contracts = contractMap.get(cId) || [];
        const payments = paymentMap.get(cId) || [];
        const valInfo = getContractValidityInfo(client, payments, contracts);

        if (valInfo?.dataFim && valInfo.dataFim >= todayStr) {
          if (sched.dataFim !== valInfo.dataFim) {
            sched.dataFim = valInfo.dataFim;
            await sched.save();
          }
        }
      }
    }

    const createdCount = await generateAppointmentsForSchedulesList(allSchedules);

    return {
      success: true,
      totalSchedules: allSchedules.length,
      appointmentsCreated: createdCount
    };
  } catch (error: any) {
    console.error('Erro na sincronização em massa de horários fixos:', error);
    return { success: false, error: error.message };
  }
}
