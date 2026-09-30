# FOCAL — Blockchain-Backed Trust Platform for Student Job Safety

FOCAL verifies companies and issues soulbound (non-transferable) NFT badges on the Polygon Amoy testnet, so students can check whether a job opportunity is genuine before applying. An ML microservice analyzes job postings, URLs, and emails for scam patterns, and the backend ties everything together: company verification, on-chain badge minting, opportunity checks, and scam reports.

---

## Folder Structure

```
FOCAL/
├── backend/backend/       # Express + Mongoose API (Node.js)  — port 5000
├── ML/ml-service/         # FastAPI ML scam-detection service  — port 8000
├── frontend/              # React + Vite app (Tailwind)        — port 5173
├── focal-blockchain/      # Hardhat project: FocalCompanyBadge.sol (canonical)
└── _archive/              # Deprecated projects (do not use)
```

> The retired `omen-blockchain/` project (predecessor of `focal-blockchain/`) is archived under `_archive/`. Treat `focal-blockchain/` as the single source of truth for the contract.

---

## Integration Architecture

```
┌─────────────┐  POST /api/check {input}   ┌──────────────┐  POST /predict {text|url|email_content}
│             │ ──────────────────────────▶│              │ ────────────────────────────────▶ ┌─────────────┐
│  FRONTEND   │                            │   BACKEND    │                                   │  ML SERVICE  │
│  React/Vite │◀──────────────────────────│  Express     │◀──────────────────────────────── │  FastAPI     │
│  :5173      │   { success, data: ... }   │  Mongoose    │   { risk_score, red_flags, ... }  │  sklearn+BERT│
└──────┬──────┘                            │  :5000       │                                   └─────────────┘
       │ verifyOnChain()                   └──────┬───────┘
       │ (read-only ethers)                       │ mintBadge / revokeBadge (ethers v6)
       ▼                                          ▼
┌──────────────────────────┐            ┌──────────────────────┐
│  FocalCompanyBadge.sol   │◀───────────│  MongoDB (focal DB) │
│  Polygon Amoy testnet    │  tx         │  companies/checks/  │
│  soulbound ERC-721       │            │  reports/connections│
└──────────────────────────┘            └──────────────────────┘
```

Data flow of the core "check an opportunity" path:

1. Student pastes a job posting / URL / email on `/check` in the frontend.
2. Frontend → `POST /api/check { input }`.
3. Backend detects the input type and calls the ML service `POST /predict` with the correct payload (`text`/`url`/`email_content`).
4. ML service scores the content (HF BERT → sklearn fallback → rule-based fallback) and returns `risk_score`, `risk_level`, `red_flags`, `confidence`.
5. Backend matches the input to a registered company, verifies the soulbound badge on-chain (`hasValidBadge`), and persists a `Check` record.
6. Frontend renders the trust score, red flags, and on-chain proof. If the ML service is down, the backend falls back to local rule-based analysis and marks the result `simulated: true`.

---

## Prerequisites

- **Node.js** ≥ 18 (backend, frontend, hardhat)
- **Python** ≥ 3.10 (ML service; use the committed `ML/ml-service/venv/` or create your own)
- **MongoDB** — local instance or a free MongoDB Atlas cluster
- **MetaMask** (optional) — for `connectWallet` in the frontend
- **Polygon Amoy MATIC** (optional, for on-chain minting) — free from the [Amoy faucet](https://faucet.polygon.technology/)

---

## Setup & Startup Order

Start services in this order (each in its own terminal):

```bash
# 1. ML service (port 8000)
cd ML/ml-service
# Windows: venv\Scripts\activate     |  macOS/Linux: source venv/bin/activate
pip install -r requirements.txt      # first time only
uvicorn app.main:app --reload --port 8000
# Verify: http://localhost:8000/health → {"status":"healthy","model_loaded":true,...}

# 2. Backend (port 5000)
cd backend/backend
npm install                          # first time only
npm run seed                         # first time only — seeds demo companies
npm run dev
# Verify: http://localhost:5000/health → {"success":true,...}

# 3. Frontend (port 5173)
cd frontend
npm install                          # first time only
cp .env.example .env                 # set VITE_CONTRACT_ADDRESS after deploying
npm run dev
```

### Optional: deploy the badge contract (once)

```bash
cd focal-blockchain
cp .env.example .env
# 1. Set PRIVATE_KEY to a FRESH dedicated wallet (never reuse an exposed key)
# 2. Fund it with Amoy MATIC: https://faucet.polygon.technology/
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network amoy
# 3. Copy the printed contract address into:
#    backend/backend/.env      → CONTRACT_ADDRESS, RPC_URL (Amoy)
#    frontend/.env            → VITE_CONTRACT_ADDRESS, VITE_RPC_URL
```

If `CONTRACT_ADDRESS`/`ADMIN_PRIVATE_KEY` are not configured, the backend still works: admin approval mints a **simulated** badge (`simulated: true` is returned clearly) so the demo flows end-to-end without a chain.

---

## Environment Variables

### Backend (`backend/backend/.env`)

| Variable | Purpose |
|---|---|
| `PORT` | Backend port (default 5000) |
| `MONGODB_URI` | Mongo connection string — DB name `focal` |
| `JWT_SECRET` | JWT signing secret (use a strong random value) |
| `JWT_EXPIRE` | Token lifetime (default `7d`) |
| `ADMIN_EMAIL` | Admin login email (default `admin@focal.network`) |
| `ADMIN_PASSWORD` | Admin login password (plaintext or `$2...` bcrypt hash) |
| `RPC_URL` | Polygon Amoy RPC (`https://rpc-amoy.polygon.technology`) |
| `CONTRACT_ADDRESS` | Deployed `FocalCompanyBadge` address |
| `ADMIN_PRIVATE_KEY` | Contract owner key for minting (keep secret!) |
| `ADMIN_WALLET_ADDRESS` | Owner wallet address |
| `ML_API_URL` | ML service base URL (default `http://localhost:8000`) |
| `CORS_ORIGINS` | Comma-separated allowed frontend origins |
| `PHISHTANK_API_KEY`, `GOOGLE_SAFE_BROWSING_API_KEY`, `VIRUSTOTAL_API_KEY` | Optional external checks |

### ML service (`ML/ml-service/.env`)

| Variable | Purpose |
|---|---|
| `API_HOST` / `API_PORT` | Bind host/port (default `0.0.0.0:8000`) |
| `MODEL_PATH` / `VECTORIZER_PATH` | Trained sklearn artifacts |
| `ML_CORS_ORIGINS` | Allowed origins (backend + local frontends) |
| `RATE_LIMIT_REQUESTS` / `RATE_LIMIT_WINDOW_S` | Per-IP rate limit |
| `LOW_RISK_THRESHOLD` / `MEDIUM_RISK_THRESHOLD` | Risk level cut-offs (30/60) |

### Frontend (`frontend/.env`)

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend base (default `http://localhost:5000/api`) |
| `VITE_CONTRACT_ADDRESS` | Deployed badge contract (Amoy) |
| `VITE_RPC_URL` | RPC endpoint for on-chain reads |
| `VITE_USE_DEMO` | `true` = serve demo data when backend is down; `false` = surface errors |

### Blockchain (`focal-blockchain/.env`)

See `focal-blockchain/.env.example`. Key values: `PRIVATE_KEY` (fresh owner wallet), `AMOY_RPC_URL`, `PINATA_JWT` (for IPFS metadata uploads), `CONTRACT_ADDRESS` (filled after deploy).

---

## API Summary

| Area | Endpoints |
|---|---|
| Health | `GET /health` (backend), `GET /health` + `/docs` (ML) |
| Companies | `POST/GET /api/companies`, `GET /api/companies/:id`, `GET /api/companies/check?domain=`, `GET /api/companies/status/:wallet` |
| Opportunity checks | `POST /api/check` (rate-limited 100/15min), `GET /api/check/history`, `GET /api/check/:id` |
| Reports | `POST/GET /api/reports`, `GET /api/reports/:id`, `GET /api/reports/company/:companyId` |
| Connections | `POST/GET /api/connections`, `GET /api/connections/:id`, `PATCH/DELETE /api/connections/:id` (admin) |
| Admin | `POST /api/admin/login` (rate-limited), `POST /api/admin/companies/:id/approve\|reject\|revoke`, `GET /api/admin/reports`, `POST /api/admin/reports/:id/review`, `GET /api/admin/stats` |
| ML | `POST /predict`, `POST /analyze-url`, `POST /analyze-email`, `GET /model-info` |

All backend responses use the envelope `{ success: boolean, message?: string, data?: ... }`. Admin routes require `Authorization: Bearer <token>`.

---

## Demo Flow (60-second script)

1. **Landing page** — search for `technova.com` → verified company with on-chain badge.
2. **Scam check** — search for `Pay ₹2000 registration fee now, limited time offer!` → ML red flags, high risk score.
3. **Typosquatting** — search `companny.com` (demo data) or a lookalike domain.
4. **Admin console** — `/admin/login` (email from `ADMIN_EMAIL`, password from `ADMIN_PASSWORD`) → approve a pending company → badge minted (real on Amoy if configured, clearly-simulated otherwise) → dashboard stats update.
5. **Reports** — file a report on the company page → review it in the admin dashboard.
6. **On-chain proof** — click "VERIFY ON CHAIN" on a company page to read `hasValidBadge` directly from the Amoy contract.

---

## Security Notes

- **Never commit `.env` files.** Real secrets (private keys, JWTs, DB credentials) must live only in your local `.env`.
- The frontend blockchain check **fails closed**: if the contract/RPC is unreachable, it reports *unverified*, never *verified*.
- The admin password supports bcrypt hashes (`$2...` prefix) — prefer a hash over plaintext.
- Rate limiting: `/api/check` (100 req/15 min per IP), `/api/admin/login` (20 req/15 min per IP), ML service (60 req/min per IP, configurable).
- If any secret has been exposed (e.g., a wallet key in a shared environment), **rotate it immediately** — a leaked owner key means full control of the badge contract.