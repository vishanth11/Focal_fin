const crypto = require('crypto');
const AcademicCredential = require('../models/AcademicCredential');
const University = require('../models/University');
const CredentialShare = require('../models/CredentialShare');
const AuditLog = require('../models/AuditLog');
const { calculateDocumentHash, verifyW3CCredentialSignature } = require('../services/academicCredentialService');
const { asyncHandler } = require('../utils/helpers');

// @desc    Verify a credential by credentialId (Public & Company Verifier)
// @route   GET /api/credentials/verify/:credentialId
// @access  Public
const verifyCredentialById = asyncHandler(async (req, res) => {
  const { credentialId } = req.params;
  const trimmed = (credentialId || '').trim();

  const searchQueries = [
    { credentialId: trimmed },
    { credentialId: { $regex: new RegExp(`^${trimmed}$`, 'i') } },
    { documentHash: trimmed.toLowerCase() },
    { 'w3cCredential.id': trimmed }
  ];

  if (trimmed.startsWith('did:') || trimmed.startsWith('0x')) {
    searchQueries.push({ 'w3cCredential.issuer.id': trimmed });
    searchQueries.push({ 'blockchain.txHash': trimmed.toLowerCase() });
  }

  let credential = await AcademicCredential.findOne({ $or: searchQueries })
    .sort({ createdAt: -1 })
    .populate('universityId', 'name institutionType status website walletAddress issuerDid');

  // If queried by an institution's DID or wallet address, fetch their most recent credential
  if (!credential && (trimmed.startsWith('did:') || trimmed.startsWith('0x'))) {
    const uni = await University.findOne({
      $or: [
        { issuerDid: trimmed },
        { walletAddress: trimmed.toLowerCase() }
      ]
    });
    if (uni) {
      credential = await AcademicCredential.findOne({ universityId: uni._id })
        .sort({ createdAt: -1 })
        .populate('universityId', 'name institutionType status website walletAddress issuerDid');
    }
  }

  if (!credential) {
    return res.status(404).json({
      success: false,
      message: 'Academic credential not found.',
      verification: {
        issuerTrusted: 'UNKNOWN',
        signatureValid: false,
        documentHashMatches: 'NOT PROVIDED',
        blockchainConfirmed: 'NO',
        status: 'UNKNOWN'
      }
    });
  }

  // 1. Check University Issuer Status
  const university = credential.universityId;
  const isIssuerTrusted = university && university.status === 'approved';

  // 2. Check Cryptographic Signature
  const isSignatureValid = verifyW3CCredentialSignature(credential.w3cCredential);

  // 3. Check Blockchain Confirmation
  const blockchainConfirmed = credential.blockchain?.status === 'confirmed' ? 'YES' : (credential.blockchain?.status === 'simulated' ? 'SIMULATED' : 'PENDING');

  // Record verification query in AuditLog
  await AuditLog.create({
    actorId: 'anonymous',
    actorRole: 'company',
    action: 'CREDENTIAL_VERIFIED',
    entityType: 'AcademicCredential',
    entityId: credentialId,
    ipAddress: req.ip,
    details: { status: credential.status, isIssuerTrusted, isSignatureValid }
  });

  return res.json({
    success: true,
    data: {
      credentialId: credential.credentialId,
      credentialTitle: credential.credentialTitle,
      documentType: credential.documentType,
      studentName: credential.studentName,
      enrollmentNumber: credential.enrollmentNumber,
      academicClaims: credential.academicClaims,
      status: credential.status.toUpperCase(),
      issuanceDate: credential.createdAt,
      documentHash: credential.documentHash,
      issuer: {
        name: university?.name,
        type: university?.institutionType,
        issuerDid: credential.issuerDid,
        walletAddress: university?.walletAddress,
        isTrusted: isIssuerTrusted
      },
      revocation: credential.status === 'revoked' ? credential.revocation : null,
      supersession: credential.status === 'superseded' ? credential.supersession : null,
      blockchain: credential.blockchain,
      qrCodeDataUrl: credential.qrCodeDataUrl,
      verificationResult: {
        issuerTrusted: isIssuerTrusted ? 'YES' : 'NO',
        signatureValid: isSignatureValid ? 'YES' : 'NO',
        documentHashMatches: 'NOT PROVIDED',
        blockchainConfirmed,
        status: credential.status.toUpperCase(),
        verifiedAt: new Date().toISOString()
      }
    }
  });
});

// @desc    Verify original document file integrity via SHA-256
// @route   POST /api/credentials/verify-document
// @access  Public
const verifyDocumentHash = asyncHandler(async (req, res) => {
  const { credentialId, fileBase64, providedHash, fileName } = req.body;

  let computedHash = providedHash;
  if (fileBase64) {
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    computedHash = calculateDocumentHash(fileBuffer);
  }

  if (!computedHash) {
    return res.status(400).json({ success: false, message: 'Document file or SHA-256 digest is required for integrity verification.' });
  }

  const query = credentialId ? { credentialId } : { documentHash: computedHash };
  const credential = await AcademicCredential.findOne(query).populate('universityId', 'name institutionType status website walletAddress issuerDid');

  if (!credential) {
    return res.json({
      success: true,
      data: {
        hashMatches: false,
        computedHash,
        message: 'No registered academic credential matches the submitted document fingerprint.',
        verificationResult: {
          issuerTrusted: 'UNKNOWN',
          signatureValid: 'NO',
          documentHashMatches: 'NO',
          blockchainConfirmed: 'NO',
          status: 'NOT_REGISTERED'
        }
      }
    });
  }

  const hashMatches = credential.documentHash.toLowerCase() === computedHash.toLowerCase();
  const isSignatureValid = verifyW3CCredentialSignature(credential.w3cCredential);
  const isIssuerTrusted = credential.universityId?.status === 'approved';

  return res.json({
    success: true,
    data: {
      credentialId: credential.credentialId,
      documentType: credential.documentType,
      studentName: credential.studentName,
      hashMatches,
      computedHash,
      storedReferenceHash: credential.documentHash,
      credentialStatus: credential.status.toUpperCase(),
      issuer: {
        name: credential.universityId?.name,
        isTrusted: isIssuerTrusted
      },
      verificationResult: {
        issuerTrusted: isIssuerTrusted ? 'YES' : 'NO',
        signatureValid: isSignatureValid ? 'YES' : 'NO',
        documentHashMatches: hashMatches ? 'YES' : 'NO',
        blockchainConfirmed: credential.blockchain?.status === 'confirmed' ? 'YES' : (credential.blockchain?.status === 'simulated' ? 'SIMULATED' : 'PENDING'),
        status: credential.status.toUpperCase(),
        verifiedAt: new Date().toISOString()
      }
    }
  });
});

// @desc    Get credentials for the logged-in student
// @route   GET /api/students/credentials
// @access  Student
const getStudentCredentials = asyncHandler(async (req, res) => {
  const studentEmail = req.student.email;

  const credentials = await AcademicCredential.find({ studentEmail })
    .populate('universityId', 'name institutionType website walletAddress status')
    .sort({ createdAt: -1 });

  return res.json({
    success: true,
    data: {
      count: credentials.length,
      credentials
    }
  });
});

// @desc    Share a credential with a company/employer
// @route   POST /api/students/credentials/:credentialId/share
// @access  Student
const shareCredentialWithCompany = asyncHandler(async (req, res) => {
  const studentEmail = req.student.email;
  const { credentialId } = req.params;
  const { companyDomain, companyName, notes, expiresInDays = 30 } = req.body;

  const credential = await AcademicCredential.findOne({ credentialId, studentEmail });
  if (!credential) {
    return res.status(404).json({ success: false, message: 'Credential not found in your account.' });
  }

  const shareToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + Number(expiresInDays));

  const share = await CredentialShare.create({
    credentialId,
    academicCredentialObjectId: credential._id,
    studentEmail,
    companyDomain: companyDomain ? companyDomain.toLowerCase().trim() : undefined,
    companyName: companyName ? companyName.trim() : undefined,
    shareToken,
    expiresAt,
    status: 'active'
  });

  await AuditLog.create({
    actorId: req.student._id.toString(),
    actorRole: 'student',
    actorName: req.student.name,
    action: 'CREDENTIAL_SHARED',
    entityType: 'CredentialShare',
    entityId: share._id.toString(),
    details: { credentialId, companyDomain }
  });

  return res.status(201).json({
    success: true,
    message: 'Credential shared successfully. Company can now verify your credential.',
    data: { share }
  });
});

// @desc    Get student's shared credentials
// @route   GET /api/students/shares
// @access  Student
const getStudentShares = asyncHandler(async (req, res) => {
  const studentEmail = req.student.email;

  const shares = await CredentialShare.find({ studentEmail })
    .populate('academicCredentialObjectId', 'credentialTitle documentType status createdAt')
    .sort({ createdAt: -1 });

  return res.json({ success: true, data: { shares } });
});

// @desc    Revoke student credential share
// @route   DELETE /api/students/shares/:shareId
// @access  Student
const revokeStudentShare = asyncHandler(async (req, res) => {
  const studentEmail = req.student.email;
  const { shareId } = req.params;

  const share = await CredentialShare.findOne({ _id: shareId, studentEmail });
  if (!share) {
    return res.status(404).json({ success: false, message: 'Share permission not found.' });
  }

  share.status = 'revoked';
  await share.save();

  return res.json({ success: true, message: 'Access revoked. Employer can no longer view this credential.' });
});

// @desc    Company verifies a shared credential
// @route   GET /api/companies/shared-credentials/:shareToken
// @access  Public
const verifySharedCredentialByToken = asyncHandler(async (req, res) => {
  const { shareToken } = req.params;

  const share = await CredentialShare.findOne({ shareToken });
  if (!share || share.status !== 'active') {
    return res.status(403).json({ success: false, message: 'Share authorization is invalid, expired, or revoked by the student.' });
  }

  if (share.expiresAt && new Date() > share.expiresAt) {
    share.status = 'expired';
    await share.save();
    return res.status(403).json({ success: false, message: 'This credential share has expired.' });
  }

  // Increment access count & log access
  share.accessCount += 1;
  share.accessLog.push({ accessedAt: new Date(), ip: req.ip, action: 'VIEWED' });
  await share.save();

  const credential = await AcademicCredential.findOne({ credentialId: share.credentialId }).populate('universityId', 'name institutionType status website walletAddress issuerDid');

  return res.json({
    success: true,
    data: {
      share,
      credential
    }
  });
});

module.exports = {
  verifyCredentialById,
  verifyDocumentHash,
  getStudentCredentials,
  shareCredentialWithCompany,
  getStudentShares,
  revokeStudentShare,
  verifySharedCredentialByToken
};
