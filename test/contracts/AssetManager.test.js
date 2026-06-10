const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AssetManager MVP lifecycle", function () {
  let compliance;
  let manager;
  let issuer;
  let investor;

  beforeEach(async function () {
    [issuer, investor] = await ethers.getSigners();
    compliance = await (await ethers.getContractFactory("ComplianceEngine")).deploy();
    const oracle = await (await ethers.getContractFactory("OracleManager")).deploy();
    manager = await (await ethers.getContractFactory("AssetManager")).deploy(
      await oracle.getAddress(),
      await compliance.getAddress()
    );

    await compliance.assignRole(await manager.getAddress(), 0);
    await compliance.assignRole(await manager.getAddress(), 3);
    for (const user of [issuer, investor]) {
      await compliance.verifyKYC(user.address, `kyc-${user.address}`);
      await compliance.setAddressJurisdiction(user.address, "US");
    }
  });

  async function createAsset() {
    const initial = ethers.parseUnits("1000", 2);
    await manager.createAsset("building-1", "Building One", "BLD1", initial);
    const details = await manager.getAssetDetails("building-1");
    const token = await ethers.getContractAt("RWAToken", details[4]);
    return { initial, token };
  }

  it("creates a registered, pegged 2-decimal asset", async function () {
    const { initial, token } = await createAsset();
    expect(await token.decimals()).to.equal(2);
    expect(await token.balanceOf(issuer.address)).to.equal(initial);
    const [pegged, value, supply] = await manager.checkPegStatus("building-1");
    expect(pegged).to.equal(true);
    expect(value).to.equal(supply);
  });

  it("supports compliant transfer and redemption with exact units", async function () {
    const { initial, token } = await createAsset();
    await compliance.setWhitelisted(await token.getAddress(), investor.address, true);
    const purchased = ethers.parseUnits("200", 2);
    const redeemed = ethers.parseUnits("75.25", 2);
    await token.transfer(investor.address, purchased);
    await manager.connect(investor).redeem("building-1", redeemed);

    expect(await token.balanceOf(investor.address)).to.equal(purchased - redeemed);
    const details = await manager.getAssetDetails("building-1");
    expect(details[2]).to.equal(initial - redeemed);
    expect(details[3]).to.equal(initial - redeemed);
  });

  it("expands valuation and supply together on issuer deposit", async function () {
    const { initial, token } = await createAsset();
    const deposit = ethers.parseUnits("250", 2);
    await manager.deposit("building-1", deposit);
    const details = await manager.getAssetDetails("building-1");
    expect(details[2]).to.equal(initial + deposit);
    expect(details[3]).to.equal(initial + deposit);
    expect(await token.balanceOf(issuer.address)).to.equal(initial + deposit);
  });

  it("rejects unapproved issuers and freezes transfers with the asset", async function () {
    await expect(
      manager.connect(investor).createAsset("forged", "Forged", "FG", 100)
    ).to.be.revertedWith("Not authorized issuer");

    const { token } = await createAsset();
    await compliance.setWhitelisted(await token.getAddress(), investor.address, true);
    await manager.pauseAsset("building-1");
    await expect(token.transfer(investor.address, 1)).to.be.revertedWith("Asset is not active");
  });
});
