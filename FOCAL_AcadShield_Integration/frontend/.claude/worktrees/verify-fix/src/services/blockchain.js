import { ethers } from 'ethers';

export const OMEN_CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || '0x9124A20aE4a715Fcee6056bf1F5f95E4358647C6';
export const OMEN_CHAIN_ID = 80002n;

// OMEN Company Badge — read-only ABI for the deployed contract.
const CONTRACT_ABI = [
  'function hasValidBadge(address company) view returns (bool)',
  'function getBadgeId(address company) view returns (uint256)',
  'function getCompanyByTokenId(uint256 tokenId) view returns (address)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'event BadgeMinted(address indexed company, uint256 indexed tokenId, string tokenURI)',
  'event BadgeRevoked(address indexed company, uint256 indexed tokenId)'
];

function isContractConfigured() {
  return ethers.isAddress(OMEN_CONTRACT_ADDRESS);
}

function toGatewayUrl(uri) {
  if (!uri?.startsWith('ipfs://')) return uri;
  return `https://ipfs.io/ipfs/${uri.slice('ipfs://'.length)}`;
}

function metadataAttribute(metadata, traitType) {
  return metadata?.attributes?.find((attribute) => attribute.trait_type === traitType)?.value || null;
}

async function readMetadata(tokenURI) {
  const response = await fetch(toGatewayUrl(tokenURI));
  if (!response.ok) {
    throw new Error(`Metadata request failed with status ${response.status}`);
  }
  return response.json();
}

/**
 * Verify a company's soulbound badge on-chain. FAILS CLOSED:
 * a chain error, missing configuration, or bad input NEVER returns
 * isValid: true — a trust platform must not show "verified" on failure.
 */
export async function verifyOnChain(walletAddress) {
  if (!walletAddress || walletAddress === 'N/A' || walletAddress === 'None') {
    return { isValid: false, tokenId: null, error: 'No wallet address associated with entity' };
  }

  if (!ethers.isAddress(walletAddress)) {
    return { isValid: false, tokenId: null, error: 'Invalid wallet address' };
  }

  if (!isContractConfigured()) {
    return {
      isValid: false,
      tokenId: null,
      error: 'OMEN contract address is not configured'
    };
  }

  const contractAddress = OMEN_CONTRACT_ADDRESS;
  const rpcUrl = import.meta.env.VITE_RPC_URL || 'https://rpc-amoy.polygon.technology';

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    if (network.chainId !== OMEN_CHAIN_ID) {
      throw new Error(`Expected Polygon Amoy chain ${OMEN_CHAIN_ID}, received ${network.chainId}`);
    }
    const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, provider);

    const isValid = await contract.hasValidBadge(walletAddress);
    if (!isValid) {
      return {
        isValid: false,
        tokenId: null,
        address: walletAddress,
        contract: contractAddress,
        network: 'Polygon Amoy',
        error: null
      };
    }

    const tokenId = (await contract.getBadgeId(walletAddress)).toString();
    const owner = await contract.ownerOf(tokenId);
    if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('OMEN badge owner does not match the company wallet');
    }
    const tokenURI = await contract.tokenURI(tokenId);
    const metadata = await readMetadata(tokenURI);

    return {
      isValid: true,
      tokenId,
      address: walletAddress,
      owner,
      tokenURI,
      metadata,
      companyName: metadataAttribute(metadata, 'Company Name'),
      domain: metadataAttribute(metadata, 'Domain'),
      verificationDate: metadataAttribute(metadata, 'Verification Date'),
      verificationHash: metadataAttribute(metadata, 'Verification Hash'),
      status: metadataAttribute(metadata, 'Status'),
      contract: contractAddress,
      network: 'Polygon Amoy',
      error: null
    };
  } catch (error) {
    console.error('Blockchain verification failed:', error.message);
    return {
      isValid: false,
      tokenId: null,
      address: walletAddress,
      contract: contractAddress,
      error: 'Blockchain verification unavailable — check RPC connectivity'
    };
  }
}

export async function connectWallet() {
  if (typeof window !== 'undefined' && window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    return { provider, signer, address: await signer.getAddress() };
  }
  throw new Error('MetaMask or Web3 wallet extension not detected.');
}

const AMOY_EXPLORER_URL = 'https://amoy.polygonscan.com';

/**
 * Prompt the wallet to switch to Polygon Amoy (the chain the badge contract
 * lives on). Adds the chain first if the wallet does not know it.
 */
export async function switchToAmoy() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not detected.');
  }
  const chainIdHex = `0x${OMEN_CHAIN_ID.toString(16)}`;
  const rpcUrl = import.meta.env.VITE_RPC_URL || 'https://rpc-amoy.polygon.technology';
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }]
    });
  } catch (switchError) {
    // 4902 = the wallet does not have this chain yet.
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: chainIdHex,
            chainName: 'Polygon Amoy Testnet',
            nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
            rpcUrls: [rpcUrl],
            blockExplorerUrls: [AMOY_EXPLORER_URL]
          }
        ]
      });
    } else {
      throw switchError;
    }
  }
}

export { toGatewayUrl };

/**
 * Sign the FOCAL ownership message with the CONNECTED MetaMask wallet. The
 * backend recovers the signer from this signature and only then mints the
 * badge to the registered wallet — the mint recipient is always the
 * connected wallet, never a manually typed address.
 */
export async function signWalletMessage(signer, companyName) {
  const timestamp = Date.now();
  const message = `Verify FOCAL ownership for "${companyName}" at ${timestamp}. I control this wallet and authorize FOCAL to mint the OMEN badge to this address.`;
  const signature = await signer.signMessage(message);
  return { message, signature, timestamp };
}

/** Polygon Amoy explorer URL for a confirmed transaction (null if not real). */
export function amoyTxUrl(transactionHash) {
  if (!transactionHash) return null;
  return `${AMOY_EXPLORER_URL}/tx/${transactionHash}`;
}

/** Polygon Amoy explorer URL for the badge contract. */
export function amoyContractUrl() {
  return `${AMOY_EXPLORER_URL}/address/${OMEN_CONTRACT_ADDRESS}`;
}

/** Polygon Amoy explorer URL for a minted token. */
export function amoyTokenUrl(tokenId) {
  if (tokenId == null) return null;
  return `${AMOY_EXPLORER_URL}/token/${OMEN_CONTRACT_ADDRESS}/${tokenId}`;
}