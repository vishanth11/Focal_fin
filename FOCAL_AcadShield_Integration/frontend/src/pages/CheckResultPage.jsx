import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ArrowRight, ExternalLink, Lock, Terminal } from 'lucide-react';
import VerificationScanner from '../components/VerificationScanner';
import TrustScoreMeter from '../components/TrustScoreMeter';
import DomainComparison from '../components/DomainComparison';
import SearchBox from '../components/SearchBox';
import { checkCompany } from '../services/api';
import { verifyOnChain } from '../services/blockchain';
import BlockchainProofDetails from '../components/BlockchainProofDetails';
import { useApp } from '../context/AppContext';

export default function CheckResultPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || 'technova.com';
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [onChainProof, setOnChainProof] = useState(null);
  const [blockchainLoading, setBlockchainLoading] = useState(false);

  useEffect(() => {
    setScanning(true);
    setResult(null);
    setOnChainProof(null);
  }, [query]);

  const handleScanComplete = async () => {
    setLoading(true);
    try {
      const data = await checkCompany(query);
      setResult(data);
      setScanning(false);

      if (data.company && data.company.blockchain?.walletAddress) {
        setBlockchainLoading(true);
        const proof = await verifyOnChain(data.company.blockchain.walletAddress);
        setOnChainProof(proof);
        setBlockchainLoading(false);
      }
    } catch (err) {
      showToast('Error retrieving intelligence report', 'error');
      setScanning(false);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOnChainClick = async () => {
    if (!result?.company?.blockchain?.walletAddress) {
      showToast('No on-chain address associated with entity', 'warning');
      return;
    }
    setBlockchainLoading(true);
    showToast('Querying Polygon smart contract state...', 'info');
    const proof = await verifyOnChain(result.company.blockchain.walletAddress);
    setOnChainProof(proof);
    setBlockchainLoading(false);
    if (proof.error) {
      showToast(proof.error, 'error');
    } else if (proof.isValid) {
      showToast(`On-chain badge #${proof.tokenId} confirmed on Polygon!`, 'success');
    } else {
      showToast('No valid badge found on-chain for this entity.', 'warning');
    }
  };

  if (scanning) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-mono">
        <VerificationScanner targetQuery={query} onComplete={handleScanComplete} />
      </div>
    );
  }

  if (!result || !result.company) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center font-mono space-y-6">
        <AlertTriangle className="w-12 h-12 text-textDark mx-auto animate-bounce" />
        <h2 className="text-2xl font-extrabold text-textDark uppercase tracking-tight">
          NO DIRECT ENTITY MATCH FOUND
        </h2>
        <p className="text-xs text-textMuted max-w-md mx-auto font-bold">
          We couldn't retrieve an official registration record for "{query}". You can file a new verification request or submit a report.
        </p>
        <SearchBox initialValue={query} />
      </div>
    );
  }

  const { company, typosquattingMatch } = result;
  const isVerified = company.status === 'verified';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-mono space-y-12 text-textDark">
      {/* Top Search Terminal */}
      <div className="bg-surface border border-borderDark p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="text-xs text-textMuted uppercase tracking-wider flex items-center gap-2 font-bold">
          <Terminal className="w-4 h-4 text-textDark" />
          <span>SEARCH QUERY: <strong className="text-textDark">{query}</strong></span>
        </div>
        <div className="w-full md:w-auto">
          <SearchBox initialValue={query} />
        </div>
      </div>

      {/* RESULT HEADER BANNER */}
      <div className="p-8 bg-surface border-2 border-textDark relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 text-xs font-extrabold uppercase border ${
                isVerified
                  ? 'bg-neon-green/30 text-textDark border-textDark'
                  : 'bg-risk-high/10 text-risk-high border-risk-high'
              }`}
            >
              {isVerified ? 'VERIFIED CORPORATE ENTITY ✓' : 'FLAGGED HIGH RISK / SUSPICIOUS ⚠'}
            </span>
            <span className="text-xs text-textMuted font-bold uppercase">AUDITED REPORT</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-textDark tracking-tight">
            {company.name}
          </h1>
          <p className="text-sm font-bold text-textDark underline tracking-wider">{company.domain}</p>
          <p className="text-xs text-textMuted font-bold">{company.category}</p>
        </div>

        {/* Trust Score Banner Pill */}
        <div className="flex-shrink-0 text-right bg-pitch border-2 border-textDark p-5 min-w-[200px]">
          <div className="text-xs text-textMuted uppercase tracking-widest mb-1 font-bold">TRUST SCORE</div>
          <div className={`text-5xl font-extrabold ${isVerified ? 'text-textDark' : 'text-risk-high'}`}>
            {company.trustScore} <span className="text-sm font-normal text-textMuted">/ 100</span>
          </div>
          <div className="text-[10px] text-textMuted uppercase mt-1 font-bold">
            {isVerified ? 'LOW RISK PROFILE' : 'HIGH RISK / SUSPICIOUS'}
          </div>
        </div>
      </div>

      {/* TYPOSQUATTING COMPARISON COMPONENT */}
      {(typosquattingMatch || company.id === 'companny-tech') && (
        <DomainComparison
          officialDomain={typosquattingMatch?.officialDomain || 'company.com'}
          officialName={typosquattingMatch?.officialName || 'Verified Global Entity'}
          suspiciousDomain={typosquattingMatch?.suspiciousDomain || company.domain}
          suspiciousName={company.name}
          explanation={
            typosquattingMatch?.explanation ||
            'This domain matches known typosquatting mutation patterns attempting to impersonate official business entities.'
          }
        />
      )}

      {/* TWO-COLUMN REPORT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2 cols): Signals */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* VERIFIED SIGNALS */}
          <div className="bg-surface border border-borderDark p-6 sm:p-8 space-y-6 shadow-sm">
            <h3 className="text-lg font-extrabold text-textDark uppercase tracking-wider flex items-center gap-2 border-b border-borderDark pb-3">
              <CheckCircle2 className="w-5 h-5 text-textDark" />
              <span>VERIFIED SIGNALS ({company.trustSignals?.length || 0})</span>
            </h3>

            <div className="space-y-3">
              {company.trustSignals && company.trustSignals.length > 0 ? (
                company.trustSignals.map((sig, i) => (
                  <div key={i} className="p-3 bg-pitch border border-borderDark flex items-start gap-3 text-xs">
                    <span className="text-textDark font-extrabold">✓</span>
                    <span className="text-textDark font-semibold leading-relaxed">{sig}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-textMuted">No positive trust signals verified.</div>
              )}
            </div>
          </div>

          {/* RISK SIGNALS */}
          <div className="bg-surface border border-borderDark p-6 sm:p-8 space-y-6 shadow-sm">
            <h3 className="text-lg font-extrabold text-textDark uppercase tracking-wider flex items-center gap-2 border-b border-borderDark pb-3">
              <AlertTriangle className="w-5 h-5 text-risk-high" />
              <span>DETECTED RISK SIGNALS ({company.riskSignals?.length || 0})</span>
            </h3>

            <div className="space-y-4">
              {company.riskSignals && company.riskSignals.length > 0 ? (
                company.riskSignals.map((risk, i) => (
                  <div
                    key={i}
                    className={`p-4 border text-xs space-y-1 ${
                      risk.severity === 'high'
                        ? 'bg-risk-high/10 border-risk-high text-textDark'
                        : 'bg-neon-yellow/30 border-textDark text-textDark'
                    }`}
                  >
                    <div className="flex items-center justify-between font-extrabold uppercase tracking-wider">
                      <span className={risk.severity === 'high' ? 'text-risk-high' : 'text-textDark'}>
                        ⚠ {risk.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-surface border border-borderDark">
                        {risk.code}
                      </span>
                    </div>
                    <p className="text-textMuted text-xs leading-relaxed pt-1 font-semibold">{risk.description}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-neon-green/20 border border-textDark text-textDark text-xs font-bold">
                  ✓ NO ACTIVE FRAUD OR IMPERSONATION SIGNALS DETECTED
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 col): Meter & Blockchain Proof */}
        <div className="space-y-8">
          <TrustScoreMeter score={company.trustScore} status={company.status} />

          {/* BLOCKCHAIN PROOF SECTION */}
          <div className="bg-surface border border-borderDark p-6 font-mono space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-borderDark pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-textDark uppercase tracking-wider">
                <Lock className="w-4 h-4 text-textDark" />
                <span>BLOCKCHAIN VERIFIED</span>
              </div>
              <span className="text-[10px] text-textDark font-extrabold bg-neon-green/30 px-2 py-0.5 border border-textDark">
                POLYGON
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-textMuted">STATUS:</span>
                <span className="text-textDark font-extrabold">
                  {onChainProof?.isValid ? 'VALID OMEN BADGE ✓' : 'UNVERIFIED'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-textMuted">GST STATUS:</span>
                <span className="text-textDark font-extrabold">
                  {company.gst?.status === 'verified' && !company.gst?.simulated ? 'GST VERIFIED ✓' : 'GST NOT VERIFIED'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-textMuted">TOKEN ID:</span>
                <span className="text-textDark font-bold">
                  #{onChainProof?.isValid ? onChainProof.tokenId : '—'}
                </span>
              </div>

              <BlockchainProofDetails proof={onChainProof} />

              <div className="space-y-1 pt-2 border-t border-borderDark">
                <span className="text-textMuted text-[10px] font-bold">WALLET ADDRESS:</span>
                <div className="text-[10px] text-textDark break-all bg-pitch p-2 border border-borderDark font-bold">
                  {company.blockchain?.walletAddress || 'Not associated'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-textMuted text-[10px] font-bold">CONTRACT ADDRESS:</span>
                <div className="text-[10px] text-textMuted break-all bg-pitch p-2 border border-borderDark">
                  {company.blockchain?.contractAddress || 'Not configured'}
                </div>
              </div>
            </div>

            <button
              onClick={handleVerifyOnChainClick}
              disabled={blockchainLoading}
              className="w-full mt-4 py-3 bg-surface border-2 border-textDark text-textDark hover:bg-neon-yellow font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {blockchainLoading ? (
                <span>QUERYING CHAIN...</span>
              ) : (
                <>
                  <span>VERIFY ON CHAIN</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            <Link
              to={`/company/${company.id}`}
              className="w-full py-3 bg-neon-yellow border-2 border-textDark text-textDark font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neon-green transition-all shadow-sm"
            >
              <span>VIEW FULL COMPANY PROFILE</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/connections"
              className="w-full py-3 bg-surface border-2 border-textDark text-textDark font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-pitch transition-all shadow-sm"
            >
              <span>REQUEST TRUSTED CONNECTION</span>
            </Link>

            <Link
              to={`/report?company=${encodeURIComponent(company.name)}&domain=${encodeURIComponent(company.domain)}`}
              className="w-full py-3 bg-pitch border border-risk-high text-risk-high hover:bg-risk-high hover:text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
            >
              <span>REPORT THIS ENTITY</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
