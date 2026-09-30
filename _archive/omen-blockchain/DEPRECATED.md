# ⚠️ DEPRECATED — DO NOT USE

This Hardhat project (`omen-blockchain`) has been **superseded by `../../focal-blockchain`** and is archived here for reference only.

## Why it was deprecated

- Legacy OMEN naming; the platform is now **FOCAL**.
- Its `.env` contained **real committed secrets** (a deployer private key and a Pinata JWT). Those have been scrubbed to placeholders, and the leaked credentials should be considered compromised — rotate them:
  - Move all funds from the old deployer wallet to a fresh wallet.
  - Regenerate the Pinata JWT at https://pinata.io.
- The canonical contract is now `focal-blockchain/contracts/FocalCompanyBadge.sol`, deployed on **Polygon Amoy**.

## Do NOT

- Deploy, mint, or transact from this project.
- Restore the old credentials.

## Use instead

```
focal-blockchain/
├── contracts/FocalCompanyBadge.sol   # soulbound ERC-721 (canonical)
├── scripts/deploy.js                 # deploy to --network amoy
└── .env.example                      # placeholder secrets
```