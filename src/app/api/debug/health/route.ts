import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import PhysicalAssessment from '@/models/PhysicalAssessment';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 30;

export async function GET() {
  const t0 = Date.now();
  const logs: string[] = [];

  try {
    logs.push(`[${Date.now() - t0}ms] Starting dbConnect...`);
    await dbConnect();
    logs.push(`[${Date.now() - t0}ms] Connected! readyState=${mongoose.connection.readyState}`);

    logs.push(`[${Date.now() - t0}ms] Querying PhysicalAssessment count...`);
    const count = await PhysicalAssessment.countDocuments();
    logs.push(`[${Date.now() - t0}ms] Count=${count}`);

    logs.push(`[${Date.now() - t0}ms] Querying lightweight assessments...`);
    const items = await PhysicalAssessment.find({})
      .select('clienteId avaliadorId data')
      .sort({ data: -1 })
      .lean()
      .maxTimeMS(4000);
    logs.push(`[${Date.now() - t0}ms] Found ${items.length} items!`);

    return NextResponse.json({
      success: true,
      total_time_ms: Date.now() - t0,
      count,
      items_preview: items.slice(0, 3),
      logs,
    });
  } catch (err: any) {
    logs.push(`[${Date.now() - t0}ms] ERROR: ${err.message}`);
    return NextResponse.json({
      success: false,
      total_time_ms: Date.now() - t0,
      error: err.message,
      logs,
    }, { status: 500 });
  }
}
