/**
 * Standalone helper to mint a badge after deployment.
 *
 * Required .env variables:
 *   CONTRACT_ADDRESS - deployed OmenCompanyBadge address
 *   TEST_COMPANY_ADDRESS - recipient company address
 *   TEST_TOKEN_URI - IPFS metadata URI
 *
 * Run:
 *   npx hardhat run scripts/mintBadge.js --network mumbai
 */

const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS;
  const companyAddress = process.env.TEST_COMPANY_ADDRESS;
  const tokenURI = process.env.TEST_TOKEN_URI;

  if (!contractAddress || !companyAddress || !tokenURI) {
    console.error("Please set CONTRACT_ADDRESS, TEST_COMPANY_ADDRESS, and TEST_TOKEN_URI in .env");
    process.exit(1);
  }

  const [admin] = await hre.ethers.getSigners();
  const badge = await hre.ethers.getContractAt("OmenCompanyBadge", contractAddress, admin);

  const tx = await badge.mintBadge(companyAddress, tokenURI);
  await tx.wait();

  console.log("Minted badge to:", companyAddress);
  console.log("Token ID:", await badge.getBadgeId(companyAddress));
  console.log("Transaction hash:", tx.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
