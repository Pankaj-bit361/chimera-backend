import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

let connected = false;

export async function connectDb(uri: string = env.mongoUri): Promise<typeof mongoose> {
  if (connected) return mongoose;

  mongoose.set('strictQuery', true);
  // Surface index build failures in dev instead of silently degrading queries.
  mongoose.set('autoIndex', !env.isProduction);

  mongoose.connection.on('error', (error) => logger.error('mongo connection error', error));
  mongoose.connection.on('disconnected', () => {
    connected = false;
    logger.warn('mongo disconnected');
  });

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  connected = true;
  logger.info(`mongo connected → ${uri.replace(/\/\/[^@]*@/, '//***@')}`);
  return mongoose;
}

export async function disconnectDb(): Promise<void> {
  if (!connected) return;
  await mongoose.disconnect();
  connected = false;
}
