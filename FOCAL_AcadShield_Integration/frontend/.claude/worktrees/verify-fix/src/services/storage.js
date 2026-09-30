// Single source of truth for FOCAL's localStorage keys, plus a guarded
// accessor for the keys added by the optional student layer.
//
// The keys the app originally shipped with (focal_admin_token) are read and
// written unguarded in AppContext and api.js. The keys below decide things
// like whether the landing page renders the first-visit role modal, so a
// browser with storage blocked must not be able to throw during render —
// hence the try/catch wrappers.

export const STORAGE_KEYS = {
  // Existing admin session. Listed here only so the two can be told apart —
  // nothing in the student flow reads, writes, or clears this key.
  adminToken: 'focal_admin_token',
  // Added by the optional student / role-selection layer.
  userRole: 'focal_user_role',
  onboardingCompleted: 'focal_onboarding_completed',
  studentToken: 'focal_student_token',
  studentProfile: 'focal_student_profile'
};

export const USER_ROLES = {
  COMPANY: 'company',
  STUDENT: 'student',
  GUEST: 'guest'
};

export const safeStorage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      // Storage unavailable (private mode, blocked cookies) — treat as unset.
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Storage unavailable — the session simply will not persist.
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Nothing to clear.
    }
  }
};
