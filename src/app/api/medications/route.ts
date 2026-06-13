import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Medication from '@/models/Medication';

export async function GET() {
  try {
    await dbConnect();
    const meds = await Medication.find({}).sort({ nome: 1 });
    return NextResponse.json({ success: true, data: meds });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { nome, categoria, quantidade, unidade, lote, validade, fabricante, fornecedor, data_compra, valor_compra, observacoes } = body;

    if (!nome) {
      return NextResponse.json({ success: false, error: 'Nome do medicamento é obrigatório' }, { status: 400 });
    }

    const med = await Medication.create({
      nome,
      categoria: categoria || '',
      quantidade: quantidade !== undefined ? Number(quantidade) : 0,
      unidade: unidade || '',
      lote: lote || '',
      validade: validade || '',
      fabricante: fabricante || '',
      fornecedor: fornecedor || '',
      data_compra: data_compra || '',
      valor_compra: valor_compra !== undefined ? Number(valor_compra) : 0,
      observacoes: observacoes || ''
    });

    return NextResponse.json({ success: true, data: med });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, nome, categoria, quantidade, unidade, lote, validade, fabricante, fornecedor, data_compra, valor_compra, observacoes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID do medicamento é obrigatório' }, { status: 400 });
    }

    const med = await Medication.findById(id);
    if (!med) {
      return NextResponse.json({ success: false, error: 'Medicamento não encontrado' }, { status: 404 });
    }

    med.nome = nome || med.nome;
    med.categoria = categoria !== undefined ? categoria : med.categoria;
    med.quantidade = quantidade !== undefined ? Number(quantidade) : med.quantidade;
    med.unidade = unidade !== undefined ? unidade : med.unidade;
    med.lote = lote !== undefined ? lote : med.lote;
    med.validade = validade !== undefined ? validade : med.validade;
    med.fabricante = fabricante !== undefined ? fabricante : med.fabricante;
    med.fornecedor = fornecedor !== undefined ? fornecedor : med.fornecedor;
    med.data_compra = data_compra !== undefined ? data_compra : med.data_compra;
    med.valor_compra = valor_compra !== undefined ? Number(valor_compra) : med.valor_compra;
    med.observacoes = observacoes !== undefined ? observacoes : med.observacoes;

    await med.save();
    return NextResponse.json({ success: true, data: med });
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
      return NextResponse.json({ success: false, error: 'ID do medicamento é obrigatório' }, { status: 400 });
    }

    await Medication.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Medicamento excluído com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
