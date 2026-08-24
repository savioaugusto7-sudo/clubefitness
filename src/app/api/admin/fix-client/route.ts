import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import User from '@/models/User';

export const maxDuration = 30;

// Rota de admin para gerenciar usuários
// GET /api/admin/fix-client?email=X&secret=clubefix2024&action=make-admin
// GET /api/admin/fix-client?email=X&secret=clubefix2024&action=fix-comercial
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const secret = searchParams.get('secret');
  const action = searchParams.get('action') || 'fix-comercial';

  if (secret !== 'clubefix2024') {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  if (!email) {
    return NextResponse.json({ success: false, error: 'Informe o email' }, { status: 400 });
  }

  await dbConnect();

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return NextResponse.json({ success: false, error: `Usuário não encontrado: ${email}` }, { status: 404 });
  }

  // ── Ação: promover a administrador ──
  if (action === 'make-admin') {
    user.tipo = 'admin';
    await user.save();

    return NextResponse.json({
      success: true,
      message: `✅ "${user.nome}" (${email}) agora é ADMINISTRADOR! Faça logout e login novamente.`,
      tipo: user.tipo,
    });
  }

  // ── Ação: corrigir dados do Reginaldo (6 semanas arquivadas no histórico) ──
  if (action === 'fix-reginaldo') {
    const Plan = (await import('@/models/Plan')).default;
    const client = await Client.findOne({
      $or: [
        { 'dadosPessoais.cpf': '056.960.776-09' },
        { 'dadosPessoais.email': email.toLowerCase() },
        { userId: user._id }
      ]
    });

    if (!client) {
      return NextResponse.json({ success: false, error: 'Cliente Reginaldo não encontrado' }, { status: 404 });
    }

    const planObj = await Plan.findOne({ nome: /Tratamento Personalizado/i }) || await Plan.findOne();

    client.historicoContratos = [{
      planoId: planObj?._id,
      planoNome: 'Tratamento Personalizado',
      tipoPlano: 'semana',
      dataInicio: '2026-07-08',
      dataFim: '2026-08-19',
      valorContratado: 333.33,
      formaPagamento: 'pix',
      creditosTotal: 12,
      creditosUsados: 12,
      statusCiclo: 'concluido',
      duracao: 'semana',
      duracaoQtd: 6,
      motivoEncerramento: 'Contrato concluído (Ciclo 08/07/2026 a 19/08/2026 • 6 semanas)'
    }];

    client.dadosComerciais = {
      status: 'finalizado',
      planoId: planObj?._id,
      planoNome: 'Tratamento Personalizado',
      duracao: 'semana',
      duracaoQtd: 6,
      dataInicio: '2026-07-08',
      vencimento: '2026-08-19',
      valorUnitario: 333.33,
      formaPagamento: 'pix',
      parcelas: 1,
      frequencia: 2,
      creditosTotal: 12,
      creditosUsados: 12,
      creditosReservados: 0,
      creditosMassagemTotal: 0,
      creditosMassagemUsados: 0,
      creditosMassagemReservados: 0,
      creditosEmergenciaTotal: 0,
      creditosEmergenciaUsados: 0,
      creditosEmergenciaReservados: 0,
      descontoTipo: 'percentual',
      descontoValor: 0
    } as any;

    await client.save();

    return NextResponse.json({
      success: true,
      message: `✅ Cadastro do Reginaldo restaurado com sucesso! Contrato anterior (08/07 a 19/08 • 6 semanas • R$ 333,33) arquivado no histórico e status definido como Finalizado.`,
      dadosComerciais: client.dadosComerciais,
      historicoContratos: client.historicoContratos
    });
  }

  // ── Ação: restaurar papel profissional ──
  if (action === 'restore-professional') {
    const crefito = searchParams.get('crefito') || 'CREFITO/00000-F';
    const esp = searchParams.get('especialidade') || 'Fisioterapia';

    user.tipo = 'professional';
    user.roles = ['professional'];
    user.cargo = esp;
    await user.save();

    // Force register models to avoid missing references
    const Professional = (await import('@/models/Professional')).default;
    const Client = (await import('@/models/Client')).default;

    // 1. Create or Update Professional record
    let prof = await Professional.findOne({ userId: user._id });
    if (!prof) {
      prof = await Professional.create({
        userId: user._id,
        nome: user.nome,
        especialidade: esp,
        registro: crefito
      });
    } else {
      prof.nome = user.nome;
      prof.especialidade = esp;
      prof.registro = crefito;
      await prof.save();
    }

    // 2. Delete duplicate Client record if it exists
    const clientDelResult = await Client.deleteOne({ userId: user._id });

    return NextResponse.json({
      success: true,
      message: `✅ "${user.nome}" (${email}) restaurado como PROFISSIONAL com sucesso! Perfil de aluno removido (${clientDelResult.deletedCount} registro). Crefito: ${crefito}.`,
      user: {
        tipo: user.tipo,
        roles: user.roles
      },
      professional: prof
    });
  }

  // ── Ação: resetar dados comerciais ──
  const client = await Client.findOne({ userId: user._id });
  if (!client) {
    return NextResponse.json({ success: false, error: 'Cliente não encontrado' }, { status: 404 });
  }

  client.dadosComerciais = {
    status: 'pendente',
    frequencia: 0,
    parcelas: 1,
    creditosTotal: 0,
    creditosUsados: 0,
    creditosReservados: 0,
    creditosMassagemTotal: 0,
    creditosMassagemUsados: 0,
    creditosMassagemReservados: 0,
    descontoValor: 0,
    descontoTipo: 'percentual',
    duracao: 'mensal',
    formaPagamento: 'pix',
    planoId: undefined,
    vencimento: undefined,
    dataInicio: undefined,
  } as any;

  client.cadastroConcluido = true;
  await client.save();

  return NextResponse.json({
    success: true,
    message: `✅ Dados comerciais de "${user.nome}" (${email}) resetados com sucesso!`,
    dadosComerciais: client.dadosComerciais,
  });
}
