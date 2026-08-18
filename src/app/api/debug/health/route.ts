import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    steps: [] as string[],
    errors: [] as string[],
  };

  // Step 1: Check env
  diagnostics.env = {
    MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
    MONGODB_URI_LENGTH: process.env.MONGODB_URI?.length || 0,
    NODE_ENV: process.env.NODE_ENV,
  };
  diagnostics.steps.push('env_checked');

  // Step 2: Try importing dbConnect
  try {
    const dbConnect = (await import('@/utils/dbConnect')).default;
    diagnostics.steps.push('dbConnect_imported');

    // Step 3: Try connecting
    await dbConnect();
    diagnostics.steps.push('dbConnect_success');
  } catch (err: any) {
    diagnostics.errors.push('dbConnect_error: ' + err.message);
  }

  // Step 4: Try importing PhysicalAssessment model
  try {
    const PhysicalAssessment = (await import('@/models/PhysicalAssessment')).default;
    diagnostics.steps.push('PhysicalAssessment_imported');

    // Step 5: Try querying
    const count = await PhysicalAssessment.countDocuments();
    diagnostics.steps.push('PhysicalAssessment_count=' + count);

    // Step 6: Try the exact same query as /api/assessments
    const assessments = await PhysicalAssessment.find({}).sort({ data: -1 }).lean();
    diagnostics.steps.push('PhysicalAssessment_find_count=' + assessments.length);

    // Step 7: Try populate
    try {
      const Client = (await import('@/models/Client')).default;
      const Professional = (await import('@/models/Professional')).default;
      diagnostics.steps.push('Client_Professional_imported');

      const withPopulate = await PhysicalAssessment.find({})
        .populate({ path: 'clienteId', select: 'dadosPessoais.nome', strictPopulate: false })
        .populate({ path: 'avaliadorId', select: 'nome email', strictPopulate: false })
        .sort({ data: -1 })
        .lean();
      diagnostics.steps.push('populate_success_count=' + withPopulate.length);

      // Show first 3 results
      diagnostics.sample = withPopulate.slice(0, 3).map((a: any) => ({
        _id: a._id,
        data: a.data,
        clienteNome: a.clienteId?.dadosPessoais?.nome || 'N/A',
        clienteIdType: typeof a.clienteId,
      }));
    } catch (popErr: any) {
      diagnostics.errors.push('populate_error: ' + popErr.message);
    }
  } catch (err: any) {
    diagnostics.errors.push('PhysicalAssessment_error: ' + err.message);
  }

  // Step 8: Try importing authHelper
  try {
    const { checkSessionPermission } = await import('@/utils/authHelper');
    diagnostics.steps.push('authHelper_imported');
  } catch (err: any) {
    diagnostics.errors.push('authHelper_error: ' + err.message);
  }

  diagnostics.success = diagnostics.errors.length === 0;

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
