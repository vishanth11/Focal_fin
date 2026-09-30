const University = require('../models/University');
const AcademicCredential = require('../models/AcademicCredential');
const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../utils/helpers');

// @desc    List all universities with filtering
// @route   GET /api/admin/universities
// @access  Admin
const listUniversities = asyncHandler(async (req, res) => {
  const { status, search, limit = 50, page = 1 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [universities, total] = await Promise.all([
    University.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    University.countDocuments(query)
  ]);

  return res.json({
    success: true,
    data: {
      universities,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

// @desc    Approve a university application
// @route   POST /api/admin/universities/:id/approve
// @access  Admin
const approveUniversity = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const university = await University.findById(id);
  if (!university) {
    return res.status(404).json({ success: false, message: 'University not found.' });
  }

  university.status = 'approved';
  university.approvedAt = new Date();
  university.approvedBy = req.user?.id || 'Platform Admin';
  university.rejectionReason = undefined;
  await university.save();

  await AuditLog.create({
    actorId: req.user?.id || 'admin',
    actorRole: 'admin',
    actorName: 'Platform Administrator',
    action: 'UNIVERSITY_APPROVED',
    entityType: 'University',
    entityId: university._id.toString(),
    details: { name: university.name, registrationNumber: university.registrationNumber }
  });

  return res.json({
    success: true,
    message: `Institution "${university.name}" approved successfully. It can now access the institutional dashboard and issue credentials.`,
    data: { university }
  });
});

// @desc    Reject a university application
// @route   POST /api/admin/universities/:id/reject
// @access  Admin
const rejectUniversity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const university = await University.findById(id);
  if (!university) {
    return res.status(404).json({ success: false, message: 'University not found.' });
  }

  university.status = 'rejected';
  university.rejectionReason = reason || 'Documentation could not be verified by platform administrators.';
  await university.save();

  await AuditLog.create({
    actorId: req.user?.id || 'admin',
    actorRole: 'admin',
    actorName: 'Platform Administrator',
    action: 'UNIVERSITY_REJECTED',
    entityType: 'University',
    entityId: university._id.toString(),
    details: { name: university.name, reason }
  });

  return res.json({
    success: true,
    message: `Institution "${university.name}" registration rejected.`,
    data: { university }
  });
});

// @desc    Suspend an approved university
// @route   POST /api/admin/universities/:id/suspend
// @access  Admin
const suspendUniversity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const university = await University.findById(id);
  if (!university) {
    return res.status(404).json({ success: false, message: 'University not found.' });
  }

  university.status = 'suspended';
  university.suspensionReason = reason || 'Institutional accreditation or credentials reported for review.';
  await university.save();

  await AuditLog.create({
    actorId: req.user?.id || 'admin',
    actorRole: 'admin',
    actorName: 'Platform Administrator',
    action: 'UNIVERSITY_SUSPENDED',
    entityType: 'University',
    entityId: university._id.toString(),
    details: { name: university.name, reason }
  });

  return res.json({
    success: true,
    message: `Institution "${university.name}" has been suspended from issuing credentials.`,
    data: { university }
  });
});

// @desc    Reinstate a suspended university
// @route   POST /api/admin/universities/:id/reinstate
// @access  Admin
const reinstateUniversity = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const university = await University.findById(id);
  if (!university) {
    return res.status(404).json({ success: false, message: 'University not found.' });
  }

  university.status = 'approved';
  university.suspensionReason = undefined;
  await university.save();

  await AuditLog.create({
    actorId: req.user?.id || 'admin',
    actorRole: 'admin',
    actorName: 'Platform Administrator',
    action: 'UNIVERSITY_REINSTATED',
    entityType: 'University',
    entityId: university._id.toString(),
    details: { name: university.name }
  });

  return res.json({
    success: true,
    message: `Institution "${university.name}" reinstated.`,
    data: { university }
  });
});

// @desc    Get platform-wide academic oversight metrics and audit logs
// @route   GET /api/admin/academic-oversight
// @access  Admin
const getAcademicOversight = asyncHandler(async (req, res) => {
  const [
    totalUniversities,
    pendingUniversities,
    approvedUniversities,
    totalCredentials,
    revokedCredentials,
    auditLogs
  ] = await Promise.all([
    University.countDocuments(),
    University.countDocuments({ status: 'pending' }),
    University.countDocuments({ status: 'approved' }),
    AcademicCredential.countDocuments(),
    AcademicCredential.countDocuments({ status: 'revoked' }),
    AuditLog.find().sort({ timestamp: -1 }).limit(25)
  ]);

  return res.json({
    success: true,
    data: {
      stats: {
        totalUniversities,
        pendingUniversities,
        approvedUniversities,
        totalCredentials,
        revokedCredentials
      },
      auditLogs
    }
  });
});

module.exports = {
  listUniversities,
  approveUniversity,
  rejectUniversity,
  suspendUniversity,
  reinstateUniversity,
  getAcademicOversight
};
