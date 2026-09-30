const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  checkCompanyByDomain,
  checkCompanyByWallet,
  deleteCompany,
  getCompany,
  getCompanyByWallet,
  listCompanies,
  mintBadgeForCompany,
  registerCompany,
  verifyCompanyGST,
  updateCompany
} = require('../controllers/companyController');

const router = express.Router();
const adminOnly = [verifyToken, isAdmin];

const companyValidation = [
  body('name').notEmpty().withMessage('Company name is required'),
  body('email').isEmail().withMessage('Valid company email is required'),
  body('website').isURL({ require_protocol: true }).withMessage('Valid website URL is required'),
  body('walletAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid wallet address is required'),
  body('gstin').optional().isLength({ min: 15, max: 15 }).withMessage('GSTIN must be 15 characters')
];

// Throttle the public registration endpoint — unthrottled, it would let an
// unauthenticated client flood the pending-review queue with generated
// domain/wallet pairs.
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many registration attempts — please try again later.' }
});

// Create company (both / and /register)
router.post('/register', registerLimiter, companyValidation, validate, registerCompany);
router.post('/', registerLimiter, companyValidation, validate, registerCompany);

// Wallet-signed badge mint — the controller enforces the AUTHORITATIVE gate
// (status === 'verified', signature from the registered wallet, idempotency);
// the limiter just keeps the public endpoint from being hammered.
const mintLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many mint attempts — please try again later.' }
});
router.post(
  '/:id/mint-badge',
  mintLimiter,
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    body('signature').notEmpty().withMessage('Wallet signature is required'),
    body('message').notEmpty().withMessage('Signature message is required'),
    body('walletAddress').matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid wallet address is required')
  ],
  validate,
  mintBadgeForCompany
);

// Read companies list & search
router.get('/', listCompanies);

// Verification queries
router.get('/check', [query('domain').notEmpty().withMessage('domain is required')], validate, checkCompanyByDomain);
router.get('/by-wallet/:walletAddress', [param('walletAddress').matches(/^0x[a-fA-F0-9]{40}$/)], validate, getCompanyByWallet);
router.get('/status/:walletAddress', [param('walletAddress').matches(/^0x[a-fA-F0-9]{40}$/)], validate, checkCompanyByWallet);

// Read single company
router.get('/:id', [param('id').isMongoId().withMessage('Valid company ID is required')], validate, getCompany);

router.post(
  '/:id/gst-verify',
  adminOnly,
  [param('id').isMongoId(), body('gstin').isLength({ min: 15, max: 15 }), body('companyState').optional().isString()],
  validate,
  verifyCompanyGST
);

// Update company
router.patch(
  '/:id',
  adminOnly,
  [
    param('id').isMongoId().withMessage('Valid company ID is required'),
    body('email').optional().isEmail().withMessage('Valid company email is required'),
    body('website').optional().isURL({ require_protocol: true }).withMessage('Valid website URL is required'),
    body('walletAddress').optional().matches(/^0x[a-fA-F0-9]{40}$/).withMessage('Valid wallet address is required'),
    body('status').optional().isIn(['pending', 'verified', 'rejected', 'revoked']).withMessage('Status must be pending, verified, rejected, or revoked')
  ],
  validate,
  updateCompany
);

router.put(
  '/:id',
  adminOnly,
  [param('id').isMongoId().withMessage('Valid company ID is required')],
  validate,
  updateCompany
);

// Delete company
router.delete(
  '/:id',
  adminOnly,
  [param('id').isMongoId().withMessage('Valid company ID is required')],
  validate,
  deleteCompany
);

module.exports = router;
