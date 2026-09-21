import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Advertencia from '@/models/Advertencia';
import Professional from '@/models/Professional';
import ActivityLog from '@/models/ActivityLog';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();
    // Force model registration
    const _p = Professional;

    const { searchParams } = new URL(request.url);
    const mes = searchParams.get('mes');
    const profissionalId = searchParams.get('profissionalId');
    const status = searchParams.get('status');

    const query: any = {};
    if (mes) {
      query.mesReferencia = mes;
    }
    if (profissionalId && profissionalId !== 'todos') {
      query.profissionalId = profissionalId;
    }
    if (status && status !== 'todos') {
      query.status = status;
    }

    const advertencias = await Advertencia.find(query)
      .populate('profissionalId', 'nome especialidade registro')
      .sort({ data: -1, createdAt: -1 });

    return NextResponse.json({ success: true, data: advertencias });
  } catch (error: any) {
    console.error('Erro ao buscar advertências:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const { profissionalId, pontosDebito, descricao, data } = body;

    if (!profissionalId) {
      return NextResponse.json({ success: false, error: 'Selecione um profissional.' }, { status: 400 });
    }

    const pts = parseFloat(String(pontosDebito).replace(',', '.'));
    if (isNaN(pts) || pts <= 0) {
      return NextResponse.json({ success: false, error: 'A quantidade de pontos a debitar deve ser um número maior que zero.' }, { status: 400 });
    }

    if (!descricao || !descricao.trim()) {
      return NextResponse.json({ success: false, error: 'A descrição da advertência é obrigatória.' }, { status: 400 });
    }

    const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // "YYYY-MM-DD"
    const finalData = data ? String(data).trim() : todayStr;
    const mesReferencia = finalData.substring(0, 7);

    const prof = await Professional.findById(profissionalId);
    if (!prof) {
      return NextResponse.json({ success: false, error: 'Profissional não encontrado.' }, { status: 404 });
    }

    const adminName = (session?.user as any)?.name || 'Administrador';
    const adminId = (session?.user as any)?.id || 'admin';

    const novaAdvertencia = await Advertencia.create({
      profissionalId,
      pontosDebito: pts,
      descricao: descricao.trim(),
      data: finalData,
      mesReferencia,
      criadoPor: String(adminId),
      criadoPorNome: adminName,
      status: 'ativa'
    });

    // Registrar no ActivityLog para conformidade
    try {
      await ActivityLog.create({
        profissionalId,
        acao: 'Lançamento de Advertência Administrativa',
        detalhes: `Débito de ${pts} pts para ${prof.nome}. Motivo: ${descricao.trim().substring(0, 100)}`,
        origem: 'Painel do Administrador'
      });
    } catch (e) {
      console.error('Falha ao registrar ActivityLog da advertência:', e);
    }

    const populated = await Advertencia.findById(novaAdvertencia._id).populate('profissionalId', 'nome especialidade registro');

    return NextResponse.json({ success: true, data: populated });
  } catch (error: any) {
    console.error('Erro ao lançar advertência:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);

    const body = await request.json();
    const { id, status, motivoCancelamento } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID da advertência ausente.' }, { status: 400 });
    }

    const adv = await Advertencia.findById(id);
    if (!adv) {
      return NextResponse.json({ success: false, error: 'Advertência não encontrada.' }, { status: 404 });
    }

    if (status === 'cancelada') {
      adv.status = 'cancelada';
      adv.motivoCancelamento = motivoCancelamento ? String(motivoCancelamento).trim() : 'Cancelada pelo administrador';
      adv.canceladoEm = new Date();
      await adv.save();

      // Log de auditoria
      try {
        await ActivityLog.create({
          profissionalId: adv.profissionalId,
          acao: 'Cancelamento / Abono de Advertência Administrativa',
          detalhes: `Advertência de ${adv.pontosDebito} pts revogada. Justificativa: ${adv.motivoCancelamento}`,
          origem: 'Painel do Administrador'
        });
      } catch {}

      const populated = await Advertencia.findById(adv._id).populate('profissionalId', 'nome especialidade registro');
      return NextResponse.json({ success: true, data: populated });
    }

    return NextResponse.json({ success: false, error: 'Ação não suportada.' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao atualizar advertência:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
