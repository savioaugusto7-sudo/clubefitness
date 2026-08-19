import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import { checkSessionPermission } from '@/utils/authHelper';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const paramClientId = searchParams.get('clientId');
    const id = searchParams.get('id');
    const isDraftQuery = searchParams.get('draft') === 'true' || searchParams.get('status') === 'rascunho';

    // Se estiver buscando um rascunho específico de um aluno
    if (isDraftQuery && paramClientId) {
      try {
        const objId = new mongoose.Types.ObjectId(paramClientId);
        const draft = await PhysicalAssessment.findOne({
          clienteId: { $in: [paramClientId, objId] },
          $or: [
            { status: 'rascunho' },
            { isDraft: true }
          ]
        })
          .sort({ updatedAt: -1 })
          .lean()
          .maxTimeMS(4000);

        return NextResponse.json(
          { success: true, draft: draft || null },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      } catch {
        return NextResponse.json({ success: true, draft: null });
      }
    }

    // Se estiver buscando um documento completo específico (ex: download de PDF)
    if (id) {
      const fullDoc = await PhysicalAssessment.findById(id).lean().maxTimeMS(4000);
      return NextResponse.json(
        { success: true, data: fullDoc },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    let query: any = {};
    if (paramClientId) {
      try {
        const objId = new mongoose.Types.ObjectId(paramClientId);
        query.clienteId = { $in: [paramClientId, objId] };
      } catch {
        query.clienteId = paramClientId;
      }
    }

    // Por padrão na listagem, omitir rascunhos em aberto da tabela oficial a menos que explicitamente pedido
    if (!isDraftQuery) {
      query.status = { $ne: 'rascunho' };
    }

    // Projeção rápida para a tabela
    const assessments = await PhysicalAssessment.find(query)
      .select('clienteId avaliadorId data status isDraft dadosMedidos.peso dadosMedidos.altura dadosMedidos.sexo dadosMedidos.idade resultadosCalculados.percentualGordura resultadosCalculados.massaMagra resultadosCalculados.massaGorda resultadosCalculados.imc resultadosCalculados.rcq createdAt updatedAt')
      .sort({ data: -1, createdAt: -1 })
      .lean()
      .maxTimeMS(4000);

    return NextResponse.json(
      { success: true, data: assessments, count: assessments.length },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('[assessments GET] Error:', error.message);
    return NextResponse.json(
      { success: false, data: [], error: error.message },
      { headers: { 'Cache-Control': 'no-store' }, status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    
    await checkSessionPermission(['admin', 'professional'], undefined, request);

    const body = await request.json();
    const { 
      id,
      draftId,
      clienteId, 
      avaliadorId, 
      data, 
      dadosMedidos, 
      resultadosCalculados, 
      metas, 
      observacoes, 
      pdfName, 
      pdf_url, 
      tempoGastoSegundos,
      status,
      isDraft
    } = body;

    if (!clienteId || !data) {
      return NextResponse.json({ success: false, error: 'Campos obrigatórios ausentes (cliente e data).' }, { status: 400 });
    }

    const isDraftSave = status === 'rascunho' || isDraft === true;

    // 1. Caso seja Auto-Save Silencioso na Nuvem (Rascunho)
    if (isDraftSave) {
      let existingDraft = null;
      if (draftId || id) {
        existingDraft = await PhysicalAssessment.findById(draftId || id);
      } else {
        existingDraft = await PhysicalAssessment.findOne({
          clienteId,
          $or: [{ status: 'rascunho' }, { isDraft: true }]
        }).sort({ updatedAt: -1 });
      }

      if (existingDraft) {
        existingDraft.dadosMedidos = dadosMedidos || existingDraft.dadosMedidos;
        existingDraft.resultadosCalculados = resultadosCalculados || existingDraft.resultadosCalculados;
        existingDraft.metas = metas || existingDraft.metas;
        existingDraft.observacoes = observacoes !== undefined ? observacoes : existingDraft.observacoes;
        existingDraft.tempoGastoSegundos = Number(tempoGastoSegundos) || existingDraft.tempoGastoSegundos;
        existingDraft.data = data || existingDraft.data;
        existingDraft.status = 'rascunho';
        existingDraft.isDraft = true;
        if (avaliadorId) existingDraft.avaliadorId = avaliadorId;

        await existingDraft.save();
        return NextResponse.json({ success: true, data: existingDraft, autoSaved: true });
      }

      // Se não havia rascunho anterior, cria um novo rascunho
      const newDraft = await PhysicalAssessment.create({
        clienteId,
        avaliadorId: avaliadorId || '6668ab030303030303030302',
        data,
        dadosMedidos: dadosMedidos || {},
        resultadosCalculados: resultadosCalculados || {},
        metas: metas || {},
        observacoes: observacoes || '',
        pdfName: pdfName || '',
        pdf_url: pdf_url || '',
        tempoGastoSegundos: Number(tempoGastoSegundos) || 0,
        status: 'rascunho',
        isDraft: true
      });

      return NextResponse.json({ success: true, data: newDraft, autoSaved: true });
    }

    // 2. Caso seja Conclusão e Finalização Oficial da Avaliação
    let assessmentDoc = null;
    if (draftId || id) {
      assessmentDoc = await PhysicalAssessment.findById(draftId || id);
    } else {
      // Buscar se havia rascunho em aberto para promover a concluído
      assessmentDoc = await PhysicalAssessment.findOne({
        clienteId,
        $or: [{ status: 'rascunho' }, { isDraft: true }]
      }).sort({ updatedAt: -1 });
    }

    if (assessmentDoc) {
      assessmentDoc.clienteId = clienteId;
      if (avaliadorId) assessmentDoc.avaliadorId = avaliadorId;
      assessmentDoc.data = data;
      assessmentDoc.dadosMedidos = dadosMedidos;
      assessmentDoc.resultadosCalculados = resultadosCalculados;
      assessmentDoc.metas = metas;
      assessmentDoc.observacoes = observacoes || '';
      assessmentDoc.pdfName = pdfName || assessmentDoc.pdfName;
      assessmentDoc.pdf_url = pdf_url || assessmentDoc.pdf_url || '';
      assessmentDoc.tempoGastoSegundos = Number(tempoGastoSegundos) || assessmentDoc.tempoGastoSegundos;
      assessmentDoc.status = 'concluido';
      assessmentDoc.isDraft = false;

      await assessmentDoc.save();
      return NextResponse.json({ success: true, data: assessmentDoc });
    }

    // Criar nova avaliação diretamente como concluída
    const assessment = await PhysicalAssessment.create({
      clienteId,
      avaliadorId: avaliadorId || '6668ab030303030303030302',
      data,
      dadosMedidos,
      resultadosCalculados,
      metas,
      observacoes,
      pdfName,
      pdf_url: pdf_url || '',
      tempoGastoSegundos: Number(tempoGastoSegundos) || 0,
      status: 'concluido',
      isDraft: false
    });

    return NextResponse.json({ success: true, data: assessment });
  } catch (error: any) {
    console.error('[assessments POST] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    
    await checkSessionPermission(['admin', 'professional'], undefined, request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 });
    }

    await PhysicalAssessment.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Physical assessment deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
