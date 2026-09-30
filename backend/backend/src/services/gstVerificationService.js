const axios = require('axios');
const env = require('../config/env');

const GSTIN_PATTERN = /^[0-9A-Z]{15}$/;
const GST_TIMEOUT_MS = 7000;

function emptyResult(status = 'not_provided') {
  return {
    status,
    simulated: false,
    verificationDate: status === 'not_provided' ? null : new Date(),
    legalName: null,
    tradeName: null,
    registrationStatus: null,
    businessType: null,
    state: null,
    principalAddress: null,
    taxpayerType: null,
    reference: status
  };
}

async function verifyGST(company) {
  const gstin = String(company.gstin || '').trim().toUpperCase();
  if (!gstin) return emptyResult();
  if (!GSTIN_PATTERN.test(gstin)) return emptyResult('failed');

  try {
    const response = await axios.post(
      `${env.mlApiUrl.replace(/\/$/, '')}/verify-gst`,
      {
        gstin,
        company_name: company.name,
        company_state: company.state,
        company_address: company.address
      },
      { timeout: GST_TIMEOUT_MS }
    );
    const data = response.data;
    return {
      status: data.verified ? 'verified' : 'failed',
      simulated: Boolean(data.simulated),
      verificationDate: new Date(),
      legalName: data.legal_name || null,
      tradeName: data.trade_name || null,
      registrationStatus: data.registration_status || null,
      businessType: data.business_type || null,
      state: data.state || null,
      principalAddress: data.principal_address || null,
      taxpayerType: data.taxpayer_type || null,
      reference: data.source || 'ml-service',
      identityMatch: data.identity_match !== false,
      result: {
        formatValid: Boolean(data.format_valid),
        verified: Boolean(data.verified),
        riskScore: data.risk_score,
        riskLevel: data.risk_level,
        redFlags: data.red_flags || [],
        explanation: data.explanation || ''
      }
    };
  } catch (error) {
    return {
      ...emptyResult('unavailable'),
      reference: 'ml-service-unavailable'
    };
  }
}

module.exports = { verifyGST };