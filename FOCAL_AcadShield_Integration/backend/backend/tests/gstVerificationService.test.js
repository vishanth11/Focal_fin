process.env.NODE_ENV = 'test';
process.env.ML_API_URL = 'http://localhost:8000';

jest.mock('axios', () => ({ post: jest.fn() }));

const axios = require('axios');
const { verifyGST } = require('../src/services/gstVerificationService');

describe('GST verification service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('maps a verified GST response into company evidence', async () => {
    axios.post.mockResolvedValue({
      data: {
        verified: true,
        legal_name: 'TechNova Private Limited',
        trade_name: 'TechNova',
        registration_status: 'Active',
        source: 'mock_api',
        format_valid: true,
        risk_score: 0,
        risk_level: 'low',
        red_flags: [],
        explanation: 'verified'
      }
    });

    const result = await verifyGST({ gstin: '27ABCDE1234F1Z5', name: 'TechNova Pvt Ltd' });

    expect(result.status).toBe('verified');
    expect(result.legalName).toBe('TechNova Private Limited');
    expect(result.reference).toBe('mock_api');
  });

  test('rejects malformed GSTIN without calling the service', async () => {
    const result = await verifyGST({ gstin: 'INVALID', name: 'TechNova Pvt Ltd' });

    expect(result.status).toBe('failed');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('reports service failures as unavailable evidence', async () => {
    axios.post.mockRejectedValue(new Error('timeout'));

    const result = await verifyGST({ gstin: '27ABCDE1234F1Z5', name: 'TechNova Pvt Ltd' });

    expect(result.status).toBe('unavailable');
    expect(result.reference).toBe('ml-service-unavailable');
  });
});