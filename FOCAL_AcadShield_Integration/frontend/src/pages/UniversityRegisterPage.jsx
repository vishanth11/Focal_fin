import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  FileCheck,
  ShieldCheck,
  ArrowRight,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileText
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { universityRegister } from '../services/api';
import { connectWallet, switchToAmoy, OMEN_CHAIN_ID } from '../services/blockchain';

const INSTITUTION_TYPES = [
  'Central University',
  'State University',
  'Deemed University',
  'Private University',
  'Autonomous College',
  'Affiliated College',
  'Institute of National Importance',
  'Other'
];

export default function UniversityRegisterPage() {
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    institutionType: 'State University',
    registrationNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    representativeName: '',
    representativeEmail: '',
    representativeTitle: '',
    walletAddress: ''
  });

  const [walletConnected, setWalletConnected] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedUniversity, setSubmittedUniversity] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConnectWallet = async () => {
    setConnectingWallet(true);
    try {
      const { address } = await connectWallet();
      setFormData((prev) => ({ ...prev, walletAddress: address }));
      setWalletConnected(true);
      showToast(`Connected institutional wallet: ${address.slice(0, 6)}...${address.slice(-4)}`, 'success');

      try {
        await switchToAmoy();
      } catch (err) {
        showToast('Wallet switched network warning: Ensure Polygon Amoy testnet is active.', 'warning');
      }
    } catch (err) {
      showToast(err.message || 'Failed to connect MetaMask wallet', 'error');
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.registrationNumber || !formData.website || !formData.address) {
      showToast('Please fill all required institutional fields.', 'warning');
      return;
    }

    if (formData.password.length < 8) {
      showToast('Password must be at least 8 characters long.', 'warning');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast('Passwords do not match.', 'error');
      return;
    }

    if (!formData.walletAddress) {
      showToast('Institutional Polygon Amoy wallet is required for on-chain identity.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await universityRegister(formData);
      setSubmittedUniversity(res.university);
      showToast('University application submitted for platform review.', 'success');
    } catch (err) {
      showToast(err.message || 'Registration failed. Check details.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedUniversity) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 font-mono text-textDark">
        <div className="bg-surface border-2 border-textDark p-8 shadow-2xl space-y-6">
          <div className="flex items-center gap-3 border-b border-borderDark pb-4">
            <CheckCircle2 className="w-8 h-8 text-neon-green" />
            <div>
              <span className="text-[10px] tracking-widest text-textMuted uppercase block">ACADEMIC INSTITUTION PROTOCOL</span>
              <h1 className="text-xl font-extrabold uppercase">APPLICATION SUBMITTED: PENDING REVIEW</h1>
            </div>
          </div>

          <div className="p-4 bg-neon-yellow/20 border border-textDark space-y-2">
            <div className="text-xs font-extrabold uppercase flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-textDark" />
              <span>STATUS: APPLICATION PENDING ADMINISTRATOR REVIEW</span>
            </div>
            <p className="text-xs text-textMuted font-bold leading-relaxed">
              Your institutional application for <strong>{formData.name}</strong> (ID: {formData.registrationNumber}) has been securely recorded.
              Platform administrators verify institutional accreditations before granting credential issuance authority.
            </p>
          </div>

          <div className="space-y-2 text-xs border border-borderDark p-4 bg-pitch">
            <div><span className="text-textMuted">Institution:</span> <span className="font-bold">{formData.name}</span></div>
            <div><span className="text-textMuted">Official Email:</span> <span className="font-bold">{formData.email}</span></div>
            <div><span className="text-textMuted">Type:</span> <span className="font-bold">{formData.institutionType}</span></div>
            <div><span className="text-textMuted">Wallet:</span> <span className="font-bold">{formData.walletAddress}</span></div>
            <div><span className="text-textMuted">Authorized Representative:</span> <span className="font-bold">{formData.representativeName} ({formData.representativeTitle})</span></div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-borderDark">
            <Link
              to="/university/login"
              className="flex-1 py-3 bg-neon-green border-2 border-textDark text-center font-extrabold text-xs uppercase tracking-wider hover:bg-neon-yellow transition-all"
            >
              PROCEED TO INSTITUTIONAL LOGIN →
            </Link>
            <Link
              to="/"
              className="py-3 px-6 bg-surface border-2 border-textDark text-center font-extrabold text-xs uppercase tracking-wider hover:bg-pitch transition-all"
            >
              HOME
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 font-mono text-textDark">
      {/* Header Banner */}
      <div className="bg-surface border-2 border-textDark p-8 mb-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] tracking-widest text-textMuted uppercase font-bold">
              <GraduationCap className="w-4 h-4 text-neon-green" />
              <span>ACADSHIELD INSTITUTIONAL ISSUER PORTAL</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight">
              REGISTER ACADEMIC INSTITUTION
            </h1>
            <p className="text-xs text-textMuted font-bold max-w-2xl leading-relaxed">
              Authoritative universities issue cryptographically verifiable credentials (VCs) and tamper-proof NFT records on Polygon for marksheets, transcripts, and degree certificates.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/university/login"
              className="px-4 py-2 border-2 border-textDark bg-surface text-xs font-extrabold uppercase hover:bg-neon-yellow transition-all"
            >
              ALREADY REGISTERED? LOGIN →
            </Link>
          </div>
        </div>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="bg-surface border-2 border-textDark p-6 sm:p-8 space-y-8 shadow-2xl">
        {/* Section 1: Institution Identity */}
        <div className="space-y-4">
          <div className="border-b border-borderDark pb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>1. INSTITUTION LEGAL INFORMATION</span>
            </h2>
            <span className="text-[10px] text-textMuted uppercase">* REQUIRED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Official University / College Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Anna University of Technology"
                required
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark focus:bg-surface text-xs font-mono outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Institution Category *</label>
              <select
                name="institutionType"
                value={formData.institutionType}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Recognition / Registration ID *</label>
              <input
                type="text"
                name="registrationNumber"
                value={formData.registrationNumber}
                onChange={handleChange}
                placeholder="e.g. UGC-2024-TN-401 or AISHE-U-0123"
                required
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none uppercase"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Official Institutional Website *</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://annauniv-tech.edu.in"
                required
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Campus Address & Jurisdiction *</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Sardar Patel Road, Guindy"
                required
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">State / Province</label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Tamil Nadu"
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Account & Authorized Representative */}
        <div className="space-y-4">
          <div className="border-b border-borderDark pb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>2. AUTHORIZED REGISTRAR / SIGNATORY DETAILS</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Representative Full Name *</label>
              <input
                type="text"
                name="representativeName"
                value={formData.representativeName}
                onChange={handleChange}
                placeholder="Dr. R. Ramanathan"
                required
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Official Title / Designation *</label>
              <input
                type="text"
                name="representativeTitle"
                value={formData.representativeTitle}
                onChange={handleChange}
                placeholder="Registrar & Controller of Examinations"
                required
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Representative Email *</label>
              <input
                type="email"
                name="representativeEmail"
                value={formData.representativeEmail}
                onChange={handleChange}
                placeholder="registrar@annauniv-tech.edu.in"
                required
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Institutional Login Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="credentials@annauniv-tech.edu.in"
                required
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Secure Password (min 8 chars) *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                required
                minLength={8}
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase block text-textMuted">Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••••••"
                required
                minLength={8}
                className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Institutional Blockchain Wallet */}
        <div className="space-y-4">
          <div className="border-b border-borderDark pb-2 flex items-center justify-between">
            <h2 className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              <span>3. INSTITUTIONAL BLOCKCHAIN WALLET (POLYGON AMOY)</span>
            </h2>
            <span className="text-[10px] text-neon-green uppercase font-bold">SMART CONTRACT ANCHOR</span>
          </div>

          <p className="text-xs text-textMuted font-bold leading-relaxed">
            Every issued academic credential contains the university's decentralized identifier (DID) linked to this authorized Polygon address.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <input
              type="text"
              name="walletAddress"
              value={formData.walletAddress}
              onChange={handleChange}
              placeholder="0x..."
              required
              className="flex-1 px-3 py-2.5 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
            />
            <button
              type="button"
              onClick={handleConnectWallet}
              disabled={connectingWallet}
              className="px-4 py-2.5 bg-surface border-2 border-textDark font-extrabold text-xs uppercase hover:bg-neon-yellow transition-all flex items-center justify-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              <span>{connectingWallet ? 'CONNECTING...' : (walletConnected ? 'WALLET CONNECTED ✓' : 'CONNECT METAMASK')}</span>
            </button>
          </div>
        </div>

        {/* Submit Action */}
        <div className="pt-4 border-t-2 border-textDark flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-textMuted font-bold">
            Submitting records status as <span className="font-extrabold text-textDark">PENDING</span>. Credential issuance activates after administrator approval.
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-3.5 bg-neon-green border-2 border-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-yellow transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>{submitting ? 'RECORDING REGISTRATION...' : 'SUBMIT APPLICATION FOR REVIEW'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
