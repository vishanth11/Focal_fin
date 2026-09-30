// Hermetic unit tests for the company verification + badge mint flow:
//   - registration always lands as PENDING (production AND demo mode)
//   - the admin approval is the AUTHORITATIVE gate for minting
//   - mint eligibility, wallet ownership proof and idempotency
//   - a mint failure never rolls back the admin's verification
//
// No database, no network. The Company model, the trust engine, the GST
// service and the badge pipeline are mocked; env is a mutable object so the
// demo-mode branch can be toggled per test.
const { ethers } = require('ethers');

const mockEnv = {
  demoVerificationMode: false,
  contractAddress: '0x9124A20aE4a715Fcee6056bf1F5f95E4358647C6',
  adminEmail: 'admin@focal.network',
  adminPassword: 'test-admin-password',
  jwtSecret: 'test-admin-secret',
  studentJwtSecret: 'test-student-secret',
  jwtExpire: '7d',
  adminPrivateKey: '0x0000000000000000000000000000000000000000000000000000000000000000'
};

jest.mock('../src/config/env', () => mockEnv);

jest.mock('../src/models/Company', () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../src/services/gstVerificationService', () => ({
  verifyGST: jest.fn()
}));

jest.mock('../src/services/verificationService', () => ({
  verifyCompany: jest.fn()
}));

jest.mock('../src/services/companyBadgeService', () => ({
  issueBadge: jest.fn(),
  badgePayload: jest.fn((company) => ({
    tokenId: company.tokenId,
    transactionHash: company.mintTransactionHash,
    owner: company.walletAddress
  }))
}));

const Company = require('../src/models/Company');
const { verifyGST } = require('../src/services/gstVerificationService');
const { verifyCompany } = require('../src/services/verificationService');
const { issueBadge } = require('../src/services/companyBadgeService');
const {
  approveCompany,
  mintCompanyBadgeAdmin,
  rejectCompany
} = require('../src/controllers/adminController');
const {
  mintBadgeForCompany,
  registerCompany
} = require('../src/controllers/companyController');

function mockReq({ body = {}, params = {} } = {}) {
  return { body, params };
}

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function jsonPayload(res) {
  return res.json.mock.calls[0][0];
}

function makeCompany(overrides = {}) {
  return {
    _id: 'company-1',
    name: 'Acme Cyber Pvt Ltd',
    domain: 'acme.example.com',
    email: 'contact@acme.example.com',
    walletAddress: '0x3027111111111111111111111111111111116D79',
    status: 'pending',
    demoMode: false,
    tokenId: null,
    mintTransactionHash: null,
    save: jest.fn().mockResolvedValue(this),
    toObject: jest.fn().mockReturnThis(),
    ...overrides
  };
}

// A REAL signature from a throwaway wallet — the controller recovers the
// signer with ethers.verifyMessage, so the proofs must be genuine.
async function signOwnership(companyName, wallet) {
  const timestamp = Date.now();
  const message = `Verify FOCAL ownership for "${companyName}" at ${timestamp}. I control this wallet and authorize FOCAL to mint the OMEN badge to this address.`;
  const signature = await wallet.signMessage(message);
  return { message, signature };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEnv.demoVerificationMode = false;
});

// ---------------------------------------------------------------------------
// Registration — the entry point NEVER grants verification
// ---------------------------------------------------------------------------

describe('registerCompany', () => {
  test('production registration always lands as PENDING and runs the GST check', async () => {
    Company.findOne.mockResolvedValue(null);
    Company.create.mockImplementation(async (doc) => ({ _id: 'company-1', ...doc }));
    verifyGST.mockResolvedValue({
      status: 'verified',
      simulated: false,
      verificationDate: new Date(),
      legalName: 'Acme Cyber Pvt Ltd'
    });

    const res = mockRes();
    await registerCompany(
      mockReq({
        body: {
          name: 'Acme Cyber Pvt Ltd',
          domain: 'acme.example.com',
          email: 'contact@acme.example.com',
          gstin: '27AABCU9603R1ZN',
          walletAddress: '0x3027111111111111111111111111111111116D79'
        }
      }),
      res,
      jest.fn()
    );

    const created = Company.create.mock.calls[0][0];
    expect(created.status).toBe('pending');
    expect(created.demoMode).toBeUndefined();
    expect(verifyGST).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('demo registration is clearly recorded but STILL stays PENDING', async () => {
    mockEnv.demoVerificationMode = true;
    Company.findOne.mockResolvedValue(null);
    Company.create.mockImplementation(async (doc) => ({ _id: 'company-1', ...doc }));

    const res = mockRes();
    await registerCompany(
      mockReq({
        body: {
          name: 'Acme Cyber Pvt Ltd',
          domain: 'acme.example.com',
          email: 'contact@acme.example.com',
          gstin: '27AABCU9603R1ZN',
          walletAddress: '0x3027111111111111111111111111111111116D79'
        }
      }),
      res,
      jest.fn()
    );

    // The demo branch must not touch any external registry.
    expect(verifyGST).not.toHaveBeenCalled();

    const created = Company.create.mock.calls[0][0];
    // Demo verification alone must NOT mean verified — admin review still
    // decides, exactly like production.
    expect(created.status).toBe('pending');
    expect(created.demoMode).toBe(true);
    expect(created.gstVerificationSimulated).toBe(true);
    expect(created.gstVerificationStatus).toBe('verified');
    expect(created.verificationReport.demo).toBe(true);
    expect(created.verificationReport.governmentChecks).toBe(false);
    expect(created.verificationReport.recommendation).toBe('approve');
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('restores the existing company for the same wallet instead of creating a duplicate', async () => {
    const existingCompany = makeCompany({ status: 'pending', walletAddress: '0x3027111111111111111111111111111111116D79' });
    Company.findOne.mockImplementation(async (query) => {
      if (query && query.domain) {
        return null;
      }
      if (query && query.walletAddress) {
        return existingCompany;
      }
      return null;
    });

    const res = mockRes();
    await registerCompany(
      mockReq({
        body: {
          name: 'Acme Cyber Pvt Ltd',
          domain: 'acme.example.com',
          email: 'contact@acme.example.com',
          walletAddress: '0x3027111111111111111111111111111111116D79'
        }
      }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(jsonPayload(res).existing).toBe(true);
    expect(jsonPayload(res).data._id).toBe('company-1');
    expect(Company.create).not.toHaveBeenCalled();
  });

  test('a demo-verified registration is still refused a mint until the admin verifies', async () => {
    // Company registered through the demo branch: demo verification "passed",
    // but status is pending — minting must be blocked.
    const company = makeCompany({
      demoMode: true,
      gstVerificationSimulated: true,
      status: 'pending'
    });
    Company.findById.mockResolvedValue(company);

    const wallet = ethers.Wallet.createRandom();
    company.walletAddress = wallet.address;
    const { message, signature } = await signOwnership(company.name, wallet);

    const res = mockRes();
    await mintBadgeForCompany(
      mockReq({
        params: { id: 'company-1' },
        body: { signature, message, walletAddress: wallet.address }
      }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(jsonPayload(res).code).toBe('NOT_VERIFIED');
    expect(issueBadge).not.toHaveBeenCalled();
    expect(company.save).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Wallet-signed mint — eligibility, ownership proof, idempotency
// ---------------------------------------------------------------------------

describe('mintBadgeForCompany', () => {
  test('rejects a mint when the wallet does not match the registration', async () => {
    const company = makeCompany({ status: 'verified' });
    Company.findById.mockResolvedValue(company);
    const stranger = ethers.Wallet.createRandom();

    const res = mockRes();
    await mintBadgeForCompany(
      mockReq({
        params: { id: 'company-1' },
        body: {
          signature: '0xdeadbeef',
          message: `Verify FOCAL ownership for "${company.name}"`,
          walletAddress: stranger.address
        }
      }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(jsonPayload(res).code).toBe('WALLET_MISMATCH');
    expect(issueBadge).not.toHaveBeenCalled();
  });

  test('rejects a signature that does not recover to the company wallet', async () => {
    const company = makeCompany({ status: 'verified' });
    Company.findById.mockResolvedValue(company);
    const companyWallet = ethers.Wallet.createRandom();
    company.walletAddress = companyWallet.address;

    const otherWallet = ethers.Wallet.createRandom();
    const { message, signature } = await signOwnership(company.name, otherWallet);

    const res = mockRes();
    await mintBadgeForCompany(
      mockReq({
        params: { id: 'company-1' },
        body: { signature, message, walletAddress: companyWallet.address }
      }),
      res,
      jest.fn()
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(jsonPayload(res).code).toBe('INVALID_SIGNATURE');
    expect(issueBadge).not.toHaveBeenCalled();
  });

  test('mints through the shared pipeline for a verified company and persists the receipt only after success', async () => {
    const company = makeCompany({ status: 'verified' });
    Company.findById.mockResolvedValue(company);
    const wallet = ethers.Wallet.createRandom();
    company.walletAddress = wallet.address;
    const { message, signature } = await signOwnership(company.name, wallet);

    issueBadge.mockResolvedValue({
      verificationDate: new Date(),
      verificationHash: '0xhash',
      tokenURI: 'ipfs://metadata',
      tokenId: 42,
      transactionHash: '0xtx'
    });

    const res = mockRes();
    await mintBadgeForCompany(
      mockReq({
        params: { id: 'company-1' },
        body: { signature, message, walletAddress: wallet.address }
      }),
      res,
      jest.fn()
    );

    expect(issueBadge).toHaveBeenCalledWith(company, { demo: false });
    // Badge fields are persisted from the confirmed transaction only.
    expect(company.tokenId).toBe(42);
    expect(company.mintTransactionHash).toBe('0xtx');
    expect(company.save).toHaveBeenCalled();
    expect(jsonPayload(res).data.badge.tokenId).toBe(42);
  });

  test('is idempotent: an already-confirmed badge is returned, never re-minted', async () => {
    const company = makeCompany({
      status: 'verified',
      tokenId: 7,
      mintTransactionHash: '0xexisting'
    });
    Company.findById.mockResolvedValue(company);
    const wallet = ethers.Wallet.createRandom();
    company.walletAddress = wallet.address;
    const { message, signature } = await signOwnership(company.name, wallet);

    const res = mockRes();
    await mintBadgeForCompany(
      mockReq({
        params: { id: 'company-1' },
        body: { signature, message, walletAddress: wallet.address }
      }),
      res,
      jest.fn()
    );

    expect(issueBadge).not.toHaveBeenCalled();
    expect(jsonPayload(res).message).toBe('Badge already minted.');
    expect(jsonPayload(res).data.alreadyMinted).toBe(true);
    expect(jsonPayload(res).data.badge.transactionHash).toBe('0xexisting');
  });
});

// ---------------------------------------------------------------------------
// Admin approval — the AUTHORITATIVE verification signal
// ---------------------------------------------------------------------------

describe('approveCompany', () => {
  test('allows manual approval even when the automated recommendation is manual_review or reject', async () => {
    const company = makeCompany({ status: 'pending' });
    Company.findById.mockResolvedValue(company);
    verifyCompany.mockResolvedValue({ recommendation: 'manual_review', overallScore: 35 });
    issueBadge.mockResolvedValue({
      verificationDate: new Date(),
      verificationHash: '0xhash',
      tokenURI: 'ipfs://metadata',
      tokenId: 99,
      transactionHash: '0xmanual-approve',
      mint: { transactionHash: '0xmanual-approve', tokenId: 99 }
    });

    const res = mockRes();
    await approveCompany(mockReq({ params: { id: 'company-1' } }), res, jest.fn());

    expect(res.status).not.toHaveBeenCalledWith(422);
    expect(company.status).toBe('verified');
    expect(company.approvedAt).toBeTruthy();
    expect(company.approvedBy).toBe('focal-admin');
    expect(company.mintStatus).toBe('minted');
    expect(issueBadge).toHaveBeenCalled();
  });

  test('saves VERIFIED before minting, so a mint failure cannot lose the admin decision', async () => {
    const company = makeCompany({ status: 'pending' });
    Company.findById.mockResolvedValue(company);
    verifyCompany.mockResolvedValue({ recommendation: 'approve', overallScore: 90 });

    issueBadge.mockRejectedValue(new Error('Pinata credentials are not configured'));

    const res = mockRes();
    await approveCompany(mockReq({ params: { id: 'company-1' } }), res, jest.fn());

    // The response is still a success: the company IS verified, only the
    // on-chain badge is pending.
    expect(jsonPayload(res).success).toBe(true);
    expect(jsonPayload(res).message).toBe(
      'Company verified, but the blockchain badge could not be minted.'
    );
    expect(jsonPayload(res).data.mintError).toBe('Pinata credentials are not configured');
    expect(jsonPayload(res).data.mint).toBeNull();

    // Verification was saved BEFORE the mint attempt: even though issueBadge
    // threw, the company must already be verified and persisted.
    expect(company.status).toBe('verified');
    const saveOrder = company.save.mock.invocationCallOrder[0];
    const mintOrder = issueBadge.mock.invocationCallOrder[0];
    expect(saveOrder).toBeLessThan(mintOrder);
    // No on-chain facts are recorded for a failed mint.
    expect(company.tokenId).toBeNull();
    expect(company.mintTransactionHash).toBeNull();
  });

  test('persists the real on-chain receipt on a successful approval', async () => {
    const company = makeCompany({ status: 'pending' });
    Company.findById.mockResolvedValue(company);
    verifyCompany.mockResolvedValue({ recommendation: 'approve', overallScore: 90 });

    issueBadge.mockResolvedValue({
      verificationDate: new Date(),
      verificationHash: '0xhash',
      tokenURI: 'ipfs://metadata',
      tokenId: 9,
      transactionHash: '0xtx',
      mint: { transactionHash: '0xtx', tokenId: 9 }
    });

    const res = mockRes();
    await approveCompany(mockReq({ params: { id: 'company-1' } }), res, jest.fn());

    expect(jsonPayload(res).success).toBe(true);
    expect(jsonPayload(res).data.mint.tokenId).toBe(9);
    expect(jsonPayload(res).data.badge.tokenId).toBe(9);
    expect(company.status).toBe('verified');
    expect(company.mintTransactionHash).toBe('0xtx');
  });

  test('uses the stored demo report for a demo company instead of a fresh (failing) run', async () => {
    mockEnv.demoVerificationMode = true;
    const demoReport = {
      demo: true,
      governmentChecks: false,
      recommendation: 'approve',
      overallScore: 100
    };
    const company = makeCompany({ status: 'pending', demoMode: true, verificationReport: demoReport });
    Company.findById.mockResolvedValue(company);

    issueBadge.mockResolvedValue({
      verificationDate: new Date(),
      verificationHash: '0xhash',
      tokenURI: 'ipfs://metadata',
      tokenId: 11,
      transactionHash: '0xdemo-tx',
      mint: { transactionHash: '0xdemo-tx', tokenId: 11 }
    });

    const res = mockRes();
    await approveCompany(mockReq({ params: { id: 'company-1' } }), res, jest.fn());

    // The demo registration's simulated GST would fail the production trust
    // engine — the stored demo report is the demo check, and must be used.
    expect(verifyCompany).not.toHaveBeenCalled();
    expect(jsonPayload(res).success).toBe(true);
    expect(company.status).toBe('verified');
    expect(company.verificationReport).toBe(demoReport);
  });
});

// ---------------------------------------------------------------------------
// Admin mint retry + reject — record preservation
// ---------------------------------------------------------------------------

describe('mintCompanyBadgeAdmin', () => {
  test('refuses to mint a company that is not admin-verified', async () => {
    Company.findById.mockResolvedValue(makeCompany({ status: 'pending' }));

    const res = mockRes();
    await mintCompanyBadgeAdmin(mockReq({ params: { id: 'company-1' } }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(jsonPayload(res).message).toBe(
      'NFT minting becomes available after administrator verification.'
    );
    expect(issueBadge).not.toHaveBeenCalled();
  });

  test('is idempotent for an already-minted badge', async () => {
    Company.findById.mockResolvedValue(
      makeCompany({ status: 'verified', tokenId: 3, mintTransactionHash: '0xprev' })
    );

    const res = mockRes();
    await mintCompanyBadgeAdmin(mockReq({ params: { id: 'company-1' } }), res, jest.fn());

    expect(issueBadge).not.toHaveBeenCalled();
    expect(jsonPayload(res).data.alreadyMinted).toBe(true);
  });

  test('retries the real mint for a verified company whose badge failed earlier', async () => {
    const company = makeCompany({ status: 'verified' });
    Company.findById.mockResolvedValue(company);
    issueBadge.mockResolvedValue({
      verificationDate: new Date(),
      verificationHash: '0xhash',
      tokenURI: 'ipfs://metadata',
      tokenId: 12,
      transactionHash: '0xretry'
    });

    const res = mockRes();
    await mintCompanyBadgeAdmin(mockReq({ params: { id: 'company-1' } }), res, jest.fn());

    expect(issueBadge).toHaveBeenCalledWith(company, { demo: false });
    expect(company.tokenId).toBe(12);
    expect(company.mintTransactionHash).toBe('0xretry');
    expect(jsonPayload(res).data.badge.tokenId).toBe(12);
  });
});

describe('rejectCompany', () => {
  test('marks the company rejected WITHOUT deleting the record', async () => {
    const company = makeCompany({ status: 'pending' });
    Company.findById.mockResolvedValue(company);

    const res = mockRes();
    await rejectCompany(
      mockReq({ params: { id: 'company-1' }, body: { reason: 'Evidence insufficient' } }),
      res,
      jest.fn()
    );

    expect(company.status).toBe('rejected');
    expect(company.rejectionReason).toBe('Evidence insufficient');
    expect(company.save).toHaveBeenCalled();
    expect(Company.findByIdAndDelete).not.toHaveBeenCalled();
  });
});