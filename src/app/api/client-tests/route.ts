import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import ClientTestRecord from '@/models/ClientTestRecord';
import '@/models/Client';
import '@/models/Professional';
import { checkSessionPermission } from '@/utils/authHelper';

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

    const { searchParams } = new URL(request.url);
    const paramClientId = searchParams.get('clientId');
    const tipoTeste = searchParams.get('tipoTeste');
    const latest = searchParams.get('latest') === 'true';
    const limit = Number(searchParams.get('limit')) || 20;

    if (!paramClientId) {
      return NextResponse.json({ success: false, error: 'clientId é obrigatório' }, { status: 400 });
    }

    const clientObjId = toValidObjectId(paramClientId);
    const clientQuery = clientObjId ? { $or: [{ clienteId: paramClientId }, { clienteId: clientObjId }] } : { clienteId: paramClientId };

    if (latest && !tipoTeste) {
      // Return the most recent record of each test type for this client
      const testTypes = [
        'Y_TEST',
        'STEP_DOWN',
        'GONIOMETRIA',
        'DINAMOMETRIA',
        'THOMAS',
        'OBER',
        'MAIGNE',
        'COMPOSICAO_CORPORAL',
        'PERIMETRIA'
      ];

      const latestTests: Record<string, any> = {};

      for (const type of testTypes) {
        const doc = await ClientTestRecord.findOne({ ...clientQuery, tipoTeste: type })
          .sort({ data: -1, createdAt: -1 })
          .lean()
          .maxTimeMS(8000);
        if (doc) {
          latestTests[type] = doc;
        }
      }

      return NextResponse.json({
        success: true,
        data: latestTests
      }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
    }

    let query: any = { ...clientQuery };
    if (tipoTeste) {
      query.tipoTeste = tipoTeste;
    }

    if (latest && tipoTeste) {
      const doc = await ClientTestRecord.findOne(query)
        .sort({ data: -1, createdAt: -1 })
        .lean()
        .maxTimeMS(8000);
      return NextResponse.json({
        success: true,
        data: doc
      }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
    }

    const records = await ClientTestRecord.find(query)
      .sort({ data: -1, createdAt: -1 })
      .limit(limit)
      .lean()
      .maxTimeMS(8000);

    return NextResponse.json({
      success: true,
      data: records
    }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } });
  } catch (error: any) {
    console.error('Error fetching client tests:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await checkSessionPermission(['admin', 'profissional', 'recepcao']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: 'Acesso não autorizado' }, { status: 401 });
    }

    await dbConnect();
    const body = await request.json();
    const { clienteId, profissionalId, data, tipoTeste, dados, metricas, observacoes, origemDocumento } = body;

    if (!clienteId || !tipoTeste || !data) {
      return NextResponse.json({ success: false, error: 'clienteId, tipoTeste e data são obrigatórios' }, { status: 400 });
    }

    const clientObjId = toValidObjectId(clienteId);
    const profObjId = toValidObjectId(profissionalId) || new mongoose.Types.ObjectId('6668ab030303030303030302');

    // Find the latest previous test for comparison
    const clientQuery = clientObjId ? { $or: [{ clienteId: clienteId }, { clienteId: clientObjId }] } : { clienteId: clienteId };
    const prevTest = await ClientTestRecord.findOne({
      ...clientQuery,
      tipoTeste,
      data: { $lte: data }
    }).sort({ data: -1, createdAt: -1 }).lean();

    let comparativoAnterior: any = undefined;
    if (prevTest && String(prevTest._id) !== String(body._id)) {
      const prevScore = prevTest.metricas?.scorePrincipal;
      const currScore = metricas?.scorePrincipal;
      let diferencaScore: number | undefined = undefined;
      let evolucaoPercentual: number | undefined = undefined;
      let statusEvolucao: string = 'estavel';

      if (typeof prevScore === 'number' && typeof currScore === 'number') {
        diferencaScore = Number((currScore - prevScore).toFixed(2));
        if (prevScore !== 0) {
          evolucaoPercentual = Number(((diferencaScore / prevScore) * 100).toFixed(1));
        }
        if (diferencaScore > 0) statusEvolucao = 'melhora';
        else if (diferencaScore < 0) statusEvolucao = 'regressao';
      }

      comparativoAnterior = {
        testeAnteriorId: prevTest._id,
        dataAnterior: prevTest.data,
        diferencaScore,
        evolucaoPercentual,
        statusEvolucao,
        detalhes: {
          prevDados: prevTest.dados,
          prevMetricas: prevTest.metricas
        }
      };
    }

    const testDoc = await ClientTestRecord.create({
      clienteId: clientObjId || clienteId,
      profissionalId: profObjId,
      data,
      tipoTeste,
      dados,
      metricas,
      comparativoAnterior,
      origemDocumento,
      observacoes: observacoes || ''
    });

    return NextResponse.json({
      success: true,
      data: testDoc
    });
  } catch (error: any) {
    console.error('Error recording client test:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
