const axios = require('axios');
const env = require('../config/env');
const logger = require('../utils/logger');

const ML_TIMEOUT_MS = 5000;

function detectInputType(input = '') {
  const value = input.trim();
  if (/^https?:\/\//i.test(value)) {
    return 'url';
  }
  // Raw email content: headers present (From:/Subject:/Reply-To:) or an address
  // in a header-like line. Plain addresses alone are treated as text input.
  if (/^(from|reply-to|return-path|subject|to|date):/im.test(value)) {
    return 'email';
  }
  if (/@/.test(value) && value.includes('\n')) {
    return 'email';
  }
  return 'job_posting';
}

function fallbackAnalysis(input, inputType) {
  const lower = input.toLowerCase();
  const redFlags = [];

  if (lower.includes('registration fee') || lower.includes('pay') || lower.includes('urgent')) {
    redFlags.push('Payment Request — Found payment-related keywords. Legitimate employers never ask for money.');
  }
  if (lower.includes('whatsapp') || lower.includes('telegram')) {
    redFlags.push('Informal Channel — Pushes communication to WhatsApp/Telegram instead of official channels.');
  }
  if (inputType === 'url' && !/^https:\/\//i.test(input)) {
    redFlags.push('Insecure Website — The website is not served over HTTPS.');
  }
  if (/\.(xyz|top|click|work)(\/|$)/i.test(input)) {
    redFlags.push('Suspicious TLD — Uses a commonly abused low-trust domain extension.');
  }

  return {
    riskScore: Math.min(95, redFlags.length * 25 + (inputType === 'email' ? 10 : 0)),
    riskLevel: redFlags.length >= 3 ? 'high' : redFlags.length >= 1 ? 'medium' : 'low',
    redFlags,
    confidence: 0.55,
    explanation: 'Rule-based analysis — ML service unavailable.',
    simulated: true
  };
}

function buildPayload(input, inputType) {
  if (inputType === 'url') {
    return { url: input, input_type: 'url' };
  }
  if (inputType === 'email') {
    return { email_content: input, input_type: 'email' };
  }
  return { text: input, input_type: 'job_posting' };
}

// Map the ML service response (snake_case, structured red flags) to the
// backend's camelCase contract with string red flags for persistence.
function mapMLResult(mlResult) {
  const redFlags = Array.isArray(mlResult.red_flags)
    ? mlResult.red_flags.map((f) => (typeof f === 'string' ? f : `${f.flag} — ${f.description}`))
    : [];

  return {
    riskScore: Number(mlResult.risk_score || 0),
    riskLevel: String(mlResult.risk_level || 'low'),
    redFlags,
    confidence: Number(mlResult.confidence || 0),
    explanation: String(mlResult.explanation || ''),
    simulated: false
  };
}

async function callMLAPI(input, inputType) {
  try {
    const response = await axios.post(
      `${env.mlApiUrl.replace(/\/$/, '')}/predict`,
      buildPayload(input, inputType),
      { timeout: ML_TIMEOUT_MS }
    );
    return mapMLResult(response.data);
  } catch (error) {
    logger.warn('ML service call failed — using local rule-based fallback', {
      mlApiUrl: env.mlApiUrl,
      inputType,
      error: error.message
    });
    return fallbackAnalysis(input, inputType);
  }
}

async function analyzeOpportunity(input) {
  const inputType = detectInputType(input);
  const result = await callMLAPI(input, inputType);

  return {
    riskScore: Number.isFinite(result.riskScore) ? result.riskScore : 0,
    riskLevel: result.riskLevel,
    redFlags: Array.isArray(result.redFlags) ? result.redFlags : [],
    confidence: Number(result.confidence) || 0,
    explanation: result.explanation || '',
    simulated: Boolean(result.simulated),
    inputType
  };
}

async function checkMLHealth() {
  const baseUrl = env.mlApiUrl.replace(/\/$/, '');
  try {
    const response = await axios.get(`${baseUrl}/health`, { timeout: 3000 });
    logger.info('ML service health check passed', {
      status: response.data?.status,
      modelLoaded: response.data?.model_loaded,
      version: response.data?.version
    });
    return { healthy: true, modelLoaded: Boolean(response.data?.model_loaded) };
  } catch (error) {
    logger.warn('ML service health check failed — scam checks will use the local rule-based fallback', {
      baseUrl,
      error: error.message
    });
    return { healthy: false, modelLoaded: false };
  }
}

module.exports = {
  analyzeOpportunity,
  callMLAPI,
  checkMLHealth,
  detectInputType
};