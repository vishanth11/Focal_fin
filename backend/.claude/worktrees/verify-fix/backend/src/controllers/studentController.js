const bcrypt = require('bcryptjs');
const Student = require('../models/Student');
const { generateStudentToken } = require('../utils/studentToken');
const { asyncHandler } = require('../utils/helpers');

// Student credentials are ALWAYS hashed. Unlike the admin path — which may
// compare against a plaintext ADMIN_PASSWORD — there is no plaintext fallback
// here, because a student password is user-supplied and stored in the database.
const BCRYPT_ROUNDS = 10;

// The only shape a student document is ever exposed in.
function publicStudent(student) {
  return {
    id: student._id,
    name: student.name,
    email: student.email,
    createdAt: student.createdAt
  };
}

const registerStudent = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();

  // Checked explicitly rather than relying on the unique index: errorHandler
  // rewrites the message for Mongo's duplicate-key error but never remaps the
  // status, so a raw collision would surface as a 500.
  const existing = await Student.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists'
    });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const student = await Student.create({ name, email: normalizedEmail, password: passwordHash });

  // Intentionally no token here — issuing tokens for a session belongs to
  // loginStudent alone, so there is exactly one code path that mints one.
  return res.status(201).json({
    success: true,
    message: 'Student account created',
    data: { student: publicStudent(student) }
  });
});

const loginStudent = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email).trim().toLowerCase();

  // `password` is select:false on the schema, so it must be requested explicitly.
  const student = await Student.findOne({ email: normalizedEmail }).select('+password');
  const passwordMatches = student ? await bcrypt.compare(password, student.password) : false;

  if (!student || !passwordMatches) {
    // One message for both "unknown email" and "wrong password". Distinct
    // messages would let an attacker enumerate registered students.
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  return res.json({
    success: true,
    data: {
      token: generateStudentToken(student._id.toString()),
      student: publicStudent(student)
    }
  });
});

const getStudentProfile = asyncHandler(async (req, res) => {
  return res.json({ success: true, data: { student: publicStudent(req.student) } });
});

module.exports = {
  BCRYPT_ROUNDS,
  getStudentProfile,
  loginStudent,
  registerStudent
};
