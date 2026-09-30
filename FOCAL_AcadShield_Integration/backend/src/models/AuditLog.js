const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: String, required: true },
    actorRole: {
      type: String,
      enum: ['admin', 'university', 'student', 'company', 'system'],
      required: true
    },
    actorName: String,
    action: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: String,
      index: true
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  { timestamps: true }
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ actorRole: 1, action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
