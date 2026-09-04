import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Financial from '@/models/Financial';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const status = searchParams.get('status');
    const categoria = searchParams.get('categoria');

    const query: any = {};
    if (month) {
      query.vencimento = { $regex: `^${month}` };
    }
    if (status) {
      query.status = status;
    }
    if (categoria) {
      query.categoria = categoria;
    }

    const records = await Financial.find(query).sort({ vencimento: -1 });
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      descricao,
      categoria,
      tipo_custo,
      centro_custo,
      fornecedor,
      competencia,
      valor,
      vencimento,
      data_pagamento,
      status,
      forma_pagamento,
      observacoes,
      comprovante,
      recorrente,
      recorrencia_meses
    } = body;

    if (!descricao || !categoria || valor === undefined || !vencimento) {
      return NextResponse.json({ success: false, error: 'Descrição, categoria, valor e vencimento são obrigatórios' }, { status: 400 });
    }

    const totalMeses = recorrente ? Math.max(1, Number(recorrencia_meses) || 1) : 1;
    const recordsToInsert = [];

    const baseDueDate = new Date(vencimento + (vencimento.includes('T') ? '' : 'T12:00:00'));

    for (let i = 0; i < totalMeses; i++) {
      const curDue = new Date(baseDueDate);
      curDue.setMonth(curDue.getMonth() + i);
      const dueStr = curDue.toISOString().split('T')[0];
      const compStr = competencia || dueStr.substring(0, 7);

      recordsToInsert.push({
        descricao: totalMeses > 1 ? `${descricao} (${i + 1}/${totalMeses})` : descricao,
        categoria,
        tipo_custo: tipo_custo || 'fixo',
        centro_custo: centro_custo || 'operacional',
        fornecedor: fornecedor || '',
        competencia: compStr,
        valor: Number(valor),
        vencimento: dueStr,
        data_pagamento: (i === 0 && data_pagamento) ? data_pagamento : '',
        status: (i === 0 && status) ? status : 'Pendente',
        forma_pagamento: (i === 0 && forma_pagamento) ? forma_pagamento : '',
        observacoes: observacoes || '',
        anexo_url: comprovante || '',
        recorrente: Boolean(recorrente),
        recorrencia_meses: totalMeses
      });
    }

    if (recordsToInsert.length === 1) {
      const record = await Financial.create(recordsToInsert[0]);
      return NextResponse.json({ success: true, data: record });
    } else {
      const records = await Financial.insertMany(recordsToInsert);
      return NextResponse.json({ success: true, data: records });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const {
      id,
      action,
      descricao,
      categoria,
      tipo_custo,
      centro_custo,
      fornecedor,
      competencia,
      valor,
      vencimento,
      data_pagamento,
      status,
      forma_pagamento,
      observacoes,
      comprovante
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do registro financeiro é obrigatório' }, { status: 400 });
    }

    const record = await Financial.findById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Registro não encontrado' }, { status: 404 });
    }

    // Ação de baixa rápida
    if (action === 'dar_baixa') {
      record.status = 'Pago';
      record.data_pagamento = data_pagamento || new Date().toISOString().split('T')[0];
      if (forma_pagamento) record.forma_pagamento = forma_pagamento;
      await record.save();
      return NextResponse.json({ success: true, data: record });
    }

    if (descricao !== undefined) record.descricao = descricao;
    if (categoria !== undefined) record.categoria = categoria;
    if (tipo_custo !== undefined) record.tipo_custo = tipo_custo;
    if (centro_custo !== undefined) record.centro_custo = centro_custo;
    if (fornecedor !== undefined) record.fornecedor = fornecedor;
    if (competencia !== undefined) record.competencia = competencia;
    if (valor !== undefined) record.valor = Number(valor);
    if (vencimento !== undefined) record.vencimento = vencimento;
    if (data_pagamento !== undefined) record.data_pagamento = data_pagamento;
    if (status !== undefined) record.status = status;
    if (forma_pagamento !== undefined) record.forma_pagamento = forma_pagamento;
    if (observacoes !== undefined) record.observacoes = observacoes;
    if (comprovante !== undefined) record.anexo_url = comprovante;

    await record.save();
    return NextResponse.json({ success: true, data: record });
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
      return NextResponse.json({ success: false, error: 'ID do registro financeiro é obrigatório' }, { status: 400 });
    }

    await Financial.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Registro financeiro excluído com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
