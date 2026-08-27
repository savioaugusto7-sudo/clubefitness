import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Set bufferCommands to false so Mongoose fails immediately instead of hanging
mongoose.set('bufferCommands', false);

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect(forceReconnect = false) {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  // Se forçar reconexão, desconecta e limpa o cache
  if (forceReconnect && cached.conn) {
    try {
      await mongoose.disconnect();
    } catch {}
    cached.conn = null;
    cached.promise = null;
  }

  // 1. If connection is active and ready, reuse it immediately
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // 2. If existing promise is pending, wait for it
  if (cached.promise && mongoose.connection.readyState === 2) {
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch {
      cached.promise = null;
      cached.conn = null;
    }
  }

  // 3. Force IPv4 (family: 4), optimize pool size for Serverless (M0 Atlas) and auto-close idle connections
  const opts: mongoose.ConnectOptions = {
    bufferCommands: false,
    maxPoolSize: 2,
    minPoolSize: 0,
    maxIdleTimeMS: 5000,
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    socketTimeoutMS: 30000,
    family: 4,
    retryReads: true,
    retryWrites: true,
    tls: true,
    tlsAllowInvalidCertificates: true
  };

  cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
    return m.connection;
  });

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error: any) {
    cached.promise = null;
    cached.conn = null;
    console.error('[dbConnect] Connection error:', error.message);
    throw error;
  }
}

export default dbConnect;
