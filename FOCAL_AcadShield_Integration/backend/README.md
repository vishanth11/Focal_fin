# FOCAL Backend

FOCAL is a trust and verification backend for student employment safety. It provides full CRUD operations, risk scoring for suspicious job opportunities, scam reporting, and blockchain-backed verification badges.

## Tech Stack

- **Runtime & Framework**: Node.js & Express
- **Database**: MongoDB (Local `127.0.0.1:27017` or MongoDB Atlas) with Mongoose
- **Web3 / Blockchain**: ethers.js v6 with resilient local demo fallback
- **Authentication**: JWT admin authentication
- **Validation**: express-validator
- **Logging**: Morgan HTTP logger & structured JSON application logger

---

## Quick Start

### 1. Configure Environment
Ensure your `.env` file points to your local MongoDB:
```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/focal
JWT_SECRET=your_strong_jwt_secret
ADMIN_EMAIL=admin@focal.network
ADMIN_PASSWORD=change_this_strong_password
```

> **Note on MongoDB Atlas**:
> If using Atlas (`mongodb+srv://...`), ensure your current public IP is added to the **Network Access IP Whitelist** (or `0.0.0.0/0`) in your MongoDB Atlas dashboard. The backend includes built-in SRV DNS resolution fallbacks for Windows.

### 2. Seed Database
```bash
npm run seed
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Run Automated CRUD Verification Suite
```bash
node test_all_crud.js
```

---

## Complete CRUD API Reference

Base URL in development: `http://localhost:5000`

### 1. Companies (`/api/companies`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/companies` or `/register` | Public | **Create**: Register a new company |
| `GET` | `/api/companies` | Public | **Read (List)**: List companies with `status`, `search`, `page`, `limit` |
| `GET` | `/api/companies/:id` | Public | **Read (One)**: Retrieve single company details and badge status |
| `GET` | `/api/companies/check?domain=xyz.com` | Public | Check company verification status by domain |
| `GET` | `/api/companies/status/:walletAddress` | Public | Check company verification status by wallet |
| `PATCH` | `/api/companies/:id` | Admin Token | **Update**: Update company details (name, email, phone, website, status) |
| `DELETE` | `/api/companies/:id` | Admin Token | **Delete**: Remove company from MongoDB |

#### Example: Create Company (`POST /api/companies`)
```json
{
  "name": "TechNova Pvt Ltd",
  "website": "https://technova.com",
  "email": "hr@technova.com",
  "phone": "+91-9876543210",
  "walletAddress": "0x1111111111111111111111111111111111111111"
}
```

---

### 2. Opportunity Checks & Input Persistence (`/api/check`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/check` | Public | **Create**: Analyze user input (URL, email, job text), detect red flags, calculate risk score, and persist check record in MongoDB |
| `GET` | `/api/check` or `/history` | Public | **Read (List)**: Retrieve check history with `result`, `inputType`, `search`, `page`, `limit` |
| `GET` | `/api/check/:id` | Public | **Read (One)**: Retrieve single check record by ID |
| `PATCH` | `/api/check/:id` | Admin Token | **Update**: Update review notes, flags, or risk score override |
| `DELETE` | `/api/check/:id` | Admin Token | **Delete**: Remove check record from history |

#### Example: Check Input (`POST /api/check`)
```json
{
  "input": "https://urgent-fee-hiring.xyz/apply",
  "notes": "Received on WhatsApp group"
}
```

**Response (Persisted in MongoDB):**
```json
{
  "success": true,
  "data": {
    "check": {
      "_id": "6aae82806e485420a0a4df2c",
      "input": "https://urgent-fee-hiring.xyz/apply",
      "inputType": "url",
      "isVerified": false,
      "riskScore": 75,
      "redFlags": [
        "Contains payment pressure or urgency language",
        "Uses a commonly abused low-trust domain extension",
        "No verified company record found"
      ],
      "result": "suspicious",
      "createdAt": "2026-09-19T18:09:28.000Z"
    },
    "confidence": 0.55
  }
}
```

---

### 3. Scam Reports (`/api/reports`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/reports` | Public | **Create**: Submit scam report with evidence and description |
| `GET` | `/api/reports` | Public | **Read (List)**: List reports with `status`, `companyId`, `search`, `page`, `limit` |
| `GET` | `/api/reports/:id` | Public | **Read (One)**: Retrieve single report by ID |
| `GET` | `/api/reports/company/:companyId` | Public | List all reports filed against a specific company |
| `PATCH` | `/api/reports/:id` | Admin Token | **Update**: Update status (`reviewed`, `accepted`, `rejected`) and notes |
| `DELETE` | `/api/reports/:id` | Admin Token | **Delete**: Delete a report from MongoDB |

---

### 4. Trusted Connections (`/api/connections`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/connections` | Public | **Create**: Submit a trusted-connection request (student or B2B) |
| `GET` | `/api/connections` | Public | **Read (List)**: List connections with `status`, `page`, `limit` |
| `GET` | `/api/connections/:id` | Public | **Read (One)**: Retrieve single connection by ID |
| `PATCH` | `/api/connections/:id` | Admin Token | **Update**: Update status (`pending`, `accepted`, `rejected`) |
| `DELETE` | `/api/connections/:id` | Admin Token | **Delete**: Remove a connection record |

---

### 5. Admin Portal (`/api/admin`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/admin/login` | Public | Admin login (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), returns JWT |
| `GET` | `/api/admin/companies` | Admin Token | List verification queue |
| `POST` | `/api/admin/companies/:id/approve` | Admin Token | Verify company, mint soulbound NFT badge |
| `POST` | `/api/admin/companies/:id/reject` | Admin Token | Reject verification application |
| `POST` | `/api/admin/companies/:id/revoke` | Admin Token | Revoke badge on-chain & update metadata |
| `GET` | `/api/admin/stats` | Admin Token | Aggregated statistics from MongoDB |

---

## Authentication

For routes requiring admin access, provide the Bearer token in the request header:
```http
Authorization: Bearer <your_jwt_token>
```
To obtain a token:
```bash
curl -X POST http://localhost:5000/api/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@focal.network\",\"password\":\"change_this_strong_password\"}"
```
