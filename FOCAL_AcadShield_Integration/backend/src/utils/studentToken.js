const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Student tokens expire independently of admin tokens so the two lifetimes
// can be tuned separately.
const STUDENT_TOKEN_EXPIRE = '7d';

// Student tokens are signed with their OWN secret, which is what makes the
// isolation from admin auth structural rather than conventional: admin
// middleware verifies against env.jwtSecret and so cannot validate a student
// token at all.
//
// This is intentionally a separate function in a separate file rather than a
// change to generateToken in src/middleware/auth.js — that module is the admin
// authorization model and is left untouched by this feature.
function generateStudentToken(studentId) {
  return jwt.sign({ id: studentId, role: 'student' }, env.studentJwtSecret, {
    expiresIn: STUDENT_TOKEN_EXPIRE
  });
}

module.exports = {
  generateStudentToken,
  STUDENT_TOKEN_EXPIRE
};
