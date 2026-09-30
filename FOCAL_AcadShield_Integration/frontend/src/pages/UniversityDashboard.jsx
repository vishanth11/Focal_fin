import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  Users,
  FileCheck,
  FileText,
  Upload,
  Plus,
  Search,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  QrCode,
  Download,
  Clock,
  Sparkles,
  ArrowRight,
  LogOut,
  RefreshCw,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  getUniversityDashboard,
  getUniversityStudents,
  universityAddStudent,
  universityBulkImportStudents,
  universityExtractDocument,
  universityIssueCredential,
  getUniversityCredentials,
  universityRevokeCredential
} from '../services/api';

const DOCUMENT_TYPES = [
  'Degree Certificate',
  'Semester Marksheet',
  'SSLC Marksheet',
  'HSC Marksheet',
  'Diploma Certificate',
  'Transcript',
  'Transfer Certificate',
  'Other Academic Credential'
];

export default function UniversityDashboard() {
  const { universityProfile, logoutUniversity, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'students' | 'issue' | 'credentials' | 'audit'

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [students, setStudents] = useState([]);
  const [credentials, setCredentials] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [credSearch, setCredSearch] = useState('');

  // Modals
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedCredForRevoke, setSelectedCredForRevoke] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');

  // View Credential Modal
  const [viewingCredential, setViewingCredential] = useState(null);

  // New Student Form
  const [newStudent, setNewStudent] = useState({
    name: '',
    enrollmentNumber: '',
    email: '',
    department: 'Computer Science & Engineering',
    program: 'B.Tech',
    degree: 'Bachelor of Technology',
    enrollmentYear: 2022,
    graduationYear: 2026,
    cgpa: '8.9'
  });

  // Bulk CSV
  const [csvText, setCsvText] = useState('');

  // Issuance Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [issuanceData, setIssuanceData] = useState({
    studentId: '',
    documentType: 'Degree Certificate',
    credentialTitle: '',
    semester: 'Final Semester',
    cgpa: '',
    passingYear: 2026,
    fileBase64: '',
    originalName: '',
    mimeType: '',
    documentHash: '',
    notes: ''
  });
  const [extractionResult, setExtractionResult] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issuedResult, setIssuedResult] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await getUniversityDashboard();
      setDashboardData(res.data);
    } catch (err) {
      showToast(err.message || 'Error fetching institutional dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsList = async () => {
    try {
      const res = await getUniversityStudents({ search: studentSearch });
      setStudents(res.data?.students || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCredentialsList = async () => {
    try {
      const res = await getUniversityCredentials({ search: credSearch });
      setCredentials(res.data?.credentials || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (activeTab === 'students') fetchStudentsList();
    if (activeTab === 'credentials') fetchCredentialsList();
  }, [activeTab, studentSearch, credSearch]);

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      await universityAddStudent(newStudent);
      showToast('Student enrolled successfully', 'success');
      setShowAddStudentModal(false);
      fetchStudentsList();
      fetchDashboard();
    } catch (err) {
      showToast(err.message || 'Failed to add student', 'error');
    }
  };

  const handleBulkImport = async () => {
    if (!csvText.trim()) {
      showToast('Please paste valid CSV data', 'warning');
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const studentsToImport = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = lines[i].split(',').map(v => v.trim());
        const studentObj = {};
        headers.forEach((h, idx) => {
          studentObj[h] = values[idx] || '';
        });
        studentsToImport.push(studentObj);
      }

      const res = await universityBulkImportStudents(studentsToImport);
      showToast(res.message, 'success');
      setShowImportModal(false);
      setCsvText('');
      fetchStudentsList();
      fetchDashboard();
    } catch (err) {
      showToast(err.message || 'Failed to bulk import', 'error');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      setIssuanceData(prev => ({
        ...prev,
        fileBase64: base64,
        originalName: file.name,
        mimeType: file.type
      }));

      // Trigger AI/OCR assistant extraction
      setExtracting(true);
      try {
        const res = await universityExtractDocument({
          studentId: issuanceData.studentId,
          originalName: file.name,
          mimeType: file.type,
          fileBase64: base64
        });
        setExtractionResult(res.data.extraction);
        setIssuanceData(prev => ({
          ...prev,
          documentHash: res.data.documentHash,
          cgpa: res.data.extraction?.extractedData?.detectedCgpa || prev.cgpa
        }));
        showToast('Document analyzed by AI extraction engine.', 'info');
      } catch (err) {
        console.error(err);
      } finally {
        setExtracting(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmIssuance = async () => {
    setIssuing(true);
    try {
      const res = await universityIssueCredential({
        studentId: issuanceData.studentId,
        documentType: issuanceData.documentType,
        credentialTitle: issuanceData.credentialTitle || `${issuanceData.documentType}`,
        academicClaims: {
          cgpa: issuanceData.cgpa,
          semester: issuanceData.semester,
          passingYear: Number(issuanceData.passingYear)
        },
        documentHash: issuanceData.documentHash,
        fileBase64: issuanceData.fileBase64,
        originalName: issuanceData.originalName,
        mimeType: issuanceData.mimeType,
        notes: issuanceData.notes
      });

      setIssuedResult(res.credential);
      showToast('Credential successfully issued and signed!', 'success');
      setWizardStep(4);
      fetchDashboard();
    } catch (err) {
      showToast(err.message || 'Issuance failed', 'error');
    } finally {
      setIssuing(false);
    }
  };

  const handleRevokeConfirm = async () => {
    if (!selectedCredForRevoke || !revokeReason) {
      showToast('Please state a reason for revocation.', 'warning');
      return;
    }

    try {
      await universityRevokeCredential(selectedCredForRevoke.credentialId, revokeReason);
      showToast(`Credential ${selectedCredForRevoke.credentialId} revoked.`, 'info');
      setShowRevokeModal(false);
      setSelectedCredForRevoke(null);
      setRevokeReason('');
      fetchCredentialsList();
      fetchDashboard();
    } catch (err) {
      showToast(err.message || 'Revocation failed', 'error');
    }
  };

  const isApproved = dashboardData?.university?.status === 'approved';

  if (loading && !dashboardData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center font-mono text-textDark">
        <div className="font-extrabold text-sm animate-pulse">SYNCHRONIZING INSTITUTIONAL DOSSIER...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 font-mono text-textDark space-y-8">
      {/* Institutional Top Bar */}
      <div className="bg-surface border-2 border-textDark p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pitch border-2 border-textDark rounded-sm">
            <GraduationCap className="w-8 h-8 text-neon-green" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-extrabold uppercase">{dashboardData?.university?.name || universityProfile?.name}</span>
              <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded border ${
                isApproved
                  ? 'bg-neon-green text-pitch border-textDark'
                  : 'bg-neon-yellow text-pitch border-textDark animate-pulse'
              }`}>
                {dashboardData?.university?.status || 'PENDING'}
              </span>
            </div>
            <div className="text-xs text-textMuted font-bold mt-1 flex flex-wrap gap-4">
              <span>REG ID: <strong>{dashboardData?.university?.registrationNumber}</strong></span>
              <span>DID: <code className="text-textDark font-mono">{dashboardData?.university?.issuerDid}</code></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="p-2.5 bg-pitch border border-borderDark hover:border-textDark rounded text-xs"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={logoutUniversity}
            className="px-4 py-2.5 bg-surface border-2 border-textDark text-xs font-extrabold uppercase hover:bg-neon-yellow transition-all flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>DISCONNECT</span>
          </button>
        </div>
      </div>

      {/* Approval Warning Banner if Pending */}
      {!isApproved && (
        <div className="p-4 bg-neon-yellow/30 border-2 border-textDark flex items-start gap-3 shadow-md">
          <AlertTriangle className="w-5 h-5 text-textDark flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="text-xs font-extrabold uppercase">
              INSTITUTION STATUS: {dashboardData?.university?.status?.toUpperCase()} — AWAITING PLATFORM GOVERNANCE
            </div>
            <p className="text-xs text-textMuted font-bold leading-relaxed">
              Your institutional application is currently under review by FOCAL administrators.
              Once approved, your institution's signing key and DID will be authorized to issue on-chain academic credentials and students can verify marksheets.
            </p>
          </div>
        </div>
      )}

      {/* Workspace Navigation Tabs */}
      <div className="flex border-b-2 border-textDark space-x-1 sm:space-x-3 overflow-x-auto text-xs font-extrabold uppercase tracking-wider">
        {[
          { id: 'overview', label: 'OVERVIEW & STATS', icon: Building2 },
          { id: 'students', label: 'STUDENT ROSTER', icon: Users },
          { id: 'issue', label: 'ISSUE CREDENTIAL (ACADSHIELD)', icon: Plus },
          { id: 'credentials', label: 'ISSUED CREDENTIALS', icon: FileCheck },
          { id: 'audit', label: 'AUDIT TRAIL', icon: Clock }
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-t-2 border-l-2 border-r-2 border-textDark flex items-center gap-2 transition-all ${
                active
                  ? 'bg-neon-yellow text-textDark translate-y-[2px]'
                  : 'bg-surface text-textMuted hover:text-textDark hover:bg-pitch'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border-2 border-textDark p-5 shadow-sm">
              <span className="text-[10px] text-textMuted font-bold uppercase tracking-wider block">TOTAL ENROLLED STUDENTS</span>
              <div className="text-3xl font-extrabold mt-2">{dashboardData?.stats?.totalStudents || 0}</div>
              <span className="text-[10px] text-neon-green font-bold mt-1 block">INSTITUTIONAL DIRECTORY</span>
            </div>

            <div className="bg-surface border-2 border-textDark p-5 shadow-sm">
              <span className="text-[10px] text-textMuted font-bold uppercase tracking-wider block">CREDENTIALS ISSUED</span>
              <div className="text-3xl font-extrabold mt-2">{dashboardData?.stats?.totalCredentials || 0}</div>
              <span className="text-[10px] text-textMuted font-bold mt-1 block">W3C COMPLIANT VCs</span>
            </div>

            <div className="bg-surface border-2 border-textDark p-5 shadow-sm">
              <span className="text-[10px] text-textMuted font-bold uppercase tracking-wider block">ACTIVE ON-CHAIN</span>
              <div className="text-3xl font-extrabold text-neon-green mt-2">{dashboardData?.stats?.activeCredentials || 0}</div>
              <span className="text-[10px] text-textMuted font-bold mt-1 block">POLYGON AMOY ANCHORS</span>
            </div>

            <div className="bg-surface border-2 border-textDark p-5 shadow-sm">
              <span className="text-[10px] text-textMuted font-bold uppercase tracking-wider block">REVOKED / INVALID</span>
              <div className="text-3xl font-extrabold text-red-500 mt-2">{dashboardData?.stats?.revokedCredentials || 0}</div>
              <span className="text-[10px] text-textMuted font-bold mt-1 block">LIFECYCLE SUPERSEDED</span>
            </div>
          </div>

          {/* Institutional Blockchain Anchor Profile */}
          <div className="bg-surface border-2 border-textDark p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-borderDark pb-3">
              <div className="text-xs font-extrabold uppercase flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neon-green" />
                <span>CRYPTOGRAPHIC ISSUER AUTHORITY SPECIFICATION</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-pitch border border-borderDark uppercase font-bold">
                EIP-155 / W3C VC 3.0
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-pitch border border-borderDark space-y-1">
                <span className="text-textMuted font-bold">ISSUER DID:</span>
                <p className="font-mono font-bold break-all text-textDark">{dashboardData?.university?.issuerDid}</p>
              </div>

              <div className="p-3 bg-pitch border border-borderDark space-y-1">
                <span className="text-textMuted font-bold">AUTHORIZED WALLET ADDRESS:</span>
                <p className="font-mono font-bold break-all text-textDark">{dashboardData?.university?.walletAddress}</p>
              </div>
            </div>
          </div>

          {/* Recent Issuance Feed */}
          <div className="bg-surface border-2 border-textDark p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-borderDark pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider">RECENT ACADEMIC CREDENTIAL ISSUANCE</h3>
              <button onClick={() => setActiveTab('credentials')} className="text-xs font-bold underline hover:text-neon-green">
                VIEW ALL →
              </button>
            </div>

            {dashboardData?.recentCredentials?.length === 0 ? (
              <div className="py-8 text-center text-textMuted text-xs font-bold">
                NO CREDENTIALS ISSUED YET. CLICK "ISSUE CREDENTIAL" TO GET STARTED.
              </div>
            ) : (
              <div className="divide-y divide-borderDark">
                {dashboardData?.recentCredentials?.map((c) => (
                  <div key={c._id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-extrabold block text-textDark">{c.credentialTitle}</span>
                      <span className="text-[11px] text-textMuted">
                        Student: <strong>{c.studentName}</strong> ({c.enrollmentNumber}) • Type: {c.documentType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                        c.status === 'active' ? 'bg-neon-green/20 text-neon-green' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {c.status}
                      </span>
                      <button
                        onClick={() => setViewingCredential(c)}
                        className="px-2.5 py-1 bg-pitch border border-borderDark hover:border-textDark text-[11px] font-bold"
                      >
                        DETAILS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: STUDENT ROSTER */}
      {activeTab === 'students' && (
        <div className="bg-surface border-2 border-textDark p-6 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-borderDark pb-4">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide">STUDENT DIRECTORY & ENROLLMENT</h2>
              <p className="text-xs text-textMuted font-bold">Manage student records strictly isolated to your university.</p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                disabled={!isApproved}
                onClick={() => setShowImportModal(true)}
                className="flex-1 sm:flex-none px-4 py-2 bg-pitch border-2 border-textDark text-xs font-extrabold uppercase hover:bg-neon-yellow transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>CSV IMPORT</span>
              </button>
              <button
                disabled={!isApproved}
                onClick={() => setShowAddStudentModal(true)}
                className="flex-1 sm:flex-none px-4 py-2 bg-neon-green border-2 border-textDark text-xs font-extrabold uppercase hover:bg-neon-yellow transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD STUDENT</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 p-2 bg-pitch border border-borderDark max-w-md">
            <Search className="w-4 h-4 text-textMuted" />
            <input
              type="text"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Search by student name, roll number, or email..."
              className="bg-transparent border-none outline-none text-xs w-full font-mono text-textDark"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-borderDark">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-pitch border-b border-borderDark text-[10px] uppercase font-bold text-textMuted">
                  <th className="p-3">ROLL / ENROLLMENT NO</th>
                  <th className="p-3">STUDENT NAME</th>
                  <th className="p-3">OFFICIAL EMAIL</th>
                  <th className="p-3">DEPARTMENT</th>
                  <th className="p-3">DEGREE / PROGRAM</th>
                  <th className="p-3">BATCH</th>
                  <th className="p-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark bg-surface">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-textMuted font-bold">
                      NO STUDENTS FOUND. ADD STUDENTS INDIVIDUALLY OR VIA CSV BULK IMPORT.
                    </td>
                  </tr>
                ) : (
                  students.map((s) => (
                    <tr key={s._id} className="hover:bg-pitch/60 transition-colors">
                      <td className="p-3 font-extrabold">{s.enrollmentNumber}</td>
                      <td className="p-3 font-bold">{s.name}</td>
                      <td className="p-3 text-textMuted">{s.email}</td>
                      <td className="p-3">{s.department}</td>
                      <td className="p-3">{s.degree}</td>
                      <td className="p-3">{s.enrollmentYear} - {s.graduationYear || 'Present'}</td>
                      <td className="p-3">
                        <button
                          disabled={!isApproved}
                          onClick={() => {
                            setIssuanceData(prev => ({
                              ...prev,
                              studentId: s._id,
                              cgpa: s.cgpa ? String(s.cgpa) : ''
                            }));
                            setActiveTab('issue');
                          }}
                          className="px-3 py-1 bg-neon-green/20 border border-textDark text-[10px] font-extrabold uppercase hover:bg-neon-yellow transition-all disabled:opacity-50"
                        >
                          ISSUE VC →
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ACADSHIELD ISSUANCE WIZARD */}
      {activeTab === 'issue' && (
        <div className="bg-surface border-2 border-textDark p-6 sm:p-8 shadow-xl space-y-6">
          <div className="border-b border-borderDark pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-[10px] tracking-widest text-textMuted uppercase font-bold">
                <Sparkles className="w-4 h-4 text-neon-green" />
                <span>W3C VERIFIABLE CREDENTIAL ISSUANCE ENGINE</span>
              </div>
              <h2 className="text-xl font-extrabold uppercase">ISSUE ACADEMIC CREDENTIAL</h2>
            </div>
            <div className="text-xs font-bold text-textMuted">STEP {wizardStep} OF 4</div>
          </div>

          {!isApproved && (
            <div className="p-4 bg-red-500/20 border border-red-500 text-xs text-red-500 font-bold">
              Institutional authority is unapproved. Your university must be approved by platform administrators before issuing credentials.
            </div>
          )}

          {/* Wizard Step 1: Select Student & Document Category */}
          {wizardStep === 1 && (
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase block text-textMuted">Select Student from Roster *</label>
                <select
                  value={issuanceData.studentId}
                  onChange={(e) => setIssuanceData(prev => ({ ...prev, studentId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
                >
                  <option value="">-- Choose student --</option>
                  {students.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.enrollmentNumber}) — {s.degree}
                    </option>
                  ))}
                </select>
                {students.length === 0 && (
                  <p className="text-[11px] text-textMuted">No students available. Please add students first in the Student Roster tab.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase block text-textMuted">Document Type *</label>
                <select
                  value={issuanceData.documentType}
                  onChange={(e) => setIssuanceData(prev => ({ ...prev, documentType: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
                >
                  {DOCUMENT_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase block text-textMuted">Credential Title</label>
                <input
                  type="text"
                  value={issuanceData.credentialTitle}
                  onChange={(e) => setIssuanceData(prev => ({ ...prev, credentialTitle: e.target.value }))}
                  placeholder="e.g. Bachelor of Technology in Computer Science (Honors)"
                  className="w-full px-3 py-2 bg-pitch border border-borderDark focus:border-textDark text-xs font-mono outline-none"
                />
              </div>

              <button
                disabled={!issuanceData.studentId || !isApproved}
                onClick={() => setWizardStep(2)}
                className="px-6 py-2.5 bg-neon-green border-2 border-textDark font-extrabold text-xs uppercase hover:bg-neon-yellow transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <span>NEXT: UPLOAD & RUN AI/OCR PARSER</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Wizard Step 2: Upload File & AI/OCR Scan */}
          {wizardStep === 2 && (
            <div className="space-y-6 max-w-2xl">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase block text-textMuted">Upload Source Academic Certificate / Marksheet (PDF or Image) *</label>
                <div className="border-2 border-dashed border-textDark p-8 text-center bg-pitch cursor-pointer hover:bg-surface transition-colors relative">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 mx-auto text-textMuted mb-2" />
                  <span className="text-xs font-bold block text-textDark">
                    {issuanceData.originalName ? issuanceData.originalName : 'Click or drag certificate PDF / image to upload'}
                  </span>
                  <span className="text-[10px] text-textMuted mt-1 block">
                    Exact bytes will be fingerprinted via SHA-256 for cryptographic integrity checks.
                  </span>
                </div>
              </div>

              {extracting && (
                <div className="p-4 bg-neon-yellow/20 border border-textDark text-xs font-bold animate-pulse flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>AI/OCR ENGINE SCANNING DOCUMENT INTEGRITY AND EXTRACTING FIELDS...</span>
                </div>
              )}

              {extractionResult && (
                <div className="p-4 bg-pitch border-2 border-textDark space-y-3">
                  <div className="flex items-center justify-between border-b border-borderDark pb-2">
                    <span className="text-xs font-extrabold uppercase flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-neon-green" />
                      <span>AI ASSISTED EXTRACTION REPORT</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 bg-surface border font-bold">
                      CONFIDENCE: {extractionResult.confidenceScore}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-textMuted">Detected Name:</span> <strong className="block">{extractionResult.extractedData.detectedStudentName}</strong></div>
                    <div><span className="text-textMuted">Detected Enrollment:</span> <strong className="block">{extractionResult.extractedData.detectedEnrollmentNumber}</strong></div>
                    <div><span className="text-textMuted">Detected Degree:</span> <strong className="block">{extractionResult.extractedData.detectedDegree}</strong></div>
                    <div><span className="text-textMuted">Calculated SHA-256:</span> <code className="block text-[10px] font-mono break-all">{issuanceData.documentHash}</code></div>
                  </div>

                  {extractionResult.inconsistencies?.length > 0 && (
                    <div className="p-2 bg-red-500/20 border border-red-500 text-[11px] text-red-500 space-y-1">
                      <div className="font-extrabold uppercase">Potential Variance Flagged:</div>
                      {extractionResult.inconsistencies.map((err, i) => (
                        <div key={i}>• {err}</div>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-textMuted italic">
                    Per security requirements, AI assistance does not authorize issuance. Authorized university personnel must review and approve before signing.
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 border-2 border-textDark text-xs font-extrabold uppercase hover:bg-pitch"
                >
                  ← BACK
                </button>
                <button
                  disabled={!issuanceData.documentHash || extracting}
                  onClick={() => setWizardStep(3)}
                  className="px-6 py-2 bg-neon-green border-2 border-textDark font-extrabold text-xs uppercase hover:bg-neon-yellow transition-all disabled:opacity-50"
                >
                  NEXT: REVIEW & SIGN →
                </button>
              </div>
            </div>
          )}

          {/* Wizard Step 3: Human Verification Review & Issuance Confirmation */}
          {wizardStep === 3 && (
            <div className="space-y-6 max-w-2xl">
              <div className="p-4 bg-pitch border-2 border-textDark space-y-4">
                <div className="text-xs font-extrabold uppercase border-b border-borderDark pb-2">
                  CONFIRM ACADEMIC RECORD FOR ISSUANCE
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-textMuted block">Document Type</span>
                    <strong className="text-sm">{issuanceData.documentType}</strong>
                  </div>
                  <div>
                    <span className="text-textMuted block">SHA-256 Digest</span>
                    <code className="text-[10px] break-all">{issuanceData.documentHash}</code>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                  <div className="space-y-1">
                    <label className="text-textMuted uppercase font-bold">Grade / CGPA</label>
                    <input
                      type="text"
                      value={issuanceData.cgpa}
                      onChange={(e) => setIssuanceData(prev => ({ ...prev, cgpa: e.target.value }))}
                      placeholder="e.g. 9.15"
                      className="w-full px-2.5 py-1.5 bg-surface border border-borderDark text-xs font-mono outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-textMuted uppercase font-bold">Passing Year</label>
                    <input
                      type="number"
                      value={issuanceData.passingYear}
                      onChange={(e) => setIssuanceData(prev => ({ ...prev, passingYear: e.target.value }))}
                      className="w-full px-2.5 py-1.5 bg-surface border border-borderDark text-xs font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-neon-yellow/20 border border-textDark text-xs flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-textDark flex-shrink-0" />
                <span>
                  Confirming issuance will cryptographically sign a standard W3C Verifiable Credential with your university authority and anchor on Polygon Amoy.
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 border-2 border-textDark text-xs font-extrabold uppercase hover:bg-pitch"
                >
                  ← BACK
                </button>
                <button
                  disabled={issuing}
                  onClick={handleConfirmIssuance}
                  className="px-6 py-2.5 bg-neon-green border-2 border-textDark font-extrabold text-xs uppercase hover:bg-neon-yellow transition-all shadow-md flex items-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{issuing ? 'SIGNING & ANCHORING ON-CHAIN...' : 'APPROVE & MINT ACADEMIC CREDENTIAL'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Wizard Step 4: Success View */}
          {wizardStep === 4 && issuedResult && (
            <div className="space-y-6 max-w-2xl bg-pitch border-2 border-textDark p-6 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-borderDark pb-4">
                <CheckCircle2 className="w-8 h-8 text-neon-green" />
                <div>
                  <span className="text-[10px] text-textMuted uppercase font-bold tracking-widest block">CREDENTIAL CONFIRMED</span>
                  <h3 className="text-lg font-extrabold uppercase">ACADEMIC CREDENTIAL ISSUED & SIGNED</h3>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-surface border border-borderDark">
                {issuedResult.qrCodeDataUrl && (
                  <img
                    src={issuedResult.qrCodeDataUrl}
                    alt="Credential QR Code"
                    className="w-36 h-36 border-2 border-textDark bg-white p-1 flex-shrink-0"
                  />
                )}
                <div className="space-y-1.5 text-xs">
                  <div><span className="text-textMuted">Credential ID:</span> <strong className="font-mono">{issuedResult.credentialId}</strong></div>
                  <div><span className="text-textMuted">Student:</span> <strong>{issuedResult.studentName} ({issuedResult.enrollmentNumber})</strong></div>
                  <div><span className="text-textMuted">Document Type:</span> <strong>{issuedResult.documentType}</strong></div>
                  <div><span className="text-textMuted">SHA-256 Digest:</span> <code className="text-[10px] block break-all">{issuedResult.documentHash}</code></div>
                  <div><span className="text-textMuted">Blockchain Anchor:</span> <span className="text-neon-green font-bold uppercase">{issuedResult.blockchain?.status}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-borderDark">
                <button
                  onClick={() => {
                    setWizardStep(1);
                    setIssuanceData({
                      studentId: '',
                      documentType: 'Degree Certificate',
                      credentialTitle: '',
                      semester: 'Final Semester',
                      cgpa: '',
                      passingYear: 2026,
                      fileBase64: '',
                      originalName: '',
                      mimeType: '',
                      documentHash: '',
                      notes: ''
                    });
                    setExtractionResult(null);
                    setIssuedResult(null);
                  }}
                  className="px-4 py-2 bg-surface border-2 border-textDark text-xs font-extrabold uppercase hover:bg-pitch"
                >
                  ISSUE ANOTHER CREDENTIAL
                </button>
                <button
                  onClick={() => setActiveTab('credentials')}
                  className="px-6 py-2 bg-neon-green border-2 border-textDark text-xs font-extrabold uppercase hover:bg-neon-yellow"
                >
                  VIEW IN ISSUED DIRECTORY →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ISSUED CREDENTIALS DIRECTORY & LIFECYCLE */}
      {activeTab === 'credentials' && (
        <div className="bg-surface border-2 border-textDark p-6 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-borderDark pb-4">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wide">ISSUED ACADEMIC CREDENTIALS</h2>
              <p className="text-xs text-textMuted font-bold">Inspect active credentials, review cryptographic proofs, or manage revocation.</p>
            </div>
            <button
              onClick={() => setActiveTab('issue')}
              className="px-4 py-2 bg-neon-green border-2 border-textDark text-xs font-extrabold uppercase hover:bg-neon-yellow transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ISSUE NEW CREDENTIAL</span>
            </button>
          </div>

          <div className="flex items-center gap-2 p-2 bg-pitch border border-borderDark max-w-md">
            <Search className="w-4 h-4 text-textMuted" />
            <input
              type="text"
              value={credSearch}
              onChange={(e) => setCredSearch(e.target.value)}
              placeholder="Search by student name, roll number, or credential ID..."
              className="bg-transparent border-none outline-none text-xs w-full font-mono text-textDark"
            />
          </div>

          <div className="overflow-x-auto border border-borderDark">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-pitch border-b border-borderDark text-[10px] uppercase font-bold text-textMuted">
                  <th className="p-3">CREDENTIAL ID</th>
                  <th className="p-3">STUDENT NAME</th>
                  <th className="p-3">ROLL NO</th>
                  <th className="p-3">TYPE</th>
                  <th className="p-3">ISSUANCE DATE</th>
                  <th className="p-3">STATUS</th>
                  <th className="p-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderDark bg-surface">
                {credentials.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-textMuted font-bold">
                      NO CREDENTIALS MATCHING SEARCH.
                    </td>
                  </tr>
                ) : (
                  credentials.map((c) => (
                    <tr key={c._id} className="hover:bg-pitch/60 transition-colors">
                      <td className="p-3 font-mono font-extrabold text-[11px]">{c.credentialId}</td>
                      <td className="p-3 font-bold">{c.studentName}</td>
                      <td className="p-3 font-mono">{c.enrollmentNumber}</td>
                      <td className="p-3">{c.documentType}</td>
                      <td className="p-3 text-textMuted">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          c.status === 'active'
                            ? 'bg-neon-green/20 text-neon-green border border-neon-green/40'
                            : 'bg-red-500/20 text-red-500 border border-red-500/40'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3 flex items-center gap-2">
                        <button
                          onClick={() => setViewingCredential(c)}
                          className="px-2.5 py-1 bg-pitch border border-borderDark hover:border-textDark text-[10px] font-bold uppercase"
                        >
                          INSPECT VC
                        </button>
                        {c.status === 'active' && (
                          <button
                            onClick={() => {
                              setSelectedCredForRevoke(c);
                              setShowRevokeModal(true);
                            }}
                            className="px-2.5 py-1 bg-red-500/20 border border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-bold uppercase transition-colors"
                          >
                            REVOKE
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-surface border-2 border-textDark p-6 shadow-md space-y-4">
          <div className="border-b border-borderDark pb-3">
            <h2 className="text-sm font-extrabold uppercase tracking-wide">IMMUTABLE INSTITUTIONAL AUDIT TRAIL</h2>
            <p className="text-xs text-textMuted font-bold">Chronological cryptographic activity recorded for your university.</p>
          </div>

          <div className="divide-y divide-borderDark">
            {dashboardData?.recentLogs?.map((log) => (
              <div key={log._id} className="py-3 flex items-start justify-between gap-4 text-xs font-mono">
                <div>
                  <span className="font-extrabold uppercase text-textDark block">{log.action}</span>
                  <span className="text-[11px] text-textMuted">
                    Target: {log.entityType} ({log.entityId || 'N/A'})
                  </span>
                  {log.details && (
                    <div className="text-[10px] text-textMuted mt-1 bg-pitch p-2 border border-borderDark rounded">
                      <pre className="font-mono">{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
                <div className="text-right flex-shrink-0 text-[11px] text-textMuted">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD STUDENT */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 bg-textDark/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-textDark w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-borderDark pb-3">
              <h3 className="text-sm font-extrabold uppercase">ADD STUDENT TO ROSTER</h3>
              <button onClick={() => setShowAddStudentModal(false)} className="font-bold">✕</button>
            </div>

            <form onSubmit={handleAddStudentSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-textMuted uppercase font-bold block mb-1">Student Full Name *</label>
                <input
                  type="text"
                  required
                  value={newStudent.name}
                  onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-pitch border border-borderDark outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-textMuted uppercase font-bold block mb-1">Enrollment / Roll ID *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.enrollmentNumber}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, enrollmentNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-pitch border border-borderDark outline-none font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-textMuted uppercase font-bold block mb-1">Official Student Email *</label>
                  <input
                    type="email"
                    required
                    value={newStudent.email}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-pitch border border-borderDark outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-textMuted uppercase font-bold block mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.department}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-3 py-2 bg-pitch border border-borderDark outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-textMuted uppercase font-bold block mb-1">Degree / Course *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.degree}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, degree: e.target.value }))}
                    className="w-full px-3 py-2 bg-pitch border border-borderDark outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-borderDark">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 border border-borderDark uppercase font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-neon-green border-2 border-textDark font-extrabold uppercase hover:bg-neon-yellow"
                >
                  ENROLL STUDENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CSV BULK IMPORT */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-textDark/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-textDark w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-borderDark pb-3">
              <h3 className="text-sm font-extrabold uppercase flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>BULK IMPORT STUDENTS (CSV)</span>
              </h3>
              <button onClick={() => setShowImportModal(false)} className="font-bold">✕</button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-textMuted font-bold">
                Paste comma-separated rows with columns: <code>Enrollment Number, Student Name, Email, Department, Degree</code>
              </p>
              <textarea
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Enrollment Number, Student Name, Email, Department, Degree&#10;AU2026CS101, Rahul Sharma, rahul@annauniv.edu, Computer Science, B.Tech&#10;AU2026CS102, Priya Patel, priya@annauniv.edu, Computer Science, B.Tech"
                className="w-full p-3 bg-pitch border border-borderDark font-mono text-xs outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-borderDark uppercase font-bold text-xs"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                className="px-6 py-2 bg-neon-green border-2 border-textDark font-extrabold uppercase text-xs hover:bg-neon-yellow"
              >
                EXECUTE BULK IMPORT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REVOKE CREDENTIAL */}
      {showRevokeModal && selectedCredForRevoke && (
        <div className="fixed inset-0 z-50 bg-textDark/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-textDark w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-borderDark pb-3">
              <h3 className="text-sm font-extrabold uppercase text-red-500 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>REVOKE ACADEMIC CREDENTIAL</span>
              </h3>
              <button onClick={() => setShowRevokeModal(false)} className="font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-textMuted leading-relaxed">
                Revoking credential <strong className="text-textDark font-mono">{selectedCredForRevoke.credentialId}</strong> issued to <strong>{selectedCredForRevoke.studentName}</strong> will invalidate its cryptographic status on-chain.
              </p>

              <div>
                <label className="text-textMuted uppercase font-bold block mb-1">Official Revocation Reason *</label>
                <textarea
                  rows={3}
                  required
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="e.g. Disciplinary invalidation or administrative re-issuance"
                  className="w-full p-2.5 bg-pitch border border-borderDark font-mono text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowRevokeModal(false)}
                className="px-4 py-2 border border-borderDark uppercase font-bold text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={handleRevokeConfirm}
                className="px-6 py-2 bg-red-500 border-2 border-textDark text-white font-extrabold uppercase text-xs hover:bg-red-600"
              >
                CONFIRM REVOCATION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INSPECT W3C VERIFIABLE CREDENTIAL & QR */}
      {viewingCredential && (
        <div className="fixed inset-0 z-50 bg-textDark/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-textDark w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-borderDark pb-3">
              <div className="text-xs font-extrabold uppercase flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-neon-green" />
                <span>W3C VERIFIABLE CREDENTIAL DOSSIER: {viewingCredential.credentialId}</span>
              </div>
              <button onClick={() => setViewingCredential(null)} className="font-bold">✕</button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-pitch border border-borderDark">
              {viewingCredential.qrCodeDataUrl && (
                <img
                  src={viewingCredential.qrCodeDataUrl}
                  alt="QR Code"
                  className="w-32 h-32 border-2 border-textDark bg-white p-1 flex-shrink-0"
                />
              )}
              <div className="space-y-1 text-xs">
                <div><span className="text-textMuted">Student:</span> <strong>{viewingCredential.studentName} ({viewingCredential.enrollmentNumber})</strong></div>
                <div><span className="text-textMuted">Document Type:</span> <strong>{viewingCredential.documentType}</strong></div>
                <div><span className="text-textMuted">SHA-256 Hash:</span> <code className="text-[10px] break-all block">{viewingCredential.documentHash}</code></div>
                <div><span className="text-textMuted">Issuer DID:</span> <code className="text-[10px] break-all block">{viewingCredential.issuerDid}</code></div>
                <div><span className="text-textMuted">Status:</span> <span className="font-bold uppercase text-neon-green">{viewingCredential.status}</span></div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-textMuted">JSON-LD W3C Verifiable Credential Payload:</span>
              <pre className="p-3 bg-pitch border border-borderDark text-[10px] font-mono overflow-x-auto max-h-48 text-textDark">
                {JSON.stringify(viewingCredential.w3cCredential, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-borderDark text-xs">
              <Link
                to={`/verify/${viewingCredential.credentialId}`}
                target="_blank"
                className="font-extrabold underline flex items-center gap-1 hover:text-neon-green"
              >
                <span>OPEN PUBLIC VERIFICATION VIEW</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setViewingCredential(null)}
                className="px-4 py-2 bg-pitch border border-borderDark uppercase font-bold text-xs"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
