/**
 * Unit tests for blockchainService.resolveVerification — chain-first,
 * fail-closed verification, WITH a contract configured (production mode).
 *
 * Verifies:
 * - Verification requires a valid on-chain badge; a DB tokenId is never
 *   accepted as proof, and RPC failure means "not verified".
 *
 * Demo-mode behavior (no contract configured) is covered in
 * blockchainService.demo.test.js.
 */
process.env.CONTRACT_ADDRESS = `0x${'c3d4'.repeat(10)}`; // valid 40-hex address — set before first require

jest.mock('../src/config/blockchain', () => ({
  getContract: jest.fn(),
  getReadOnlyContract: jest.fn()
}));
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { getContract, getReadOnlyContract } = require('../src/config/blockchain');
const {
  createVerificationHash,
  isChainConfigured,
  mintBadge,
  resolveVerification,
  revokeBadge
} = require('../src/services/blockchainService');

const VALID_WALLET = `0x${'a1b2'.repeat(10)}`;

function mockContract(hasValidBadge) {
  getReadOnlyContract.mockReturnValue({
    runner: { provider: { getNetwork: jest.fn().mockResolvedValue({ chainId: 80002n }) } },
    hasValidBadge: jest.fn().mockResolvedValue(hasValidBadge)
  });
}

function makeCompany(overrides = {}) {
  return {
    status: 'verified',
    walletAddress: VALID_WALLET,
    tokenId: 4242,
    ...overrides
  };
}

describe('isChainConfigured (contract configured)', () => {
  test('accepts the real 20-byte contract address', () => {
    expect(isChainConfigured()).toBe(true);
  });
});

describe('resolveVerification (contract configured — fail-closed)', () => {
  beforeEach(() => {
    getReadOnlyContract.mockReset();
  });

  test('verified only from the chain when the badge is valid', async () => {
    mockContract(true);
    const result = await resolveVerification(makeCompany());
    expect(result).toEqual({ isVerified: true, onChain: true, simulated: false });
  });

  test('fails closed when the chain says invalid — DB tokenId is NOT proof', async () => {
    mockContract(false);
    const result = await resolveVerification(makeCompany({ tokenId: 9999 }));
    expect(result).toEqual({ isVerified: false, onChain: false, simulated: false });
  });

  test('fails closed on RPC errors even with a persisted tokenId', async () => {
    getReadOnlyContract.mockImplementation(() => {
      throw new Error('could not detect network');
    });
    const result = await resolveVerification(makeCompany());
    expect(result.isVerified).toBe(false);
  });

  test('non-verified companies are never verified', async () => {
    mockContract(true);
    const result = await resolveVerification(makeCompany({ status: 'pending', tokenId: 1 }));
    expect(result).toEqual({ isVerified: false, onChain: false, simulated: false });
  });

  test('missing company is never verified', async () => {
    mockContract(true);
    const result = await resolveVerification(null);
    expect(result).toEqual({ isVerified: false, onChain: false, simulated: false });
  });
});

describe('OMEN transaction handling', () => {
  test('uses the real receipt and on-chain token ID after minting', async () => {
    // A real ethers v6 receipt carries status: 1 for a confirmed transaction.
    const wait = jest.fn().mockResolvedValue({ hash: '0xreal', status: 1 });
    getContract.mockReturnValue({
      runner: { provider: { getNetwork: jest.fn().mockResolvedValue({ chainId: 80002n }) } },
      mintBadge: jest.fn().mockResolvedValue({ wait }),
      getBadgeId: jest.fn().mockResolvedValue(0n)
    });

    await expect(mintBadge(VALID_WALLET, 'ipfs://metadata')).resolves.toEqual({
      transactionHash: '0xreal',
      tokenId: 0
    });
  });

  test('a mined-but-REVERTED receipt is a failed mint, never success', async () => {
    // ethers v6 resolves tx.wait() with a receipt even when the transaction
    // reverted — status 0 must surface as an error, not a confirmed mint.
    const wait = jest.fn().mockResolvedValue({ hash: '0xreverted', status: 0 });
    getContract.mockReturnValue({
      runner: { provider: { getNetwork: jest.fn().mockResolvedValue({ chainId: 80002n }) } },
      mintBadge: jest.fn().mockResolvedValue({ wait }),
      getBadgeId: jest.fn().mockResolvedValue(0n)
    });

    await expect(mintBadge(VALID_WALLET, 'ipfs://metadata')).rejects.toThrow(
      'Mint transaction was reverted on Polygon Amoy (0xreverted)'
    );
  });

  test('a mined-but-REVERTED receipt is a failed revoke, never success', async () => {
    const wait = jest.fn().mockResolvedValue({ hash: '0xreverted', status: 0 });
    getContract.mockReturnValue({
      runner: { provider: { getNetwork: jest.fn().mockResolvedValue({ chainId: 80002n }) } },
      revokeBadge: jest.fn().mockResolvedValue({ wait })
    });

    await expect(revokeBadge(0)).rejects.toThrow(
      'Revoke transaction was reverted on Polygon Amoy (0xreverted)'
    );
  });

  test('propagates mint and revoke failures instead of simulating success', async () => {
    getContract.mockReturnValue({
      runner: { provider: { getNetwork: jest.fn().mockResolvedValue({ chainId: 80002n }) } },
      mintBadge: jest.fn().mockRejectedValue(new Error('reverted')),
      revokeBadge: jest.fn().mockRejectedValue(new Error('reverted'))
    });

    await expect(mintBadge(VALID_WALLET, 'ipfs://metadata')).rejects.toThrow('Blockchain mint failed');
    await expect(revokeBadge(0)).rejects.toThrow('Blockchain revoke failed');
  });
});

test('creates the expected OMEN verification hash', () => {
  expect(createVerificationHash('TechNova Pvt Ltd', 'technova.com', '2025-01-15'))
    .toBe('0xf7a6714442c73909b34ec53ddd4f543691a9b4b6e569d153b9fdccce21506989');
});