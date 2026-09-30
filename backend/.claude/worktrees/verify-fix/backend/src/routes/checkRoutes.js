const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  checkOpportunity,
  deleteCheck,
  getCheckById,
  getHistory,
  updateCheck
} = require('../controllers/checkController');

const router = express.Router();
const adminOnly = [verifyToken, isAdmin];

// Create opportunity check (Public - stores input & scam analysis in MongoDB)
router.post(
  '/',
  [body('input').trim().isLength({ min: 2 }).withMessage('Input must be at least 2 characters')],
  validate,
  checkOpportunity
);

// Read check history (both / and /history)
router.get('/', getHistory);
router.get('/history', getHistory);

// Read single check by ID
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid check ID is required')],
  validate,
  getCheckById
);

// Update a check record (Admin only)
router.patch(
  '/:id',
  adminOnly,
  [
    param('id').isMongoId().withMessage('Valid check ID is required'),
    body('riskScore').optional().isInt({ min: 0, max: 100 }).withMessage('Risk score must be between 0 and 100'),
    body('result').optional().isIn(['verified', 'suspicious', 'revoked', 'not_found']).withMessage('Invalid result value')
  ],
  validate,
  updateCheck
);

router.put(
  '/:id',
  adminOnly,
  [param('id').isMongoId().withMessage('Valid check ID is required')],
  validate,
  updateCheck
);

// Delete a check record (Admin only)
router.delete(
  '/:id',
  adminOnly,
  [param('id').isMongoId().withMessage('Valid check ID is required')],
  validate,
  deleteCheck
);

module.exports = router;
