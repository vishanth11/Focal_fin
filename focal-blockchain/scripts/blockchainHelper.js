/**
 * FOCAL Blockchain Helper
 *
 * Utility functions for backend and frontend teams to interact with the
 * FocalCompanyBadge smart contract using ethers.js v6.
 *
 * Usage (Node.js / backend):
 *   const { getContract, mintBadge } = require("./scripts/blockchainHelper");
 *   const contract = await getContract(rpcUrl, privateKey, contractAddress);
 *   await mintBadge(contract, companyAddress, tokenURI);
 *
 * Usage (browser / frontend):
 *   import { connectWallet, hasValidBadge } from "./scripts/blockchainHelper";
 *   const { contract } = await connectWallet(contractAddress);
 *   const isVerified = await hasValidBadge(contract, companyAddress);
 */

const { ethers } = require("ethers");

// Update this path or require the artifact directly after compiling.
const CONTRACT_ABI = require("../artifacts/contracts/FocalCompanyBadge.sol/FocalCompanyBadge.json").abi;

/**
 * Create a read-only contract instance.
 * @param {string} providerUrl - RPC endpoint URL.
 * @param {string} contractAddress - Deployed contract address.
 * @returns {ethers.Contract}
 */
function getReadOnlyContract(providerUrl, contractAddress) {
  const provider = new ethers.JsonRpcProvider(providerUrl);
  return new ethers.Contract(contractAddress, CONTRACT_ABI, provider);
}

/**
 * Create a writable contract instance using a private key (backend use).
 * @param {string} rpcUrl - RPC endpoint URL.
 * @param {string} privateKey - Admin private key with 0x prefix.
 * @param {string} contractAddress - Deployed contract address.
 * @returns {Promise<ethers.Contract>}
 */
async function getContract(rpcUrl, privateKey, contractAddress) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(contractAddress, CONTRACT_ABI, signer);
}

/**
 * Mint a badge to a verified company.
 * @param {ethers.Contract} contract - Writable contract instance.
 * @param {string} companyAddress - Address that will receive the badge.
 * @param {string} tokenURI - IPFS or HTTP metadata URI.
 * @returns {Promise<ethers.TransactionReceipt>}
 */
async function mintBadge(contract, companyAddress, tokenURI) {
  const tx = await contract.mintBadge(companyAddress, tokenURI);
  return tx.wait();
}

/**
 * Revoke (burn) a badge.
 * @param {ethers.Contract} contract - Writable contract instance.
 * @param {string|number} tokenId - Token ID to revoke.
 * @returns {Promise<ethers.TransactionReceipt>}
 */
async function revokeBadge(contract, tokenId) {
  const tx = await contract.revokeBadge(tokenId);
  return tx.wait();
}

/**
 * Update a badge's metadata URI.
 * @param {ethers.Contract} contract - Writable contract instance.
 * @param {string|number} tokenId - Token ID to update.
 * @param {string} newURI - New metadata URI.
 * @returns {Promise<ethers.TransactionReceipt>}
 */
async function updateBadgeURI(contract, tokenId, newURI) {
  const tx = await contract.updateBadgeURI(tokenId, newURI);
  return tx.wait();
}

/**
 * Check whether an address holds a valid badge.
 * @param {ethers.Contract} contract - Read or write contract instance.
 * @param {string} companyAddress - Address to check.
 * @returns {Promise<boolean>}
 */
async function hasValidBadge(contract, companyAddress) {
  return contract.hasValidBadge(companyAddress);
}

/**
 * Get badge details for an address.
 * @param {ethers.Contract} contract - Read or write contract instance.
 * @param {string} companyAddress - Address to query.
 * @returns {Promise<{tokenId: string, tokenURI: string}>}
 */
async function getBadgeDetails(contract, companyAddress) {
  const tokenId = await contract.getBadgeId(companyAddress);
  const tokenURI = await contract.tokenURI(tokenId);
  return { tokenId: tokenId.toString(), tokenURI };
}

/**
 * Connect to MetaMask in a browser environment.
 * @param {string} contractAddress - Deployed contract address.
 * @returns {Promise<{signer: ethers.JsonRpcSigner, contract: ethers.Contract}>}
 */
async function connectWallet(contractAddress) {
  if (!window.ethereum) {
    throw new Error("MetaMask or a compatible wallet is not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer);

  return { signer, contract };
}

module.exports = {
  CONTRACT_ABI,
  getReadOnlyContract,
  getContract,
  mintBadge,
  revokeBadge,
  updateBadgeURI,
  hasValidBadge,
  getBadgeDetails,
  connectWallet,
};
