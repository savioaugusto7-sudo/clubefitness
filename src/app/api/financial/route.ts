import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Financial from '@/models/Financial';

export async function GET() {
  try {
    await dbConnect();
    const records = await Financial.find({}).sort({ vencimento: -1 });
    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { descricao, categoria, valor, vencimento, data_pagamento, status, forma_pagamento, observacoes, comprovante } = body;

    if (!descricao || !categoria || valor === undefined || !vencimento) {
      return NextResponse.json({ success: false, error: 'Descrição, categoria, valor e vencimento são obrigatórios' }, { status: 400 });
    }

    const record = await Financial.create({
      descricao,
      categoria,
      valor: Number(valor),
      vencimento,
      data_pagamento: data_pagamento || '',
      status: status || 'Pendente',
      forma_pagamento: forma_pagamento || '',
      observacoes: observacoes || '',
      anexo_url: comprovante || ''
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, descricao, categoria, valor, vencimento, data_pagamento, status, forma_pagamento, observacoes, comprovante } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do registro financeiro é obrigatório' }, { status: 400 });
    }

    const record = await Financial.findById(id);
    if (!record) {
      return NextResponse.json({ success: false, error: 'Registro não encontrado' }, { status: 404 });
    }

    record.descricao = descricao || record.descricao;
    record.categoria = categoria || record.categoria;
    record.valor = valor !== undefined ? Number(valor) : record.valor;
    record.vencimento = vencimento || record.vencimento;
    record.data_pagamento = data_pagamento !== undefined ? data_pagamento : record.data_pagamento;
    record.status = status || record.status;
    record.forma_pagamento = forma_pagamento !== undefined ? forma_pagamento : record.forma_pagamento;
    record.observacoes = observacoes !== undefined ? observacoes : record.observacoes;
    record.anexo_url = comprovante !== undefined ? comprovante : record.anexo_url;

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

