import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Trancamento from '@/models/Trancamento';
import Client from '@/models/Client';
import Contract from '@/models/Contract';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    // Make sure models are registered
    const _client = Client;
    const _contract = Contract;

    let query = {};
    if (clientId) {
      query = { clientId };
    }

    const trancamentos = await Trancamento.find(query)
      .populate('clientId')
      .populate('contractId')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: trancamentos });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { clientId, contractId, dataInicio, semanas, redistribuicao } = body;

    if (!clientId || !contractId || !dataInicio || !semanas || !redistribuicao) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes.' }, { status: 400 });
    }

    // 1. Get contract
    const contract = await Contract.findById(contractId);
    if (!contract) {
      return NextResponse.json({ success: false, error: 'Contrato não encontrado.' }, { status: 404 });
    }

    // 2. Check total weeks frozen so far for this contract
    const existing = await Trancamento.find({ contractId });
    const totalSemanasAnteriores = existing.reduce((sum: number, item: any) => sum + item.semanas, 0);

    if (totalSemanasAnteriores + Number(semanas) > 4) {
      return NextResponse.json({
        success: false,
        error: `Você já trancou ${totalSemanasAnteriores} semanas. Não é permitido exceder o limite de 4 semanas por contrato.`
      }, { status: 400 });
    }

    // 3. Consult weekly frequency
    const frequencia = contract.frequencia || 3;
    const creditosTrancados = Number(semanas) * frequencia;

    // 4. Validate redistribution credits sum
    const sumRedistribuicao = redistribuicao.reduce((sum: number, r: any) => sum + Number(r.creditos || 0), 0);
    if (sumRedistribuicao !== creditosTrancados) {
      return NextResponse.json({
        success: false,
        error: `A soma dos créditos redistribuídos (${sumRedistribuicao}) deve ser igual ao total de créditos trancados (${creditosTrancados}).`
      }, { status: 400 });
    }

    // 5. Create Trancamento
    const trancamento = await Trancamento.create({
      clientId,
      contractId,
      dataInicio,
      semanas: Number(semanas),
      creditosTrancados,
      redistribuicao
    });

    // 6. Update current month's credits in database if credits are redistributed to current month
    const client = await Client.findById(clientId);
    if (client) {
      const currentMonthStr = new Date().toISOString().slice(0, 7); // e.g. "2026-06"
      const currentAlloc = redistribuicao.find((r: any) => r.mesAno === currentMonthStr);
      if (currentAlloc && Number(currentAlloc.creditos) > 0) {
        client.dadosComerciais.creditosTotal = (client.dadosComerciais.creditosTotal || 0) + Number(currentAlloc.creditos);
        client.markModified('dadosComerciais');
        await client.save();
      }
    }

    return NextResponse.json({ success: true, data: trancamento });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
