/**
 * Unit tests for blockchainService.resolveVerification in DEMO MODE —
 * no valid contract address configured (e.g. 0xYourContractAddress or unset).
 *
 * Verifies:
 * - isChainConfigured() is false for placeholder/unset addresses.
 * - A persisted tokenId is never accepted without a live OMEN contract.
 * - Without a tokenId there is nothing to show — not verified.
 */
process.env.CONTRACT_ADDRESS = '0xYourContractAddress'; // placeholder — set before first require

jest.mock('../src/config/blockchain', () => ({
  getContract: jest.fn(),
  getReadOnlyContract: jest.fn()
}));
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { getReadOnlyContract } = require('../src/config/blockchain');
const { isChainConfigured, resolveVerification } = require('../src/services/blockchainService');

const VALID_WALLET = `0x${'a1b2'.repeat(10)}`;

function makeCompany(overrides = {}) {
  return {
    status: 'verified',
    walletAddress: VALID_WALLET,
    tokenId: 4242,
    ...overrides
  };
}

describe('isChainConfigured (demo mode)', () => {
  test('rejects the placeholder address', () => {
    expect(isChainConfigured()).toBe(false);
  });
});

describe('resolveVerification (missing contract configuration)', () => {
  beforeEach(() => {
    // Chain lookups fail in demo mode — hasValidBadge returns false.
    getReadOnlyContract.mockReturnValue({
      runner: { provider: { getNetwork: jest.fn().mockRejectedValue(new Error('bad address')) } },
      hasValidBadge: jest.fn().mockResolvedValue(false)
    });
  });

  test('does not accept a persisted tokenId as proof', async () => {
    const result = await resolveVerification(makeCompany());
    expect(result).toEqual({ isVerified: false, onChain: false, simulated: false });
  });

  test('demo mode without a tokenId is not verified', async () => {
    const result = await resolveVerification(makeCompany({ tokenId: undefined }));
    expect(result).toEqual({ isVerified: false, onChain: false, simulated: false });
  });
});