import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { isSavioAdmin } from '@/lib/auth-savio';
import dbConnect from '@/utils/dbConnect';
import ClientActivityLog from '@/models/ClientActivityLog';
import Client from '@/models/Client';
import User from '@/models/User';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    const isAuthorized =
      isSavioAdmin(user) ||
      user?.role === 'admin' ||
      user?.tipo === 'admin' ||
      (Array.isArray(user?.activeRoles) && user.activeRoles.includes('admin'));

    if (!user || !isAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Acesso restrito: Exclusivo para administradores.' },
        { status: 403 }
      );
    }

    await dbConnect();
    // Previne erros de populate no Next.js
    const _c = Client;
    const _u = User;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const tipoAcao = searchParams.get('tipoAcao') || '';
    const executorFiltro = searchParams.get('executor') || 'todos'; // 'todos', 'aluno', 'equipe', 'admin'
    const clienteId = searchParams.get('clienteId') || '';
    const periodo = searchParams.get('periodo') || 'todos'; // 'hoje', 'ontem', '7dias', '30dias', 'mes_atual', 'todos', 'custom'
    const dataInicioParam = searchParams.get('dataInicio');
    const dataFimParam = searchParams.get('dataFim');
    const search = (searchParams.get('search') || '').trim();

    // 1. Montagem da Query
    const query: any = {};

    if (tipoAcao && tipoAcao !== 'todos') {
      query.tipoAcao = tipoAcao;
    }

    if (clienteId && clienteId !== 'todos') {
      query.clienteId = clienteId;
    }

    // Filtro de Data
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (periodo === 'hoje') {
      query.createdAt = { $gte: todayStart, $lte: todayEnd };
    } else if (periodo === 'ontem') {
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayEnd);
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      query.createdAt = { $gte: yesterdayStart, $lte: yesterdayEnd };
    } else if (periodo === '7dias') {
      const sevenDaysAgo = new Date(todayStart);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query.createdAt = { $gte: sevenDaysAgo, $lte: todayEnd };
    } else if (periodo === '30dias') {
      const thirtyDaysAgo = new Date(todayStart);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query.createdAt = { $gte: thirtyDaysAgo, $lte: todayEnd };
    } else if (periodo === 'mes_atual') {
      const firstDayMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      query.createdAt = { $gte: firstDayMonth, $lte: todayEnd };
    } else if (periodo === 'custom' && dataInicioParam) {
      const start = new Date(dataInicioParam);
      const end = dataFimParam ? new Date(dataFimParam) : new Date();
      end.setHours(23, 59, 59, 999);
      query.createdAt = { $gte: start, $lte: end };
    }

    // Busca textual inteligente se fornecida
    if (search) {
      const matchingClients = await Client.find({
        $or: [
          { 'dadosPessoais.nome': { $regex: search, $options: 'i' } },
          { 'dadosPessoais.telefone': { $regex: search, $options: 'i' } },
          { 'dadosPessoais.email': { $regex: search, $options: 'i' } }
        ]
      }).select('_id').lean();

      const clientIds = matchingClients.map(c => c._id);

      query.$or = [
        { acao: { $regex: search, $options: 'i' } },
        { detalhes: { $regex: search, $options: 'i' } },
        { executorNome: { $regex: search, $options: 'i' } },
        { 'metadata.modalidade': { $regex: search, $options: 'i' } },
        { 'metadata.motivoCancelamento': { $regex: search, $options: 'i' } },
        { clienteId: { $in: clientIds } }
      ];
    }

    // 2. Executa a busca
    // Buscamos um volume suficiente para mapeamento seguro com fallback
    const skip = (page - 1) * limit;

    const [rawLogs, totalDocuments] = await Promise.all([
      ClientActivityLog.find(query)
        .populate('clienteId', 'dadosPessoais.nome dadosPessoais.telefone dadosPessoais.foto dadosPessoais.email userId')
        .populate('usuarioId', 'name nome email role tipo cargo')
        .populate('executorUserId', 'name nome email role tipo cargo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit * 2) // buffer para filtragem em memória caso haja registros legados
        .lean(),
      ClientActivityLog.countDocuments(query)
    ]);

    // 3. Normalização e Inferência Retroativa de Executor
    const enrichedLogs = rawLogs.map((log: any) => {
      let executorTipo = log.executorTipo;
      let executorNome = log.executorNome;
      let executorRole = log.executorRole;
      let isSelfService = log.isSelfService;

      // Se não possui executorTipo explicitamente salvo (registros legados)
      if (!executorTipo || !executorNome) {
        const clientUserId = log.clienteId?.userId ? String(log.clienteId.userId) : null;
        const opUser = log.usuarioId || log.executorUserId;
        const opUserId = opUser?._id ? String(opUser._id) : (opUser ? String(opUser) : null);
        const opName = opUser?.name || opUser?.nome || '';
        const opRole = String(opUser?.role || opUser?.tipo || '').toLowerCase();

        if (clientUserId && opUserId && clientUserId === opUserId) {
          executorTipo = 'aluno';
          executorNome = 'Próprio Aluno';
          executorRole = 'client';
          isSelfService = true;
        } else if (opRole === 'client') {
          executorTipo = 'aluno';
          executorNome = 'Próprio Aluno';
          executorRole = 'client';
          isSelfService = true;
        } else if (opRole === 'admin' || opUser?.cargo === 'Administrador' || opUser?.cargo === 'Administrador Geral') {
          executorTipo = 'admin';
          executorNome = opName ? `Admin (${opName})` : 'Administrador';
          executorRole = 'admin';
          isSelfService = false;
        } else if (opRole === 'receptionist' || opRole === 'recepcao') {
          executorTipo = 'recepcao';
          executorNome = opName || 'Recepção';
          executorRole = 'receptionist';
          isSelfService = false;
        } else if (opUser) {
          executorTipo = 'profissional';
          if (opName.toLowerCase().includes('computador coletivo')) {
            executorNome = 'Computador Coletivo (Recepção/Totem)';
          } else {
            executorNome = opName ? (opName.startsWith('Prof.') ? opName : `Prof. ${opName}`) : 'Profissional';
          }
          executorRole = opRole || 'professional';
          isSelfService = false;
        } else {
          // Sem usuário na sessão
          executorTipo = 'aluno';
          executorNome = 'Próprio Aluno';
          executorRole = 'client';
          isSelfService = true;
        }
      }

      return {
        ...log,
        executorTipo,
        executorNome,
        executorRole,
        isSelfService: Boolean(isSelfService)
      };
    });

    // 4. Filtragem por Executor se solicitado
    let filteredLogs = enrichedLogs;
    if (executorFiltro && executorFiltro !== 'todos') {
      if (executorFiltro === 'aluno') {
        filteredLogs = enrichedLogs.filter((l: any) => l.executorTipo === 'aluno' || l.isSelfService);
      } else if (executorFiltro === 'equipe') {
        filteredLogs = enrichedLogs.filter((l: any) => l.executorTipo === 'profissional' || l.executorTipo === 'recepcao');
      } else if (executorFiltro === 'admin') {
        filteredLogs = enrichedLogs.filter((l: any) => l.executorTipo === 'admin');
      }
    }

    const paginatedLogs = filteredLogs.slice(0, limit);
    const total = executorFiltro && executorFiltro !== 'todos' ? filteredLogs.length : totalDocuments;

    // 5. Cálculos de KPIs em Tempo Real (Hoje) com Split de Autoatendimento
    const todayLogs = await ClientActivityLog.find({ createdAt: { $gte: todayStart, $lte: todayEnd } })
      .populate('clienteId', 'userId')
      .populate('usuarioId', 'role tipo cargo name nome')
      .lean();

    let selfServiceHoje = 0;
    let equipeHoje = 0;
    let adminHoje = 0;
    let cancelamentosUltimaHoraAluno = 0;
    let cancelamentosUltimaHoraEquipe = 0;

    todayLogs.forEach((l: any) => {
      const clientUserId = l.clienteId?.userId ? String(l.clienteId.userId) : null;
      const opUser = l.usuarioId;
      const opUserId = opUser?._id ? String(opUser._id) : (opUser ? String(opUser) : null);
      const opRole = String(opUser?.role || opUser?.tipo || '').toLowerCase();

      const isAluno = l.isSelfService || l.executorTipo === 'aluno' || (clientUserId && opUserId && clientUserId === opUserId) || opRole === 'client';
      const isAdmin = l.executorTipo === 'admin' || opRole === 'admin' || opUser?.cargo === 'Administrador';

      if (isAluno) {
        selfServiceHoje++;
        if (l.tipoAcao === 'cancelou' && l.metadata?.isUltimaHora) {
          cancelamentosUltimaHoraAluno++;
        }
      } else if (isAdmin) {
        adminHoje++;
        if (l.tipoAcao === 'cancelou' && l.metadata?.isUltimaHora) {
          cancelamentosUltimaHoraEquipe++;
        }
      } else {
        equipeHoje++;
        if (l.tipoAcao === 'cancelou' && l.metadata?.isUltimaHora) {
          cancelamentosUltimaHoraEquipe++;
        }
      }
    });

    const totalHoje = todayLogs.length;
    const agendouHoje = todayLogs.filter((l: any) => l.tipoAcao === 'agendou').length;
    const cancelouHoje = todayLogs.filter((l: any) => l.tipoAcao === 'cancelou').length;
    const checkinHoje = todayLogs.filter((l: any) => l.tipoAcao === 'checkin').length;
    const uniqueClientsToday = new Set(todayLogs.map((l: any) => l.clienteId?._id ? String(l.clienteId._id) : String(l.clienteId))).size;
    const cancelamentosUltimaHora = todayLogs.filter((l: any) => l.tipoAcao === 'cancelou' && l.metadata?.isUltimaHora).length;

    const totalAcoesHoje = agendouHoje + cancelouHoje;
    const taxaDesistenciaHoje = totalAcoesHoje > 0 
      ? Math.round((cancelouHoje / totalAcoesHoje) * 1000) / 10 
      : 0;

    const taxaSelfServiceHoje = totalHoje > 0
      ? Math.round((selfServiceHoje / totalHoje) * 1000) / 10
      : 0;

    return NextResponse.json({
      success: true,
      data: paginatedLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit))
      },
      kpis: {
        totalHoje,
        agendouHoje,
        cancelouHoje,
        checkinHoje,
        alunosAtivosHoje: uniqueClientsToday,
        taxaDesistenciaHoje,
        cancelamentosUltimaHora,
        // Novos KPIs de Autoria
        selfServiceHoje,
        equipeHoje,
        adminHoje,
        taxaSelfServiceHoje,
        cancelamentosUltimaHoraAluno,
        cancelamentosUltimaHoraEquipe
      }
    });
  } catch (error: any) {
    console.error('Erro ao buscar logs de movimentação de clientes:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro interno ao consultar auditoria.' },
      { status: 500 }
    );
  }
}
