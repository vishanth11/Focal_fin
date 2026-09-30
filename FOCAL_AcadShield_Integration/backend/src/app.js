const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const companyRoutes = require('./routes/companyRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const checkRoutes = require('./routes/checkRoutes');
const connectionRoutes = require('./routes/connectionRoutes');
const studentRoutes = require('./routes/studentRoutes');
const universityRoutes = require('./routes/universityRoutes');
const credentialRoutes = require('./routes/credentialRoutes');
const env = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

const rawOrigins = process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map((origin) => origin.trim()).filter(Boolean);

// Fail closed: a CORS_ORIGINS value that parses to an empty list must NOT
// silently degrade to reflecting every origin.
if (!allowedOrigins.length) {
  throw new Error('CORS_ORIGINS is set but contains no valid origins — refusing to allow all origins.');
}

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Rate limiting: the scam-check endpoint calls the ML pipeline, and the
// login endpoint is a brute-force target.
const checkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later.' }
});

app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FOCAL backend API is running',
    endpoints: {
      health: '/health',
      companies: '/api/companies',
      admin: '/api/admin',
      reports: '/api/reports',
      check: '/api/check',
      connections: '/api/connections',
      students: '/api/students',
      universities: '/api/universities',
      credentials: '/api/credentials'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'FOCAL backend is healthy',
    timestamp: new Date().toISOString()
  });
});

// Public runtime configuration for the frontend. Exposes ONLY non-secret
// settings: whether demo verification mode is on, the badge network and the
// (public, on-chain) contract address. No keys ever travel through here.
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      demoVerificationMode: Boolean(env.demoVerificationMode),
      blockchainNetwork: 'polygon-amoy',
      contractAddress: env.contractAddress
    }
  });
});

app.use('/api/companies', companyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
// Both mounts hit the ML pipeline — the /api/checks alias must be throttled
// too, or the limit on /api/check is trivially bypassed.
app.use('/api/check', checkLimiter, checkRoutes);
app.use('/api/checks', checkLimiter, checkRoutes);
app.use('/api/connections', connectionRoutes);
// Optional student accounts. Mounted with the other routers and therefore
// ahead of notFound/errorHandler below — nothing registered after those two
// can ever be reached.
app.use('/api/students', studentRoutes);
// Academic Institution and Credential verification routes (AcadShield Module)
app.use('/api/universities', universityRoutes);
app.use('/api/credentials', credentialRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;