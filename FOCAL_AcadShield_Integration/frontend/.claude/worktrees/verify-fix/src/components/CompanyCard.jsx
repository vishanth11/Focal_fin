import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CompanyCard({ company }) {
  if (!company) return null;

  const isVerified = company.status === 'verified';
  const isSuspicious = company.status === 'suspicious' || company.status === 'revoked';
  const isPending = company.status === 'pending';

  let badgeColor = 'bg-neon-green/30 text-textDark border-textDark';
  let badgeText = 'VERIFIED';
  let scoreColor = 'text-textDark';

  if (isSuspicious) {
    badgeColor = 'bg-risk-high/10 text-risk-high border-risk-high';
    badgeText = company.status === 'revoked' ? 'REVOKED' : 'SUSPICIOUS / HIGH RISK';
    scoreColor = 'text-risk-high';
  } else if (isPending) {
    badgeColor = 'bg-neon-yellow/40 text-textDark border-textDark';
    badgeText = 'PENDING AUDIT';
    scoreColor = 'text-textDark';
  }

  return (
    <div className="group relative bg-surface border border-borderDark hover:border-textDark p-6 transition-all duration-300 flex flex-col justify-between hover:shadow-md font-mono">
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider border ${badgeColor}`}>
            {badgeText}
          </div>
          <div className="text-right">
            <span className={`text-2xl font-extrabold tracking-tight ${scoreColor}`}>
              {company.trustScore}
            </span>
            <span className="text-[10px] text-textMuted block font-bold">TRUST SCORE</span>
          </div>
        </div>

        <h3 className="text-lg font-extrabold text-textDark group-hover:text-black transition-colors tracking-tight line-clamp-1">
          {company.name}
        </h3>
        <p className="text-xs text-textDark font-bold mb-3 underline">{company.domain}</p>

        <p className="text-xs text-textMuted line-clamp-2 leading-relaxed mb-4">
          {company.category || 'Technology & Business Enterprise'}
        </p>
      </div>

      <div className="pt-4 border-t border-borderDark flex items-center justify-between text-xs">
        <span className="text-[11px] text-textMuted">
          {company.verifiedDate ? `AUDITED: ${company.verifiedDate}` : 'UNVERIFIED ENTITY'}
        </span>
        <Link
          to={`/company/${company.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-textDark group-hover:underline"
        >
          <span>PROFILE</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
