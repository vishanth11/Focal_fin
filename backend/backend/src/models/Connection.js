const mongoose = require('mongoose');

const connectionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    companyName: { type: String, required: true, trim: true },
    companyDomain: { type: String, trim: true, lowercase: true },
    // The entity requesting the connection (a student or another company)
    requesterName: { type: String, trim: true },
    requesterDomain: { type: String, trim: true, lowercase: true },
    studentName: { type: String, trim: true },
    studentEmail: { type: String, trim: true, lowercase: true },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Connection', connectionSchema);