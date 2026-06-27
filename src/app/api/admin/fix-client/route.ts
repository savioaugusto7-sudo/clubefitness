import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import User from '@/models/User';

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
