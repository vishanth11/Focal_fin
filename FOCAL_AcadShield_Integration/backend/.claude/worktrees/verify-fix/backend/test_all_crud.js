const request = require('supertest');
const mongoose = require('mongoose');
const app = require('./src/app');
const env = require('./src/config/env');
const connectDB = require('./src/config/db');

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE CRUD & PERSISTENCE TESTS ---');
  await connectDB();

  // 1. Health check
  console.log('\n[1] Testing Health Endpoint:');
  const healthRes = await request(app).get('/health');
  console.log('Status:', healthRes.status, 'Message:', healthRes.body.message);
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // 2. Admin Login to get token for protected routes
  console.log('\n[2] Testing Admin Login:');
  const loginRes = await request(app)
    .post('/api/admin/login')
    .send({ email: env.adminEmail, password: env.adminPassword });
  console.log('Login Status:', loginRes.status, 'Has Token:', Boolean(loginRes.body.data?.token));
  if (!loginRes.body.data?.token) throw new Error('Admin login failed');
  const adminToken = loginRes.body.data.token;

  // 3. COMPANY CRUD
  console.log('\n[3] Testing Company CRUD Operations:');
  
  // 3a. CREATE Company
  const newCompanyData = {
    name: 'Apex Robotics Ltd',
    website: 'https://apexrobotics.ai',
    email: 'contact@apexrobotics.ai',
    phone: '+91-9988776655',
    walletAddress: '0x9999999999999999999999999999999999999999'
  };
  const createCompRes = await request(app).post('/api/companies/register').send(newCompanyData);
  console.log('CREATE Company Status:', createCompRes.status, 'Created ID:', createCompRes.body.data?._id);
  if (createCompRes.status !== 201) throw new Error('Create company failed: ' + JSON.stringify(createCompRes.body));
  const companyId = createCompRes.body.data._id;

  // 3b. READ Companies List & Search
  const listCompRes = await request(app).get('/api/companies?search=Apex');
  console.log('READ Companies List Status:', listCompRes.status, 'Total Found:', listCompRes.body.count);
  if (listCompRes.body.count < 1) throw new Error('Company search failed');

  // 3c. READ Single Company by ID
  const getCompRes = await request(app).get(`/api/companies/${companyId}`);
  console.log('READ Single Company Status:', getCompRes.status, 'Name:', getCompRes.body.data?.name);
  if (getCompRes.body.data?.name !== 'Apex Robotics Ltd') throw new Error('Get company by ID failed');

  // 3d. Check Company by Domain
  const checkDomainRes = await request(app).get('/api/companies/check?domain=apexrobotics.ai');
  console.log('CHECK Company Domain Status:', checkDomainRes.status, 'Found:', checkDomainRes.body.data?.found);

  // 3e. UPDATE Company (PATCH)
  const updateCompRes = await request(app)
    .patch(`/api/companies/${companyId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ phone: '+91-1122334455', address: 'Bangalore Tech Park' });
  console.log('UPDATE Company Status:', updateCompRes.status, 'Updated Phone:', updateCompRes.body.data?.phone);
  if (updateCompRes.body.data?.phone !== '+91-1122334455') throw new Error('Update company failed');

  // 3f. DELETE Company
  const delCompRes = await request(app)
    .delete(`/api/companies/${companyId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  console.log('DELETE Company Status:', delCompRes.status, 'Message:', delCompRes.body.message);
  if (delCompRes.status !== 200) throw new Error('Delete company failed');

  // 4. REPORT CRUD
  console.log('\n[4] Testing Report CRUD Operations:');

  // 4a. CREATE Report
  const createReportRes = await request(app)
    .post('/api/reports')
    .send({
      companyName: 'Suspicious Job Agency',
      reporterEmail: 'victim@example.com',
      reporterName: 'John Doe',
      description: 'Demanded 5000 INR upfront fee for a fake internship offer letter.',
      evidenceUrl: 'https://example.com/fake-letter.png'
    });
  console.log('CREATE Report Status:', createReportRes.status, 'Report ID:', createReportRes.body.data?._id);
  if (createReportRes.status !== 201) throw new Error('Create report failed');
  const reportId = createReportRes.body.data._id;

  // 4b. READ Reports List
  const listReportsRes = await request(app).get('/api/reports?search=Suspicious');
  console.log('READ Reports List Status:', listReportsRes.status, 'Found:', listReportsRes.body.count);

  // 4c. READ Single Report
  const getReportRes = await request(app).get(`/api/reports/${reportId}`);
  console.log('READ Single Report Status:', getReportRes.status, 'Company:', getReportRes.body.data?.companyName);

  // 4d. UPDATE Report (PATCH)
  const updateReportRes = await request(app)
    .patch(`/api/reports/${reportId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'reviewed', reviewNote: 'Confirmed fee demand from evidence screenshot.' });
  console.log('UPDATE Report Status:', updateReportRes.status, 'New Status:', updateReportRes.body.data?.status);
  if (updateReportRes.body.data?.status !== 'reviewed') throw new Error('Update report failed');

  // 4e. DELETE Report
  const delReportRes = await request(app)
    .delete(`/api/reports/${reportId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  console.log('DELETE Report Status:', delReportRes.status, 'Message:', delReportRes.body.message);
  if (delReportRes.status !== 200) throw new Error('Delete report failed');

  // 5. CHECK / INPUT SCAM CHECK CRUD
  console.log('\n[5] Testing Opportunity Check CRUD & Input Persistence:');

  // 5a. CREATE Check (stores user input + scam analysis)
  const createCheckRes = await request(app)
    .post('/api/check')
    .send({
      input: 'urgent-internship-fee.top/apply',
      notes: 'Job link received via unsolicited WhatsApp message'
    });
  console.log(
    'CREATE Check Status:',
    createCheckRes.status,
    'Check ID:',
    createCheckRes.body.data?.check?._id,
    'Input Type:',
    createCheckRes.body.data?.check?.inputType,
    'Risk Score:',
    createCheckRes.body.data?.check?.riskScore,
    'Red Flags:',
    createCheckRes.body.data?.check?.redFlags
  );
  if (createCheckRes.status !== 201) throw new Error('Create check failed');
  const checkId = createCheckRes.body.data.check._id;

  // 5b. READ Check History
  const historyRes = await request(app).get('/api/check/history?limit=5');
  console.log('READ Check History Status:', historyRes.status, 'History Count:', historyRes.body.count);

  // 5c. READ Single Check
  const getCheckRes = await request(app).get(`/api/check/${checkId}`);
  console.log('READ Single Check Status:', getCheckRes.status, 'Input:', getCheckRes.body.data?.input);
  if (getCheckRes.body.data?.input !== 'urgent-internship-fee.top/apply') throw new Error('Get check by ID failed');

  // 5d. UPDATE Check (PATCH)
  const updateCheckRes = await request(app)
    .patch(`/api/check/${checkId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ notes: 'Verified as malicious phishing domain by admin', riskScore: 99, result: 'suspicious' });
  console.log('UPDATE Check Status:', updateCheckRes.status, 'Updated Score:', updateCheckRes.body.data?.riskScore);
  if (updateCheckRes.body.data?.riskScore !== 99) throw new Error('Update check failed');

  // 5e. DELETE Check
  const delCheckRes = await request(app)
    .delete(`/api/check/${checkId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  console.log('DELETE Check Status:', delCheckRes.status, 'Message:', delCheckRes.body.message);
  if (delCheckRes.status !== 200) throw new Error('Delete check failed');

  // 6. Admin Stats
  console.log('\n[6] Testing Admin Stats:');
  const statsRes = await request(app)
    .get('/api/admin/stats')
    .set('Authorization', `Bearer ${adminToken}`);
  console.log('Admin Stats Status:', statsRes.status, 'Stats:', JSON.stringify(statsRes.body.data));

  console.log('\n>>> ALL CRUD & PERSISTENCE TESTS PASSED SUCCESSFULLY! <<<\n');
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(async (err) => {
  console.error('\nTEST FAILED:', err);
  await mongoose.disconnect();
  process.exit(1);
});
