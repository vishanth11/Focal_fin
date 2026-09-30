const mongoose = require('mongoose');

const academicStudentSchema = new mongoose.Schema(
  {
    universityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'University',
      required: true,
      index: true
    },
    // Optional link to registered student portal account (Student collection)
    portalStudentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      index: true
    },
    enrollmentNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      required: true,
      trim: true
    },
    program: {
      type: String,
      required: true,
      trim: true
    },
    degree: {
      type: String,
      required: true,
      trim: true
    },
    enrollmentYear: {
      type: Number,
      required: true
    },
    graduationYear: {
      type: Number
    },
    cgpa: {
      type: Number
    },
    status: {
      type: String,
      enum: ['active', 'graduated', 'withdrawn', 'suspended'],
      default: 'active',
      index: true
    }
  },
  { timestamps: true }
);

// Enforce institution-level uniqueness for enrollment number
academicStudentSchema.index({ universityId: 1, enrollmentNumber: 1 }, { unique: true });
academicStudentSchema.index({ universityId: 1, email: 1 });
academicStudentSchema.index({ name: 'text', enrollmentNumber: 'text', email: 'text' });

module.exports = mongoose.model('AcademicStudent', academicStudentSchema);
