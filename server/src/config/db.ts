import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;

  try {
    if (uri && !uri.includes('your-atlas-uri')) {
      console.log('📡 Connecting to MongoDB Atlas...');
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000, // 5s timeout to failover quickly if Atlas IP is not whitelisted
      });
      console.log('✅ Connected to MongoDB Atlas successfully.');
      return;
    }
  } catch (err: any) {
    console.warn(`⚠️ Could not connect to Atlas (${err.message}). Falling back to in-memory MongoDB for local reliability...`);
  }

  // Graceful Fallback: In-Memory MongoDB Server for guaranteed local development
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log(`✅ Connected to local In-Memory MongoDB (${memUri}).`);
  } catch (memErr: any) {
    console.error('❌ Failed to connect to any MongoDB instance:', memErr);
    process.exit(1);
  }
}
