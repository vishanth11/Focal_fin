import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { studentLogin, studentRegister } from '../services/api';
import { useApp } from '../context/AppContext';
import { USER_ROLES } from '../services/storage';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export default function StudentRegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setStudentSession, completeOnboarding, showToast } = useApp();

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const validate = () => {
    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) return 'Enter your name.';
    if (!email) return 'Enter your email address.';
    if (!EMAIL_PATTERN.test(email)) return 'That does not look like a valid email address.';
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (form.password !== form.confirm) return 'The two passwords do not match.';
    return '';
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const email = form.email.trim();
      await studentRegister({ name: form.name.trim(), email, password: form.password });
      // Registration deliberately returns no token, so sign in afterwards.
      const session = await studentLogin({ email, password: form.password });
      setStudentSession(session.token, session.student);
      completeOnboarding(USER_ROLES.STUDENT);
      showToast('Student account created — you are signed in', 'success');
      navigate('/student');
    } catch (err) {
      const message = err.message || 'Unable to create your account.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Skipping records the visit so the role modal does not reappear, then
  // returns to the normal public experience.
  const handleSkip = () => {
    completeOnboarding(USER_ROLES.GUEST);
    navigate('/');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 font-mono text-textDark">      <div className="bg-surface border-2 border-textDark p-8 sm:p-10 max-w-md w-full space-y-8 shadow-xl relative">
        <div className="text-center space-y-2 border-b border-borderDark pb-6">
          <div className="inline-flex items-center gap-2 font-mono font-extrabold text-3xl tracking-tighter text-textDark">
            FOCAL<span className="text-neon-green font-extrabold">.</span>
          </div>
          <div className="text-xs text-textDark uppercase tracking-widest font-extrabold flex items-center justify-center gap-2">
            <GraduationCap className="w-4 h-4" />
            CREATE STUDENT ACCOUNT
          </div>
        </div>

        <p className="text-[11px] text-textMuted font-bold leading-relaxed p-3 bg-pitch border border-borderDark">
          Student accounts are separate from the FOCAL admin console and carry no administrative
          access. An account is optional — you can always check a company without one.
        </p>

        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="register-name"
              className="text-xs text-textMuted font-bold block uppercase mb-1"
            >
              FULL NAME:
            </label>
            <input
              id="register-name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={update('name')}
              className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="text-xs text-textMuted font-bold block uppercase mb-1"
            >
              STUDENT EMAIL:
            </label>
            <input
              id="register-email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="text-xs text-textMuted font-bold block uppercase mb-1"
            >
              PASSWORD (MIN {MIN_PASSWORD_LENGTH} CHARACTERS):
            </label>
            <input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
              className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
            />
          </div>

          <div>
            <label
              htmlFor="register-confirm"
              className="text-xs text-textMuted font-bold block uppercase mb-1"
            >
              CONFIRM PASSWORD:
            </label>
            <input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={update('confirm')}
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
              <span>CREATING ACCOUNT...</span>
            ) : (
              <>
                <span>CREATE ACCOUNT</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="space-y-3 border-t border-borderDark pt-6">
          <Link
            to="/student/login"
            className="block w-full py-3 bg-pitch border border-borderDark text-textDark font-bold text-xs uppercase text-center hover:bg-surface transition-all"
          >
            ALREADY HAVE AN ACCOUNT? LOG IN
          </Link>

          <button
            type="button"
            onClick={handleSkip}
            className="block w-full py-3 bg-surface border-2 border-textDark text-textDark font-extrabold text-xs uppercase tracking-wider text-center hover:bg-neon-green transition-all"
          >
            SKIP FOR NOW
          </button>
        </div>
      </div>
    </div>
  );
}
