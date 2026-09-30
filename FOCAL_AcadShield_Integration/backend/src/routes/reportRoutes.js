const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  deleteReport,
  getReport,
  getReportsForCompany,
  listReports,
  submitReport,
  updateReport
} = require('../controllers/reportController');

const router = express.Router();
const adminOnly = [verifyToken, isAdmin];

// Create a report (Public)
router.post(
  '/',
  [
    body('companyName')
      .if(body('companyId').not().exists())
      .notEmpty()
      .withMessage('companyName is required when companyId is absent'),
    body('companyId').optional().isMongoId().withMessage('Valid company ID is required'),
    body('reporterEmail').isEmail().withMessage('Valid reporter email is required'),
    body('description').isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
    body('evidenceUrl').optional({ checkFalsy: true }).isURL({ require_protocol: true }).withMessage('Valid evidence URL is required')
  ],
  validate,
  submitReport
);

// List all reports with filtering & pagination
router.get('/', listReports);

// Get reports for a specific company
router.get(
  '/company/:companyId',
  [param('companyId').isMongoId().withMessage('Valid company ID is required')],
  validate,
  getReportsForCompany
);

// Get single report by ID
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid report ID is required')],
  validate,
  getReport
);

// Update a report (Admin only)
router.patch(
  '/:id',
  adminOnly,
  [
    param('id').isMongoId().withMessage('Valid report ID is required'),
    body('status')
      .optional()
      .isIn(['pending', 'reviewed', 'accepted', 'rejected'])
      .withMessage('Status must be pending, reviewed, accepted, or rejected')
  ],
  validate,
  updateReport
);

router.put(
  '/:id',
  adminOnly,
  [param('id').isMongoId().withMessage('Valid report ID is required')],
  validate,
  updateReport
);

// Delete a report (Admin only)
router.delete(
  '/:id',
  adminOnly,
  [param('id').isMongoId().withMessage('Valid report ID is required')],
  validate,
  deleteReport
);

module.exports = router;
