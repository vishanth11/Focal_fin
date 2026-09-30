const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const { initializeContract } = require('./services/blockchainService');
const { checkMLHealth } = require('./services/scamDetectionService');
const logger = require('./utils/logger');

let server;

async function start() {
  await connectDB();

  try {
    await initializeContract();
    logger.info('Blockchain contract initialized');
  } catch (error) {
    logger.warn('Blockchain contract is unavailable; blockchain operations will fail closed', { reason: error.message });
  }

  try {
    await checkMLHealth();
  } catch (error) {
    logger.warn('ML health check could not run', { reason: error.message });
  }

  server = app.listen(env.port, () => {
    logger.info(`FOCAL backend running on port ${env.port}`);
  });
}

function shutdown(signal) {
  logger.info(`${signal} received, shutting down`);
  if (server) {
    server.close(() => process.exit(0));
    return;
  }
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});
