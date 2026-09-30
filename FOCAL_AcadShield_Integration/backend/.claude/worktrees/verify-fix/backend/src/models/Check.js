const mongoose = require('mongoose');

const checkSchema = new mongoose.Schema(
  {
    input: { type: String, required: true, trim: true },
    inputType: { type: String, enum: ['url', 'email', 'company_name'], required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    isVerified: { type: Boolean, default: false },
    riskScore: { type: Number, min: 0, max: 100, default: 0 },
    redFlags: [{ type: String }],
    result: {
      type: String,
      enum: ['verified', 'suspicious', 'revoked', 'not_found'],
      required: true,
      index: true
    },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Check', checkSchema);
