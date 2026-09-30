/**
 * FOCAL Update Badge URI
 *
 * Calls updateBadgeURI(tokenId, newURI) on the already-deployed FocalCompanyBadge
 * contract on Polygon Amoy. Uses the private key and RPC URL from .env.
 *
 * Required .env variables:
 *   PRIVATE_KEY
 *   AMOY_RPC_URL
 *   CONTRACT_ADDRESS
 *   TOKEN_ID - token ID to update (default 0)
 *
 * Optional:
 *   TOKEN_URI - metadata URI to set (overrides .tokenuri file)
 *
 * Run:
 *   npx hardhat run scripts/updateBadgeURI.js --network amoy
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS not set in .env");
  }

  const tokenId = process.env.TOKEN_ID ? parseInt(process.env.TOKEN_ID, 10) : 0;

  let tokenURI = process.env.TOKEN_URI;

  if (!tokenURI) {
    const tokenUriFile = path.join(__dirname, "..", ".tokenuri");
    if (fs.existsSync(tokenUriFile)) {
      tokenURI = fs.readFileSync(tokenUriFile, "utf8").trim();
    }
  }

  if (!tokenURI) {
    throw new Error(
      "TOKEN_URI not set. Run scripts/uploadToPinata.js first to generate .tokenuri, or set TOKEN_URI in .env."
    );
  }

  const [admin] = await hre.ethers.getSigners();
  const badge = await hre.ethers.getContractAt("FocalCompanyBadge", contractAddress, admin);

  console.log("Updating Token ID", tokenId, "URI to:", tokenURI);
  console.log("Contract:", contractAddress);
  console.log("Admin:", admin.address);

  const tx = await badge.updateBadgeURI(tokenId, tokenURI);
  const receipt = await tx.wait();

  console.log("Transaction hash:", receipt.hash);
  console.log("Token URI updated successfully.");

  // Verify on-chain state.
  const company = await badge.ownerOf(tokenId);
  console.log("On-chain verification:");
  console.log("  ownerOf(" + tokenId + "):", company);
  console.log("  tokenURI(" + tokenId + "):", await badge.tokenURI(tokenId));
  console.log("  balanceOf(company):", (await badge.balanceOf(company)).toString());
  console.log("  hasValidBadge(company):", await badge.hasValidBadge(company));
  console.log("  getBadgeId(company):", (await badge.getBadgeId(company)).toString());
  console.log("  getCompanyByTokenId(" + tokenId + "):", await badge.getCompanyByTokenId(tokenId));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
