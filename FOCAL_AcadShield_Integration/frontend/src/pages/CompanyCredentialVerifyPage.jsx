import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  Search,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  Lock,
  ExternalLink,
  Printer
} from 'lucide-react';
import { verifyCredentialPublic, verifyDocumentHash } from '../services/api';
import { useApp } from '../context/AppContext';

export default function CompanyCredentialVerifyPage() {
  const { showToast } = useApp();

  const [searchId, setSearchId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [credentialResult, setCredentialResult] = useState(null);

  // File upload check state
  const [fileCheckResult, setFileCheckResult] = useState(null);
  const [checkingFile, setCheckingFile] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!searchId.trim()) {
      showToast('Enter a valid Credential ID or Share Token', 'warning');
      return;
    }

    setVerifying(true);
    setCredentialResult(null);
    setFileCheckResult(null);
    try {
      const res = await verifyCredentialPublic(searchId.trim());
      setCredentialResult(res.data);
      showToast('Academic credential records verified against registry.', 'success');
    } catch (err) {
      showToast(err.message || 'Credential verification failed', 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCheckingFile(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        const res = await verifyDocumentHash({
          credentialId: credentialResult?.credentialId || (searchId.trim() || undefined),
          fileBase64: base64,
          fileName: file.name
        });
        setFileCheckResult(res.data);
        if (res.data.hashMatches) {
          showToast('Document byte-level hash matches registered record!', 'success');
        } else {
          showToast('Document hash does NOT match registered record.', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Document hash check failed', 'error');
      } finally {
        setCheckingFile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const vResult = credentialResult?.verificationResult || {};

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 font-mono text-textDark space-y-8">
      {/* Header Banner */}
      <div className="bg-surface border-2 border-textDark p-8 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-[10px] tracking-widest text-textMuted uppercase font-bold">
          <Building2 className="w-4 h-4 text-neon-green" />
          <span>EMPLOYER & RECRUITER VERIFICATION PORTAL</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight">
          VERIFY CANDIDATE ACADEMIC CREDENTIALS
        </h1>
        <p className="text-xs text-textMuted font-bold leading-relaxed max-w-2xl">
          Instantly verify university marksheets, degree certificates, and transcripts against official institutional DID signatures and immutable Polygon blockchain hashes.
        </p>

        {/* Search input form */}
        <form onSubmit={handleVerify} className="pt-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center bg-pitch border-2 border-textDark px-3 py-2">
            <Search className="w-4 h-4 text-textMuted mr-2" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Paste Credential ID (e.g. FOCAL-VC-...), SHA-256 Hash, or Issuer DID..."
              className="bg-transparent border-none outline-none text-xs w-full font-mono text-textDark"
            />
          </div>
          <button
            type="submit"
            disabled={verifying}
            className="px-6 py-3 bg-neon-green border-2 border-textDark font-extrabold text-xs uppercase hover:bg-neon-yellow transition-all shadow-sm"
          >
            {verifying ? 'VERIFYING SIGNATURES...' : 'VERIFY CREDENTIAL'}
          </button>
        </form>
      </div>

      {/* Verification Result Dossier */}
      {credentialResult && (
        <div className="bg-surface border-2 border-textDark p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-borderDark pb-4">
            <div>
              <span className="text-[10px] text-textMuted uppercase font-bold tracking-widest block">
                OFFICIAL VERIFICATION REPORT
              </span>
              <h2 className="text-xl font-extrabold uppercase">{credentialResult.credentialTitle}</h2>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-pitch border border-borderDark text-xs font-bold uppercase flex items-center gap-1.5 hover:border-textDark"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PRINT REPORT</span>
            </button>
          </div>

          {/* 5 Explicit Verification Checks */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold uppercase tracking-wider text-textMuted">
              INDEPENDENT CRYPTOGRAPHIC CHECKPOINTS
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 bg-pitch border border-borderDark space-y-1">
                <span className="text-[10px] text-textMuted font-bold uppercase block">1. ISSUER UNIVERSITY TRUST</span>
                <div className="flex items-center gap-1.5">
                  {vResult.issuerTrusted === 'YES' ? <CheckCircle2 className="w-4 h-4 text-neon-green" /> : <XCircle className="w-4 h-4 text-red-500" />}
                  <span className="text-xs font-extrabold uppercase">{vResult.issuerTrusted}</span>
                </div>
                <span className="text-[10px] text-textMuted block">{credentialResult.issuer?.name}</span>
              </div>

              <div className="p-3 bg-pitch border border-borderDark space-y-1">
                <span className="text-[10px] text-textMuted font-bold uppercase block">2. VC CRYPTOGRAPHIC SIGNATURE</span>
                <div className="flex items-center gap-1.5">
                  {vResult.signatureValid === 'YES' ? <CheckCircle2 className="w-4 h-4 text-neon-green" /> : <XCircle className="w-4 h-4 text-red-500" />}
                  <span className="text-xs font-extrabold uppercase">{vResult.signatureValid}</span>
                </div>
                <span className="text-[10px] text-textMuted block">ECDSA Secp256k1 Proof</span>
              </div>

              <div className="p-3 bg-pitch border border-borderDark space-y-1">
                <span className="text-[10px] text-textMuted font-bold uppercase block">3. DOCUMENT BYTE-LEVEL INTEGRITY</span>
                <div className="flex items-center gap-1.5">
                  {fileCheckResult ? (
                    fileCheckResult.hashMatches ? <CheckCircle2 className="w-4 h-4 text-neon-green" /> : <XCircle className="w-4 h-4 text-red-500" />
                  ) : (
                    <Lock className="w-4 h-4 text-textMuted" />
                  )}
                  <span className="text-xs font-extrabold uppercase">
                    {fileCheckResult ? (fileCheckResult.hashMatches ? 'YES — EXACT MATCH' : 'NO — MODIFIED') : 'NOT PROVIDED'}
                  </span>
                </div>
                <span className="text-[10px] text-textMuted block">Upload candidate file below</span>
              </div>

              <div className="p-3 bg-pitch border border-borderDark space-y-1">
                <span className="text-[10px] text-textMuted font-bold uppercase block">4. BLOCKCHAIN RECORD</span>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-neon-green" />
                  <span className="text-xs font-extrabold uppercase">{vResult.blockchainConfirmed}</span>
                </div>
                <span className="text-[10px] text-textMuted block">{credentialResult.blockchain?.network || 'Polygon Amoy'}</span>
              </div>

              <div className="p-3 bg-pitch border border-borderDark space-y-1">
                <span className="text-[10px] text-textMuted font-bold uppercase block">5. LIFECYCLE STATUS</span>
                <div className="flex items-center gap-1.5">
                  {credentialResult.status === 'ACTIVE' ? <CheckCircle2 className="w-4 h-4 text-neon-green" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                  <span className="text-xs font-extrabold uppercase">{credentialResult.status}</span>
                </div>
                <span className="text-[10px] text-textMuted block">Valid at verification time</span>
              </div>
            </div>
          </div>

          {/* Upload original document bytes to compare SHA-256 */}
          <div className="p-4 bg-pitch border border-borderDark space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-neon-green" />
                <span>CROSS-EXAMINE CANDIDATE FILE (SHA-256 MATCH)</span>
              </span>
              <span className="text-[10px] text-textMuted uppercase font-mono">OPTIONAL TAMPER-PROOF TEST</span>
            </div>

            <p className="text-[11px] text-textMuted leading-relaxed">
              Upload the PDF or certificate image provided by the applicant to confirm it has not been doctored or altered by even a single byte.
            </p>

            <div className="border border-dashed border-borderDark p-4 text-center cursor-pointer hover:bg-surface transition-colors relative">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-5 h-5 mx-auto text-textMuted mb-1" />
              <span className="text-xs font-bold block">
                {checkingFile ? 'COMPUTING SHA-256 DIGEST...' : 'Upload candidate certificate to run byte-level hash comparison'}
              </span>
            </div>

            {fileCheckResult && (
              <div className={`p-3 border text-xs font-bold ${
                fileCheckResult.hashMatches
                  ? 'bg-neon-green/20 border-neon-green text-textDark'
                  : 'bg-red-500/20 border-red-500 text-red-500'
              }`}>
                {fileCheckResult.hashMatches
                  ? 'DOCUMENT AUTHENTICITY CONFIRMED: Exact SHA-256 match with university issuance.'
                  : 'INTEGRITY ALERT: Document bytes do NOT match the registered institutional fingerprint.'}
              </div>
            )}
          </div>

          {/* Verified Claims */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs border-t border-borderDark pt-4">
            <div><span className="text-textMuted block font-bold">CANDIDATE NAME:</span> <strong>{credentialResult.studentName}</strong></div>
            <div><span className="text-textMuted block font-bold">ROLL / ENROLLMENT ID:</span> <code>{credentialResult.enrollmentNumber}</code></div>
            <div><span className="text-textMuted block font-bold">QUALIFICATION:</span> <strong>{credentialResult.academicClaims?.degree || credentialResult.documentType}</strong></div>
            <div><span className="text-textMuted block font-bold">ISSUING INSTITUTION:</span> <strong>{credentialResult.issuer?.name}</strong></div>
            <div><span className="text-textMuted block font-bold">GRADE / CGPA:</span> <strong>{credentialResult.academicClaims?.cgpa || credentialResult.academicClaims?.grade || 'Verified'}</strong></div>
            <div><span className="text-textMuted block font-bold">ISSUED DATE:</span> <strong>{new Date(credentialResult.issuanceDate).toLocaleDateString()}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
}
