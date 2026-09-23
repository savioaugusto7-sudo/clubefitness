import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Appointment from '@/models/Appointment';
import AgendaConfig from '@/models/AgendaConfig';
import Professional from '@/models/Professional';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const maxDuration = 30;

const SERVICOS_CONFIG: Record<string, { vagasOcupadas: number; tipo: 'academia' | 'dr_guilherme' | 'dr_albert' }> = {
  'Treino Monitorado':        { vagasOcupadas: 1, tipo: 'academia'    },
  'Treino Livre':             { vagasOcupadas: 0, tipo: 'academia'    },
  'Recovery':                 { vagasOcupadas: 1, tipo: 'academia'    },
  'Massagem':                 { vagasOcupadas: 1, tipo: 'academia'    },
  'Avaliação Física':         { vagasOcupadas: 3, tipo: 'academia'    },
  'Teste de Força':           { vagasOcupadas: 3, tipo: 'academia'    },
  'Avaliação Fisioterápica':                { vagasOcupadas: 3, tipo: 'academia'    },
  'Avaliação Fisioterápica (Continuação)':  { vagasOcupadas: 3, tipo: 'academia'    },
  'Emergência':               { vagasOcupadas: 3, tipo: 'academia'    },
  'Terapia Manual':           { vagasOcupadas: 3, tipo: 'academia'    },
  'Atendimento Individual':   { vagasOcupadas: 1, tipo: 'academia'    },
  'Consulta':                 { vagasOcupadas: 1, tipo: 'dr_albert'    },
  'Quiropraxia':              { vagasOcupadas: 1, tipo: 'dr_albert'    },
};

// Horários padrão de base (de hora em hora, sem slots de meia hora)
const DEFAULT_HOURS_WEEKDAY = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00'
];

const DEFAULT_HOURS_DOCTOR = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', 
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', 
  '18:00', '19:00', '20:00', '21:00', '22:00'
];

const DEFAULT_HOURS_SATURDAY_MASSAGEM = [
  '09:50', '10:40', '11:30', '12:25'
];

const DEFAULT_HOURS_SATURDAY_OTHER = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00'
];

const MAX_VAGAS_ACADEMIA = 6;
const ANTECEDENCIA_MIN_H = 2;

function getDefaultGrade(dayOfWeek: number, servico: string, resolvedTipo: string): string[] {
  if (dayOfWeek === 0) {
    return []; // Domingo fechado por padrão (a menos que haja regra 'adicionar' na AgendaConfig)
  }
  if (dayOfWeek === 6) {
    if (servico === 'Massagem') {
      return [...DEFAULT_HOURS_SATURDAY_MASSAGEM];
    }
    if (resolvedTipo === 'dr_albert' || resolvedTipo === 'dr_guilherme') {
      return []; // Médicos aos sábados somente com Horário Extra adicionado
    }
    return [...DEFAULT_HOURS_SATURDAY_OTHER];
  }
  if (resolvedTipo === 'dr_albert' || resolvedTipo === 'dr_guilherme') {
    return [...DEFAULT_HOURS_DOCTOR];
  }
  return [...DEFAULT_HOURS_WEEKDAY];
}

function getBaseCapacity(dayOfWeek: number, servico: string, resolvedTipo: string): number {
  if (resolvedTipo === 'dr_guilherme') return 1;
  if (resolvedTipo === 'dr_albert') return 2;
  if (dayOfWeek === 6 && servico === 'Massagem') return 1;
  return MAX_VAGAS_ACADEMIA;
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const data = searchParams.get('data');
    const diasSemanaParam = searchParams.get('diasSemana');
    const servico = searchParams.get('servico') || 'Treino Monitorado';
    const profissionalId = searchParams.get('profissionalId');
    const clienteId = searchParams.get('clienteId');

    if (!data && !diasSemanaParam) {
      return NextResponse.json({ success: false, error: 'Parâmetro data ou diasSemana é obrigatório.' }, { status: 400 });
    }

    const servicoConfig = SERVICOS_CONFIG[servico] || { vagasOcupadas: 1, tipo: 'academia' };
    let resolvedTipo: string = servicoConfig.tipo;
    if (profissionalId) {
      const prof = await Professional.findById(profissionalId).lean() as any;
      const pName = (prof?.nome || '').toLowerCase();
      if (pName.includes('albert')) resolvedTipo = 'dr_albert';
      else if (pName.includes('guilherme')) resolvedTipo = 'dr_guilherme';
    }

    // Se a consulta for para múltiplos dias da semana (ex: Horários Fixos)
    if (diasSemanaParam) {
      const dias = diasSemanaParam.split(',').map(d => Number(d.trim())).filter(d => !isNaN(d) && d >= 0 && d <= 6);
      if (dias.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      let commonSlots: string[] | null = null;

      for (const dayOfWeek of dias) {
        if (dayOfWeek === 0) {
          commonSlots = [];
          break;
        }

        const defaultGrade = getDefaultGrade(dayOfWeek, servico, resolvedTipo);
        const configs = await AgendaConfig.find({
          $and: [
            {
              $or: [
                { tipo: resolvedTipo },
                { tipo: 'servico', servico: servico },
                { tipo: null },
                { tipo: { $exists: false } }
              ]
            },
            { diaSemana: dayOfWeek, dataEspecifica: null }
          ]
        }).lean();

        const isMatching = (r: any) => {
          if (r.tipo === 'servico') return r.servico === servico;
          if (r.tipo) return r.tipo === resolvedTipo;
          return true;
        };
        const rules = configs.filter(isMatching);

        const getActiveRule = (h: string) => {
          const servRule = rules.find(r => r.horario === h && r.tipo === 'servico');
          if (servRule) return servRule;
          return rules.find(r => r.horario === h);
        };

        let grade = [...defaultGrade];
        // Acrescentar horários configurados na agenda
        for (const r of rules) {
          if (r.acao === 'adicionar' && !grade.includes(r.horario)) {
            const active = getActiveRule(r.horario);
            if (active && active.acao !== 'bloquear') {
              grade.push(r.horario);
            }
          }
        }

        // Excluir horários bloqueados na agenda
        grade = grade.filter(h => {
          const active = getActiveRule(h);
          if (active && active.acao === 'bloquear') return false;
          if (active && active.acao === 'alterar_capacidade' && active.capacidadePersonalizada !== null && active.capacidadePersonalizada <= 0) {
            return false;
          }
          return true;
        });

        grade.sort((a, b) => a.localeCompare(b));

        if (commonSlots === null) {
          commonSlots = grade;
        } else {
          commonSlots = commonSlots.filter(slot => grade.includes(slot));
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

      const defaultGrade = getDefaultGrade(dayOfWeek, servico, resolvedTipo);

      // Buscar regras dinâmicas da AgendaConfig para a data específica ou recorrente do dia da semana
      const configs = await AgendaConfig.find({
        $and: [
          {
            $or: [
              { tipo: resolvedTipo },
              { tipo: 'servico', servico: servico },
              { tipo: null },
              { tipo: { $exists: false } }
            ]
          },
          {
            $or: [
              { dataEspecifica: data },
              { diaSemana: dayOfWeek, dataEspecifica: null }
            ]
          }
        ]
      }).lean();

      const isMatching = (r: any) => {
        if (r.tipo === 'servico') return r.servico === servico;
        if (r.tipo) return r.tipo === resolvedTipo;
        return true;
      };

      const rules = configs.filter(isMatching);
      const specificRules = rules.filter(r => r.dataEspecifica === data);
      const recurringRules = rules.filter(r => r.diaSemana === dayOfWeek && !r.dataEspecifica);

      const getActiveRule = (h: string) => {
        // Regra de data específica por serviço
        const specServ = specificRules.find(r => r.horario === h && r.tipo === 'servico');
        if (specServ) return specServ;
        // Regra de data específica geral
        const spec = specificRules.find(r => r.horario === h);
        if (spec) return spec;
        // Regra recorrente por serviço
        const recServ = recurringRules.find(r => r.horario === h && r.tipo === 'servico');
        if (recServ) return recServ;
        // Regra recorrente geral
        return recurringRules.find(r => r.horario === h);
      };

      let grade = [...defaultGrade];

      // 1. Acrescentar horários adicionados na agenda
      for (const r of rules) {
        if (r.acao === 'adicionar' && !grade.includes(r.horario)) {
          const active = getActiveRule(r.horario);
          if (active && active.acao !== 'bloquear') {
            grade.push(r.horario);
          }
        }
      }

      // 2. Excluir horários bloqueados na agenda
      grade = grade.filter(h => {
        const active = getActiveRule(h);
        return !active || active.acao !== 'bloquear';
      });

      grade.sort((a, b) => a.localeCompare(b));

      const agora = new Date();
      const nowBrStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const isSameDay = data === nowBrStr;

      // Buscar agendamentos existentes no dia
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
        // Filtrar antecedência mínima de 2 horas para o dia de hoje
        if (isSameDay) {
          const dataHora = new Date(`${data}T${horario}:00-03:00`);
          const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
          if (diffHoras < ANTECEDENCIA_MIN_H) continue;
        }

        // Obter regra ativa para verificação de vagas / capacidade personalizada
        const activeRule = getActiveRule(horario);
        let maxVagas = getBaseCapacity(dayOfWeek, servico, resolvedTipo);

        if (activeRule && activeRule.acao === 'alterar_capacidade' && activeRule.capacidadePersonalizada !== null) {
          maxVagas = activeRule.capacidadePersonalizada;
        }

        // Se capacidade personalizada for 0 ou menor, o horário não tem vagas
        if (maxVagas <= 0) continue;

        const aptsNoHorario = allApts.filter(a => a.horario === horario);

        // Se clienteId foi informado, verificar se o aluno já possui agendamento neste horário
        if (clienteId && aptsNoHorario.some(a => {
          const cId = a.clienteId?._id?.toString() || a.clienteId?.toString();
          return cId === clienteId;
        })) {
          continue;
        }

        // Validação de vagas por tipo de serviço
        if (dayOfWeek === 6 && servico === 'Massagem') {
          // Sábado: Massagem é 1 por horário (ou maxVagas personalizado)
          if (aptsNoHorario.length >= maxVagas) continue;
          availableSlots.push(horario);
          continue;
        }

        if (resolvedTipo === 'academia') {
          const gymApts = aptsNoHorario.filter(a => a.tipo === 'academia' || !a.tipo);
          const vagasOcupadasNoHorario = gymApts.reduce((sum, apt) => {
            const cfg = SERVICOS_CONFIG[apt.servico] || { vagasOcupadas: 1 };
            return sum + cfg.vagasOcupadas;
          }, 0);

          if (servico === 'Treino Livre') {
            const countTreinoLivre = gymApts.filter(a => a.servico === 'Treino Livre').length;
            const tetoLivre = Math.min(3, maxVagas);
            if (countTreinoLivre >= tetoLivre) continue;
            if (vagasOcupadasNoHorario >= maxVagas) continue;
          } else {
            if (vagasOcupadasNoHorario + servicoConfig.vagasOcupadas > maxVagas) continue;
          }

          availableSlots.push(horario);
        } else {
          // Consultório (dr_albert / dr_guilherme)
          const docApts = aptsNoHorario.filter(a => a.tipo === resolvedTipo);
          if (docApts.length + servicoConfig.vagasOcupadas > maxVagas) continue;
          availableSlots.push(horario);
        }
      }

      return NextResponse.json({ success: true, data: availableSlots });
    }

    return NextResponse.json({ success: true, data: [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
