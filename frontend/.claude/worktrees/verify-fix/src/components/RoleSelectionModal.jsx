import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, GraduationCap, ArrowRight, Terminal } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { USER_ROLES } from '../services/storage';

// First-visit role selection. Shown ONCE, and only on the landing page — a
// deep link to /check, /explore, /company/:id or /report is never gated, and
// "just browsing" records the visit so the modal does not return.
export default function RoleSelectionModal() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { onboardingCompleted, completeOnboarding } = useApp();

  const panelRef = useRef(null);
  const firstActionRef = useRef(null);

  const isOpen = !onboardingCompleted && pathname === '/';
  const dismiss = () => completeOnboarding(USER_ROLES.GUEST);

  // Escape dismisses (treated as "just browsing") and Tab is trapped inside
  // the panel. The existing Connection request overlay does neither; this
  // dialog appears unprompted on first load, so it does.
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        dismiss();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll('button');
      if (!focusable || !focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, completeOnboarding]);

  // Keep the page behind the dialog from scrolling while it is open.
  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) firstActionRef.current?.focus();
  }, [isOpen]);

  const choose = (role) => {
    completeOnboarding(role);
    if (role === USER_ROLES.STUDENT) {
      navigate('/student/login');
    }
    // Companies are routed to the company registration page — the public
    // verification tools stay available to them like anyone else.
    if (role === USER_ROLES.COMPANY) {
      navigate('/register');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-textDark/40 backdrop-blur-sm flex items-center justify-center p-4 font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-selection-title"
    >
      <div
        ref={panelRef}
        className="bg-surface border-2 border-textDark w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-borderDark px-6 py-4">
          <div className="text-xs font-extrabold text-textDark uppercase tracking-widest flex items-center gap-2">
            <Terminal className="w-4 h-4 text-textDark" />
            <span>WELCOME TO FOCAL</span>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close and continue browsing"
            className="text-textDark font-extrabold text-base hover:text-neon-green transition-colors duration-200"
          >
            ✕
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h2
              id="role-selection-title"
              className="text-xl sm:text-2xl font-extrabold tracking-tight text-textDark"
            >
              Are you a Company or a Student?
            </h2>
            <p className="text-xs text-textMuted font-bold leading-relaxed">
              This only changes what we show you first. Checking a company, link or job offer is
              public and always works without an account.
            </p>
          </div>

          <div className="space-y-3">
            <button
              ref={firstActionRef}
              type="button"
              onClick={() => choose(USER_ROLES.COMPANY)}
              className="w-full text-left p-4 bg-pitch border-2 border-textDark hover:bg-neon-yellow transition-all duration-200 shadow-sm hover:shadow-md group flex items-start gap-3"
            >
              <Building2 className="w-5 h-5 text-textDark flex-shrink-0 mt-0.5" />
              <span className="flex-1">
                <span className="block text-sm font-extrabold uppercase tracking-wider text-textDark">
                  I'M A COMPANY
                </span>
                <span className="block text-xs text-textMuted font-bold mt-1">
                  Get verified and build trust with students.
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-textDark flex-shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={() => choose(USER_ROLES.STUDENT)}
              className="w-full text-left p-4 bg-pitch border-2 border-textDark hover:bg-neon-yellow transition-all duration-200 shadow-sm hover:shadow-md group flex items-start gap-3"
            >
              <GraduationCap className="w-5 h-5 text-textDark flex-shrink-0 mt-0.5" />
              <span className="flex-1">
                <span className="block text-sm font-extrabold uppercase tracking-wider text-textDark">
                  I'M A STUDENT
                </span>
                <span className="block text-xs text-textMuted font-bold mt-1">
                  Access legitimate opportunities from verified companies.
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-textDark flex-shrink-0 mt-0.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Deliberately a full-width, first-class action rather than a muted
              afterthought: browsing without choosing is a normal outcome. */}
          <button
            type="button"
            onClick={dismiss}
            className="w-full py-3 bg-surface border-2 border-textDark text-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-green transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
          >
            <span>JUST BROWSING — CONTINUE WITHOUT CHOOSING</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <p className="text-[11px] text-textMuted font-bold leading-relaxed border-t border-borderDark pt-4">
            You can change this any time from the footer. No account is needed to verify anything
            on FOCAL.
          </p>
        </div>
      </div>
    </div>
  );
}
