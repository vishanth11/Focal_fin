const mongoose = require('mongoose');

const credentialShareSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      required: true,
      index: true
    },
    academicCredentialObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AcademicCredential',
      required: true
    },
    studentEmail: {
      type: String,
      required: true,
      lowercase: true,
      index: true
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company'
    },
    companyDomain: {
      type: String,
      lowercase: true,
      trim: true,
      index: true
    },
    companyName: {
      type: String,
      trim: true
    },
    shareToken: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    status: {
      type: String,
      enum: ['active', 'revoked', 'expired'],
      default: 'active',
      index: true
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: Date,
    accessCount: {
      type: Number,
      default: 0
    },
    accessLog: [
      {
        accessedAt: { type: Date, default: Date.now },
        ip: String,
        action: String
      }
    ]
  },
  { timestamps: true }
);

credentialShareSchema.index({ studentEmail: 1, status: 1 });
credentialShareSchema.index({ companyDomain: 1, status: 1 });

module.exports = mongoose.model('CredentialShare', credentialShareSchema);
