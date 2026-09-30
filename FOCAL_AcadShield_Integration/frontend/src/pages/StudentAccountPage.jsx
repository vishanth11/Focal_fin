import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  LogOut,
  RefreshCw,
  FileCheck,
  QrCode,
  Share2,
  Lock,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Building2,
  Copy
} from 'lucide-react';
import {
  getStudentProfile,
  getStudentAcademicCredentials,
  studentShareCredential,
  getStudentCredentialShares,
  studentRevokeShare
} from '../services/api';
import { useApp } from '../context/AppContext';

function formatMemberSince(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function StudentAccountPage() {
  const navigate = useNavigate();
  const { studentProfile, studentToken, setStudentSession, logoutStudent, resetRole, showToast } = useApp();

  const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'profile' | 'shares'
  const [credentials, setCredentials] = useState([]);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [sharingCred, setSharingCred] = useState(null);
  const [companyDomain, setCompanyDomain] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [generatedShareToken, setGeneratedShareToken] = useState(null);

  const [viewingQR, setViewingQR] = useState(null);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const [credsRes, sharesRes] = await Promise.all([
        getStudentAcademicCredentials(),
        getStudentCredentialShares()
      ]);
      setCredentials(credsRes.credentials || []);
      setShares(sharesRes.shares || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentProfile || !studentToken) return undefined;
    getStudentProfile()
      .then((res) => {
        if (res.student) setStudentSession(studentToken, res.student);
      })
      .catch(() => {});
  }, [studentProfile, studentToken, setStudentSession]);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const handleShareSubmit = async (e) => {
    e.preventDefault();
    if (!sharingCred) return;

    try {
      const res = await studentShareCredential(sharingCred.credentialId, {
        companyDomain,
        companyName,
        expiresInDays
      });
      setGeneratedShareToken(res.share.shareToken);
      showToast('Credential authorization granted for employer.', 'success');
      fetchStudentData();
    } catch (err) {
      showToast(err.message || 'Failed to authorize share', 'error');
    }
  };

  const handleRevokeShare = async (shareId) => {
    try {
      await studentRevokeShare(shareId);
      showToast('Employer access revoked successfully.', 'info');
      fetchStudentData();
    } catch (err) {
      showToast(err.message || 'Revocation failed', 'error');
    }
  };

  const handleSignOut = () => {
    logoutStudent();
    navigate('/');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 font-mono text-textDark space-y-8">
      {/* Top Banner */}
      <div className="bg-surface border-2 border-textDark p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pitch border-2 border-textDark">
            <GraduationCap className="w-8 h-8 text-neon-green" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold uppercase">{studentProfile?.name || 'Student Account'}</span>
              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase bg-neon-green/20 text-neon-green border border-neon-green/40 rounded">
                STUDENT
              </span>
            </div>
            <p className="text-xs text-textMuted font-bold mt-0.5">{studentProfile?.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStudentData}
            className="p-2 bg-pitch border border-borderDark hover:border-textDark rounded"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-surface border-2 border-textDark text-xs font-extrabold uppercase hover:bg-neon-yellow transition-all flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>SIGN OUT</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-textDark space-x-2 text-xs font-extrabold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('credentials')}
          className={`px-5 py-3 border-t-2 border-l-2 border-r-2 border-textDark flex items-center gap-2 ${
            activeTab === 'credentials' ? 'bg-neon-yellow text-textDark' : 'bg-surface text-textMuted hover:bg-pitch'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>MY ACADEMIC CREDENTIALS ({credentials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('shares')}
          className={`px-5 py-3 border-t-2 border-l-2 border-r-2 border-textDark flex items-center gap-2 ${
            activeTab === 'shares' ? 'bg-neon-yellow text-textDark' : 'bg-surface text-textMuted hover:bg-pitch'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span>EMPLOYER CONSENT SHARES ({shares.filter(s => s.status === 'active').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-5 py-3 border-t-2 border-l-2 border-r-2 border-textDark flex items-center gap-2 ${
            activeTab === 'profile' ? 'bg-neon-yellow text-textDark' : 'bg-surface text-textMuted hover:bg-pitch'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>PROFILE & SETTINGS</span>
        </button>
      </div>

      {/* TAB 1: ACADEMIC CREDENTIALS */}
      {activeTab === 'credentials' && (
        <div className="bg-surface border-2 border-textDark p-6 shadow-md space-y-6">
          <div className="border-b border-borderDark pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">UNIVERSITY-ISSUED VERIFIABLE CREDENTIALS</h2>
            <p className="text-xs text-textMuted font-bold">
              Cryptographically signed academic certificates issued directly by your institution.
            </p>
          </div>

          {credentials.length === 0 ? (
            <div className="p-8 text-center bg-pitch border border-borderDark space-y-2">
              <FileCheck className="w-8 h-8 text-textMuted mx-auto" />
              <div className="text-xs font-bold text-textDark">NO ACADEMIC CREDENTIALS RECORDED YET</div>
              <p className="text-[11px] text-textMuted max-w-md mx-auto">
                Once your university issues your degree certificate, marksheets, or transcripts, they will appear here with cryptographic W3C proofs and QR codes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {credentials.map((c) => (
                <div key={c._id} className="p-5 bg-pitch border-2 border-textDark space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] text-textMuted uppercase font-bold">{c.documentType}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
                        c.status === 'active' ? 'bg-neon-green/20 text-neon-green border-neon-green' : 'bg-red-500/20 text-red-500 border-red-500'
                      }`}>
                        {c.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold uppercase text-textDark">{c.credentialTitle}</h3>
                    <div className="text-xs text-textMuted font-bold space-y-1">
                      <div>Issuer: <strong className="text-textDark">{c.universityId?.name || 'Verified University'}</strong></div>
                      <div>Enrollment ID: <code className="text-textDark">{c.enrollmentNumber}</code></div>
                      <div>SHA-256 Digest: <code className="text-[10px] break-all block">{c.documentHash}</code></div>
                      <div>Blockchain Status: <strong className="text-neon-green uppercase">{c.blockchain?.status}</strong></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-borderDark flex flex-wrap items-center gap-2 text-xs">
                    {c.qrCodeDataUrl && (
                      <button
                        onClick={() => setViewingQR(c)}
                        className="px-3 py-1.5 bg-surface border border-borderDark hover:border-textDark font-extrabold flex items-center gap-1.5"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>VIEW QR</span>
                      </button>
                    )}

                    <Link
                      to={`/verify/${c.credentialId}`}
                      target="_blank"
                      className="px-3 py-1.5 bg-surface border border-borderDark hover:border-textDark font-extrabold flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>PUBLIC PROOF</span>
                    </Link>

                    <button
                      onClick={() => {
                        setSharingCred(c);
                        setGeneratedShareToken(null);
                      }}
                      className="px-3 py-1.5 bg-neon-green border border-textDark font-extrabold hover:bg-neon-yellow transition-all flex items-center gap-1.5 ml-auto"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>SHARE WITH EMPLOYER</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EMPLOYER CONSENT SHARES */}
      {activeTab === 'shares' && (
        <div className="bg-surface border-2 border-textDark p-6 shadow-md space-y-6">
          <div className="border-b border-borderDark pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">ACTIVE EMPLOYER ACCESS PERMISSIONS</h2>
            <p className="text-xs text-textMuted font-bold">
              Student data privacy enforcement: Revoke company authorization at any time to immediately cut off access to your academic records.
            </p>
          </div>

          {shares.length === 0 ? (
            <div className="p-8 text-center bg-pitch border border-borderDark text-xs text-textMuted font-bold">
              NO ACTIVE EMPLOYER SHARES. SHARE A CREDENTIAL FROM "MY ACADEMIC CREDENTIALS" TO GRANT ACCESS.
            </div>
          ) : (
            <div className="divide-y divide-borderDark border border-borderDark">
              {shares.map((s) => (
                <div key={s._id} className="p-4 bg-pitch flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-extrabold text-sm block">
                      {s.companyName || s.companyDomain || 'General Authorized Verifier'}
                    </span>
                    <div className="text-[11px] text-textMuted">
                      Credential: <strong>{s.academicCredentialObjectId?.credentialTitle || s.credentialId}</strong>
                    </div>
                    <div className="text-[10px] text-textMuted font-mono">
                      Token: {s.shareToken?.slice(0, 12)}... • Views: {s.accessCount || 0}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                      s.status === 'active' ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {s.status}
                    </span>

                    {s.status === 'active' && (
                      <button
                        onClick={() => handleRevokeShare(s._id)}
                        className="px-3 py-1 bg-red-500/20 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold uppercase transition-all flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>REVOKE ACCESS</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-surface border-2 border-textDark p-6 shadow-md space-y-6">
          <div className="border-b border-borderDark pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">ACCOUNT IDENTITY</h2>
          </div>

          <div className="space-y-3 max-w-md text-xs">
            <div className="p-3 bg-pitch border border-borderDark flex justify-between">
              <span className="text-textMuted font-bold">NAME:</span>
              <strong className="text-textDark">{studentProfile?.name}</strong>
            </div>
            <div className="p-3 bg-pitch border border-borderDark flex justify-between">
              <span className="text-textMuted font-bold">EMAIL:</span>
              <strong className="text-textDark">{studentProfile?.email}</strong>
            </div>
            <div className="p-3 bg-pitch border border-borderDark flex justify-between">
              <span className="text-textMuted font-bold">MEMBER SINCE:</span>
              <strong className="text-textDark">{formatMemberSince(studentProfile?.createdAt)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SHARE CREDENTIAL WITH EMPLOYER */}
      {sharingCred && (
        <div className="fixed inset-0 z-50 bg-textDark/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-textDark w-full max-w-md p-6 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-borderDark pb-3">
              <h3 className="text-sm font-extrabold uppercase flex items-center gap-2">
                <Share2 className="w-4 h-4 text-neon-green" />
                <span>SHARE ACADEMIC CREDENTIAL</span>
              </h3>
              <button onClick={() => setSharingCred(null)} className="font-bold">✕</button>
            </div>

            <p className="text-textMuted leading-relaxed">
              Grant a company or employer authorized access to verify <strong>{sharingCred.credentialTitle}</strong>.
            </p>

            {!generatedShareToken ? (
              <form onSubmit={handleShareSubmit} className="space-y-3">
                <div>
                  <label className="text-textMuted uppercase font-bold block mb-1">Company / Employer Name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. TechNova Solutions"
                    className="w-full p-2 bg-pitch border border-borderDark font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-textMuted uppercase font-bold block mb-1">Company Domain (Optional)</label>
                  <input
                    type="text"
                    value={companyDomain}
                    onChange={(e) => setCompanyDomain(e.target.value)}
                    placeholder="e.g. technova.com"
                    className="w-full p-2 bg-pitch border border-borderDark font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-textMuted uppercase font-bold block mb-1">Access Duration (Days)</label>
                  <select
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    className="w-full p-2 bg-pitch border border-borderDark font-mono outline-none"
                  >
                    <option value={7}>7 Days</option>
                    <option value={30}>30 Days</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSharingCred(null)}
                    className="px-4 py-2 border border-borderDark font-bold uppercase"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-neon-green border-2 border-textDark font-extrabold uppercase hover:bg-neon-yellow"
                  >
                    GENERATE SHARE AUTHORIZATION
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-neon-green/20 border border-neon-green text-xs font-bold text-textDark">
                  Share authorization token generated! Provide this link to the company recruiter:
                </div>

                <div className="p-3 bg-pitch border border-borderDark font-mono text-[11px] break-all">
                  {window.location.origin}/verify/{sharingCred.credentialId}?token={generatedShareToken}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/verify/${sharingCred.credentialId}?token=${generatedShareToken}`);
                    showToast('Share link copied to clipboard!', 'success');
                  }}
                  className="w-full py-2 bg-surface border-2 border-textDark font-bold uppercase flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>COPY VERIFICATION LINK</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSharingCred(null)}
                  className="w-full py-2 bg-pitch border border-borderDark font-bold uppercase"
                >
                  DONE
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: QR CODE PREVIEW */}
      {viewingQR && (
        <div className="fixed inset-0 z-50 bg-textDark/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-textDark w-full max-w-sm p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between border-b border-borderDark pb-2 text-left">
              <span className="text-xs font-extrabold uppercase">OFFICIAL CREDENTIAL QR CODE</span>
              <button onClick={() => setViewingQR(null)} className="font-bold">✕</button>
            </div>

            <img
              src={viewingQR.qrCodeDataUrl}
              alt="QR Code"
              className="w-48 h-48 mx-auto border-2 border-textDark bg-white p-2 shadow-sm"
            />

            <div className="text-xs space-y-1 text-left font-mono">
              <div className="font-extrabold text-sm">{viewingQR.credentialTitle}</div>
              <div className="text-[11px] text-textMuted">ID: {viewingQR.credentialId}</div>
              <div className="text-[10px] text-neon-green font-bold uppercase">BLOCKCHAIN CONFIRMED ANCHOR</div>
            </div>

            <a
              href={viewingQR.qrCodeDataUrl}
              download={`${viewingQR.credentialId}_QR.png`}
              className="w-full py-2 bg-neon-green border-2 border-textDark font-extrabold uppercase text-xs hover:bg-neon-yellow transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>DOWNLOAD HIGH-RES QR PNG</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
