/**
 * OMEN Update Badge URI
 *
 * Calls updateBadgeURI(0, newURI) on the already-deployed OmenCompanyBadge
 * contract on Polygon Amoy. Uses the private key and RPC URL from .env.
 *
 * Required .env variables:
 *   PRIVATE_KEY
 *   AMOY_RPC_URL
 *   CONTRACT_ADDRESS
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
  const badge = await hre.ethers.getContractAt("OmenCompanyBadge", contractAddress, admin);

  console.log("Updating Token ID 0 URI to:", tokenURI);
  console.log("Contract:", contractAddress);
  console.log("Admin:", admin.address);

  const tx = await badge.updateBadgeURI(0, tokenURI);
  const receipt = await tx.wait();

  console.log("Transaction hash:", receipt.hash);
  console.log("Token URI updated successfully.");

  // Verify on-chain state.
  const company = "0x538473b1b4c65FDB185AacEc4c00Cf505FA134Ed";
  console.log("On-chain verification:");
  console.log("  ownerOf(0):", await badge.ownerOf(0));
  console.log("  tokenURI(0):", await badge.tokenURI(0));
  console.log("  balanceOf(company):", (await badge.balanceOf(company)).toString());
  console.log("  hasValidBadge(company):", await badge.hasValidBadge(company));
  console.log("  getBadgeId(company):", (await badge.getBadgeId(company)).toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
