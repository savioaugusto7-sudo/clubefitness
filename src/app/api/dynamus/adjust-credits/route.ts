import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
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
      return NextResponse.json({ success: false, error: 'Apenas administradores e recepção podem ajustar créditos.' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const { clientId, tipoCredito, operacao, quantidade, motivo } = body;

    if (!clientId || !tipoCredito || !operacao || !quantidade || quantidade <= 0) {
      return NextResponse.json({ success: false, error: 'Parâmetros inválidos para ajuste de crédito.' }, { status: 400 });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado.' }, { status: 404 });
    }

    if (!client.dadosComerciais) {
      client.dadosComerciais = {};
    }

    const qtd = Number(quantidade);

    if (tipoCredito === 'geral') {
      const atual = client.dadosComerciais.creditosTotal || 0;
      if (operacao === 'adicionar') {
        client.dadosComerciais.creditosTotal = atual + qtd;
      } else {
        client.dadosComerciais.creditosTotal = Math.max(0, atual - qtd);
      }
    } else if (tipoCredito === 'recovery') {
      const atual = client.dadosComerciais.creditosRecoveryTotal || 0;
      if (operacao === 'adicionar') {
        client.dadosComerciais.creditosRecoveryTotal = atual + qtd;
      } else {
        client.dadosComerciais.creditosRecoveryTotal = Math.max(0, atual - qtd);
      }
    } else if (tipoCredito === 'massagem') {
      const atual = client.dadosComerciais.creditosMassagemTotal || 0;
      if (operacao === 'adicionar') {
        client.dadosComerciais.creditosMassagemTotal = atual + qtd;
      } else {
        client.dadosComerciais.creditosMassagemTotal = Math.max(0, atual - qtd);
      }
    } else {
      return NextResponse.json({ success: false, error: 'Tipo de crédito inválido (geral, recovery ou massagem).' }, { status: 400 });
    }

    await client.save();

    return NextResponse.json({
      success: true,
      message: `Créditos de ${tipoCredito} ${operacao === 'adicionar' ? 'adicionados' : 'removidos'} com sucesso.`,
      client
    });
  } catch (error: any) {
    console.error('Erro ao ajustar créditos Dynamus:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
