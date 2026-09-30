const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('crypto');
const University = require('../models/University');
const AcademicStudent = require('../models/AcademicStudent');
const AcademicCredential = require('../models/AcademicCredential');
const AuditLog = require('../models/AuditLog');
const { generateUniversityToken } = require('../utils/universityToken');
const { simulateExtraction } = require('../services/academicExtractionService');
const {
  calculateDocumentHash,
  buildW3CCredential,
  signW3CCredential,
  generateVerificationQRCode
} = require('../services/academicCredentialService');
const {
  registerCredentialOnChain,
  revokeCredentialOnChain
} = require('../services/academicBlockchainService');
const { asyncHandler } = require('../utils/helpers');

const BCRYPT_ROUNDS = 10;

// @desc    Register a new University / Institution
// @route   POST /api/universities/register
// @access  Public
const registerUniversity = asyncHandler(async (req, res) => {
  const {
    name,
    institutionType,
    registrationNumber,
    email,
    password,
    website,
    address,
    country,
    state,
    city,
    representativeName,
    representativeEmail,
    representativeTitle,
    walletAddress,
    supportingDocuments
  } = req.body;

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRegNo = String(registrationNumber || '').trim().toUpperCase();

  const existingEmail = await University.findOne({ email: normalizedEmail });
  if (existingEmail) {
    return res.status(409).json({ success: false, message: 'An institution with this email is already registered.' });
  }

  const existingReg = await University.findOne({ registrationNumber: normalizedRegNo });
  if (existingReg) {
    return res.status(409).json({ success: false, message: 'An institution with this registration/recognition ID already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const normalizedWallet = String(walletAddress || '').trim().toLowerCase();
  const issuerDid = `did:pkh:eip155:80002:${normalizedWallet}`;

  const university = await University.create({
    name,
    institutionType,
    registrationNumber: normalizedRegNo,
    email: normalizedEmail,
    password: passwordHash,
    website,
    address,
    country: country || 'India',
    state,
    city,
    representativeName,
    representativeEmail: String(representativeEmail || '').trim().toLowerCase(),
    representativeTitle,
    walletAddress: normalizedWallet,
    issuerDid,
    supportingDocuments: supportingDocuments || [],
    status: 'pending' // Always starts pending administrator review
  });

  // Log registration event in AuditLog
  await AuditLog.create({
    actorId: university._id.toString(),
    actorRole: 'university',
    actorName: university.name,
    action: 'UNIVERSITY_REGISTER',
    entityType: 'University',
    entityId: university._id.toString(),
    details: { registrationNumber: normalizedRegNo, walletAddress: normalizedWallet }
  });

  return res.status(201).json({
    success: true,
    message: 'University registration submitted successfully. Your application is under administrator review.',
    data: {
      id: university._id,
      name: university.name,
      status: university.status,
      registrationNumber: university.registrationNumber,
      issuerDid: university.issuerDid
    }
  });
});

// @desc    University login
// @route   POST /api/universities/login
// @access  Public
const loginUniversity = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const university = await University.findOne({ email: normalizedEmail }).select('+password');
  const passwordMatches = university ? await bcrypt.compare(password, university.password) : false;

  if (!university || !passwordMatches) {
    return res.status(401).json({ success: false, message: 'Invalid institutional email or password.' });
  }

  const token = generateUniversityToken(university._id.toString(), university.status);

  return res.json({
    success: true,
    data: {
      token,
      university: {
        id: university._id,
        name: university.name,
        institutionType: university.institutionType,
        email: university.email,
        registrationNumber: university.registrationNumber,
        status: university.status,
        walletAddress: university.walletAddress,
        issuerDid: university.issuerDid,
        stats: university.stats
      }
    }
  });
});

// @desc    Get logged in university profile
// @route   GET /api/universities/me
// @access  University
const getUniversityProfile = asyncHandler(async (req, res) => {
  return res.json({ success: true, data: { university: req.university } });
});

// @desc    Get university dashboard metrics and activity
// @route   GET /api/universities/dashboard
// @access  University
const getUniversityDashboard = asyncHandler(async (req, res) => {
  const universityId = req.university._id;

  const [totalStudents, totalCredentials, activeCredentials, revokedCredentials, recentCredentials, recentLogs] = await Promise.all([
    AcademicStudent.countDocuments({ universityId }),
    AcademicCredential.countDocuments({ universityId }),
    AcademicCredential.countDocuments({ universityId, status: 'active' }),
    AcademicCredential.countDocuments({ universityId, status: 'revoked' }),
    AcademicCredential.find({ universityId }).sort({ createdAt: -1 }).limit(8),
    AuditLog.find({ entityType: { $in: ['University', 'AcademicCredential', 'AcademicStudent'] }, actorId: universityId.toString() }).sort({ timestamp: -1 }).limit(10)
  ]);

  return res.json({
    success: true,
    data: {
      stats: {
        totalStudents,
        totalCredentials,
        activeCredentials,
        revokedCredentials
      },
      university: {
        id: req.university._id,
        name: req.university.name,
        status: req.university.status,
        registrationNumber: req.university.registrationNumber,
        issuerDid: req.university.issuerDid,
        walletAddress: req.university.walletAddress
      },
      recentCredentials,
      recentLogs
    }
  });
});

// @desc    Add a single student
// @route   POST /api/universities/students
// @access  University (Approved)
const addStudent = asyncHandler(async (req, res) => {
  const universityId = req.university._id;
  const { enrollmentNumber, name, email, phone, department, program, degree, enrollmentYear, graduationYear, cgpa } = req.body;

  const normalizedEnrollment = String(enrollmentNumber || '').trim().toUpperCase();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const existingEnrollment = await AcademicStudent.findOne({ universityId, enrollmentNumber: normalizedEnrollment });
  if (existingEnrollment) {
    return res.status(409).json({ success: false, message: `Student with enrollment ID "${normalizedEnrollment}" already exists in your institution.` });
  }

  const student = await AcademicStudent.create({
    universityId,
    enrollmentNumber: normalizedEnrollment,
    name,
    email: normalizedEmail,
    phone,
    department,
    program,
    degree,
    enrollmentYear: Number(enrollmentYear),
    graduationYear: graduationYear ? Number(graduationYear) : undefined,
    cgpa: cgpa ? Number(cgpa) : undefined,
    status: 'active'
  });

  await AuditLog.create({
    actorId: universityId.toString(),
    actorRole: 'university',
    actorName: req.university.name,
    action: 'STUDENT_ENROLLED',
    entityType: 'AcademicStudent',
    entityId: student._id.toString(),
    details: { enrollmentNumber: normalizedEnrollment, name }
  });

  return res.status(201).json({ success: true, message: 'Student registered successfully', data: { student } });
});

// @desc    Bulk import students via CSV
// @route   POST /api/universities/students/bulk-import
// @access  University (Approved)
const bulkImportStudents = asyncHandler(async (req, res) => {
  const universityId = req.university._id;
  const { students } = req.body; // Array of student objects

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid or empty students payload.' });
  }

  const results = { imported: 0, skipped: 0, errors: [] };

  for (const s of students) {
    const enrollment = String(s.enrollmentNumber || s['Enrollment Number'] || s.studentId || '').trim().toUpperCase();
    const name = String(s.name || s.studentName || s['Student Name'] || '').trim();
    const email = String(s.email || s['Email'] || '').trim().toLowerCase();
    const dept = String(s.department || s['Department'] || 'General').trim();
    const deg = String(s.degree || s['Degree'] || s.program || 'B.Tech').trim();

    if (!enrollment || !name || !email) {
      results.skipped++;
      results.errors.push(`Row missing required fields (name, email, enrollment): ${JSON.stringify(s)}`);
      continue;
    }

    const exists = await AcademicStudent.findOne({ universityId, enrollmentNumber: enrollment });
    if (exists) {
      results.skipped++;
      results.errors.push(`Enrollment ${enrollment} already exists`);
      continue;
    }

    try {
      await AcademicStudent.create({
        universityId,
        enrollmentNumber: enrollment,
        name,
        email,
        department: dept,
        program: deg,
        degree: deg,
        enrollmentYear: s.enrollmentYear ? Number(s.enrollmentYear) : new Date().getFullYear(),
        graduationYear: s.graduationYear ? Number(s.graduationYear) : undefined,
        cgpa: s.cgpa ? Number(s.cgpa) : undefined,
        status: 'active'
      });
      results.imported++;
    } catch (err) {
      results.skipped++;
      results.errors.push(`Failed for ${enrollment}: ${err.message}`);
    }
  }

  await AuditLog.create({
    actorId: universityId.toString(),
    actorRole: 'university',
    actorName: req.university.name,
    action: 'STUDENTS_BULK_IMPORT',
    entityType: 'AcademicStudent',
    details: { imported: results.imported, skipped: results.skipped }
  });

  return res.json({ success: true, message: `Imported ${results.imported} students (${results.skipped} skipped)`, data: results });
});

// @desc    Get students for the university
// @route   GET /api/universities/students
// @access  University
const getStudents = asyncHandler(async (req, res) => {
  const universityId = req.university._id;
  const { search, department, degree, status, limit = 50, page = 1 } = req.query;

  const query = { universityId };
  if (department) query.department = department;
  if (degree) query.degree = degree;
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { enrollmentNumber: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [students, total] = await Promise.all([
    AcademicStudent.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AcademicStudent.countDocuments(query)
  ]);

  return res.json({
    success: true,
    data: {
      students,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

// @desc    AI/OCR Document Pre-Extraction
// @route   POST /api/universities/extract-document
// @access  University (Approved)
const extractDocumentData = asyncHandler(async (req, res) => {
  const { studentId, originalName, mimeType, fileBase64 } = req.body;

  let studentHint = {};
  if (studentId) {
    const student = await AcademicStudent.findOne({ _id: studentId, universityId: req.university._id });
    if (student) {
      studentHint = {
        name: student.name,
        enrollmentNumber: student.enrollmentNumber,
        department: student.department,
        degree: student.degree,
        cgpa: student.cgpa
      };
    }
  }

  const fileBuffer = fileBase64 ? Buffer.from(fileBase64, 'base64') : Buffer.from(originalName || 'mock-document');
  const documentHash = calculateDocumentHash(fileBuffer);
  const extractionResult = simulateExtraction(fileBuffer, mimeType, originalName, studentHint);

  return res.json({
    success: true,
    data: {
      documentHash,
      extraction: extractionResult,
      studentHint
    }
  });
});

// @desc    Issue a Verifiable Academic Credential
// @route   POST /api/universities/credentials/issue
// @access  University (Approved)
const issueCredential = asyncHandler(async (req, res) => {
  const university = req.university;
  const {
    studentId,
    documentType,
    credentialTitle,
    academicClaims = {},
    documentHash: providedHash,
    fileBase64,
    originalName,
    mimeType,
    notes
  } = req.body;

  const student = await AcademicStudent.findOne({ _id: studentId, universityId: university._id });
  if (!student) {
    return res.status(404).json({ success: false, message: 'Student record not found in your institution.' });
  }

  // Generate or verify exact SHA-256 hash
  let documentHash = providedHash;
  let fileBuffer = null;
  if (fileBase64) {
    fileBuffer = Buffer.from(fileBase64, 'base64');
    documentHash = calculateDocumentHash(fileBuffer);
  }

  if (!documentHash) {
    documentHash = calculateDocumentHash(Buffer.from(`${student.enrollmentNumber}-${documentType}-${Date.now()}`));
  }

  const credentialId = `focal-vc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

  // Construct standard W3C Verifiable Credential
  const w3cUnsigned = buildW3CCredential({
    credentialId,
    issuerUniversity: university,
    student,
    documentType,
    credentialTitle: credentialTitle || `${documentType} - ${student.name}`,
    academicClaims,
    documentHash
  });

  // Cryptographically sign the credential with institutional authority
  const signedW3C = signW3CCredential(w3cUnsigned);

  // Generate QR code for public verification
  const host = req.get('origin') || 'http://localhost:5173';
  const { verificationUrl, qrCodeDataUrl } = await generateVerificationQRCode(credentialId, host);

  // Register on blockchain (Polygon Amoy with graceful simulation fallback)
  const onChainResult = await registerCredentialOnChain({
    credentialId,
    documentHash,
    universityWallet: university.walletAddress
  });

  const credential = await AcademicCredential.create({
    credentialId,
    universityId: university._id,
    academicStudentId: student._id,
    studentName: student.name,
    studentEmail: student.email,
    enrollmentNumber: student.enrollmentNumber,
    documentType,
    credentialTitle: credentialTitle || `${documentType} - ${student.name}`,
    academicClaims: {
      degree: academicClaims.degree || student.degree,
      program: academicClaims.program || student.program,
      department: academicClaims.department || student.department,
      semester: academicClaims.semester,
      cgpa: academicClaims.cgpa || (student.cgpa ? String(student.cgpa) : undefined),
      grade: academicClaims.grade,
      percentage: academicClaims.percentage,
      passingYear: academicClaims.passingYear || student.graduationYear,
      issueDate: new Date()
    },
    documentFile: {
      originalName: originalName || `${documentType}.pdf`,
      fileName: `${credentialId}.pdf`,
      mimeType: mimeType || 'application/pdf',
      fileSize: fileBuffer ? fileBuffer.length : 1024
    },
    documentHash,
    aiExtraction: {
      extractedAt: new Date(),
      confidenceScore: 95,
      manuallyApprovedBy: university.representativeName,
      approvedAt: new Date(),
      notes
    },
    w3cCredential: signedW3C,
    issuerDid: signedW3C.issuer.id,
    cryptographicProof: signedW3C.proof,
    status: 'active',
    blockchain: {
      status: onChainResult.status,
      network: onChainResult.network,
      contractAddress: onChainResult.contractAddress,
      tokenId: onChainResult.tokenId,
      transactionHash: onChainResult.transactionHash,
      simulated: onChainResult.simulated,
      confirmedAt: onChainResult.confirmedAt
    },
    qrCodeDataUrl,
    verificationUrl
  });

  // Update university stats
  await University.findByIdAndUpdate(university._id, {
    $inc: { 'stats.totalCredentialsIssued': 1, 'stats.activeCredentials': 1 }
  });

  // Record Audit Trail
  await AuditLog.create({
    actorId: university._id.toString(),
    actorRole: 'university',
    actorName: university.name,
    action: 'CREDENTIAL_ISSUED',
    entityType: 'AcademicCredential',
    entityId: credential.credentialId,
    details: {
      documentType,
      studentName: student.name,
      enrollmentNumber: student.enrollmentNumber,
      documentHash,
      blockchainStatus: onChainResult.status
    }
  });

  return res.status(201).json({
    success: true,
    message: 'Academic credential issued, cryptographically signed, and registered successfully.',
    data: { credential }
  });
});

// @desc    Get credentials issued by university
// @route   GET /api/universities/credentials
// @access  University
const getCredentials = asyncHandler(async (req, res) => {
  const universityId = req.university._id;
  const { status, documentType, search, limit = 50, page = 1 } = req.query;

  const query = { universityId };
  if (status) query.status = status;
  if (documentType) query.documentType = documentType;
  if (search) {
    query.$or = [
      { studentName: { $regex: search, $options: 'i' } },
      { enrollmentNumber: { $regex: search, $options: 'i' } },
      { credentialId: { $regex: search, $options: 'i' } }
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [credentials, total] = await Promise.all([
    AcademicCredential.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AcademicCredential.countDocuments(query)
  ]);

  return res.json({
    success: true,
    data: {
      credentials,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});

// @desc    Revoke a credential
// @route   POST /api/universities/credentials/:credentialId/revoke
// @access  University (Approved)
const revokeCredential = asyncHandler(async (req, res) => {
  const universityId = req.university._id;
  const { credentialId } = req.params;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ success: false, message: 'Revocation reason is required.' });
  }

  const credential = await AcademicCredential.findOne({ credentialId, universityId });
  if (!credential) {
    return res.status(404).json({ success: false, message: 'Credential not found in your institution.' });
  }

  if (credential.status === 'revoked') {
    return res.status(400).json({ success: false, message: 'Credential is already revoked.' });
  }

  // Update blockchain state
  const onChainResult = await revokeCredentialOnChain({ credentialId, reason });

  credential.status = 'revoked';
  credential.revocation = {
    revokedAt: new Date(),
    revokedBy: req.university.representativeName,
    reason,
    transactionHash: onChainResult.transactionHash
  };
  await credential.save();

  // Update university stats
  await University.findByIdAndUpdate(universityId, {
    $inc: { 'stats.activeCredentials': -1, 'stats.revokedCredentials': 1 }
  });

  await AuditLog.create({
    actorId: universityId.toString(),
    actorRole: 'university',
    actorName: req.university.name,
    action: 'CREDENTIAL_REVOKED',
    entityType: 'AcademicCredential',
    entityId: credentialId,
    details: { reason, studentName: credential.studentName }
  });

  return res.json({
    success: true,
    message: `Credential ${credentialId} has been revoked.`,
    data: { credential }
  });
});

// @desc    Supersede a credential
// @route   POST /api/universities/credentials/:credentialId/supersede
// @access  University (Approved)
const supersedeCredential = asyncHandler(async (req, res) => {
  const universityId = req.university._id;
  const { credentialId } = req.params;
  const { newCredentialId, reason } = req.body;

  const oldCredential = await AcademicCredential.findOne({ credentialId, universityId });
  if (!oldCredential) {
    return res.status(404).json({ success: false, message: 'Original credential not found.' });
  }

  oldCredential.status = 'superseded';
  oldCredential.supersession = {
    supersededBy: newCredentialId,
    supersededAt: new Date(),
    reason: reason || 'Superseded by updated credential'
  };
  await oldCredential.save();

  await AuditLog.create({
    actorId: universityId.toString(),
    actorRole: 'university',
    actorName: req.university.name,
    action: 'CREDENTIAL_SUPERSEDED',
    entityType: 'AcademicCredential',
    entityId: credentialId,
    details: { newCredentialId, reason }
  });

  return res.json({
    success: true,
    message: `Credential ${credentialId} is now marked superseded.`,
    data: { credential: oldCredential }
  });
});

module.exports = {
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
};
