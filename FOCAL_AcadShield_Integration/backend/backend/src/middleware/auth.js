const jwt = require('jsonwebtoken');
const env = require('../config/env');

function generateToken(adminId) {
  return jwt.sign({ id: adminId, role: 'admin' }, env.jwtSecret, {
    expiresIn: env.jwtExpire
  });
}

function verifyToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required' });
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

function isAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  return next();
}

module.exports = {
  generateToken,
  verifyToken,
  isAdmin
};
