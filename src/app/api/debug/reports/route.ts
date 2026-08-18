import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/utils/dbConnect';
import PhysioReport from '@/models/PhysioReport';

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

    const db = mongoose.connection.db;
    if (!db) throw new Error('No db connection');

    // Check collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    logs.push(`[${Date.now() - t0}ms] Collections: ${collectionNames.join(', ')}`);

    // Count in physio collection
    const physioColName = collectionNames.find(c => c.toLowerCase().includes('physio') || c.toLowerCase().includes('report')) || 'physioreports';
    logs.push(`[${Date.now() - t0}ms] Target collection: ${physioColName}`);

    const count = await db.collection(physioColName).countDocuments();
    logs.push(`[${Date.now() - t0}ms] Count in ${physioColName}: ${count}`);

    const rawDocs = await db.collection(physioColName)
      .find({})
      .project({ clienteId: 1, profissionalId: 1, data: 1, createdAt: 1 })
      .sort({ data: -1 })
      .limit(10)
      .toArray();

    logs.push(`[${Date.now() - t0}ms] Retrieved ${rawDocs.length} raw docs!`);

    return NextResponse.json({
      success: true,
      total_time_ms: Date.now() - t0,
      count,
      collection: physioColName,
      items: rawDocs,
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
