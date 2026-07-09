import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Appointment from '@/models/Appointment';
import AgendaConfig from '@/models/AgendaConfig';

const SERVICOS_CONFIG: Record<string, { vagasOcupadas: number; tipo: 'academia' | 'consultorio' }> = {
  'Treino Monitorado':        { vagasOcupadas: 1, tipo: 'academia'    },
  'Treino Livre':             { vagasOcupadas: 0, tipo: 'academia'    },
  'Recovery':                 { vagasOcupadas: 1, tipo: 'academia'    },
  'Avaliação Física':         { vagasOcupadas: 3, tipo: 'academia'    },
  'Teste de Força':           { vagasOcupadas: 3, tipo: 'academia'    },
  'Avaliação Fisioterápica':  { vagasOcupadas: 3, tipo: 'academia' },
  'Emergência':               { vagasOcupadas: 3, tipo: 'academia'    },
  'Massagem':                 { vagasOcupadas: 1, tipo: 'academia'    },
};

const VALID_WEEKDAYS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
const VALID_SATURDAYS = ['09:50','10:40','11:30','12:25'];
const CAPACIDADE_POR_PROFISSIONAL = 3;
const MAX_VAGAS_ACADEMIA = 6;
const ANTECEDENCIA_MIN_H = 2;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const data = searchParams.get('data');
    const servico = searchParams.get('servico');

    if (!data || !servico) {
      return NextResponse.json({ success: false, error: 'Parâmetros data e servico são obrigatórios.' }, { status: 400 });
    }

    const servicoConfig = SERVICOS_CONFIG[servico];
    if (!servicoConfig) {
      return NextResponse.json({ success: false, error: `Serviço desconhecido: ${servico}` }, { status: 400 });
    }

    const parts = data.split('-');
    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    const dayOfWeek = dateObj.getDay();

    // Domingo — clube fechado
    if (dayOfWeek === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Sábado: apenas Massagem é permitida; outros serviços não têm horários disponíveis
    if (dayOfWeek === 6 && servico !== 'Massagem') {
      return NextResponse.json({ success: true, data: [] });
    }
    // Seg-Sex: Massagem não tem horários disponíveis
    if (dayOfWeek !== 6 && servico === 'Massagem') {
      return NextResponse.json({ success: true, data: [] });
    }

    // 1. Determinar grade dinâmica (incluindo horários extras adicionados)
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
    const isSameDay = data === agora.toISOString().slice(0, 10);

    // Buscar todos os agendamentos do dia
    const allApts = await Appointment.find({
      data,
      status: { $ne: 'cancelado' }
    });

    const availableSlots: string[] = [];

    for (const horario of grade) {
      // Filtrar antecedência mínima de 2h para hoje
      if (isSameDay) {
        const dataHora = new Date(`${data}T${horario}:00`);
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
        // Sábado: apenas 1 vaga total por padrão ou capacidade personalizada
        let maxSab = 1;
        if (customRule && customRule.acao === 'alterar_capacidade' && customRule.capacidadePersonalizada !== null) {
          maxSab = customRule.capacidadePersonalizada;
        }
        if (aptsNoHorario.filter(a => a.status !== 'cancelado').length < maxSab) {
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

      // Determinar limite máximo de vagas (específico do serviço ou geral da grade)
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

      // Verificar se há vagas totais suficientes
      if (vagasTotais + servicoConfig.vagasOcupadas > maxVagas) continue;

      availableSlots.push(horario);
    }

    return NextResponse.json({ success: true, data: availableSlots });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
