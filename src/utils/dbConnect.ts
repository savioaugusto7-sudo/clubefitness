import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Set bufferCommands to false so Mongoose fails immediately instead of hanging
mongoose.set('bufferCommands', false);

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
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

  // 3. Force IPv4 (family: 4) to eliminate slow IPv6 DNS/handshake timeouts on serverless
  const opts: mongoose.ConnectOptions = {
    bufferCommands: false,
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4,
    retryReads: true,
    retryWrites: true,
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
