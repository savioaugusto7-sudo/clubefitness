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
        existingSet.add(key); // evitar duplicatas dentro do mesmo lote
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

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, clienteId, oldProfessionalId, profissionalId, slots, diaSemana, horario, servico, dataInicio, dataFim } = body;

    const todayStr = new Date().toISOString().split('T')[0];

    // Modo 1: Atualização em lote de regras de um Aluno / Agenda
    if (clienteId && Array.isArray(slots)) {
      const filter: any = { clienteId };
      if (oldProfessionalId !== undefined) {
        filter.profissionalId = oldProfessionalId || null;
      }

      // Localizar regras antigas
      const oldSchedules = await FixedSchedule.find(filter);
      const oldIds = oldSchedules.map(s => s._id);

      // Deletar agendamentos futuros dessas regras antigas
      if (oldIds.length > 0) {
        await Appointment.deleteMany({
          fixedScheduleId: { $in: oldIds },
          status: 'agendado',
          data: { $gte: todayStr }
        });
        await FixedSchedule.deleteMany({ _id: { $in: oldIds } });
      }

      // Inserir novos slots se houver
      if (slots.length > 0) {
        const itemsToCreate = slots.map(slot => ({
          clienteId,
          profissionalId: profissionalId !== undefined ? (profissionalId || null) : (oldProfessionalId || null),
          diaSemana: Number(slot.diaSemana),
          horario: slot.horario,
          servico: servico || 'Treino Monitorado',
          dataInicio: dataInicio || todayStr,
          dataFim: dataFim || null
        }));

        const created = await FixedSchedule.insertMany(itemsToCreate);
        await generateAppointmentsForFixedSchedules(created);
        return NextResponse.json({ success: true, message: 'Regras do aluno atualizadas com sucesso.', data: created });
      }

      return NextResponse.json({ success: true, message: 'Regras antigas removidas com sucesso.' });
    }

    // Modo 2: Atualização de uma única regra pelo ID
    if (id) {
      const existing = await FixedSchedule.findById(id);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Regra de horário fixo não encontrada.' }, { status: 404 });
      }

      // Remover agendamentos futuros da versão anterior
      await Appointment.deleteMany({
        fixedScheduleId: id,
        status: 'agendado',
        data: { $gte: todayStr }
      });

      if (diaSemana !== undefined) existing.diaSemana = Number(diaSemana);
      if (horario) existing.horario = horario;
      if (servico) existing.servico = servico;
      if (dataInicio) existing.dataInicio = dataInicio;
      if (dataFim !== undefined) existing.dataFim = dataFim || null;
      if (profissionalId !== undefined) existing.profissionalId = profissionalId || null;

      await existing.save();
      await generateAppointmentsForFixedSchedules([existing]);

      return NextResponse.json({ success: true, message: 'Horário fixo atualizado com sucesso.', data: existing });
    }

    return NextResponse.json({ success: false, error: 'ID ou dados do aluno insuficientes para atualização.' }, { status: 400 });
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

