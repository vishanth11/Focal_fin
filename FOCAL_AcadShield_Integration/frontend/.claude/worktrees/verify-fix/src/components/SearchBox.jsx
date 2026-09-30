import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Terminal } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SearchBox({ initialValue = '', onSearch }) {
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const { setActiveSearchQuery } = useApp();

  useEffect(() => {
    if (initialValue) setQuery(initialValue);
  }, [initialValue]);

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    setActiveSearchQuery(trimmed);
    if (onSearch) {
      onSearch(trimmed);
    } else {
      navigate(`/check?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const presetQueries = [
    { label: 'technova.com', tag: 'VERIFIED ENTITY', color: 'border-textDark text-textDark bg-surface' },
    { label: 'companny.com', tag: 'LOOKALIKE ALERT', color: 'border-risk-high text-risk-high bg-risk-high/5' },
    { label: 'quickhire-jobs.xyz', tag: 'HIGH RISK', color: 'border-textDark text-textDark bg-surface' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 font-mono">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`relative border transition-all duration-300 bg-surface p-2 sm:p-3 shadow-md ${
            isFocused
              ? 'border-2 border-textDark shadow-xl bg-surface'
              : 'border-borderDark hover:border-textDark/60'
          }`}
        >
          {/* Top terminal bar */}
          <div className="flex items-center justify-between px-3 py-1 mb-2 border-b border-borderDark text-[10px] text-textMuted uppercase tracking-widest font-bold">
            <div className="flex items-center gap-2">
              <Terminal className={`w-3.5 h-3.5 ${isFocused ? 'text-textDark animate-pulse' : 'text-textMuted'}`} />
              <span>TERMINAL ID // SCAN_CHANNEL_01</span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <span className={isFocused ? 'text-textDark font-extrabold' : ''}>
                INPUT: {isFocused ? 'ACTIVE' : 'IDLE'}
              </span>
              <span>ENGINE: READY</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1 flex items-center">
              <Search className={`w-5 h-5 ml-3 mr-3 transition-colors ${isFocused ? 'text-textDark' : 'text-textMuted'}`} />
              <input
                id="company-search-input"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="ENTER COMPANY, WEBSITE, DOMAIN OR EMAIL..."
                className="w-full bg-transparent py-3 pr-4 text-textDark text-sm sm:text-base font-mono placeholder:text-textMuted/60 focus:outline-none tracking-wide font-bold"
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-neon-yellow text-textDark font-extrabold text-sm uppercase tracking-wider border-2 border-textDark hover:bg-neon-green transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span>ANALYZE</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Focus metadata panel */}
        {isFocused && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-surface border-2 border-textDark p-3 z-30 font-mono text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-2 text-textMuted shadow-2xl animate-fadeIn">
            <div className="text-textDark font-extrabold">✓ IDENTITY ENGINE // READY</div>
            <div className="text-textDark font-extrabold">⚡ DOMAIN ENGINE // READY</div>
            <div className="text-textDark font-extrabold">🔒 RISK ENGINE // READY</div>
            <div className="text-textMuted">📡 RADAR // 100% ACTIVE</div>
          </div>
        )}
      </form>

      {/* Preset demo triggers */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-[11px] font-mono text-textMuted uppercase tracking-wider mr-1 font-bold">
          TRY DEMO TARGETS:
        </span>
        {presetQueries.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setQuery(p.label);
              setActiveSearchQuery(p.label);
              navigate(`/check?q=${encodeURIComponent(p.label)}`);
            }}
            className={`px-3 py-1 border ${p.color} text-[11px] font-mono hover:bg-neon-yellow/30 transition-all duration-200 flex items-center gap-1.5 shadow-sm`}
          >
            <span className="font-bold">{p.label}</span>
            <span className="text-[9px] font-extrabold opacity-75">[{p.tag}]</span>
          </button>
        ))}
      </div>
    </div>
  );
}
