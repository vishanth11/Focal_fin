const mongoose = require('mongoose');

const universitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    institutionType: {
      type: String,
      enum: [
        'Central University',
        'State University',
        'Deemed University',
        'Private University',
        'Autonomous College',
        'Affiliated College',
        'Institute of National Importance',
        'Other'
      ],
      default: 'Central University'
    },
    registrationNumber: { type: String, required: true, trim: true, unique: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, required: true, select: false },
    website: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    representativeName: { type: String, required: true, trim: true },
    representativeEmail: { type: String, required: true, trim: true, lowercase: true },
    representativeTitle: { type: String, required: true, trim: true },
    walletAddress: { type: String, required: true, trim: true, lowercase: true },
    issuerDid: { type: String, trim: true },
    supportingDocuments: [
      {
        documentName: String,
        documentType: String,
        fileUrl: String,
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true
    },
    rejectionReason: String,
    suspensionReason: String,
    approvedAt: Date,
    approvedBy: String,
    stats: {
      totalCredentialsIssued: { type: Number, default: 0 },
      activeCredentials: { type: Number, default: 0 },
      revokedCredentials: { type: Number, default: 0 },
      totalStudents: { type: Number, default: 0 }
    }
  },
  { timestamps: true }
);

universitySchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

universitySchema.index({ name: 'text', registrationNumber: 'text', email: 'text' });

module.exports = mongoose.model('University', universitySchema);
