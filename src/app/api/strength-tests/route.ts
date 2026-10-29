import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import StrengthTest from '@/models/StrengthTest';
import ClientTestRecord from '@/models/ClientTestRecord';
import { checkSessionPermission } from '@/utils/authHelper';
import { syncStrengthTestRecord } from '@/utils/testMemorySync';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const paramClientId = searchParams.get('clientId');
    const id = searchParams.get('id');

    // Single full document by ID (with all detailed test results & PDF data + previous test comparison)
    if (id) {
      const fullDoc: any = await StrengthTest.findById(id).lean().maxTimeMS(12000);
      if (!fullDoc) {
        return NextResponse.json({ success: false, data: null, previousTest: null }, { status: 404 });
      }

      // Automatically search for the immediately preceding strength test for this client
      let previousTest: any = null;
      if (fullDoc.clienteId) {
        const clientQuery = {
          $or: [
            { clienteId: fullDoc.clienteId },
            ...(mongoose.Types.ObjectId.isValid(String(fullDoc.clienteId))
              ? [{ clienteId: new mongoose.Types.ObjectId(String(fullDoc.clienteId)) }]
              : [])
          ]
        };

        // 1. Try finding a test strictly prior in date
        if (fullDoc.data) {
          previousTest = await StrengthTest.findOne({
            ...clientQuery,
            _id: { $ne: fullDoc._id },
            data: { $lt: fullDoc.data }
          })
            .sort({ data: -1, createdAt: -1 })
            .lean()
            .maxTimeMS(10000);
        }
      }

      return NextResponse.json(
        { success: true, data: fullDoc, previousTest },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    let query: any = {};
    if (paramClientId) {
      try {
        const objId = new mongoose.Types.ObjectId(paramClientId);
        query = { $or: [{ clienteId: paramClientId }, { clienteId: objId }] };
      } catch {
        query = { clienteId: paramClientId };
      }
    }

    // Lightweight select projection for instant dashboard table rendering (<100ms)
    const tests = await StrengthTest.find(query)
      .select('clienteId profissionalId data exercicio cargaMax repeticoes analise.riscoOmbro exercicios pesoCliente pdfName createdAt')
      .sort({ data: -1 })
      .lean()
      .maxTimeMS(12000);

    return NextResponse.json(
      { success: true, data: tests, count: tests.length },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('[strength-tests GET] Error:', error.message);
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
    const { clienteId, profissionalId, data, exercicio, cargaMax, repeticoes, exercicios, analise, observacoes, pdfName, pdfB64, pesoCliente, testesRealizados, comparativos, tempoGastoSegundos } = body;

    if (!clienteId || !profissionalId || !data) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const test = await StrengthTest.create({
      clienteId,
      profissionalId,
      data,
      exercicio,
      cargaMax,
      repeticoes,
      exercicios,
      analise,
      observacoes,
      pdfName,
      pdfB64,
      pesoCliente,
      testesRealizados,
      comparativos,
      tempoGastoSegundos: Number(tempoGastoSegundos) || 0
    });

    await syncStrengthTestRecord(test);

    return NextResponse.json({ success: true, data: test });
  } catch (error: any) {
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

    await StrengthTest.findByIdAndDelete(id);
    const deleteOr: any[] = [{ 'origemDocumento.documentoId': String(id) }];
    if (mongoose.Types.ObjectId.isValid(String(id)) && /^[0-9a-fA-F]{24}$/.test(String(id))) {
      deleteOr.push({ 'origemDocumento.documentoId': new mongoose.Types.ObjectId(String(id)) });
    }
    await ClientTestRecord.deleteMany({ $or: deleteOr });
    return NextResponse.json({ success: true, message: 'Strength test deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
