const Company = require('../models/Company');
const Report = require('../models/Report');
const { asyncHandler, escapeRegex } = require('../utils/helpers');

// @desc    Submit a scam report (Create)
// @route   POST /api/reports
// @access  Public
const submitReport = asyncHandler(async (req, res) => {
  let company = null;
  if (req.body.companyId) {
    company = await Company.findById(req.body.companyId);
  } else if (req.body.companyName) {
    company = await Company.findOne({
      name: new RegExp(`^${escapeRegex(req.body.companyName.trim())}$`, 'i')
    });
  }

  const report = await Report.create({
    companyId: company?._id,
    companyName: req.body.companyName || company?.name,
    reporterEmail: req.body.reporterEmail,
    reporterName: req.body.reporterName,
    evidenceUrl: req.body.evidenceUrl,
    description: req.body.description
  });

  return res.status(201).json({ success: true, data: report });
});

// @desc    List all reports with filtering, search & pagination (Read list)
// @route   GET /api/reports
// @access  Public or Admin
const listReports = asyncHandler(async (req, res) => {
  const { status, companyId, search, page = 1, limit = 20 } = req.query;
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (companyId) {
    filter.companyId = companyId;
  }

  if (search) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { companyName: searchRegex },
      { description: searchRegex },
      { reporterEmail: searchRegex }
    ];
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [total, reports] = await Promise.all([
    Report.countDocuments(filter),
    Report.find(filter)
      .populate('companyId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
  ]);

  return res.json({
    success: true,
    count: reports.length,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
    data: reports
  });
});

// @desc    Get single report by ID (Read one)
// @route   GET /api/reports/:id
// @access  Public or Admin
const getReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id).populate('companyId');
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  return res.json({ success: true, data: report });
});

// @desc    Get all reports for a specific company
// @route   GET /api/reports/company/:companyId
// @access  Public
const getReportsForCompany = asyncHandler(async (req, res) => {
  const reports = await Report.find({ companyId: req.params.companyId })
    .populate('companyId')
    .sort({ createdAt: -1 });

  return res.json({ success: true, count: reports.length, data: reports });
});

// @desc    Update report details or status (Update)
// @route   PATCH /api/reports/:id or PUT /api/reports/:id
// @access  Protected / Admin
const updateReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  const allowedUpdates = [
    'companyName',
    'reporterEmail',
    'reporterName',
    'evidenceUrl',
    'description',
    'status',
    'reviewNote'
  ];

  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      report[key] = req.body[key];
    }
  }

  if (req.body.status && req.user) {
    report.reviewedBy = req.user.id || 'admin';
  }

  await report.save();
  return res.json({ success: true, message: 'Report updated successfully', data: report });
});

// @desc    Delete a report (Delete)
// @route   DELETE /api/reports/:id
// @access  Protected / Admin
const deleteReport = asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  await Report.findByIdAndDelete(req.params.id);
  return res.json({
    success: true,
    message: 'Report deleted successfully',
    data: { id: req.params.id }
  });
});

module.exports = {
  deleteReport,
  getReport,
  getReportsForCompany,
  listReports,
  submitReport,
  updateReport
};
