import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import dbConnect from '@/utils/dbConnect';
import SavioTask from '@/models/SavioTask';
import { isSavioAdmin, SAVIO_CANONICAL_EMAIL } from '@/lib/auth-savio';

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
    const mesParam = searchParams.get('mes');
    const anoParam = searchParams.get('ano');

    const todayBR = getTodayBR();
    const baseQuery = { userEmail: SAVIO_CANONICAL_EMAIL };

    // Executar contagens em paralelo no MongoDB
    const [
      hojeTotal,
      hojePendentes,
      concluidasHoje,
      atrasadas,
      emAndamento,
      proximas,
      totalGeral,
      concluidasTotal
    ] = await Promise.all([
      SavioTask.countDocuments({ ...baseQuery, data: todayBR }),
      SavioTask.countDocuments({ ...baseQuery, data: todayBR, status: { $ne: 'concluida' } }),
      SavioTask.countDocuments({ ...baseQuery, data: todayBR, status: 'concluida' }),
      SavioTask.countDocuments({ ...baseQuery, data: { $lt: todayBR }, status: { $ne: 'concluida' } }),
      SavioTask.countDocuments({ ...baseQuery, status: 'em_andamento' }),
      SavioTask.countDocuments({ ...baseQuery, data: { $gt: todayBR }, status: { $ne: 'concluida' } }),
      SavioTask.countDocuments(baseQuery),
      SavioTask.countDocuments({ ...baseQuery, status: 'concluida' })
    ]);

    // Cálculo da taxa de conclusão do dia
    const taxaHoje = hojeTotal > 0 ? Math.round((concluidasHoje / hojeTotal) * 100) : (concluidasHoje > 0 ? 100 : 0);

    // Cálculo da taxa de conclusão do mês se solicitado
    let mesTotal = 0;
    let mesConcluidas = 0;
    let taxaMes = 0;

    if (mesParam && anoParam) {
      const mesStr = mesParam.padStart(2, '0');
      const mesRegex = { $regex: `^${anoParam}-${mesStr}` };
      [mesTotal, mesConcluidas] = await Promise.all([
        SavioTask.countDocuments({ ...baseQuery, data: mesRegex }),
        SavioTask.countDocuments({ ...baseQuery, data: mesRegex, status: 'concluida' })
      ]);
      taxaMes = mesTotal > 0 ? Math.round((mesConcluidas / mesTotal) * 100) : 0;
    }

    // Taxa de conclusão global
    const taxaGeral = totalGeral > 0 ? Math.round((concluidasTotal / totalGeral) * 100) : 0;

    return NextResponse.json({
      success: true,
      todayBR,
      summary: {
        hojeTotal,
        hojePendentes,
        concluidasHoje,
        atrasadas,
        emAndamento,
        proximas,
        totalGeral,
        concluidasTotal,
        taxaHoje,
        taxaMes,
        taxaGeral,
        // Badge indicator: se houver atrasadas é prioridade máxima (vermelho), senão hojePendentes (laranja)
        badgeCount: atrasadas + hojePendentes,
        hasCriticalAlert: atrasadas > 0
      }
    });
  } catch (error: any) {
    console.error('Erro ao gerar resumo da agenda do Sávio:', error);
    return NextResponse.json(
      { success: false, error: 'Erro interno ao consultar resumo estatístico.' },
      { status: 500 }
    );
  }
}
