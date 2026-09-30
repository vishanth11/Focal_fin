import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { studentLogin } from '../services/api';
import { useApp } from '../context/AppContext';
import { USER_ROLES } from '../services/storage';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StudentLoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setStudentSession, completeOnboarding, showToast } = useApp();

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');

    const email = form.email.trim();
    if (!email) {
      setError('Enter your email address.');
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError('That does not look like a valid email address.');
      return;
    }
    if (!form.password) {
      setError('Enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await studentLogin({ email, password: form.password });
      setStudentSession(res.token, res.student);
      completeOnboarding(USER_ROLES.STUDENT);
      showToast('Signed in to your student account', 'success');
      navigate('/student');
    } catch (err) {
      const message = err.message || 'Unable to sign in.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Skipping is a first-class outcome, not a failure: it records the visit and
  // returns to the normal, fully-public FOCAL experience.
  const handleSkip = () => {
    completeOnboarding(USER_ROLES.GUEST);
    navigate('/');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 font-mono text-textDark">
      <div className="bg-surface border-2 border-textDark p-8 sm:p-10 max-w-md w-full space-y-8 shadow-xl relative">
        <div className="text-center space-y-2 border-b border-borderDark pb-6">
          <div className="inline-flex items-center gap-2 font-mono font-extrabold text-3xl tracking-tighter text-textDark">
            FOCAL<span className="text-neon-green font-extrabold">.</span>
          </div>
          <div className="text-xs text-textDark uppercase tracking-widest font-extrabold flex items-center justify-center gap-2">
            <GraduationCap className="w-4 h-4" />
            STUDENT ACCESS
          </div>
        </div>

        {/* The value proposition, stated plainly. The second block is the
            point of the whole screen: an account is optional. */}
        <div className="p-4 bg-pitch border border-borderDark text-[11px] font-bold space-y-3">
          <div>
            <div className="text-textDark font-extrabold uppercase tracking-wider mb-1">
              Want legitimate opportunities from verified companies?
            </div>
            <div className="text-textMuted leading-relaxed">
              Log in to access and share opportunities from companies that have passed FOCAL
              verification.
            </div>
          </div>
          <div className="border-t border-borderDark pt-3">
            <div className="text-textDark font-extrabold uppercase tracking-wider mb-1">
              Only want to check a company or a job offer?
            </div>
            <div className="text-textMuted leading-relaxed">
              You do not need an account. Skip and use FOCAL normally — searching, checking links
              and verifying companies all work without logging in.
            </div>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="student-email"
              className="text-xs text-textMuted font-bold block uppercase mb-1"
            >
              STUDENT EMAIL:
            </label>
            <input
              id="student-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
            />
          </div>

          <div>
            <label
              htmlFor="student-password"
              className="text-xs text-textMuted font-bold block uppercase mb-1"
            >
              PASSWORD:
            </label>
            <input
              id="student-password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={update('password')}
              className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-risk-high font-bold leading-relaxed">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-neon-yellow text-textDark border-2 border-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-green transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span>AUTHENTICATING...</span>
            ) : (
              <>
                <span>LOG IN</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="space-y-3 border-t border-borderDark pt-6">
          <Link
            to="/student/register"
            className="block w-full py-3 bg-pitch border border-borderDark text-textDark font-bold text-xs uppercase text-center hover:bg-surface transition-all"
          >
            CREATE AN ACCOUNT
          </Link>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-3 bg-surface border-2 border-textDark text-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-green transition-all flex items-center justify-center gap-2"
          >
            <span>SKIP FOR NOW</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <p className="text-[11px] text-textMuted font-bold text-center leading-relaxed">
            Skip simply returns you to FOCAL. Nothing is locked behind an account.
          </p>
        </div>
      </div>
    </div>
  );
}
