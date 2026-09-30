# FOCAL + AcadShield Unified Platform

> **FOCAL** is a unified blockchain-backed trust and verification ecosystem designed for student safety, company credibility, and academic credential integrity.
>
> AcadShield's core academic verifiable credential features are integrated directly into the four existing FOCAL login roles: **ADMIN**, **UNIVERSITY**, **COMPANY**, and **STUDENT**.

---

## 1. Unified 4-Role Architecture

| Role | Responsibility & Workflows | Dashboards & Routes |
|---|---|---|
| **ADMIN** | Institutional governance, university application reviews (Approve/Reject/Suspend/Reinstate), company badge minting, scam report reviews, cross-institutional academic credential oversight & immutable audit logs. | `/admin`, `/admin/login` |
| **UNIVERSITY** | Authoritative issuer of academic credentials. Manages student rosters, imports students via CSV, uploads marksheets/degrees, validates AI/OCR field extractions, cryptographically signs W3C Verifiable Credentials (VCs), and anchors credentials on Polygon Amoy. Manages lifecycle (issue, supersede, revoke). | `/university/dashboard`, `/university/login`, `/university/register` |
| **STUDENT** | Credential holder. Views university-issued marksheets, degree certificates, and transcripts; downloads QR codes and files; selectively grants time-limited consent shares to prospective employers; revokes company access at will. | `/student`, `/student/login`, `/student/register` |
| **COMPANY** | Verifier and potential employer. Verifies company trust badge; runs AI scam detection; verifies academic credentials via Credential ID, QR scan, or document upload with 5 independent checkpoints. | `/company/verify-credential`, `/check`, `/explore`, `/register` |

---

## 2. Integrated Academic Credential Verification Engine

### Five Distinct Verification Checkpoints
When verifying an academic credential, FOCAL distinguishes independent trust dimensions:
1. **University Issuer Trusted:** `YES / NO / UNKNOWN` (verifies university exists in the institutional registry and holds `approved` status).
2. **Credential VC Signature Valid:** `YES / NO` (verifies cryptographic ECDSA signature over the canonical SHA-256 claims digest against the authorized issuer public key / DID).
3. **Document Hash Matches:** `YES / NO / NOT PROVIDED` (byte-level SHA-256 comparison between submitted file and reference hash).
4. **Blockchain Registration Confirmed:** `YES / NO / PENDING` (queries smart contract on Polygon Amoy; accurately indicates `simulated: true` when offline without fabricating fake transactions).
5. **Credential Status:** `ACTIVE / REVOKED / SUPERSEDED` (shows revocation timestamp, reason, or replacement credential reference).

---

## 3. Project Directory Structure

```
FOCAL_AcadShield_Integration/
├── backend/                  # Express + Mongoose REST API (Node.js)
│   ├── src/
│   │   ├── controllers/      # University, Credential, Admin, Student, Company controllers
│   │   ├── models/           # University, AcademicStudent, AcademicCredential, CredentialShare, AuditLog
│   │   ├── routes/           # universityRoutes, credentialRoutes, adminRoutes, studentRoutes
│   │   ├── services/         # academicCredentialService, academicExtractionService, academicBlockchainService
│   │   └── middleware/       # universityAuth, studentAuth, adminAuth, upload
│   └── tests/                # 8 test suites, 81 tests passing (100%)
├── frontend/                 # React 18 + Vite + Tailwind CSS + Lucide Icons
│   ├── src/
│   │   ├── pages/            # UniversityDashboard, PublicCredentialVerifyPage, CompanyCredentialVerifyPage, AdminDashboard
│   │   ├── components/       # UniversityRoute, RoleSelectionModal, Navbar, Footer
│   │   ├── services/         # api.js, storage.js, blockchain.js
│   │   └── context/          # AppContext.jsx (unified multi-role session state)
├── contracts/                # Smart contracts (Hardhat / Solidity)
│   └── contracts/
│       ├── FocalAcademicCredential.sol # Registry for academic hashes, issuers, revocation & supersession
│       └── FocalCompanyBadge.sol       # Soulbound ERC-721 badge contract for verified companies
├── ML/ml-service/            # FastAPI ML scam-detection microservice (BERT + sklearn)
└── README.md                 # System overview and integration documentation
```

---

## 4. Academic Credential Workflow (End-to-End)

```
[University Registration]
   │
   ▼
Pending Admin Review ──▶ Admin Approves Institution ──▶ Authorized University Issuer
                                                              │
   ┌──────────────────────────────────────────────────────────┘
   ▼
[University Dashboard]
   │
   ├─ Add Student / Import CSV ──▶ Tenant-isolated Student Roster
   │
   ├─ Upload Academic Document (Marksheet / Degree / Transcript)
   │     │
   │     ├─ SHA-256 byte-level hash computed
   │     ├─ AI/OCR assists extraction of student & grade fields
   │     └─ Inconsistency check against student record
   │
   ├─ Authorized Human Representative reviews & clicks "Authorize & Issue"
   │     │ (AI never auto-issues without explicit institutional sign-off)
   │     ▼
   ├─ W3C Verifiable Credential generated & cryptographically signed
   ├─ QR Code generated pointing to privacy-safe public verification URL
   ├─ On-chain anchor registered in FocalAcademicCredential contract
   │
   ▼
[Student Account]
   │
   ├─ Receives notification and views issued credential & QR
   ├─ Generates student-controlled consent share token for prospective employers
   │
   ▼
[Company Verification Portal]
   │
   ├─ Verifies via Credential ID, QR Code, or Document Upload
   ├─ Computes SHA-256 of uploaded file and compares against reference digest
   ├─ Verifies issuer signature, blockchain anchor, and revocation status
   └─ Downloads tamper-proof verification report
```

---

## 5. Smart Contract: `FocalAcademicCredential.sol`

- **Network:** Polygon Amoy Testnet (Chain ID `80002`).
- **Features:**
  - `authorizeIssuer(address, string did)` / `deauthorizeIssuer(address)`
  - `registerCredential(bytes32 docHash, string credentialId, string studentId, string docType)`
  - `revokeCredential(bytes32 docHash, string reason)`
  - `supersedeCredential(bytes32 oldDocHash, bytes32 newDocHash, string reason)`
  - `verifyCredential(bytes32 docHash)` returns `(bool exists, address issuer, uint256 registeredAt, bool isRevoked, bool isSuperseded, bytes32 supersededBy)`

---

## 6. How to Run the Integrated Platform

### 1. Start MongoDB
Ensure MongoDB is running locally on `mongodb://localhost:27017/focal` (or set `MONGODB_URI` in `.env`).

### 2. Start the Backend
```bash
cd backend
npm install
npm run dev
# Running on http://localhost:5000
```

### 3. Run Backend Tests
```bash
cd backend
npm test
# 8 test suites, 81 tests passing (100%)
```

### 4. Start the Frontend
```bash
cd frontend
npm install
npm run dev
# Running on http://localhost:5173
```

### 5. Build Frontend for Production
```bash
cd frontend
npm run build
# Built cleanly with Vite
```

---

## 7. Environment Configuration

### Backend (`backend/.env`)
```ini
PORT=5000
MONGODB_URI=mongodb://localhost:27017/focal
JWT_SECRET=focal-jwt-secret-academic-integration-key-2026
ADMIN_EMAIL=admin@focal.trust
ADMIN_PASSWORD=adminsecretpassword
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
FOCAL_ACADEMIC_CONTRACT=0x0000000000000000000000000000000000000000
ACADEMIC_SIGNER_PRIVATE_KEY=
ML_API_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
```

---

## 8. Summary of Integration Highlights

1. **Four Unified Roles:** Admin, University, Company, Student all share the same authentication middleware patterns, routing, and design system.
2. **Tenant Isolation:** A university can only view and manage its own students and issued documents.
3. **Human Authority Required:** AI/OCR provides field extraction and consistency alerts; human institutional approval is strictly required prior to issuance.
4. **No Fabricated Data:** Cryptographic ECDSA signatures and SHA-256 byte digests are calculated live; blockchain returns authentic transaction receipts or honest `simulated: true` flags.
5. **Privacy Safe:** QR codes point to privacy-preserving public verification pages; private student marks are never exposed on public blockchains or unauthenticated URLs.
6. **Zero Mod-Bleed:** The original backup project at `c:\Users\HP\Downloads\FOCAL\FOCAL` remains 100% clean and untouched.