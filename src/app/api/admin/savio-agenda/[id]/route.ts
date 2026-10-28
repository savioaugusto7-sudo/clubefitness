import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/utils/dbConnect';
import SavioTask from '@/models/SavioTask';
import { isSavioAdmin, SAVIO_CANONICAL_EMAIL } from '@/lib/auth-savio';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || !isSavioAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Acesso restrito: Esta agenda é de uso exclusivo do Administrador Sávio Augusto Oliveira.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID da tarefa não informado.' }, { status: 400 });
    }

    const body = await request.json();
    const existing = await SavioTask.findOne({ _id: id, userEmail: SAVIO_CANONICAL_EMAIL });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Tarefa não encontrada.' }, { status: 404 });
    }

    const updates: any = {};

    if (body.titulo !== undefined) updates.titulo = String(body.titulo).trim();
    if (body.descricao !== undefined) updates.descricao = String(body.descricao).trim();
    if (body.data !== undefined) updates.data = String(body.data).trim();
    if (body.horario !== undefined) updates.horario = String(body.horario).trim();
    if (body.prazoFinal !== undefined) updates.prazoFinal = String(body.prazoFinal).trim();
    if (body.prioridade !== undefined) updates.prioridade = body.prioridade;
    if (body.categoria !== undefined) updates.categoria = body.categoria;
    if (body.categoriaPersonalizada !== undefined) updates.categoriaPersonalizada = String(body.categoriaPersonalizada).trim();
    if (body.lembrete !== undefined) updates.lembrete = Boolean(body.lembrete);

    // Gestão de status e conclusão
    if (body.status !== undefined) {
      updates.status = body.status;
      if (body.status === 'concluida') {
        updates.concluidaEm = existing.concluidaEm || new Date();
      } else {
        updates.concluidaEm = null;
      }
    }

    const updatedTask = await SavioTask.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      task: updatedTask,
      message: 'Tarefa atualizada com sucesso!'
    });
  } catch (error: any) {
    console.error('Erro ao atualizar tarefa do Sávio:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao atualizar tarefa.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    if (!user || !isSavioAdmin(user)) {
      return NextResponse.json(
        { success: false, error: 'Acesso restrito: Esta agenda é de uso exclusivo do Administrador Sávio Augusto Oliveira.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID da tarefa não informado.' }, { status: 400 });
    }

    const deleted = await SavioTask.findOneAndDelete({ _id: id, userEmail: SAVIO_CANONICAL_EMAIL });

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Tarefa não encontrada ou já excluída.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Tarefa excluída com sucesso!'
    });
  } catch (error: any) {
    console.error('Erro ao excluir tarefa do Sávio:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao excluir tarefa.' },
      { status: 500 }
    );
  }
}
