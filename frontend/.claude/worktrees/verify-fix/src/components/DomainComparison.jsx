import React from 'react';
import { AlertTriangle, ShieldCheck, Terminal } from 'lucide-react';

export default function DomainComparison({ 
  officialDomain = 'company.com',
  officialName = 'Verified Global Entity',
  suspiciousDomain = 'companny.com',
  suspiciousName = 'Companny Cyber Trust',
  explanation = 'This domain closely resembles the verified company domain by inserting an extra "n" character to spoof corporate identity.'
}) {

  const renderHighlightedDomain = (domain, isSuspicious = false) => {
    return domain.split('').map((char, index) => {
      const isMutated = isSuspicious && (
        (domain === 'companny.com' && index === 4) ||
        (domain.includes('tech-nova-verify')) ||
        (char === '0' || char === '1' || (index > 4 && domain !== officialDomain))
      );

      return (
        <span
          key={index}
          className={
            isMutated
              ? 'bg-risk-high text-white font-extrabold px-1 rounded shadow-sm'
              : ''
          }
        >
          {char}
        </span>
      );
    });
  };

  return (
    <div className="w-full bg-surface border-2 border-textDark p-6 sm:p-8 font-mono shadow-md relative overflow-hidden">
      {/* Top Banner */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-borderDark text-xs text-textMuted uppercase tracking-widest font-bold">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-textDark" />
          <span className="text-textDark font-extrabold">TYPOSQUATTING & LOOKALIKE ANALYSIS ENGINE</span>
        </div>
        <div className="px-2 py-0.5 bg-risk-high text-white text-[10px] font-bold rounded">
          HIGH RISK MUTATION DETECTED
        </div>
      </div>

      {/* Side-by-side Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        {/* Official Entity Card */}
        <div className="p-5 bg-pitch border-2 border-textDark relative shadow-sm">
          <div className="flex items-center gap-2 text-textDark text-xs font-extrabold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-textDark" />
            <span>OFFICIAL VERIFIED DOMAIN</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-textDark tracking-wider my-2">
            {renderHighlightedDomain(officialDomain, false)}
          </div>
          <div className="text-xs text-textMuted font-bold">{officialName}</div>
          <div className="mt-4 pt-3 border-t border-borderDark flex items-center justify-between text-[10px] text-textMuted">
            <span>DNSSEC: ENABLED</span>
            <span className="text-textDark font-extrabold bg-neon-green/30 px-2 py-0.5">VERIFIED MATCH ✓</span>
          </div>
        </div>

        {/* Suspicious Entity Card */}
        <div className="p-5 bg-risk-high/5 border-2 border-risk-high relative shadow-sm">
          <div className="flex items-center gap-2 text-risk-high text-xs font-extrabold uppercase tracking-wider mb-2">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            <span>SUSPICIOUS LOOKALIKE DOMAIN</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-textDark tracking-wider my-2">
            {renderHighlightedDomain(suspiciousDomain, true)}
          </div>
          <div className="text-xs text-textMuted font-bold">{suspiciousName}</div>
          <div className="mt-4 pt-3 border-t border-borderDark flex items-center justify-between text-[10px] text-textMuted">
            <span>REGISTRATION AGE: 7 DAYS</span>
            <span className="text-risk-high font-extrabold bg-risk-high/20 px-2 py-0.5">MUTATION FLAGGED ⚠</span>
          </div>
        </div>
      </div>

      {/* Signal Connector */}
      <div className="my-6 relative py-4 border-y border-borderDark flex items-center justify-between text-xs text-textMuted font-bold">
        <span>OFFICIAL IDENTITY</span>
        <div className="flex-1 mx-4 relative h-[2px] bg-borderDark overflow-hidden">
          <div className="absolute top-0 bottom-0 w-24 bg-gradient-to-r from-textDark via-neon-yellow to-risk-high animate-dash-flow shadow-sm" />
        </div>
        <span>LOOKALIKE SIGNAL (LEVENSHTEIN DIFF: 1)</span>
      </div>

      {/* Explanation Banner */}
      <div className="p-4 bg-risk-high/10 border border-risk-high text-xs leading-relaxed space-y-2">
        <div className="font-extrabold text-risk-high flex items-center gap-2 uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4" />
          <span>LOOKALIKE DOMAIN DETECTED</span>
        </div>
        <p className="text-textDark font-semibold">{explanation}</p>
        <div className="text-[11px] text-textMuted pt-1">
          FOCAL. Recommendation: Do NOT process wire transfers or send credentials to emails originating from <span className="text-textDark font-extrabold underline">{suspiciousDomain}</span>.
        </div>
      </div>
    </div>
  );
}
