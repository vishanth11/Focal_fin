import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, XCircle, ShieldAlert, Sparkles } from 'lucide-react';

export default function Badge({ status, className = '', showIcon = true }) {
  const norm = (status || '').toLowerCase().replace(/[^a-z0-9_]/g, '_');

  switch (norm) {
    case 'verified':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-wider bg-neon-green/25 text-textDark border border-textDark shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${className}`}
        >
          {showIcon && <CheckCircle2 className="w-3.5 h-3.5 text-textDark" />}
          <span>VERIFIED ENTITY ✓</span>
        </span>
      );

    case 'newly_verified':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-wider bg-neon-yellow text-textDark border border-textDark shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${className}`}
          title="Recently incorporated company (<6 months) with verified GST + MCA evidence."
        >
          {showIcon && <Sparkles className="w-3.5 h-3.5 text-textDark" />}
          <span>NEWLY VERIFIED (STARTUP)</span>
        </span>
      );

    case 'pending':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-wider bg-pitch text-textMuted border border-borderDark ${className}`}
        >
          {showIcon && <Clock className="w-3.5 h-3.5 text-textMuted" />}
          <span>PENDING REVIEW</span>
        </span>
      );

    case 'revoked':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-wider bg-risk-high text-white border border-textDark shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${className}`}
        >
          {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-white" />}
          <span>TRUST BADGE REVOKED ✕</span>
        </span>
      );

    case 'rejected':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-wider bg-risk-high/20 text-risk-high border border-risk-high ${className}`}
        >
          {showIcon && <XCircle className="w-3.5 h-3.5 text-risk-high" />}
          <span>VERIFICATION REJECTED</span>
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-black uppercase tracking-wider bg-pitch text-textMuted border border-borderDark ${className}`}
        >
          {showIcon && <AlertTriangle className="w-3.5 h-3.5 text-textMuted" />}
          <span>{(status || 'UNVERIFIED').toUpperCase()}</span>
        </span>
      );
  }
}