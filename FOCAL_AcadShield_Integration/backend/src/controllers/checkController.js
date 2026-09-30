const Company = require('../models/Company');
const Check = require('../models/Check');
const { analyzeOpportunity } = require('../services/scamDetectionService');
const { resolveVerification } = require('../services/blockchainService');
const { asyncHandler, escapeRegex, normalizeDomain } = require('../utils/helpers');

async function matchCompany(input, inputType) {
  if (inputType === 'url') {
    return Company.findOne({ domain: normalizeDomain(input) });
  }
  if (inputType === 'email') {
    // Email inputs are multi-line (headers/body) — extract the domain of the
    // first address-like token instead of the raw text after '@'.
    const addressMatch = input.match(/@([\w.-]+)/);
    const domain = addressMatch ? normalizeDomain(addressMatch[1]) : null;
    return domain ? Company.findOne({ domain }) : null;
  }
  // Try exact or regex match on name first
  const exact = await Company.findOne({ name: new RegExp(`^${escapeRegex(input.trim())}$`, 'i') });
  if (exact) return exact;

  try {
    return await Company.findOne({ $text: { $search: input } });
  } catch (err) {
    return Company.findOne({ name: new RegExp(escapeRegex(input.trim()), 'i') });
  }
}

function resolveResult(company, isVerified, riskScore) {
  if (company?.status === 'revoked') return 'revoked';
  if (isVerified) return 'verified';
  if (!company && riskScore < 50) return 'not_found';
  return riskScore >= 50 ? 'suspicious' : 'not_found';
}

// @desc    Analyze opportunity input & persist check record (Create)
// @route   POST /api/check
// @access  Public
const checkOpportunity = asyncHandler(async (req, res) => {
  const { input, notes } = req.body;
  const analysis = await analyzeOpportunity(input);
  const company = await matchCompany(input, analysis.inputType);
  // Chain-first, fail-closed: when a contract is configured a valid on-chain
  // badge is REQUIRED; a DB tokenId alone never counts as proof.
  const verification = await resolveVerification(company);
  const isVerified = verification.isVerified;
  const result = resolveResult(company, isVerified, analysis.riskScore);

  const redFlags = [...analysis.redFlags];
  if (company?.status === 'revoked') redFlags.push('Company badge has been revoked');
  if (!company) redFlags.push('No verified company record found');
  if (company?.status === 'verified' && !verification.onChain) {
    redFlags.push('On-chain badge could not be confirmed');
  }

  const check = await Check.create({
    input,
    inputType: analysis.inputType,
    companyId: company?._id,
    isVerified,
    riskScore: analysis.riskScore,
    redFlags,
    result,
    notes: notes || undefined
  });

  return res.status(201).json({
    success: true,
    data: {
      check,
      company,
      confidence: analysis.confidence,
      riskLevel: analysis.riskLevel,
      explanation: analysis.explanation,
      verification,
      simulated: analysis.simulated || verification.simulated
    }
  });
});

// @desc    Get check history with filtering & pagination (Read list)
// @route   GET /api/check or GET /api/check/history
// @access  Public
const getHistory = asyncHandler(async (req, res) => {
  const { result, inputType, search, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (result) {
    filter.result = result;
  }

  if (inputType) {
    filter.inputType = inputType;
  }

  if (search) {
    filter.input = new RegExp(escapeRegex(search.trim()), 'i');
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, checks] = await Promise.all([
    Check.countDocuments(filter),
    // Public listing — omit the raw submitted text and notes (may contain
    // users' private correspondence/PII). Single records stay available
    // via GET /api/check/:id for the submitter.
    Check.find(filter)
      .select('-input -notes')
      .populate('companyId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  return res.json({
    success: true,
    count: checks.length,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    data: checks
  });
});

// @desc    Get single check record by ID (Read one)
// @route   GET /api/check/:id
// @access  Public
const getCheckById = asyncHandler(async (req, res) => {
  const check = await Check.findById(req.params.id).populate('companyId');
  if (!check) {
    return res.status(404).json({ success: false, message: 'Check record not found' });
  }

  return res.json({ success: true, data: check });
});

// @desc    Update a check record (Update)
// @route   PATCH /api/check/:id or PUT /api/check/:id
// @access  Protected / Admin
const updateCheck = asyncHandler(async (req, res) => {
  const check = await Check.findById(req.params.id);
  if (!check) {
    return res.status(404).json({ success: false, message: 'Check record not found' });
  }

  const allowedUpdates = ['notes', 'riskScore', 'redFlags', 'result', 'isVerified'];
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      check[key] = req.body[key];
    }
  }

  await check.save();
  return res.json({ success: true, message: 'Check record updated successfully', data: check });
});

// @desc    Delete a check record from history (Delete)
// @route   DELETE /api/check/:id
// @access  Protected / Admin
const deleteCheck = asyncHandler(async (req, res) => {
  const check = await Check.findById(req.params.id);
  if (!check) {
    return res.status(404).json({ success: false, message: 'Check record not found' });
  }

  await Check.findByIdAndDelete(req.params.id);
  return res.json({
    success: true,
    message: 'Check record deleted successfully',
    data: { id: req.params.id }
  });
});

module.exports = {
  checkOpportunity,
  deleteCheck,
  getCheckById,
  getHistory,
  updateCheck
};
