import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Appointment from '@/models/Appointment';
import AgendaConfig from '@/models/AgendaConfig';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const maxDuration = 30;

const SERVICOS_CONFIG: Record<string, { vagasOcupadas: number; tipo: 'academia' | 'consultorio' }> = {
  'Treino Monitorado':        { vagasOcupadas: 1, tipo: 'academia'    },
  'Treino Livre':             { vagasOcupadas: 0, tipo: 'academia'    },
  'Recovery':                 { vagasOcupadas: 1, tipo: 'academia'    },
  'Avaliação Física':         { vagasOcupadas: 3, tipo: 'academia'    },
  'Teste de Força':           { vagasOcupadas: 3, tipo: 'academia'    },
  'Avaliação Fisioterápica':  { vagasOcupadas: 3, tipo: 'academia'    },
  'Sessão de Fisioterapia':   { vagasOcupadas: 3, tipo: 'academia'    },
  'Quiropraxia':              { vagasOcupadas: 3, tipo: 'academia'    },
  'Recovery / Bota':          { vagasOcupadas: 1, tipo: 'academia'    },
  'Atendimento Individual':   { vagasOcupadas: 3, tipo: 'academia'    },
  'Pilates':                  { vagasOcupadas: 2, tipo: 'academia'    },
  'Funcional':                { vagasOcupadas: 2, tipo: 'academia'    },
  'Emergência':               { vagasOcupadas: 3, tipo: 'academia'    },
  'Massagem':                 { vagasOcupadas: 1, tipo: 'academia'    },
};

const VALID_WEEKDAYS = ['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00'];
const VALID_SATURDAYS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','12:00'];
const MAX_VAGAS_ACADEMIA = 6;
const ANTECEDENCIA_MIN_H = 2;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const data = searchParams.get('data');
    const diasSemanaParam = searchParams.get('diasSemana');
    const servico = searchParams.get('servico') || 'Treino Monitorado';
    const profissionalId = searchParams.get('profissionalId');

    if (!data && !diasSemanaParam) {
      return NextResponse.json({ success: false, error: 'Parâmetro data ou diasSemana é obrigatório.' }, { status: 400 });
    }

    const servicoConfig = SERVICOS_CONFIG[servico] || { vagasOcupadas: 1, tipo: 'academia' };

    // Se a consulta for para múltiplos dias da semana (ex: Horários Fixos)
    if (diasSemanaParam) {
      const dias = diasSemanaParam.split(',').map(d => Number(d.trim())).filter(d => !isNaN(d) && d >= 0 && d <= 6);
      if (dias.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      // Buscar slots disponíveis para cada dia e calcular a interseção
      let commonSlots: string[] | null = null;

      for (const dayOfWeek of dias) {
        if (dayOfWeek === 0) {
          commonSlots = [];
          break;
        }

        const defaultGrade = dayOfWeek === 6 ? VALID_SATURDAYS : VALID_WEEKDAYS;
        const additions = await AgendaConfig.find({
          tipo: servicoConfig.tipo,
          acao: 'adicionar',
          diaSemana: dayOfWeek,
          dataEspecifica: null
        });

        let grade = [...defaultGrade];
        for (const add of additions) {
          if (!grade.includes(add.horario)) {
            grade.push(add.horario);
          }
        }
        grade.sort((a, b) => a.localeCompare(b));

        const dayAvailableSlots: string[] = [];

        for (const horario of grade) {
          // Bloqueio específico por serviço
          const specificServiceBlock = await AgendaConfig.findOne({
            tipo: 'servico',
            servico: servico,
            horario,
            acao: 'bloquear',
            diaSemana: dayOfWeek,
            dataEspecifica: null
          });
          if (specificServiceBlock) continue;

          // Bloqueio geral da grade
          const customRule = await AgendaConfig.findOne({
            tipo: servicoConfig.tipo,
            horario,
            diaSemana: dayOfWeek,
            dataEspecifica: null
          });
          if (customRule && customRule.acao === 'bloquear') continue;

          dayAvailableSlots.push(horario);
        }

        if (commonSlots === null) {
          commonSlots = dayAvailableSlots;
        } else {
          commonSlots = commonSlots.filter(slot => dayAvailableSlots.includes(slot));
        }
      }

      return NextResponse.json({ 
        success: true, 
        data: commonSlots || [] 
      });
    }

    // Consulta para uma data específica
    if (data) {
      const session = await getServerSession(authOptions);
      if (session && session.user && (session.user as any).role === 'client') {
        const now = new Date();
        const utcStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
        const localNow = new Date(utcStr);

        const todayDayOfWeek = localNow.getDay();
        const todayHours = localNow.getHours();

        const daysUntilSaturday = 6 - todayDayOfWeek;
        const currentSaturday = new Date(localNow);
        currentSaturday.setDate(localNow.getDate() + daysUntilSaturday);
        currentSaturday.setHours(23, 59, 59, 999);

        const nextWeekReleased = (todayDayOfWeek === 5 && todayHours >= 18) || todayDayOfWeek === 6 || todayDayOfWeek === 0;

        const limitDate = new Date(currentSaturday);
        if (nextWeekReleased) {
          limitDate.setDate(currentSaturday.getDate() + 7);
        }

        const limitDateStr = limitDate.toLocaleDateString('sv-SE');
        if (data > limitDateStr) {
          return NextResponse.json({ success: true, data: [] });
        }
      }

      const parts = data.split('-');
      const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dayOfWeek = dateObj.getDay();

      // Domingo — clube fechado
      if (dayOfWeek === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      const defaultGrade = dayOfWeek === 6 ? VALID_SATURDAYS : VALID_WEEKDAYS;
      const additions = await AgendaConfig.find({
        tipo: servicoConfig.tipo,
        acao: 'adicionar',
        $or: [
          { dataEspecifica: data },
          { diaSemana: dayOfWeek, dataEspecifica: null }
        ]
      });

      let grade = [...defaultGrade];
      for (const add of additions) {
        if (!grade.includes(add.horario)) {
          grade.push(add.horario);
        }
      }
      grade.sort((a, b) => a.localeCompare(b));

      const agora = new Date();
      const nowBrStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const isSameDay = data === nowBrStr;

      // Buscar todos os agendamentos do dia
      const aptsFilter: any = {
        data,
        status: { $ne: 'cancelado' }
      };
      if (profissionalId) {
        aptsFilter.profissionalId = profissionalId;
      }

      const allApts = await Appointment.find(aptsFilter);
      const availableSlots: string[] = [];

      for (const horario of grade) {
        // Filtrar antecedência mínima de 2h para hoje
        if (isSameDay) {
          const dataHora = new Date(`${data}T${horario}:00-03:00`);
          const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
          if (diffHoras < ANTECEDENCIA_MIN_H) continue;
        }

        // 1. Verificar bloqueio específico por serviço
        const specificServiceBlock = await AgendaConfig.findOne({
          tipo: 'servico',
          servico: servico,
          horario,
          acao: 'bloquear',
          $or: [
            { dataEspecifica: data },
            { diaSemana: dayOfWeek, dataEspecifica: null }
          ]
        });
        if (specificServiceBlock) continue;

        // 2. Verificar customRule geral da grade (bloqueio ou capacidade)
        const customRule = await AgendaConfig.findOne({
          tipo: servicoConfig.tipo,
          horario,
          $or: [
            { dataEspecifica: data },
            { diaSemana: dayOfWeek, dataEspecifica: null }
          ]
        }).sort({ dataEspecifica: -1 });

        if (customRule && customRule.acao === 'bloquear') continue;

        const aptsNoHorario = allApts.filter(a => a.horario === horario);

        if (dayOfWeek === 6) {
          let maxSab = 4;
          if (customRule && customRule.acao === 'alterar_capacidade' && customRule.capacidadePersonalizada !== null) {
            maxSab = customRule.capacidadePersonalizada;
          }
          if (aptsNoHorario.length < maxSab) {
            availableSlots.push(horario);
          }
          continue;
        }

        // Seg-Sex: verificar capacidade da academia
        const gymApts = aptsNoHorario.filter(a => a.tipo === 'academia');
        const vagasTotais = gymApts.reduce((sum, apt) => {
          const cfg = SERVICOS_CONFIG[apt.servico] || { vagasOcupadas: 1 };
          return sum + cfg.vagasOcupadas;
        }, 0);

        // Determinar limite máximo de vagas
        const specificServiceCapacity = await AgendaConfig.findOne({
          tipo: 'servico',
          servico: servico,
          horario,
          acao: 'alterar_capacidade',
          $or: [
            { dataEspecifica: data },
            { diaSemana: dayOfWeek, dataEspecifica: null }
          ]
        }).sort({ dataEspecifica: -1 });

        let maxVagas = MAX_VAGAS_ACADEMIA;
        if (specificServiceCapacity && specificServiceCapacity.capacidadePersonalizada !== null) {
          maxVagas = specificServiceCapacity.capacidadePersonalizada;
        } else if (customRule && customRule.acao === 'alterar_capacidade' && customRule.capacidadePersonalizada !== null) {
          maxVagas = customRule.capacidadePersonalizada;
        }

        // Verificar se há vagas suficientes
        if (vagasTotais + servicoConfig.vagasOcupadas > maxVagas) continue;

        availableSlots.push(horario);
      }

      return NextResponse.json({ success: true, data: availableSlots });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

