import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Activity, Terminal, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Footer() {
  const { resetRole } = useApp();

  return (
    <footer className="bg-pitch border-t border-borderDark text-textMuted pt-16 pb-12 relative z-10 font-mono overflow-hidden">
      {/* Top accent border line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-textDark/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-borderDark">
          {/* Brand & Identity */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 font-mono font-extrabold text-3xl tracking-tighter text-textDark">
              FOCAL<span className="text-neon-green font-extrabold">.</span>
            </Link>
            <p className="text-xs font-bold text-textDark uppercase tracking-widest">
              Trust Before You Connect.
            </p>
            <p className="text-xs text-textMuted max-w-sm leading-relaxed">
              FOCAL. creates a trusted digital layer between businesses by verifying corporate identity, detecting typosquatting, auditing digital footprints, and maintaining blockchain verification logs.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-borderDark text-[11px] font-mono rounded shadow-sm">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
              <span className="text-textDark font-bold">NETWORK STATUS: ONLINE</span>
              <span className="text-textMuted">| 99.98% UPTIME</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-textDark uppercase tracking-widest border-b border-borderDark pb-2">
              PLATFORM WORKSPACE
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/" className="hover:text-textDark transition-colors">→ HOME SEARCH</Link>
              </li>
              <li>
                <Link to="/explore" className="hover:text-textDark transition-colors">→ EXPLORE BUSINESSES</Link>
              </li>
              <li>
                <Link to="/connections" className="hover:text-textDark transition-colors">→ TRUSTED CONNECTIONS</Link>
              </li>
              <li>
                <Link to="/report" className="hover:text-textDark transition-colors">→ REPORT ENTITY</Link>
              </li>
              <li>
                <Link to="/admin/login" className="hover:text-textDark transition-colors font-bold">→ ADMIN CONSOLE</Link>
              </li>
            </ul>
          </div>

          {/* Protocol Features */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-textDark uppercase tracking-widest border-b border-borderDark pb-2">
              VERIFICATION PROTOCOL
            </h4>
            <ul className="space-y-2 text-xs text-textMuted">
              <li className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-textDark" />
                <span>ERC-721 Soulbound Badges</span>
              </li>
              <li className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-textDark" />
                <span>Typosquatting Diff Analysis</span>
              </li>
              <li className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-textDark" />
                <span>Real-time Risk Signal Radar</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-textDark" />
                <span>Corporate Identity Audits</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-textMuted gap-4">
          <div>
            © {new Date().getFullYear()} FOCAL. TRUST LAYER INC. ALL RIGHTS RESERVED.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-textDark cursor-pointer">PRIVACY PROTOCOL</span>
            <span className="hover:text-textDark cursor-pointer">TERMS OF MEDIATION</span>
            {/* The only way to see the role selection again once it has been
                answered or skipped. */}
            <button
              type="button"
              onClick={resetRole}
              className="hover:text-textDark uppercase tracking-widest"
            >
              SWITCH ROLE
            </button>
            <span className="text-textDark font-bold">FOCAL.TRUST_LAYER_v2.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
