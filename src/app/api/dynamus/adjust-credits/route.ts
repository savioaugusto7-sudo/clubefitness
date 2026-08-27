import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const maxDuration = 30;

function calculateExpirationDate(dataAdesao: string, periodicidade: string): string {
  if (!dataAdesao) return '';
  const date = new Date(dataAdesao + 'T12:00:00');
  if (isNaN(date.getTime())) return '';
  if (periodicidade.toLowerCase().includes('semestral')) {
    date.setMonth(date.getMonth() + 6);
  } else {
    date.setMonth(date.getMonth() + 12);
  }
  return date.toISOString().split('T')[0];
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 });
    }

    const userObj = session.user as any;
    const userRole = userObj.role || 'client';
    if (userRole !== 'admin' && userRole !== 'receptionist') {
      return NextResponse.json({ success: false, error: 'Apenas administradores e recepção podem ajustar dados Dynamus.' }, { status: 403 });
    }

    await dbConnect();
    const body = await request.json();
    const { clientId, tipoCredito, operacao, quantidade, dataInicio, periodicidade } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'Identificador do aluno não fornecido.' }, { status: 400 });
    }

    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ success: false, error: 'Aluno não encontrado.' }, { status: 404 });
    }

    if (!client.dadosComerciais) {
      client.dadosComerciais = {};
    }

    let alterouVigencia = false;

    // 1. Atualizar vigência / periodicidade se fornecidos
    client.dadosComerciais.isConvenioDynamus = true;

    if (dataInicio) {
      client.dadosComerciais.dataInicio = dataInicio;
      alterouVigencia = true;
    }

    if (periodicidade) {
      const isSemestral = periodicidade.toLowerCase().includes('semestral');
      client.dadosComerciais.periodicidadeDynamus = isSemestral ? 'semestral' : 'anual';
      alterouVigencia = true;
    }

    if (alterouVigencia) {
      const baseData = client.dadosComerciais.dataInicio || new Date().toISOString().split('T')[0];
      const dur = client.dadosComerciais.periodicidadeDynamus || 'anual';
      client.dadosComerciais.vigenciaDynamusFim = calculateExpirationDate(baseData, dur);
    }

    // 2. Ajustar créditos se fornecidos na carteira dedicada Dynamus
    if (tipoCredito && operacao && quantidade && Number(quantidade) > 0) {
      const qtd = Number(quantidade);
      if (tipoCredito === 'geral') {
        const atual = client.dadosComerciais.creditosDynamusTotal || client.dadosComerciais.creditosTotal || 0;
        const novoTotal = operacao === 'adicionar' ? atual + qtd : Math.max(0, atual - qtd);
        client.dadosComerciais.creditosDynamusTotal = novoTotal;
        client.dadosComerciais.saldoCreditosDynamus = novoTotal;
      } else if (tipoCredito === 'recovery') {
        const atual = client.dadosComerciais.creditosRecoveryTotal || 0;
        client.dadosComerciais.creditosRecoveryTotal = operacao === 'adicionar' ? atual + qtd : Math.max(0, atual - qtd);
      } else if (tipoCredito === 'massagem') {
        const atual = client.dadosComerciais.creditosMassagemTotal || 0;
        client.dadosComerciais.creditosMassagemTotal = operacao === 'adicionar' ? atual + qtd : Math.max(0, atual - qtd);
      }
    }

    await client.save();

    return NextResponse.json({
      success: true,
      message: 'Dados do aluno Dynamus atualizados com sucesso.',
      client
    });
  } catch (error: any) {
    console.error('Erro ao ajustar dados Dynamus:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
