import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { adminLogin } from '../services/api';
import { useApp } from '../context/AppContext';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('admin@focal.network');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setIsAdmin, showToast } = useApp();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adminLogin({ email, password });
      if (res.token) {
        setIsAdmin(true);
        showToast('Authenticated as FOCAL. Administrator', 'success');
        navigate('/admin');
      }
    } catch (err) {
      showToast(err.message || 'Invalid administrator credentials.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 font-mono text-textDark">
      <div className="bg-surface border-2 border-textDark p-8 sm:p-10 max-w-md w-full space-y-8 shadow-xl relative">
        <div className="text-center space-y-2 border-b border-borderDark pb-6">
          <div className="inline-flex items-center gap-2 font-mono font-extrabold text-3xl tracking-tighter text-textDark">
            FOCAL<span className="text-neon-green font-extrabold">.</span>
          </div>
          <div className="text-xs text-textDark uppercase tracking-widest font-extrabold">
            ADMINISTRATION CONSOLE LOGIN
          </div>
        </div>

        <div className="p-3 bg-pitch border border-borderDark text-[11px] text-textMuted font-bold space-y-1">
          <div className="text-textDark font-extrabold">HACKATHON DEMO CREDENTIALS:</div>
          <div>Email: <span className="text-textDark font-mono">admin@focal.network</span></div>
          <div>Password: <span className="text-textDark font-mono">admin123</span></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-textMuted font-bold block uppercase mb-1">ADMINISTRATOR EMAIL:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
              required
            />
          </div>

          <div>
            <label className="text-xs text-textMuted font-bold block uppercase mb-1">SECURITY PASSWORD:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-neon-yellow text-textDark border-2 border-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-green transition-all shadow-md flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>AUTHENTICATING...</span>
            ) : (
              <>
                <span>SIGN IN TO ADMIN DASHBOARD</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
