import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const _c = Client;
    const _p = Professional;

    // 1. Capturar sessão sem lançar erro
    let session: any = null;
    let sessionError: string | null = null;
    try {
      session = await getServerSession(authOptions);
    } catch (e: any) {
      sessionError = e.message;
    }

    // 2. Buscar todos os assessments SEM verificação de sessão
    const allAssessments = await PhysicalAssessment.find({}).lean();
    const allClients = await Client.find({}, 'dadosPessoais.nome dadosPessoais.email').lean();

    return NextResponse.json({
      debug: true,
      timestamp: new Date().toISOString(),
      session: session ? {
        user: {
          email: (session.user as any)?.email,
          role: (session.user as any)?.role,
          activeRoles: (session.user as any)?.activeRoles,
          professionalProfileId: (session.user as any)?.professionalProfileId,
          clientProfileId: (session.user as any)?.clientProfileId,
        }
      } : null,
      sessionError,
      counts: {
        assessments: allAssessments.length,
        clients: allClients.length,
      },
      assessments: allAssessments.map(a => ({
        _id: a._id,
        clienteId: (a as any).clienteId,
        avaliadorId: (a as any).avaliadorId,
        data: (a as any).data,
        clienteIdType: typeof (a as any).clienteId,
      })),
      clients: allClients.map((c: any) => ({
        _id: c._id,
        nome: c.dadosPessoais?.nome,
        email: c.dadosPessoais?.email,
      })),
    }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({
      debug: true,
      fatalError: error.message,
      stack: error.stack?.substring(0, 500),
    }, { status: 500 });
  }
}
