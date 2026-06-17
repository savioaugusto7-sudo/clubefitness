import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Appointment from '@/models/Appointment';
import Client from '@/models/Client';
import Professional from '@/models/Professional';

// Configuração de Serviços — Regras de Crédito e Capacidade do Projeto Original
const SERVICOS_CONFIG: Record<string, { consumeCredito: boolean, consumeCreditoMassagem?: boolean, vagasOcupadas: number, exclusivoPorProfissional: boolean, tipo: 'academia' | 'consultorio' }> = {
  'Treino Monitorado': { consumeCredito: true,  vagasOcupadas: 1, exclusivoPorProfissional: false, tipo: 'academia' },
  'Treino Livre':      { consumeCredito: false, vagasOcupadas: 0, exclusivoPorProfissional: false, tipo: 'academia' },
  'Recovery':          { consumeCredito: false, vagasOcupadas: 1, exclusivoPorProfissional: false, tipo: 'academia' },
  'Avaliação Física':  { consumeCredito: false, vagasOcupadas: 3, exclusivoPorProfissional: true,  tipo: 'academia' },
  'Teste de Força':    { consumeCredito: false, vagasOcupadas: 3, exclusivoPorProfissional: true,  tipo: 'academia' },
  'Avaliação Fisioterápica': { consumeCredito: false, vagasOcupadas: 1, exclusivoPorProfissional: true,  tipo: 'consultorio' },
  'Emergência':              { consumeCredito: false, vagasOcupadas: 3, exclusivoPorProfissional: true,  tipo: 'academia' },
  'Massagem':          { consumeCredito: false, consumeCreditoMassagem: true, vagasOcupadas: 1, exclusivoPorProfissional: false, tipo: 'academia' }
};

const CAPACIDADE_POR_PROFISSIONAL = 3;
const CANCELAMENTO_JANELAS = {
  academia: 6,
  consultorio: 2
};
const AGENDAMENTO_ANTECEDENCIA_MIN = 2;

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

    const consumeCredito = servicoConfig.consumeCredito;
    const consumeCreditoMassagem = servicoConfig.consumeCreditoMassagem || false;
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
    const dayOfWeek = dataAgendamentoObj.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

    if (dayOfWeek === 0) {
      return NextResponse.json({ success: false, error: 'O clube está fechado aos domingos.' }, { status: 400 });
    } else if (dayOfWeek === 6) {
      // Sábado
      const validSaturdays = ['09:50', '10:40', '11:30', '12:25'];
      if (!validSaturdays.includes(horario)) {
        return NextResponse.json({ success: false, error: `Os horários de atendimento aos sábados são: ${validSaturdays.join(', ')}.` }, { status: 400 });
      }
      
      // Exclusivamente no sábado: apenas 1 vaga por horário no geral
      const slotsNoHorario = await Appointment.countDocuments({
        data,
        horario,
        status: { $ne: 'cancelado' }
      });
      if (slotsNoHorario >= 1) {
        return NextResponse.json({ success: false, error: 'Horário lotado. Apenas 1 vaga por horário aos sábados.' }, { status: 400 });
      }
    } else {
      // Segunda a Sexta
      if (servico === 'Massagem') {
        return NextResponse.json({ success: false, error: 'Massagem é oferecida exclusivamente aos sábados.' }, { status: 400 });
      }
      const validWeekdays = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];
      if (!validWeekdays.includes(horario)) {
        return NextResponse.json({ success: false, error: 'Os horários de atendimento de segunda a sexta são das 06:00 às 20:00 (último horário às 20:00).' }, { status: 400 });
      }
    }

    // --- Antecedência mínima de 2h (apenas para hoje) ---
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

    // --- Validar créditos de treino ---
    if (consumeCredito && !bypassRestrictions) {
      const total = client.dadosComerciais.creditosTotal || 0;
      const usados = client.dadosComerciais.creditosUsados || 0;
      
      // Contagem dinâmica: agendamentos com crédito no mês do agendamento
      const mesAgendamento = data.slice(0, 7); // 'YYYY-MM'
      const reservados = await Appointment.countDocuments({
        clienteId,
        status: 'agendado',
        consumeCredito: true,
        data: new RegExp('^' + mesAgendamento)
      });
      const disponiveis = Math.max(0, total - usados - reservados);
      if (disponiveis <= 0) {
        return NextResponse.json({ success: false, error: 'Créditos insuficientes! O aluno não possui créditos disponíveis para este mês.' }, { status: 400 });
      }
    }

    // --- Validar créditos de Massagem ---
    if (consumeCreditoMassagem && !bypassRestrictions) {
      const total = client.dadosComerciais.creditosMassagemTotal !== undefined ? client.dadosComerciais.creditosMassagemTotal : 1;
      const usados = client.dadosComerciais.creditosMassagemUsados || 0;
      const reservados = await Appointment.countDocuments({
        clienteId,
        status: 'agendado',
        servico: 'Massagem'
      });
      const disponiveis = Math.max(0, total - usados - reservados);
      if (disponiveis <= 0) {
        return NextResponse.json({ success: false, error: 'Créditos de massagem insuficientes! O aluno não possui créditos de massagem disponíveis.' }, { status: 400 });
      }
    }

    // --- Atribuição e Capacidade de Profissional ---
    let finalProfId = requestedProfId;

    if (tipo === 'consultorio') {
      // Somente Dr. André Costa (prof_1)
      finalProfId = '6668ab030303030303030301';
      const slotsFilled = await Appointment.countDocuments({
        data,
        horario,
        tipo: 'consultorio',
        status: { $ne: 'cancelado' },
        profissionalId: finalProfId
      });
      if (slotsFilled >= 1) {
        return NextResponse.json({ success: false, error: 'Dr. André Costa já possui agendamento neste horário no consultório.' }, { status: 400 });
      }
    } else {
      // tipo === 'academia'
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

      // Tenta o profissional solicitado. Se indisponível, tenta o outro.
      const professionals = ['6668ab030303030303030302', '6668ab030303030303030301']; // Camila, depois André
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

      // Validação total da academia: max 6 vagas totais por horário
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
      if (vagasTotais + servicoConfig.vagasOcupadas > 6 && !bypassRestrictions) {
        return NextResponse.json({ success: false, error: 'Horário na academia lotado! Máximo de 6 vagas (2 profissionais × 3).' }, { status: 400 });
      }

      // Treino Livre max 3 por horário
      if (servico === 'Treino Livre') {
        const treinosLivresNesteHorario = allGymApts.filter(a => a.servico === 'Treino Livre').length;
        if (treinosLivresNesteHorario >= 3 && !bypassRestrictions) {
          return NextResponse.json({ success: false, error: 'Limite de 3 Treinos Livres por horário atingido.' }, { status: 400 });
        }
      }
    }

    // Incrementar reservas no modelo Client
    if (consumeCredito) {
      client.dadosComerciais.creditosReservados = (client.dadosComerciais.creditosReservados || 0) + 1;
      await client.save();
    } else if (consumeCreditoMassagem) {
      client.dadosComerciais.creditosMassagemReservados = (client.dadosComerciais.creditosMassagemReservados || 0) + 1;
      await client.save();
    }

    const appointment = await Appointment.create({
      data,
      horario,
      tipo,
      servico,
      consumeCredito,
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
    const { id, status } = body; // status: 'presenca' | 'cancelado' | 'agendado'

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
      const consumeCredito = appointment.consumeCredito;
      const consumeCreditoMassagem = appointment.servico === 'Massagem';

      if (consumeCredito) {
        // 1. agendado -> presenca
        if (oldStatus === 'agendado' && status === 'presenca') {
          client.dadosComerciais.creditosReservados = Math.max(0, (client.dadosComerciais.creditosReservados || 0) - 1);
          client.dadosComerciais.creditosUsados = (client.dadosComerciais.creditosUsados || 0) + 1;
        }
        // 2. agendado -> cancelado
        else if (oldStatus === 'agendado' && status === 'cancelado') {
          client.dadosComerciais.creditosReservados = Math.max(0, (client.dadosComerciais.creditosReservados || 0) - 1);
          
          const dataHora = new Date(`${appointment.data}T${appointment.horario}:00`);
          const agora = new Date();
          const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
          const janelaHoras = CANCELAMENTO_JANELAS[appointment.tipo as 'academia' | 'consultorio'] || 6;
          
          if (diffHoras < janelaHoras) {
            // Cancelamento tardio — crédito é consumido de qualquer forma
            client.dadosComerciais.creditosUsados = (client.dadosComerciais.creditosUsados || 0) + 1;
          }
        }
        // 3. presenca -> agendado
        else if (oldStatus === 'presenca' && status === 'agendado') {
          client.dadosComerciais.creditosUsados = Math.max(0, (client.dadosComerciais.creditosUsados || 0) - 1);
          client.dadosComerciais.creditosReservados = (client.dadosComerciais.creditosReservados || 0) + 1;
        }
        // 4. cancelado -> agendado
        else if (oldStatus === 'cancelado' && status === 'agendado') {
          client.dadosComerciais.creditosReservados = (client.dadosComerciais.creditosReservados || 0) + 1;
          const dataHora = new Date(`${appointment.data}T${appointment.horario}:00`);
          const agora = new Date();
          const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
          const janelaHoras = CANCELAMENTO_JANELAS[appointment.tipo as 'academia' | 'consultorio'] || 6;
          if (diffHoras < janelaHoras) {
            client.dadosComerciais.creditosUsados = Math.max(0, (client.dadosComerciais.creditosUsados || 0) - 1);
          }
        }
        // 5. presenca -> cancelado
        else if (oldStatus === 'presenca' && status === 'cancelado') {
          client.dadosComerciais.creditosUsados = Math.max(0, (client.dadosComerciais.creditosUsados || 0) - 1);
          const dataHora = new Date(`${appointment.data}T${appointment.horario}:00`);
          const agora = new Date();
          const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
          const janelaHoras = CANCELAMENTO_JANELAS[appointment.tipo as 'academia' | 'consultorio'] || 6;
          if (diffHoras < janelaHoras) {
            client.dadosComerciais.creditosUsados = (client.dadosComerciais.creditosUsados || 0) + 1;
          }
        }
      }
      else if (consumeCreditoMassagem) {
        // 1. agendado -> presenca
        if (oldStatus === 'agendado' && status === 'presenca') {
          client.dadosComerciais.creditosMassagemReservados = Math.max(0, (client.dadosComerciais.creditosMassagemReservados || 0) - 1);
          client.dadosComerciais.creditosMassagemUsados = (client.dadosComerciais.creditosMassagemUsados || 0) + 1;
        }
        // 2. agendado -> cancelado
        else if (oldStatus === 'agendado' && status === 'cancelado') {
          client.dadosComerciais.creditosMassagemReservados = Math.max(0, (client.dadosComerciais.creditosMassagemReservados || 0) - 1);
          
          const dataHora = new Date(`${appointment.data}T${appointment.horario}:00`);
          const agora = new Date();
          const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
          const janelaHoras = CANCELAMENTO_JANELAS[appointment.tipo as 'academia' | 'consultorio'] || 6;
          
          if (diffHoras < janelaHoras) {
            // Cancelamento tardio — crédito é consumido de qualquer forma
            client.dadosComerciais.creditosMassagemUsados = (client.dadosComerciais.creditosMassagemUsados || 0) + 1;
          }
        }
        // 3. presenca -> agendado
        else if (oldStatus === 'presenca' && status === 'agendado') {
          client.dadosComerciais.creditosMassagemUsados = Math.max(0, (client.dadosComerciais.creditosMassagemUsados || 0) - 1);
          client.dadosComerciais.creditosMassagemReservados = (client.dadosComerciais.creditosMassagemReservados || 0) + 1;
        }
        // 4. cancelado -> agendado
        else if (oldStatus === 'cancelado' && status === 'agendado') {
          client.dadosComerciais.creditosMassagemReservados = (client.dadosComerciais.creditosMassagemReservados || 0) + 1;
          const dataHora = new Date(`${appointment.data}T${appointment.horario}:00`);
          const agora = new Date();
          const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
          const janelaHoras = CANCELAMENTO_JANELAS[appointment.tipo as 'academia' | 'consultorio'] || 6;
          if (diffHoras < janelaHoras) {
            client.dadosComerciais.creditosMassagemUsados = Math.max(0, (client.dadosComerciais.creditosMassagemUsados || 0) - 1);
          }
        }
        // 5. presenca -> cancelado
        else if (oldStatus === 'presenca' && status === 'cancelado') {
          client.dadosComerciais.creditosMassagemUsados = Math.max(0, (client.dadosComerciais.creditosMassagemUsados || 0) - 1);
          const dataHora = new Date(`${appointment.data}T${appointment.horario}:00`);
          const agora = new Date();
          const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
          const janelaHoras = CANCELAMENTO_JANELAS[appointment.tipo as 'academia' | 'consultorio'] || 6;
          if (diffHoras < janelaHoras) {
            client.dadosComerciais.creditosMassagemUsados = (client.dadosComerciais.creditosMassagemUsados || 0) + 1;
          }
        }
      }

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

    // Refund credits if deleted appointment was active
    const client = await Client.findById(appointment.clienteId);
    if (client) {
      const consumeCredito = appointment.consumeCredito;
      const consumeCreditoMassagem = appointment.servico === 'Massagem';

      if (consumeCredito) {
        if (appointment.status === 'agendado') {
          client.dadosComerciais.creditosReservados = Math.max(0, (client.dadosComerciais.creditosReservados || 0) - 1);
        } else if (appointment.status === 'presenca') {
          client.dadosComerciais.creditosUsados = Math.max(0, (client.dadosComerciais.creditosUsados || 0) - 1);
        }
      } else if (consumeCreditoMassagem) {
        if (appointment.status === 'agendado') {
          client.dadosComerciais.creditosMassagemReservados = Math.max(0, (client.dadosComerciais.creditosMassagemReservados || 0) - 1);
        } else if (appointment.status === 'presenca') {
          client.dadosComerciais.creditosMassagemUsados = Math.max(0, (client.dadosComerciais.creditosMassagemUsados || 0) - 1);
        }
      }
      await client.save();
    }

    await Appointment.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Appointment deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

