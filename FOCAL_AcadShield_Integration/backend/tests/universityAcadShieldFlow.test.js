process.env.JWT_SECRET = 'test-secret-focal-acadshield';
process.env.CONTRACT_ADDRESS = '0x9124A20aE4a715Fcee6056bf1F5f95E4358647C6';

const crypto = require('crypto');
const {
  calculateDocumentHash,
  buildW3CCredential,
  signW3CCredential,
  verifyW3CCredentialSignature,
  generateVerificationQRCode
} = require('../src/services/academicCredentialService');
const { simulateExtraction } = require('../src/services/academicExtractionService');
const { requireApprovedUniversity } = require('../src/middleware/universityAuth');
const { generateUniversityToken } = require('../src/utils/universityToken');

describe('FOCAL AcadShield Integration — Comprehensive Unit & Lifecycle Test Suite', () => {

  describe('1. SHA-256 Document Integrity Fingerprinting', () => {
    test('Calculates exact deterministic SHA-256 hash from file bytes', () => {
      const docBuffer1 = Buffer.from('OFFICIAL_DEGREE_CERTIFICATE_ANNA_UNIVERSITY_2026');
      const docBuffer2 = Buffer.from('OFFICIAL_DEGREE_CERTIFICATE_ANNA_UNIVERSITY_2026');
      const forgedBuffer = Buffer.from('TAMPERED_DEGREE_CERTIFICATE_ANNA_UNIVERSITY_2026');

      const hash1 = calculateDocumentHash(docBuffer1);
      const hash2 = calculateDocumentHash(docBuffer2);
      const forgedHash = calculateDocumentHash(forgedBuffer);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash1).not.toBe(forgedHash);
    });
  });

  describe('2. W3C Verifiable Credential (VC) Generation & Signing', () => {
    const mockUniversity = {
      name: 'Anna University',
      institutionType: 'State University',
      walletAddress: '0x1aF0616B41F82848045Ae3586C78D3d83702451e',
      website: 'https://annauniv.edu'
    };

    const mockStudent = {
      name: 'Rahul Sharma',
      email: 'rahul.s@annauniv.edu',
      enrollmentNumber: 'AU2026CS101',
      department: 'Computer Science & Engineering',
      degree: 'Bachelor of Technology'
    };

    test('Constructs standard W3C Verifiable Credential structure with academic claims', () => {
      const docHash = calculateDocumentHash(Buffer.from('CERTIFICATE_PAYLOAD'));
      const vc = buildW3CCredential({
        credentialId: 'focal-vc-test-123',
        issuerUniversity: mockUniversity,
        student: mockStudent,
        documentType: 'Degree Certificate',
        credentialTitle: 'Bachelor of Technology in Computer Science',
        academicClaims: { cgpa: '9.25', passingYear: 2026 },
        documentHash: docHash
      });

      expect(vc['@context']).toContain('https://www.w3.org/2018/credentials/v1');
      expect(vc.type).toContain('VerifiableCredential');
      expect(vc.issuer.name).toBe('Anna University');
      expect(vc.credentialSubject.enrollmentNumber).toBe('AU2026CS101');
      expect(vc.credentialSubject.documentIntegrity.documentHash).toBe(docHash);
    });

    test('Cryptographically signs VC and validates signature', () => {
      const docHash = calculateDocumentHash(Buffer.from('CERTIFICATE_PAYLOAD'));
      const unsignedVC = buildW3CCredential({
        credentialId: 'focal-vc-test-123',
        issuerUniversity: mockUniversity,
        student: mockStudent,
        documentType: 'Degree Certificate',
        credentialTitle: 'Bachelor of Technology in Computer Science',
        academicClaims: { cgpa: '9.25', passingYear: 2026 },
        documentHash: docHash
      });

      const signedVC = signW3CCredential(unsignedVC, process.env.JWT_SECRET);
      expect(signedVC.proof).toBeDefined();
      expect(signedVC.proof.signatureValue).toMatch(/^0x[a-f0-9]{64}$/);

      // Authentic signature must pass
      const isValid = verifyW3CCredentialSignature(signedVC, process.env.JWT_SECRET);
      expect(isValid).toBe(true);

      // Tampered credential subject must fail signature verification
      const tamperedVC = { ...signedVC, credentialSubject: { ...signedVC.credentialSubject, name: 'Hacker' } };
      const isTamperedValid = verifyW3CCredentialSignature(tamperedVC, process.env.JWT_SECRET);
      expect(isTamperedValid).toBe(false);
    });
  });

  describe('3. QR Code Generation for Public Verification', () => {
    test('Generates QR code pointing to public verification endpoint', async () => {
      const { verificationUrl, qrCodeDataUrl } = await generateVerificationQRCode('focal-vc-xyz', 'https://focal.network');

      expect(verificationUrl).toBe('https://focal.network/verify/focal-vc-xyz');
      expect(qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('4. AI/OCR Document Assistant & Inconsistency Detection', () => {
    test('Simulates OCR extraction and flags inconsistencies with student profile', () => {
      const docBuffer = Buffer.from('Degree: Bachelor of Technology\nStudent: Rahul Sharma\nEnrollment: AU2026CS101\nCGPA: 9.15');
      const studentProfile = {
        name: 'Rahul Sharma',
        enrollmentNumber: 'AU2026CS101',
        department: 'Computer Science',
        degree: 'Bachelor of Technology'
      };

      const result = simulateExtraction(docBuffer, 'application/pdf', 'Rahul_Degree.pdf', studentProfile);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(80);
      expect(result.extractedData.detectedStudentName).toBe('Rahul Sharma');
      expect(result.inconsistencies.length).toBe(0);
      expect(result.requiresManualReview).toBe(false);
    });

    test('Flags document for manual review when student profile mismatch detected', () => {
      const docBuffer = Buffer.from('Student: Vikram Singh\nEnrollment: OTHER999');
      const studentProfile = {
        name: 'Rahul Sharma',
        enrollmentNumber: 'AU2026CS101'
      };

      const result = simulateExtraction(docBuffer, 'application/pdf', 'doc.pdf', studentProfile);
      expect(result.inconsistencies.length).toBeGreaterThan(0);
      expect(result.requiresManualReview).toBe(true);
    });
  });

  describe('5. Institutional Approval & Permission Guarding', () => {
    test('Blocks unapproved university from issuing credentials (requireApprovedUniversity)', () => {
      const reqPending = {
        university: { status: 'pending', name: 'Pending College' }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      };
      const next = jest.fn();

      requireApprovedUniversity(reqPending, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
      expect(next).not.toHaveBeenCalled();
    });

    test('Allows approved university through institutional guard', () => {
      const reqApproved = {
        university: { status: 'approved', name: 'Approved University' }
      };
      const res = {};
      const next = jest.fn();

      requireApprovedUniversity(reqApproved, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('6. University Token Generation & Claims', () => {
    test('Issues valid JWT token with institutional claims', () => {
      const token = generateUniversityToken('uni-12345', 'approved');
      expect(token).toBeDefined();

      const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe('uni-12345');
      expect(decoded.role).toBe('university');
      expect(decoded.status).toBe('approved');
    });
  });
});
