const { verifyCompany } = require('../src/services/verificationService');

const baseCompany = {
  name: 'TechNova Pvt Ltd',
  domain: 'technova.com',
  email: 'hr@technova.com',
  website: 'https://technova.com',
  registrationNumber: 'TN-TECH-2020-4455',
  linkedinUrl: 'https://www.linkedin.com/company/technova',
  gstin: '27ABCDE1234F1Z5'
};

test('uses verified GST evidence without making it the OMEN decision', async () => {
  const result = await verifyCompany({ ...baseCompany, gstVerificationStatus: 'verified' });

  expect(result.gstVerificationStatus).toBe('verified');
  expect(result.checks).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: 'GST verification evidence', passed: true })
  ]));
  expect(result.recommendation).toBe('approve');
});

test('failed GST evidence reduces the company verification recommendation', async () => {
  const result = await verifyCompany({ ...baseCompany, gstVerificationStatus: 'failed' });

  expect(result.gstVerificationStatus).toBe('failed');
  expect(result.redFlags).toContain('GST verification failed');
  expect(result.recommendation).not.toBe('approve');
});