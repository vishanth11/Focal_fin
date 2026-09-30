const dns = require('dns');
const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

async function connectDB() {
  mongoose.set('strictQuery', true);

  // If using SRV connection string (Atlas), configure public DNS servers to resolve SRV records on Windows
  if (env.mongodbUri && env.mongodbUri.startsWith('mongodb+srv://')) {
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (dnsErr) {
      logger.warn('Could not set custom DNS servers', { error: dnsErr.message });
    }
  }

  try {
    const connection = await mongoose.connect(env.mongodbUri, {
      serverSelectionTimeoutMS: 8000
    });
    logger.info(`MongoDB connected: ${connection.connection.host}`);
    return connection;
  } catch (error) {
    if (error.message && error.message.includes('ECONNREFUSED 127.0.0.1')) {
      logger.error('Could not connect to local MongoDB. Ensure the MongoDB service is running (e.g. net start MongoDB).');
    } else if (error.message && (error.message.includes('alert number 80') || error.message.includes('whitelist'))) {
      logger.error('MongoDB Atlas TLS error: Make sure your current IP address is whitelisted in MongoDB Atlas Network Access (or add 0.0.0.0/0).');
    }
    throw error;
  }
}

module.exports = connectDB;

