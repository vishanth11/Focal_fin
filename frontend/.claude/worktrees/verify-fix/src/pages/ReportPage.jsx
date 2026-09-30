import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react';
import { submitReport } from '../services/api';
import { useApp } from '../context/AppContext';

export default function ReportPage() {
  const [searchParams] = useSearchParams();
  const initialCompany = searchParams.get('company') || '';
  const initialDomain = searchParams.get('domain') || '';
  const { showToast } = useApp();

  const [form, setForm] = useState({
    companyName: initialCompany,
    domain: initialDomain,
    reporterName: '',
    reporterEmail: '',
    category: 'Typosquatting',
    description: '',
    evidenceUrl: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const categories = [
    'Fraud',
    'Impersonation',
    'Typosquatting',
    'Fake business',
    'Payment scam',
    'Phishing',
    'Fake job/internship',
    'Other'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.companyName || !form.reporterEmail || !form.description) {
      showToast('Please complete all required fields.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitReport(form);
      if (res.success) {
        setSubmitted(true);
        showToast('Scam & risk report received by FOCAL. administrators', 'success');
      }
    } catch (err) {
      showToast('Error submitting report.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-mono space-y-10 text-textDark">
      <div className="space-y-2 border-b border-borderDark pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-risk-high/10 border border-risk-high text-risk-high text-xs font-bold uppercase tracking-widest">
          <AlertTriangle className="w-4 h-4" />
          <span>FOCAL. RISK RADAR REPORTING</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-textDark tracking-tight">
          SOMETHING DOESN'T LOOK RIGHT?
        </h1>
        <p className="text-sm text-textMuted max-w-xl leading-relaxed font-bold">
          Report suspicious business activity, lookalike domains, or phishing scams to safeguard the FOCAL. trusted network.
        </p>
      </div>

      {submitted ? (
        <div className="p-12 bg-surface border-2 border-textDark text-center space-y-6 shadow-xl animate-fadeIn">
          <CheckCircle2 className="w-16 h-16 text-textDark mx-auto animate-bounce" />
          <div className="text-3xl font-extrabold text-textDark uppercase tracking-tight">
            REPORT RECEIVED ✓
          </div>
          <p className="text-xs text-textMuted max-w-md mx-auto leading-relaxed font-bold">
            Thank you for helping protect the FOCAL. ecosystem. Our security intelligence team will audit the reported domain and update trust scores accordingly.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setForm({
                companyName: '',
                domain: '',
                reporterName: '',
                reporterEmail: '',
                category: 'Typosquatting',
                description: '',
                evidenceUrl: ''
              });
            }}
            className="px-8 py-3 bg-neon-yellow text-textDark border-2 border-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-green transition-all shadow-sm"
          >
            FILE ANOTHER REPORT →
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-surface border-2 border-textDark p-8 space-y-6 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-xs text-textMuted font-bold block uppercase mb-2">COMPANY NAME *</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="e.g. Companny Cyber Trust"
                className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
                required
              />
            </div>

            <div>
              <label className="text-xs text-textMuted font-bold block uppercase mb-2">COMPANY DOMAIN / URL</label>
              <input
                type="text"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="e.g. companny.com"
                className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
              />
            </div>

            <div>
              <label className="text-xs text-textMuted font-bold block uppercase mb-2">REPORTER NAME</label>
              <input
                type="text"
                value={form.reporterName}
                onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
                placeholder="e.g. Alex Mercer"
                className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
              />
            </div>

            <div>
              <label className="text-xs text-textMuted font-bold block uppercase mb-2">REPORTER EMAIL *</label>
              <input
                type="email"
                value={form.reporterEmail}
                onChange={(e) => setForm({ ...form, reporterEmail: e.target.value })}
                placeholder="e.g. alex@company.com"
                className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-textMuted font-bold block uppercase mb-2">INCIDENT CATEGORY *</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-surface text-textDark">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-textMuted font-bold block uppercase mb-2">DESCRIPTION OF SUSPICIOUS ACTIVITY *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              placeholder="Describe the scam, impersonation tactic, or suspicious payment request in detail..."
              className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
              required
            />
          </div>

          <div>
            <label className="text-xs text-textMuted font-bold block uppercase mb-2">EVIDENCE URL / SCREENSHOT LINK</label>
            <input
              type="url"
              value={form.evidenceUrl}
              onChange={(e) => setForm({ ...form, evidenceUrl: e.target.value })}
              placeholder="https://drive.google.com/... or https://evidence.link/101.png"
              className="w-full bg-pitch border border-borderDark p-3 text-xs text-textDark font-bold focus:outline-none focus:border-textDark"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-neon-yellow text-textDark border-2 border-textDark font-extrabold text-xs uppercase tracking-wider hover:bg-neon-green transition-all shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>TRANSMITTING REPORT...</span>
              ) : (
                <>
                  <span>SUBMIT REPORT →</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
