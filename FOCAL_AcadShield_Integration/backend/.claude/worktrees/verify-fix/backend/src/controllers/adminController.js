const bcrypt = require('bcryptjs');
const Company = require('../models/Company');
const Report = require('../models/Report');
const Check = require('../models/Check');
const env = require('../config/env');
const { generateToken } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { verifyCompany } = require('../services/verificationService');
const { revokeBadge } = require('../services/blockchainService');
const { issueBadge, badgePayload } = require('../services/companyBadgeService');

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const emailMatches = email === env.adminEmail;
  const passwordMatches = env.adminPassword.startsWith('$2')
    ? await bcrypt.compare(password, env.adminPassword)
    : password === env.adminPassword;

  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  }

  return res.json({
    success: true,
    data: {
      token: generateToken('focal-admin'),
      admin: { email: env.adminEmail, role: 'admin' }
    }
  });
});

const listAdminCompanies = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const companies = await Company.find(filter).sort({ createdAt: -1 });
  res.json({ success: true, count: companies.length, data: companies });
});

const approveCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }
  if (company.status === 'verified') {
    return res.status(409).json({ success: false, message: 'Company is already verified' });
  }

  // Verification report — SUPPORTING EVIDENCE ONLY. The admin's VERIFY click
  // IS the manual review and is authoritative: a failed, demo or unavailable
  // GST/MCA/trust-engine result NEVER blocks the approval. Demo companies
  // registered under DEMO_VERIFICATION_MODE keep their demo report; production
  // companies run the trust engine. If even that evidence run fails, approval
  // still proceeds — the report just records the failure honestly.
  let verificationReport;
  try {
    if (company.demoMode && env.demoVerificationMode && company.verificationReport?.demo) {
      verificationReport = company.verificationReport;
    } else {
      verificationReport = await verifyCompany(company.toObject());
    }
  } catch (reportError) {
    verificationReport = {
      source: 'trust-engine-error',
      recommendation: 'manual_review',
      note: 'The automated trust engine could not run; the admin approval below is the manual review.',
      error: reportError.message
    };
  }
  // Record the override honestly when the automated evidence disagreed — the
  // admin decision still wins, and the report says so.
  if (verificationReport.recommendation !== 'approve') {
    verificationReport = { ...verificationReport, adminOverride: true };
  }

  // ADMIN VERIFICATION IS AUTHORITATIVE. Status flips to verified and is
  // saved BEFORE any blockchain interaction, so an Amoy outage or mint
  // failure can never lose the admin's decision. VERIFIED (off-chain) and
  // BADGE MINTED (on-chain) are deliberately separate states.
  const approvalDate = new Date();
  company.status = 'verified';
  company.verificationDate = approvalDate;
  company.approvedAt = approvalDate;
  company.approvedBy = req.user?.id || 'focal-admin';
  company.mintStatus = 'pending';
  company.verificationReport = verificationReport;
  await company.save();

  // Mint attempt with the platform admin signer — the company wallet is the
  // RECIPIENT and pays no gas. A failure here leaves the company verified
  // with mintStatus 'failed' (retry available); the admin MINT NFT action or
  // the company's wallet-signed mint can retry safely (both idempotent).
  try {
    const minted = await issueBadge(company);
    Object.assign(company, {
      verificationHash: minted.verificationHash,
      tokenURI: minted.tokenURI,
      tokenId: minted.tokenId,
      mintTransactionHash: minted.transactionHash,
      mintStatus: 'minted',
      mintError: null,
      mintedAt: new Date()
    });
    await company.save();

    return res.json({
      success: true,
      data: { company, mint: minted.mint, badge: badgePayload(company), verificationReport }
    });
  } catch (mintError) {
    // The company stays VERIFIED — only the badge is pending. mintStatus is
    // persisted so the admin/company UI can show the honest failure and the
    // retry action.
    company.mintStatus = 'failed';
    company.mintError = mintError.message;
    await company.save();
    return res.json({
      success: true,
      message: 'Company verified, but the blockchain badge could not be minted.',
      data: {
        company,
        mint: null,
        badge: null,
        mintError: mintError.message,
        verificationReport
      }
    });
  }
});

// @desc    Mint the FOCAL badge for a VERIFIED company (admin retry path)
// @route   POST /api/admin/companies/:id/mint-badge
// @access  Protected / Admin — available ONLY for status === 'verified';
//          idempotent; the platform admin wallet signs and pays gas, the
//          company wallet is the recipient.
const mintCompanyBadgeAdmin = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }
  if (company.status !== 'verified') {
    return res.status(403).json({
      success: false,
      message: 'NFT minting becomes available after administrator verification.'
    });
  }

  // Never mint a second badge for the same company.
  if (company.tokenId != null && company.mintTransactionHash) {
    return res.json({
      success: true,
      message: 'Badge already minted.',
      data: { company, badge: badgePayload(company), alreadyMinted: true }
    });
  }

  // REAL mint attempt with the platform signer. A failure persists
  // mintStatus 'failed' + the actual error, keeps the company VERIFIED, and
  // returns an honest response — the retry stays available.
  try {
    const minted = await issueBadge(company, { demo: company.demoMode });
    Object.assign(company, {
      verificationHash: minted.verificationHash,
      tokenURI: minted.tokenURI,
      tokenId: minted.tokenId,
      mintTransactionHash: minted.transactionHash,
      mintStatus: 'minted',
      mintError: null,
      mintedAt: new Date()
    });
    await company.save();

    return res.json({ success: true, data: { company, badge: badgePayload(company) } });
  } catch (mintError) {
    company.mintStatus = 'failed';
    company.mintError = mintError.message;
    await company.save();

    return res.json({
      success: true,
      message: 'NFT mint failed — the company stays VERIFIED and the mint can be retried.',
      data: { company, badge: null, mintError: mintError.message }
    });
  }
});

const rejectCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }
  // A verified company carries an on-chain trust signal — rejecting it (a
  // purely off-chain label) would leave the badge valid on-chain. The admin
  // must REVOKE instead, which burns the badge on Polygon Amoy.
  if (company.status === 'verified') {
    return res.status(409).json({
      success: false,
      message: 'Verified companies must be revoked, not rejected — the on-chain badge stays valid otherwise.'
    });
  }

  company.status = 'rejected';
  company.rejectionReason = req.body.reason || 'Rejected by admin';
  await company.save();

  res.json({ success: true, data: company });
});

const revokeCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }
  if (!company.tokenId && company.tokenId !== 0) {
    return res.status(400).json({ success: false, message: 'Company does not have a token ID to revoke' });
  }

  const revokeResult = await revokeBadge(company.tokenId);

  company.status = 'revoked';
  company.revocationDate = new Date();
  company.revocationReason = req.body.reason || 'Revoked by admin';
  company.revokeTransactionHash = revokeResult.transactionHash;
  await company.save();

  res.json({ success: true, data: { company, revoke: revokeResult } });
});

const listReports = asyncHandler(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const reports = await Report.find(filter).populate('companyId').sort({ createdAt: -1 });
  res.json({ success: true, count: reports.length, data: reports });
});

const reviewReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  report.status = req.body.status;
  report.reviewNote = req.body.reviewNote;
  report.reviewedBy = req.user?.id || 'focal-admin';
  await report.save();

  res.json({ success: true, data: report });
});

const getStats = asyncHandler(async (req, res) => {
  const [companiesByStatus, reportsByStatus, totalChecks] = await Promise.all([
    Company.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Check.countDocuments()
  ]);

  res.json({
    success: true,
    data: {
      companiesByStatus,
      reportsByStatus,
      totalChecks
    }
  });
});

module.exports = {
  approveCompany,
  getStats,
  listAdminCompanies,
  listReports,
  login,
  mintCompanyBadgeAdmin,
  rejectCompany,
  reviewReport,
  revokeCompany
};
