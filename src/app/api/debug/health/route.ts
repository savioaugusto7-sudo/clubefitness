import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    env: {
      MONGODB_URI_EXISTS: !!process.env.MONGODB_URI,
      MONGODB_URI_LENGTH: process.env.MONGODB_URI?.length || 0,
      MONGODB_URI_STARTS: process.env.MONGODB_URI?.substring(0, 20) || 'NOT_SET',
      NEXTAUTH_SECRET_EXISTS: !!process.env.NEXTAUTH_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL || 'not_set',
      VERCEL_ENV: process.env.VERCEL_ENV || 'not_set',
    },
    mongoose: {
      currentState: mongoose.connection.readyState,
      stateLabel: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
    },
    connectionTest: null as any,
  };

  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      diagnostics.connectionTest = { error: 'MONGODB_URI is not defined' };
      return NextResponse.json(diagnostics, { status: 200 });
    }

    if (mongoose.connection.readyState === 1) {
      diagnostics.connectionTest = { status: 'already_connected' };
      const paCount = await mongoose.connection.db!.collection('physicalassessments').countDocuments();
      diagnostics.physicalAssessmentsCount = paCount;
    } else {
      const t0 = Date.now();
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 15000,
      });
      diagnostics.connectionTest = { status: 'connected', elapsed_ms: Date.now() - t0 };
      const paCount = await mongoose.connection.db!.collection('physicalassessments').countDocuments();
      diagnostics.physicalAssessmentsCount = paCount;
    }
  } catch (err: any) {
    diagnostics.connectionTest = {
      status: 'FAILED',
      error: err.message,
      code: err.code,
      name: err.name,
    };
  }

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  });
}
