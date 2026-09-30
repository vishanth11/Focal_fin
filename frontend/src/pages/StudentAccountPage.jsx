import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, RefreshCw } from 'lucide-react';
import { getStudentProfile } from '../services/api';
import { useApp } from '../context/AppContext';

function formatMemberSince(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

// Deliberately minimal: the plan scope is a profile + sign out, with no
// Opportunity/Job model and no linkage into the public check history.
export default function StudentAccountPage() {
  const navigate = useNavigate();
  const { studentProfile, studentToken, setStudentSession, logoutStudent, resetRole } = useApp();

  // The session always stores the profile alongside the token, so this only
  // fires for a token written before a profile was cached.
  useEffect(() => {
    if (studentProfile || !studentToken) return undefined;

    let cancelled = false;
    getStudentProfile()
      .then((res) => {
        if (!cancelled && res.student) setStudentSession(studentToken, res.student);
      })
      .catch(() => {
        // Left to the empty state below rather than pushed as a toast.
      });

    return () => {
      cancelled = true;
    };
  }, [studentProfile, studentToken, setStudentSession]);

  const handleSignOut = () => {
    logoutStudent();
    navigate('/');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 font-mono text-textDark">
      <div className="bg-surface border-2 border-textDark p-8 sm:p-10 max-w-lg w-full space-y-8 shadow-xl relative">
        <div className="space-y-2 border-b border-borderDark pb-6">
          <div className="inline-flex items-center gap-2 font-mono font-extrabold text-3xl tracking-tighter text-textDark">
            FOCAL<span className="text-neon-green font-extrabold">.</span>
          </div>
          <div className="text-xs text-textDark uppercase tracking-widest font-extrabold flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            STUDENT ACCOUNT
          </div>
        </div>

        {studentProfile ? (
          <div className="space-y-3">
            {[
              ['NAME', studentProfile.name],
              ['EMAIL', studentProfile.email],
              ['MEMBER SINCE', formatMemberSince(studentProfile.createdAt)]
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 p-3 bg-pitch border border-borderDark"
              >
                <span className="text-[11px] font-bold uppercase tracking-widest text-textMuted">
                  {label}
                </span>
                <span className="text-xs font-extrabold text-textDark text-right break-all">
                  {value || '—'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-pitch border border-borderDark text-xs font-bold text-textMuted">
            Loading your account details...
          </div>
        )}

        <div className="p-3 bg-pitch border border-borderDark text-[11px] text-textMuted font-bold leading-relaxed">
          Your student account is separate from the FOCAL admin console and grants no
          administrative access. You can keep checking companies without signing in.
        </div>

        <div className="space-y-3 border-t border-borderDark pt-6">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full py-3 bg-neon-yellow border-2 border-textDark text-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-green transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            SIGN OUT
          </button>

          <button
            type="button"
            onClick={resetRole}
            className="w-full py-3 bg-pitch border border-borderDark text-textDark font-bold text-xs uppercase hover:bg-surface transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            SWITCH ROLE
          </button>
        </div>
      </div>
    </div>
  );
}
