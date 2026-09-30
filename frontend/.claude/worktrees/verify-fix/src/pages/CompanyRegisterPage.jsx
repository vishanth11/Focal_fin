import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Wallet,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Terminal,
  Clock,
  FlaskConical,
  Link2
} from 'lucide-react';
import { registerCompany, getBackendConfig, getCompanyById } from '../services/api';
import { connectWallet, switchToAmoy, OMEN_CHAIN_ID } from '../services/blockchain';
import Badge from '../components/Badge';
import CompanyMintPanel from '../components/CompanyMintPanel';
import { useApp } from '../context/AppContext';

// What the verification terminal shows while the backend processes the
// submission. Mirrors POST /api/companies/register: schema validation,
// domain/wallet uniqueness, GST registry verification, then the record is
// queued as `pending` for administrator review.
const SUBMISSION_STEPS = [
  'Validating registration schema and tax identifiers...',
  'Checking domain and wallet uniqueness against the FOCAL registry...',
  'Running GST registry verification (GSTIN)...',
  'Queuing dossier for FOCAL administrator review...'
];

// DEMO MODE terminal copy — no external registry is involved.
const DEMO_SUBMISSION_STEPS = [
  'Validating registration schema...',
  'Checking domain and wallet uniqueness against the FOCAL registry...',
  'Running DEMO VERIFICATION (no external registry is consulted)...',
  'Recording your company dossier for administrator review...'
];

// The five onboarding stages, mirrored in the step strip at the top.
const FLOW_STEPS = [
  'CONNECT WALLET',
  'COMPANY DETAILS',
  'VERIFICATION',
  'ADMIN APPROVAL',
  'FOCAL BADGE'
];

// MetaMask's rejection code for a user-cancelled prompt.
const METAMASK_REJECT_CODES = new Set([4001, -32603]);

// Map raw wallet errors to honest, human messages.
function walletErrorMessage(error) {
  if (error && METAMASK_REJECT_CODES.has(error.code)) {
    return 'Wallet connection was cancelled.';
  }
  return error?.message || 'Wallet connection failed';
}

const shortAddress = (address) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

export default function CompanyRegisterPage() {
  const { showToast } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    website: '',
    email: '',
    gstin: '',
    address: ''
  });

  // The connected wallet is the SINGLE SOURCE OF TRUTH for the wallet
  // address — the registration payload reads it from here, never from a
  // form field, so the two can never diverge (the root cause of the old
  // false "MetaMask is required" bug).
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [onAmoy, setOnAmoy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // Build-time default only; the backend's /api/config is the source of
  // truth and is fetched on mount.
  const [demoMode, setDemoMode] = useState(
    import.meta.env.VITE_DEMO_VERIFICATION_MODE === 'true'
  );

  useEffect(() => {
    let cancelled = false;
    getBackendConfig()
      .then((config) => {
        if (!cancelled && config && typeof config.demoVerificationMode === 'boolean') {
          setDemoMode(config.demoVerificationMode);
        }
      })
      .catch(() => {
        /* Backend unreachable — keep the build-time default. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // React to the wallet's own state changes so the UI never lies about the
  // connection: account switches update the address, a MetaMask disconnect
  // clears it, and network switches update the chain indicator.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum) return undefined;

    const onAccountsChanged = (accounts) => {
      if (!accounts || accounts.length === 0) {
        setWallet(null);
        setOnAmoy(false);
        showToast('Wallet disconnected.', 'info');
        return;
      }
      const [address] = accounts;
      setWallet((prev) =>
        prev && prev.address.toLowerCase() !== address.toLowerCase()
          ? { ...prev, address }
          : prev
      );
    };
    const onChainChanged = (chainIdHex) => {
      setOnAmoy(BigInt(chainIdHex) === OMEN_CHAIN_ID);
    };

    window.ethereum.on?.('accountsChanged', onAccountsChanged);
    window.ethereum.on?.('chainChanged', onChainChanged);
    return () => {
      window.ethereum.removeListener?.('accountsChanged', onAccountsChanged);
      window.ethereum.removeListener?.('chainChanged', onChainChanged);
    };
  }, [showToast]);

  const handleFillSample = (type) => {
    // Preserves the wallet connection: the sample only replaces the TEXT
    // fields. (The old wholesale setFormData({...}) here dropped the wallet
    // data and caused the false "MetaMask is required" error.)
    const sample =
      type === 'startup'
        ? {
            name: 'Novastart Innovations Pvt Ltd',
            domain: 'novastart.tech',
            website: 'https://novastart.tech',
            email: 'contact@novastart.tech',
            gstin: '29AABCN1234P1Z2',
            address: 'Indiranagar, Bengaluru, Karnataka'
          }
        : {
            name: 'Apex Cybernetics India Pvt Ltd',
            domain: 'apexcyber.io',
            website: 'https://apexcyber.io',
            email: 'careers@apexcyber.io',
            gstin: '27AABCU9603R1ZN',
            address: 'Bandra-Kurla Complex, Mumbai, Maharashtra'
          };
    setFormData((prev) => ({ ...prev, ...sample }));
    showToast(
      `Loaded ${type === 'startup' ? 'New Startup' : 'Established Enterprise'} sample data`,
      'info'
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'domain' && !prev.website) {
        updated.website = value.startsWith('http') ? value : `https://${value}`;
      }
      return updated;
    });
  };

  const handleConnectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      showToast('MetaMask is required to connect your company wallet.', 'error');
      return;
    }
    setConnecting(true);
    try {
      const connected = await connectWallet();
      setWallet(connected);
      try {
        await switchToAmoy();
        setOnAmoy(true);
      } catch (switchErr) {
        // Connected, but still on the wrong chain — show the wallet with a
        // "Switch to Polygon Amoy" prompt instead of failing the connection.
        setOnAmoy(false);
        showToast(walletErrorMessage(switchErr), 'warning');
      }
      showToast(`Wallet connected: ${shortAddress(connected.address)}`, 'success');
    } catch (err) {
      showToast(walletErrorMessage(err), 'error');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectWallet = () => {
    setWallet(null);
    setOnAmoy(false);
    showToast('Wallet disconnected', 'info');
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchToAmoy();
      setOnAmoy(true);
      showToast('Switched to Polygon Amoy.', 'success');
    } catch (err) {
      showToast(walletErrorMessage(err), 'error');
    }
  };

  const buildPayload = () => ({
    name: formData.name.trim(),
    domain: formData.domain.trim().toLowerCase(),
    website: formData.website.trim() || `https://${formData.domain.trim()}`,
    email: formData.email.trim().toLowerCase(),
    // From the connected wallet ONLY — a manually typed address can never
    // enter the registration through this path.
    walletAddress: wallet.address,
    gstin: formData.gstin ? formData.gstin.trim().toUpperCase() : undefined,
    address: formData.address ? formData.address.trim() : undefined
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.domain || !formData.email) {
      showToast('Please fill all required entity fields', 'warning');
      return;
    }
    if (!wallet || !wallet.address) {
      showToast('MetaMask is required to connect your company wallet.', 'warning');
      return;
    }

    setLoading(true);
    setResult(null);

    const steps = demoMode ? DEMO_SUBMISSION_STEPS : SUBMISSION_STEPS;
    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep < steps.length) {
        setLoadingStep(currentStep);
      }
    }, 600);

    try {
      const res = await registerCompany(buildPayload());
      clearInterval(interval);
      setLoading(false);

      if (res.success && res.company) {
        setResult(res.company);
        showToast(
          demoMode
            ? `Demo verification passed for ${res.company.name} — awaiting admin verification.`
            : `Registration submitted for ${res.company.name}!`,
          'success'
        );
      } else {
        showToast(res.message || 'Registration could not be completed', 'error');
      }
    } catch (err) {
      clearInterval(interval);
      setLoading(false);
      showToast(err.message || 'Registration failed. Domain or wallet may already exist.', 'error');
    }
  };

  // Re-check the company's status without creating a duplicate record —
  // used after an admin verifies the company in the dashboard.
  const handleRefreshStatus = async () => {
    if (!result?.id) return;
    setRefreshing(true);
    try {
      const res = await getCompanyById(result.id);
      if (res?.company) {
        setResult((prev) => ({ ...prev, ...res.company }));
        showToast(`Status: ${res.company.status.toUpperCase()}`, 'info');
      }
    } catch (err) {
      showToast(err.message || 'Could not refresh the company status.', 'error');
    } finally {
      setRefreshing(false);
    }
  };

  const formComplete = Boolean(formData.name && formData.domain && formData.email);
  const currentStep = !wallet
    ? 0
    : !formComplete
      ? 1
      : !result
        ? 2
        : result.status !== 'verified'
          ? 3
          : result.blockchain?.badgeMinted || result.blockchain?.tokenId
            ? 5
            : 4;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-mono text-textDark space-y-8">
      {/* Top Banner */}
      <div className="bg-surface border-2 border-textDark p-8 shadow-xl relative overflow-hidden">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-pitch border border-textDark text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-ping" />
            <span>ENTERPRISE REGISTRATION PROTOCOL</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold uppercase tracking-tight text-textDark">
            COMPANY REGISTRATION &amp; VERIFICATION
          </h1>
          <p className="text-xs sm:text-sm text-textMuted max-w-2xl font-bold leading-relaxed">
            Submit your corporate details to initiate verification. Your dossier is reviewed by
            FOCAL administrators — once approved, the soulbound trust badge is minted on Polygon
            Amoy to your connected wallet.
          </p>
        </div>

        {/* Flow steps */}
        <div className="mt-6 pt-4 border-t border-borderDark grid grid-cols-2 sm:grid-cols-5 gap-2">
          {FLOW_STEPS.map((step, idx) => (
            <div
              key={step}
              className={`px-2 py-1.5 text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                idx < currentStep
                  ? 'bg-neon-green/30 border-textDark text-textDark'
                  : idx === currentStep
                    ? 'bg-neon-yellow border-textDark text-textDark'
                    : 'bg-pitch border-borderDark text-textMuted'
              }`}
            >
              <span>{idx < currentStep ? '✓' : idx + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>

        {/* Sample data shortcuts */}
        <div className="mt-4 pt-4 border-t border-borderDark flex flex-wrap items-center gap-3">
          <span className="text-xs font-extrabold text-textDark uppercase">QUICK FILL:</span>
          <button
            type="button"
            onClick={() => handleFillSample('verified')}
            className="px-3 py-1 text-xs font-bold uppercase bg-pitch border border-borderDark hover:bg-neon-yellow hover:text-textDark transition-all"
          >
            [SAMPLE: ESTABLISHED ENTERPRISE]
          </button>
          <button
            type="button"
            onClick={() => handleFillSample('startup')}
            className="px-3 py-1 text-xs font-bold uppercase bg-pitch border border-borderDark hover:bg-neon-yellow hover:text-textDark transition-all"
          >
            [SAMPLE: NEW STARTUP]
          </button>
        </div>
      </div>

      {/* DEMO MODE banner — verification is simulated, the mint is REAL */}
      {demoMode && (
        <div className="bg-neon-yellow/20 border-2 border-textDark p-4 shadow-md flex items-start gap-3">
          <FlaskConical className="w-5 h-5 text-textDark flex-shrink-0 mt-0.5" />
          <div className="text-xs font-bold leading-relaxed">
            <span className="font-black uppercase text-textDark block">
              DEMO MODE — verification is simulated
            </span>
            <span className="text-textMuted">
              Registration runs DEMO VERIFICATION: no government or external registry is
              consulted, and an administrator still verifies your company before the badge
              becomes available. The badge mint itself is a{' '}
              <span className="font-black text-textDark">
                REAL Polygon Amoy testnet transaction
              </span>{' '}
              to your connected MetaMask wallet.
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left 7 Cols: Registration Form */}
        <div className="lg:col-span-7 bg-surface border-2 border-textDark p-6 sm:p-8 shadow-md space-y-6">
          <h2 className="text-base font-black uppercase tracking-wide border-b-2 border-borderDark pb-3 flex items-center gap-2 text-textDark">
            <Building2 className="w-5 h-5 text-textDark" />
            <span>CORPORATE SUBMISSION FORM</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Name & Domain */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-textDark font-extrabold uppercase mb-1">
                  COMPANY LEGAL NAME *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. TechNova Pvt Ltd"
                  className="w-full bg-pitch border border-borderDark p-3 text-textDark font-bold focus:outline-none focus:border-textDark"
                  required
                />
              </div>

              <div>
                <label className="block text-textDark font-extrabold uppercase mb-1">
                  OFFICIAL DOMAIN *
                </label>
                <input
                  type="text"
                  name="domain"
                  value={formData.domain}
                  onChange={handleChange}
                  placeholder="e.g. technova.com"
                  className="w-full bg-pitch border border-borderDark p-3 text-textDark font-bold focus:outline-none focus:border-textDark"
                  required
                />
              </div>
            </div>

            {/* Email & Website */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-textDark font-extrabold uppercase mb-1">
                  CORPORATE EMAIL *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="hr@technova.com"
                  className="w-full bg-pitch border border-borderDark p-3 text-textDark font-bold focus:outline-none focus:border-textDark"
                  required
                />
              </div>

              <div>
                <label className="block text-textDark font-extrabold uppercase mb-1">
                  WEBSITE URL *
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://technova.com"
                  className="w-full bg-pitch border border-borderDark p-3 text-textDark font-bold focus:outline-none focus:border-textDark"
                  required
                />
              </div>
            </div>

            {/* GSTIN & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-textDark font-extrabold uppercase mb-1">
                  INDIAN GSTIN (15 CHARACTERS)
                </label>
                <input
                  type="text"
                  name="gstin"
                  maxLength={15}
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="e.g. 27AABCU9603R1ZN"
                  className="w-full bg-pitch border border-borderDark p-3 text-textDark font-bold uppercase focus:outline-none focus:border-textDark"
                />
              </div>

              <div>
                <label className="block text-textDark font-extrabold uppercase mb-1">
                  REGISTERED ADDRESS
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="e.g. BKC, Mumbai"
                  className="w-full bg-pitch border border-borderDark p-3 text-textDark font-bold focus:outline-none focus:border-textDark"
                />
              </div>
            </div>

            {/* Wallet Connection */}
            <div className="p-3 bg-pitch border border-borderDark space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="block text-textDark font-extrabold uppercase">
                  CORPORATE POLYGON AMOY WALLET *
                </label>
                {wallet ? (
                  <span className="text-[11px] font-black text-neon-green font-mono flex items-center gap-2">
                    {shortAddress(wallet.address)}
                    <span
                      className={`px-1.5 py-0.5 border text-[10px] font-black uppercase ${
                        onAmoy
                          ? 'border-textDark text-textDark'
                          : 'border-risk-high text-risk-high bg-risk-high/10'
                      }`}
                    >
                      {onAmoy ? 'POLYGON AMOY' : 'WRONG NETWORK'}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-risk-high">NOT CONNECTED</span>
                )}
              </div>

              {!wallet ? (
                <button
                  type="button"
                  onClick={handleConnectWallet}
                  disabled={connecting}
                  className="w-full py-3 bg-neon-yellow border-2 border-textDark text-textDark font-black text-xs uppercase tracking-wider hover:bg-neon-green transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Wallet className="w-4 h-4" />
                  <span>
                    {connecting ? 'CONNECTING...' : 'CONNECT METAMASK (POLYGON AMOY)'}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 py-3 bg-neon-green/20 border-2 border-textDark text-textDark font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>WALLET CONNECTED</span>
                  </div>
                  {!onAmoy && (
                    <button
                      type="button"
                      onClick={handleSwitchNetwork}
                      className="px-3 py-3 bg-neon-yellow border-2 border-textDark text-textDark font-black text-xs uppercase hover:bg-neon-green transition-all"
                    >
                      SWITCH TO AMOY
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDisconnectWallet}
                    className="px-3 py-3 bg-pitch border-2 border-textDark text-textDark font-black text-xs uppercase hover:bg-risk-high/20 transition-all"
                  >
                    RESET
                  </button>
                </div>
              )}
              {wallet && (
                <p className="text-[11px] text-textMuted font-bold break-all">
                  {wallet.address}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-4 bg-neon-yellow border-2 border-textDark text-textDark font-black text-sm uppercase tracking-wider hover:bg-neon-green transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>SUBMITTING FOR VERIFICATION...</span>
                </>
              ) : (
                <>
                  <span>SUBMIT FOR VERIFICATION</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right 5 Cols: Terminal or Results */}
        <div className="lg:col-span-5 space-y-6">
          {loading ? (
            <div className="bg-pitch border-2 border-textDark p-6 shadow-md font-mono space-y-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-textDark border-b border-borderDark pb-3">
                <Terminal className="w-4 h-4 text-neon-green animate-pulse" />
                <span>VERIFICATION TERMINAL</span>
              </div>

              <div className="space-y-3">
                {(demoMode ? DEMO_SUBMISSION_STEPS : SUBMISSION_STEPS).map((s, idx) => (
                  <div
                    key={s}
                    className={`flex items-start gap-2.5 text-xs transition-opacity duration-300 ${
                      idx <= loadingStep ? 'opacity-100' : 'opacity-20'
                    }`}
                  >
                    <span className="font-bold font-mono text-[10px]">
                      {idx < loadingStep ? '✓' : idx === loadingStep ? '▶' : '·'}
                    </span>
                    <span
                      className={
                        idx === loadingStep
                          ? 'text-neon-yellow font-black'
                          : idx < loadingStep
                            ? 'text-textDark font-bold'
                            : 'text-textMuted'
                      }
                    >
                      {s}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : !result ? (
            <div className="bg-surface border-2 border-textDark p-6 text-center space-y-4 shadow-md">
              <ShieldCheck className="w-12 h-12 text-textDark mx-auto" />
              <h3 className="text-sm font-black uppercase tracking-wider text-textDark">
                VERIFICATION PIPELINE
              </h3>
              <p className="text-xs text-textMuted leading-relaxed font-semibold">
                {demoMode
                  ? 'When you submit, FOCAL validates your registration and runs DEMO VERIFICATION — no external registry is consulted. A FOCAL administrator then verifies your dossier before the badge becomes available.'
                  : 'When you submit, FOCAL validates your registration, verifies your GSTIN, and queues your dossier for administrator review. Once approved, the soulbound trust badge is minted on Polygon Amoy to your connected wallet.'}
              </p>
              <div className="p-3 bg-pitch border border-borderDark text-[11px] text-textMuted font-bold text-left space-y-1">
                <div>• Domain and wallet uniqueness enforced</div>
                <div>
                  •{' '}
                  {demoMode
                    ? 'DEMO VERIFICATION (simulated — no government registry)'
                    : 'GSTIN registry verification by the backend'}
                </div>
                <div>• Administrator review before approval</div>
                <div>• Soulbound badge minted on Polygon Amoy after approval</div>
              </div>
            </div>
          ) : (
            /* REGISTRATION RESULT DOSSIER */
            <div className="bg-surface border-2 border-textDark p-6 shadow-xl space-y-6">
              <div className="border-b-2 border-borderDark pb-4 space-y-2">
                <div className="text-[10px] font-black uppercase text-textMuted tracking-wider">
                  REGISTRATION RESULTS DOSSIER
                </div>
                <h3 className="text-xl font-extrabold text-textDark">{result.name}</h3>
                <div className="flex items-center flex-wrap gap-2">
                  <Badge status={result.status} />
                  {result.demoMode && (
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase border bg-neon-yellow/30 border-textDark">
                      DEMO REGISTRATION
                    </span>
                  )}
                  <span className="text-xs font-black text-textDark font-mono">
                    TRUST SCORE: {result.trustScore}/100
                  </span>
                </div>
              </div>

              {/* Demo verification explanation */}
              {result.demoMode && (
                <div className="p-3 bg-neon-yellow/20 border border-textDark text-xs font-bold text-textDark space-y-1">
                  <div className="font-black uppercase flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>DEMO VERIFICATION — PASSED</span>
                  </div>
                  <p>
                    Company details passed the demo verification checks. This is{' '}
                    <span className="font-black">not</span> a government or external registry
                    check.
                  </p>
                </div>
              )}

              {/* Status explanation — VERIFIED and BADGE MINTED are separate facts */}
              {result.status === 'pending' && (
                <div className="p-3 bg-neon-yellow/20 border border-textDark text-xs font-bold text-textDark space-y-1">
                  <div className="font-black uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>PENDING ADMIN REVIEW</span>
                  </div>
                  <p>
                    Your company is awaiting administrator verification. Once a FOCAL
                    administrator verifies your dossier, the FOCAL badge becomes available.
                  </p>
                </div>
              )}
              {result.status === 'verified' && (
                <div className="p-3 bg-neon-green/20 border border-textDark text-xs font-bold text-textDark space-y-1">
                  <div className="font-black uppercase flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>VERIFIED BY FOCAL ADMINISTRATOR</span>
                  </div>
                  <p>Your company has been verified by FOCAL.</p>
                </div>
              )}
              {(result.status === 'rejected' || result.status === 'revoked') && (
                <div className="p-3 bg-risk-high/10 border border-risk-high text-xs font-bold text-textDark space-y-1">
                  <div className="font-black uppercase flex items-center gap-1.5 text-risk-high">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{result.status === 'rejected' ? 'REJECTED' : 'REVOKED'}</span>
                  </div>
                  <p>
                    {result.status === 'rejected'
                      ? 'A FOCAL administrator rejected this registration.'
                      : 'This company’s verification has been revoked by a FOCAL administrator.'}
                  </p>
                </div>
              )}

              {/* NFT badge panel — mint eligibility, real mint, real data */}
              <CompanyMintPanel
                company={result}
                wallet={wallet}
                onBadgeMinted={() => handleRefreshStatus()}
              />

              {/* GST Verification Breakdown */}
              <div className="p-3 bg-pitch border border-borderDark space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-textDark">
                    {result.demoMode ? 'GST VERIFICATION (DEMO)' : 'GST VERIFICATION'}
                  </span>
                  {result.gst?.status === 'verified' ? (
                    <span className="text-textDark font-black flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-textDark" />
                      {result.gst?.simulated ? 'DEMO VERIFIED' : 'VERIFIED'}
                    </span>
                  ) : result.gst?.status === 'not_provided' ? (
                    <span className="text-textMuted font-bold">NOT PROVIDED</span>
                  ) : (
                    <span className="text-risk-high font-black flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-risk-high" />
                      {result.gst?.status === 'unavailable' ? 'SERVICE UNAVAILABLE' : 'NOT VERIFIED'}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-textMuted space-y-0.5">
                  <div>
                    GSTIN:{' '}
                    <span className="font-mono text-textDark font-bold">
                      {result.gst?.gstin || 'NOT PROVIDED'}
                    </span>
                  </div>
                  {result.gst?.legalName && (
                    <div>
                      LEGAL NAME: <span className="text-textDark font-bold">{result.gst.legalName}</span>
                    </div>
                  )}
                  <div>
                    STATUS:{' '}
                    <span className="text-textDark font-bold uppercase">
                      {result.gst?.registrationStatus || result.gst?.status?.toUpperCase() || 'PENDING'}
                    </span>
                  </div>
                  {result.gst?.simulated && (
                    <div className="text-neon-yellow font-bold">
                      SOURCE: {result.demoMode ? 'DEMO MODE' : 'SIMULATED'} / NO GOVERNMENT REGISTRY WAS CONTACTED
                    </div>
                  )}
                </div>
              </div>

              {/* Registered Identity */}
              <div className="p-3 bg-pitch border border-borderDark space-y-2 text-xs">
                <div className="font-extrabold uppercase text-textDark border-b border-borderDark pb-1.5">
                  REGISTERED IDENTITY
                </div>
                <div className="text-[11px] text-textMuted space-y-0.5">
                  <div>
                    DOMAIN:{' '}
                    <span className="font-mono text-textDark font-bold">{result.domain}</span>
                  </div>
                  <div>
                    EMAIL: <span className="text-textDark font-bold">{result.email}</span>
                  </div>
                  <div>
                    WALLET:{' '}
                    <span className="font-mono text-textDark font-bold break-all">
                      {result.blockchain?.walletAddress || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleRefreshStatus}
                  disabled={refreshing}
                  className="w-full py-2.5 bg-pitch border-2 border-textDark text-textDark font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neon-yellow transition-all disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span>{refreshing ? 'REFRESHING...' : 'REFRESH STATUS'}</span>
                </button>
                <Link
                  to={`/company/${result.id}`}
                  className="w-full py-3 bg-neon-yellow border-2 border-textDark text-textDark font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-neon-green transition-all shadow-sm"
                >
                  <Link2 className="w-4 h-4" />
                  <span>OPEN COMPANY PROFILE &amp; PROOF →</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Trust note */}
      <div className="bg-surface border border-borderDark p-4 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-4 h-4 text-textDark flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-textMuted font-bold leading-relaxed">
          Registration alone does not make a company verified. Trust status is granted only by
          FOCAL administrator approval, and the on-chain badge is a real Polygon Amoy
          transaction — students and the public can always check any company on FOCAL without
          an account.
        </p>
      </div>
    </div>
  );
}