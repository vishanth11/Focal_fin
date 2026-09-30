export const demoCompanies = [
  {
    id: 'technova',
    name: 'TechNova Solutions Pvt Ltd',
    domain: 'technova.com',
    status: 'verified', // verified, suspicious, pending, revoked
    trustScore: 87,
    category: 'Enterprise Software & Cloud',
    registrationNumber: 'U74999MH2018PTC291842',
    taxId: '27AAACT1829F1Z5',
    email: 'contact@technova.com',
    phone: '+1 (800) 555-8921',
    address: '450 Tech Plaza, Suite 1200, San Francisco, CA',
    verifiedDate: '2024-11-12',
    blockchain: {
      verified: true,
      walletAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      tokenId: '10482',
      contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      txHash: '0x9a8f3b2e7c1d4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b',
      network: 'Polygon Mainnet'
    },
    digitalPresence: {
      websiteAge: '6 Years, 4 Months',
      sslValid: true,
      mxRecordsFound: true,
      linkedIn: 'https://linkedin.com/company/technova-solutions',
      dnssec: true
    },
    trustSignals: [
      'Corporate registration verified with regulatory registry',
      'Official domain matches primary business identity',
      'Valid SSL certificate issued by DigiCert',
      'MX records and enterprise mail server authenticated (SPF/DKIM/DMARC)',
      'Verified corporate LinkedIn presence with 1,200+ employees',
      'Zero active fraud or impersonation reports'
    ],
    riskSignals: [],
    verificationHistory: [
      { date: '2024-11-12', status: 'VERIFIED', details: 'Soulbound Trust Badge issued on-chain.' },
      { date: '2024-05-10', status: 'AUDITED', details: 'Annual identity and tax credential audit completed.' },
      { date: '2023-11-01', status: 'REGISTERED', details: 'Initial onboarding to FOCAL. trust network.' }
    ]
  },
  {
    id: 'companny-tech',
    name: 'Companny Cyber Trust (Impersonator)',
    domain: 'companny.com',
    officialDomain: 'company.com',
    status: 'suspicious',
    trustScore: 24,
    category: 'Financial Services / Lookalike Entity',
    registrationNumber: 'UNKNOWN / UNVERIFIED',
    taxId: 'NOT_FOUND',
    email: 'support@companny.com',
    phone: '+1 (888) 000-9921',
    address: 'Unverified PO Box, Offshore Jurisdiction',
    verifiedDate: null,
    blockchain: {
      verified: false,
      walletAddress: 'N/A',
      tokenId: 'N/A',
      contractAddress: 'N/A',
      txHash: 'N/A',
      network: 'None'
    },
    digitalPresence: {
      websiteAge: '7 Days Old',
      sslValid: true,
      mxRecordsFound: false,
      linkedIn: 'None',
      dnssec: false
    },
    trustSignals: [
      'Basic SSL encryption present'
    ],
    riskSignals: [
      {
        code: 'TYPOSQUATTING_DETECTED',
        severity: 'high',
        title: 'Typosquatting & Lookalike Domain',
        description: 'Domain "companny.com" contains an added "n" character imitating official entity "company.com".'
      },
      {
        code: 'RECENT_DOMAIN_REGISTRATION',
        severity: 'warning',
        title: 'Recently Created Domain',
        description: 'Domain was registered 7 days ago via an anonymous registrar.'
      },
      {
        code: 'SUSPICIOUS_PAYMENT_REQUEST',
        severity: 'high',
        title: 'Unusual Upfront Payment Requests',
        description: 'Multiple users reported requests for upfront processing fees via wire transfer.'
      },
      {
        code: 'IDENTITY_MISMATCH',
        severity: 'high',
        title: 'Corporate Identity Mismatch',
        description: 'Registration records do not match the claimed corporate brand.'
      }
    ],
    verificationHistory: [
      { date: '2026-09-18', status: 'FLAGGED', details: 'Typosquatting automated risk trigger activated.' },
      { date: '2026-09-19', status: 'HIGH_RISK', details: 'Flagged after 3 user scam reports.' }
    ]
  },
  {
    id: 'apex-cyber',
    name: 'Apex Cybernetics Inc',
    domain: 'apexcyber.io',
    status: 'verified',
    trustScore: 94,
    category: 'Cybersecurity & Defense',
    registrationNumber: 'DE-892104-INC',
    taxId: '54-0912839',
    email: 'security@apexcyber.io',
    phone: '+1 (415) 890-1200',
    address: '100 Cyber Way, San Jose, CA',
    verifiedDate: '2024-08-01',
    blockchain: {
      verified: true,
      walletAddress: '0x34aD890aB1234567890abcdef1234567890abcde',
      tokenId: '10921',
      contractAddress: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      txHash: '0x1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
      network: 'Polygon Mainnet'
    },
    digitalPresence: {
      websiteAge: '4 Years, 2 Months',
      sslValid: true,
      mxRecordsFound: true,
      linkedIn: 'https://linkedin.com/company/apex-cybernetics',
      dnssec: true
    },
    trustSignals: [
      'Multi-factor identity verification confirmed',
      'Official SOC2 Type II compliance audit passed',
      'Soulbound ERC-721 token badge issued on Polygon',
      '100% verified corporate communication channels'
    ],
    riskSignals: [],
    verificationHistory: [
      { date: '2024-08-01', status: 'VERIFIED', details: 'Passed SOC2 & identity verification check.' }
    ]
  },
  {
    id: 'quick-hire',
    name: 'QuickHire Global Ltd',
    domain: 'quickhire-jobs.xyz',
    status: 'suspicious',
    trustScore: 38,
    category: 'Recruitment & Staffing',
    registrationNumber: 'UNVERIFIED',
    taxId: 'NOT_PROVIDED',
    email: 'hr-quickhire@gmail.com',
    phone: '+91 98765 43210',
    address: 'Virtual Shared Office',
    verifiedDate: null,
    blockchain: { verified: false },
    digitalPresence: {
      websiteAge: '4 Days Old',
      sslValid: true,
      mxRecordsFound: false,
      linkedIn: 'None'
    },
    trustSignals: ['SSL Certificate Active'],
    riskSignals: [
      {
        code: 'FREE_EMAIL_DOMAIN',
        severity: 'warning',
        title: 'Free Email Domain Usage',
        description: 'Official recruiter uses @gmail.com instead of verified corporate domain.'
      },
      {
        code: 'NEW_DOMAIN',
        severity: 'high',
        title: 'Domain Registered 4 Days Ago',
        description: 'Extremely new domain creation correlates with short-lived scam campaigns.'
      }
    ],
    verificationHistory: [
      { date: '2026-09-17', status: 'SUSPICIOUS', details: 'Flagged for free email domain and zero identity credentials.' }
    ]
  },
  {
    id: 'hyperion-labs',
    name: 'Hyperion AI Labs',
    domain: 'hyperionlabs.ai',
    status: 'pending',
    trustScore: 68,
    category: 'Artificial Intelligence',
    registrationNumber: 'CA-901824-LLC',
    taxId: '88-1290384',
    email: 'admin@hyperionlabs.ai',
    phone: '+1 (650) 412-9000',
    address: '700 Palo Alto Ave, Palo Alto, CA',
    verifiedDate: null,
    blockchain: { verified: false },
    digitalPresence: {
      websiteAge: '1 Year, 1 Month',
      sslValid: true,
      mxRecordsFound: true,
      linkedIn: 'https://linkedin.com/company/hyperion-labs'
    },
    trustSignals: [
      'Domain registration matches corporate identity',
      'Active LinkedIn corporate profile'
    ],
    riskSignals: [
      {
        code: 'PENDING_DOCUMENTATION',
        severity: 'warning',
        title: 'Tax & Identity Documents Under Review',
        description: 'Final corporate tax verification documentation pending administrator review.'
      }
    ],
    verificationHistory: [
      { date: '2026-09-15', status: 'PENDING', details: 'Verification request submitted by company.' }
    ]
  }
];

export const demoTyposquattingExamples = [
  {
    officialDomain: 'company.com',
    officialName: 'Verified Global Corp',
    suspiciousDomain: 'companny.com',
    suspiciousName: 'Companny Cyber Trust',
    diffIndices: [4], // index of extra 'n'
    riskLevel: 'HIGH_RISK',
    detectedPattern: 'Double character insertion (n)',
    explanation: 'The domain "companny.com" inserts a second "n" to spoof "company.com" and mislead partners into trusting fraudulent requests.'
  },
  {
    officialDomain: 'technova.com',
    officialName: 'TechNova Solutions Pvt Ltd',
    suspiciousDomain: 'tech-nova-verify.xyz',
    suspiciousName: 'TechNova Verification Portal (Fake)',
    diffIndices: [4, 9, 10, 11, 12, 13, 14],
    riskLevel: 'HIGH_RISK',
    detectedPattern: 'Keyword inflation & suspicious TLD (.xyz)',
    explanation: 'Uses brand name with hyphenation and ".xyz" TLD to mimic official verification endpoints.'
  }
];

export const demoConnections = [
  {
    id: 'conn-1',
    companyA: 'TechNova Solutions Pvt Ltd',
    domainA: 'technova.com',
    companyB: 'Apex Cybernetics Inc',
    domainB: 'apexcyber.io',
    trustScore: 91,
    status: 'ACTIVE_MONITORED',
    establishedDate: '2025-01-10',
    checksPassed: [
      'Identity Verified',
      'Domain Match Verified',
      'Risk Score > 85',
      'Encrypted Communication Channel Established',
      'Continuous Signal Monitoring Active'
    ]
  },
  {
    id: 'conn-2',
    companyA: 'TechNova Solutions Pvt Ltd',
    domainA: 'technova.com',
    companyB: 'Hyperion AI Labs',
    domainB: 'hyperionlabs.ai',
    trustScore: 68,
    status: 'PENDING_MEDIATION',
    establishedDate: '2026-09-18',
    checksPassed: [
      'Identity Verified',
      'Domain Match Verified',
      'Pending Risk Clearance'
    ]
  }
];

export const demoReports = [
  {
    id: 'rep-101',
    companyName: 'Companny Cyber Trust',
    domain: 'companny.com',
    reporterName: 'Alex Mercer (CISO, DataCorp)',
    reporterEmail: 'alex.m@datacorp.io',
    category: 'Typosquatting',
    description: 'Received invoice request from companny.com claiming to be our verified vendor company.com.',
    evidenceUrl: 'https://evidence.focal.network/cases/101.pdf',
    date: '2026-09-18 14:32:00',
    status: 'REVIEWED_FLAGGED'
  },
  {
    id: 'rep-102',
    companyName: 'QuickHire Global Ltd',
    domain: 'quickhire-jobs.xyz',
    reporterName: 'Sarah Jenkins',
    reporterEmail: 'sarah.j@gmail.com',
    category: 'Fake job/internship',
    description: 'Asked for ₹2,500 security deposit for internship offer letter. Email sent from @gmail.com address.',
    evidenceUrl: 'https://evidence.focal.network/cases/102.png',
    date: '2026-09-19 09:15:22',
    status: 'PENDING_REVIEW'
  }
];

export const demoAdminStats = {
  totalChecked: 12480,
  totalVerified: 8940,
  risksDetected: 1240,
  coveragePercent: 96,
  pendingReviews: 14,
  reportsCount: 38
};

export const demoActivityFeed = [
  { time: '15:28:02', text: 'VERIFICATION_CHECK: technova.com — SCORE: 87 (LOW RISK)', type: 'success' },
  { time: '15:27:44', text: 'TYPOSQUAT_FLAG: companny.com vs company.com MATCHED (HIGH RISK)', type: 'danger' },
  { time: '15:26:10', text: 'BLOCKCHAIN_BADGE: Token #10921 verified on Polygon Mainnet', type: 'info' },
  { time: '15:24:05', text: 'REPORT_RECEIVED: Case #102 filed against quickhire-jobs.xyz', type: 'warning' },
  { time: '15:20:19', text: 'CONNECTION_REQUEST: TechNova Solutions ➔ Hyperion AI Labs', type: 'info' }
];
