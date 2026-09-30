const { ethers } = require('ethers');
const { getContract, getReadOnlyContract } = require('../config/blockchain');
const logger = require('../utils/logger');
const env = require('../config/env');

const ETH_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const OMEN_CHAIN_ID = 80002n;

function isChainConfigured() {
  return Boolean(env.contractAddress && ETH_ADDRESS_PATTERN.test(env.contractAddress) && env.rpcUrl);
}

// Resolve a company's verification, chain-first and fail-closed:
// - When a contract is configured, verification REQUIRES a valid on-chain
//   badge. A tokenId persisted in the DB is never accepted as proof, and an
//   RPC error means "not verified" — never "verified".
// - Missing or failed chain configuration always returns an unverified result.
async function resolveVerification(company) {
  if (!company || company.status !== 'verified') {
    return { isVerified: false, onChain: false, simulated: false };
  }

  const chainValid = await hasValidBadge(company.walletAddress);
  if (chainValid) {
    return { isVerified: true, onChain: true, simulated: false };
  }
  return { isVerified: false, onChain: false, simulated: false };
}

async function initializeContract(writable = false) {
  const contract = writable ? getContract() : getReadOnlyContract();
  const network = await contract.runner.provider.getNetwork();
  if (network.chainId !== OMEN_CHAIN_ID) {
    throw new Error(`Expected Polygon Amoy chain ${OMEN_CHAIN_ID}, received ${network.chainId}`);
  }
  return contract;
}

async function mintBadge(companyAddress, tokenURI) {
  try {
    if (!ethers.isAddress(companyAddress)) {
      throw new Error('Invalid company wallet address');
    }
    const contract = await initializeContract(true);
    const tx = await contract.mintBadge(companyAddress, tokenURI);
    const receipt = await tx.wait();
    // A mined-but-REVERTED transaction resolves here as a receipt, not an
    // error — it must never be treated as a confirmed mint.
    if (receipt?.status !== 1) {
      throw new Error(`Mint transaction was reverted on Polygon Amoy (${receipt?.hash})`);
    }
    const tokenId = await contract.getBadgeId(companyAddress);
    return {
      transactionHash: receipt.hash,
      tokenId: Number(tokenId)
    };
  } catch (error) {
    logger.error('mintBadge failed', { error: error.message });
    throw new Error(`Blockchain mint failed: ${error.message}`);
  }
}

async function revokeBadge(tokenId) {
  try {
    const contract = await initializeContract(true);
    const tx = await contract.revokeBadge(tokenId);
    const receipt = await tx.wait();
    if (receipt?.status !== 1) {
      throw new Error(`Revoke transaction was reverted on Polygon Amoy (${receipt?.hash})`);
    }
    return { transactionHash: receipt.hash };
  } catch (error) {
    logger.error('revokeBadge failed', { error: error.message, tokenId });
    throw new Error(`Blockchain revoke failed: ${error.message}`);
  }
}

async function updateBadgeURI(tokenId, newURI) {
  try {
    const contract = await initializeContract(true);
    const tx = await contract.updateBadgeURI(tokenId, newURI);
    const receipt = await tx.wait();
    return { transactionHash: receipt.hash };
  } catch (error) {
    logger.error('updateBadgeURI failed', { error: error.message, tokenId });
    throw new Error(`Blockchain URI update failed: ${error.message}`);
  }
}

async function hasValidBadge(companyAddress) {
  try {
    if (!ethers.isAddress(companyAddress)) {
      return false;
    }
    const contract = await initializeContract();
    return Boolean(await contract.hasValidBadge(companyAddress));
  } catch (error) {
    logger.warn('hasValidBadge failed', { error: error.message, companyAddress });
    return false;
  }
}

async function getBadgeDetails(companyAddress) {
  try {
    if (!ethers.isAddress(companyAddress)) {
      throw new Error('Invalid company wallet address');
    }
    const contract = await initializeContract();
    const tokenId = await contract.getBadgeId(companyAddress);
    const tokenURI = await contract.tokenURI(tokenId);
    const owner = await contract.ownerOf(tokenId);
    const isValid = await contract.hasValidBadge(companyAddress);
    return {
      tokenId: Number(tokenId),
      tokenURI,
      owner,
      isValid: Boolean(isValid) && owner.toLowerCase() === companyAddress.toLowerCase()
    };
  } catch (error) {
    logger.warn('getBadgeDetails failed', { error: error.message, companyAddress });
    return { tokenId: null, tokenURI: null, isValid: false };
  }
}

function createVerificationHash(companyName, domain, verificationDate) {
  return ethers.solidityPackedKeccak256(
    ['string', 'string', 'string', 'string'],
    [companyName, domain, verificationDate, 'OMEN_TRUST_PLATFORM_v1']
  );
}

module.exports = {
  createVerificationHash,
  getBadgeDetails,
  hasValidBadge,
  initializeContract,
  isChainConfigured,
  mintBadge,
  resolveVerification,
  revokeBadge,
  updateBadgeURI
};
