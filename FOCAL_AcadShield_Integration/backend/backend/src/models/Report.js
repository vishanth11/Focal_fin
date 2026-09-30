const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    companyName: { type: String, required: true, trim: true },
    reporterEmail: { type: String, required: true, trim: true, lowercase: true },
    reporterName: { type: String, trim: true },
    evidenceUrl: { type: String, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'accepted', 'rejected'],
      default: 'pending',
      index: true
    },
    reviewedBy: String,
    reviewNote: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
