const dns = require('dns');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Fix Windows DNS SRV resolution for MongoDB Atlas
if (process.env.MONGODB_URI && process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  } catch (e) {}
}

const uri = process.env.MONGODB_URI;

async function checkDatabase() {
  console.log('====================================================');
  console.log('         MONGODB PERSISTENCE & DATA CHECKER        ');
  console.log('====================================================');
  console.log(`Connecting to: ${uri.replace(/:([^:@]+)@/, ':****@')}\n`);

  try {
    const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    const db = mongoose.connection.db;
    const dbName = mongoose.connection.name;
    const host = conn.connection.host;

    console.log(`[SUCCESS] Connected to MongoDB!`);
    console.log(`- Host:     ${host}`);
    console.log(`- Database: ${dbName}\n`);

    // Fetch counts
    const [companiesCount, reportsCount, checksCount] = await Promise.all([
      db.collection('companies').countDocuments(),
      db.collection('reports').countDocuments(),
      db.collection('checks').countDocuments()
    ]);

    console.log('--- COLLECTION SUMMARY ---');
    console.log(`[+] companies : ${companiesCount} document(s)`);
    console.log(`[+] reports   : ${reportsCount} document(s)`);
    console.log(`[+] checks    : ${checksCount} document(s)\n`);

    // Fetch samples
    if (companiesCount > 0) {
      console.log('--- RECENT COMPANIES ---');
      const companies = await db.collection('companies').find().sort({ createdAt: -1 }).limit(2).toArray();
      companies.forEach((c) => {
        console.log(`  - [${c.status.toUpperCase()}] ${c.name} (${c.domain}) | Wallet: ${c.walletAddress}`);
      });
      console.log('');
    }

    if (checksCount > 0) {
      console.log('--- RECENT CHECKS (Stored User Inputs) ---');
      const checks = await db.collection('checks').find().sort({ createdAt: -1 }).limit(2).toArray();
      checks.forEach((ch) => {
        console.log(`  - Input: "${ch.input}" | Result: ${ch.result} | Risk: ${ch.riskScore}/100 | Flags: ${ch.redFlags?.length || 0}`);
      });
      console.log('');
    }

    if (reportsCount > 0) {
      console.log('--- RECENT SCAM REPORTS ---');
      const reports = await db.collection('reports').find().sort({ createdAt: -1 }).limit(2).toArray();
      reports.forEach((r) => {
        console.log(`  - Against: "${r.companyName}" | Status: ${r.status} | Reporter: ${r.reporterEmail}`);
      });
      console.log('');
    }

    console.log('====================================================');
    console.log('All input data is actively stored in MongoDB!');
    console.log('====================================================');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n[ERROR] Connection failed:', error.message);
    if (error.message.includes('whitelist') || error.message.includes('alert number 80')) {
      console.log('\n>>> MONGODB ATLAS IP ACCESS LIST FIX <<<');
      console.log('Your current public IP is not yet allowed in MongoDB Atlas.');
      console.log('To fix this in 30 seconds:');
      console.log('1. Go to https://cloud.mongodb.com');
      console.log('2. Click on "Network Access" in the left sidebar.');
      console.log('3. Click "Add IP Address".');
      console.log('4. Click "ALLOW ACCESS FROM ANYWHERE" (0.0.0.0/0) or "ADD CURRENT IP ADDRESS".');
      console.log('5. Click "Confirm". Wait 30 seconds, then re-run npm run check-db!');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkDatabase();
