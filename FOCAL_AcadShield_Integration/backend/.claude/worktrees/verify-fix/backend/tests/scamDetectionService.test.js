/**
 * Unit tests for the scamDetectionService — the backend↔ML integration layer.
 *
 * Verifies:
 * - Correct payload shape per input type (the original 422-mismatch bug)
 * - Correct mapping of the ML snake_case response to the backend contract
 * - Fail-safe behavior: when the ML service is down, the local rule-based
 *   fallback runs, the result is marked simulated: true, and the failure
 *   is logged
 * - ML health check outcomes
 */
jest.mock('axios');
jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const axios = require('axios');
const logger = require('../src/utils/logger');
const {
  analyzeOpportunity,
  callMLAPI,
  checkMLHealth,
  detectInputType
} = require('../src/services/scamDetectionService');

const SCAM_TEXT = 'Pay ₹2000 registration fee now! Limited time offer! WhatsApp us to join.';

const ML_RESPONSE = {
  risk_score: 82.5,
  risk_level: 'high',
  red_flags: [
    { flag: 'Payment Request', description: 'Asks for a registration fee', severity: 'high' },
    { flag: 'Informal Channel', description: 'Redirects to WhatsApp', severity: 'medium' }
  ],
  confidence: 0.91,
  explanation: 'Multiple scam indicators detected.'
};

describe('detectInputType', () => {
  test('classifies http(s) URLs as url', () => {
    expect(detectInputType('https://jobs.example.com/apply')).toBe('url');
  });

  test('classifies raw email headers as email', () => {
    expect(detectInputType('From: hr@fake.com\nSubject: Job offer!')).toBe('email');
  });

  test('classifies multiline text containing an address as email', () => {
    expect(detectInputType('Join our team!\ncontact: hr@fake.com')).toBe('email');
  });

  test('classifies plain job postings as job_posting', () => {
    expect(detectInputType(SCAM_TEXT)).toBe('job_posting');
  });

  test('does not treat a single-line address-only input as email', () => {
    expect(detectInputType('hr@fake.com')).toBe('job_posting');
  });
});

describe('callMLAPI', () => {
  beforeEach(() => {
    axios.post.mockReset();
    logger.warn.mockClear();
  });

  test('sends the correct payload per input type and maps the response', async () => {
    axios.post.mockResolvedValueOnce({ data: ML_RESPONSE });

    const result = await callMLAPI(SCAM_TEXT, 'job_posting');

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringMatching(/\/predict$/),
      { text: SCAM_TEXT, input_type: 'job_posting' },
      expect.objectContaining({ timeout: expect.any(Number) })
    );
    expect(result).toEqual({
      riskScore: 82.5,
      riskLevel: 'high',
      redFlags: [
        'Payment Request — Asks for a registration fee',
        'Informal Channel — Redirects to WhatsApp'
      ],
      confidence: 0.91,
      explanation: 'Multiple scam indicators detected.',
      simulated: false
    });
  });

  test('sends {url, input_type:"url"} for url inputs', async () => {
    axios.post.mockResolvedValueOnce({ data: { ...ML_RESPONSE, risk_score: 10, red_flags: [] } });

    await callMLAPI('http://shady-site.top', 'url');

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      { url: 'http://shady-site.top', input_type: 'url' },
      expect.any(Object)
    );
  });

  test('sends {email_content, input_type:"email"} for email inputs', async () => {
    axios.post.mockResolvedValueOnce({ data: { ...ML_RESPONSE, risk_score: 40, red_flags: [] } });

    await callMLAPI('From: hr@fake.com\nSubject: offer', 'email');

    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      { email_content: 'From: hr@fake.com\nSubject: offer', input_type: 'email' },
      expect.any(Object)
    );
  });

  test('falls back to rule-based analysis (simulated: true) and logs when the ML call fails', async () => {
    axios.post.mockRejectedValueOnce(new Error('connect ECONNREFUSED 127.0.0.1:8000'));

    const result = await callMLAPI(SCAM_TEXT, 'job_posting');

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('ML service call failed'),
      expect.objectContaining({ inputType: 'job_posting', error: expect.stringContaining('ECONNREFUSED') })
    );
    expect(result.simulated).toBe(true);
    expect(result.redFlags.length).toBeGreaterThan(0);
    expect(result.redFlags[0]).toMatch(/^Payment Request — /);
    expect(result.riskScore).toBeGreaterThan(0);
  });
});

describe('analyzeOpportunity', () => {
  beforeEach(() => {
    axios.post.mockReset();
  });

  test('returns the mapped ML result with its detected input type', async () => {
    axios.post.mockResolvedValueOnce({ data: ML_RESPONSE });

    const result = await analyzeOpportunity(SCAM_TEXT);

    expect(result).toEqual({
      riskScore: 82.5,
      riskLevel: 'high',
      redFlags: expect.any(Array),
      confidence: 0.91,
      explanation: 'Multiple scam indicators detected.',
      simulated: false,
      inputType: 'job_posting'
    });
  });

  test('marks fallback results as simulated and never throws', async () => {
    axios.post.mockRejectedValueOnce(new Error('timeout of 5000ms exceeded'));

    const result = await analyzeOpportunity(SCAM_TEXT);

    expect(result.simulated).toBe(true);
    expect(result.inputType).toBe('job_posting');
    expect(Number.isFinite(result.riskScore)).toBe(true);
  });
});

describe('checkMLHealth', () => {
  beforeEach(() => {
    axios.get.mockReset();
    logger.warn.mockClear();
  });

  test('reports healthy with modelLoaded from the /health endpoint', async () => {
    axios.get.mockResolvedValueOnce({ data: { status: 'healthy', model_loaded: true, version: '1.0.0' } });

    const health = await checkMLHealth();

    expect(axios.get).toHaveBeenCalledWith(
      expect.stringMatching(/\/health$/),
      expect.objectContaining({ timeout: expect.any(Number) })
    );
    expect(health).toEqual({ healthy: true, modelLoaded: true });
  });

  test('reports unhealthy and logs when the ML service is unreachable', async () => {
    axios.get.mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

    const health = await checkMLHealth();

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('ML service health check failed'),
      expect.any(Object)
    );
    expect(health).toEqual({ healthy: false, modelLoaded: false });
  });
});