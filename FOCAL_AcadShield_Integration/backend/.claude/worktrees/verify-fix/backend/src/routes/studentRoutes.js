const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { verifyStudent } = require('../middleware/studentAuth');
const {
  getStudentProfile,
  loginStudent,
  registerStudent
} = require('../controllers/studentController');

const router = express.Router();

// Declared inline to match authLimiter in adminRoutes.js — there is no shared
// rate-limit module in this codebase. Its own instance means student login
// attempts cannot exhaust the admin brute-force budget, and vice versa.
const studentAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts — please try again later.' }
});

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

router.post('/register', studentAuthLimiter, registerValidation, validate, registerStudent);
router.post('/login', studentAuthLimiter, loginValidation, validate, loginStudent);

// The only route in the whole application behind student auth. Every existing
// public route is deliberately left ungated.
router.get('/me', verifyStudent, getStudentProfile);

// Exported for the validation tests; Express ignores extra properties when the
// router is mounted.
module.exports = router;
module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;
