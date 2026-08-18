import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// Set bufferCommands to false so Mongoose fails immediately instead of hanging
mongoose.set('bufferCommands', false);

async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  // 1. If already fully connected, reuse immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // 2. If connecting right now, wait a short moment for it to finish
  if (mongoose.connection.readyState === 2) {
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout while connecting')), 4000);
        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });
        mongoose.connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      return mongoose.connection;
    } catch {
      // If waiting failed, disconnect and try fresh connection below
      try { await mongoose.disconnect(); } catch {}
    }
  }

  // 3. Establish fresh connection with strict serverless options
  const opts = {
    bufferCommands: false,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 10000,
  };

  try {
    const conn = await mongoose.connect(MONGODB_URI, opts);
    return conn.connection;
  } catch (error: any) {
    console.error('[dbConnect] Connection error:', error.message);
    throw error;
  }
}

export default dbConnect;
