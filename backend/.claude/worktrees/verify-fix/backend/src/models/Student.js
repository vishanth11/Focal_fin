const mongoose = require('mongoose');

// Student accounts are an OPTIONAL capability layer that sits alongside the
// public verification flow — they are not required to check a company.
//
// Deliberately absent: any `role` field. Student-ness lives only in the token
// payload (see src/utils/studentToken.js), so a client cannot self-assign a
// role by writing to its own document. This collection is wholly separate from
// the admin credential, which lives in env (ADMIN_EMAIL / ADMIN_PASSWORD) and
// is never stored in Mongo.
const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, unique: true },
    password: { type: String, required: true, select: false }
  },
  { timestamps: true }
);

// Second layer of defence: `select: false` keeps the hash out of ordinary
// queries, and this transform keeps it out of any response body even if a
// caller explicitly selects it.
studentSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('Student', studentSchema);
