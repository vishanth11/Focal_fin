const express = require('express');
const {
  verifyCredentialById,
  verifyDocumentHash,
  verifySharedCredentialByToken
} = require('../controllers/credentialVerificationController');

const router = express.Router();

// Public & Company verification endpoints
router.get('/verify/:credentialId', verifyCredentialById);
router.post('/verify-document', verifyDocumentHash);
router.get('/shared/:shareToken', verifySharedCredentialByToken);

module.exports = router;
