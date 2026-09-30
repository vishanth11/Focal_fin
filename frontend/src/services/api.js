import axios from 'axios';
import { STORAGE_KEYS, safeStorage } from './storage';
import {
  demoCompanies,
  demoTyposquattingExamples,
  demoConnections,
  demoReports
} from '../data/demoData';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Demo data is only served when explicitly opted in via VITE_USE_DEMO=true.
// Otherwise API failures surface as errors — never silently faked results.
const USE_DEMO = import.meta.env.VITE_USE_DEMO === 'true';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 12000
});

// Attach the right JWT (if present) to every request.
// Student endpoints carry the student token; every other request keeps the
// original admin-token behaviour exactly as it was.
api.interceptors.request.use((config) => {
  const isStudentRequest = (config.url || '').startsWith('/students');
  const token = safeStorage.get(
    isStudentRequest ? STORAGE_KEYS.studentToken : STORAGE_KEYS.adminToken
  );
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unwrap the backend response envelope: { success, message?, data } -> data.
// Endpoints that return list metadata (count/total/page) still nest the
// payload under `data`, so this works for every route.
api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body) {
      if (!body.success) {
        return Promise.reject(new Error(body.message || 'Request failed'));
      }
      return body.data !== undefined ? body.data : body;
    }
    return body;
  },
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'Network error — backend unreachable';
    return Promise.reject(new Error(message));
  }
);

// ---------------------------------------------------------------------------
// Normalizers: map the backend Mongoose documents to the UI component shape.
// ---------------------------------------------------------------------------

function toDateString(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  if (typeof value.toISOString === 'function') return value.toISOString().slice(0, 10);
  return null;
}

function normalizeReport(r) {
  return {
    id: String(r._id),
    companyName: r.companyName,
    domain: r.companyId?.domain || r.companyId?.name || r.companyName,
    reporterName: r.reporterName || r.reporterEmail,
    reporterEmail: r.reporterEmail,
    category: 'Community Report',
    description: r.description,
    evidenceUrl: r.evidenceUrl,
    date: (r.createdAt || '').replace('T', ' ').slice(0, 19),
    status: (r.status || 'pending').toUpperCase()
  };
}

function normalizeConnection(c) {
  return {
    id: String(c._id),
    companyA: c.requesterName || 'Requesting Entity',
    domainA: c.requesterDomain || '',
    companyB: c.companyName,
    domainB: c.companyDomain || '',
    trustScore: c.status === 'accepted' ? 90 : 50,
    status: c.status === 'accepted' ? 'ACTIVE_MONITORED' : 'PENDING_MEDIATION',
    establishedDate: (c.createdAt || '').slice(0, 10),
    checksPassed:
      c.status === 'accepted'
        ? ['Identity Verified', 'Domain Match Verified', 'Risk Cleared']
        : ['Identity Verified', 'Domain Match Verified', 'Pending Risk Clearance']
  };
}

function normalizeCompany(c, badge, verification) {
  if (!c) return null;

  const status = c.status || 'unknown';
  const report = c.verificationReport || {};
  const checks = Array.isArray(report.checks) ? report.checks : [];
  const mintStatus = c.mintStatus || (c.tokenId != null ? 'minted' : null);

  // The admin status (pending/verified/rejected/revoked) is the authoritative
  // VERIFICATION signal; the on-chain badge is a SEPARATE fact shown on its
  // own. A verified company without a badge reads "verified — badge pending",
  // never "verified and badge minted", and no badge info is ever fabricated
  // (chainVerified comes from the backend's fail-closed on-chain resolution).
  const chainVerified = Boolean(verification?.isVerified ?? badge?.isValid ?? false);
  const displayStatus = status;
  const verified = displayStatus === 'verified';
  const badgeMinted = verified && (mintStatus === 'minted' || chainVerified);

  const trustSignals = checks.filter((chk) => chk.passed).map((chk) => chk.name);
  if (chainVerified) {
    trustSignals.push('Soulbound Trust Badge issued on-chain');
  }
  if (c.gstVerificationStatus === 'verified') {
    trustSignals.push('GST verification evidence confirmed');
  }

  const riskSignals = (Array.isArray(report.redFlags) ? report.redFlags : []).map((flag) => ({
    code: 'VERIFICATION_FLAG',
    severity: 'warning',
    title: 'Verification Signal',
    description: flag
  }));
  if (status === 'revoked') {
    riskSignals.push({
      code: 'BADGE_REVOKED',
      severity: 'high',
      title: 'Trust Badge Revoked',
      description: 'This company’s verification badge has been revoked by FOCAL administrators.'
    });
  }
  if (mintStatus === 'failed') {
    riskSignals.push({
      code: 'BADGE_MINT_FAILED',
      severity: 'warning',
      title: 'Badge Mint Failed',
      description: c.mintError || 'The badge mint failed on-chain, but the company remains verified.'
    });
  }
  if (c.gstVerificationStatus === 'failed' || c.gstVerificationStatus === 'unavailable') {
    riskSignals.push({
      code: 'GST_VERIFICATION_FAILED',
      severity: 'warning',
      title: 'GST Verification Failed',
      description: c.gstVerificationStatus === 'unavailable'
        ? 'GST verification service was unavailable.'
        : 'The supplied GSTIN could not be verified.'
    });
  }

  const trustScore = verified
    ? report.overallScore || 90
    : status === 'pending'
      ? 60
      : status === 'rejected'
        ? 30
        : status === 'revoked'
          ? 10
          : 45;

  return {
    id: String(c._id),
    name: c.name,
    domain: c.domain,
    status: displayStatus,
    demoMode: Boolean(c.demoMode),
    trustScore,
    category: 'Registered Business Entity',
    registrationNumber: c.registrationNumber || 'NOT_PROVIDED',
    taxId: c.taxId || 'NOT_PROVIDED',
    gst: {
      gstin: c.gstin || null,
      status: c.gstVerificationStatus || 'not_provided',
      simulated: Boolean(c.gstVerificationSimulated),
      verificationDate: toDateString(c.gstVerificationDate),
      legalName: c.gstLegalName || null,
      tradeName: c.gstTradeName || null,
      registrationStatus: c.gstRegistrationStatus || null,
      state: c.gstState || null,
      principalAddress: c.gstPrincipalAddress || null,
      taxpayerType: c.gstTaxpayerType || null
    },
    email: c.email,
    phone: c.phone,
    address: c.address,
    createdAt: c.createdAt || null,
    verifiedDate: toDateString(c.verificationDate),
    mintStatus,
    mintError: c.mintError || null,
    approvedAt: c.approvedAt || null,
    approvedBy: c.approvedBy || null,
    blockchain: {
      verified: chainVerified,
      badgeMinted,
      simulated: Boolean(verification?.simulated),
      walletAddress: c.walletAddress,
      tokenId: c.tokenId != null ? String(c.tokenId) : null,
      tokenURI: c.tokenURI || null,
      txHash: status === 'revoked' ? c.revokeTransactionHash || null : c.mintTransactionHash || null,
      network: 'Polygon Amoy'
    },
    digitalPresence: {
      websiteAge: 'Unknown',
      sslValid: /^https:\/\//i.test(c.website || ''),
      mxRecordsFound: null,
      linkedIn: c.linkedinUrl || 'None'
    },
    trustSignals,
    riskSignals,
    verificationHistory: [
      ...(c.verificationDate
        ? [{ date: toDateString(c.verificationDate), status: 'VERIFIED', details: 'Soulbound Trust Badge issued.' }]
        : []),
      ...(c.revocationDate
        ? [{ date: toDateString(c.revocationDate), status: 'REVOKED', details: c.revocationReason || 'Badge revoked.' }]
        : [])
    ]
  };
}

// Demo fallbacks — ONLY active when VITE_USE_DEMO=true.
function demoOrThrow(error, demoFactory) {
  if (!USE_DEMO) {
    console.warn(`[FOCAL] API request failed (demo mode disabled): ${error.message}`);
    return Promise.reject(error);
  }
  console.warn(`[FOCAL] API request failed — serving demo data: ${error.message}`);
  return Promise.resolve(demoFactory());
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// ---------------------------------------------------------------------------
// Public API functions — each returns the page-expected shape.
// ---------------------------------------------------------------------------

// Analyze / check a job opportunity (text, URL, or raw email)
export async function checkCompany(input) {
  try {
    const data = await api.post('/check', { input });
    // data = { check, company, confidence, riskLevel, explanation, simulated }

    let company = normalizeCompany(data.company, null, data.verification);
    const mlFlags = (data.check?.redFlags || []).map((flag, i) => {
      const [title, ...rest] = String(flag).split(' — ');
      return {
        code: `ML_FLAG_${i + 1}`,
        severity: (data.check?.riskScore || 0) >= 50 ? 'high' : 'warning',
        title,
        description: rest.join(' — ') || flag
      };
    });

    if (company) {
      company.riskSignals = [...(company.riskSignals || []), ...mlFlags];
      // Unverified entities: derive trust directly from the ML risk score
      if (company.status !== 'verified' && data.check?.riskScore != null) {
        company.trustScore = 100 - (data.check.riskScore || 0);
      }
    }

    return {
      company,
      check: data.check,
      confidence: data.confidence,
      riskLevel: data.riskLevel,
      explanation: data.explanation,
      verification: data.verification,
      simulated: data.simulated,
      typosquattingMatch: null,
      source: 'live'
    };
  } catch (err) {
    return demoOrThrow(err, async () => {
      await delay(600);
      const query = (input || '').toLowerCase().trim();
      let match = demoCompanies.find(
        (c) => c.domain.toLowerCase().includes(query) || c.name.toLowerCase().includes(query) || c.id.toLowerCase() === query
      );
      const typosquat = demoTyposquattingExamples.find(
        (t) => t.suspiciousDomain.toLowerCase().includes(query) || t.officialDomain.toLowerCase().includes(query)
      );
      if (!match && query.includes('companny')) match = demoCompanies.find((c) => c.id === 'companny-tech');
      if (!match && query.includes('quick')) match = demoCompanies.find((c) => c.id === 'quick-hire');
      if (!match && (query.includes('tech') || query === '')) match = demoCompanies[0];

      if (match) {
        return {
          company: match,
          check: null,
          confidence: 0.7,
          riskLevel: match.status === 'verified' ? 'low' : 'high',
          explanation: 'Demo data',
          simulated: true,
          typosquattingMatch: typosquat || (match.id === 'companny-tech' ? demoTyposquattingExamples[0] : null),
          source: 'demo'
        };
      }
      throw err;
    });
  }
}

// Get company catalog
export async function getCompanies(params = {}) {
  try {
    const data = await api.get('/companies', { params });
    const list = Array.isArray(data) ? data : data?.companies || [];
    return { companies: list.map((c) => normalizeCompany(c, c?.badge, c?.verification)), source: 'live' };
  } catch (err) {
    return demoOrThrow(err, async () => {
      await delay(300);
      let list = [...demoCompanies];
      if (params.status && params.status !== 'all') {
        list = list.filter((c) => c.status === params.status.toLowerCase());
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        list = list.filter((c) => c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q));
      }
      return { companies: list, source: 'demo' };
    });
  }
}

// Get company profile by ID
export async function getCompanyById(id) {
  try {
    const data = await api.get(`/companies/${id}`);
    // data = { ...company, badge, verification }
    return {
      company: normalizeCompany(data, data?.badge, data?.verification),
      source: 'live'
    };
  } catch (err) {
    return demoOrThrow(err, async () => {
      await delay(300);
      const found = demoCompanies.find((c) => c.id === id || c.domain === id);
      // Never fabricate a different company for an unknown ID.
      if (!found) throw err;
      return { company: found, source: 'demo' };
    });
  }
}

export async function getCompanyByWallet(walletAddress) {
  try {
    const data = await api.get(`/companies/by-wallet/${encodeURIComponent(walletAddress)}`);
    const company = data?.company || data || null;
    const badge = data?.badge || null;
    const verification = data?.verification || null;
    return {
      company: normalizeCompany(company, badge, verification),
      found: Boolean(company),
      source: 'live'
    };
  } catch (err) {
    return { company: null, found: false, source: 'live', error: err.message };
  }
}

// Submit scam / typosquatting report
export async function submitReport(formData) {
  try {
    const data = await api.post('/reports', formData);
    return { success: true, report: normalizeReport(data), message: 'REPORT RECEIVED ✓' };
  } catch (err) {
    return demoOrThrow(err, async () => {
      await delay(800);
      const newReport = {
        id: `rep-${Date.now()}`,
        ...formData,
        date: new Date().toISOString().replace('T', ' ').slice(0, 19),
        status: 'PENDING_REVIEW'
      };
      demoReports.unshift(newReport);
      return { success: true, report: newReport, message: 'REPORT RECEIVED ✓ (demo mode)' };
    });
  }
}

// Connections list & request
export async function getConnections() {
  try {
    const data = await api.get('/connections');
    const list = Array.isArray(data) ? data : data?.connections || [];
    return { connections: list.map(normalizeConnection), source: 'live' };
  } catch (err) {
    return demoOrThrow(err, async () => {
      await delay(300);
      return { connections: demoConnections, source: 'demo' };
    });
  }
}

export async function requestConnection(form) {
  try {
    const data = await api.post('/connections', {
      companyName: form.companyB,
      companyDomain: form.domainB,
      requesterName: form.companyA,
      requesterDomain: form.domainA,
      message: `Trusted connection request from ${form.companyA} (${form.domainA}) to ${form.companyB} (${form.domainB}).`
    });
    return { success: true, connection: normalizeConnection(data) };
  } catch (err) {
    return demoOrThrow(err, async () => {
      await delay(700);
      const newConn = {
        id: `conn-${Date.now()}`,
        companyA: form.companyA || 'TechNova Solutions Pvt Ltd',
        domainA: form.domainA || 'technova.com',
        companyB: form.companyB || 'Target Business Entity',
        domainB: form.domainB || 'target.com',
        trustScore: 88,
        status: 'PENDING_MEDIATION',
        establishedDate: new Date().toISOString().slice(0, 10),
        checksPassed: ['Identity Verified', 'Domain Match Verified', 'Continuous Signal Monitoring Active']
      };
      demoConnections.unshift(newConn);
      return { success: true, connection: newConn };
    });
  }
}

// Register a company for verification (public). The backend runs schema
// validation, domain/wallet duplicate checks and GST verification, then
// stores the record as `pending` — the soulbound badge is minted later by
// the admin approval pipeline, never from this call. When the backend runs
// with DEMO_VERIFICATION_MODE=true, the response instead carries a
// demoMode-verified record for the demo onboarding flow.
export async function registerCompany(formData) {
  const data = await api.post('/companies/register', formData);
  // Interceptor already unwrapped { success, data } -> the company document.
  return { success: true, company: normalizeCompany(data) };
}

// Runtime backend configuration (public, non-secret): demo verification
// mode flag, badge network and contract address.
export async function getBackendConfig() {
  return api.get('/config');
}

// Mint the FOCAL badge — signed by the company's CONNECTED MetaMask wallet.
// The backend verifies the signature against the registered wallet (the
// signature proves the requester controls the recipient wallet; the address
// itself is never trusted from the request), then submits the real Polygon
// Amoy transaction with the platform admin signer and WAITS for the receipt.
// The mint only returns after on-chain confirmation, so the request needs a
// much longer timeout than the default 12s.
export async function mintCompanyBadge(companyId, { signature, message, walletAddress }) {
  const data = await api.post(
    `/companies/${companyId}/mint-badge`,
    { signature, message, walletAddress },
    { timeout: 180000 }
  );
  // data = { company, badge } — the badge carries the real tokenId/tx hash
  // from the confirmed transaction; there is no simulated path.
  return { success: true, company: normalizeCompany(data.company), badge: data.badge };
}

// ---------------------------------------------------------------------------
// Admin APIs
// ---------------------------------------------------------------------------

export async function adminLogin(credentials) {
  // No demo fallback for authentication — failures must surface.
  const data = await api.post('/admin/login', credentials);
  // Interceptor unwrapped the envelope: data = { token, admin }
  if (!data?.token) {
    throw new Error('Login failed — no token received from backend.');
  }
  localStorage.setItem('focal_admin_token', data.token);
  return {
    success: true,
    token: data.token,
    user: { name: 'FOCAL Admin', email: data.admin?.email || credentials.email }
  };
}

export async function getAdminReports() {
  try {
    const data = await api.get('/admin/reports');
    const list = Array.isArray(data) ? data : data?.reports || [];
    return { reports: list.map(normalizeReport), source: 'live' };
  } catch (err) {
    return demoOrThrow(err, async () => {
      await delay(300);
      return { reports: demoReports, source: 'demo' };
    });
  }
}

export async function getAdminStats() {
  try {
    const data = await api.get('/admin/stats');
    // data = { companiesByStatus, reportsByStatus, totalChecks }
    return {
      stats: {
        totalChecks: data?.totalChecks || 0,
        companiesByStatus: data?.companiesByStatus || [],
        reportsByStatus: data?.reportsByStatus || []
      },
      source: 'live'
    };
  } catch (err) {
    return demoOrThrow(err, async () => {
      await delay(300);
      return { stats: { totalChecks: 0, companiesByStatus: [], reportsByStatus: [] }, source: 'demo' };
    });
  }
}

export async function reviewReport(id, action) {
  // Map the dashboard's approve/dismiss vocabulary to the backend's statuses
  const status = action.action === 'approve' ? 'accepted' : 'rejected';
  const data = await api.post(`/admin/reports/${id}/review`, {
    status,
    reviewNote: action.reviewNote || ''
  });
  return { success: true, report: normalizeReport(data) };
}

export async function approveCompany(id) {
  const data = await api.post(`/admin/companies/${id}/approve`, {}, { timeout: 180000 });
  // data = { company, mint, badge, mintError?, verificationReport }
  // A null mint/badge with mintError means: company VERIFIED (off-chain),
  // badge mint failed — the admin MINT BADGE action can retry.
  return {
    success: true,
    company: normalizeCompany(data.company),
    mint: data.mint,
    badge: data.badge || null,
    mintError: data.mintError || null,
    source: 'live'
  };
}

// Admin-side badge mint for an already-VERIFIED company (retry path). The
// backend enforces status === 'verified' and idempotency; the mint only
// returns after real on-chain confirmation.
export async function adminMintBadge(id) {
  const data = await api.post(`/admin/companies/${id}/mint-badge`, {}, { timeout: 180000 });
  return {
    success: true,
    company: normalizeCompany(data.company),
    badge: data.badge,
    alreadyMinted: Boolean(data.alreadyMinted)
  };
}

export async function rejectCompany(id, reason = '') {
  const data = await api.post(`/admin/companies/${id}/reject`, { reason });
  return { success: true, company: normalizeCompany(data), source: 'live' };
}

export async function revokeCompany(id, reason = '') {
  const data = await api.post(`/admin/companies/${id}/revoke`, { reason });
  return { success: true, company: normalizeCompany(data.company), source: 'live' };
}

export async function verifyCompanyGST(id, gstin, companyState = '') {
  const data = await api.post(`/companies/${id}/gst-verify`, { gstin, companyState });
  return { success: true, company: normalizeCompany(data), source: 'live' };
}

// ---------------------------------------------------------------------------
// Student APIs — the OPTIONAL account layer.
//
// Completely separate from the admin auth above: different endpoints,
// different token, different signing secret. Nothing here is ever required to
// check a company. Like adminLogin, none of these use demoOrThrow —
// authentication must never be simulated.
// ---------------------------------------------------------------------------

export async function studentRegister({ name, email, password }) {
  const data = await api.post('/students/register', { name, email, password });
  // The backend returns the account without a token on purpose; the caller
  // signs in afterwards so token issuance has exactly one code path.
  return { success: true, student: data?.student || null };
}

export async function studentLogin({ email, password }) {
  const data = await api.post('/students/login', { email, password });
  if (!data?.token) {
    throw new Error('Login failed — no token received from backend.');
  }
  // Unlike adminLogin, this does NOT persist the token: AppContext owns the
  // student session keys so there is a single guarded writer for them.
  return { success: true, token: data.token, student: data.student || null };
}

export async function getStudentProfile() {
  const data = await api.get('/students/me');
  return { success: true, student: data?.student || null };
}