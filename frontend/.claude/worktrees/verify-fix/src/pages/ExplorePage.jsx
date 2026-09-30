import React, { useState, useEffect } from 'react';
import { Search, Grid, Network, AlertTriangle } from 'lucide-react';
import CompanyCard from '../components/CompanyCard';
import { getCompanies } from '../services/api';
import { demoCompanies } from '../data/demoData';
import { Link } from 'react-router-dom';

export default function ExplorePage() {
  const [viewMode, setViewMode] = useState('grid');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [companies, setCompanies] = useState(demoCompanies);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    fetchCatalog();
  }, [filter, search]);

  const fetchCatalog = async () => {
    setLoading(true);
    const res = await getCompanies({ status: filter, search });
    if (res.companies) setCompanies(res.companies);
    setLoading(false);
  };

  const filterTabs = ['ALL', 'VERIFIED', 'PENDING', 'SUSPICIOUS', 'REVOKED'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-mono space-y-10 text-textDark">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-borderDark pb-6 gap-4">
        <div>
          <span className="text-xs text-textDark font-extrabold uppercase tracking-widest block mb-1">
            DIRECTORY & NETWORK MAP
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-textDark tracking-tight">
            EXPLORE TRUSTED BUSINESSES.
          </h1>
        </div>

        {/* View Switch */}
        <div className="flex items-center gap-1 bg-surface border-2 border-textDark p-1 shadow-sm">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold uppercase transition-all ${
              viewMode === 'grid'
                ? 'bg-neon-yellow text-textDark border border-textDark shadow-sm'
                : 'text-textMuted hover:text-textDark'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>LIST VIEW</span>
          </button>
          <button
            onClick={() => setViewMode('network')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold uppercase transition-all ${
              viewMode === 'network'
                ? 'bg-neon-yellow text-textDark border border-textDark shadow-sm'
                : 'text-textMuted hover:text-textDark'
            }`}
          >
            <Network className="w-4 h-4" />
            <span>NETWORK VIEW</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-surface border border-borderDark p-4 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-textMuted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="SEARCH BY NAME, DOMAIN, OR CATEGORY..."
            className="w-full bg-pitch border border-borderDark py-2 pl-9 pr-4 text-xs text-textDark font-bold placeholder:text-textMuted focus:outline-none focus:border-textDark"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab.toLowerCase())}
              className={`px-3 py-1.5 text-xs font-bold uppercase border transition-all ${
                filter === tab.toLowerCase()
                  ? 'bg-neon-green/40 text-textDark border-2 border-textDark font-extrabold'
                  : 'bg-pitch border-borderDark text-textMuted hover:text-textDark'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW 1: NETWORK VIEW */}
      {viewMode === 'network' && (
        <div className="bg-surface border-2 border-textDark p-8 min-h-[500px] relative overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between text-xs text-textMuted uppercase border-b border-borderDark pb-3 font-bold">
            <span>LIVE BUSINESS NETWORK RADAR</span>
            <span className="text-textDark font-extrabold">HOVER NODE TO INSPECT</span>
          </div>

          <div className="relative my-12 h-96 flex items-center justify-center">
            <div className="absolute inset-0 bg-tech-grid opacity-60 pointer-events-none" />

            <div className="w-28 h-28 rounded-full border-4 border-textDark bg-neon-yellow flex flex-col items-center justify-center text-center shadow-xl z-20">
              <span className="text-sm font-extrabold text-textDark">FOCAL.</span>
              <span className="text-[9px] text-textDark font-mono font-bold">MEDIATOR</span>
            </div>

            {companies.map((c, i) => {
              const angle = (i / companies.length) * (2 * Math.PI);
              const radius = 160;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              let color = '#111111';
              if (c.status === 'suspicious' || c.status === 'revoked') color = '#FF3B30';

              return (
                <React.Fragment key={c.id}>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
                    <line
                      x1="50%"
                      y1="50%"
                      x2={`calc(50% + ${x}px)`}
                      y2={`calc(50% + ${y}px)`}
                      stroke={color}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      className="opacity-60"
                    />
                  </svg>

                  <div
                    onMouseEnter={() => setSelectedNode(c)}
                    className="absolute z-30 cursor-pointer p-3 bg-surface border-2 border-textDark transition-all duration-300 hover:scale-125 shadow-md"
                    style={{
                      transform: `translate(${x}px, ${y}px)`
                    }}
                  >
                    <div className="w-3 h-3 rounded-full mb-1 bg-textDark" />
                    <div className="text-[10px] font-extrabold text-textDark max-w-[100px] truncate">{c.domain}</div>
                  </div>
                </React.Fragment>
              );
            })}

            {selectedNode && (
              <div className="absolute bottom-4 right-4 bg-surface border-2 border-textDark p-4 z-40 max-w-xs space-y-2 shadow-2xl animate-fadeIn font-mono">
                <div className="flex items-center justify-between text-xs border-b border-borderDark pb-1">
                  <span className="text-textDark font-extrabold">{selectedNode.name}</span>
                  <span className="text-textDark font-extrabold">{selectedNode.trustScore}/100</span>
                </div>
                <div className="text-[11px] text-textDark font-bold underline">{selectedNode.domain}</div>
                <div className="text-[10px] text-textMuted">{selectedNode.category}</div>
                <Link
                  to={`/company/${selectedNode.id}`}
                  className="block mt-2 py-1.5 text-center bg-neon-yellow text-textDark text-[10px] font-extrabold uppercase border border-textDark"
                >
                  INSPECT PROFILE →
                </Link>
              </div>
            )}
          </div>

          <div className="text-center text-xs text-textMuted font-bold">
            DISPLAYING <strong className="text-textDark">{companies.length}</strong> CONNECTED ENTITY NODES
          </div>
        </div>
      )}

      {/* VIEW 2: GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {companies.length > 0 ? (
            companies.map((c) => <CompanyCard key={c.id} company={c} />)
          ) : (
            <div className="col-span-3 text-center py-20 bg-surface border border-borderDark shadow-sm">
              <AlertTriangle className="w-8 h-8 text-textDark mx-auto mb-3" />
              <div className="text-sm font-extrabold text-textDark uppercase">NO MATCHING BUSINESSES FOUND</div>
              <div className="text-xs text-textMuted mt-1">Try clearing filters or changing search query.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
