const { ethers } = require('ethers');
const Company = require('../models/Company');
const env = require('../config/env');
const { getBadgeDetails, resolveVerification } = require('../services/blockchainService');
const { verifyGST } = require('../services/gstVerificationService');
const { issueBadge, badgePayload } = require('../services/companyBadgeService');
const { asyncHandler, escapeRegex, normalizeDomain } = require('../utils/helpers');

// Fields a company may submit about itself on the PUBLIC register route.
// Verification state (status/tokenId/hashes/dates) is server-controlled only —
// accepting it from the request body would let anyone self-verify.
const REGISTRABLE_FIELDS = [
  'name',
  'registrationNumber',
  'taxId',
  'email',
  'phone',
  'address',
  'website',
  'linkedinUrl',
  'walletAddress',
  'gstin'
];

function normalizeWalletAddress(value = '') {
  return String(value || '').trim().toLowerCase();
}

// @desc    Register a new company (Create)
// @route   POST /api/companies/register or POST /api/companies
// @access  Public
const registerCompany = asyncHandler(async (req, res) => {
  const domain = normalizeDomain(req.body.domain || req.body.website);

  // Check if domain is already registered
  const existingDomain = await Company.findOne({ domain });
  if (existingDomain) {
    return res.status(409).json({
      success: false,
      message: `A company with domain "${domain}" is already registered`
    });
  }

  const walletAddress = normalizeWalletAddress(req.body.walletAddress);
  const walletLookup = { walletAddress: { $regex: `^${escapeRegex(walletAddress)}$`, $options: 'i' } };

  // Check if wallet address is already registered. A reconnect must restore the
  // existing company instead of creating a duplicate active registration.
  if (walletAddress) {
    const existingWallet = await Company.findOne(walletLookup);
    if (existingWallet) {
      return res.status(200).json({
        success: true,
        existing: true,
        message: `Existing company restored for wallet ${walletAddress}`,
        data: existingWallet
      });
    }
  }

  // Whitelist: never spread req.body into the model (mass assignment would
  // allow self-verified companies). Every registration — production AND demo
  // — starts pending; only the admin approval endpoint can flip status to
  // 'verified'. The demo branch below never changes the status.
  const payload = { domain, status: 'pending' };
  for (const field of REGISTRABLE_FIELDS) {
    if (req.body[field] !== undefined) {
      payload[field] = field === 'walletAddress' ? walletAddress : req.body[field];
    }
  }

  if (env.demoVerificationMode) {
    // DEMO MODE — clearly separated from the production pipeline above.
    // No external GST registry is consulted: demo verification NEVER claims a
    // government check (gstVerificationSimulated stays true and the report
    // records demo/governmentChecks: false). The company stays PENDING —
    // demo verification alone never makes a company VERIFIED, and never
    // authorizes a badge mint. Only the admin approval endpoint can flip
    // status to verified, exactly like production.
    Object.assign(payload, {
      demoMode: true,
      gstVerificationStatus: payload.gstin ? 'verified' : 'not_provided',
      gstVerificationSimulated: true,
      gstVerificationDate: new Date(),
      gstVerificationReference: 'demo-mode',
      verificationReport: {
        demo: true,
        source: 'demo-mode',
        governmentChecks: false,
        message: 'Demo verification passed. No government or external registry was consulted.',
        overallScore: 100,
        recommendation: 'approve',
        checks: [
          { name: 'DEMO VERIFICATION PASSED', passed: true },
          { name: 'Domain and wallet uniqueness confirmed', passed: true },
          { name: 'Demo registration recorded', passed: true }
        ],
        redFlags: []
      }
    });
  } else {
    const gstVerification = await verifyGST({
      gstin: payload.gstin,
      name: payload.name,
      state: null,
      address: payload.address
    });
    Object.assign(payload, {
      gstVerificationStatus: gstVerification.status,
      gstVerificationSimulated: gstVerification.simulated,
      gstVerificationDate: gstVerification.verificationDate,
      gstLegalName: gstVerification.legalName,
      gstTradeName: gstVerification.tradeName,
      gstRegistrationStatus: gstVerification.registrationStatus,
      gstBusinessType: gstVerification.businessType,
      gstState: gstVerification.state,
      gstPrincipalAddress: gstVerification.principalAddress,
      gstTaxpayerType: gstVerification.taxpayerType,
      gstVerificationReference: gstVerification.reference,
      gstVerificationResult: gstVerification.result || null
    });
  }

  const company = await Company.create(payload);
  return res.status(201).json({ success: true, data: company });
});

// @desc    List companies with filtering, search & pagination (Read list)
// @route   GET /api/companies
// @access  Public
const listCompanies = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { name: searchRegex },
      { domain: searchRegex },
      { email: searchRegex }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, companies] = await Promise.all([
    Company.countDocuments(filter),
    Company.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  const companiesWithVerification = await Promise.all(
    companies.map(async (company) => ({
      ...company.toObject(),
      verification: await resolveVerification(company)
    }))
  );

  return res.json({
    success: true,
    count: companies.length,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    data: companiesWithVerification
  });
});

// @desc    Get single company by ID (Read one)
// @route   GET /api/companies/:id
// @access  Public
const getCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  let badge = null;
  if (company.walletAddress) {
    badge = await getBadgeDetails(company.walletAddress);
  }
  const verification = await resolveVerification(company);

  return res.json({
    success: true,
    data: {
      ...company.toObject(),
      badge,
      verification
    }
  });
});

// @desc    Update company details (Update)
// @route   PATCH /api/companies/:id or PUT /api/companies/:id
// @access  Protected / Admin
const updateCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  if (req.body.status !== undefined) {
    return res.status(400).json({
      success: false,
      message: 'Use the admin approval or revocation endpoint to change company status'
    });
  }

  const allowedUpdates = [
    'name',
    'website',
    'domain',
    'registrationNumber',
    'taxId',
    'email',
    'phone',
    'address',
    'linkedinUrl',
    'walletAddress',
    'rejectionReason',
    'revocationReason'
  ];

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      if (key === 'domain' || (key === 'website' && !req.body.domain)) {
        company.domain = normalizeDomain(req.body[key]);
      } else {
        company[key] = req.body[key];
      }
    }
  }

  await company.save();
  return res.json({ success: true, message: 'Company updated successfully', data: company });
});

const verifyCompanyGST = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  company.gstin = req.body.gstin.trim().toUpperCase();
  const result = await verifyGST({
    gstin: company.gstin,
    name: company.name,
    state: req.body.companyState,
    address: company.address
  });
  Object.assign(company, {
    gstVerificationStatus: result.status,
    gstVerificationSimulated: result.simulated,
    gstVerificationDate: result.verificationDate,
    gstLegalName: result.legalName,
    gstTradeName: result.tradeName,
    gstRegistrationStatus: result.registrationStatus,
    gstBusinessType: result.businessType,
    gstState: result.state,
    gstPrincipalAddress: result.principalAddress,
    gstTaxpayerType: result.taxpayerType,
    gstVerificationReference: result.reference,
    gstVerificationResult: result.result || null
  });
  await company.save();
  return res.json({ success: true, data: company });
});

// @desc    Delete company by ID (Delete)
// @route   DELETE /api/companies/:id
// @access  Protected / Admin
const deleteCompany = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }

  await Company.findByIdAndDelete(req.params.id);
  return res.json({
    success: true,
    message: 'Company deleted successfully',
    data: { id: req.params.id, name: company.name }
  });
});

// @desc    Check company verification by domain
// @route   GET /api/companies/check
// @access  Public
const checkCompanyByDomain = asyncHandler(async (req, res) => {
  const domain = normalizeDomain(req.query.domain || '');
  if (!domain) {
    return res.status(400).json({ success: false, message: 'domain query parameter is required' });
  }

  const company = await Company.findOne({ domain });
  if (!company) {
    return res.json({ success: true, data: { found: false, domain, isVerified: false } });
  }

  const verification = await resolveVerification(company);

  return res.json({
    success: true,
    data: {
      found: true,
      company,
      verification,
      isVerified: verification.isVerified
    }
  });
});

// @desc    Check company verification by wallet address
// @route   GET /api/companies/status/:walletAddress
// @access  Public
const checkCompanyByWallet = asyncHandler(async (req, res) => {
  const walletAddress = normalizeWalletAddress(req.params.walletAddress || req.query.walletAddress);
  if (!walletAddress) {
    return res.status(400).json({ success: false, message: 'walletAddress is required' });
  }

  const company = await Company.findOne({
    walletAddress: { $regex: `^${escapeRegex(walletAddress)}$`, $options: 'i' }
  });
  const badge = company?.walletAddress ? await getBadgeDetails(company.walletAddress) : null;
  const verification = await resolveVerification(company);

  return res.json({
    success: true,
    data: {
      company,
      badge,
      verification,
      isVerified: verification.isVerified
    }
  });
});

const getCompanyByWallet = asyncHandler(async (req, res) => {
  const walletAddress = normalizeWalletAddress(req.params.walletAddress || req.query.walletAddress);
  if (!walletAddress) {
    return res.status(400).json({ success: false, message: 'walletAddress is required' });
  }

  const company = await Company.findOne({
    walletAddress: { $regex: `^${escapeRegex(walletAddress)}$`, $options: 'i' }
  });
  if (!company) {
    return res.json({ success: true, data: { company: null, found: false } });
  }

  const badge = await getBadgeDetails(company.walletAddress);
  const verification = await resolveVerification(company);
  return res.json({
    success: true,
    data: { company, badge, verification, found: true }
  });
});

// @desc    Mint the real FOCAL badge for an admin-VERIFIED company
// @route   POST /api/companies/:id/mint-badge
// @access  Public — gated on the AUTHORITATIVE admin approval: only a company
//          with status === 'verified' (set exclusively by the admin approval
//          endpoint) may mint. GST/demo verification or wallet connection
//          alone never authorizes a mint. The requester must prove control of
//          the company's registered MetaMask wallet by signing a message; the
//          badge contract's mintBadge is onlyAdmin, so the backend admin
//          signer submits the real transaction and pays the gas — the badge
//          recipient is always the registered company wallet.
const mintBadgeForCompany = asyncHandler(async (req, res) => {
  const { signature, message, walletAddress } = req.body;
  if (!signature || !message || !walletAddress) {
    return res.status(400).json({
      success: false,
      message: 'signature, message and walletAddress are required'
    });
  }
  if (!ethers.isAddress(walletAddress)) {
    return res.status(400).json({ success: false, message: 'Invalid wallet address' });
  }

  const company = await Company.findById(req.params.id);
  if (!company) {
    return res.status(404).json({ success: false, message: 'Company not found' });
  }
  if (company.status !== 'verified') {
    return res.status(403).json({
      success: false,
      code: 'NOT_VERIFIED',
      message: 'NFT minting becomes available after administrator verification.'
    });
  }
  if (company.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    return res.status(403).json({
      success: false,
      code: 'WALLET_MISMATCH',
      message: 'Wallet address does not match the company registration.'
    });
  }
  // The signed message must reference this company — a signature made for
  // any other purpose cannot be replayed here.
  if (!message.includes(company.name)) {
    return res.status(403).json({
      success: false,
      code: 'INVALID_SIGNATURE',
      message: 'Signature message does not match this company.'
    });
  }

  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(message, signature);
  } catch (error) {
    return res.status(403).json({
      success: false,
      code: 'INVALID_SIGNATURE',
      message: 'Signature verification failed.'
    });
  }
  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    return res.status(403).json({
      success: false,
      code: 'INVALID_SIGNATURE',
      message: 'Signature does not match the company wallet.'
    });
  }

  // Idempotent: an already-confirmed badge returns the recorded on-chain
  // data — a second mint is never attempted.
  if (company.tokenId != null && company.mintTransactionHash) {
    return res.json({
      success: true,
      message: 'Badge already minted.',
      data: { company, badge: badgePayload(company), alreadyMinted: true }
    });
  }

  // The same real mint pipeline the admin approval flow uses. Any failure
  // (unconfigured contract/admin key, Pinata, RPC, gas) throws and surfaces
  // as an honest error — the record is never marked minted without a
  // confirmed transaction, and a retry creates no duplicate record.
  const minted = await issueBadge(company, { demo: company.demoMode });
  Object.assign(company, {
    verificationHash: minted.verificationHash,
    tokenURI: minted.tokenURI,
    tokenId: minted.tokenId,
    mintTransactionHash: minted.transactionHash
  });
  await company.save();

  return res.json({ success: true, data: { company, badge: badgePayload(company) } });
});

module.exports = {
  checkCompanyByDomain,
  checkCompanyByWallet,
  deleteCompany,
  getCompany,
  getCompanyByWallet,
  listCompanies,
  mintBadgeForCompany,
  registerCompany,
  verifyCompanyGST,
  updateCompany
};
