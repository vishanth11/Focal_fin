const dotenv = require('dotenv');

dotenv.config();

const required = ['MONGODB_URI', 'JWT_SECRET'];

function readEnv() {
  const env = {
    port: Number(process.env.PORT || 5000),
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodbUri: process.env.MONGODB_URI,
    rpcUrl: process.env.RPC_URL || 'https://rpc-amoy.polygon.technology',
    contractAddress: process.env.CONTRACT_ADDRESS || '0x9124A20aE4a715Fcee6056bf1F5f95E4358647C6',
    adminPrivateKey: process.env.ADMIN_PRIVATE_KEY,
    adminWalletAddress: process.env.ADMIN_WALLET_ADDRESS,
    pinataJwt: process.env.PINATA_JWT,
    pinataApiKey: process.env.PINATA_API_KEY,
    pinataSecretApiKey: process.env.PINATA_SECRET_API_KEY,
    badgeImagePath: process.env.BADGE_IMAGE_PATH,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '7d',
    // Deliberately NOT in the `required` list above: the app must start with no
    // .env change at all, and falls back to the admin secret. Setting
    // STUDENT_JWT_SECRET upgrades student auth to full secret separation.
    studentJwtSecret: process.env.STUDENT_JWT_SECRET || process.env.JWT_SECRET,
    adminEmail: process.env.ADMIN_EMAIL || 'admin@focal.network',
    adminPassword: process.env.ADMIN_PASSWORD,
    // Base URL of the ML service (the caller appends /predict and /health)
    mlApiUrl: process.env.ML_API_URL || 'http://localhost:8000',
    phishTankApiKey: process.env.PHISHTANK_API_KEY,
    googleSafeBrowsingApiKey: process.env.GOOGLE_SAFE_BROWSING_API_KEY,
    whoisApiKey: process.env.WHOIS_API_KEY,
    // DEMO MODE (fail-closed): only the literal string 'true' enables the
    // demo company onboarding — demo verification and the wallet-signed demo
    // badge mint. Unset or any other value keeps the production pipeline:
    // register -> pending -> admin review -> approval -> admin mint.
    demoVerificationMode: process.env.DEMO_VERIFICATION_MODE === 'true'
  };

  const missing = required.filter((key) => !process.env[key]);
  if (missing.length && process.env.NODE_ENV !== 'test') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (!env.adminPassword && process.env.NODE_ENV !== 'test') {
    throw new Error('Missing required environment variable: ADMIN_PASSWORD');
  }

  return env;
}

module.exports = readEnv();
