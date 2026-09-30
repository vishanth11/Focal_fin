const Connection = require('../models/Connection');
const Company = require('../models/Company');
const { asyncHandler, escapeRegex, normalizeDomain } = require('../utils/helpers');

// Contact details are omitted from PUBLIC reads (list / get-by-id) — only the
// submitter's POST response and admin routes return them in full.
const PUBLIC_PROJECTION = '-studentEmail -studentName -message';

// @desc    Create a connection request (Create)
// @route   POST /api/connections
// @access  Public
const createConnection = asyncHandler(async (req, res) => {
  const { companyName, companyDomain, requesterName, requesterDomain, studentName, studentEmail, message } = req.body;

  if (!companyName && !req.body.companyId) {
    return res.status(400).json({ success: false, message: 'companyName or companyId is required' });
  }

  let company = null;
  if (req.body.companyId) {
    company = await Company.findById(req.body.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
  } else if (companyName) {
    company = await Company.findOne({ name: new RegExp(`^${escapeRegex(companyName.trim())}$`, 'i') });
  }

  const connection = await Connection.create({
    companyId: company?._id,
    companyName: company?.name || companyName,
    companyDomain: company?.domain || (companyDomain ? normalizeDomain(companyDomain) : undefined),
    requesterName,
    requesterDomain: requesterDomain ? normalizeDomain(requesterDomain) : undefined,
    studentName,
    studentEmail,
    message
  });

  return res.status(201).json({ success: true, data: connection });
});

// @desc    List connections (Read list)
// @route   GET /api/connections
// @access  Public (trusted-connection directory shown on the public page)
const listConnections = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const filter = status ? { status } : {};

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [total, connections] = await Promise.all([
    Connection.countDocuments(filter),
    Connection.find(filter)
      .select(PUBLIC_PROJECTION)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  return res.json({
    success: true,
    count: connections.length,
    total,
    page: pageNum,
    data: connections
  });
});

// @desc    Get single connection (Read one)
// @route   GET /api/connections/:id
// @access  Public
const getConnection = asyncHandler(async (req, res) => {
  const connection = await Connection.findById(req.params.id)
    .select(PUBLIC_PROJECTION)
    .populate('companyId');
  if (!connection) {
    return res.status(404).json({ success: false, message: 'Connection not found' });
  }
  return res.json({ success: true, data: connection });
});

// @desc    Update connection status (Update)
// @route   PATCH /api/connections/:id or PUT /api/connections/:id
// @access  Admin
const updateConnection = asyncHandler(async (req, res) => {
  const connection = await Connection.findById(req.params.id);
  if (!connection) {
    return res.status(404).json({ success: false, message: 'Connection not found' });
  }

  if (req.body.status !== undefined) {
    connection.status = req.body.status;
  }
  if (req.body.message !== undefined) {
    connection.message = req.body.message;
  }

  await connection.save();
  return res.json({ success: true, data: connection });
});

// @desc    Delete a connection (Delete)
// @route   DELETE /api/connections/:id
// @access  Admin
const deleteConnection = asyncHandler(async (req, res) => {
  const connection = await Connection.findById(req.params.id);
  if (!connection) {
    return res.status(404).json({ success: false, message: 'Connection not found' });
  }

  await Connection.findByIdAndDelete(req.params.id);
  return res.json({ success: true, data: { id: req.params.id } });
});

module.exports = {
  createConnection,
  deleteConnection,
  getConnection,
  listConnections,
  updateConnection
};