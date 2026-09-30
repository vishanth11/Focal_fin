import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, CheckCircle2, Lock, ExternalLink, ArrowRight, Building, Globe, Calendar } from 'lucide-react';
import TrustScoreMeter from '../components/TrustScoreMeter';
import { getCompanyById } from '../services/api';
import { verifyOnChain } from '../services/blockchain';
import BlockchainProofDetails from '../components/BlockchainProofDetails';
import { useApp } from '../context/AppContext';

export default function CompanyProfilePage() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onChainProof, setOnChainProof] = useState(null);
  const [verifyingChain, setVerifyingChain] = useState(false);
  const { showToast } = useApp();

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    setLoading(true);
    const res = await getCompanyById(id);
    if (res.company) {
      setCompany(res.company);
      if (res.company.blockchain?.walletAddress) {
        const proof = await verifyOnChain(res.company.blockchain.walletAddress);
        setOnChainProof(proof);
      }
    }
    setLoading(false);
  };

  const handleVerifyOnChain = async () => {
    if (!company?.blockchain?.walletAddress) return;
    setVerifyingChain(true);
    showToast('Executing RPC query against Polygon smart contract...', 'info');
    const proof = await verifyOnChain(company.blockchain.walletAddress);
    setOnChainProof(proof);
    setVerifyingChain(false);
    showToast(
      proof.isValid ? `FOCAL Badge #${proof.tokenId} confirmed on Polygon!` : proof.error || 'No valid FOCAL badge found on-chain.',
      proof.isValid ? 'success' : 'warning'
    );
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center font-mono text-textDark">
        <div className="font-extrabold text-sm animate-pulse">FETCHING INTELLIGENCE DOSSIER...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center font-mono space-y-4 text-textDark">
        <h2 className="text-2xl font-extrabold uppercase">COMPANY PROFILE NOT FOUND</h2>
        <Link to="/explore" className="text-xs text-textDark font-bold underline">RETURN TO EXPLORE DIRECTORY →</Link>
      </div>
    );
  }

  const isVerified = company.status === 'verified';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-mono space-y-12 text-textDark">
      {/* HEADER SECTION */}
      <div className="p-8 bg-surface border-2 border-textDark flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 text-xs font-extrabold uppercase border ${
                isVerified
                  ? 'bg-neon-green/30 text-textDark border-textDark'
                  : 'bg-risk-high/10 text-risk-high border-risk-high'
              }`}
            >
              {isVerified ? 'VERIFIED CORPORATE ENTITY ✓' : 'FLAGGED HIGH RISK / UNVERIFIED ⚠'}
            </span>
            <span className="text-xs text-textMuted font-bold">ID: {company.id}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-textDark tracking-tight">
            {company.name}
          </h1>
          <p className="text-base text-textDark font-bold underline tracking-wider">{company.domain}</p>
          <p className="text-xs text-textMuted font-bold">{company.category}</p>
        </div>

        <div className="bg-pitch border-2 border-textDark p-6 text-right min-w-[220px]">
          <div className="text-xs text-textMuted uppercase tracking-widest mb-1 font-bold">FOCAL. TRUST SCORE</div>
          <div className={`text-6xl font-extrabold ${isVerified ? 'text-textDark' : 'text-risk-high'}`}>
            {company.trustScore}
          </div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">
            {isVerified ? 'LOW RISK PROFILE' : 'HIGH RISK / SUSPICIOUS'}
          </div>
        </div>
      </div>

      {/* THREE COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1: Identity & Digital Presence */}
        <div className="space-y-8">
          <div className="bg-surface border border-borderDark p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-textDark uppercase tracking-wider border-b border-borderDark pb-3 flex items-center gap-2">
              <Building className="w-4 h-4 text-textDark" />
              <span>CORPORATE IDENTITY</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-textMuted block text-[10px] font-bold">REGISTRATION NUMBER:</span>
                <span className="text-textDark font-bold">{company.registrationNumber}</span>
              </div>
              <div>
                <span className="text-textMuted block text-[10px] font-bold">TAX IDENTIFIER (EIN / GST):</span>
                <span className="text-textDark font-bold">{company.taxId}</span>
              </div>
              <div>
                <span className="text-textMuted block text-[10px] font-bold">GST VERIFICATION:</span>
                <span className={`font-extrabold ${company.gst?.status === 'verified' ? 'text-textDark' : 'text-risk-high'}`}>
                  {company.gst?.status === 'verified' && !company.gst?.simulated
                    ? 'GST VERIFIED ✓'
                    : company.gst?.status === 'verified' && company.gst?.simulated
                      ? 'GST VERIFIED (DEMO)'
                    : company.gst?.status === 'not_provided'
                      ? 'GST NOT PROVIDED'
                      : 'GST VERIFICATION FAILED ✕'}
                </span>
              </div>
              {company.gst?.gstin && (
                <div>
                  <span className="text-textMuted block text-[10px] font-bold">GSTIN:</span>
                  <span className="text-textDark font-bold">{company.gst.gstin}</span>
                </div>
              )}
              <div>
                <span className="text-textMuted block text-[10px] font-bold">OFFICIAL EMAIL:</span>
                <span className="text-textDark font-bold underline">{company.email}</span>
              </div>
              <div>
                <span className="text-textMuted block text-[10px] font-bold">PHONE:</span>
                <span className="text-textDark font-bold">{company.phone}</span>
              </div>
              <div>
                <span className="text-textMuted block text-[10px] font-bold">HEADQUARTERS ADDRESS:</span>
                <span className="text-textDark font-bold">{company.address}</span>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-borderDark p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-textDark uppercase tracking-wider border-b border-borderDark pb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-textDark" />
              <span>DIGITAL PRESENCE AUDIT</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-textMuted font-bold">WEBSITE AGE:</span>
                <span className="text-textDark font-extrabold">{company.digitalPresence?.websiteAge || 'Unknown'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted font-bold">SSL ENCRYPTION:</span>
                <span className="text-textDark font-extrabold">
                  {company.digitalPresence?.sslValid ? 'VALID (DigiCert) ✓' : 'INVALID'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-textMuted font-bold">MX & SPF AUTHENTICATION:</span>
                <span className="text-textDark font-extrabold">
                  {company.digitalPresence?.mxRecordsFound ? 'AUTHENTICATED ✓' : 'FAILED'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Signals & History */}
        <div className="space-y-8">
          <div className="bg-surface border border-borderDark p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-textDark uppercase tracking-wider border-b border-borderDark pb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-textDark" />
              <span>VERIFIED TRUST SIGNALS</span>
            </h3>

            <div className="space-y-2 text-xs">
              {company.trustSignals && company.trustSignals.length > 0 ? (
                company.trustSignals.map((sig, i) => (
                  <div key={i} className="p-3 bg-pitch border border-borderDark flex items-start gap-2">
                    <span className="text-textDark font-extrabold">✓</span>
                    <span className="text-textDark font-semibold leading-relaxed">{sig}</span>
                  </div>
                ))
              ) : (
                <div className="text-textMuted">No trust signals verified.</div>
              )}
            </div>
          </div>

          <div className="bg-surface border border-borderDark p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-extrabold text-textDark uppercase tracking-wider border-b border-borderDark pb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-risk-high" />
              <span>DETECTED RISK SIGNALS</span>
            </h3>

            <div className="space-y-3 text-xs">
              {company.riskSignals && company.riskSignals.length > 0 ? (
                company.riskSignals.map((r, i) => (
                  <div key={i} className="p-3 bg-risk-high/10 border border-risk-high text-textDark space-y-1">
                    <div className="font-extrabold text-risk-high">⚠ {r.title}</div>
                    <div className="text-textMuted text-[11px] font-semibold">{r.description}</div>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-neon-green/20 border border-textDark text-textDark font-bold">
                  ✓ NO ACTIVE FRAUD OR IMPERSONATION SIGNALS DETECTED
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Blockchain Proof & Actions */}
        <div className="space-y-8">
          <TrustScoreMeter score={company.trustScore} status={company.status} />

          <div className="bg-surface border border-borderDark p-6 space-y-4 font-mono shadow-sm">
            <div className="flex items-center justify-between border-b border-borderDark pb-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-textDark uppercase tracking-wider">
                <Lock className="w-4 h-4 text-textDark" />
                <span>BLOCKCHAIN VERIFIED</span>
              </div>
              <span className="text-[10px] text-textDark font-bold bg-neon-green/30 px-2 py-0.5 border border-textDark">
                POLYGON
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-textMuted font-bold">STATUS:</span>
                <span className="text-textDark font-extrabold">
                  {onChainProof?.isValid ? 'VALID OMEN BADGE ✓' : 'UNVERIFIED'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-textMuted font-bold">TOKEN ID:</span>
                <span className="text-textDark font-bold">
                  #{onChainProof?.isValid ? onChainProof.tokenId : '—'}
                </span>
              </div>

              <div className="space-y-1 pt-2 border-t border-borderDark">
                <span className="text-textMuted text-[10px] font-bold">WALLET ADDRESS:</span>
                <div className="text-[10px] text-textDark break-all bg-pitch p-2 border border-borderDark font-bold">
                  {company.blockchain?.walletAddress || 'Not associated'}
                </div>
              </div>

              <BlockchainProofDetails proof={onChainProof} />
            </div>

            <button
              onClick={handleVerifyOnChain}
              disabled={verifyingChain}
              className="w-full mt-4 py-3 bg-surface border-2 border-textDark text-textDark hover:bg-neon-yellow font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {verifyingChain ? (
                <span>QUERYING CHAIN...</span>
              ) : (
                <>
                  <span>VERIFY ON CHAIN</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            <Link
              to="/connections"
              className="w-full py-3 bg-neon-yellow border-2 border-textDark text-textDark font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neon-green transition-all shadow-sm"
            >
              <span>REQUEST TRUSTED CONNECTION</span>
            </Link>

            <Link
              to={`/report?company=${encodeURIComponent(company.name)}`}
              className="w-full py-3 bg-pitch border border-risk-high text-risk-high font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-risk-high hover:text-white transition-all"
            >
              <span>REPORT SUSPICIOUS ACTIVITY</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
