import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/utils/dbConnect';
import SavioTask from '@/models/SavioTask';
import { isSavioAdmin, SAVIO_CANONICAL_EMAIL } from '@/lib/auth-savio';

// Helper para obter a data atual de Brasília (YYYY-MM-DD)
function getTodayBR(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'lista';
    const dataParam = searchParams.get('data');
    const semanaInicio = searchParams.get('semanaInicio');
    const semanaFim = searchParams.get('semanaFim');
    const mesParam = searchParams.get('mes');
    const anoParam = searchParams.get('ano');
    const statusParam = searchParams.get('status');
    const prioridadeParam = searchParams.get('prioridade');
    const categoriaParam = searchParams.get('categoria');
    const buscaParam = searchParams.get('busca');

    const todayBR = getTodayBR();

    // Query estrita isolada ao e-mail do Sávio
    const query: any = {
      userEmail: SAVIO_CANONICAL_EMAIL
    };

    // 1. Filtro por Visualização Temporal
    if (view === 'diaria' && dataParam) {
      query.data = dataParam;
    } else if (view === 'semanal' && semanaInicio && semanaFim) {
      query.data = { $gte: semanaInicio, $lte: semanaFim };
    } else if (view === 'mensal' && mesParam && anoParam) {
      const mesStr = mesParam.padStart(2, '0');
      query.data = { $regex: `^${anoParam}-${mesStr}` };
    }

    // 2. Filtro por Status
    if (statusParam && statusParam !== 'todas') {
      if (statusParam === 'atrasadas') {
        query.status = { $ne: 'concluida' };
        query.data = { ...(query.data && typeof query.data === 'object' ? query.data : {}), $lt: todayBR };
      } else {
        query.status = statusParam;
      }
    }

    // 3. Filtro por Prioridade
    if (prioridadeParam && prioridadeParam !== 'todas') {
      query.prioridade = prioridadeParam;
    }

    // 4. Filtro por Categoria
    if (categoriaParam && categoriaParam !== 'todas') {
      query.categoria = categoriaParam;
    }

    // 5. Busca Textual (Título e Descrição)
    if (buscaParam && buscaParam.trim()) {
      const regex = new RegExp(buscaParam.trim(), 'i');
      query.$or = [{ titulo: regex }, { descricao: regex }, { categoriaPersonalizada: regex }];
    }

    // Buscar tarefas ordenadas por data asc, horário asc e criação desc
    const tasks = await SavioTask.find(query)
      .sort({ data: 1, horario: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      tasks,
      total: tasks.length,
      todayBR
    });
  } catch (error: any) {
    console.error('Erro ao buscar tarefas do Sávio:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao consultar tarefas da agenda.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const {
      titulo,
      descricao,
      data,
      horario,
      prazoFinal,
      prioridade,
      categoria,
      categoriaPersonalizada,
      lembrete,
      status
    } = body;

    if (!titulo || !titulo.trim()) {
      return NextResponse.json(
        { success: false, error: 'O título da tarefa é obrigatório.' },
        { status: 400 }
      );
    }

    if (!data || !data.trim()) {
      return NextResponse.json(
        { success: false, error: 'A data de execução da tarefa é obrigatória.' },
        { status: 400 }
      );
    }

    const userId = user.id || user._id || '6a3d455ae52a33bfc8e5302f';

    const newTask = await SavioTask.create({
      userId,
      userEmail: SAVIO_CANONICAL_EMAIL,
      titulo: titulo.trim(),
      descricao: descricao ? descricao.trim() : '',
      data: data.trim(),
      horario: horario ? horario.trim() : '',
      prazoFinal: prazoFinal ? prazoFinal.trim() : '',
      prioridade: prioridade || 'media',
      categoria: categoria || 'administrativa',
      categoriaPersonalizada: categoriaPersonalizada ? categoriaPersonalizada.trim() : '',
      status: status || 'a_fazer',
      lembrete: lembrete !== false,
      concluidaEm: status === 'concluida' ? new Date() : null
    });

    return NextResponse.json({
      success: true,
      task: newTask,
      message: 'Tarefa criada com sucesso!'
    });
  } catch (error: any) {
    console.error('Erro ao criar tarefa do Sávio:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao cadastrar nova tarefa.' },
      { status: 500 }
    );
  }
}
