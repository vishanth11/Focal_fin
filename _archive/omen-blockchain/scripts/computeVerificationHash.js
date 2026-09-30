/**
 * OMEN Verification Hash Calculator
 *
 * Computes a deterministic, reproducible verification hash for a company.
 * The hash is NOT invented; it is derived from public inputs using keccak256.
 *
 * Inputs:
 *   - company name
 *   - domain
 *   - verification date
 *   - a public OMEN issuer constant
 *
 * This lets anyone reproduce the same hash from the badge metadata attributes.
 *
 * Usage:
 *   node scripts/computeVerificationHash.js "TechNova Pvt Ltd" "technova.com" "2025-01-15"
 */

const { ethers } = require("ethers");

const OMEN_ISSUER_CONSTANT = "OMEN_TRUST_PLATFORM_v1";

function computeVerificationHash(companyName, domain, verificationDate) {
  const encoded = ethers.solidityPacked(
    ["string", "string", "string", "string"],
    [companyName, domain, verificationDate, OMEN_ISSUER_CONSTANT]
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

module.exports = { computeVerificationHash, OMEN_ISSUER_CONSTANT };
