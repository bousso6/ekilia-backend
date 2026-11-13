import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

export const connectDB = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info('MongoDB connecté');
  } catch (error) {
    logger.error({ err: error }, 'Échec de connexion à MongoDB');
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  await mongoose.connection.close();
  logger.info('MongoDB déconnecté');
};