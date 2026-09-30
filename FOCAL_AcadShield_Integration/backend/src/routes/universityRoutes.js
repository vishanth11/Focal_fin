const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { verifyUniversity, requireApprovedUniversity } = require('../middleware/universityAuth');
const {
  registerUniversity,
  loginUniversity,
  getUniversityProfile,
  getUniversityDashboard,
  addStudent,
  bulkImportStudents,
  getStudents,
  extractDocumentData,
  issueCredential,
  getCredentials,
  revokeCredential,
  supersedeCredential
} = require('../controllers/universityController');

const router = express.Router();

const universityAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts — please try again later.' }
});

const registerValidation = [
  body('name').trim().notEmpty().withMessage('University/Institution name is required'),
  body('email').isEmail().withMessage('Valid institutional email is required'),
  body('registrationNumber').trim().notEmpty().withMessage('Official registration or recognition ID is required'),
  body('website').trim().notEmpty().withMessage('Official website URL is required'),
  body('walletAddress').trim().notEmpty().withMessage('Institutional blockchain wallet address is required'),
  body('representativeName').trim().notEmpty().withMessage('Authorized representative name is required'),
  body('representativeEmail').isEmail().withMessage('Authorized representative email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Public Auth routes
router.post('/register', universityAuthLimiter, registerValidation, validate, registerUniversity);
router.post('/login', universityAuthLimiter, loginValidation, validate, loginUniversity);

// Authenticated institutional routes
router.get('/me', verifyUniversity, getUniversityProfile);
router.get('/dashboard', verifyUniversity, getUniversityDashboard);

// Student management routes (Approved institutions only)
router.post('/students', verifyUniversity, requireApprovedUniversity, addStudent);
router.post('/students/bulk-import', verifyUniversity, requireApprovedUniversity, bulkImportStudents);
router.get('/students', verifyUniversity, getStudents);

// Academic Document AI extraction assistant (Approved institutions only)
router.post('/extract-document', verifyUniversity, requireApprovedUniversity, extractDocumentData);

// Academic Credential issuance and lifecycle (Approved institutions only)
router.post('/credentials/issue', verifyUniversity, requireApprovedUniversity, issueCredential);
router.get('/credentials', verifyUniversity, getCredentials);
router.post('/credentials/:credentialId/revoke', verifyUniversity, requireApprovedUniversity, revokeCredential);
router.post('/credentials/:credentialId/supersede', verifyUniversity, requireApprovedUniversity, supersedeCredential);

module.exports = router;
