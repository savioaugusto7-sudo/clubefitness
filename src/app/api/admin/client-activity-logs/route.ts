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
    // Horário de Brasília aproximado
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
      // Buscar clientes que batem com o nome ou telefone
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
        { 'metadata.modalidade': { $regex: search, $options: 'i' } },
        { 'metadata.motivoCancelamento': { $regex: search, $options: 'i' } },
        { clienteId: { $in: clientIds } }
      ];
    }

    // 2. Executa a busca paginada
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ClientActivityLog.find(query)
        .populate('clienteId', 'dadosPessoais.nome dadosPessoais.telefone dadosPessoais.foto dadosPessoais.email')
        .populate('usuarioId', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ClientActivityLog.countDocuments(query)
    ]);

    // 3. Cálculos de KPIs em Tempo Real (Hoje)
    const [
      totalHoje,
      agendouHoje,
      cancelouHoje,
      checkinHoje,
      uniqueClientsToday,
      cancelamentosUltimaHora
    ] = await Promise.all([
      ClientActivityLog.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd } }),
      ClientActivityLog.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd }, tipoAcao: 'agendou' }),
      ClientActivityLog.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd }, tipoAcao: 'cancelou' }),
      ClientActivityLog.countDocuments({ createdAt: { $gte: todayStart, $lte: todayEnd }, tipoAcao: 'checkin' }),
      ClientActivityLog.distinct('clienteId', { createdAt: { $gte: todayStart, $lte: todayEnd } }),
      ClientActivityLog.countDocuments({
        createdAt: { $gte: todayStart, $lte: todayEnd },
        tipoAcao: 'cancelou',
        'metadata.isUltimaHora': true
      })
    ]);

    const totalAcoesHoje = agendouHoje + cancelouHoje;
    const taxaDesistenciaHoje = totalAcoesHoje > 0 
      ? Math.round((cancelouHoje / totalAcoesHoje) * 1000) / 10 
      : 0;

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      kpis: {
        totalHoje,
        agendouHoje,
        cancelouHoje,
        checkinHoje,
        alunosAtivosHoje: uniqueClientsToday.length,
        taxaDesistenciaHoje,
        cancelamentosUltimaHora
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

