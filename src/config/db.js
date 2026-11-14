import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

mongoose.set('strictQuery', true);

const configureDns = () => {
  if (!env.DNS_SERVERS) return;

  const servers = env.DNS_SERVERS.split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length) {
    dns.setServers(servers);
    logger.info({ servers }, 'Resolveurs DNS personnalises actives pour Node');
  }
};

export const connectDB = async () => {
  configureDns();

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