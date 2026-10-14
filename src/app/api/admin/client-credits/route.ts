import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Appointment from '@/models/Appointment';
import ActivityLog from '@/models/ActivityLog';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const mes = searchParams.get('mes'); // Formato YYYY-MM (ex: 2026-10)

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId é obrigatório.' }, { status: 400 });
    }

    const client = await Client.findById(clientId).populate('dadosComerciais.planoId');
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado.' }, { status: 404 });
    }

    const com = client.dadosComerciais || {};
    const targetMonth = mes || new Date().toISOString().substring(0, 7);

    // 1. Buscar agendamentos do aluno no mês (e também buscar todos para visão ampla)
    const aptQuery: any = { clienteId: client._id };
    if (mes && mes !== 'todos') {
      aptQuery.data = { $regex: `^${mes}` };
    }

    const appointments = await Appointment.find(aptQuery)
      .populate('profissionalId', 'nome email')
      .sort({ data: -1, horario: -1 })
      .lean();

    // 2. Buscar logs de atividade relacionados a créditos e contratos
    const logs = await ActivityLog.find({
      clienteId: client._id,
      $or: [
        { acao: { $regex: /crédito|credito|presença|falta|cancelamento|ajust/i } },
        { detalhes: { $regex: /crédito|credito|wellness|saldo/i } }
      ]
    })
      .populate('profissionalId', 'nome')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Data e Hora de referência no horário de Brasília (UTC-3)
    const now = new Date();
    const formatterDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
    const formatterTime = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
    const todayStr = formatterDate.format(now); // "YYYY-MM-DD"
    const nowTimeStr = formatterTime.format(now); // "HH:MM"
    const currentDateTimeStr = `${todayStr}T${nowTimeStr}`;

    // 3. Processar movimentações reais de créditos
    const movimentacoes: any[] = [];
    let consumidosNoMes = 0;
    let reservadosNoMes = 0;
    let pendentesPassadosNoMes = 0;
    let canceladosComEstornoNoMes = 0;

    for (const apt of appointments) {
      const isConsuming = apt.consumeCredito !== false && apt.tipoCredito && apt.tipoCredito !== 'nenhum';
      const custo = isConsuming ? 1 : 0;
      const aptMonth = apt.data ? apt.data.substring(0, 7) : '';
      const isCurrentFilterMonth = !mes || mes === 'todos' || aptMonth === targetMonth;

      const aptDateTimeStr = `${apt.data}T${apt.horario || '00:00'}`;
      const isPast = aptDateTimeStr < currentDateTimeStr;

      let tipoMovimento = 'informativo';
      let impactoCredito = 0;
      let statusDesc = '';
      let isPendentePassado = false;

      if (apt.status === 'presenca') {
        tipoMovimento = isConsuming ? 'consumo_presenca' : 'livre_presenca';
        impactoCredito = isConsuming ? -custo : 0;
        statusDesc = isConsuming ? 'Presença Confirmada (Débito)' : 'Treino Livre Realizado (Sem Custo)';
        if (isConsuming && isCurrentFilterMonth) consumidosNoMes += custo;
      } else if (apt.status === 'falta') {
        tipoMovimento = 'consumo_falta';
        impactoCredito = -custo;
        statusDesc = 'Falta Registrada (Débito)';
        if (isConsuming && isCurrentFilterMonth) consumidosNoMes += custo;
      } else if (apt.status === 'agendado') {
        if (isPast) {
          // Data já passou mas não houve baixa de presença nem falta
          tipoMovimento = 'pendente_passado';
          isPendentePassado = true;
          impactoCredito = 0;
          statusDesc = 'Pendente de Registro (Passado)';
          if (isConsuming && isCurrentFilterMonth) pendentesPassadosNoMes += custo;
        } else {
          // Agendamento futuro legítimo
          tipoMovimento = isConsuming ? 'reserva_agendado' : 'livre_agendado';
          impactoCredito = isConsuming ? -custo : 0;
          statusDesc = isConsuming ? 'Horário Agendado (Reserva Futura)' : 'Agendamento Livre (Sem Custo)';
          if (isConsuming && isCurrentFilterMonth) reservadosNoMes += custo;
        }
      } else if (apt.status === 'cancelado') {
        tipoMovimento = 'estorno_cancelado';
        impactoCredito = 0;
        statusDesc = 'Cancelado no Prazo (Estornado)';
        if (isCurrentFilterMonth) canceladosComEstornoNoMes += 1;
      }

      movimentacoes.push({
        id: apt._id,
        data: apt.data,
        horario: apt.horario,
        servico: apt.servico,
        tipo: apt.tipo,
        tipoCredito: apt.tipoCredito || 'academia',
        consumeCredito: isConsuming,
        custo: custo,
        status: apt.status,
        statusDesc: statusDesc,
        tipoMovimento: tipoMovimento,
        impactoCredito: impactoCredito,
        isPast: isPast,
        isPendentePassado: isPendentePassado,
        profissionalNome: (apt.profissionalId as any)?.nome || 'Profissional da Grade',
        origemHorarioFixo: Boolean(apt.origemHorarioFixo),
        isEmergenciaExtra: Boolean(apt.isEmergenciaExtra),
        wellness: apt.wellness,
        createdAt: apt.createdAt
      });
    }

    // 4. Incorporar logs de ajuste manual do admin nas movimentações
    for (const l of logs) {
      if (l.acao.toLowerCase().includes('ajust') || l.acao.toLowerCase().includes('crédito') || l.acao.toLowerCase().includes('credito')) {
        const logDateStr = l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : '';
        const logMonth = logDateStr.substring(0, 7);
        if (!mes || mes === 'todos' || logMonth === targetMonth) {
          movimentacoes.push({
            id: l._id,
            data: logDateStr,
            horario: l.createdAt ? new Date(l.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
            servico: 'Ajuste Manual Administrativo',
            tipo: 'administrativo',
            tipoCredito: 'academia',
            consumeCredito: false,
            custo: 0,
            status: 'concluido',
            statusDesc: l.detalhes || l.acao,
            tipoMovimento: 'ajuste_admin',
            impactoCredito: 0,
            isPast: true,
            isPendentePassado: false,
            profissionalNome: (l.profissionalId as any)?.nome || 'Administrador',
            origemHorarioFixo: false,
            isEmergenciaExtra: false,
            createdAt: l.createdAt
          });
        }
      }
    }

    // Ordenar todas as movimentações em ordem cronológica decrescente estrita por Data e Horário
    movimentacoes.sort((a, b) => {
      const dtA = `${a.data || '1970-01-01'}T${a.horario || '00:00'}:00`;
      const dtB = `${b.data || '1970-01-01'}T${b.horario || '00:00'}:00`;
      return dtB.localeCompare(dtA);
    });

    const creditosTotal = Number(com.creditosTotal || 0);
    const saldoDisponivelCalculado = Math.max(0, creditosTotal - consumidosNoMes - reservadosNoMes);

    const resumoConsolidado = {
      mesReferencia: targetMonth,
      franquiaMensal: creditosTotal,
      creditosTotal: creditosTotal,
      consumidosNoMes: consumidosNoMes,
      reservadosNoMes: reservadosNoMes,
      pendentesPassadosNoMes: pendentesPassadosNoMes,
      canceladosComEstornoNoMes: canceladosComEstornoNoMes,
      saldoRealDisponivel: saldoDisponivelCalculado,
      saldoDisponivelCalculado: saldoDisponivelCalculado,
      saldoCadastrado: {
        creditosTotal: com.creditosTotal || 0,
        creditosUsados: com.creditosUsados || 0,
        creditosReservados: com.creditosReservados || 0,
        disponivel: Math.max(0, (com.creditosTotal || 0) - (com.creditosUsados || 0) - (com.creditosReservados || 0))
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        cliente: {
          _id: client._id,
          nome: client.dadosPessoais?.nome || 'Aluno',
          email: client.dadosPessoais?.email || '',
          cpf: client.dadosPessoais?.cpf || '',
          telefone: client.dadosPessoais?.telefone || '',
          status: com.status || 'ativo',
          planoNome: (com.planoId as any)?.nome || 'Plano Personalizado',
          frequencia: com.frequencia || 2,
          dataInicio: com.dataInicio || '',
          vencimento: com.vencimento || '',
          duracao: com.duracao || 'mensal',
          regrasCredito: com.regrasCredito || {}
        },
        resumoMes: resumoConsolidado,
        resumo: resumoConsolidado,
        movimentacoes: movimentacoes
      }
    });
  } catch (error: any) {
    console.error('[API Admin Client Credits GET] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || (session?.user as any)?.tipo;
    const isAuthorized = ['admin', 'receptionist'].includes(userRole) || (session?.user as any)?.cargo?.includes('Admin');

    if (!isAuthorized) {
      return NextResponse.json({ success: false, error: 'Acesso restrito à administração e recepção.' }, { status: 403 });
    }

    const body = await request.json();
    const { clientId, operacao, quantidade, tipoCredito = 'academia', justificativa } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId é obrigatório.' }, { status: 400 });
    }

    if (!justificativa || justificativa.trim().length < 4) {
      return NextResponse.json({ success: false, error: 'Justificativa obrigatória (mínimo de 4 caracteres) para auditoria de crédito.' }, { status: 400 });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado.' }, { status: 404 });
    }

    if (!client.dadosComerciais) {
      client.dadosComerciais = {};
    }
    const com = client.dadosComerciais;
    const qtd = Number(quantidade) || 0;

    const fieldMap: Record<string, { total: string; usados: string; reservados: string }> = {
      academia: { total: 'creditosTotal', usados: 'creditosUsados', reservados: 'creditosReservados' },
      massagem: { total: 'creditosMassagemTotal', usados: 'creditosMassagemUsados', reservados: 'creditosMassagemReservados' },
      emergencia: { total: 'creditosEmergenciaTotal', usados: 'creditosEmergenciaUsados', reservados: 'creditosEmergenciaReservados' }
    };

    const targetFields = fieldMap[tipoCredito] || fieldMap.academia;
    const oldUsados = com[targetFields.usados] || 0;
    const oldTotal = com[targetFields.total] || 0;
    const oldReservados = com[targetFields.reservados] || 0;

    let actionLabel = '';

    if (operacao === 'add') {
      // Adicionar créditos = aumentar total ou reduzir usados
      com[targetFields.total] = (com[targetFields.total] || 0) + qtd;
      actionLabel = `Adicionou +${qtd} crédito(s) (${tipoCredito})`;
    } else if (operacao === 'sub') {
      // Subtrair créditos = deduzir do total
      com[targetFields.total] = Math.max(0, (com[targetFields.total] || 0) - qtd);
      actionLabel = `Subtraiu -${qtd} crédito(s) (${tipoCredito})`;
    } else if (operacao === 'reset_usados') {
      // Zerar/Ajustar usados para virada de mês
      com[targetFields.usados] = qtd;
      actionLabel = `Ajustou créditos usados para ${qtd} (${tipoCredito})`;
    } else if (operacao === 'set_total') {
      com[targetFields.total] = qtd;
      actionLabel = `Definiu franquia total para ${qtd} crédito(s) (${tipoCredito})`;
    } else if (operacao === 'sincronizar_mes') {
      // Sincronizar consumo real do mês automaticamente com base nas presenças e reservas do mês informado
      const targetMonth = body.mes || new Date().toISOString().substring(0, 7);
      const appointments = await Appointment.find({
        clienteId: client._id,
        data: { $regex: `^${targetMonth}` },
        consumeCredito: true
      });

      const now = new Date();
      const formatterDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
      const formatterTime = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
      const currentDateTime = `${formatterDate.format(now)}T${formatterTime.format(now)}`;

      let realUsados = 0;
      let realReservados = 0;
      appointments.forEach((a: any) => {
        if (a.status === 'presenca' || a.status === 'falta') realUsados += 1;
        // Apenas agendamentos FUTUROS contam como reserva ativa
        if (a.status === 'agendado' && `${a.data}T${a.horario || '00:00'}` >= currentDateTime) realReservados += 1;
      });

      com[targetFields.usados] = realUsados;
      com[targetFields.reservados] = realReservados;
      actionLabel = `Sincronizou créditos com consumo real de ${targetMonth}: ${realUsados} usados, ${realReservados} reservados`;
    } else if (operacao === 'baixa_pendente') {
      const { appointmentId, novoStatus } = body;
      if (!appointmentId || !['presenca', 'falta', 'cancelado'].includes(novoStatus)) {
        return NextResponse.json({ success: false, error: 'appointmentId e novoStatus (presenca, falta ou cancelado) são obrigatórios.' }, { status: 400 });
      }

      const apt = await Appointment.findById(appointmentId);
      if (!apt) {
        return NextResponse.json({ success: false, error: 'Agendamento não encontrado.' }, { status: 404 });
      }

      const statusAntigo = apt.status;
      apt.status = novoStatus;
      await apt.save();

      // Recalcular consumo real do mês
      const targetMonth = apt.data ? apt.data.substring(0, 7) : new Date().toISOString().substring(0, 7);
      const allMonthApts = await Appointment.find({
        clienteId: client._id,
        data: { $regex: `^${targetMonth}` },
        consumeCredito: true
      });

      const now = new Date();
      const formatterDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
      const formatterTime = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false });
      const currentDateTime = `${formatterDate.format(now)}T${formatterTime.format(now)}`;

      let realUsados = 0;
      let realReservados = 0;
      allMonthApts.forEach((a: any) => {
        if (a.status === 'presenca' || a.status === 'falta') realUsados += 1;
        if (a.status === 'agendado' && `${a.data}T${a.horario || '00:00'}` >= currentDateTime) realReservados += 1;
      });

      com[targetFields.usados] = realUsados;
      com[targetFields.reservados] = realReservados;
      actionLabel = `Baixa de ${novoStatus.toUpperCase()} na sessão de ${apt.data} às ${apt.horario} (era ${statusAntigo})`;
    }

    client.markModified('dadosComerciais');
    await client.save();

    // Gravar log de auditoria
    const executorProfId = (session?.user as any)?.professionalId || (session?.user as any)?.id || null;
    try {
      await ActivityLog.create({
        profissionalId: executorProfId,
        clienteId: client._id,
        acao: `Ajuste de Crédito: ${actionLabel}`,
        detalhes: `${client.dadosPessoais?.nome || 'Aluno'} - Justificativa: ${justificativa.trim()} (Antes: Total ${oldTotal}, Usados ${oldUsados}, Reservados ${oldReservados} -> Agora: Total ${com[targetFields.total]}, Usados ${com[targetFields.usados]}, Reservados ${com[targetFields.reservados]})`,
        origem: 'Acesso Direto'
      });
    } catch (logErr) {
      console.warn('[API Admin Client Credits POST] Log warning:', logErr);
    }

    return NextResponse.json({
      success: true,
      message: `${actionLabel} executado com sucesso!`,
      data: {
        clienteId: client._id,
        dadosComerciais: client.dadosComerciais,
        saldoDisponivel: Math.max(0, (com[targetFields.total] || 0) - (com[targetFields.usados] || 0) - (com[targetFields.reservados] || 0))
      }
    });
  } catch (error: any) {
    console.error('[API Admin Client Credits POST] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
