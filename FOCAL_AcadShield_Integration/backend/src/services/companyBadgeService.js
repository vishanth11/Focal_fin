const { createVerificationHash, mintBadge } = require('./blockchainService');
const { uploadBadgeMetadata } = require('./pinataService');
const env = require('../config/env');

// Badge payload built ONLY from persisted record fields — those fields are
// populated exclusively after a real confirmed Amoy transaction, so there is
// no simulated hash or token ID path.
function badgePayload(company) {
  const explorerBase = 'https://amoy.polygonscan.com';
  return {
    tokenId: company.tokenId,
    tokenURI: company.tokenURI,
    transactionHash: company.mintTransactionHash,
    owner: company.walletAddress,
    network: 'Polygon Amoy Testnet',
    chainId: 80002,
    contractAddress: env.contractAddress,
    explorerUrl: company.mintTransactionHash
      ? `${explorerBase}/tx/${company.mintTransactionHash}`
      : null,
    tokenUrl:
      company.tokenId != null
        ? `${explorerBase}/token/${env.contractAddress}/${company.tokenId}`
        : null,
    simulated: false,
    demoMode: Boolean(company.demoMode)
  };
}

// The single real mint pipeline for FOCAL company badges. The badge
// contract's mintBadge is onlyAdmin, so the transaction is ALWAYS submitted
// by the backend's admin signer (ADMIN_PRIVATE_KEY, server-side only). Both
// callers — the admin approval flow and the demo-only wallet-signed mint —
// go through this function; there is no second minting implementation and no
// simulated path.
async function issueBadge(company, { demo = false } = {}) {
  const verificationDate = new Date();
  const dateString = verificationDate.toISOString().slice(0, 10);
  const verificationHash = createVerificationHash(company.name, company.domain, dateString);

  const metadata = demo
    ? {
        // Demo metadata must be honest on-chain: it records a DEMO
        // verification, never a government or production one.
        name: `FOCAL Demo Badge: ${company.name}`,
        description: `This soulbound NFT records that ${company.name} completed FOCAL DEMO verification on the Polygon Amoy testnet. It is NOT a government or production verification.`,
        attributes: [
          { trait_type: 'Company Name', value: company.name },
          { trait_type: 'Domain', value: company.domain },
          { trait_type: 'Verification Date', value: dateString },
          { trait_type: 'Verification Hash', value: verificationHash },
          { trait_type: 'Verification Mode', value: 'DEMO' },
          { trait_type: 'Status', value: 'verified (demo)' }
        ]
      }
    : {
        name: `OMEN Verified Company: ${company.name}`,
        description: `This soulbound NFT certifies that ${company.name} has been verified by OMEN as a legitimate company.`,
        attributes: [
          { trait_type: 'Company Name', value: company.name },
          { trait_type: 'Domain', value: company.domain },
          { trait_type: 'Verification Date', value: dateString },
          { trait_type: 'Verification Hash', value: verificationHash },
          { trait_type: 'GST Verification Status', value: company.gstVerificationStatus || 'not_provided' },
          { trait_type: 'Status', value: 'verified' }
        ]
      };

  const fileName = demo
    ? `${company.domain}-focal-demo-badge.json`
    : `${company.domain}-omen-verified.json`;

  // Any failure here (Pinata credentials, admin key, RPC, gas) throws — the
  // caller surfaces the real error. Nothing is simulated.
  const uploaded = await uploadBadgeMetadata(metadata, fileName);
  const mintResult = await mintBadge(company.walletAddress, uploaded.tokenURI);

  return {
    verificationDate,
    verificationHash,
    tokenURI: uploaded.tokenURI,
    tokenId: mintResult.tokenId,
    transactionHash: mintResult.transactionHash,
    mint: mintResult
  };
}

module.exports = { badgePayload, issueBadge };