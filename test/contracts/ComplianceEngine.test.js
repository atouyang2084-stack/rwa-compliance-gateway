const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ComplianceEngine defensive controls", function () {
  let compliance;
  let token;
  let admin;
  let investor;
  let attacker;

  beforeEach(async function () {
    [admin, investor, attacker] = await ethers.getSigners();

    compliance = await (await ethers.getContractFactory("ComplianceEngine")).deploy();
    await compliance.waitForDeployment();
    token = await (await ethers.getContractFactory("RWAToken")).deploy(
      "RWA Demo",
      "RWAD",
      2,
      await compliance.getAddress(),
      admin.address
    );
    await token.waitForDeployment();

    await compliance.registerAsset(
      "asset-1",
      await token.getAddress(),
      0,
      ethers.parseUnits("1000", 2)
    );
    for (const user of [admin, investor]) {
      await compliance.verifyKYC(user.address, `kyc-${user.address}`);
      await compliance.setAddressJurisdiction(user.address, "US");
      await compliance.setWhitelisted(await token.getAddress(), user.address, true);
    }
  });

  it("rejects unauthorized KYC, role and holder-state writes", async function () {
    await expect(
      compliance.connect(attacker).verifyKYC(attacker.address, "forged")
    ).to.be.revertedWith("Not authorized regulator");
    await expect(
      compliance.connect(attacker).assignRole(attacker.address, 0)
    ).to.be.revertedWith("Not authorized admin");
    await expect(
      compliance.connect(attacker).created(attacker.address)
    ).to.be.revertedWith("Caller is not a registered token");
  });

  it("binds checks to the calling token and tracks holders from token hooks", async function () {
    const supply = ethers.parseUnits("1000", 2);
    const transfer = ethers.parseUnits("100", 2);
    await token.mint(admin.address, supply);
    expect(await compliance.holderCount(await token.getAddress())).to.equal(1n);

    await token.transfer(investor.address, transfer);
    expect(await token.balanceOf(investor.address)).to.equal(transfer);
    expect(await compliance.holderCount(await token.getAddress())).to.equal(2n);

    const unregistered = await (await ethers.getContractFactory("RWAToken")).deploy(
      "Other",
      "OTHER",
      2,
      await compliance.getAddress(),
      admin.address
    );
    const [allowed, reason] = await compliance.isTransferAllowed(
      await unregistered.getAddress(),
      admin.address,
      investor.address,
      1
    );
    expect(allowed).to.equal(false);
    expect(reason).to.equal("Token not registered");
  });

  it("blocks blacklisted recipients and per-account limit overflow", async function () {
    await token.mint(admin.address, ethers.parseUnits("1000", 2));
    await compliance.addToBlacklist(investor.address);
    await expect(
      token.transfer(investor.address, ethers.parseUnits("1", 2))
    ).to.be.revertedWith("Recipient is blacklisted");

    await compliance.removeFromBlacklist(investor.address);
    await compliance.setAssetLimits("asset-1", 100, ethers.parseUnits("50", 2));
    await expect(
      token.transfer(investor.address, ethers.parseUnits("50.01", 2))
    ).to.be.revertedWith("Exceeds maximum holding per account");
  });

  it("isolates valuation and whitelist writes from unrelated issuers", async function () {
    await compliance.assignRole(attacker.address, 0);

    await expect(
      compliance.connect(attacker).updateAssetValuation("asset-1", ethers.parseUnits("2000", 2))
    ).to.be.revertedWith("Not asset manager");
    await expect(
      compliance.connect(attacker).setWhitelisted(await token.getAddress(), attacker.address, true)
    ).to.be.revertedWith("Not authorized for asset");

    expect(await compliance.getAssetManager("asset-1")).to.equal(admin.address);
  });

  it("rejects asset registration by a caller that is not the token controller", async function () {
    const foreignToken = await (await ethers.getContractFactory("RWAToken")).deploy(
      "Foreign",
      "FRN",
      2,
      await compliance.getAddress(),
      admin.address
    );
    await compliance.assignRole(attacker.address, 0);

    await expect(
      compliance.connect(attacker).registerAsset(
        "foreign-asset",
        await foreignToken.getAddress(),
        0,
        ethers.parseUnits("100", 2)
      )
    ).to.be.revertedWith("Caller is not token controller");
  });
});
