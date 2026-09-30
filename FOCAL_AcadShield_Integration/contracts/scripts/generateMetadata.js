/**
 * FOCAL Badge Metadata Generator
 *
 * Generates verified and revoked JSON metadata files for company badges.
 *
 * Usage:
 *   node scripts/generateMetadata.js "TechNova Pvt Ltd" "technova.com" "2025-01-15"
 *
 * The verification hash is computed deterministically from public inputs.
 * To override, pass a hash as the fourth argument:
 *   node scripts/generateMetadata.js "TechNova Pvt Ltd" "technova.com" "2025-01-15" "0x..."
 *
 * Upload instructions:
 * 1. Upload badge images to Pinata or NFT.Storage.
 * 2. Set GREEN_BADGE_IMAGE_CID / RED_BADGE_IMAGE_CID in .env
 *    OR replace the placeholders below.
 * 3. Upload the generated metadata/ JSON files to IPFS.
 * 4. Use the resulting IPFS URI as the tokenURI when calling mintBadge().
 */

const fs = require("fs");
const path = require("path");
const { computeVerificationHash } = require("./computeVerificationHash");

const METADATA_DIR = path.join(__dirname, "..", "metadata");

// Read image CIDs from environment, or fall back to placeholders.
const GREEN_BADGE_IMAGE = process.env.GREEN_BADGE_IMAGE_CID
  ? `ipfs://${process.env.GREEN_BADGE_IMAGE_CID}`
  : "ipfs://QmYourGreenBadgeImageHash/green-badge.png";
const RED_BADGE_IMAGE = process.env.RED_BADGE_IMAGE_CID
  ? `ipfs://${process.env.RED_BADGE_IMAGE_CID}`
  : "ipfs://QmYourRedBadgeImageHash/red-badge.png";

function buildMetadata(companyName, domain, verificationDate, verificationHash, status, image) {
  return {
    name: `FOCAL Verified Company: ${companyName}`,
    description: `This soulbound NFT certifies that ${companyName} has been verified by FOCAL as a legitimate company.`,
    image,
    attributes: [
      { trait_type: "Company Name", value: companyName },
      { trait_type: "Domain", value: domain },
      { trait_type: "Verification Date", value: verificationDate },
      { trait_type: "Verification Hash", value: verificationHash },
      { trait_type: "Status", value: status },
    ],
  };
}

function saveMetadata(filename, metadata) {
  if (!fs.existsSync(METADATA_DIR)) {
    fs.mkdirSync(METADATA_DIR, { recursive: true });
  }

  const filePath = path.join(METADATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(metadata, null, 2));
  console.log("Created:", filePath);
}

function main() {
  const args = process.argv.slice(2);

  const companyName = args[0] || "TechNova Pvt Ltd";
  const domain = args[1] || "technova.com";
  const verificationDate = args[2] || new Date().toISOString().split("T")[0];
  const verificationHash = args[3] || computeVerificationHash(companyName, domain, verificationDate);

  const verified = buildMetadata(companyName, domain, verificationDate, verificationHash, "verified", GREEN_BADGE_IMAGE);
  const revoked = buildMetadata(companyName, domain, verificationDate, verificationHash, "revoked", RED_BADGE_IMAGE);

  const safeName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");

  saveMetadata(`${safeName}-verified.json`, verified);
  saveMetadata(`${safeName}-revoked.json`, revoked);

  console.log("Verification hash:", verificationHash);
  console.log("Done. Upload the JSON files and images to IPFS before minting.");
}

main();
