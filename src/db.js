import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { mkdirSync } from 'fs';
import { DATA_PATH } from './config.js';

export async function connectDb() {
  mkdirSync(DATA_PATH, { recursive: true });

  const mongod = await MongoMemoryServer.create({
    instance: { dbPath: DATA_PATH, storageEngine: 'wiredTiger' },
  });

  const uri = mongod.getUri();
  await mongoose.connect(uri);
  console.log(`[db] Embedded MongoDB started. Data stored at: ${DATA_PATH}`);
}
