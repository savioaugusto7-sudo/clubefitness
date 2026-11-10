import { NextResponse } from 'next/server';
import { calculateProfessionalGoals } from '@/utils/professionalGoalsEngine';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const now = new Date();
    const currentYearMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
    const mesParam = searchParams.get('mes') || currentYearMonth;
    const planoParam = searchParams.get('plano') || 'todos';

    const data = await calculateProfessionalGoals(mesParam, planoParam);

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error: any) {
    console.error('Erro ao calcular metas dos profissionais:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
