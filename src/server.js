import './config/dns.js';
import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { startRemindersJob } from './jobs/reminders.job.js';
import { logger } from './utils/logger.js';

const start = async () => {
  await connectDB();

  const remindersTask = startRemindersJob();

  const server = app.listen(env.PORT, () => {
    logger.info(`Serveur démarré sur le port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} reçu, arrêt en cours...`);
    remindersTask?.stop?.();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Promesse rejetée non gérée');
  });
};

start();
