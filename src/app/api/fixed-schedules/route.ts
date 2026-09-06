import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import FixedSchedule from '@/models/FixedSchedule';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import Appointment from '@/models/Appointment';
import AgendaConfig from '@/models/AgendaConfig';

export const maxDuration = 30;

const SERVICOS_CONFIG: Record<string, { vagasOcupadas: number }> = {
  'Treino Monitorado':        { vagasOcupadas: 1 },
  'Treino Livre':             { vagasOcupadas: 0 },
  'Recovery':                 { vagasOcupadas: 1 },
  'Avaliação Física':         { vagasOcupadas: 3 },
  'Teste de Força':           { vagasOcupadas: 3 },
  'Avaliação Fisioterápica':                { vagasOcupadas: 3 },
  'Avaliação Fisioterápica (Continuação)':  { vagasOcupadas: 3 },
  'Emergência':                             { vagasOcupadas: 3 },
  'Terapia Manual':           { vagasOcupadas: 3 },
  'Sessão de Fisioterapia':   { vagasOcupadas: 3 },
  'Atendimento Individual':   { vagasOcupadas: 3 },
  'Pilates':                  { vagasOcupadas: 2 },
  'Funcional':                { vagasOcupadas: 2 },
  'Massagem':                 { vagasOcupadas: 1 },
  'Consulta':                 { vagasOcupadas: 1 },
  'Quiropraxia':              { vagasOcupadas: 1 }
};

function getCapacidadeBase(tipo: string): number {
  if (tipo === 'dr_albert') return 2;
  if (tipo === 'dr_guilherme') return 1;
  return 6;
}

// Helper otimizado para gerar agendamentos reais na grade a partir de regras de horário fixo
async function generateAppointmentsForFixedSchedules(
  schedules: any[],
  excecoes?: Array<{ dataOriginal: string; acao: 'outro_horario' | 'outro_dia' | 'pular'; novaData?: string; novoHorario?: string }>
) {
  try {
    if (!schedules || schedules.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const defaultProf = await Professional.findOne();
    const defaultProfId = defaultProf?._id;

    // Mapa de exceções para busca rápida
    const exceptionMap = new Map<string, { acao: 'outro_horario' | 'outro_dia' | 'pular'; novaData?: string; novoHorario?: string }>();
    if (Array.isArray(excecoes)) {
      for (const exc of excecoes) {
        if (exc.dataOriginal) {
          exceptionMap.set(exc.dataOriginal, exc);
        }
      }
    }

    // Pre-calcular todas as datas para todas as regras
    const scheduleDatePairs: { schedule: any; dateStr: string; horario: string }[] = [];

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
        const exc = exceptionMap.get(dateStr);

        if (exc) {
          if (exc.acao === 'pular') {
            // Pular esta data específica
            current.setDate(current.getDate() + 7);
            continue;
          } else if (exc.acao === 'outro_horario' && exc.novoHorario) {
            scheduleDatePairs.push({ schedule, dateStr, horario: exc.novoHorario });
          } else if (exc.acao === 'outro_dia' && exc.novaData) {
            scheduleDatePairs.push({ schedule, dateStr: exc.novaData, horario: exc.novoHorario || schedule.horario });
          } else {
            scheduleDatePairs.push({ schedule, dateStr, horario: schedule.horario });
          }
        } else {
          scheduleDatePairs.push({ schedule, dateStr, horario: schedule.horario });
        }

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
      data: { $in: dateStrings },
      status: { $ne: 'cancelado' }
    }).populate('profissionalId').lean();

    const existingSet = new Set(
      existingAppointments
        .filter((a: any) => {
          const raw = a.clienteId || a.clientId;
          const cIdStr = String(raw?._id || raw);
          return idStrings.includes(cIdStr);
        })
        .map((a: any) => {
          const raw = a.clienteId || a.clientId;
          const cIdStr = String(raw?._id || raw);
          return `${cIdStr}_${a.data}_${a.horario}`;
        })
    );

    // Buscar configurações de capacidade customizadas
    const configs = await AgendaConfig.find({
      $or: [
        { dataEspecifica: { $in: dateStrings } },
        { diaSemana: { $in: [1, 2, 3, 4, 5, 6] }, dataEspecifica: null }
      ]
    }).lean();

    // Buscar profissionais para mapeamento de agendas dedicadas (Dr. Albert / Dr. Guilherme)
    const allProfs = await Professional.find({}).lean();
    const profMap = new Map<string, any>();
    allProfs.forEach((p: any) => profMap.set(String(p._id), p));

    const allAppointmentsToCreate: any[] = [];
    const localOccupancyMap = new Map<string, number>();

    for (const pair of scheduleDatePairs) {
      const cIdStr = String(pair.schedule.clienteId?._id || pair.schedule.clienteId);
      const key = `${cIdStr}_${pair.dateStr}_${pair.horario}`;

      if (!existingSet.has(key)) {
        existingSet.add(key); // evitar duplicatas dentro do mesmo lote
        const hasSpecificProf = Boolean(pair.schedule.profissionalId);
        const profId = pair.schedule.profissionalId || defaultProfId;

        if (profId) {
          let resolvedTipo: 'academia' | 'dr_albert' | 'dr_guilherme' = 'academia';

          if (hasSpecificProf) {
            const profObj = profMap.get(String(profId?._id || profId));
            const profName = (profObj?.nome || '').toLowerCase();
            if (profName.includes('albert')) {
              resolvedTipo = 'dr_albert';
            } else if (profName.includes('guilherme')) {
              resolvedTipo = 'dr_guilherme';
            }
          }

          // Resolver capacidade e ocupação do slot para garantir que não haja overbooking
          const slotKey = `${pair.dateStr}_${pair.horario}_${resolvedTipo}`;
          const capacidadeBase = getCapacidadeBase(resolvedTipo);

          const parts = pair.dateStr.split('-');
          const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          const dayOfW = dObj.getDay();

          const customCap = configs.find((c: any) => c.horario === pair.horario && c.acao === 'alterar_capacidade' && (c.dataEspecifica === pair.dateStr || (c.diaSemana === dayOfW && !c.dataEspecifica)));
          const maxCap = customCap?.capacidadePersonalizada !== undefined && customCap?.capacidadePersonalizada !== null
            ? customCap.capacidadePersonalizada
            : capacidadeBase;

          // Calcular ocupação existente + novos a criar
          let existingOccupancy = 0;
          const matchingExisting = existingAppointments.filter((a: any) => {
            if (a.data !== pair.dateStr || a.horario !== pair.horario) return false;
            if (resolvedTipo === 'dr_albert') {
              const pName = (a.profissionalId?.nome || a.profissionalId?.dadosPessoais?.nome || '').toLowerCase();
              return a.tipo === 'dr_albert' || (a.tipo !== 'academia' && pName.includes('albert'));
            }
            if (resolvedTipo === 'dr_guilherme') {
              const pName = (a.profissionalId?.nome || a.profissionalId?.dadosPessoais?.nome || '').toLowerCase();
              return a.tipo === 'dr_guilherme' || (a.tipo !== 'academia' && pName.includes('guilherme'));
            }
            return (a.tipo || 'academia') === 'academia';
          });

          if (resolvedTipo === 'dr_albert' || resolvedTipo === 'dr_guilherme') {
            existingOccupancy = matchingExisting.length;
          } else {
            existingOccupancy = matchingExisting.reduce((sum: number, apt: any) => {
              const cfg = SERVICOS_CONFIG[apt.servico] || { vagasOcupadas: 1 };
              return sum + cfg.vagasOcupadas;
            }, 0);
          }

          const currentBatchAdded = localOccupancyMap.get(slotKey) || 0;
          const serviceWeight = resolvedTipo === 'academia'
            ? (SERVICOS_CONFIG[pair.schedule.servico]?.vagasOcupadas !== undefined ? SERVICOS_CONFIG[pair.schedule.servico].vagasOcupadas : 1)
            : 1;

          if (existingOccupancy + currentBatchAdded + serviceWeight <= maxCap) {
            localOccupancyMap.set(slotKey, currentBatchAdded + serviceWeight);

            allAppointmentsToCreate.push({
              data: pair.dateStr,
              horario: pair.horario,
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
          } else {
            console.warn(`[FixedSchedules] Slot ${pair.dateStr} às ${pair.horario} (${resolvedTipo}) atingiu capacidade (${existingOccupancy + currentBatchAdded}/${maxCap}). Agendamento excedente bloqueado.`);
          }
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
    const { clienteId, profissionalId, slots, diaSemana, horario, servico, dataInicio, duracaoSemanas, dataFim, excecoes, syncAll } = body;

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

    // Gerar agendamentos reais em lote de forma instantânea com suporte a exceções
    await generateAppointmentsForFixedSchedules(createdSchedules, excecoes);

    return NextResponse.json({ success: true, data: createdSchedules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, clienteId, oldProfessionalId, profissionalId, slots, diaSemana, horario, servico, dataInicio, dataFim, excecoes } = body;

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
        await generateAppointmentsForFixedSchedules(created, excecoes);
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
      await generateAppointmentsForFixedSchedules([existing], excecoes);

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

