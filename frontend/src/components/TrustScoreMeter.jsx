import React, { useEffect, useState } from 'react';

export default function TrustScoreMeter({ score = 87, status = 'verified' }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.ceil((score - current) / 4);
      if (current >= score) {
        current = score;
        clearInterval(interval);
      }
      setDisplayScore(current);
    }, 30);
    return () => clearInterval(interval);
  }, [score]);

  let accentColor = '#111111';
  let riskLabel = 'VERIFIED TRUST';
  let badgeColor = 'bg-neon-green/30 text-textDark border-textDark';

  if (score < 40 || status === 'revoked' || status === 'suspicious') {
    accentColor = '#FF3B30';
    riskLabel = 'HIGH RISK ENTITY';
    badgeColor = 'bg-risk-high/15 text-risk-high border-risk-high';
  } else if (score < 75 || status === 'pending') {
    accentColor = '#DFFF00';
    riskLabel = 'CAUTION REQUIRED';
    badgeColor = 'bg-neon-yellow/40 text-textDark border-textDark';
  }

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 bg-surface border border-borderDark rounded-none font-mono shadow-sm">
      {/* Outer SVG Technical Ring */}
      <div className="relative w-56 h-56 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="#DCDCD5"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="100"
            cy="100"
            r={radius + 12}
            stroke="#DCDCD5"
            strokeWidth="1"
            strokeDasharray="4 8"
            fill="transparent"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke={accentColor === '#111111' ? '#111111' : accentColor}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Central Score Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
          <span className="text-5xl font-extrabold tracking-tighter text-textDark">
            {displayScore}
          </span>
          <span className="text-[10px] uppercase text-textMuted tracking-widest font-bold mt-1">
            FOCAL. SCORE
          </span>
        </div>
      </div>

      {/* Risk Badge Label */}
      <div className={`mt-4 px-4 py-1.5 border-2 font-mono text-xs font-extrabold uppercase tracking-wider ${badgeColor}`}>
        {riskLabel}
      </div>

      {/* Technical breakdown summary */}
      <div className="w-full grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-borderDark text-center font-mono text-[10px] text-textMuted">
        <div>
          <div className="text-textDark font-bold">99.4%</div>
          <div>IDENTITY MATCH</div>
        </div>
        <div>
          <div className="text-textDark font-bold">0 FLAGS</div>
          <div>REPORTED CASES</div>
        </div>
        <div>
          <div className="text-textDark font-bold">ON-CHAIN</div>
          <div>BADGE PROOF</div>
        </div>
      </div>
    </div>
  );
}
