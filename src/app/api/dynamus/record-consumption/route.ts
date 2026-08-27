import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Appointment from '@/models/Appointment';
import Professional from '@/models/Professional';
import ActivityLog from '@/models/ActivityLog';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 });
    }

    const userObj = session.user as any;
    const userRole = userObj.role || 'client';
    if (userRole !== 'admin' && userRole !== 'receptionist') {
      return NextResponse.json({ success: false, error: 'Apenas administradores e recepção podem lançar consumo retroativo.' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const { clientId, data, horario, servico, profissionalId, creditosDebitar, tipoCredito, observacoes } = body;

    if (!clientId || !data || !servico || !creditosDebitar || Number(creditosDebitar) <= 0) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios: Aluno, Data, Serviço e Quantidade de Créditos.' }, { status: 400 });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado.' }, { status: 404 });
    }

    // Obter ou usar primeiro profissional ativo como fallback se não informado
    let profId = profissionalId;
    if (!profId) {
      const firstProf = await Professional.findOne({});
      profId = firstProf?._id || '6668ab030303030303030302';
    }

    const qtd = Number(creditosDebitar);
    const tipo = servico.toLowerCase().includes('avaliacao') || servico.toLowerCase().includes('fisio') || servico.toLowerCase().includes('massagem') ? 'consultorio' : 'academia';

    // 1. Criar o atendimento com status presenca
    const apt = await Appointment.create({
      data,
      horario: horario || '12:00',
      tipo,
      servico: `${servico}${observacoes ? ` (${observacoes})` : ' [Lançamento Retroativo]'}`,
      consumeCredito: true,
      tipoCredito: tipoCredito === 'massagem' ? 'massagem' : 'academia',
      profissionalId: profId,
      clienteId: client._id,
      status: 'presenca'
    });

    // 2. Atualizar créditos usados no cadastro do aluno
    if (!client.dadosComerciais) {
      client.dadosComerciais = {};
    }

    if (tipoCredito === 'recovery') {
      client.dadosComerciais.creditosRecoveryUsados = (client.dadosComerciais.creditosRecoveryUsados || 0) + qtd;
    } else if (tipoCredito === 'massagem') {
      client.dadosComerciais.creditosMassagemUsados = (client.dadosComerciais.creditosMassagemUsados || 0) + qtd;
    } else {
      // Geral Dynamus
      client.dadosComerciais.creditosDynamusUsados = (client.dadosComerciais.creditosDynamusUsados || 0) + qtd;
      client.dadosComerciais.creditosUsados = (client.dadosComerciais.creditosUsados || 0) + qtd;
    }

    await client.save();

    // 3. Registrar Log de Atividade
    try {
      if (ActivityLog) {
        await ActivityLog.create({
          profissionalId: profId,
          clienteId: client._id,
          acao: `Lançou consumo retroativo Dynamus: ${qtd} crédito(s) (${servico})`,
          detalhes: `Data do atendimento: ${data}. Observação: ${observacoes || 'Nenhuma'}`,
          origem: 'painel_dynamus'
        });
      }
    } catch (e) {
      console.warn('Erro ao salvar log de consumo retroativo:', e);
    }

    return NextResponse.json({
      success: true,
      message: `Consumo de ${qtd} crédito(s) lançado com sucesso na data ${data}!`,
      appointment: apt,
      client
    });
  } catch (error: any) {
    console.error('Erro ao registrar consumo retroativo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
