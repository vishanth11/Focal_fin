const { normalizeDomain } = require('../utils/helpers');

const freeEmailProviders = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'proton.me']);
const mockRegistry = new Set(['TN-TECH-2020-4455', 'KA-INNO-2019-8811', 'DL-QUICK-2024-1001']);

function addCheck(checks, name, passed, detail) {
  checks.push({ name, passed, detail });
}

function recommendationFromScore(score, redFlags) {
  if (score >= 80 && redFlags.length <= 1) return 'approve';
  if (score < 45 || redFlags.length >= 4) return 'reject';
  return 'manual_review';
}

async function verifyCompany(companyData) {
  const checks = [];
  const redFlags = [];
  let score = 100;
  const domain = normalizeDomain(companyData.domain || companyData.website);
  const emailDomain = normalizeDomain((companyData.email || '').split('@')[1] || '');
  const companySlug = (companyData.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const domainLooksAligned = companySlug && domain.replace(/[^a-z0-9]/g, '').includes(companySlug.slice(0, 6));
  addCheck(checks, 'Domain matches company name', domainLooksAligned, domain);
  if (!domainLooksAligned) {
    score -= 15;
    redFlags.push('Domain does not clearly match company name');
  }

  const suspiciousNewDomain = /\.(xyz|top|click|work)$/i.test(domain);
  addCheck(checks, 'Domain reputation', !suspiciousNewDomain, suspiciousNewDomain ? 'Risky TLD detected' : 'No risky TLD detected');
  if (suspiciousNewDomain) {
    score -= 20;
    redFlags.push('Domain uses a high-risk extension');
  }

  const emailMatchesDomain = emailDomain === domain;
  addCheck(checks, 'Email domain matches website', emailMatchesDomain, emailDomain);
  if (!emailMatchesDomain) {
    score -= 15;
    redFlags.push('Email domain does not match website domain');
  }

  const usesFreeEmail = freeEmailProviders.has(emailDomain);
  addCheck(checks, 'Official email provider', !usesFreeEmail, emailDomain);
  if (usesFreeEmail) {
    score -= 20;
    redFlags.push('Company uses a free email provider');
  }

  const usesHttps = /^https:\/\//i.test(companyData.website || '');
  addCheck(checks, 'HTTPS website', usesHttps, companyData.website);
  if (!usesHttps) {
    score -= 10;
    redFlags.push('Website is not HTTPS');
  }

  const validRegistration = /^[A-Z]{2}-[A-Z0-9-]{6,}$/i.test(companyData.registrationNumber || '');
  const registryMatch = mockRegistry.has(companyData.registrationNumber);
  addCheck(checks, 'Government registration format', validRegistration, companyData.registrationNumber);
  addCheck(checks, 'Mock registry match', registryMatch, registryMatch ? 'Found in demo registry' : 'Not found in demo registry');
  if (!validRegistration) {
    score -= 15;
    redFlags.push('Registration number format is invalid');
  } else if (!registryMatch) {
    score -= 10;
    redFlags.push('Registration number requires manual registry verification');
  }

  const linkedinLooksValid = /^https:\/\/(www\.)?linkedin\.com\/company\//i.test(companyData.linkedinUrl || '');
  addCheck(checks, 'LinkedIn page', linkedinLooksValid, companyData.linkedinUrl || 'Missing');
  if (!linkedinLooksValid) {
    score -= 10;
    redFlags.push('LinkedIn company page missing or invalid');
  }

  const gstStatus = companyData.gstVerificationStatus || 'not_provided';
  const gstEvidenceVerified = gstStatus === 'verified' && !companyData.gstVerificationSimulated;
  addCheck(checks, 'GST verification evidence', gstEvidenceVerified, gstStatus);
  if (companyData.gstin && !gstEvidenceVerified) {
    score -= 30;
    redFlags.push(companyData.gstVerificationSimulated ? 'GST verification is simulated' : `GST verification ${gstStatus.replace('_', ' ')}`);
  }

  const overallScore = Math.max(0, Math.min(100, score));

  return {
    overallScore,
    checks,
    redFlags,
    gstVerificationStatus: gstStatus,
    recommendation: recommendationFromScore(overallScore, redFlags)
  };
}

module.exports = {
  verifyCompany
};
