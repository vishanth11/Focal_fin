const mongoose = require('mongoose');

const academicCredentialSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
      index: true
    },
    academicStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicStudent',
      required: true,
      index: true
    },
    studentName: { type: String, required: true, trim: true },
    studentEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    enrollmentNumber: { type: String, required: true, trim: true, uppercase: true },
    documentType: {
      type: String,
      enum: [
        'SSLC Marksheet',
        'HSC Marksheet',
        'Semester Marksheet',
        'Degree Certificate',
        'Diploma Certificate',
        'Transcript',
        'Transfer Certificate',
        'Other Academic Credential'
      ],
      required: true,
      index: true
    },
    credentialTitle: { type: String, required: true, trim: true },
    academicClaims: {
      degree: String,
      program: String,
      department: String,
      semester: String,
      cgpa: String,
      grade: String,
      percentage: String,
      passingYear: Number,
      issueDate: { type: Date, default: Date.now },
      customFields: mongoose.Schema.Types.Mixed
    },
    documentFile: {
      originalName: String,
      fileName: String,
      mimeType: String,
      fileSize: Number,
      fileUrl: String,
      storagePath: String
    },
    documentHash: {
      type: String,
      required: true,
      index: true // SHA-256 hash of original file bytes
    },
    aiExtraction: {
      extractedAt: Date,
      confidenceScore: { type: Number, default: 0 },
      extractedData: mongoose.Schema.Types.Mixed,
      inconsistencies: [String],
      manuallyApprovedBy: String,
      approvedAt: Date,
      notes: String
    },
    w3cCredential: mongoose.Schema.Types.Mixed,
    issuerDid: { type: String, required: true },
    cryptographicProof: {
      type: { type: String, default: 'EcdsaSecp256k1Signature2019' },
      created: { type: Date, default: Date.now },
      verificationMethod: String,
      proofPurpose: { type: String, default: 'assertionMethod' },
      signatureValue: String
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'superseded'],
      default: 'active',
      index: true
    },
    revocation: {
      revokedAt: Date,
      revokedBy: String,
      reason: String,
      transactionHash: String
    },
    supersession: {
      supersededBy: String,
      supersedes: String,
      supersededAt: Date,
      reason: String
    },
    blockchain: {
      status: {
        type: String,
        enum: ['pending', 'confirmed', 'failed', 'simulated'],
        default: 'pending',
        index: true
      },
      network: { type: String, default: 'Polygon Amoy' },
      contractAddress: String,
      tokenId: Number,
      transactionHash: String,
      blockNumber: Number,
      confirmedAt: Date,
      simulated: { type: Boolean, default: false }
    },
    ipfs: {
      cid: String,
      gatewayUrl: String
    },
    qrCodeDataUrl: String,
    verificationUrl: String
  },
  { timestamps: true }
);

academicCredentialSchema.index({ universityId: 1, status: 1 });
academicCredentialSchema.index({ studentEmail: 1, status: 1 });
academicCredentialSchema.index({ enrollmentNumber: 1 });

module.exports = mongoose.model('AcademicCredential', academicCredentialSchema);
