const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWAToken compliance enforcement", function () {
  let compliance;
  let token;
  let issuer;
  let investor;
  let outsider;

  beforeEach(async function () {
    [issuer, investor, outsider] = await ethers.getSigners();
    compliance = await (await ethers.getContractFactory("ComplianceEngine")).deploy();
    token = await (await ethers.getContractFactory("RWAToken")).deploy(
      "Property Dollar",
      "PD",
      2,
      await compliance.getAddress(),
      issuer.address
    );
    await compliance.registerAsset(
      "property-1",
      await token.getAddress(),
      0,
      ethers.parseUnits("500", 2)
    );
    for (const user of [issuer, investor]) {
      await compliance.verifyKYC(user.address, `verified-${user.address}`);
      await compliance.setAddressJurisdiction(user.address, "US");
      await compliance.setWhitelisted(await token.getAddress(), user.address, true);
    }
  });

  it("uses 2-decimal smallest units without floating point", async function () {
    const amount = ethers.parseUnits("123.45", 2);
    await token.mint(issuer.address, amount);
    expect(await token.totalSupply()).to.equal(12345n);
    expect(await token.balanceOf(issuer.address)).to.equal(12345n);
  });

  it("allows only the immutable supply controller to mint and burn", async function () {
    await compliance.assignRole(outsider.address, 0);
    await expect(token.connect(outsider).mint(issuer.address, 100)).to.be.revertedWith(
      "Not supply controller"
    );
    await token.mint(issuer.address, ethers.parseUnits("10", 2));
    await expect(token.connect(outsider).burnFrom(issuer.address, 100)).to.be.revertedWith(
      "Not supply controller"
    );
  });

  it("rejects direct holder burns and transfers to non-KYC wallets", async function () {
    await token.mint(issuer.address, ethers.parseUnits("10", 2));
    const burnSelector = ethers.id("burn(uint256)").slice(0, 10);
    const burnAmount = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [100]).slice(2);
    await expect(
      issuer.sendTransaction({
        to: await token.getAddress(),
        data: `${burnSelector}${burnAmount}`
      })
    ).to.be.reverted;
    await expect(token.transfer(outsider.address, 100)).to.be.revertedWith(
      "Recipient KYC not verified"
    );
  });

  it("enforces pause and allowance boundaries", async function () {
    const amount = ethers.parseUnits("10", 2);
    await token.mint(issuer.address, amount);
    await token.approve(investor.address, 100);
    await expect(
      token.connect(investor).transferFrom(issuer.address, investor.address, 101)
    ).to.be.revertedWith("Insufficient allowance");

    await token.pause();
    await expect(token.transfer(investor.address, 1)).to.be.revertedWith("Contract is paused");
  });
});
