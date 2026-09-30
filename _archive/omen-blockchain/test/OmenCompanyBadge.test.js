const { expect } = require("chai");
const hre = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

/**
 * OmenCompanyBadge test suite.
 *
 * Covers:
 *  - Admin minting and access control
 *  - Soulbound transfer / approval restrictions
 *  - Badge revocation
 *  - Badge query functions
 *  - Event emissions
 */
describe("OmenCompanyBadge", function () {
  const VERIFIED_URI = "ipfs://QmVerifiedHash/metadata.json";
  const REVOKED_URI = "ipfs://QmRevokedHash/metadata.json";

  async function deployFixture() {
    const [admin, company, other] = await hre.ethers.getSigners();
    const OmenCompanyBadge = await hre.ethers.getContractFactory("OmenCompanyBadge");
    const badge = await OmenCompanyBadge.deploy(admin.address);
    await badge.waitForDeployment();

    return { badge, admin, company, other };
  }

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      const { badge, admin } = await loadFixture(deployFixture);
      expect(await badge.owner()).to.equal(admin.address);
    });

    it("has the correct name and symbol", async function () {
      const { badge } = await loadFixture(deployFixture);
      expect(await badge.name()).to.equal("OMEN Company Badge");
      expect(await badge.symbol()).to.equal("OMEN");
    });
  });

  describe("Minting", function () {
    it("allows admin to mint a badge", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await expect(badge.mintBadge(company.address, VERIFIED_URI))
        .to.emit(badge, "BadgeMinted")
        .withArgs(company.address, 0, VERIFIED_URI);
    });

    it("does not allow non-admin to mint a badge", async function () {
      const { badge, company, other } = await loadFixture(deployFixture);
      await expect(
        badge.connect(company).mintBadge(other.address, VERIFIED_URI)
      ).to.be.revertedWith("OmenBadge: caller is not the admin");
    });

    it("sets the token URI after minting", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);
      expect(await badge.tokenURI(0)).to.equal(VERIFIED_URI);
    });

    it("rejects empty token URI", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await expect(badge.mintBadge(company.address, "")).to.be.revertedWith("OmenBadge: tokenURI cannot be empty");
    });

    it("rejects minting to the zero address", async function () {
      const { badge } = await loadFixture(deployFixture);
      await expect(
        badge.mintBadge(hre.ethers.ZeroAddress, VERIFIED_URI)
      ).to.be.revertedWith("OmenBadge: cannot mint to zero address");
    });

    it("rejects minting a second badge to the same company", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);
      await expect(
        badge.mintBadge(company.address, REVOKED_URI)
      ).to.be.revertedWith("OmenBadge: company already holds a badge");
    });
  });

  describe("Soulbound Restriction", function () {
    it("reverts when company tries to transfer the badge", async function () {
      const { badge, company, other } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(
        badge.connect(company).transferFrom(company.address, other.address, 0)
      ).to.be.revertedWith("OmenBadge: Token is soulbound and cannot be transferred");
    });

    it("reverts when company tries to approve another address", async function () {
      const { badge, company, other } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(
        badge.connect(company).approve(other.address, 0)
      ).to.be.revertedWith("OmenBadge: approval not allowed for soulbound token");
    });

    it("reverts when company tries to set an operator", async function () {
      const { badge, company, other } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(
        badge.connect(company).setApprovalForAll(other.address, true)
      ).to.be.revertedWith("OmenBadge: approval not allowed for soulbound token");
    });

    it("reverts when operator tries to transfer an approved token", async function () {
      const { badge, admin, company, other } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      // Admin-level force approval is also blocked by the helper override.
      await expect(
        badge.connect(admin)["approve(address,uint256)"](other.address, 0)
      ).to.be.revertedWith("OmenBadge: approval not allowed for soulbound token");
    });
  });

  describe("Revocation", function () {
    it("allows admin to revoke a badge", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(badge.revokeBadge(0))
        .to.emit(badge, "BadgeRevoked")
        .withArgs(company.address, 0);
    });

    it("returns false for hasValidBadge after revocation", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);
      await badge.revokeBadge(0);

      expect(await badge.hasValidBadge(company.address)).to.equal(false);
    });

    it("does not allow non-admin to revoke a badge", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(badge.connect(company).revokeBadge(0)).to.be.revertedWith(
        "OmenBadge: caller is not the admin"
      );
    });

    it("reverts when revoking a non-existent badge", async function () {
      const { badge } = await loadFixture(deployFixture);
      await expect(badge.revokeBadge(999)).to.be.reverted;
    });
  });

  describe("Badge Update", function () {
    it("allows admin to update badge URI", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(badge.updateBadgeURI(0, REVOKED_URI))
        .to.emit(badge, "BadgeUpdated")
        .withArgs(0, REVOKED_URI);

      expect(await badge.tokenURI(0)).to.equal(REVOKED_URI);
    });

    it("rejects updating a non-existent badge", async function () {
      const { badge } = await loadFixture(deployFixture);
      await expect(badge.updateBadgeURI(999, REVOKED_URI)).to.be.revertedWith(
        "OmenBadge: token does not exist"
      );
    });

    it("rejects non-admin URI update", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(
        badge.connect(company).updateBadgeURI(0, REVOKED_URI)
      ).to.be.revertedWith("OmenBadge: caller is not the admin");
    });
  });

  describe("Badge Query", function () {
    it("returns true for verified company", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);
      expect(await badge.hasValidBadge(company.address)).to.equal(true);
    });

    it("returns false for unverified address", async function () {
      const { badge, other } = await loadFixture(deployFixture);
      expect(await badge.hasValidBadge(other.address)).to.equal(false);
    });

    it("returns the correct token ID", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);
      expect(await badge.getBadgeId(company.address)).to.equal(0);
    });

    it("reverts getBadgeId for address with no badge", async function () {
      const { badge, other } = await loadFixture(deployFixture);
      await expect(badge.getBadgeId(other.address)).to.be.revertedWith(
        "OmenBadge: company has no badge"
      );
    });

    it("returns the correct company by token ID", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);
      expect(await badge.getCompanyByTokenId(0)).to.equal(company.address);
    });
  });
});
