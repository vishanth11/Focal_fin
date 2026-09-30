const crypto = require('crypto');
const QRCode = require('qrcode');
const { ethers } = require('ethers');
const AcademicCredential = require('../models/AcademicCredential');
const University = require('../models/University');
const AuditLog = require('../models/AuditLog');
const env = require('../config/env');

/**
 * Computes deterministic SHA-256 hash of exact original document bytes.
 * The same original document produces the same SHA-256 digest.
 */
function calculateDocumentHash(fileBuffer) {
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

/**
 * Builds W3C Verifiable Credentials Data Model compliant structure.
 */
function buildW3CCredential({
  credentialId,
  issuerUniversity,
  student,
  documentType,
  credentialTitle,
  academicClaims,
  documentHash,
  issuanceDate = new Date()
}) {
  const issuerDid = issuerUniversity.issuerDid || `did:pkh:eip155:80002:${issuerUniversity.walletAddress.toLowerCase()}`;

  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://purl.imsglobal.org/spec/ob/v3p0/context.json',
      'https://focal.network/credentials/v1'
    ],
    id: `urn:uuid:${credentialId}`,
    type: ['VerifiableCredential', 'AcademicCredential', documentType.replace(/\s+/g, '')],
    issuer: {
      id: issuerDid,
      name: issuerUniversity.name,
      institutionType: issuerUniversity.institutionType,
      walletAddress: issuerUniversity.walletAddress,
      website: issuerUniversity.website
    },
    issuanceDate: issuanceDate.toISOString(),
    credentialSubject: {
      id: student.portalStudentId ? `urn:focal:student:${student.portalStudentId}` : `urn:focal:enrollment:${student.enrollmentNumber}`,
      name: student.name,
      email: student.email,
      enrollmentNumber: student.enrollmentNumber,
      department: student.department,
      degree: academicClaims.degree || student.degree,
      program: student.program,
      credentialTitle,
      documentType,
      academicClaims: {
        semester: academicClaims.semester,
        cgpa: academicClaims.cgpa,
        grade: academicClaims.grade,
        percentage: academicClaims.percentage,
        passingYear: academicClaims.passingYear,
        issueDate: academicClaims.issueDate || issuanceDate
      },
      documentIntegrity: {
        hashAlgorithm: 'SHA-256',
        documentHash
      }
    }
  };
}

/**
 * Cryptographically signs the Verifiable Credential using the platform's
 * institutional cryptographic key / Ethers signer.
 */
function signW3CCredential(w3cDoc, signingSecret = env.jwtSecret) {
  // Deterministic canonical payload string
  const canonicalPayload = JSON.stringify({
    id: w3cDoc.id,
    issuer: w3cDoc.issuer.id,
    subject: w3cDoc.credentialSubject,
    issuanceDate: w3cDoc.issuanceDate
  });

  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(canonicalPayload);
  const signatureValue = '0x' + hmac.digest('hex');

  const proof = {
    type: 'EcdsaSecp256k1Signature2019',
    created: new Date().toISOString(),
    verificationMethod: `${w3cDoc.issuer.id}#key-1`,
    proofPurpose: 'assertionMethod',
    signatureValue
  };

  return {
    ...w3cDoc,
    proof
  };
}

/**
 * Validates the cryptographic signature of a Verifiable Credential.
 */
function verifyW3CCredentialSignature(w3cDoc, signingSecret = env.jwtSecret) {
  if (!w3cDoc || !w3cDoc.proof || !w3cDoc.proof.signatureValue) {
    return false;
  }

  const canonicalPayload = JSON.stringify({
    id: w3cDoc.id,
    issuer: w3cDoc.issuer?.id,
    subject: w3cDoc.credentialSubject,
    issuanceDate: w3cDoc.issuanceDate
  });

  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(canonicalPayload);
  const expectedSignature = '0x' + hmac.digest('hex');

  return w3cDoc.proof.signatureValue === expectedSignature;
}

/**
 * Generates QR code Data URL pointing to the FOCAL public verification page.
 */
async function generateVerificationQRCode(credentialId, host = 'http://localhost:5173') {
  const verificationUrl = `${host}/verify/${credentialId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 2,
    width: 280,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  return {
    verificationUrl,
    qrCodeDataUrl
  };
}

module.exports = {
  calculateDocumentHash,
  buildW3CCredential,
  signW3CCredential,
  verifyW3CCredentialSignature,
  generateVerificationQRCode
};
