import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Appointment from '@/models/Appointment';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import AgendaConfig from '@/models/AgendaConfig';

// Configuração de Serviços — Regras de Crédito e Capacidade
const SERVICOS_CONFIG: Record<string, {
  tipoCredito: 'academia' | 'massagem' | 'emergencia' | 'nenhum';
  vagasOcupadas: number;
  exclusivoPorProfissional: boolean;
  tipo: 'academia' | 'consultorio';
}> = {
  'Treino Monitorado':        { tipoCredito: 'academia',   vagasOcupadas: 1, exclusivoPorProfissional: false, tipo: 'academia'    },
  'Treino Livre':             { tipoCredito: 'nenhum',     vagasOcupadas: 0, exclusivoPorProfissional: false, tipo: 'academia'    },
  'Recovery':                 { tipoCredito: 'nenhum',     vagasOcupadas: 1, exclusivoPorProfissional: false, tipo: 'academia'    },
  'Avaliação Física':         { tipoCredito: 'academia',   vagasOcupadas: 3, exclusivoPorProfissional: true,  tipo: 'academia'    },
  'Teste de Força':           { tipoCredito: 'academia',   vagasOcupadas: 3, exclusivoPorProfissional: true,  tipo: 'academia'    },
  'Avaliação Fisioterápica':  { tipoCredito: 'academia',   vagasOcupadas: 3, exclusivoPorProfissional: true,  tipo: 'academia' },
  'Emergência':               { tipoCredito: 'emergencia', vagasOcupadas: 3, exclusivoPorProfissional: true,  tipo: 'academia'    },
  'Massagem':                 { tipoCredito: 'massagem',   vagasOcupadas: 1, exclusivoPorProfissional: false, tipo: 'academia'    },
};

export { SERVICOS_CONFIG };

const CAPACIDADE_POR_PROFISSIONAL = 3;
const CANCELAMENTO_JANELAS = {
  academia: 6,
  consultorio: 2
};
const AGENDAMENTO_ANTECEDENCIA_MIN = 2;

// Helper: decrementar reservados e mover para usados (ou consumir em cancelamento tardio)
function applyStatusTransition(
  client: any,
  tipo: 'academia' | 'massagem' | 'emergencia' | 'nenhum',
  oldStatus: string,
  newStatus: string,
  diffHoras: number,
  janelaHoras: number
) {
  if (tipo === 'nenhum') return;

  const fields = {
    academia:   { total: 'creditosTotal',            usados: 'creditosUsados',            reservados: 'creditosReservados'            },
    massagem:   { total: 'creditosMassagemTotal',     usados: 'creditosMassagemUsados',    reservados: 'creditosMassagemReservados'    },
    emergencia: { total: 'creditosEmergenciaTotal',   usados: 'creditosEmergenciaUsados',  reservados: 'creditosEmergenciaReservados'  },
  }[tipo] as { total: string; usados: string; reservados: string };

  const com = client.dadosComerciais;

  // 1. agendado → presenca
  if (oldStatus === 'agendado' && newStatus === 'presenca') {
    com[fields.reservados] = Math.max(0, (com[fields.reservados] || 0) - 1);
    com[fields.usados] = (com[fields.usados] || 0) + 1;
  }
  // 2. agendado → cancelado
  else if (oldStatus === 'agendado' && newStatus === 'cancelado') {
    com[fields.reservados] = Math.max(0, (com[fields.reservados] || 0) - 1);
    if (diffHoras < janelaHoras) {
      com[fields.usados] = (com[fields.usados] || 0) + 1; // cancelamento tardio consome crédito
    }
  }
  // 3. presenca → agendado
  else if (oldStatus === 'presenca' && newStatus === 'agendado') {
    com[fields.usados] = Math.max(0, (com[fields.usados] || 0) - 1);
    com[fields.reservados] = (com[fields.reservados] || 0) + 1;
  }
  // 4. cancelado → agendado
  else if (oldStatus === 'cancelado' && newStatus === 'agendado') {
    com[fields.reservados] = (com[fields.reservados] || 0) + 1;
    if (diffHoras < janelaHoras) {
      com[fields.usados] = Math.max(0, (com[fields.usados] || 0) - 1);
    }
  }
  // 5. presenca → cancelado
  else if (oldStatus === 'presenca' && newStatus === 'cancelado') {
    com[fields.usados] = Math.max(0, (com[fields.usados] || 0) - 1);
    if (diffHoras < janelaHoras) {
      com[fields.usados] = (com[fields.usados] || 0) + 1;
    }
  }
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const clientId = searchParams.get('clientId');
    const professionalId = searchParams.get('professionalId');

    // Make sure models are registered
    const _client = Client;
    const _prof = Professional;

    let query: any = {};
    if (date) query.data = date;
    if (clientId) query.clienteId = clientId;
    if (professionalId) query.profissionalId = professionalId;

    const appointments = await Appointment.find(query)
      .populate('clienteId')
      .populate('profissionalId');

    return NextResponse.json({ success: true, data: appointments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { data, horario, servico, profissionalId: requestedProfId, clienteId, bypassRestrictions } = body;

    const servicoConfig = SERVICOS_CONFIG[servico];
    if (!servicoConfig) {
      return NextResponse.json({ success: false, error: `Serviço desconhecido: ${servico}` }, { status: 400 });
    }

    const tipoCredito = servicoConfig.tipoCredito;
    const tipo = servicoConfig.tipo;

    // --- Bloquear datas passadas ---
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const partsData = data.split('-');
    const dataAgendamentoObj = new Date(Number(partsData[0]), Number(partsData[1]) - 1, Number(partsData[2]));
    dataAgendamentoObj.setHours(0, 0, 0, 0);
    if (dataAgendamentoObj < hoje) {
      return NextResponse.json({ success: false, error: 'Não é permitido agendar em datas passadas.' }, { status: 400 });
    }

    // --- Regras de Dias de Semana e Sábado ---
    const dayOfWeek = dataAgendamentoObj.getDay(); // 0=Dom, 6=Sáb

    // Verificar se há regras customizadas para este horário e data
    const customRule = await AgendaConfig.findOne({
      tipo,
      horario,
      $or: [
        { dataEspecifica: data },
        { diaSemana: dayOfWeek, dataEspecifica: null }
      ]
    }).sort({ dataEspecifica: -1 });

    if (customRule && customRule.acao === 'bloquear') {
      return NextResponse.json({ success: false, error: 'Este horário está suspenso ou indisponível.' }, { status: 400 });
    }

    if (!customRule || customRule.acao !== 'adicionar') {
      if (dayOfWeek === 0) {
        return NextResponse.json({ success: false, error: 'O clube está fechado aos domingos.' }, { status: 400 });
      } else if (dayOfWeek === 6) {
        // Sábado: APENAS Massagem é permitida
        if (servico !== 'Massagem') {
          return NextResponse.json({ success: false, error: 'Aos sábados, apenas Massagem está disponível.' }, { status: 400 });
        }
        const validSaturdays = ['09:50', '10:40', '11:30', '12:25'];
        if (!validSaturdays.includes(horario)) {
          return NextResponse.json({ success: false, error: `Os horários de atendimento aos sábados são: ${validSaturdays.join(', ')}.` }, { status: 400 });
        }

        let maxSábado = 1;
        if (customRule && customRule.acao === 'alterar_capacidade' && customRule.capacidadePersonalizada !== null) {
          maxSábado = customRule.capacidadePersonalizada;
        }
        const slotsNoHorario = await Appointment.countDocuments({
          data,
          horario,
          status: { $ne: 'cancelado' }
        });
        if (slotsNoHorario >= maxSábado) {
          return NextResponse.json({ success: false, error: `Horário lotado. Apenas ${maxSábado} vaga(s) por horário aos sábados.` }, { status: 400 });
        }
      } else {
        // Segunda a Sexta: Massagem é bloqueada
        if (servico === 'Massagem') {
          return NextResponse.json({ success: false, error: 'Massagem é oferecida exclusivamente aos sábados.' }, { status: 400 });
        }
        const validWeekdays = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
        if (!validWeekdays.includes(horario)) {
          return NextResponse.json({ success: false, error: 'Os horários de atendimento de segunda a sexta são das 06:00 às 20:00 (último horário às 20:00).' }, { status: 400 });
        }
      }
    }

    // --- Antecedência mínima de 2h ---
    if (!bypassRestrictions) {
      const agora = new Date();
      const dataHoraAgendamento = new Date(`${data}T${horario}:00`);
      const diffHoras = (dataHoraAgendamento.getTime() - agora.getTime()) / (1000 * 60 * 60);
      if (diffHoras < AGENDAMENTO_ANTECEDENCIA_MIN) {
        return NextResponse.json({ success: false, error: `Agendamento deve ser feito com pelo menos ${AGENDAMENTO_ANTECEDENCIA_MIN} horas de antecedência.` }, { status: 400 });
      }
    }

    // Load client
    const client = await Client.findById(clienteId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    // --- Bloquear agendamento se plano vencido há mais de 10 dias ---
    if (!bypassRestrictions && client.dadosComerciais.status === 'vencido' && client.dadosComerciais.vencimento) {
      const venc = new Date(client.dadosComerciais.vencimento + 'T00:00:00');
      const hojeZero = new Date();
      hojeZero.setHours(0, 0, 0, 0);
      const diasVencido = Math.floor((hojeZero.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
      if (diasVencido > 10) {
        return NextResponse.json({ success: false, error: `Plano vencido há ${diasVencido} dias. Agendamento bloqueado. Renove o plano para continuar.` }, { status: 400 });
      }
    }

    // --- Validar créditos conforme tipoCredito ---
    if (tipoCredito !== 'nenhum' && !bypassRestrictions) {
      const com = client.dadosComerciais;

      if (tipoCredito === 'academia') {
        const total = com.creditosTotal || 0;
        const usados = com.creditosUsados || 0;
        const mesAgendamento = data.slice(0, 7);
        const reservados = await Appointment.countDocuments({
          clienteId,
          status: 'agendado',
          tipoCredito: 'academia',
          data: new RegExp('^' + mesAgendamento)
        });
        const disponiveis = Math.max(0, total - usados - reservados);
        if (disponiveis <= 0) {
          return NextResponse.json({ success: false, error: 'Créditos de academia insuficientes! O aluno não possui créditos disponíveis para este mês.' }, { status: 400 });
        }
      } else if (tipoCredito === 'massagem') {
        const total = com.creditosMassagemTotal || 0;
        const usados = com.creditosMassagemUsados || 0;
        const reservados = await Appointment.countDocuments({
          clienteId,
          status: 'agendado',
          tipoCredito: 'massagem'
        });
        const disponiveis = Math.max(0, total - usados - reservados);
        if (disponiveis <= 0) {
          return NextResponse.json({ success: false, error: 'Créditos de massagem insuficientes! O aluno não possui créditos de massagem disponíveis.' }, { status: 400 });
        }
      } else if (tipoCredito === 'emergencia') {
        const total = com.creditosEmergenciaTotal || 0;
        const usados = com.creditosEmergenciaUsados || 0;
        const reservados = com.creditosEmergenciaReservados || 0;
        const disponiveis = Math.max(0, total - usados - reservados);
        if (disponiveis <= 0) {
          return NextResponse.json({ success: false, error: 'Créditos de emergência insuficientes! O aluno não possui créditos de emergência disponíveis.' }, { status: 400 });
        }
      }
    }

    // --- Atribuição e Capacidade de Profissional ---
    let finalProfId = requestedProfId;

    const checkProfessionalAvailability = async (profId: string) => {
        const slotsDesteProf = await Appointment.find({
          data,
          horario,
          tipo: 'academia',
          profissionalId: profId,
          status: { $ne: 'cancelado' }
        });

        const vagasProf = slotsDesteProf.reduce((sum, apt) => {
          const cfg = SERVICOS_CONFIG[apt.servico] || { vagasOcupadas: 1 };
          return sum + cfg.vagasOcupadas;
        }, 0);

        const profTemExclusivo = slotsDesteProf.some(apt => {
          const cfg = SERVICOS_CONFIG[apt.servico];
          return cfg && cfg.exclusivoPorProfissional;
        });

        if (profTemExclusivo) return false;
        if (servicoConfig.exclusivoPorProfissional && slotsDesteProf.length > 0) return false;
        if (vagasProf + servicoConfig.vagasOcupadas > CAPACIDADE_POR_PROFISSIONAL) return false;

        return true;
      };

      const professionals = ['6668ab030303030303030302', '6668ab030303030303030301'];
      if (finalProfId && professionals.includes(finalProfId)) {
        const index = professionals.indexOf(finalProfId);
        if (index > -1) {
          professionals.splice(index, 1);
          professionals.unshift(finalProfId);
        }
      }

      let foundProf = false;
      for (const profId of professionals) {
        const available = await checkProfessionalAvailability(profId);
        if (available) {
          finalProfId = profId;
          foundProf = true;
          break;
        }
      }

      if (!foundProf && !bypassRestrictions) {
        return NextResponse.json({ success: false, error: `Capacidade do profissional esgotada neste horário (máx. ${CAPACIDADE_POR_PROFISSIONAL} vagas por profissional ou profissional possui agendamento exclusivo).` }, { status: 400 });
      }

      let maxVagasAcademia = 6;
      if (customRule && customRule.acao === 'alterar_capacidade' && customRule.capacidadePersonalizada !== null) {
        maxVagasAcademia = customRule.capacidadePersonalizada;
      }

      const allGymApts = await Appointment.find({
        data,
        horario,
        tipo: 'academia',
        status: { $ne: 'cancelado' }
      });
      const vagasTotais = allGymApts.reduce((sum, apt) => {
        const cfg = SERVICOS_CONFIG[apt.servico] || { vagasOcupadas: 1 };
        return sum + cfg.vagasOcupadas;
      }, 0);
      if (vagasTotais + servicoConfig.vagasOcupadas > maxVagasAcademia && !bypassRestrictions) {
        return NextResponse.json({ success: false, error: `Horário na academia lotado! Máximo de ${maxVagasAcademia} vagas.` }, { status: 400 });
      }

      if (servico === 'Treino Livre') {
        const treinosLivresNesteHorario = allGymApts.filter(a => a.servico === 'Treino Livre').length;
        if (treinosLivresNesteHorario >= 3 && !bypassRestrictions) {
          return NextResponse.json({ success: false, error: 'Limite de 3 Treinos Livres por horário atingido.' }, { status: 400 });
        }
      }

    // --- Incrementar reservas no modelo Client ---
    if (tipoCredito !== 'nenhum') {
      const com = client.dadosComerciais;
      if (tipoCredito === 'academia') {
        com.creditosReservados = (com.creditosReservados || 0) + 1;
      } else if (tipoCredito === 'massagem') {
        com.creditosMassagemReservados = (com.creditosMassagemReservados || 0) + 1;
      } else if (tipoCredito === 'emergencia') {
        com.creditosEmergenciaReservados = (com.creditosEmergenciaReservados || 0) + 1;
      }
      client.markModified('dadosComerciais');
      await client.save();
    }

    const appointment = await Appointment.create({
      data,
      horario,
      tipo,
      servico,
      consumeCredito: tipoCredito === 'academia',
      tipoCredito,
      profissionalId: finalProfId,
      clienteId,
      status: 'agendado'
    });

    return NextResponse.json({ success: true, data: appointment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Missing appointment ID or status' }, { status: 400 });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    const client = await Client.findById(appointment.clienteId);
    const oldStatus = appointment.status;

    if (client) {
      // Usar tipoCredito do appointment; fallback para inferência legada
      const tipoCredito: 'academia' | 'massagem' | 'emergencia' | 'nenhum' =
        appointment.tipoCredito ||
        (appointment.consumeCredito ? 'academia' : appointment.servico === 'Massagem' ? 'massagem' : 'nenhum');

      const dataHora = new Date(`${appointment.data}T${appointment.horario}:00`);
      const agora = new Date();
      const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
      const janelaHoras = CANCELAMENTO_JANELAS[appointment.tipo as 'academia' | 'consultorio'] || 6;

      applyStatusTransition(client, tipoCredito, oldStatus, status, diffHoras, janelaHoras);
      client.markModified('dadosComerciais');
      await client.save();
    }

    appointment.status = status;
    await appointment.save();

    return NextResponse.json({ success: true, data: appointment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing appointment ID' }, { status: 400 });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    const client = await Client.findById(appointment.clienteId);
    if (client) {
      const tipoCredito: 'academia' | 'massagem' | 'emergencia' | 'nenhum' =
        appointment.tipoCredito ||
        (appointment.consumeCredito ? 'academia' : appointment.servico === 'Massagem' ? 'massagem' : 'nenhum');

      const com = client.dadosComerciais;
      if (tipoCredito === 'academia') {
        if (appointment.status === 'agendado') com.creditosReservados = Math.max(0, (com.creditosReservados || 0) - 1);
        else if (appointment.status === 'presenca') com.creditosUsados = Math.max(0, (com.creditosUsados || 0) - 1);
      } else if (tipoCredito === 'massagem') {
        if (appointment.status === 'agendado') com.creditosMassagemReservados = Math.max(0, (com.creditosMassagemReservados || 0) - 1);
        else if (appointment.status === 'presenca') com.creditosMassagemUsados = Math.max(0, (com.creditosMassagemUsados || 0) - 1);
      } else if (tipoCredito === 'emergencia') {
        if (appointment.status === 'agendado') com.creditosEmergenciaReservados = Math.max(0, (com.creditosEmergenciaReservados || 0) - 1);
        else if (appointment.status === 'presenca') com.creditosEmergenciaUsados = Math.max(0, (com.creditosEmergenciaUsados || 0) - 1);
      }
      client.markModified('dadosComerciais');
      await client.save();
    }

    await Appointment.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Appointment deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
