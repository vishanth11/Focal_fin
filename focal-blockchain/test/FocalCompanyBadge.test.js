const { expect } = require("chai");
const hre = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

/**
 * FocalCompanyBadge test suite.
 *
 * Covers:
 *  - Deployment and ownership
 *  - Admin minting and access control
 *  - Soulbound transfer / approval restrictions
 *  - Badge revocation
 *  - Badge URI updates
 *  - Badge query functions
 *  - Event emissions
 */
describe("FocalCompanyBadge", function () {
  const VERIFIED_URI = "ipfs://QmVerifiedHash/metadata.json";
  const REVOKED_URI = "ipfs://QmRevokedHash/metadata.json";

  async function deployFixture() {
    const [admin, company, other] = await hre.ethers.getSigners();
    const FocalCompanyBadge = await hre.ethers.getContractFactory("FocalCompanyBadge");
    const badge = await FocalCompanyBadge.deploy(admin.address);
    await badge.waitForDeployment();

    return { badge, admin, company, other };
  }

  describe("Deployment", function () {
    it("sets the deployer as owner", async function () {
      const { badge, admin } = await loadFixture(deployFixture);
      expect(await badge.owner()).to.equal(admin.address);
    });

    it('has the correct name "FOCAL Company Badge"', async function () {
      const { badge } = await loadFixture(deployFixture);
      expect(await badge.name()).to.equal("FOCAL Company Badge");
    });

    it('has the correct symbol "FOCAL"', async function () {
      const { badge } = await loadFixture(deployFixture);
      expect(await badge.symbol()).to.equal("FOCAL");
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
      ).to.be.revertedWith("FocalBadge: caller is not the admin");
    });

    it("sets the token URI after minting", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);
      expect(await badge.tokenURI(0)).to.equal(VERIFIED_URI);
    });

    it("rejects empty token URI", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await expect(badge.mintBadge(company.address, "")).to.be.revertedWith("FocalBadge: tokenURI cannot be empty");
    });

    it("rejects minting to the zero address", async function () {
      const { badge } = await loadFixture(deployFixture);
      await expect(
        badge.mintBadge(hre.ethers.ZeroAddress, VERIFIED_URI)
      ).to.be.revertedWith("FocalBadge: cannot mint to zero address");
    });

    it("rejects minting a second badge to the same company", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);
      await expect(
        badge.mintBadge(company.address, REVOKED_URI)
      ).to.be.revertedWith("FocalBadge: company already holds a badge");
    });
  });

  describe("Soulbound Restriction", function () {
    it("reverts when company tries to transfer the badge", async function () {
      const { badge, company, other } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(
        badge.connect(company).transferFrom(company.address, other.address, 0)
      ).to.be.revertedWith("FocalBadge: Token is soulbound and cannot be transferred");
    });

    it("reverts when company tries to approve another address", async function () {
      const { badge, company, other } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(
        badge.connect(company).approve(other.address, 0)
      ).to.be.revertedWith("FocalBadge: approval not allowed for soulbound token");
    });

    it("reverts when company tries to set an operator", async function () {
      const { badge, company, other } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(
        badge.connect(company).setApprovalForAll(other.address, true)
      ).to.be.revertedWith("FocalBadge: approval not allowed for soulbound token");
    });

    it("reverts when admin tries to approve a token for someone else", async function () {
      const { badge, admin, company, other } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(
        badge.connect(admin).approve(other.address, 0)
      ).to.be.revertedWith("FocalBadge: approval not allowed for soulbound token");
    });

    it("reverts when company uses safeTransferFrom", async function () {
      const { badge, company, other } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(
        badge.connect(company)["safeTransferFrom(address,address,uint256)"](company.address, other.address, 0)
      ).to.be.revertedWith("FocalBadge: Token is soulbound and cannot be transferred");
    });

    it("allows clearing operator approval (setApprovalForAll false)", async function () {
      const { badge, company, other } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      // Setting an operator is blocked, but clearing one is allowed and a no-op.
      await expect(badge.connect(company).setApprovalForAll(other.address, false)).not.to.be.reverted;
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
        "FocalBadge: caller is not the admin"
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
        "FocalBadge: token does not exist"
      );
    });

    it("rejects non-admin URI update", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);

      await expect(
        badge.connect(company).updateBadgeURI(0, REVOKED_URI)
      ).to.be.revertedWith("FocalBadge: caller is not the admin");
    });
  });

  describe("Ownership", function () {
    it("prevents renouncing ownership", async function () {
      const { badge, admin } = await loadFixture(deployFixture);
      await expect(badge.connect(admin).renounceOwnership()).to.be.revertedWith(
        "FocalBadge: ownership cannot be renounced"
      );
    });

    it("allows transferring ownership", async function () {
      const { badge, admin, company } = await loadFixture(deployFixture);
      await badge.connect(admin).transferOwnership(company.address);
      expect(await badge.owner()).to.equal(company.address);
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

    it("returns the correct company by token ID", async function () {
      const { badge, company } = await loadFixture(deployFixture);
      await badge.mintBadge(company.address, VERIFIED_URI);
      expect(await badge.getCompanyByTokenId(0)).to.equal(company.address);
    });

    it("reverts getBadgeId for address with no badge", async function () {
      const { badge, other } = await loadFixture(deployFixture);
      await expect(badge.getBadgeId(other.address)).to.be.revertedWith(
        "FocalBadge: company has no badge"
      );
    });
  });
});
