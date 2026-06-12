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
    expect(await token.supplyController()).to.equal(await manager.getAddress());
    expect(await compliance.getAssetManager("building-1")).to.equal(await manager.getAddress());
    expect(await token.balanceOf(issuer.address)).to.equal(initial);
    const [pegged, value, supply] = await manager.checkPegStatus("building-1");
    expect(pegged).to.equal(true);
    expect(value).to.equal(supply);
    expect(supply).to.equal(await token.totalSupply());
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

  it("keeps the supply peg across controlled valuation increases and decreases", async function () {
    const { token } = await createAsset();
    const increasedValue = ethers.parseUnits("1250", 2);
    const decreasedValue = ethers.parseUnits("900", 2);

    await manager.updateAssetValue("building-1", increasedValue);
    expect(await token.totalSupply()).to.equal(increasedValue);

    await manager.updateAssetValue("building-1", decreasedValue);
    const details = await manager.getAssetDetails("building-1");
    const [pegged, value, assetSupply] = await manager.checkPegStatus("building-1");
    expect(details[2]).to.equal(decreasedValue);
    expect(details[3]).to.equal(decreasedValue);
    expect(value).to.equal(decreasedValue);
    expect(assetSupply).to.equal(await token.totalSupply());
    expect(pegged).to.equal(true);
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

  it("blocks global issuers from bypassing the asset manager supply ledger", async function () {
    const { token } = await createAsset();

    await expect(token.mint(issuer.address, 1)).to.be.revertedWith("Not supply controller");
    await expect(token.burnFrom(issuer.address, 1)).to.be.revertedWith("Not supply controller");
  });

  it("preserves the value, asset supply and token supply invariant", async function () {
    const { token } = await createAsset();
    let seed = 0x3643n;

    for (let index = 0; index < 32; index += 1) {
      seed = (seed * 1103515245n + 12345n) % (2n ** 31n);
      const amount = (seed % 25000n) + 1n;
      const issuerBalance = await token.balanceOf(issuer.address);
      const shouldRedeem = (seed & 1n) === 1n && issuerBalance >= amount;

      if (shouldRedeem) {
        await manager.redeem("building-1", amount);
      } else {
        await manager.deposit("building-1", amount);
      }

      const details = await manager.getAssetDetails("building-1");
      const tokenSupply = await token.totalSupply();
      const [pegged, value, assetSupply] = await manager.checkPegStatus("building-1");
      expect(details[2]).to.equal(details[3]);
      expect(details[3]).to.equal(tokenSupply);
      expect(value).to.equal(assetSupply);
      expect(assetSupply).to.equal(tokenSupply);
      expect(pegged).to.equal(true);
    }
  });
});
