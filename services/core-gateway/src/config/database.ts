import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

// Fix Node.js Windows SRV lookup issue (querySrv ECONNREFUSED) by using reliable DNS servers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch {
  // silent
}

dotenv.config();

export const connectDatabase = async (): Promise<boolean> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('⚠️ [MongoDB] MONGODB_URI not found in .env. Running in in-memory fallback mode.');
    return false;
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000
    });
    console.log(`✅ [MongoDB] Connected successfully to MongoDB Atlas database (${mongoose.connection.name}).`);
    return true;
  } catch (error: any) {
    console.warn(`⚠️ [MongoDB] Could not connect to Atlas (${error.message}). Continuing in resilient in-memory mode.`);
    return false;
  }
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
