import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Plan from '@/models/Plan';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import AgendaConfig from '@/models/AgendaConfig';
import Appointment from '@/models/Appointment';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const maxDuration = 30;

// Force registration of all Mongoose models in global scope
const _models = { Plan, Client, Professional, AgendaConfig, Appointment };

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
  'Terapia Manual':           { tipoCredito: 'academia',   vagasOcupadas: 3, exclusivoPorProfissional: true,  tipo: 'academia'    },
  'Massagem':                 { tipoCredito: 'massagem',   vagasOcupadas: 1, exclusivoPorProfissional: false, tipo: 'academia'    },
};

export { SERVICOS_CONFIG };

const CAPACIDADE_POR_PROFISSIONAL = 3;
const CANCELAMENTO_JANELAS = {
  academia: 6,
  consultorio: 2
};
const AGENDAMENTO_ANTECEDENCIA_MIN = 2;

// Helper para mapeamento de serviços do plano Dynamus e planos convencionais
function getServiceCreditConfig(servico: string, isDynamus: boolean): { tipoCredito: 'academia' | 'massagem' | 'emergencia' | 'nenhum'; cost: number } {
  const normalized = servico.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (isDynamus) {
    if (
      normalized.includes('avaliacao fisica') ||
      normalized.includes('fisioterapica') ||
      normalized.includes('teste de forca') ||
      normalized.includes('terapia manual') ||
      normalized.includes('emergencia')
    ) {
      return { tipoCredito: 'academia', cost: 3 };
    }
    if (
      normalized.includes('treino monitorado') ||
      normalized.includes('recovery') ||
      normalized.includes('treino livre')
    ) {
      return { tipoCredito: 'academia', cost: 1 };
    }
    if (normalized.includes('massagem') || normalized.includes('massoterapia') || normalized.includes('miofascial')) {
      return { tipoCredito: 'massagem', cost: 1 };
    }
    return { tipoCredito: 'nenhum', cost: 0 };
  } else {
    const cfg = SERVICOS_CONFIG[servico] || { tipoCredito: 'nenhum' };
    const cost = cfg.tipoCredito !== 'nenhum' ? 1 : 0;
    return { tipoCredito: cfg.tipoCredito as any, cost };
  }
}

// Helper para calcular créditos reservados dinamicamente com base no custo de cada agendamento
async function getReservadosCredits(clienteId: string, tipoCredito: string, mesAgendamento?: string): Promise<number> {
  const query: any = {
    clienteId,
    status: 'agendado',
    tipoCredito
  };
  if (mesAgendamento) {
    query.data = new RegExp('^' + mesAgendamento);
  }
  
  const appointments = await Appointment.find(query);
  
  const client = await Client.findById(clienteId).populate('dadosComerciais.planoId');
  const isDynamus = client?.dadosComerciais?.planoId?.nome?.toLowerCase().includes('dynamus') || false;
  
  let totalCost = 0;
  for (const apt of appointments) {
    const cfg = getServiceCreditConfig(apt.servico, isDynamus);
    if (cfg.tipoCredito === tipoCredito) {
      totalCost += cfg.cost;
    }
  }
  return totalCost;
}

// Helper: decrementar reservados e mover para usados (ou consumir em cancelamento tardio)
function applyStatusTransition(
  client: any,
  tipo: 'academia' | 'massagem' | 'emergencia' | 'nenhum',
  oldStatus: string,
  newStatus: string,
  diffHoras: number,
  janelaHoras: number,
  servico: string
) {
  if (tipo === 'nenhum') return;

  const isDynamus = client.dadosComerciais?.planoId?.nome?.toLowerCase().includes('dynamus') || false;
  const cfg = getServiceCreditConfig(servico, isDynamus);
  const cost = cfg.cost;

  const fields = {
    academia:   { total: 'creditosTotal',            usados: 'creditosUsados',            reservados: 'creditosReservados'            },
    massagem:   { total: 'creditosMassagemTotal',     usados: 'creditosMassagemUsados',    reservados: 'creditosMassagemReservados'    },
    emergencia: { total: 'creditosEmergenciaTotal',   usados: 'creditosEmergenciaUsados',  reservados: 'creditosEmergenciaReservados'  },
  }[tipo] as { total: string; usados: string; reservados: string };

  const com = client.dadosComerciais;

  // 1. agendado → presenca ou falta
  if (oldStatus === 'agendado' && (newStatus === 'presenca' || newStatus === 'falta')) {
    com[fields.reservados] = Math.max(0, (com[fields.reservados] || 0) - cost);
    com[fields.usados] = (com[fields.usados] || 0) + cost;
  }
  // 2. agendado → cancelado
  else if (oldStatus === 'agendado' && newStatus === 'cancelado') {
    com[fields.reservados] = Math.max(0, (com[fields.reservados] || 0) - cost);
    if (diffHoras < janelaHoras) {
      com[fields.usados] = (com[fields.usados] || 0) + cost; // cancelamento tardio consome crédito
    }
  }
  // 3. presenca ou falta → agendado
  else if ((oldStatus === 'presenca' || oldStatus === 'falta') && newStatus === 'agendado') {
    com[fields.usados] = Math.max(0, (com[fields.usados] || 0) - cost);
    com[fields.reservados] = (com[fields.reservados] || 0) + cost;
  }
  // 4. cancelado → agendado
  else if (oldStatus === 'cancelado' && newStatus === 'agendado') {
    com[fields.reservados] = (com[fields.reservados] || 0) + cost;
    if (diffHoras < janelaHoras) {
      com[fields.usados] = Math.max(0, (com[fields.usados] || 0) - cost);
    }
  }
  // 5. presenca ou falta → cancelado
  else if ((oldStatus === 'presenca' || oldStatus === 'falta') && newStatus === 'cancelado') {
    com[fields.usados] = Math.max(0, (com[fields.usados] || 0) - cost);
    if (diffHoras < janelaHoras) {
      com[fields.usados] = (com[fields.usados] || 0) + cost;
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
    const _p = Plan;
    const _c = Client;
    const _pr = Professional;
    const _a = Appointment;
    const body = await request.json();
    const { data, horario, servico, profissionalId: requestedProfId, clienteId, bypassRestrictions } = body;

    const servicoConfig = SERVICOS_CONFIG[servico];
    if (!servicoConfig) {
      return NextResponse.json({ success: false, error: `Serviço desconhecido: ${servico}` }, { status: 400 });
    }

    let tipoCredito = servicoConfig.tipoCredito;
    const tipo = servicoConfig.tipo;

    // Restrição da regra de liberação de agenda para alunos (sexta 18h)
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
        return NextResponse.json({ 
          success: false, 
          error: 'A agenda para a semana seguinte ainda não está disponível para agendamento por alunos. A liberação ocorre toda sexta-feira às 18h.' 
        }, { status: 400 });
      }
    }

    // --- Bloquear datas passadas ---
    const nowBrStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // "YYYY-MM-DD"
    if (data < nowBrStr) {
      return NextResponse.json({ success: false, error: 'Não é permitido agendar em datas passadas.' }, { status: 400 });
    }

    // --- Regras de Dias de Semana e Sábado ---
    const partsData = data.split('-');
    const dataAgendamentoObj = new Date(Number(partsData[0]), Number(partsData[1]) - 1, Number(partsData[2]));
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
      const dataHoraAgendamento = new Date(`${data}T${horario}:00-03:00`);
      const diffHoras = (dataHoraAgendamento.getTime() - agora.getTime()) / (1000 * 60 * 60);
      if (diffHoras < AGENDAMENTO_ANTECEDENCIA_MIN) {
        return NextResponse.json({ success: false, error: `Agendamento deve ser feito com pelo menos ${AGENDAMENTO_ANTECEDENCIA_MIN} horas de antecedência.` }, { status: 400 });
      }
    }

    // Load client with plan populated
    const client = await Client.findById(clienteId).populate('dadosComerciais.planoId');
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
    }

    const isDynamus = client.dadosComerciais?.planoId?.nome?.toLowerCase().includes('dynamus') || false;
    const creditCfg = getServiceCreditConfig(servico, isDynamus);
    tipoCredito = creditCfg.tipoCredito;
    const cost = creditCfg.cost;

    // --- Bloquear agendamento se cliente for LEAD (Sem Plano) ---
    if (!bypassRestrictions && (client.dadosComerciais?.status === 'lead' || client.dadosComerciais?.status === 'pendente' || !client.dadosComerciais?.status)) {
      return NextResponse.json({
        success: false,
        error: 'Cliente em fase de cadastro/avaliação (Lead) não pode realizar agendamento sem antes contratar um plano comercial ativo.'
      }, { status: 400 });
    }

    // --- Restringir serviços permitidos quando o agendamento for feito pelo próprio aluno ---
    if (session && session.user && (session.user as any).role === 'client') {
      const allowedStudentServices = ['Treino Monitorado', 'Treino Livre', 'Emergência', 'Atendimento de Emergência', 'Massagem'];
      if (!allowedStudentServices.includes(servico)) {
        return NextResponse.json({
          success: false,
          error: 'Alunos só podem agendar Treino Monitorado, Treino Livre, Atendimento de Emergência ou Massagem. Outros serviços devem ser agendados com a recepção ou equipe.'
        }, { status: 400 });
      }
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
        const reservados = await getReservadosCredits(clienteId, tipoCredito, mesAgendamento);
        const disponiveis = Math.max(0, total - usados - reservados);
        if (disponiveis < cost) {
          return NextResponse.json({ success: false, error: `Créditos de academia insuficientes! O agendamento requer ${cost} crédito(s) e o aluno possui apenas ${disponiveis} crédito(s) disponível(is).` }, { status: 400 });
        }
      } else if (tipoCredito === 'massagem') {
        const total = com.creditosMassagemTotal || 0;
        const usados = com.creditosMassagemUsados || 0;
        const reservados = await getReservadosCredits(clienteId, tipoCredito);
        const disponiveis = Math.max(0, total - usados - reservados);
        if (disponiveis < cost) {
          return NextResponse.json({ success: false, error: `Créditos de massagem insuficientes! O agendamento requer ${cost} crédito(s) e o aluno possui apenas ${disponiveis} crédito(s) disponível(is).` }, { status: 400 });
        }
      } else if (tipoCredito === 'emergencia') {
        const total = com.creditosEmergenciaTotal || 0;
        const usados = com.creditosEmergenciaUsados || 0;
        const reservados = await getReservadosCredits(clienteId, tipoCredito);
        const disponiveis = Math.max(0, total - usados - reservados);
        if (disponiveis < cost) {
          return NextResponse.json({ success: false, error: `Créditos de emergência insuficientes! O agendamento requer ${cost} crédito(s) e o aluno possui apenas ${disponiveis} crédito(s) disponível(is).` }, { status: 400 });
        }
      }
    }

    // --- Atribuição de Profissional (sem travas de capacidade ou exclusividade) ---
    let finalProfId = requestedProfId;
    const professionals = ['6668ab030303030303030302', '6668ab030303030303030301'];
    if (!finalProfId || !professionals.includes(finalProfId)) {
      finalProfId = professionals[0];
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
        com.creditosReservados = (com.creditosReservados || 0) + cost;
      } else if (tipoCredito === 'massagem') {
        com.creditosMassagemReservados = (com.creditosMassagemReservados || 0) + cost;
      } else if (tipoCredito === 'emergencia') {
        com.creditosEmergenciaReservados = (com.creditosEmergenciaReservados || 0) + cost;
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
    const _p = Plan;
    const _c = Client;
    const _pr = Professional;
    const _a = Appointment;
    const body = await request.json();
    const { id, status, wellness, profissionalId } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Missing appointment ID or status' }, { status: 400 });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    // Regra Obrigatória: Para confirmar presença, o Questionário Wellness deve ser preenchido
    if (status === 'presenca') {
      if (!wellness || !wellness.sono || !wellness.fadiga || !wellness.dorMuscular) {
        // Se o agendamento já tinha wellness salvo anteriormente, mantém; senão bloqueia
        if (!appointment.wellness?.realizado) {
          return NextResponse.json({
            success: false,
            error: 'Preencha o Questionário Wellness para concluir o registro da presença.',
            requiresWellness: true
          }, { status: 400 });
        }
      } else {
        const { calculateWellness } = await import('@/utils/wellnessHelper');
        const WellnessLog = (await import('@/models/WellnessLog')).default;
        
        const wResult = calculateWellness(wellness.sono, wellness.fadiga, wellness.dorMuscular);
        const agora = new Date();
        const dataPreenchimento = appointment.data || agora.toISOString().split('T')[0];
        const horarioPreenchimento = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
        const profId = profissionalId || body.executorProfId || appointment.profissionalId;

        appointment.wellness = {
          realizado: true,
          sono: Number(wellness.sono),
          fadiga: Number(wellness.fadiga),
          dorMuscular: Number(wellness.dorMuscular),
          score: wResult.score,
          status: wResult.status,
          statusLabel: wResult.statusLabel,
          statusColor: wResult.statusColor,
          conduta: wResult.conduta,
          regrasAtivadas: wResult.regrasAtivadas,
          dataPreenchimento,
          horarioPreenchimento,
          profissionalId: profId
        };

        // Gravar no log histórico longitudinal
        try {
          if (WellnessLog) {
            await WellnessLog.create({
              clienteId: appointment.clienteId,
              appointmentId: appointment._id,
              profissionalId: profId,
              data: dataPreenchimento,
              horario: horarioPreenchimento,
              sono: Number(wellness.sono),
              fadiga: Number(wellness.fadiga),
              dorMuscular: Number(wellness.dorMuscular),
              score: wResult.score,
              status: wResult.status,
              statusLabel: wResult.statusLabel,
              statusColor: wResult.statusColor,
              conduta: wResult.conduta,
              regrasAtivadas: wResult.regrasAtivadas
            });
          }
        } catch (wErr) {
          console.warn('Erro ao salvar WellnessLog:', wErr);
        }
      }
    }

    const client = await Client.findById(appointment.clienteId).populate('dadosComerciais.planoId');
    const oldStatus = appointment.status;

    if (client) {
      // Usar tipoCredito do appointment; fallback para inferência legada
      const tipoCredito: 'academia' | 'massagem' | 'emergencia' | 'nenhum' =
        appointment.tipoCredito ||
        (appointment.consumeCredito ? 'academia' : appointment.servico === 'Massagem' ? 'massagem' : 'nenhum');

      const dataHora = new Date(`${appointment.data}T${appointment.horario}:00-03:00`);
      const agora = new Date();
      const diffHoras = (dataHora.getTime() - agora.getTime()) / (1000 * 60 * 60);
      const janelaHoras = CANCELAMENTO_JANELAS[appointment.tipo as 'academia' | 'consultorio'] || 6;

      applyStatusTransition(client, tipoCredito, oldStatus, status, diffHoras, janelaHoras, appointment.servico);
      client.markModified('dadosComerciais');
      await client.save();
    }

    appointment.status = status;
    await appointment.save();

    return NextResponse.json({ success: true, data: appointment, wellness: appointment.wellness });
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

    const client = await Client.findById(appointment.clienteId).populate('dadosComerciais.planoId');
    if (client) {
      const tipoCredito: 'academia' | 'massagem' | 'emergencia' | 'nenhum' =
        appointment.tipoCredito ||
        (appointment.consumeCredito ? 'academia' : appointment.servico === 'Massagem' ? 'massagem' : 'nenhum');

      const isDynamus = client.dadosComerciais?.planoId?.nome?.toLowerCase().includes('dynamus') || false;
      const cfg = getServiceCreditConfig(appointment.servico, isDynamus);
      const cost = cfg.cost;

      const com = client.dadosComerciais;
      if (tipoCredito === 'academia') {
        if (appointment.status === 'agendado') com.creditosReservados = Math.max(0, (com.creditosReservados || 0) - cost);
        else if (appointment.status === 'presenca' || appointment.status === 'falta') com.creditosUsados = Math.max(0, (com.creditosUsados || 0) - cost);
      } else if (tipoCredito === 'massagem') {
        if (appointment.status === 'agendado') com.creditosMassagemReservados = Math.max(0, (com.creditosMassagemReservados || 0) - cost);
        else if (appointment.status === 'presenca' || appointment.status === 'falta') com.creditosMassagemUsados = Math.max(0, (com.creditosMassagemUsados || 0) - cost);
      } else if (tipoCredito === 'emergencia') {
        if (appointment.status === 'agendado') com.creditosEmergenciaReservados = Math.max(0, (com.creditosEmergenciaReservados || 0) - cost);
        else if (appointment.status === 'presenca' || appointment.status === 'falta') com.creditosEmergenciaUsados = Math.max(0, (com.creditosEmergenciaUsados || 0) - cost);
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
