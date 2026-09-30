import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  FileCheck,
  ExternalLink,
  QrCode,
  Lock,
  Clock,
  Building2
} from 'lucide-react';
import { verifyCredentialPublic, verifyDocumentHash } from '../services/api';
import { useApp } from '../context/AppContext';

export default function PublicCredentialVerifyPage() {
  const { id } = useParams();
  const { showToast } = useApp();

  const [loading, setLoading] = useState(true);
  const [credentialData, setCredentialData] = useState(null);
  const [error, setError] = useState(null);

  // File integrity check state
  const [checkingFile, setCheckingFile] = useState(false);
  const [fileCheckResult, setFileCheckResult] = useState(null);

  const fetchVerification = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await verifyCredentialPublic(id);
      setCredentialData(res.data);
    } catch (err) {
      setError(err.message || 'Credential verification failed. Entity not found or unverified.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchVerification();
  }, [id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCheckingFile(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        const res = await verifyDocumentHash({
          credentialId: id,
          fileBase64: base64,
          fileName: file.name
        });
        setFileCheckResult(res.data);
        if (res.data.hashMatches) {
          showToast('Document SHA-256 fingerprint matches registered original bytes 100%!', 'success');
        } else {
          showToast('Warning: Document SHA-256 fingerprint does NOT match registered record.', 'error');
        }
      } catch (err) {
        showToast(err.message || 'Document hash check failed', 'error');
      } finally {
        setCheckingFile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center font-mono text-textDark">
        <div className="font-extrabold text-sm animate-pulse">QUERYING CRYPTOGRAPHIC VC REGISTRY & POLYGON ANCHOR...</div>
      </div>
    );
  }

  if (error || !credentialData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 font-mono text-textDark">
        <div className="bg-surface border-2 border-textDark p-8 shadow-2xl space-y-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-extrabold uppercase">CREDENTIAL NOT VERIFIED</h1>
          <p className="text-xs text-textMuted font-bold leading-relaxed max-w-md mx-auto">
            {error || 'No registered academic record found matching this credential identifier.'}
          </p>
          <div className="pt-4 border-t border-borderDark flex justify-center gap-3">
            <Link to="/" className="px-6 py-2.5 bg-neon-green border-2 border-textDark text-xs font-extrabold uppercase">
              HOME
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const result = credentialData.verificationResult || {};
  const isStatusActive = credentialData.status === 'ACTIVE';

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 font-mono text-textDark space-y-8">
      {/* Header Authority Card */}
      <div className="bg-surface border-2 border-textDark p-8 shadow-2xl relative">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-borderDark pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pitch border-2 border-textDark">
              <GraduationCap className="w-8 h-8 text-neon-green" />
            </div>
            <div>
              <span className="text-[10px] tracking-widest text-textMuted uppercase font-bold block">
                FOCAL ACADSHIELD // CRYPTOGRAPHIC VERIFICATION DOSSIER
              </span>
              <h1 className="text-2xl font-extrabold uppercase">{credentialData.credentialTitle}</h1>
            </div>
          </div>

          <div className="text-right">
            <span className={`px-3 py-1 text-xs font-extrabold uppercase rounded border ${
              isStatusActive
                ? 'bg-neon-green/20 text-neon-green border-neon-green'
                : 'bg-red-500/20 text-red-500 border-red-500'
            }`}>
              {credentialData.status}
            </span>
            <span className="text-[10px] text-textMuted block mt-1 font-mono">
              ID: {credentialData.credentialId}
            </span>
          </div>
        </div>

        {/* 5 Distinct Authoritative Verification Signals */}
        <div className="pt-6 space-y-3">
          <div className="text-xs font-extrabold uppercase tracking-wider text-textMuted mb-2">
            INDEPENDENT VERIFICATION SIGNALS (NON-AMBIGUOUS)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 1. Issuer Trusted */}
            <div className="p-3.5 bg-pitch border border-borderDark space-y-1">
              <span className="text-[10px] text-textMuted uppercase font-bold block">UNIVERSITY ISSUER TRUSTED</span>
              <div className="flex items-center gap-1.5">
                {result.issuerTrusted === 'YES' ? (
                  <CheckCircle2 className="w-4 h-4 text-neon-green" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs font-extrabold uppercase">{result.issuerTrusted}</span>
              </div>
              <span className="text-[10px] text-textMuted block">{credentialData.issuer?.name}</span>
            </div>

            {/* 2. VC Signature Valid */}
            <div className="p-3.5 bg-pitch border border-borderDark space-y-1">
              <span className="text-[10px] text-textMuted uppercase font-bold block">CRYPTOGRAPHIC SIGNATURE</span>
              <div className="flex items-center gap-1.5">
                {result.signatureValid === 'YES' ? (
                  <CheckCircle2 className="w-4 h-4 text-neon-green" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs font-extrabold uppercase">{result.signatureValid}</span>
              </div>
              <span className="text-[10px] text-textMuted block">W3C VC ECDSA Secp256k1</span>
            </div>

            {/* 3. Document Hash Matches */}
            <div className="p-3.5 bg-pitch border border-borderDark space-y-1">
              <span className="text-[10px] text-textMuted uppercase font-bold block">DOCUMENT SHA-256 INTEGRITY</span>
              <div className="flex items-center gap-1.5">
                {fileCheckResult ? (
                  fileCheckResult.hashMatches ? (
                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )
                ) : (
                  <Lock className="w-4 h-4 text-textMuted" />
                )}
                <span className="text-xs font-extrabold uppercase">
                  {fileCheckResult ? (fileCheckResult.hashMatches ? 'YES — EXACT MATCH' : 'NO — MODIFIED') : 'NOT PROVIDED'}
                </span>
              </div>
              <span className="text-[10px] text-textMuted block">
                {fileCheckResult ? 'Compared against submitted bytes' : 'Upload file below to check'}
              </span>
            </div>

            {/* 4. Blockchain Confirmed */}
            <div className="p-3.5 bg-pitch border border-borderDark space-y-1">
              <span className="text-[10px] text-textMuted uppercase font-bold block">BLOCKCHAIN REGISTRATION</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-neon-green" />
                <span className="text-xs font-extrabold uppercase">{result.blockchainConfirmed}</span>
              </div>
              <span className="text-[10px] text-textMuted block">{credentialData.blockchain?.network || 'Polygon Amoy'}</span>
            </div>

            {/* 5. Lifecycle Status */}
            <div className="p-3.5 bg-pitch border border-borderDark space-y-1">
              <span className="text-[10px] text-textMuted uppercase font-bold block">LIFECYCLE STATUS</span>
              <div className="flex items-center gap-1.5">
                {isStatusActive ? (
                  <CheckCircle2 className="w-4 h-4 text-neon-green" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs font-extrabold uppercase">{result.status}</span>
              </div>
              <span className="text-[10px] text-textMuted block">Verified at: {new Date(result.verifiedAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload File to verify SHA-256 fingerprint */}
      <div className="bg-surface border-2 border-textDark p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-borderDark pb-3">
          <div className="text-xs font-extrabold uppercase flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-neon-green" />
            <span>VERIFY ORIGINAL CERTIFICATE / MARKSHEET FILE BYTES</span>
          </div>
          <span className="text-[10px] text-textMuted font-mono">SHA-256 DIGEST COMPARISON</span>
        </div>

        <p className="text-xs text-textMuted font-bold leading-relaxed">
          Employers and verifiers can upload the candidate's certificate PDF or scanned image.
          The backend will calculate the exact cryptographic SHA-256 hash of the uploaded bytes and compare it with the registered reference digest.
        </p>

        <div className="border-2 border-dashed border-textDark p-6 text-center bg-pitch cursor-pointer relative hover:bg-surface transition-colors">
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          <Upload className="w-6 h-6 mx-auto text-textMuted mb-2" />
          <span className="text-xs font-bold block">
            {checkingFile ? 'COMPUTING SHA-256 AND VERIFYING WITH REGISTRY...' : 'Click or drag certificate file to verify byte-level authenticity'}
          </span>
        </div>

        {fileCheckResult && (
          <div className={`p-4 border-2 text-xs space-y-2 ${
            fileCheckResult.hashMatches
              ? 'bg-neon-green/20 border-neon-green text-textDark'
              : 'bg-red-500/20 border-red-500 text-red-500'
          }`}>
            <div className="font-extrabold uppercase flex items-center gap-2">
              {fileCheckResult.hashMatches ? <CheckCircle2 className="w-4 h-4 text-neon-green" /> : <XCircle className="w-4 h-4 text-red-500" />}
              <span>{fileCheckResult.hashMatches ? 'INTEGRITY VERIFIED: EXACT DOCUMENT MATCH ✓' : 'TAMPERED OR MISMATCHED DOCUMENT DETECTED ✕'}</span>
            </div>
            <div className="text-[11px] font-mono break-all space-y-1">
              <div>Computed Digest: <code>{fileCheckResult.computedHash}</code></div>
              <div>Registered Hash: <code>{fileCheckResult.storedReferenceHash}</code></div>
            </div>
          </div>
        )}
      </div>

      {/* Authorized Credential Claims (Privacy-Safe) */}
      <div className="bg-surface border-2 border-textDark p-6 shadow-md space-y-4">
        <h3 className="text-xs font-extrabold uppercase border-b border-borderDark pb-2">
          AUTHORIZED ACADEMIC CLAIMS
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
          <div><span className="text-textMuted block">Candidate:</span> <strong>{credentialData.studentName}</strong></div>
          <div><span className="text-textMuted block">Enrollment ID:</span> <strong>{credentialData.enrollmentNumber}</strong></div>
          <div><span className="text-textMuted block">Document Type:</span> <strong>{credentialData.documentType}</strong></div>
          <div><span className="text-textMuted block">Issuing Authority:</span> <strong>{credentialData.issuer?.name}</strong></div>
          <div><span className="text-textMuted block">Degree / Course:</span> <strong>{credentialData.academicClaims?.degree || 'N/A'}</strong></div>
          <div><span className="text-textMuted block">CGPA / Grade:</span> <strong>{credentialData.academicClaims?.cgpa || credentialData.academicClaims?.grade || 'Verified'}</strong></div>
        </div>
      </div>
    </div>
  );
}
