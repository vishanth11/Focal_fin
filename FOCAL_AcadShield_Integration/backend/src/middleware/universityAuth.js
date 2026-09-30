const jwt = require('jsonwebtoken');
const env = require('../config/env');
const University = require('../models/University');

async function verifyUniversity(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Institutional authentication token required' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (payload.role !== 'university') {
      return res.status(403).json({ success: false, message: 'University institutional access required' });
    }

    const university = await University.findById(payload.id);
    if (!university) {
      return res.status(401).json({ success: false, message: 'Invalid token: institution not found' });
    }

    req.university = university;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired institutional token' });
  }
}

function requireApprovedUniversity(req, res, next) {
  if (!req.university) {
    return res.status(401).json({ success: false, message: 'Institution authentication required' });
  }

  if (req.university.status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: `Institution status is ${req.university.status.toUpperCase()}. Only approved institutions can manage students or issue credentials.`,
      status: req.university.status
    });
  }

  return next();
}

module.exports = {
  verifyUniversity,
  requireApprovedUniversity
};
