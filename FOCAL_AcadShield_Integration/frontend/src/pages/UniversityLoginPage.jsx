import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { universityLogin } from '../services/api';

export default function UniversityLoginPage() {
  const navigate = useNavigate();
  const { setUniversitySession, showToast } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Please enter both email and password', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await universityLogin({ email, password });
      setUniversitySession(res.token, res.university);
      showToast(`Welcome, ${res.university.name}`, 'success');
      navigate('/university/dashboard');
    } catch (err) {
      showToast(err.message || 'Login failed. Check your credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 font-mono text-textDark">
      <div className="bg-surface border-2 border-textDark p-8 shadow-2xl space-y-6">
        <div className="space-y-2 border-b border-borderDark pb-4">
          <div className="flex items-center gap-2 text-[10px] tracking-widest text-textMuted uppercase font-bold">
            <GraduationCap className="w-4 h-4 text-neon-green" />
            <span>INSTITUTIONAL ISSUER ACCESS</span>
          </div>
          <h1 className="text-xl font-extrabold uppercase">UNIVERSITY PORTAL LOGIN</h1>
          <p className="text-xs text-textMuted font-bold">
            Sign in to manage student records, review AI-parsed documents, and issue blockchain credentials.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase block text-textMuted">Official Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="registrar@university.edu"
              required
              className="w-full px-3 py-2.5 bg-pitch border border-borderDark focus:border-textDark focus:bg-surface text-xs font-mono outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold uppercase block text-textMuted">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full px-3 py-2.5 bg-pitch border border-borderDark focus:border-textDark focus:bg-surface text-xs font-mono outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-neon-green border-2 border-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-yellow transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <span>{loading ? 'AUTHENTICATING...' : 'ACCESS UNIVERSITY WORKSPACE'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-borderDark flex items-center justify-between text-xs">
          <span className="text-textMuted font-bold">Need institutional access?</span>
          <Link to="/university/register" className="font-extrabold underline hover:text-neon-green">
            REGISTER INSTITUTION →
          </Link>
        </div>
      </div>
    </div>
  );
}
