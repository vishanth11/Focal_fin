const { ethers } = require('ethers');
const env = require('./env');

const OMEN_BADGE_ABI = [
  'function mintBadge(address company, string tokenURI)',
  'function revokeBadge(uint256 tokenId)',
  'function updateBadgeURI(uint256 tokenId, string newURI)',
  'function hasValidBadge(address company) view returns (bool)',
  'function getBadgeId(address company) view returns (uint256)',
  'function getCompanyByTokenId(uint256 tokenId) view returns (address)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function owner() view returns (address)'
];

const OMEN_CHAIN_ID = 80002n;

function getProvider() {
  return new ethers.JsonRpcProvider(env.rpcUrl || 'https://rpc-amoy.polygon.technology');
}

function getSigner() {
  if (!env.adminPrivateKey) {
    throw new Error('ADMIN_PRIVATE_KEY is not configured');
  }
  return new ethers.Wallet(env.adminPrivateKey, getProvider());
}

function getContract() {
  if (!env.contractAddress || !ethers.isAddress(env.contractAddress)) {
    throw new Error('CONTRACT_ADDRESS is missing or invalid');
  }
  return new ethers.Contract(env.contractAddress, OMEN_BADGE_ABI, getSigner());
}

function getReadOnlyContract() {
  if (!env.contractAddress || !ethers.isAddress(env.contractAddress)) {
    throw new Error('CONTRACT_ADDRESS is missing or invalid');
  }
  return new ethers.Contract(env.contractAddress, OMEN_BADGE_ABI, getProvider());
}

module.exports = {
  OMEN_BADGE_ABI,
  OMEN_CHAIN_ID,
  getProvider,
  getSigner,
  getContract,
  getReadOnlyContract
};
