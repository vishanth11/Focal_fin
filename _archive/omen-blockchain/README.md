# OMEN Blockchain Module

Blockchain-backed trust layer for the OMEN platform. This module issues non-transferable (soulbound) ERC-721 badges to verified companies so students can confirm that a job opportunity is genuine.

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
- [Metadata Generation](#metadata-generation)
- [Contract Verification](#contract-verification)
- [Integration Guide](#integration-guide)
- [Project Structure](#project-structure)
- [Network Details](#network-details)
- [Security Notes](#security-notes)

## Overview

- **Contract**: `OmenCompanyBadge.sol` — Soulbound ERC-721 badge.
- **Framework**: Hardhat v2.x
- **Library**: OpenZeppelin Contracts v5.x
- **Blockchain**: Polygon Amoy / Mumbai, Sepolia, or local Hardhat network
- **Token standard**: ERC-721 with transfer restrictions
- **Admin**: Deployer by default; production should use a multi-sig wallet

## Prerequisites

- Node.js >= 18
- npm or yarn
- MetaMask (for frontend interactions or manual deployments)
- Testnet tokens:
  - Sepolia ETH: [sepoliafaucet.com](https://sepoliafaucet.com/) or [Alchemy faucet](https://sepoliafaucet.com/)
  - Polygon Amoy MATIC: [Polygon Amoy faucet](https://faucet.polygon.technology/)

## Installation

```bash
mkdir omen-blockchain
cd omen-blockchain
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
npm install @openzeppelin/contracts ethers
```

Or, if you cloned a repo that already contains this module:

```bash
cd omen-blockchain
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
| `POLYGONSCAN_API_KEY` | Polygonscan API key for Mumbai/Amoy verification |
| `TEST_COMPANY_ADDRESS` | Demo company address used by the deploy script |
| `TEST_TOKEN_URI` | Demo metadata URI used by the deploy script |

**Never commit `.env` to version control.**

## Compile

```bash
npx hardhat compile
```

## Test

```bash
npx hardhat test
```

The test suite covers:

- Admin-only minting
- Soulbound transfer blocking
- Approval/operator blocking
- Badge revocation
- Badge URI updates
- Query functions (`hasValidBadge`, `getBadgeId`, `getCompanyByTokenId`)
- Event emissions

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

1. Deploys `OmenCompanyBadge`.
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

You can also update the badge URI to a revoked metadata file instead of burning:

```javascript
const { updateBadgeURI } = require("./scripts/blockchainHelper");
await updateBadgeURI(contract, 0, "ipfs://Qm.../revoked-metadata.json");
```

## Metadata Generation

Generate verified and revoked metadata files:

```bash
node scripts/generateMetadata.js "TechNova Pvt Ltd" "technova.com" "2025-01-15" "0x7f83b165..."
```

Files are written to `metadata/`.

### Upload to IPFS

1. Upload badge images:
   - `green-badge.png` for verified status
   - `red-badge.png` for revoked status
2. Replace the placeholder image CIDs in `scripts/generateMetadata.js`.
3. Upload the generated JSON files.
4. Use the resulting IPFS URI as the `tokenURI` when minting.

Services: [Pinata](https://pinata.cloud/), [NFT.Storage](https://nft.storage/)

## Contract Verification

The deploy script attempts automatic verification. If it fails, run manually:

```bash
npx hardhat verify --network amoy <CONTRACT_ADDRESS> <INITIAL_OWNER_ADDRESS>
```

For Sepolia:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <INITIAL_OWNER_ADDRESS>
```

## Integration Guide

### Backend integration

Use `scripts/blockchainHelper.js` for admin operations:

```javascript
const {
  getContract,
  mintBadge,
  revokeBadge,
  hasValidBadge,
  getBadgeDetails,
} = require("./scripts/blockchainHelper");
```

### Frontend integration

```javascript
import { connectWallet, hasValidBadge, getBadgeDetails } from "./scripts/blockchainHelper";

const { contract } = await connectWallet(CONTRACT_ADDRESS);
const isVerified = await hasValidBadge(contract, companyAddress);
```

### ABI

After compiling, the ABI is available at:

```
artifacts/contracts/OmenCompanyBadge.sol/OmenCompanyBadge.json
```

## Project Structure

```
omen-blockchain/
├── contracts/
│   └── OmenCompanyBadge.sol      # Soulbound ERC-721 contract
├── scripts/
│   ├── deploy.js                 # Deployment + optional mint + verify
│   ├── mintBadge.js              # Standalone mint helper
│   ├── generateMetadata.js       # IPFS metadata generator
│   └── blockchainHelper.js       # Backend/frontend integration utilities
├── test/
│   └── OmenCompanyBadge.test.js  # Hardhat test suite
├── metadata/                     # Generated metadata (created on demand)
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
- Approvals are blocked at the contract level.
- Only the admin can mint, revoke, or update badge URIs.
