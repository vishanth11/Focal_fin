# FOCAL Blockchain Module

> **Trust Before You Apply**

Blockchain-backed trust layer for the FOCAL platform. This module issues non-transferable (soulbound) ERC-721 badges to verified companies so students can confirm that a job opportunity is genuine.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Compile](#compile)
- [Test](#test)
- [Deploy](#deploy)
- [Mint a Badge](#mint-a-badge)
- [Revoke a Badge](#revoke-a-badge)
- [Update Badge Metadata URI](#update-badge-metadata-uri)
- [Metadata Generation](#metadata-generation)
- [IPFS Upload via Pinata](#ipfs-upload-via-pinata)
- [Contract Verification](#contract-verification)
- [Integration Guide](#integration-guide)
- [Project Structure](#project-structure)
- [Network Details](#network-details)
- [Security Notes](#security-notes)

## Overview

- **Contract**: `FocalCompanyBadge.sol` — Soulbound ERC-721 badge.
- **Framework**: Hardhat v2.x
- **Library**: OpenZeppelin Contracts v5.x
- **Blockchain**: Polygon Amoy (recommended), Polygon Mumbai (deprecated), Sepolia, or local Hardhat network
- **Token standard**: ERC-721 with transfer and approval restrictions
- **Admin**: Deployer by default; production should use a multi-sig wallet
- **Tagline**: Trust Before You Apply

## Prerequisites

- Node.js >= 18 (Hardhat officially supports LTS versions)
- npm or yarn
- MetaMask (for frontend interactions or manual deployments)
- Testnet tokens:
  - Sepolia ETH: [sepoliafaucet.com](https://sepoliafaucet.com/)
  - Polygon Amoy MATIC: [Polygon Amoy faucet](https://faucet.polygon.technology/)

## Installation

```bash
cd focal-blockchain
npm install
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `PRIVATE_KEY` | Deployer/admin private key (with `0x` prefix) |
| `SEPOLIA_RPC_URL` | Sepolia RPC endpoint |
| `MUMBAI_RPC_URL` | Polygon Mumbai RPC endpoint (deprecated) |
| `AMOY_RPC_URL` | Polygon Amoy RPC endpoint (recommended) |
| `ETHERSCAN_API_KEY` | Etherscan API key for Sepolia verification |
| `POLYGONSCAN_API_KEY` | Polygonscan API key for Amoy/Mumbai verification |
| `PINATA_JWT` | Pinata JWT for IPFS uploads (recommended) |
| `PINATA_API_KEY` + `PINATA_SECRET_API_KEY` | Legacy Pinata key pair |
| `TEST_COMPANY_ADDRESS` | Demo company address used by deploy script |
| `TEST_TOKEN_URI` | Demo metadata URI used by deploy script |
| `CONTRACT_ADDRESS` | Deployed contract address for update/mint scripts |

**Never commit `.env` to version control.**

## Compile

```bash
npx hardhat compile
```

## Test

```bash
npx hardhat test
```

The test suite covers deployment, minting, soulbound transfer/approval restrictions, revocation, URI updates, query functions, and events.

## Deploy

### Local network

```bash
npx hardhat node
npx hardhat run scripts/deploy.js --network localhost
```

### Sepolia

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Polygon Amoy (recommended)

```bash
npx hardhat run scripts/deploy.js --network amoy
```

The deploy script:

1. Deploys `FocalCompanyBadge`.
2. Logs the deployed contract address.
3. Optionally mints a test badge if `TEST_COMPANY_ADDRESS` and `TEST_TOKEN_URI` are set.
4. Attempts block explorer verification if an API key is available.

## Mint a Badge

### After deployment using the helper script

Set `CONTRACT_ADDRESS`, `TEST_COMPANY_ADDRESS`, and `TEST_TOKEN_URI` in `.env`, then:

```bash
npx hardhat run scripts/mintBadge.js --network amoy
```

### Programmatically

```javascript
const { getContract, mintBadge } = require("./scripts/blockchainHelper");

const contract = await getContract(
  process.env.AMOY_RPC_URL,
  process.env.PRIVATE_KEY,
  process.env.CONTRACT_ADDRESS
);

await mintBadge(
  contract,
  "0xCompanyAddress...",
  "ipfs://Qm.../metadata.json"
);
```

## Revoke a Badge

```javascript
const { getContract, revokeBadge } = require("./scripts/blockchainHelper");
const contract = await getContract(rpcUrl, privateKey, contractAddress);
await revokeBadge(contract, 0);
```

## Update Badge Metadata URI

Use this to switch a badge from verified metadata to revoked metadata (or vice versa) without burning:

```bash
# After running uploadToPinata.js or setting TOKEN_URI in .env
npx hardhat run scripts/updateBadgeURI.js --network amoy
```

Or programmatically:

```javascript
const { getContract, updateBadgeURI } = require("./scripts/blockchainHelper");
const contract = await getContract(rpcUrl, privateKey, contractAddress);
await updateBadgeURI(contract, 0, "ipfs://Qm.../revoked-metadata.json");
```

## Metadata Generation

Generate verified and revoked metadata files:

```bash
node scripts/generateMetadata.js "TechNova Pvt Ltd" "technova.com" "2025-01-15"
```

Files are written to `metadata/`.

The verification hash is computed deterministically from:

```text
keccak256(companyName, domain, verificationDate, "FOCAL_TRUST_PLATFORM_v1")
```

To override the hash, pass it as the fourth argument:

```bash
node scripts/generateMetadata.js "TechNova Pvt Ltd" "technova.com" "2025-01-15" "0x..."
```

## IPFS Upload via Pinata

1. Add Pinata credentials to `.env` (`PINATA_JWT` is recommended).
2. (Optional) Convert SVG badges to PNG if you prefer:
   ```bash
   magick assets/green-badge.svg assets/green-badge.png
   magick assets/red-badge.svg assets/red-badge.png
   ```
3. Upload image + metadata:
   ```bash
   node scripts/uploadToPinata.js
   ```
4. The script prints the final metadata `tokenURI` and writes it to `.tokenuri`.

## Contract Verification

The deploy script attempts automatic verification. If it fails, run manually:

```bash
npx hardhat verify --network amoy <CONTRACT_ADDRESS> <INITIAL_OWNER_ADDRESS>
```

## Integration Guide

### Backend integration

Use `scripts/blockchainHelper.js` for admin operations:

```javascript
const {
  getContract,
  mintBadge,
  revokeBadge,
  updateBadgeURI,
  hasValidBadge,
  getBadgeDetails,
} = require("./scripts/blockchainHelper");
```

### Frontend integration

```javascript
import { connectWallet, hasValidBadge, getBadgeDetails } from "./scripts/blockchainHelper";

const { contract } = await connectWallet(CONTRACT_ADDRESS);
const isVerified = await hasValidBadge(contract, companyAddress);
const details = await getBadgeDetails(contract, companyAddress);
```

### ABI

After compiling, the ABI is available at:

```
artifacts/contracts/FocalCompanyBadge.sol/FocalCompanyBadge.json
```

## Project Structure

```
focal-blockchain/
├── assets/
│   ├── green-badge.svg           # Verified badge artwork
│   └── red-badge.svg             # Revoked badge artwork
├── contracts/
│   └── FocalCompanyBadge.sol     # Soulbound ERC-721 contract
├── metadata/
│   ├── technova-pvt-ltd-verified.json
│   └── technova-pvt-ltd-revoked.json
├── scripts/
│   ├── deploy.js                 # Deployment + optional mint + verify
│   ├── mintBadge.js              # Standalone mint helper
│   ├── generateMetadata.js       # IPFS metadata generator
│   ├── computeVerificationHash.js# Deterministic hash utility
│   ├── uploadToPinata.js         # Pinata IPFS upload helper
│   ├── updateBadgeURI.js         # On-chain URI update helper
│   └── blockchainHelper.js       # Backend/frontend integration utilities
├── test/
│   └── FocalCompanyBadge.test.js # Hardhat test suite
├── hardhat.config.js             # Network + compiler config
├── .env.example                  # Environment variable template
├── package.json
└── README.md
```

## Network Details

| Network | Chain ID | Config key | Explorer |
|---------|----------|------------|----------|
| Sepolia | 11155111 | `sepolia` | sepolia.etherscan.io |
| Polygon Mumbai | 80001 | `mumbai` | mumbai.polygonscan.com (deprecated) |
| Polygon Amoy | 80002 | `amoy` | amoy.polygonscan.com |
| Hardhat local | 31337 | `hardhat` | N/A |

## Security Notes

- The deployer is the initial contract owner. For production, deploy with a multi-sig wallet address.
- Never hardcode private keys in source code; use `.env` and keep it out of git.
- Badges are non-transferable: `_update` reverts any non-mint/non-burn transfer.
- Approvals and operators are blocked at the contract level.
- Only the admin can mint, revoke, or update badge URIs.
- The verification hash is reproducible from public metadata inputs.
