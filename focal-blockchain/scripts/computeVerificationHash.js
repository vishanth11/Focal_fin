/**
 * FOCAL Verification Hash Calculator
 *
 * Computes a deterministic, reproducible verification hash for a company.
 * The hash is derived from public inputs using keccak256.
 *
 * Inputs:
 *   - company name
 *   - domain
 *   - verification date
 *   - a public FOCAL issuer constant
 *
 * Usage:
 *   node scripts/computeVerificationHash.js "TechNova Pvt Ltd" "technova.com" "2025-01-15"
 */

const { ethers } = require("ethers");

const FOCAL_ISSUER_CONSTANT = "FOCAL_TRUST_PLATFORM_v1";

function computeVerificationHash(companyName, domain, verificationDate) {
  const encoded = ethers.solidityPacked(
    ["string", "string", "string", "string"],
    [companyName, domain, verificationDate, FOCAL_ISSUER_CONSTANT]
  );
  return ethers.keccak256(encoded);
}

function main() {
  const args = process.argv.slice(2);
  const companyName = args[0] || "TechNova Pvt Ltd";
  const domain = args[1] || "technova.com";
  const verificationDate = args[2] || "2025-01-15";

  const hash = computeVerificationHash(companyName, domain, verificationDate);
  console.log(hash);
}

main();

module.exports = { computeVerificationHash, FOCAL_ISSUER_CONSTANT };
