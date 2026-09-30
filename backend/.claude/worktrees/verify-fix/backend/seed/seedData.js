const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Company = require('../src/models/Company');
const Report = require('../src/models/Report');
const Check = require('../src/models/Check');
const { createVerificationHash } = require('../src/services/blockchainService');

dotenv.config();

// If using SRV connection string (Atlas), configure public DNS servers
if (process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (e) {}
}

const wallets = {
  technova: '0x1111111111111111111111111111111111111111',
  innovatelabs: '0x2222222222222222222222222222222222222222',
  fakejobs: '0x3333333333333333333333333333333333333333',
  quickhire: '0x4444444444444444444444444444444444444444'
};

function companyRecord(overrides) {
  const base = {
    taxId: 'GSTIN-DEMO-1234',
    phone: '+91-9876543210',
    address: 'Demo address, India'
  };
  return { ...base, ...overrides };
}

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is required to seed data');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  await Promise.all([Company.deleteMany({}), Report.deleteMany({}), Check.deleteMany({})]);


  const companies = await Company.insertMany([
    companyRecord({
      name: 'TechNova Pvt Ltd',
      domain: 'technova.com',
      registrationNumber: 'TN-TECH-2020-4455',
      email: 'hr@technova.com',
      website: 'https://technova.com',
      linkedinUrl: 'https://www.linkedin.com/company/technova',
      walletAddress: wallets.technova,
      status: 'verified',
      verificationDate: new Date(),
      tokenId: 1
    }),
    companyRecord({
      name: 'InnovateLabs',
      domain: 'innovatelabs.io',
      registrationNumber: 'KA-INNO-2019-8811',
      email: 'careers@innovatelabs.io',
      website: 'https://innovatelabs.io',
      linkedinUrl: 'https://www.linkedin.com/company/innovatelabs',
      walletAddress: wallets.innovatelabs,
      status: 'verified',
      verificationDate: new Date(),
      tokenId: 2
    }),
    companyRecord({
      name: 'FakeJobs India',
      domain: 'fakejobs-india.xyz',
      registrationNumber: 'XX-FAKE-0000',
      email: 'jobs@gmail.com',
      website: 'http://fakejobs-india.xyz',
      linkedinUrl: 'https://example.com/fakejobs',
      walletAddress: wallets.fakejobs,
      status: 'revoked',
      verificationDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      revocationDate: new Date(),
      revocationReason: 'Multiple accepted scam reports',
      tokenId: 3
    }),
    companyRecord({
      name: 'QuickHire Solutions',
      domain: 'quickhire-solutions.com',
      registrationNumber: 'DL-QUICK-2024-1001',
      email: 'verify@quickhire-solutions.com',
      website: 'https://quickhire-solutions.com',
      linkedinUrl: 'https://www.linkedin.com/company/quickhire-solutions',
      walletAddress: wallets.quickhire,
      status: 'pending'
    })
  ]);

  for (const company of companies) {
    if (company.status === 'verified' || company.status === 'revoked') {
      const verificationDate = company.verificationDate.toISOString().slice(0, 10);
      company.verificationHash = createVerificationHash(company.name, company.domain, verificationDate);
      company.tokenURI = null;
      await company.save();
    }
  }

  const fakeJobs = companies.find((company) => company.name === 'FakeJobs India');
  const technova = companies.find((company) => company.name === 'TechNova Pvt Ltd');

  await Report.create({
    companyId: fakeJobs._id,
    companyName: fakeJobs.name,
    reporterEmail: 'student@example.com',
    reporterName: 'Demo Student',
    evidenceUrl: 'https://example.com/evidence/fakejobs-registration-fee.png',
    description: 'Asked for Rs. 2000 registration fee before sharing the offer letter.',
    status: 'accepted',
    reviewedBy: 'focal-admin',
    reviewNote: 'Evidence matched known scam pattern.'
  });

  await Check.insertMany([
    {
      input: 'https://technova.com/careers',
      inputType: 'url',
      companyId: technova._id,
      isVerified: true,
      riskScore: 5,
      redFlags: [],
      result: 'verified'
    },
    {
      input: 'fakejobs-india.xyz',
      inputType: 'company_name',
      companyId: fakeJobs._id,
      isVerified: false,
      riskScore: 92,
      redFlags: ['Company badge has been revoked', 'Asked for registration fee'],
      result: 'revoked'
    },
    {
      input: 'unknown-hiring-work.top',
      inputType: 'company_name',
      isVerified: false,
      riskScore: 75,
      redFlags: ['No verified company record found', 'Suspicious domain extension'],
      result: 'suspicious'
    }
  ]);

  console.log('FOCAL demo data seeded successfully');
  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
