import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import AssessmentDraft from '@/models/AssessmentDraft';
import Client from '@/models/Client';
import Professional from '@/models/Professional';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Force registration of models
const _models = { Client, Professional, AssessmentDraft };

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const profissionalId = searchParams.get('profissionalId');
    const clienteId = searchParams.get('clienteId');
    const tipo = searchParams.get('tipo');

    const query: any = {};
    if (profissionalId) query.profissionalId = profissionalId;
    if (clienteId) query.clienteId = clienteId;
    if (tipo) query.tipo = tipo;

    const drafts = await AssessmentDraft.find(query)
      .populate('clienteId', 'dadosPessoais.nome dadosPessoais.telefone dadosPessoais.cpf')
      .populate('profissionalId', 'nome email')
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: drafts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { profissionalId, clienteId, tipo, etapaAtual, dados } = body;

    if (!profissionalId || !clienteId || !tipo) {
      return NextResponse.json({ 
        success: false, 
        error: 'profissionalId, clienteId e tipo são obrigatórios.' 
      }, { status: 400 });
    }

    const draft = await AssessmentDraft.findOneAndUpdate(
      { profissionalId, clienteId, tipo },
      {
        etapaAtual: Number(etapaAtual || 1),
        dados: dados || {},
        savedAt: new Date()
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true, data: draft });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const profissionalId = searchParams.get('profissionalId');
    const clienteId = searchParams.get('clienteId');
    const tipo = searchParams.get('tipo');

    if (id) {
      await AssessmentDraft.findByIdAndDelete(id);
      return NextResponse.json({ success: true, message: 'Rascunho excluído' });
    }

    if (profissionalId && clienteId && tipo) {
      await AssessmentDraft.findOneAndDelete({ profissionalId, clienteId, tipo });
      return NextResponse.json({ success: true, message: 'Rascunho excluído' });
    }

    return NextResponse.json({ success: false, error: 'Parâmetros insuficientes para excluir rascunho.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
