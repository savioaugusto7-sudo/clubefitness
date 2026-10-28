import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import PhysioReport from '@/models/PhysioReport';
import PhysicalAssessment from '@/models/PhysicalAssessment';
import StrengthTest from '@/models/StrengthTest';
import ClientTestRecord from '@/models/ClientTestRecord';
import Appointment from '@/models/Appointment';
import ClientWorkout from '@/models/ClientWorkout';
import WellnessLog from '@/models/WellnessLog';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';
import { computeLongitudinalReassessment } from '@/utils/longitudinalEngine';
import { generateClinicalNarrative } from '@/utils/clinicalReasoningEngine';
import { generatePersonalizedClinicalNarrative } from '@/utils/aiClinicalNarrative';
import { calculateHopBatteryAnalysis } from '@/utils/biomechanicsEngine';
import { compareVisaPLongitudinal } from '@/utils/visaPEngine';
import { calculateACWR, calculateWellnessACWRDecision } from '@/utils/acwrEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

function toValidObjectId(val: any): mongoose.Types.ObjectId | null {
  if (!val) return null;
  const str = String(val).trim();
  if (mongoose.Types.ObjectId.isValid(str) && /^[0-9a-fA-F]{24}$/.test(str)) {
    try {
      return new mongoose.Types.ObjectId(str);
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: Request) {
  try {
    await dbConnect();
    await checkSessionPermission(['admin', 'receptionist', 'recepcao', 'professional', 'profissional', 'client'], undefined, request);

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const t1Id = searchParams.get('t1Id');
    const t2Id = searchParams.get('t2Id');
    const fastMode = searchParams.get('fast') === 'true';

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId obrigatório.' }, { status: 400 });
    }

    const clientObjId = toValidObjectId(clientId);
    const clientQuery = clientObjId
      ? { $or: [{ clienteId: clientId }, { clienteId: clientObjId }] }
      : { clienteId: clientId };

    const date28DaysAgo = new Date();
    date28DaysAgo.setDate(date28DaysAgo.getDate() - 30);
    const date28DaysAgoStr = date28DaysAgo.toISOString().split('T')[0];

    // 1. Carregar todas as coleções em paralelo para máxima velocidade
    const [
      clientDoc,
      physioReports,
      physicalAssessments,
      strengthTests,
      clientTestRecords,
      recentAppointments,
      clientWorkoutDoc,
      recentWellnessLogs
    ] = await Promise.all([
      Client.findOne(clientObjId ? { _id: clientObjId } : { _id: clientId }).lean().maxTimeMS(8000),
      PhysioReport.find(clientQuery).sort({ data: 1, createdAt: 1 }).lean().maxTimeMS(8000),
      PhysicalAssessment.find(clientQuery).sort({ data: 1, createdAt: 1 }).lean().maxTimeMS(8000),
      StrengthTest.find(clientQuery).sort({ data: 1, createdAt: 1 }).lean().maxTimeMS(8000),
      ClientTestRecord.find(clientQuery).sort({ data: 1, createdAt: 1 }).lean().maxTimeMS(8000),
      Appointment.find({ ...clientQuery, data: { $gte: date28DaysAgoStr } }).lean().maxTimeMS(8000),
      ClientWorkout.findOne(clientQuery).lean().maxTimeMS(8000),
      WellnessLog.find(clientQuery).sort({ data: -1, createdAt: -1 }).limit(30).lean().maxTimeMS(8000)
    ]);

    if (!clientDoc) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado.' }, { status: 404 });
    }

    // 2. Selecionar documentos T1 e T2
    let t1Report: any = null;
    let t2Report: any = null;

    if (t1Id && t2Id) {
      t1Report = physioReports.find((r: any) => String(r._id) === String(t1Id)) ||
                 physicalAssessments.find((a: any) => String(a._id) === String(t1Id));
      t2Report = physioReports.find((r: any) => String(r._id) === String(t2Id)) ||
                 physicalAssessments.find((a: any) => String(a._id) === String(t2Id));
    }

    if (!t1Report || !t2Report) {
      if (physioReports.length >= 2) {
        t1Report = physioReports[0];
        t2Report = physioReports[physioReports.length - 1];
      } else if (physioReports.length === 1 && physicalAssessments.length >= 1) {
        t1Report = physicalAssessments[0];
        t2Report = physioReports[0];
      } else if (physicalAssessments.length >= 2) {
        t1Report = physicalAssessments[0];
        t2Report = physicalAssessments[physicalAssessments.length - 1];
      } else if (physioReports.length === 1) {
        // Caso possua 1 relatório fisioterapêutico + testes de força/avulsos em datas distintas, permite gerar o laudo evolutivo
        t1Report = physioReports[0];
        t2Report = physioReports[0];
      }
    }

    if (!t1Report || !t2Report) {
      return NextResponse.json({
        success: false,
        error: 'O paciente ainda não possui avaliações fisioterapêuticas suficientes para gerar o laudo de reavaliação.'
      }, { status: 400 });
    }

    // 3. Testes de Força T1 e T2
    const t1Strength = strengthTests.length > 0 ? strengthTests[0] : null;
    const t2Strength = strengthTests.length > 1 ? strengthTests[strengthTests.length - 1] : t1Strength;

    // 4. Carregar profissionais para CREFITO
    const rawProfIds = [
      t1Report?.profissionalId || t1Report?.avaliadorId,
      t2Report?.profissionalId || t2Report?.avaliadorId
    ]
      .map(id => toValidObjectId(id?._id || id))
      .filter((id): id is mongoose.Types.ObjectId => id !== null);

    const profs = rawProfIds.length > 0
      ? await Professional.find({ _id: { $in: rawProfIds } }).lean().maxTimeMS(5000)
      : [];

    const profMap = new Map<string, any>();
    profs.forEach((p: any) => profMap.set(String(p._id), p));

    const p1Id = String(t1Report?.profissionalId?._id || t1Report?.profissionalId || t1Report?.avaliadorId || '');
    const p2Id = String(t2Report?.profissionalId?._id || t2Report?.profissionalId || t2Report?.avaliadorId || '');
    const prof1 = profMap.get(p1Id);
    const prof2 = profMap.get(p2Id);

    const formatAvaliador = (profDoc: any, reportDoc: any) => {
      const nome = profDoc?.nome || reportDoc?.avaliadorNome || reportDoc?.profissionalNome || 'Profissional Fisioterapeuta';
      const isEstagiario = Boolean(profDoc?.isEstagiario) || nome.toLowerCase().includes('estagi');
      const rawReg = (profDoc?.registro || profDoc?.crefito || profDoc?.registroProfissional || '').trim();
      const hasValidReg = rawReg && rawReg !== '-' && rawReg.toUpperCase() !== 'SEM REGISTRO';

      let registroProfissional = '';
      if (isEstagiario) {
        registroProfissional = 'Estagiário(a) de Fisioterapia (Supervisão RT: Dr. Albert Nunes — CREFITO 4/350430-F)';
      } else if (hasValidReg) {
        registroProfissional = rawReg.toUpperCase().startsWith('CREFITO') ? rawReg : `CREFITO ${rawReg}`;
      } else {
        registroProfissional = 'CREFITO: A regularizar / Em emissão';
      }

      return {
        nome: nome.trim(),
        registroProfissional,
        isEstagiario
      };
    };

    const avaliadorT1 = formatAvaliador(prof1, t1Report);
    const avaliadorT2 = formatAvaliador(prof2, t2Report);

    const clientAge =
      clientDoc.dadosPessoais?.idade ||
      (clientDoc.dadosPessoais?.dataNascimento
        ? new Date().getFullYear() - new Date(clientDoc.dadosPessoais.dataNascimento).getFullYear()
        : undefined);
    const clientWeight = Number(
      t2Strength?.pesoCliente ||
      t1Strength?.pesoCliente ||
      clientDoc.dadosPessoais?.peso ||
      clientDoc.dadosClinicos?.peso ||
      70
    );

    // 5. Registros avulsos de VISA-P e Hop Tests
    const visaPRecords = clientTestRecords.filter((tr: any) => tr.tipoTeste === 'VISA_P');
    const visaT1Doc = visaPRecords.length >= 2 ? visaPRecords[0] : null;
    const visaT2Doc = visaPRecords.length >= 1 ? visaPRecords[visaPRecords.length - 1] : null;
    const standaloneVisaP = compareVisaPLongitudinal(
      visaT1Doc?.dados,
      visaT2Doc?.dados,
      visaT1Doc?.data,
      visaT2Doc?.data
    );

    const hopRecords = clientTestRecords.filter((tr: any) => tr.tipoTeste === 'HOP_TEST');
    const latestHopRecord = hopRecords.length > 0 ? hopRecords[hopRecords.length - 1] : null;
    const standaloneHopTest = latestHopRecord ? calculateHopBatteryAnalysis(latestHopRecord.dados) : null;

    // 6. Monitoramento de Carga ACWR e Wellness
    const acwrResult = calculateACWR(recentAppointments, clientWorkoutDoc);
    const latestWellness = recentWellnessLogs && recentWellnessLogs.length > 0 ? recentWellnessLogs[0] : null;
    const decisionMatrix = calculateWellnessACWRDecision(latestWellness, acwrResult);

    // 7. Executar Motor Matemático Longitudinal
    const computed = computeLongitudinalReassessment({
      client: {
        nome: clientDoc.dadosPessoais?.nome || 'Paciente',
        idade: clientAge || 'Não informada',
        sexo: clientDoc.dadosPessoais?.sexo || 'Não informado',
        cpf: clientDoc.dadosPessoais?.cpf || 'Não informado',
        pesoKg: clientWeight
      },
      t1Report,
      t2Report,
      t1Strength,
      t2Strength,
      avaliadorT1,
      avaliadorT2,
      t1VisaP: visaT1Doc?.dados,
      t2VisaP: visaT2Doc?.dados
    });

    if (!computed.testesFuncionais.hopTest && standaloneHopTest) {
      computed.testesFuncionais.hopTest = standaloneHopTest;
    }
    if (!computed.testesFuncionais.visaP && standaloneVisaP) {
      computed.testesFuncionais.visaP = standaloneVisaP;
    }
    (computed as any).acwr = acwrResult;
    (computed as any).matrizDecisao = decisionMatrix;

    // 8. Executar Motor de Raciocínio Clínico (com timeout rápido de 4.5s e fallback determinístico instantâneo)
    const baseNarrative = generateClinicalNarrative(computed);
    const personalizedNarrative = await generatePersonalizedClinicalNarrative(
      computed,
      computed.clusters || [],
      { fastMode, timeoutMs: 4500 }
    );

    const enrichedNarrative = {
      ...baseNarrative,
      ...personalizedNarrative,
      riscoCompartimentoMedialJoelho: baseNarrative.riscoCompartimentoMedialJoelho,
      riscoCompartimentoMedialTornozelo: baseNarrative.riscoCompartimentoMedialTornozelo
    };

    return NextResponse.json({
      success: true,
      computed,
      narrative: enrichedNarrative,
      clusters: computed.clusters || [],
      t1ReportId: t1Report._id,
      t2ReportId: t2Report._id,
      t1StrengthId: t1Strength?._id,
      t2StrengthId: t2Strength?._id
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error: any) {
    console.error('[reavaliacao GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao processar laudo de reavaliação.' },
      { status: 500 }
    );
  }
}
