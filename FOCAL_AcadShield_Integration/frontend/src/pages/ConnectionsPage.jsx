import React, { useState, useEffect } from 'react';
import { Activity, Plus, Terminal } from 'lucide-react';
import NetworkVisualizer from '../components/NetworkVisualizer';
import { getConnections, requestConnection } from '../services/api';
import { useApp } from '../context/AppContext';

export default function ConnectionsPage() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transmissionStep, setTransmissionStep] = useState(0);
  const { showToast } = useApp();

  const [form, setForm] = useState({
    companyA: 'TechNova Solutions Pvt Ltd',
    domainA: 'technova.com',
    companyB: '',
    domainB: ''
  });

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    setLoading(true);
    const res = await getConnections();
    if (res.connections) setConnections(res.connections);
    setLoading(false);
  };

  const handleCreateConnection = async (e) => {
    e.preventDefault();
    if (!form.companyB || !form.domainB) {
      showToast('Please specify target company name and domain.', 'warning');
      return;
    }

    setSubmitting(true);
    setTransmissionStep(1);

    setTimeout(async () => {
      setTransmissionStep(2);
      const res = await requestConnection(form);
      if (res.connection) {
        setConnections((prev) => [res.connection, ...prev]);
        showToast(`Trusted Connection established with ${form.companyB}!`, 'success');
      }
      setTimeout(() => {
        setSubmitting(false);
        setTransmissionStep(0);
        setModalOpen(false);
        setForm({ companyA: 'TechNova Solutions Pvt Ltd', domainA: 'technova.com', companyB: '', domainB: '' });
      }, 1200);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-mono space-y-12 text-textDark">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-borderDark pb-6 gap-4">
        <div>
          <span className="text-xs text-textDark font-extrabold uppercase tracking-widest block mb-1">
            B2B TRUST MEDIATION PROTOCOL
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-textDark tracking-tight">
            TRUSTED BUSINESS CONNECTIONS
          </h1>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-6 py-3 bg-neon-yellow text-textDark border-2 border-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-green transition-all shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>REQUEST TRUSTED CONNECTION</span>
        </button>
      </div>

      {/* MEDIATION ARCHITECTURE DIAGRAM */}
      <NetworkVisualizer />

      {/* REQUIREMENTS CHECKLIST BANNER */}
      <div className="p-6 bg-surface border border-borderDark grid grid-cols-2 md:grid-cols-5 gap-4 text-center shadow-sm">
        <div className="p-3 bg-pitch border border-borderDark">
          <div className="text-textDark font-extrabold text-xs">✓ IDENTITY VERIFIED</div>
          <div className="text-[10px] text-textMuted mt-1">Registry Audit Passed</div>
        </div>
        <div className="p-3 bg-pitch border border-borderDark">
          <div className="text-textDark font-extrabold text-xs">✓ DOMAIN VERIFIED</div>
          <div className="text-[10px] text-textMuted mt-1">DNSSEC & MX Validated</div>
        </div>
        <div className="p-3 bg-pitch border border-borderDark">
          <div className="text-textDark font-extrabold text-xs">✓ RISK ANALYZED</div>
          <div className="text-[10px] text-textMuted mt-1">Zero Fraud Reports</div>
        </div>
        <div className="p-3 bg-pitch border border-borderDark">
          <div className="text-textDark font-extrabold text-xs">✓ TRUST SCORE</div>
          <div className="text-[10px] text-textMuted mt-1">Score Threshold &gt; 75</div>
        </div>
        <div className="p-3 bg-pitch border border-borderDark">
          <div className="text-textDark font-extrabold text-xs">✓ MONITORED</div>
          <div className="text-[10px] text-textMuted mt-1">Continuous Telemetry</div>
        </div>
      </div>

      {/* ACTIVE CONNECTIONS LIST */}
      <div className="space-y-4">
        <h3 className="text-xl font-extrabold text-textDark uppercase tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-textDark" />
          <span>ACTIVE MONITORED BUSINESS PAIRS</span>
        </h3>

        <div className="space-y-4">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="p-6 bg-surface border border-borderDark hover:border-textDark transition-all space-y-4 font-mono shadow-sm"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-borderDark pb-4">
                <div className="flex items-center gap-4 text-sm font-extrabold text-textDark">
                  <span>{conn.companyA}</span>
                  <span className="text-textDark bg-neon-yellow px-2 py-0.5 border border-textDark">➔ FOCAL. TRUST ➔</span>
                  <span>{conn.companyB}</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-textDark font-extrabold bg-neon-green/30 border border-textDark px-3 py-1">
                    {conn.status}
                  </span>
                  <span className="text-xs text-textMuted font-bold">ESTABLISHED: {conn.establishedDate}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px]">
                {conn.checksPassed?.map((check, i) => (
                  <span key={i} className="px-2.5 py-1 bg-pitch border border-borderDark text-textDark font-bold">
                    ✓ {check}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* REQUEST CONNECTION MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-pitch/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-textDark p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl font-mono relative">
            <div className="flex items-center justify-between border-b border-borderDark pb-3">
              <div className="text-sm font-extrabold text-textDark uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-textDark" />
                <span>ESTABLISH TRUSTED B2B CHANNEL</span>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-textDark font-extrabold text-base">✕</button>
            </div>

            {submitting ? (
              <div className="py-12 text-center space-y-6">
                <div className="w-12 h-12 border-4 border-textDark border-t-transparent rounded-full animate-spin mx-auto" />
                {transmissionStep === 1 && (
                  <div className="space-y-1">
                    <div className="text-textDark font-extrabold text-sm">REQUEST TRANSMITTED...</div>
                    <div className="text-xs text-textMuted">Transmitting encrypted handshake packet to FOCAL. mediator...</div>
                  </div>
                )}
                {transmissionStep === 2 && (
                  <div className="space-y-1">
                    <div className="text-textDark font-extrabold text-sm bg-neon-green/40 px-3 py-1 border border-textDark inline-block">
                      TRUST CHANNEL ESTABLISHED ✓
                    </div>
                    <div className="text-xs text-textMuted pt-2">Channel successfully active and monitored.</div>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateConnection} className="space-y-4">
                <div>
                  <label className="text-xs text-textMuted font-bold block uppercase mb-1">ORIGIN COMPANY (YOU):</label>
                  <input
                    type="text"
                    value={form.companyA}
                    onChange={(e) => setForm({ ...form, companyA: e.target.value })}
                    className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-textMuted font-bold block uppercase mb-1">TARGET COMPANY NAME:</label>
                  <input
                    type="text"
                    value={form.companyB}
                    onChange={(e) => setForm({ ...form, companyB: e.target.value })}
                    placeholder="e.g. Apex Cybernetics Inc"
                    className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-textMuted font-bold block uppercase mb-1">TARGET DOMAIN:</label>
                  <input
                    type="text"
                    value={form.domainB}
                    onChange={(e) => setForm({ ...form, domainB: e.target.value })}
                    placeholder="e.g. apexcyber.io"
                    className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
                    required
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-3 bg-pitch border border-borderDark text-textDark font-bold text-xs uppercase"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-neon-yellow text-textDark font-extrabold text-xs uppercase border-2 border-textDark hover:bg-neon-green transition-all"
                  >
                    TRANSMIT REQUEST →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
