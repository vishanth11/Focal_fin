import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Activity, Terminal, ArrowRight, Zap, AlertTriangle, Lock, Search, CheckCircle2 } from 'lucide-react';
import SearchBox from '../components/SearchBox';
import NetworkVisualizer from '../components/NetworkVisualizer';
import DomainComparison from '../components/DomainComparison';
import CompanyCard from '../components/CompanyCard';
import { demoCompanies, demoTyposquattingExamples } from '../data/demoData';

export default function LandingPage() {
  const navigate = useNavigate();
  const [statsCount, setStatsCount] = useState({ checked: 0, verified: 0, risks: 0, coverage: 0 });
  const [activeHeroNode, setActiveHeroNode] = useState(null);
  const [packetVerifiedPulse, setPacketVerifiedPulse] = useState(false);
  const [activeStep, setActiveStep] = useState(1);

  // Simulated Live Activity Stream
  const [liveStream, setLiveStream] = useState([
    { id: 1, text: 'COMPANY VERIFIED: TechNova Solutions (technova.com)', time: '12 sec ago', status: 'verified' },
    { id: 2, text: 'DOMAIN ANALYZED: apexcyber.io — Score: 94', time: '19 sec ago', status: 'verified' },
    { id: 3, text: 'TRUST CONNECTION ESTABLISHED: TechNova ➔ Apex Cybernetics', time: '32 sec ago', status: 'info' },
    { id: 4, text: 'RISK SIGNAL DETECTED: Lookalike companny.com flagged', time: '47 sec ago', status: 'risk' },
  ]);

  useEffect(() => {
    // Stat counting animation
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setStatsCount({
        checked: Math.min(12480, Math.floor(step * 450)),
        verified: Math.min(8940, Math.floor(step * 320)),
        risks: Math.min(1240, Math.floor(step * 45)),
        coverage: Math.min(96, Math.floor(step * 4))
      });
      if (step >= 28) clearInterval(interval);
    }, 40);

    // Data packet pulse simulation
    const packetInterval = setInterval(() => {
      setPacketVerifiedPulse(true);
      setTimeout(() => setPacketVerifiedPulse(false), 800);
    }, 4000);

    // Live stream interval
    const streamInterval = setInterval(() => {
      const items = [
        { text: 'DOMAIN ANALYZED: hyperionlabs.ai — Score: 68', status: 'verified' },
        { text: 'VERIFICATION BADGE CONFIRMED: Token #10921 on Polygon', status: 'info' },
        { text: 'TYPOSQUATTING ALERT: companny.com flagged Levenshtein diff 1', status: 'risk' }
      ];
      const randomItem = items[Math.floor(Math.random() * items.length)];
      setLiveStream(prev => [
        { id: Date.now(), text: randomItem.text, time: '1 sec ago', status: randomItem.status },
        ...prev.slice(0, 4)
      ]);
    }, 6000);

    return () => {
      clearInterval(interval);
      clearInterval(packetInterval);
      clearInterval(streamInterval);
    };
  }, []);

  // Process journey steps
  const journeySteps = [
    { num: '01', title: 'DISCOVER', desc: 'Enter any company name, domain, website or email into FOCAL. verification terminal.' },
    { num: '02', title: 'VERIFY', desc: 'Automated multi-vector queries check tax records, domain age, DNSSEC & SSL footprints.' },
    { num: '03', title: 'ANALYZE', desc: 'Detect typosquatting mutations, character diffs, and reported impersonation signals.' },
    { num: '04', title: 'TRUST', desc: 'Generate a transparent 0-100 FOCAL. Trust Score backed by Soulbound NFT proofs.' },
    { num: '05', title: 'CONNECT', desc: 'Establish monitored B2B communication channels with verified corporate partners.' }
  ];

  const heroNodes = [
    { id: 'node-1', name: 'COMPANY A', domain: 'technova.com', x: 80, y: 60, trust: 87, status: 'VERIFIED ✓' },
    { id: 'node-2', name: 'COMPANY B', domain: 'apexcyber.io', x: 340, y: 80, trust: 94, status: 'VERIFIED ✓' },
    { id: 'node-3', name: 'COMPANY C', domain: 'companny.com', x: 90, y: 280, trust: 24, status: 'HIGH RISK ⚠' },
    { id: 'node-4', name: 'COMPANY D', domain: 'hyperionlabs.ai', x: 350, y: 290, trust: 68, status: 'PENDING' },
  ];

  return (
    <div className="space-y-24 pb-24 relative z-10 font-mono text-textDark">
      {/* HERO SECTION — WOW MOMENT */}
      <section className="relative pt-8 pb-20 overflow-hidden border-b border-borderDark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column (7 cols): Editorial Typography & Terminal */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Top Technical Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-textDark text-textDark text-xs font-bold uppercase tracking-widest shadow-sm">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
                <span>BUSINESS TRUST INFRASTRUCTURE</span>
              </div>

              {/* Large Editorial Headline across lines */}
              <div className="space-y-1 font-extrabold font-display uppercase tracking-tighter text-textDark leading-none text-6xl sm:text-7xl md:text-8xl">
                <div>TRUST</div>
                <div className="inline-block bg-neon-yellow px-4 py-1 text-textDark border-2 border-textDark shadow-md transform -rotate-1">
                  BEFORE
                </div>
                <div className="flex items-center gap-1">
                  <span>YOU CONNECT</span>
                  <span className="text-neon-green font-extrabold animate-pulse">.</span>
                </div>
              </div>

              {/* Supporting Statement */}
              <p className="max-w-xl text-base text-textMuted font-mono leading-relaxed">
                <strong className="text-textDark">FOCAL.</strong> is the trusted digital layer between businesses. Verify corporate identities, detect typosquatting lookalikes, analyze risk signals, and issue soulbound on-chain verification badges.
              </p>

              {/* Hero Verification Terminal */}
              <SearchBox />
            </div>

            {/* Right Column (5 cols): Interactive Hero Trust Network & Floating Panel */}
            <div className="lg:col-span-5 relative">
              
              {/* FLOATING TRUST INTELLIGENCE PANEL */}
              <div className="absolute -top-4 right-0 z-30 bg-surface border-2 border-textDark p-4 shadow-xl text-xs font-mono max-w-[220px] space-y-2">
                <div className="flex items-center justify-between text-[10px] text-textMuted font-bold uppercase border-b border-borderDark pb-1">
                  <span>LIVE TRUST NETWORK</span>
                  <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
                </div>
                <div className="space-y-1 font-bold text-textDark">
                  <div>● 1,284 BUSINESSES</div>
                  <div className="text-neon-green">● 874 VERIFIED</div>
                  <div className="text-risk-high">● 63 RISKS DETECTED</div>
                </div>
                <div className="pt-2 border-t border-borderDark flex items-center justify-between text-[10px]">
                  <span className="text-textMuted">STATUS:</span>
                  <span className="font-extrabold text-textDark">ACTIVE</span>
                </div>
              </div>

              {/* LIVING NETWORK VISUALIZATION CANVAS */}
              <div className="bg-surface border-2 border-textDark p-6 shadow-2xl relative min-h-[380px] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-tech-grid opacity-60 pointer-events-none" />

                {/* SVG Connections & Traveling Neon Data Packets */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  {heroNodes.map((node) => (
                    <g key={node.id}>
                      {/* Connection Line to Central FOCAL Node (cx: 210, cy: 190) */}
                      <line
                        x1={node.x + 40}
                        y1={node.y + 20}
                        x2="210"
                        y2="190"
                        stroke="#111111"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                      />
                      {/* Animated Traveling Data Packet Dot */}
                      <circle r="4" fill="#39FF88">
                        <animateMotion
                          path={`M ${node.x + 40} ${node.y + 20} L 210 190`}
                          dur="3.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  ))}
                </svg>

                {/* Central FOCAL. Mediator Node */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-28 h-28 rounded-full border-4 border-textDark bg-neon-yellow flex flex-col items-center justify-center text-center shadow-xl transition-transform ${packetVerifiedPulse ? 'scale-110 border-neon-green shadow-2xl' : ''}`}>
                  <span className="text-base font-extrabold text-textDark">FOCAL.</span>
                  <span className="text-[9px] font-bold text-textDark">TRUST LAYER</span>
                  {packetVerifiedPulse && (
                    <span className="text-[9px] font-extrabold text-textDark bg-surface px-1 border border-textDark animate-pulse">
                      VERIFIED ✓
                    </span>
                  )}
                </div>

                {/* Interactive Orbiting Company Nodes */}
                {heroNodes.map((node) => (
                  <div
                    key={node.id}
                    onMouseEnter={() => setActiveHeroNode(node.id)}
                    onMouseLeave={() => setActiveHeroNode(null)}
                    style={{ left: `${node.x}px`, top: `${node.y}px` }}
                    className="absolute z-30 cursor-pointer p-2 bg-surface border-2 border-textDark shadow-md hover:scale-110 transition-transform font-mono"
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-textDark">
                      <span className="w-2 h-2 rounded-full bg-textDark" />
                      <span>{node.name}</span>
                    </div>
                    <div className="text-[9px] text-textMuted font-bold">{node.domain}</div>

                    {/* Node Hover Telemetry Popover */}
                    {activeHeroNode === node.id && (
                      <div className="absolute top-full left-0 mt-2 bg-surface border-2 border-textDark p-3 z-40 text-xs w-44 shadow-2xl space-y-1 animate-fadeIn">
                        <div className="font-extrabold text-textDark">{node.name}</div>
                        <div className="text-[10px] font-bold text-textDark">TRUST SCORE: {node.trust}/100</div>
                        <div className="text-[10px] text-textMuted">IDENTITY: VERIFIED ✓</div>
                        <div className="text-[10px] text-textMuted">DOMAIN: VERIFIED ✓</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HORIZONTAL CONTINUOUS TRUST MARQUEE TICKER */}
      <div className="w-full bg-neon-yellow border-y-2 border-textDark py-3 overflow-hidden font-mono text-xs font-extrabold tracking-widest text-textDark uppercase">
        <div className="flex whitespace-nowrap animate-marquee gap-12">
          <span>VERIFY IDENTITY • ANALYZE DOMAIN • DETECT RISK • BUILD TRUST • CONNECT SECURELY</span>
          <span>•</span>
          <span>ERC-721 SOULBOUND BADGES • TYPOSQUATTING DIFFERENTIAL RADAR • B2B MEDIATION</span>
          <span>•</span>
          <span>VERIFY IDENTITY • ANALYZE DOMAIN • DETECT RISK • BUILD TRUST • CONNECT SECURELY</span>
        </div>
      </div>

      {/* NUMERICAL TRUST METRICS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-surface border-2 border-textDark p-8 sm:p-12 font-mono shadow-md">
          <div className="text-xs text-textDark font-extrabold uppercase tracking-widest mb-6 flex items-center justify-between border-b border-borderDark pb-3">
            <span>PLATFORM TELEMETRY & IMPACT</span>
            <span className="bg-neon-green/30 px-2 py-0.5 border border-textDark">UPDATED LIVE</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold text-textDark tracking-tight">
                {statsCount.checked.toLocaleString()}+
              </div>
              <div className="text-xs text-textMuted uppercase tracking-wider mt-2 font-bold">BUSINESSES CHECKED</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold text-textDark tracking-tight">
                {statsCount.verified.toLocaleString()}+
              </div>
              <div className="text-xs text-textMuted uppercase tracking-wider mt-2 font-bold">VERIFIED CORPORATES</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold text-risk-high tracking-tight">
                {statsCount.risks.toLocaleString()}+
              </div>
              <div className="text-xs text-textMuted uppercase tracking-wider mt-2 font-bold">RISKS & IMPERSONATION FLAGGED</div>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl font-extrabold text-textDark tracking-tight">
                {statsCount.coverage}%
              </div>
              <div className="text-xs text-textMuted uppercase tracking-wider mt-2 font-bold">GLOBAL REGISTRY COVERAGE</div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE VERIFICATIONS STREAM */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-mono">
        <div className="bg-surface border-2 border-textDark p-6 sm:p-8 space-y-6 shadow-md">
          <div className="flex items-center justify-between border-b border-borderDark pb-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-textDark uppercase tracking-wider">
              <Activity className="w-4 h-4 text-textDark animate-pulse" />
              <span>LIVE VERIFICATIONS ACTIVITY STREAM</span>
            </div>
            <span className="text-[10px] text-textMuted font-bold">SIMULATED REALTIME RADAR</span>
          </div>

          <div className="space-y-3">
            {liveStream.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-pitch border border-borderDark flex items-center justify-between text-xs transition-all duration-300 animate-fadeIn"
              >
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${item.status === 'risk' ? 'bg-risk-high' : 'bg-neon-green'}`} />
                  <span className="font-bold text-textDark">{item.text}</span>
                </div>
                <span className="text-[10px] text-textMuted font-bold">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HORIZONTAL PROCESS JOURNEY — HOW FOCAL WORKS */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-mono space-y-8">
        <div>
          <span className="text-xs text-textDark font-extrabold uppercase tracking-widest block mb-1">
            VERIFICATION FRAMEWORK
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-textDark tracking-tight">
            HOW FOCAL. MEDIATES TRUST
          </h2>
        </div>

        {/* 5-Step Horizontal Process Journey Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {journeySteps.map((step, idx) => {
            const stepNum = idx + 1;
            const isSelected = activeStep === stepNum;
            return (
              <div
                key={step.num}
                onClick={() => setActiveStep(stepNum)}
                className={`p-6 border-2 transition-all duration-300 cursor-pointer relative bg-surface ${
                  isSelected
                    ? 'border-textDark bg-neon-yellow/30 shadow-lg -translate-y-2'
                    : 'border-borderDark hover:border-textDark/60'
                }`}
              >
                <div className="text-4xl font-extrabold text-textDark mb-4">{step.num}</div>
                <h3 className="text-base font-extrabold text-textDark mb-2">{step.title}</h3>
                <p className="text-xs text-textMuted leading-relaxed">{step.desc}</p>

                {isSelected && (
                  <div className="mt-4 pt-2 border-t border-textDark text-[10px] font-extrabold text-textDark">
                    ACTIVE STEP ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* TYPOSQUATTING SHOWCASE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-mono space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-risk-high/10 border border-risk-high text-risk-high text-xs font-bold uppercase tracking-widest mb-3">
            <AlertTriangle className="w-4 h-4" />
            <span>FEATURED DEMO ENGINE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-textDark tracking-tight">
            TYPOSQUATTING & IMPERSONATION DETECTION
          </h2>
          <p className="text-xs text-textMuted max-w-xl mt-2">
            FOCAL. performs character-level Levenshtein diff analysis to catch lookalike domains registered by threat actors to spoof corporate identity.
          </p>
        </div>

        <DomainComparison
          officialDomain={demoTyposquattingExamples[0].officialDomain}
          officialName={demoTyposquattingExamples[0].officialName}
          suspiciousDomain={demoTyposquattingExamples[0].suspiciousDomain}
          suspiciousName={demoTyposquattingExamples[0].suspiciousName}
          explanation={demoTyposquattingExamples[0].explanation}
        />
      </section>

      {/* B2B NETWORK VISUALIZER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-mono">
        <NetworkVisualizer />
      </section>

      {/* FEATURED VERIFIED DIRECTORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <span className="text-xs text-textDark font-bold uppercase tracking-widest block mb-1">
              VERIFIED DIRECTORY
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-textDark tracking-tight">
              EXPLORE VERIFIED BUSINESSES
            </h2>
          </div>
          <Link
            to="/explore"
            className="inline-flex items-center gap-2 text-xs text-textDark font-extrabold border-2 border-textDark px-5 py-2.5 bg-surface hover:bg-neon-yellow transition-all shadow-sm"
          >
            <span>VIEW ALL ENTITIES</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {demoCompanies.slice(0, 3).map((c) => (
            <CompanyCard key={c.id} company={c} />
          ))}
        </div>
      </section>

      {/* FINAL CTA BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-mono">
        <div className="p-8 sm:p-14 bg-surface border-2 border-textDark text-center space-y-6 relative overflow-hidden shadow-xl">
          <div className="text-xs text-textDark font-extrabold uppercase tracking-widest">
            SAFEGUARD YOUR BUSINESS CONNECTIONS
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-textDark uppercase tracking-tight max-w-3xl mx-auto">
            BEFORE YOU CONNECT, CHECK.
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => {
                const input = document.getElementById('company-search-input');
                if (input) input.focus();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-8 py-4 bg-neon-yellow text-textDark border-2 border-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-green transition-all shadow-md"
            >
              ANALYZE A DOMAIN NOW →
            </button>
            <Link
              to="/report"
              className="w-full sm:w-auto px-8 py-4 bg-pitch border-2 border-textDark text-textDark hover:bg-surface font-extrabold text-xs uppercase tracking-wider transition-all"
            >
              REPORT SUSPICIOUS ENTITY →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
