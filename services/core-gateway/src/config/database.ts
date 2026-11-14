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
    const err = '❌ [MongoDB Fatal] MONGODB_URI is not set in environment. MongoDB Atlas connection is strictly required.';
    console.error(err);
    throw new Error(err);
  }

  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000
    });
    console.log(`✅ [MongoDB] Connected successfully to MongoDB Atlas database (${mongoose.connection.name}).`);
    return true;
  } catch (error: any) {
    const err = `❌ [MongoDB Fatal] Could not connect to MongoDB Atlas (${error.message}). Server startup aborted.`;
    console.error(err);
    throw new Error(err);
  }
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
