const mongoose = require('mongoose');

const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    domain: { type: String, required: true, trim: true, lowercase: true, unique: true },
    registrationNumber: { type: String, trim: true },
    taxId: { type: String, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    website: { type: String, required: true, trim: true },
    linkedinUrl: { type: String, trim: true },
    walletAddress: { type: String, required: true, trim: true, unique: true },
    gstin: { type: String, trim: true, uppercase: true },
    gstVerificationStatus: {
      type: String,
      enum: ['not_provided', 'verified', 'failed', 'unavailable'],
      default: 'not_provided',
      index: true
    },
    gstVerificationSimulated: { type: Boolean, default: false },
    gstVerificationDate: Date,
    gstLegalName: String,
    gstTradeName: String,
    gstRegistrationStatus: String,
    gstBusinessType: String,
    gstState: String,
    gstPrincipalAddress: String,
    gstTaxpayerType: String,
    gstVerificationReference: String,
    gstVerificationResult: mongoose.Schema.Types.Mixed,
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'revoked'],
      default: 'pending',
      index: true
    },
    verificationDate: Date,
    revocationDate: Date,
    rejectionReason: String,
    revocationReason: String,
    tokenId: Number,
    tokenURI: String,
    verificationHash: String,
    mintTransactionHash: String,
    revokeTransactionHash: String,
    // Admin approval audit trail — the manual VERIFY click is authoritative.
    approvedAt: Date,
    approvedBy: String,
    // Honest mint bookkeeping: mintStatus is written ONLY from real outcomes.
    // 'minted' requires a confirmed Polygon Amoy receipt; 'failed' carries the
    // actual error in mintError; null/pending means no attempt has settled.
    mintStatus: {
      type: String,
      enum: ['pending', 'failed', 'minted'],
      default: null
    },
    mintError: String,
    mintedAt: Date,
    // True only for companies registered through the DEMO onboarding flow
    // (DEMO_VERIFICATION_MODE=true). Demo verification is simulated and must
    // never be presented as a government or production check. Badge fields
    // above are still only written from a real confirmed Amoy transaction.
    demoMode: { type: Boolean, default: false },
    verificationReport: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

companySchema.index({ name: 'text', domain: 'text' });

module.exports = mongoose.model('Company', companySchema);
