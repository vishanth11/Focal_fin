const express = require('express');
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  approveCompany,
  getStats,
  listAdminCompanies,
  listReports,
  login,
  mintCompanyBadgeAdmin,
  rejectCompany,
  reviewReport,
  revokeCompany
} = require('../controllers/adminController');

const router = express.Router();
const adminOnly = [verifyToken, isAdmin];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts — please try again later.' }
});

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail(), body('password').notEmpty()],
  validate,
  login
);

router.get('/companies', adminOnly, listAdminCompanies);
router.post('/companies/:id/approve', adminOnly, [param('id').isMongoId()], validate, approveCompany);
// Badge mint for an already-VERIFIED company (retry after a failed mint).
// The controller enforces status === 'verified' and idempotency.
router.post('/companies/:id/mint-badge', adminOnly, [param('id').isMongoId()], validate, mintCompanyBadgeAdmin);
router.post('/companies/:id/reject', adminOnly, [param('id').isMongoId(), body('reason').optional().isString()], validate, rejectCompany);
router.post('/companies/:id/revoke', adminOnly, [param('id').isMongoId(), body('reason').optional().isString()], validate, revokeCompany);
router.get('/reports', adminOnly, listReports);
router.post(
  '/reports/:id/review',
  adminOnly,
  [
    param('id').isMongoId(),
    body('status').isIn(['reviewed', 'accepted', 'rejected']),
    body('reviewNote').optional().isString()
  ],
  validate,
  reviewReport
);
router.get('/stats', adminOnly, getStats);

module.exports = router;
