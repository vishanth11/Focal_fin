import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Coins,
  ExternalLink,
  Building2,
  GraduationCap,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Award,
  FileText
} from 'lucide-react';
import {
  getCompanies,
  getAdminReports,
  getAdminStats,
  reviewReport,
  approveCompany,
  adminMintBadge,
  rejectCompany,
  revokeCompany,
  verifyCompanyGST,
  adminListUniversities,
  adminApproveUniversity,
  adminRejectUniversity,
  adminSuspendUniversity,
  adminReinstateUniversity,
  adminGetAcademicOversight
} from '../services/api';
import { amoyTxUrl } from '../services/blockchain';
import { demoActivityFeed } from '../data/demoData';
import { useApp } from '../context/AppContext';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [companies, setCompanies] = useState([]);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [academicOversight, setAcademicOversight] = useState(null);
  const [uniFilter, setUniFilter] = useState('all');
  const [activityLogs, setActivityLogs] = useState(demoActivityFeed);
  const [loading, setLoading] = useState(true);
  // Per-company / per-institution busy flags so async actions can't be double-fired.
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
      const [compRes, repRes, statRes, uniRes, acadRes] = await Promise.all([
        getCompanies().catch(() => ({ companies: [] })),
        getAdminReports().catch(() => ({ reports: [] })),
        getAdminStats().catch(() => ({ stats: null })),
        adminListUniversities().catch(() => ({ data: { universities: [] } })),
        adminGetAcademicOversight().catch(() => ({ data: null }))
      ]);

      if (compRes?.companies) setCompanies(compRes.companies);
      if (repRes?.reports) setReports(repRes.reports);
      if (statRes?.stats) setStats(statRes.stats);
      if (uniRes?.data?.universities) setUniversities(uniRes.data.universities);
      if (acadRes?.data) setAcademicOversight(acadRes.data);
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

  const handleApproveUniversity = async (id) => {
    setBusyId(id);
    try {
      const res = await adminApproveUniversity(id);
      setUniversities((prev) =>
        prev.map((u) => ((u._id || u.id) === id ? { ...u, status: 'approved', verificationStatus: 'approved' } : u))
      );
      showToast(`University approved successfully: ${res.university?.name || id}`, 'success');
      setActivityLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `ADMIN_GOVERNANCE: Approved academic institution ${res.university?.name || id}`,
          type: 'success'
        },
        ...prev
      ]);
    } catch (err) {
      showToast(`University approval failed: ${err.message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectUniversity = async (id) => {
    const reason = prompt('Please enter rejection reason:', 'Incomplete institutional accreditation documentation');
    if (reason === null) return;
    setBusyId(id);
    try {
      const res = await adminRejectUniversity(id, reason);
      setUniversities((prev) =>
        prev.map((u) => ((u._id || u.id) === id ? { ...u, status: 'rejected', verificationStatus: 'rejected', rejectionReason: reason } : u))
      );
      showToast(`University application rejected`, 'danger');
      setActivityLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `ADMIN_GOVERNANCE: Rejected institution application ${id}`,
          type: 'danger'
        },
        ...prev
      ]);
    } catch (err) {
      showToast(`University rejection failed: ${err.message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleSuspendUniversity = async (id) => {
    const reason = prompt('Please enter reason for institutional suspension:', 'Pending compliance audit');
    if (reason === null) return;
    setBusyId(id);
    try {
      const res = await adminSuspendUniversity(id, reason);
      setUniversities((prev) =>
        prev.map((u) => ((u._id || u.id) === id ? { ...u, status: 'suspended', verificationStatus: 'suspended' } : u))
      );
      showToast(`University suspended from credential issuance`, 'warning');
      setActivityLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `ADMIN_GOVERNANCE: Suspended institution ${id}`,
          type: 'danger'
        },
        ...prev
      ]);
    } catch (err) {
      showToast(`Suspension failed: ${err.message}`, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleReinstateUniversity = async (id) => {
    setBusyId(id);
    try {
      const res = await adminReinstateUniversity(id);
      setUniversities((prev) =>
        prev.map((u) => ((u._id || u.id) === id ? { ...u, status: 'approved', verificationStatus: 'approved' } : u))
      );
      showToast(`University reinstated as authorized issuer`, 'success');
      setActivityLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          text: `ADMIN_GOVERNANCE: Reinstated academic institution ${id}`,
          type: 'success'
        },
        ...prev
      ]);
    } catch (err) {
      showToast(`Reinstate failed: ${err.message}`, 'error');
    } finally {
      setBusyId(null);
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
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="p-4 bg-surface border border-borderDark text-center shadow-sm">
          <div className="text-2xl font-extrabold text-textDark">{companies.length}</div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">TOTAL COMPANIES</div>
        </div>
        <div className="p-4 bg-surface border border-borderDark text-center shadow-sm">
          <div className="text-2xl font-extrabold text-textDark">
            {companies.filter((c) => c.status === 'verified').length}
          </div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">VERIFIED CO'S</div>
        </div>
        <div className="p-4 bg-surface border border-borderDark text-center shadow-sm">
          <div className="text-2xl font-extrabold text-brand-primary">
            {universities.filter((u) => (u.status || u.verificationStatus) === 'approved').length} / {universities.length}
          </div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">APPROVED UNIVERSITIES</div>
        </div>
        <div className="p-4 bg-surface border border-borderDark text-center shadow-sm">
          <div className="text-2xl font-extrabold text-textDark">
            {academicOversight?.stats?.totalCredentials || 0}
          </div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">ACADEMIC VCs ISSUED</div>
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
        {[
          { id: 'overview', label: 'OVERVIEW' },
          { id: 'companies', label: `COMPANIES (${companies.length})` },
          { id: 'universities', label: `UNIVERSITIES (${universities.length})` },
          { id: 'academic', label: 'ACADEMIC VCs & OVERSIGHT' },
          { id: 'reports', label: 'REPORTS' },
          { id: 'risk', label: 'RISK RADAR' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-xs font-extrabold uppercase transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-neon-yellow text-textDark border-2 border-textDark shadow-sm'
                : 'text-textMuted hover:text-textDark bg-surface border border-borderDark'
            }`}
          >
            {tab.label}
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

      {/* TAB: UNIVERSITIES MANAGEMENT */}
      {activeTab === 'universities' && (
        <div className="bg-surface border border-borderDark p-6 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-borderDark pb-4 gap-4">
            <div>
              <h3 className="text-base font-extrabold text-textDark uppercase flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-primary" />
                <span>ACADEMIC INSTITUTIONS & UNIVERSITIES GOVERNANCE</span>
              </h3>
              <p className="text-xs text-textMuted mt-1">
                Review institution onboarding applications, manage accreditation approval, and control authorized issuer status.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'approved', 'suspended', 'rejected'].map((filterVal) => (
                <button
                  key={filterVal}
                  onClick={() => setUniFilter(filterVal)}
                  className={`px-3 py-1.5 text-[11px] font-bold uppercase transition-all ${
                    uniFilter === filterVal
                      ? 'bg-textDark text-white'
                      : 'bg-pitch border border-borderDark text-textMuted hover:text-textDark'
                  }`}
                >
                  {filterVal} (
                  {filterVal === 'all'
                    ? universities.length
                    : universities.filter(
                        (u) => (u.status || u.verificationStatus || 'pending') === filterVal
                      ).length}
                  )
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-pitch text-textMuted uppercase border-b border-borderDark text-[10px]">
                <tr>
                  <th className="p-3">INSTITUTION DETAILS</th>
                  <th className="p-3">TYPE & RECOGNITION</th>
                  <th className="p-3">CONTACT & REP</th>
                  <th className="p-3">WALLET & DID</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3 text-right">GOVERNANCE ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark">
                {universities
                  .filter((u) => {
                    const currentStatus = u.status || u.verificationStatus || 'pending';
                    return uniFilter === 'all' ? true : currentStatus === uniFilter;
                  })
                  .map((u) => {
                    const uniId = u._id || u.id;
                    const isBusy = busyId === uniId;
                    const currentStatus = u.status || u.verificationStatus || 'pending';
                    const isApproved = currentStatus === 'approved';
                    const isPending = currentStatus === 'pending';
                    const isSuspended = currentStatus === 'suspended';
                    const isRejected = currentStatus === 'rejected';

                    return (
                      <tr key={uniId} className="hover:bg-pitch transition-colors">
                        <td className="p-3">
                          <div className="font-extrabold text-textDark text-sm">{u.name}</div>
                          <div className="text-[10px] text-textMuted">
                            {u.website ? (
                              <a
                                href={u.website}
                                target="_blank"
                                rel="noreferrer"
                                className="underline hover:text-textDark inline-flex items-center gap-1"
                              >
                                {u.website} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              'No website'
                            )}
                          </div>
                          <div className="text-[10px] text-textMuted">{u.address}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-textDark uppercase">{u.institutionType || 'University'}</div>
                          <div className="text-[10px] text-textMuted">REC: {u.recognitionId || 'N/A'}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-textDark">{u.authorizedRepresentative?.name || 'N/A'}</div>
                          <div className="text-[10px] text-textMuted">{u.authorizedRepresentative?.designation}</div>
                          <div className="text-[10px] text-textMuted">{u.email}</div>
                          <div className="text-[10px] text-textMuted">{u.phone}</div>
                        </td>
                        <td className="p-3 font-mono">
                          <div className="text-[10px] text-textDark truncate max-w-[140px]" title={u.walletAddress}>
                            {u.walletAddress ? `${u.walletAddress.slice(0, 8)}...${u.walletAddress.slice(-6)}` : 'No wallet'}
                          </div>
                          <div className="text-[9px] text-textMuted truncate max-w-[140px]" title={u.issuerDid}>
                            {u.issuerDid || 'DID auto-assigned'}
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 text-[10px] font-extrabold uppercase border inline-block ${
                              isApproved
                                ? 'bg-neon-green/20 text-textDark border-neon-green'
                                : isPending
                                ? 'bg-neon-yellow/30 text-textDark border-neon-yellow animate-pulse'
                                : isSuspended
                                ? 'bg-risk-high/20 text-risk-high border-risk-high'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }`}
                          >
                            {currentStatus}
                          </span>
                          {u.rejectionReason && (
                            <div className="text-[9px] text-risk-high mt-1 max-w-[120px] truncate" title={u.rejectionReason}>
                              {u.rejectionReason}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleApproveUniversity(uniId)}
                                disabled={isBusy}
                                className="px-3 py-1.5 bg-neon-green border border-textDark text-textDark font-extrabold text-[10px] uppercase hover:bg-neon-yellow disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                {isBusy ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                                APPROVE
                              </button>
                              <button
                                onClick={() => handleRejectUniversity(uniId)}
                                disabled={isBusy}
                                className="px-3 py-1.5 bg-surface border border-risk-high text-risk-high font-extrabold text-[10px] uppercase hover:bg-risk-high hover:text-white disabled:opacity-50 inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                REJECT
                              </button>
                            </>
                          )}
                          {isApproved && (
                            <button
                              onClick={() => handleSuspendUniversity(uniId)}
                              disabled={isBusy}
                              className="px-3 py-1.5 bg-surface border border-risk-high text-risk-high font-extrabold text-[10px] uppercase hover:bg-risk-high hover:text-white disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              SUSPEND
                            </button>
                          )}
                          {isSuspended && (
                            <button
                              onClick={() => handleReinstateUniversity(uniId)}
                              disabled={isBusy}
                              className="px-3 py-1.5 bg-neon-green border border-textDark text-textDark font-extrabold text-[10px] uppercase hover:bg-neon-yellow disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              REINSTATE
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                {universities.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-textMuted italic">
                      No university applications found in registry.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: ACADEMIC CREDENTIAL OVERSIGHT */}
      {activeTab === 'academic' && (
        <div className="bg-surface border border-borderDark p-6 space-y-6 shadow-sm">
          <div className="border-b border-borderDark pb-4">
            <h3 className="text-base font-extrabold text-textDark uppercase flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-brand-primary" />
              <span>ACADEMIC VERIFIABLE CREDENTIALS (VC) OVERSIGHT</span>
            </h3>
            <p className="text-xs text-textMuted mt-1">
              Cross-institutional audit metrics, W3C Verifiable Credentials lifecycle monitoring, and smart contract anchoring.
            </p>
          </div>

          {/* Academic Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-pitch border border-borderDark text-center">
              <div className="text-2xl font-extrabold text-textDark">
                {academicOversight?.stats?.totalCredentials ?? 0}
              </div>
              <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">TOTAL ISSUED</div>
            </div>
            <div className="p-4 bg-pitch border border-borderDark text-center">
              <div className="text-2xl font-extrabold text-neon-green">
                {academicOversight?.stats?.activeCredentials ?? 0}
              </div>
              <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">ACTIVE CREDENTIALS</div>
            </div>
            <div className="p-4 bg-pitch border border-borderDark text-center">
              <div className="text-2xl font-extrabold text-risk-high">
                {academicOversight?.stats?.revokedCredentials ?? 0}
              </div>
              <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">REVOKED</div>
            </div>
            <div className="p-4 bg-pitch border border-borderDark text-center">
              <div className="text-2xl font-extrabold text-yellow-600">
                {academicOversight?.stats?.supersededCredentials ?? 0}
              </div>
              <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">SUPERSEDED</div>
            </div>
            <div className="p-4 bg-pitch border border-borderDark text-center">
              <div className="text-2xl font-extrabold text-brand-primary">
                {academicOversight?.stats?.blockchainAnchored ?? 0}
              </div>
              <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">ON-CHAIN ANCHORED</div>
            </div>
          </div>

          {/* Recent Credentials across Institutions */}
          <div className="space-y-3">
            <h4 className="text-xs font-extrabold text-textDark uppercase">
              RECENTLY ISSUED ACADEMIC CREDENTIALS
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-pitch text-textMuted uppercase border-b border-borderDark text-[10px]">
                  <tr>
                    <th className="p-3">CREDENTIAL ID</th>
                    <th className="p-3">STUDENT & ROLL</th>
                    <th className="p-3">DOCUMENT TYPE</th>
                    <th className="p-3">ISSUING UNIVERSITY</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3">BLOCKCHAIN REF</th>
                    <th className="p-3">ISSUED AT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderDark">
                  {academicOversight?.recentCredentials?.map((c) => (
                    <tr key={c._id || c.id} className="hover:bg-pitch transition-colors">
                      <td className="p-3 font-mono font-bold text-textDark">
                        {c.credentialId}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-textDark">{c.student?.name || 'N/A'}</div>
                        <div className="text-[10px] text-textMuted">{c.student?.enrollmentNumber || 'N/A'}</div>
                      </td>
                      <td className="p-3 uppercase font-bold text-textDark">
                        {c.documentType?.replace(/_/g, ' ')}
                      </td>
                      <td className="p-3 font-bold text-textDark">
                        {c.university?.name || 'University'}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 text-[9px] font-extrabold uppercase border ${
                            c.status === 'active'
                              ? 'bg-neon-green/20 text-textDark border-neon-green'
                              : c.status === 'revoked'
                              ? 'bg-risk-high/20 text-risk-high border-risk-high'
                              : 'bg-yellow-100 text-yellow-800 border-yellow-300'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[10px]">
                        {c.blockchain?.txHash ? (
                          <a
                            href={amoyTxUrl(c.blockchain.txHash)}
                            target="_blank"
                            rel="noreferrer"
                            className="underline text-brand-primary inline-flex items-center gap-1"
                          >
                            TX #{c.blockchain.txHash.slice(0, 8)}... <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        ) : c.blockchain?.simulated ? (
                          <span className="text-textMuted">SIMULATED AMOY</span>
                        ) : (
                          <span className="text-textMuted">—</span>
                        )}
                      </td>
                      <td className="p-3 text-[10px] text-textMuted">
                        {new Date(c.issuanceDate || c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(!academicOversight?.recentCredentials || academicOversight.recentCredentials.length === 0) && (
                    <tr>
                      <td colSpan="7" className="p-6 text-center text-textMuted italic">
                        No academic credentials recorded on the platform yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Audit Logs */}
          <div className="space-y-3 pt-4 border-t border-borderDark">
            <h4 className="text-xs font-extrabold text-textDark uppercase">
              INSTITUTIONAL AUDIT TRAIL LOGS
            </h4>
            <div className="space-y-2">
              {academicOversight?.auditLogs?.map((log, i) => (
                <div key={log._id || i} className="p-3 bg-pitch border border-borderDark flex flex-col sm:flex-row justify-between text-xs gap-2">
                  <div>
                    <span className="font-extrabold text-brand-primary uppercase mr-2">[{log.action}]</span>
                    <span className="text-textDark font-bold">{log.details || log.description}</span>
                  </div>
                  <div className="text-[10px] text-textMuted font-mono">
                    {new Date(log.timestamp || log.createdAt).toLocaleString()} | ACTOR: {log.actorRole || 'SYSTEM'}
                  </div>
                </div>
              ))}
              {(!academicOversight?.auditLogs || academicOversight.auditLogs.length === 0) && (
                <div className="p-4 text-center text-textMuted text-xs italic">
                  No audit log entries recorded yet.
                </div>
              )}
            </div>
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
