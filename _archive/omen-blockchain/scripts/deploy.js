/**
 * OMEN Company Badge Deployment Script
 *
 * Environment setup:
 * 1. Copy .env.example to .env
 * 2. Set PRIVATE_KEY (with 0x prefix)
 * 3. Set SEPOLIA_RPC_URL or MUMBAI_RPC_URL (or AMOY_RPC_URL)
 * 4. Set ETHERSCAN_API_KEY and/or POLYGONSCAN_API_KEY for verification
 *
 * Run:
 *   npx hardhat run scripts/deploy.js --network sepolia
 *   npx hardhat run scripts/deploy.js --network mumbai
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying OMEN Company Badge with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH/MATIC");

  // Deploy the badge contract. The deployer becomes the initial owner.
  // In production, replace deployer.address with a multi-sig wallet address.
  const OmenCompanyBadge = await hre.ethers.getContractFactory("OmenCompanyBadge");
  const badge = await OmenCompanyBadge.deploy(deployer.address);
  await badge.waitForDeployment();

  const contractAddress = await badge.getAddress();
  console.log("OmenCompanyBadge deployed to:", contractAddress);
  console.log("Transaction hash:", badge.deploymentTransaction().hash);

  // Optional: mint a test badge if TEST_COMPANY_ADDRESS is configured.
  const testCompany = process.env.TEST_COMPANY_ADDRESS;
  const testTokenUri = process.env.TEST_TOKEN_URI;

  if (testCompany && testTokenUri && testCompany !== "0x0000000000000000000000000000000000000000") {
    const mintTx = await badge.mintBadge(testCompany, testTokenUri);
    await mintTx.wait();
    console.log("Test badge minted to:", testCompany);
  }

  // Verify on block explorer if an API key is available and not on a local network.
  const networkName = hre.network.name;
  if (networkName !== "hardhat" && networkName !== "localhost") {
    try {
      console.log("Waiting for block explorer indexing before verifying...");
      await sleep(60000); // 60 seconds; explorers may need a few blocks to index.

      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [deployer.address],
      });
      console.log("Contract verified on explorer.");
    } catch (error) {
      console.warn("Verification failed (this is non-fatal):", error.message);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
