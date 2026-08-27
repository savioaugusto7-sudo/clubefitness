import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import '@/models/Client';
import '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';
import { syncPhysicalAssessmentTests } from '@/utils/testMemorySync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

function toValidObjectId(val: any, fallback?: string): mongoose.Types.ObjectId | null {
  if (!val) return fallback ? new mongoose.Types.ObjectId(fallback) : null;
  const str = String(val).trim();
  if (mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str)) {
    try {
      return new mongoose.Types.ObjectId(str);
    } catch {
      return fallback ? new mongoose.Types.ObjectId(fallback) : null;
    }
  }
  return fallback ? new mongoose.Types.ObjectId(fallback) : null;
}

function calculatePollock7BFHelper(sumDobras: number, age: number, sex: string): number {
  if (sumDobras <= 0) return 0;
  const isFemale = (sex || '').trim().toUpperCase().startsWith('F');
  let densidade = 0;
  if (!isFemale) {
    densidade = 1.112 - (0.00043499 * sumDobras) + (0.00000055 * sumDobras * sumDobras) - (0.00028826 * (age || 30));
  } else {
    densidade = 1.097 - (0.00046971 * sumDobras) + (0.00000056 * sumDobras * sumDobras) - (0.00012828 * (age || 30));
  }
  if (densidade <= 0) return 0;
  const bf = ((4.95 / densidade) - 4.50) * 100;
  return Math.max(3, Math.min(60, Number(bf.toFixed(1))));
}

function hydrateAssessmentResults(asDoc: any) {
  if (!asDoc) return asDoc;
  const dm = asDoc.dadosMedidos || {};
  let rc = asDoc.resultadosCalculados || {};

  const peso = Number(dm.peso) || 0;
  let altura = Number(dm.altura) || 0;
  if (altura > 3) altura = altura / 100;
  const idade = Number(dm.idade) || 30;
  const sexo = dm.sexo || 'M';

  // Extrair soma das dobras se disponível
  let sumDobras = Number(dm.somaDobras) || 0;
  if (sumDobras <= 0 && dm.dobras) {
    const d = dm.dobras;
    sumDobras = (Number(d.peitoral) || 0) + (Number(d.triceps) || 0) + (Number(d.subescapular) || 0) +
                (Number(d.subaxilar) || 0) + (Number(d.suprailiaca) || 0) + (Number(d.abdomen) || 0) +
                (Number(d.coxa) || 0) + (Number(d.panturrilha) || 0);
  }

  let bf = Number(rc.percentualGordura) || 0;
  if (bf <= 0 && sumDobras > 0) {
    bf = calculatePollock7BFHelper(sumDobras, idade, sexo);
  }

  let mg = Number(rc.massaGorda) || 0;
  let mm = Number(rc.massaMagra) || 0;
  if ((mg <= 0 || mm <= 0) && peso > 0 && bf > 0) {
    mg = Number(((peso * bf) / 100).toFixed(1));
    mm = Number((peso - mg).toFixed(1));
  }

  let imc = Number(rc.imc) || 0;
  if ((imc <= 1 || imc > 100) && peso > 0 && altura > 0) {
    imc = Number((peso / (altura * altura)).toFixed(1));
  }

  let imcClass = rc.imcClassificacao;
  if (!imcClass || imcClass === '-' || (imcClass === 'Baixo peso' && imc >= 18.5)) {
    if (imc < 18.5) imcClass = 'Baixo peso';
    else if (imc < 25) imcClass = 'Normal';
    else if (imc < 30) imcClass = 'Sobrepeso';
    else imcClass = 'Obesidade';
  }

  // RCQ e Classificação
  const circ = dm.circunferencias || {};
  const cintura = Number(circ.cintura) || 0;
  const quadril = Number(circ.quadril) || 1;
  let rcq = Number(rc.rcq) || 0;
  if (rcq <= 0 && cintura > 0 && quadril > 0) {
    rcq = Number((cintura / quadril).toFixed(2));
  }
  let rcqClass = rc.rcqClassificacao;
  if (!rcqClass || rcqClass === '-' || (rcqClass === 'Baixo Risco' && rcq > 0.77)) {
    const isF = (sexo || '').trim().toUpperCase().startsWith('F');
    if (!isF) {
      rcqClass = rcq > 0.95 ? 'Alto Risco' : (rcq >= 0.88 ? 'Risco Moderado' : 'Baixo Risco');
    } else {
      rcqClass = rcq > 0.86 ? 'Alto Risco' : (rcq >= 0.78 ? 'Risco Moderado' : 'Baixo Risco');
    }
  }

  asDoc.resultadosCalculados = {
    ...rc,
    percentualGordura: bf,
    massaGorda: mg,
    massaMagra: mm,
    imc,
    imcClassificacao: imcClass,
    rcq,
    rcqClassificacao: rcqClass
  };

  return asDoc;
}

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
        const objId = toValidObjectId(paramClientId);
        const queryClient = objId ? { $in: [paramClientId, objId] } : paramClientId;
        const draft = await PhysicalAssessment.findOne({
          clienteId: queryClient,
          $or: [
            { status: 'rascunho' },
            { isDraft: true }
          ]
        })
          .sort({ updatedAt: -1 })
          .lean()
          .maxTimeMS(12000);

        return NextResponse.json(
          { success: true, draft: draft ? hydrateAssessmentResults(draft) : null },
          { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      } catch {
        return NextResponse.json({ success: true, draft: null });
      }
    }

    // Se estiver buscando um documento completo específico (ex: download de PDF)
    if (id) {
      const validId = toValidObjectId(id);
      if (!validId) {
        return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
      }
      const fullDoc = await PhysicalAssessment.findById(validId).lean().maxTimeMS(12000);
      return NextResponse.json(
        { success: true, data: fullDoc ? hydrateAssessmentResults(fullDoc) : null },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    let query: any = {};
    if (paramClientId) {
      const objId = toValidObjectId(paramClientId);
      query.clienteId = objId ? { $in: [paramClientId, objId] } : paramClientId;
    }

    // Por padrão na listagem, omitir rascunhos em aberto da tabela oficial a menos que explicitamente pedido
    if (!isDraftQuery) {
      query.status = { $ne: 'rascunho' };
    }

    // Projeção rápida para a tabela: traz todos os dados medidos e calculados, omitindo anexos pesados
    const assessments = await PhysicalAssessment.find(query)
      .select('-pdf_url -anexos')
      .sort({ data: -1, createdAt: -1 })
      .lean()
      .maxTimeMS(12000);

    const hydratedList = (assessments || []).map(item => hydrateAssessmentResults(item));

    return NextResponse.json(
      { success: true, data: hydratedList, count: hydratedList.length },
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Corpo da requisição inválido (JSON inválido).' }, { status: 400 });
    }

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

    const validClienteId = toValidObjectId(clienteId);
    if (!validClienteId) {
      return NextResponse.json({ success: false, error: 'ID do cliente inválido.' }, { status: 400 });
    }

    const validAvaliadorId = toValidObjectId(avaliadorId, '6668ab030303030303030302') || new mongoose.Types.ObjectId('6668ab030303030303030302');
    const isDraftSave = status === 'rascunho' || isDraft === true;

    // Calcular e hidratar resultados antes de salvar
    const tempDoc = hydrateAssessmentResults({
      dadosMedidos: dadosMedidos || {},
      resultadosCalculados: resultadosCalculados || {}
    });
    const finalResultados = tempDoc.resultadosCalculados;

    // 1. Caso seja Auto-Save Silencioso na Nuvem (Rascunho)
    if (isDraftSave) {
      let existingDraft = null;
      const validDraftId = toValidObjectId(draftId || id);
      if (validDraftId) {
        existingDraft = await PhysicalAssessment.findById(validDraftId);
      }
      
      if (!existingDraft) {
        existingDraft = await PhysicalAssessment.findOne({
          clienteId: validClienteId,
          $or: [{ status: 'rascunho' }, { isDraft: true }]
        }).sort({ updatedAt: -1 });
      }

      if (existingDraft) {
        // Se o documento já foi concluído oficialmente, nunca reverte para rascunho
        if (existingDraft.status !== 'concluido') {
          existingDraft.status = 'rascunho';
          existingDraft.isDraft = true;
        }
        existingDraft.dadosMedidos = dadosMedidos || existingDraft.dadosMedidos;
        existingDraft.resultadosCalculados = finalResultados || existingDraft.resultadosCalculados;
        existingDraft.metas = metas || existingDraft.metas;
        existingDraft.observacoes = observacoes !== undefined ? observacoes : existingDraft.observacoes;
        existingDraft.tempoGastoSegundos = Number(tempoGastoSegundos) || existingDraft.tempoGastoSegundos;
        existingDraft.data = data || existingDraft.data;
        if (validAvaliadorId) existingDraft.avaliadorId = validAvaliadorId;

        await existingDraft.save();
        const cleanDraft = existingDraft.toObject ? existingDraft.toObject() : { ...existingDraft };
        delete cleanDraft.pdf_url;
        return NextResponse.json({ success: true, data: cleanDraft, autoSaved: true });
      }

      // Se não havia rascunho anterior, cria um novo rascunho
      const newDraft = await PhysicalAssessment.create({
        clienteId: validClienteId,
        avaliadorId: validAvaliadorId,
        data,
        dadosMedidos: dadosMedidos || {},
        resultadosCalculados: finalResultados || {},
        metas: metas || {},
        observacoes: observacoes || '',
        pdfName: pdfName || '',
        pdf_url: pdf_url || '',
        tempoGastoSegundos: Number(tempoGastoSegundos) || 0,
        status: 'rascunho',
        isDraft: true
      });

      const cleanDraft = newDraft.toObject ? newDraft.toObject() : { ...newDraft };
      delete cleanDraft.pdf_url;
      return NextResponse.json({ success: true, data: cleanDraft, autoSaved: true });
    }

    // 2. Caso seja Conclusão e Finalização Oficial da Avaliação
    let assessmentDoc = null;
    const validDocId = toValidObjectId(draftId || id);
    if (validDocId) {
      assessmentDoc = await PhysicalAssessment.findById(validDocId);
    }
    
    if (!assessmentDoc) {
      // Buscar se havia rascunho em aberto para promover a concluído
      assessmentDoc = await PhysicalAssessment.findOne({
        clienteId: validClienteId,
        $or: [{ status: 'rascunho' }, { isDraft: true }]
      }).sort({ updatedAt: -1 });
    }

    if (assessmentDoc) {
      assessmentDoc.clienteId = validClienteId;
      if (validAvaliadorId) assessmentDoc.avaliadorId = validAvaliadorId;
      assessmentDoc.data = data;
      assessmentDoc.dadosMedidos = dadosMedidos;
      assessmentDoc.resultadosCalculados = finalResultados;
      assessmentDoc.metas = metas;
      assessmentDoc.observacoes = observacoes || '';
      assessmentDoc.pdfName = pdfName || assessmentDoc.pdfName;
      assessmentDoc.pdf_url = pdf_url || assessmentDoc.pdf_url || '';
      assessmentDoc.tempoGastoSegundos = Number(tempoGastoSegundos) || assessmentDoc.tempoGastoSegundos;
      assessmentDoc.status = 'concluido';
      assessmentDoc.isDraft = false;

      await assessmentDoc.save();
      await syncPhysicalAssessmentTests(assessmentDoc);
      const cleanDoc = assessmentDoc.toObject ? assessmentDoc.toObject() : { ...assessmentDoc };
      delete cleanDoc.pdf_url;
      return NextResponse.json({ success: true, data: cleanDoc });
    }

    // Criar nova avaliação diretamente como concluída
    const assessment = await PhysicalAssessment.create({
      clienteId: validClienteId,
      avaliadorId: validAvaliadorId,
      data,
      dadosMedidos: dadosMedidos || {},
      resultadosCalculados: finalResultados || {},
      metas: metas || {},
      observacoes: observacoes || '',
      pdfName: pdfName || '',
      pdf_url: pdf_url || '',
      tempoGastoSegundos: Number(tempoGastoSegundos) || 0,
      status: 'concluido',
      isDraft: false
    });

    await syncPhysicalAssessmentTests(assessment);

    const cleanDoc = assessment.toObject ? assessment.toObject() : { ...assessment };
    delete cleanDoc.pdf_url;
    return NextResponse.json({ success: true, data: cleanDoc });
  } catch (error: any) {
    console.error('[assessments POST] Error:', error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || 'Erro interno ao salvar avaliação física.' }, { status: 500 });
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

    const validId = toValidObjectId(id);
    if (!validId) {
      return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 });
    }

    await PhysicalAssessment.findByIdAndDelete(validId);
    return NextResponse.json({ success: true, message: 'Physical assessment deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
