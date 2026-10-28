import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import Client from '@/models/Client';
import Professional from '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';
import { computeLongitudinalReassessment } from '@/utils/longitudinalEngine';
import { generateClinicalNarrative } from '@/utils/clinicalReasoningEngine';
import { generatePersonalizedClinicalNarrative } from '@/utils/aiClinicalNarrative';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { user } = await checkSessionPermission(['admin', 'receptionist', 'professional', 'client'], undefined, request);

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const t1Id = searchParams.get('t1Id');
    const t2Id = searchParams.get('t2Id');

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId obrigatório.' }, { status: 400 });
    }

    const clientObjectId = new mongoose.Types.ObjectId(clientId);
    const db = mongoose.connection.useDb('test');

    // 1. Carregar cliente
    const clientDoc = await db.collection('clients').findOne({ _id: clientObjectId });
    if (!clientDoc) {
      return NextResponse.json({ success: false, error: 'Cliente não encontrado.' }, { status: 404 });
    }

    // 2. Carregar physioreports ordenados por data
    let queryReports: any = { clienteId: clientObjectId };
    if (t1Id && t2Id) {
      queryReports = { _id: { $in: [new mongoose.Types.ObjectId(t1Id), new mongoose.Types.ObjectId(t2Id)] } };
    }

    const physioReports = await db.collection('physioreports')
      .find(queryReports)
      .sort({ data: 1, createdAt: 1 })
      .toArray();

    if (physioReports.length < 2) {
      return NextResponse.json({
        success: false,
        error: `O paciente possui apenas ${physioReports.length} avaliação(ões) fisioterapêutica(s). São necessárias ao menos 2 avaliações para o laudo comparativo longitudinal.`
      }, { status: 400 });
    }

    const t1Report = physioReports[0];
    const t2Report = physioReports[physioReports.length - 1];

    // 3. Carregar strengthtests ordenados por data
    const strengthTests = await db.collection('strengthtests')
      .find({ clienteId: clientObjectId })
      .sort({ data: 1, createdAt: 1 })
      .toArray();

    const t1Strength = strengthTests.length > 0 ? strengthTests[0] : null;
    const t2Strength = strengthTests.length > 1 ? strengthTests[strengthTests.length - 1] : t1Strength;

    // 4. Carregar profissionais para CREFITO
    const profIds = [t1Report?.profissionalId, t2Report?.profissionalId].filter(Boolean);
    const profs = await db.collection('professionals').find({
      _id: { $in: profIds.map(id => new mongoose.Types.ObjectId(id)) }
    }).toArray();

    const profMap = new Map<string, any>();
    profs.forEach(p => profMap.set(p._id.toString(), p));

    const prof1 = profMap.get(t1Report?.profissionalId?.toString());
    const prof2 = profMap.get(t2Report?.profissionalId?.toString());

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

    const clientAge = clientDoc.dadosPessoais?.idade || (clientDoc.dadosPessoais?.dataNascimento ? (new Date().getFullYear() - new Date(clientDoc.dadosPessoais.dataNascimento).getFullYear()) : undefined);
    const clientWeight = Number(t1Strength?.pesoCliente || clientDoc.dadosClinicos?.peso || t2Strength?.pesoCliente || 0);

    // 5. Executar Motor Matemático Longitudinal (100% Determinístico e Livre de Fallbacks Falsos)
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
      avaliadorT2
    });

    // 6. Executar Motor de Raciocínio Clínico Hiper-Personalizado por Segmento (com IA)
    const baseNarrative = generateClinicalNarrative(computed);
    const personalizedNarrative = await generatePersonalizedClinicalNarrative(computed, computed.clusters || []);

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
    });
  } catch (error: any) {
    console.error('[reavaliacao GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Erro ao processar laudo de reavaliação.' }, { status: 500 });
  }
}
