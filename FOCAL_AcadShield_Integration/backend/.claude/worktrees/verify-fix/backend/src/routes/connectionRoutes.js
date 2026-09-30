const express = require('express');
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const { verifyToken, isAdmin } = require('../middleware/auth');
const {
  createConnection,
  deleteConnection,
  getConnection,
  listConnections,
  updateConnection
} = require('../controllers/connectionController');

const router = express.Router();
const adminOnly = [verifyToken, isAdmin];

// Create a connection request (Public)
router.post(
  '/',
  [
    body('companyName').if(body('companyId').not().exists()).notEmpty().withMessage('companyName is required when companyId is absent'),
    body('companyId').optional().isMongoId().withMessage('Valid company ID is required'),
    body('companyDomain').optional().isString(),
    body('requesterName').optional().isString(),
    body('requesterDomain').optional().isString(),
    body('studentName').optional().isString(),
    body('studentEmail').optional({ checkFalsy: true }).isEmail().withMessage('Valid student email is required'),
    body('message').optional().isString()
  ],
  validate,
  createConnection
);

// List connections (Public — trusted-connection directory)
router.get('/', listConnections);

// Read single connection (Public)
router.get(
  '/:id',
  [param('id').isMongoId().withMessage('Valid connection ID is required')],
  validate,
  getConnection
);

// Update connection status (Admin only)
const connectionUpdateValidation = [
  param('id').isMongoId().withMessage('Valid connection ID is required'),
  body('status').optional().isIn(['pending', 'accepted', 'rejected']).withMessage('Status must be pending, accepted, or rejected'),
  body('message').optional().isString()
];

router.patch('/:id', adminOnly, connectionUpdateValidation, validate, updateConnection);
router.put('/:id', adminOnly, connectionUpdateValidation, validate, updateConnection);

// Delete a connection (Admin only)
router.delete(
  '/:id',
  adminOnly,
  [param('id').isMongoId().withMessage('Valid connection ID is required')],
  validate,
  deleteConnection
);

module.exports = router;