const { ethers } = require('ethers');
const env = require('../config/env');

const AMOY_CHAIN_ID = 80002n;

/**
 * Checks if production/testnet blockchain keys are configured for live on-chain issuance.
 */
function isBlockchainConfigured() {
  return (
    Boolean(env.adminPrivateKey) &&
    Boolean(env.contractAddress) &&
    ethers.isAddress(env.contractAddress) &&
    env.contractAddress !== '0x9124A20aE4a715Fcee6056bf1F5f95E4358647C6'
  );
}

/**
 * Registers an academic credential reference on-chain.
 * FAILS HONESTLY: If keys/contracts are not configured, it returns an explicit
 * simulated state (simulated: true) so demo runs without false claims of on-chain proof.
 */
async function registerCredentialOnChain({
  credentialId,
  documentHash,
  studentWallet = ethers.ZeroAddress,
  universityWallet
}) {
  if (!isBlockchainConfigured()) {
    // Honest simulation mode when testnet keys are unset
    return {
      status: 'simulated',
      simulated: true,
      network: 'Polygon Amoy (Simulated)',
      contractAddress: env.contractAddress,
      tokenId: Math.floor(1000 + Math.random() * 9000),
      transactionHash: null,
      message: 'Blockchain issuance simulated: live private key not configured.'
    };
  }

  try {
    const provider = new ethers.JsonRpcProvider(env.rpcUrl);
    const network = await provider.getNetwork();

    if (network.chainId !== AMOY_CHAIN_ID) {
      throw new Error(`Expected Polygon Amoy chain ${AMOY_CHAIN_ID}, got ${network.chainId}`);
    }

    const wallet = new ethers.Wallet(env.adminPrivateKey, provider);

    // Call live contract if available
    const abi = [
      'function registerCredential(string memory credentialId, string memory docHash, address student) public returns (uint256)',
      'event CredentialRegistered(string indexed credentialId, string docHash, address student, uint256 tokenId)'
    ];

    const contract = new ethers.Contract(env.contractAddress, abi, wallet);
    const tx = await contract.registerCredential(credentialId, documentHash, studentWallet);
    const receipt = await tx.wait(1);

    if (receipt.status !== 1) {
      throw new Error('On-chain transaction reverted');
    }

    return {
      status: 'confirmed',
      simulated: false,
      network: 'Polygon Amoy',
      contractAddress: env.contractAddress,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      confirmedAt: new Date()
    };
  } catch (error) {
    console.error('Academic blockchain registration error:', error.message);
    return {
      status: 'failed',
      simulated: false,
      error: error.message,
      network: 'Polygon Amoy',
      contractAddress: env.contractAddress
    };
  }
}

/**
 * Records credential revocation on-chain.
 */
async function revokeCredentialOnChain({ credentialId, reason }) {
  if (!isBlockchainConfigured()) {
    return {
      status: 'simulated',
      simulated: true,
      message: 'On-chain revocation simulated: live keys not configured.'
    };
  }

  try {
    const provider = new ethers.JsonRpcProvider(env.rpcUrl);
    const wallet = new ethers.Wallet(env.adminPrivateKey, provider);

    const abi = [
      'function revokeCredential(string memory credentialId, string memory reason) public',
      'event CredentialRevoked(string indexed credentialId, string reason)'
    ];

    const contract = new ethers.Contract(env.contractAddress, abi, wallet);
    const tx = await contract.revokeCredential(credentialId, reason);
    const receipt = await tx.wait(1);

    return {
      status: 'confirmed',
      simulated: false,
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  } catch (error) {
    console.error('Academic blockchain revocation error:', error.message);
    return {
      status: 'failed',
      simulated: false,
      error: error.message
    };
  }
}

module.exports = {
  isBlockchainConfigured,
  registerCredentialOnChain,
  revokeCredentialOnChain
};
