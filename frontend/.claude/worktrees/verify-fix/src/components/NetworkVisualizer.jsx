import React, { useState } from 'react';
import { Activity, Lock } from 'lucide-react';

export default function NetworkVisualizer({ 
  companyA = 'TechNova Solutions', 
  domainA = 'technova.com',
  companyB = 'Apex Cybernetics',
  domainB = 'apexcyber.io'
}) {
  const [activeNode, setActiveNode] = useState(null);

  const nodes = [
    {
      id: 'node-a',
      title: 'COMPANY A',
      name: companyA,
      domain: domainA,
      type: 'VERIFIED_SENDER',
      color: '#111111',
      details: 'Identity verified with 100% DNSSEC match & active corporate tax ID.'
    },
    {
      id: 'node-focal',
      title: 'FOCAL. TRUST LAYER',
      name: 'MEDIATOR PROTOCOL',
      domain: 'focal.network',
      type: 'TRUST_MEDIATOR',
      color: '#DFFF00',
      details: 'Continuously monitors B2B transactions, domain changes & risk telemetry.'
    },
    {
      id: 'node-b',
      title: 'COMPANY B',
      name: companyB,
      domain: domainB,
      type: 'VERIFIED_RECIPIENT',
      color: '#111111',
      details: 'Soulbound NFT badge #10921 confirmed on Polygon mainnet.'
    }
  ];

  return (
    <div className="w-full bg-surface border border-borderDark p-6 sm:p-10 font-mono relative overflow-hidden my-8 shadow-sm">
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-tech-grid opacity-50 pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-8 border-b border-borderDark gap-4">
        <div>
          <span className="text-[10px] text-textDark font-extrabold uppercase tracking-widest block">
            B2B TRUST MEDIATION LAYER
          </span>
          <h3 className="text-xl sm:text-2xl font-extrabold text-textDark tracking-tight">
            ACTIVE BUSINESS NETWORK CONNECTOR
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-textDark font-bold bg-neon-green/30 border border-textDark px-3 py-1">
          <Activity className="w-4 h-4 animate-pulse text-textDark" />
          <span>REALTIME MONITORING ACTIVE</span>
        </div>
      </div>

      {/* Nodes Graphic Layout */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center my-6">
        {nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <div
              onMouseEnter={() => setActiveNode(node.id)}
              onMouseLeave={() => setActiveNode(null)}
              className={`p-6 border-2 transition-all duration-300 cursor-pointer relative bg-surface ${
                activeNode === node.id
                  ? 'border-textDark bg-neon-yellow/20 shadow-xl scale-105'
                  : 'border-borderDark hover:border-textDark'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-textMuted uppercase tracking-widest mb-3 font-bold">
                <span>{node.title}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-textDark" />
              </div>

              <div className="text-lg font-extrabold text-textDark tracking-tight mb-1">{node.name}</div>
              <div className="text-xs text-textDark font-bold mb-4">{node.domain}</div>

              <div className="pt-3 border-t border-borderDark text-[11px] text-textMuted flex items-center justify-between font-bold">
                <span>STATUS:</span>
                <span className="text-textDark bg-neon-green/30 px-2 py-0.5">VERIFIED ✓</span>
              </div>

              {/* Hover Popover */}
              {activeNode === node.id && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-surface border-2 border-textDark p-3 z-30 text-xs text-textDark shadow-2xl animate-fadeIn">
                  <div className="font-extrabold text-textDark mb-1">NODE TELEMETRY</div>
                  <div className="text-[11px] text-textMuted leading-relaxed">{node.details}</div>
                </div>
              )}
            </div>

            {/* Signal Flow Line */}
            {i < 2 && (
              <div className="hidden md:flex flex-col items-center justify-center my-4 md:my-0 relative">
                <div className="w-full h-[2px] bg-borderDark relative overflow-hidden">
                  <div className="absolute top-0 bottom-0 w-16 bg-gradient-to-r from-textDark via-neon-yellow to-textDark animate-dash-flow shadow-sm" />
                </div>
                <div className="text-[9px] text-textMuted uppercase tracking-widest mt-2 flex items-center gap-1 font-bold">
                  <Lock className="w-3 h-3 text-textDark" />
                  <span>SECURE CHANNEL</span>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Mediation Status Footer */}
      <div className="relative z-10 mt-8 pt-6 border-t border-borderDark grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-mono text-xs text-textMuted">
        <div className="p-3 bg-pitch border border-borderDark">
          <div className="text-textDark font-extrabold">✓ IDENTITY</div>
          <div className="text-[10px] text-textMuted mt-1">100% REGISTRY MATCH</div>
        </div>
        <div className="p-3 bg-pitch border border-borderDark">
          <div className="text-textDark font-extrabold">✓ DOMAIN</div>
          <div className="text-[10px] text-textMuted mt-1">ZERO TYPOSQUATTING</div>
        </div>
        <div className="p-3 bg-pitch border border-borderDark">
          <div className="text-textDark font-extrabold">✓ RISK SCAN</div>
          <div className="text-[10px] text-textMuted mt-1">NO ACTIVE REPORTS</div>
        </div>
        <div className="p-3 bg-pitch border border-borderDark">
          <div className="text-textDark font-extrabold">⚡ MONITORED</div>
          <div className="text-[10px] text-textMuted mt-1">LIVE DISPATCH RADAR</div>
        </div>
      </div>
    </div>
  );
}
