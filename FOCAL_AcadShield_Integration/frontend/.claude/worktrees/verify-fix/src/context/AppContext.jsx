import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { STORAGE_KEYS, USER_ROLES, safeStorage } from '../services/storage';

const AppContext = createContext();

function readStoredProfile() {
  const raw = safeStorage.get(STORAGE_KEYS.studentProfile);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    // Corrupt value — fall back to no cached profile rather than crashing.
    return null;
  }
}

export function AppProvider({ children }) {
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [currentResult, setCurrentResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [toast, setToast] = useState(null);
  const [isAdmin, setIsAdmin] = useState(() => {
    return !!localStorage.getItem('focal_admin_token');
  });

  // --- Role selection + optional student session -------------------------
  // Lazily initialised from localStorage exactly like isAdmin above, which
  // also keeps these StrictMode-safe (no double-write on mount).
  const [userRole, setUserRole] = useState(() => safeStorage.get(STORAGE_KEYS.userRole));
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    return safeStorage.get(STORAGE_KEYS.onboardingCompleted) === 'true';
  });
  // isStudent is derived from the token, not the cached profile — a token
  // without a cached profile is still a live session.
  const [studentToken, setStudentToken] = useState(() => safeStorage.get(STORAGE_KEYS.studentToken));
  const [studentProfile, setStudentProfile] = useState(() => readStoredProfile());
  const isStudent = !!studentToken;

  const showToast = (message, type = 'info', duration = 3500) => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(prev => (prev && prev.message === message ? null : prev));
    }, duration);
  };

  const logoutAdmin = () => {
    localStorage.removeItem('focal_admin_token');
    setIsAdmin(false);
    showToast('Signed out of Admin Workspace', 'info');
  };

  // Records the visitor's choice. Called for a real choice AND for "just
  // browsing", so the modal does not reappear on every landing-page visit.
  const completeOnboarding = useCallback((role) => {
    const nextRole = role || USER_ROLES.GUEST;
    safeStorage.set(STORAGE_KEYS.userRole, nextRole);
    safeStorage.set(STORAGE_KEYS.onboardingCompleted, 'true');
    setUserRole(nextRole);
    setOnboardingCompleted(true);
  }, []);

  // Sole writer for the student session keys. The API layer deliberately
  // returns the token without persisting it, so there is exactly one place
  // that touches these keys and it uses the guarded accessor.
  const setStudentSession = useCallback((token, profile) => {
    if (token) {
      safeStorage.set(STORAGE_KEYS.studentToken, token);
      setStudentToken(token);
    }
    if (profile) {
      safeStorage.set(STORAGE_KEYS.studentProfile, JSON.stringify(profile));
      setStudentProfile(profile);
    }
  }, []);

  const logoutStudent = () => {
    // Only the student keys are cleared. focal_admin_token is never touched,
    // so an admin session survives a student sign-out and vice versa.
    safeStorage.remove(STORAGE_KEYS.studentToken);
    safeStorage.remove(STORAGE_KEYS.studentProfile);
    setStudentToken(null);
    setStudentProfile(null);
    showToast('Signed out of Student Account', 'info');
  };

  // The explicit reset the spec calls for: the only way to see the role
  // selection again. The student session, if any, is intentionally kept so
  // re-choosing a role cannot silently destroy an account session.
  const resetRole = () => {
    safeStorage.remove(STORAGE_KEYS.userRole);
    safeStorage.remove(STORAGE_KEYS.onboardingCompleted);
    setUserRole(null);
    setOnboardingCompleted(false);
    showToast('Role reset — choose again next time you visit the home page', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        activeSearchQuery,
        setActiveSearchQuery,
        currentResult,
        setCurrentResult,
        isScanning,
        setIsScanning,
        toast,
        showToast,
        isAdmin,
        setIsAdmin,
        logoutAdmin,
        userRole,
        onboardingCompleted,
        completeOnboarding,
        isStudent,
        studentProfile,
        setStudentSession,
        logoutStudent,
        resetRole
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
