import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, AlertTriangle, RefreshCw, Coins, ExternalLink } from 'lucide-react';
import {
  getCompanies,
  getAdminReports,
  getAdminStats,
  reviewReport,
  approveCompany,
  adminMintBadge,
  rejectCompany,
  revokeCompany,
  verifyCompanyGST
} from '../services/api';
import { amoyTxUrl } from '../services/blockchain';
import { demoActivityFeed } from '../data/demoData';
import { useApp } from '../context/AppContext';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [companies, setCompanies] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [activityLogs, setActivityLogs] = useState(demoActivityFeed);
  const [loading, setLoading] = useState(true);
  // Per-company busy flags so async actions can't be double-fired.
  const [busyId, setBusyId] = useState(null);

  const { isAdmin, logoutAdmin, showToast } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }
    fetchAdminData();
  }, [isAdmin]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const compRes = await getCompanies();
      const repRes = await getAdminReports();
      const statRes = await getAdminStats();

      if (compRes.companies) setCompanies(compRes.companies);
      if (repRes.reports) setReports(repRes.reports);
      if (statRes.stats) setStats(statRes.stats);
    } catch (err) {
      showToast(`Failed to load admin data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setBusyId(id);
    try {
      const res = await approveCompany(id);
      const updated = res.company;
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));

      if (res.mintError) {
        // Admin verification SUCCEEDED — only the on-chain badge failed.
        // The company stays verified; MINT BADGE can retry safely.
        showToast('Company verified, but the blockchain badge could not be minted.', 'warning');
        setActivityLogs((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            text: `ADMIN_VERIFY: Company ${id} VERIFIED — badge mint FAILED (${res.mintError})`,
            type: 'danger'
          },
          ...prev
        ]);
      } else {
        showToast(`Company VERIFIED — soulbound badge minted on-chain (token #${res.badge?.tokenId})`, 'success');
        setActivityLogs((prev) => [
          {
            time: new Date().toLocaleTimeString(),
            text: `ADMIN_VERIFY: Company ${id} VERIFIED — badge token #${res.badge?.tokenId} minted on Polygon Amoy`,
            type: 'success'
          },
          ...prev
        ]);
      }
    } catch (err) {
      showToast(`Approval failed: ${err.message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    setBusyId(id);
    try {
      const res = await rejectCompany(id);
      const updated = res.company;
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      showToast(`Company registration rejected — record kept for audit.`, 'danger');
      setActivityLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `ADMIN_REJECT: Company ${id} registration rejected (record preserved)`,
          type: 'danger'
        },
        ...prev
      ]);
    } catch (err) {
      showToast(`Reject failed: ${err.message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleMintBadge = async (id) => {
    setBusyId(id);
    try {
      const res = await adminMintBadge(id);
      const updated = res.company;
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      showToast(
        res.alreadyMinted
          ? 'Badge already minted — showing the existing on-chain badge.'
          : `FOCAL badge minted on-chain (token #${res.badge?.tokenId})`,
        'success'
      );
      setActivityLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `ADMIN_MINT: Badge token #${res.badge?.tokenId} minted for company ${id} on Polygon Amoy`,
          type: 'success'
        },
        ...prev
      ]);
    } catch (err) {
      showToast(`Badge mint failed: ${err.message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (id) => {
    setBusyId(id);
    try {
      const res = await revokeCompany(id);
      const updated = res.company;
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
      showToast(`Revoked verification for ID: ${id}`, 'danger');
      setActivityLogs((prev) => [
        { time: new Date().toLocaleTimeString(), text: `ADMIN_REVOKE: Verification badge revoked for ${id}`, type: 'danger' },
        ...prev
      ]);
    } catch (err) {
      showToast(`Revoke failed: ${err.message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleVerifyGST = async (company) => {
    if (!company.gst?.gstin) {
      showToast('No GSTIN is recorded for this company.', 'warning');
      return;
    }
    try {
      const res = await verifyCompanyGST(company.id, company.gst.gstin);
      setCompanies((prev) => prev.map((item) => (item.id === company.id ? res.company : item)));
      showToast(`GST verification updated for ${company.name}`, 'success');
    } catch (err) {
      showToast(`GST verification failed: ${err.message}`, 'error');
    }
  };

  const handleReviewReport = async (repId, action) => {
    try {
      await reviewReport(repId, { action });
      setReports((prev) =>
        prev.map((r) => (r.id === repId ? { ...r, status: action === 'approve' ? 'ACCEPTED' : 'REJECTED' } : r))
      );
      showToast(`Report ${repId} ${action === 'approve' ? 'Accepted & Flagged' : 'Dismissed'}`, 'info');
    } catch (err) {
      showToast(`Report review failed: ${err.message}`, 'error');
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-mono space-y-8 text-textDark">
      {/* Top Admin Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-borderDark pb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 text-textDark text-xs font-bold uppercase tracking-wider mb-1">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
            <span>ADMINISTRATOR CONTROL WORKSPACE</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-textDark tracking-tight">
            FOCAL. OPERATIONS DASHBOARD
          </h1>
        </div>

        <button
          onClick={logoutAdmin}
          className="px-4 py-2 bg-pitch border border-risk-high text-risk-high hover:bg-risk-high hover:text-white font-bold text-xs uppercase transition-all flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>EXIT ADMIN CONSOLE</span>
        </button>
      </div>

      {/* OVERVIEW STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="p-4 bg-surface border border-borderDark text-center shadow-sm">
          <div className="text-2xl font-extrabold text-textDark">{companies.length}</div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">TOTAL COMPANIES</div>
        </div>
        <div className="p-4 bg-surface border border-borderDark text-center shadow-sm">
          <div className="text-2xl font-extrabold text-textDark">
            {companies.filter((c) => c.status === 'verified').length}
          </div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">VERIFIED</div>
        </div>
        <div className="p-4 bg-surface border border-borderDark text-center shadow-sm">
          <div className="text-2xl font-extrabold text-textDark">
            {companies.filter((c) => c.status === 'pending').length}
          </div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">PENDING REVIEW</div>
        </div>
        <div className="p-4 bg-surface border border-borderDark text-center shadow-sm">
          <div className="text-2xl font-extrabold text-risk-high">
            {companies.filter((c) => c.status === 'suspicious' || c.status === 'revoked').length}
          </div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">SUSPICIOUS / REVOKED</div>
        </div>
        <div className="p-4 bg-surface border border-borderDark text-center shadow-sm">
          <div className="text-2xl font-extrabold text-textDark">{reports.length}</div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">USER REPORTS</div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-borderDark gap-2 overflow-x-auto">
        {['overview', 'companies', 'reports', 'risk'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-xs font-extrabold uppercase transition-all ${
              activeTab === tab
                ? 'bg-neon-yellow text-textDark border-2 border-textDark shadow-sm'
                : 'text-textMuted hover:text-textDark bg-surface border border-borderDark'
            }`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-surface border border-borderDark p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-textDark uppercase border-b border-borderDark pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-textDark" />
              <span>LIVE SYSTEM TELEMETRY & ACTIVITY FEED</span>
            </h3>

            <div className="space-y-2 bg-pitch p-4 border border-borderDark h-80 overflow-y-auto font-mono text-xs">
              {activityLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-3 py-1 border-b border-borderDark/40">
                  <span className="text-textMuted text-[10px] font-bold">{log.time}</span>
                  <span
                    className={
                      log.type === 'danger'
                        ? 'text-risk-high font-extrabold'
                        : 'text-textDark font-bold'
                    }
                  >
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-borderDark p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-textDark uppercase border-b border-borderDark pb-2">
              ADMINISTRATIVE QUEUE
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-pitch border border-borderDark flex items-center justify-between">
                <span>Pending Verification Audits</span>
                <span className="text-textDark font-extrabold">1 Company</span>
              </div>
              <div className="p-3 bg-pitch border border-risk-high flex items-center justify-between">
                <span>Unreviewed Risk Reports</span>
                <span className="text-risk-high font-extrabold">2 Reports</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY MANAGEMENT */}
      {activeTab === 'companies' && (
        <div className="bg-surface border border-borderDark p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-extrabold text-textDark uppercase border-b border-borderDark pb-3">
            COMPANY ENTITY MANAGEMENT
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-borderDark text-textMuted font-bold">
                  <th className="p-3">COMPANY NAME</th>
                  <th className="p-3">DOMAIN</th>
                  <th className="p-3">EMAIL</th>
                  <th className="p-3">WALLET</th>
                  <th className="p-3">TRUST SCORE</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3">GST</th>
                  <th className="p-3">BLOCKCHAIN BADGE</th>
                  <th className="p-3">CREATED</th>
                  <th className="p-3 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark">
                {companies.map((c) => {
                  const hasBadge = c.blockchain?.tokenId != null;
                  const isVerified = c.status === 'verified';
                  const isBusy = busyId === c.id;
                  return (
                  <tr key={c.id} className="hover:bg-pitch">
                    <td className="p-3 font-extrabold text-textDark">
                      {c.name}
                      {c.demoMode && (
                        <span className="ml-1 px-1.5 py-0.5 text-[9px] font-black uppercase border bg-neon-yellow/30 border-textDark">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-textDark font-bold underline">{c.domain}</td>
                    <td className="p-3 text-textMuted font-bold">{c.email || '—'}</td>
                    <td className="p-3 font-mono text-[10px] text-textMuted break-all">
                      {c.blockchain?.walletAddress || '—'}
                    </td>
                    <td className="p-3 font-extrabold">{c.trustScore}/100</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-extrabold border ${
                          isVerified
                            ? 'bg-neon-green/30 text-textDark border-textDark'
                            : 'bg-risk-high/10 text-risk-high border-risk-high'
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-bold">
                      {c.gst?.status === 'verified' && !c.gst?.simulated ? 'VERIFIED' : c.gst?.status?.toUpperCase() || 'NOT_PROVIDED'}
                    </td>
                    <td className="p-3 font-bold">
                      {hasBadge ? (
                        <span className="flex flex-col gap-0.5">
                          <span className="text-textDark font-extrabold">TOKEN #{c.blockchain.tokenId}</span>
                          {c.blockchain.txHash && (
                            <a
                              href={amoyTxUrl(c.blockchain.txHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-textMuted underline flex items-center gap-1 hover:text-textDark"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {c.blockchain.txHash.slice(0, 10)}...{c.blockchain.txHash.slice(-6)}
                            </a>
                          )}
                        </span>
                      ) : isVerified ? (
                        <span className="text-neon-yellow font-extrabold">PENDING MINT</span>
                      ) : (
                        <span className="text-textMuted">—</span>
                      )}
                    </td>
                    <td className="p-3 text-[10px] text-textMuted font-bold">
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      {c.gst?.gstin && c.gst?.status !== 'verified' && (
                        <button
                          onClick={() => handleVerifyGST(c)}
                          disabled={isBusy}
                          className="px-3 py-1 bg-surface border border-textDark text-textDark font-extrabold text-[10px] uppercase hover:bg-neon-yellow disabled:opacity-50"
                        >
                          VERIFY GST
                        </button>
                      )}
                      {!isVerified && (
                        <button
                          onClick={() => handleApprove(c.id)}
                          disabled={isBusy}
                          className="px-3 py-1 bg-neon-yellow border border-textDark text-textDark font-extrabold text-[10px] uppercase hover:bg-neon-green disabled:opacity-50"
                        >
                          {isBusy ? <RefreshCw className="w-3 h-3 animate-spin inline" /> : 'VERIFY'}
                        </button>
                      )}
                      {/* MINT BADGE is available ONLY for a VERIFIED company without
                          an existing badge — the controller enforces this too. */}
                      {isVerified && !hasBadge && (
                        <button
                          onClick={() => handleMintBadge(c.id)}
                          disabled={isBusy}
                          className="px-3 py-1 bg-neon-green border border-textDark text-textDark font-extrabold text-[10px] uppercase hover:bg-neon-yellow disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {isBusy ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Coins className="w-3 h-3" />
                          )}
                          MINT BADGE
                        </button>
                      )}
                      {!isVerified && c.status !== 'rejected' && c.status !== 'revoked' && (
                        <button
                          onClick={() => handleReject(c.id)}
                          disabled={isBusy}
                          className="px-3 py-1 bg-surface border border-risk-high text-risk-high font-extrabold text-[10px] uppercase hover:bg-risk-high hover:text-white disabled:opacity-50"
                        >
                          REJECT
                        </button>
                      )}
                      {hasBadge && c.status !== 'revoked' && (
                        <button
                          onClick={() => handleRevoke(c.id)}
                          disabled={isBusy}
                          className="px-3 py-1 bg-risk-high text-white font-extrabold text-[10px] uppercase hover:opacity-90 disabled:opacity-50"
                        >
                          REVOKE
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: REPORT MANAGEMENT */}
      {activeTab === 'reports' && (
        <div className="bg-surface border border-borderDark p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-extrabold text-textDark uppercase border-b border-borderDark pb-3">
            USER RISK REPORTS REVIEW
          </h3>

          <div className="space-y-4">
            {reports.map((r) => (
              <div key={r.id} className="p-4 bg-pitch border border-borderDark space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-borderDark pb-2">
                  <div className="text-sm font-extrabold text-textDark">
                    {r.companyName} <span className="text-textDark font-bold underline">({r.domain})</span>
                  </div>
                  <div className="text-[10px] text-textMuted font-bold">DATE: {r.date}</div>
                </div>

                <div className="text-xs text-textMuted leading-relaxed font-bold">
                  <strong className="text-textDark">CATEGORY:</strong> {r.category} |{' '}
                  <strong className="text-textDark">REPORTER:</strong> {r.reporterName} ({r.reporterEmail})
                </div>

                <p className="text-xs text-textDark font-semibold bg-surface p-3 border border-borderDark">
                  {r.description}
                </p>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] text-textDark font-extrabold">STATUS: {r.status}</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleReviewReport(r.id, 'approve')}
                      className="px-3 py-1 bg-risk-high text-white font-extrabold text-[10px] uppercase"
                    >
                      ACCEPT & FLAG RISK
                    </button>
                    <button
                      onClick={() => handleReviewReport(r.id, 'dismiss')}
                      className="px-3 py-1 bg-surface border border-textDark text-textDark font-extrabold text-[10px] uppercase"
                    >
                      DISMISS
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: RISK MONITORING */}
      {activeTab === 'risk' && (
        <div className="bg-surface border-2 border-risk-high p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-extrabold text-risk-high uppercase border-b border-borderDark pb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>RISK & TYPOSQUATTING MONITORING RADAR</span>
          </h3>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-pitch border border-risk-high space-y-2">
              <div className="text-risk-high font-extrabold uppercase">HIGH RISK ALERT: companny.com</div>
              <p className="text-textMuted font-semibold">
                Automated typosquatting detection matched 98% Levenshtein similarity to verified domain <span className="text-textDark font-bold underline">company.com</span>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
