const jwt = require('jsonwebtoken');
const env = require('../config/env');
const Student = require('../models/Student');

// Verifies a student token and loads the account onto req.student.
//
// NOT part of src/middleware/auth.js on purpose — that module holds
// verifyToken/isAdmin and is the admin authorization model, which this feature
// does not modify. The two guards are independent: verifyToken checks
// env.jwtSecret, this one checks env.studentJwtSecret.
//
// req.student (not req.user) because verifyToken already claims req.user.
async function verifyStudent(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token required' });
  }

  try {
    const payload = jwt.verify(token, env.studentJwtSecret);

    // Defence in depth: if the two secrets were ever configured to the same
    // value, an admin token would still fail here on the role check.
    if (payload.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Student access required' });
    }

    // Re-read the account so a deleted student cannot keep using a live token.
    // A malformed id throws a CastError, which the catch below turns into 401.
    const student = await Student.findById(payload.id);
    if (!student) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    req.student = student;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

module.exports = { verifyStudent };
