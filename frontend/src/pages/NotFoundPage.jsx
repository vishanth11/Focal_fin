import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 font-mono text-center text-textDark">
      <div className="bg-surface border-2 border-textDark p-8 sm:p-12 max-w-lg w-full space-y-6 shadow-xl">
        <AlertTriangle className="w-16 h-16 text-textDark mx-auto animate-bounce" />
        <div className="space-y-1">
          <div className="text-4xl font-extrabold text-textDark">404 // NOT FOUND</div>
          <div className="text-xs text-textDark font-bold uppercase tracking-widest bg-neon-yellow px-2 py-0.5 border border-textDark inline-block">
            ERROR: RESOLUTION_FAILED
          </div>
        </div>

        <p className="text-xs text-textMuted font-semibold leading-relaxed">
          The requested route or node endpoint could not be found within the FOCAL. trust network registry.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-3 bg-neon-yellow text-textDark border-2 border-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-green transition-all shadow-md"
        >
          <span>RETURN TO HOME ENGINE</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
