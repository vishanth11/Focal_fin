import React, { useState, useEffect } from 'react';
import { Activity, Terminal, Check } from 'lucide-react';

export default function VerificationScanner({ targetQuery = 'technova.com', onComplete }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [rollingScore, setRollingScore] = useState(0);
  const [logs, setLogs] = useState([]);

  const steps = [
    { title: 'STEP 01 // CORPORATE IDENTITY', desc: 'Querying official registry records & tax entity hashes...', duration: 900 },
    { title: 'STEP 02 // DOMAIN & TYPOSQUATTING', desc: 'Analyzing domain creation age, DNSSEC & lookalike mutations...', duration: 1100 },
    { title: 'STEP 03 // DIGITAL PRESENCE & MX', desc: 'Auditing SSL certificates, MX records & DMARC authentication...', duration: 900 },
    { title: 'STEP 04 // RISK SIGNAL RADAR', desc: 'Cross-referencing reported entities & suspicious wire requests...', duration: 1000 },
    { title: 'STEP 05 // CALCULATING TRUST SCORE', desc: 'Synthesizing multi-vector telemetry into FOCAL. Trust Score...', duration: 1200 },
  ];

  useEffect(() => {
    let timer;
    let scoreInterval;

    const runStep = (idx) => {
      if (idx >= steps.length) {
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 600);
        return;
      }

      setCurrentStepIndex(idx);
      setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] EXECUTING ${steps[idx].title}`]);

      if (idx === 4) {
        let current = 0;
        const target = targetQuery.includes('companny') ? 24 : targetQuery.includes('quick') ? 38 : 87;
        scoreInterval = setInterval(() => {
          current += Math.floor(Math.random() * 8) + 3;
          if (current >= target) {
            current = target;
            clearInterval(scoreInterval);
          }
          setRollingScore(current);
        }, 40);
      }

      timer = setTimeout(() => {
        runStep(idx + 1);
      }, steps[idx].duration);
    };

    runStep(0);

    return () => {
      clearTimeout(timer);
      if (scoreInterval) clearInterval(scoreInterval);
    };
  }, [targetQuery]);

  const progressPercent = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  return (
    <div className="w-full max-w-3xl mx-auto my-12 bg-surface border-2 border-textDark p-6 sm:p-8 font-mono shadow-xl relative overflow-hidden">
      {/* Light scanner line */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-1 bg-neon-green shadow-md animate-scan-line" />
      </div>

      {/* Terminal Header */}
      <div className="flex items-center justify-between pb-4 mb-6 border-b border-borderDark text-xs text-textMuted uppercase tracking-widest font-bold">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-textDark animate-pulse" />
          <span className="text-textDark font-extrabold">FOCAL. INTELLIGENCE SCANNER</span>
        </div>
        <div className="text-textDark font-bold bg-neon-yellow/40 px-2 py-0.5 border border-textDark">
          TARGET: {targetQuery}
        </div>
      </div>

      {/* Progress Counter */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-textMuted uppercase tracking-wider font-bold">
          SCANNING PROGRESS: <span className="text-textDark font-extrabold">{progressPercent}%</span>
        </span>
        <span className="text-xs text-textDark font-bold flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 animate-spin text-textDark" />
          ACTIVE ANALYSIS
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 bg-card border border-borderDark mb-8 overflow-hidden">
        <div
          className="h-full bg-neon-yellow border-r-2 border-textDark transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step List */}
      <div className="space-y-4 mb-8">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          return (
            <div
              key={step.title}
              className={`p-3.5 border transition-all duration-300 flex items-center justify-between ${
                isCurrent
                  ? 'border-2 border-textDark bg-neon-yellow/30 text-textDark font-bold shadow-md'
                  : isDone
                  ? 'border-borderDark bg-surface text-textDark'
                  : 'border-borderDark/40 bg-card text-textMuted/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded border border-textDark flex items-center justify-center text-xs font-bold bg-surface">
                  {isDone ? <Check className="w-4 h-4 text-textDark" /> : idx + 1}
                </div>
                <div>
                  <div className="text-xs font-bold tracking-wider text-textDark">{step.title}</div>
                  <div className="text-[11px] opacity-80">{step.desc}</div>
                </div>
              </div>

              {isCurrent && (
                <div className="w-2.5 h-2.5 rounded-full bg-textDark animate-ping" />
              )}
            </div>
          );
        })}
      </div>

      {/* Score Reveal */}
      {currentStepIndex >= 4 && (
        <div className="text-center py-5 bg-neon-yellow/20 border-2 border-textDark animate-fadeIn">
          <div className="text-xs text-textMuted uppercase tracking-widest mb-1 font-bold">CALCULATED TRUST SCORE</div>
          <div className="text-6xl font-extrabold text-textDark tracking-tighter">
            {rollingScore} <span className="text-sm font-normal text-textMuted">/ 100</span>
          </div>
        </div>
      )}

      {/* Terminal Telemetry Log Stream */}
      <div className="mt-6 pt-4 border-t border-borderDark text-[10px] text-textMuted space-y-1 h-20 overflow-y-auto bg-card p-2 font-mono">
        {logs.map((log, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-textDark font-bold">&gt;</span>
            <span>{log}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
