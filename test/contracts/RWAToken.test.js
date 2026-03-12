// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RWAToken", function () {
  let RWAToken;
  let rwaToken;
  let ComplianceEngine;
  let complianceEngine;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    // 获取签名者
    [owner, addr1, addr2] = await ethers.getSigners();

    // 部署ComplianceEngine合约
    ComplianceEngine = await ethers.getContractFactory("ComplianceEngine");
    complianceEngine = await ComplianceEngine.deploy();
    await complianceEngine.deployed();

    // 部署RWAToken合约
    RWAToken = await ethers.getContractFactory("RWAToken");
    rwaToken = await RWAToken.deploy("Real World Asset Token", "RWAT", 2, complianceEngine.address);
    await rwaToken.deployed();

    // 验证KYC
    await complianceEngine.verifyKYC(owner.address, "{\"name\": \"Owner\", \"id\": \"123456789\"}");
    await complianceEngine.verifyKYC(addr1.address, "{\"name\": \"User1\", \"id\": \"987654321\"}");

    // 分配Issuer角色给owner
    await complianceEngine.assignRole(owner.address, 0); // 0是Issuer角色

    // 注册资产
    const assetId = "test-asset-1";
    const totalValuation = ethers.utils.parseEther("1000");
    await complianceEngine.registerAsset(assetId, rwaToken.address, 0, totalValuation);

    // 添加到白名单
    await complianceEngine.addToWhitelist(rwaToken.address, owner.address);
    await complianceEngine.addToWhitelist(rwaToken.address, addr1.address);
  });

  describe("代币基本功能", function () {
    it("应该返回正确的代币信息", async function () {
      const name = await rwaToken.name();
      const symbol = await rwaToken.symbol();
      const decimals = await rwaToken.decimals();
      const totalSupply = await rwaToken.totalSupply();

      expect(name).to.equal("Real World Asset Token");
      expect(symbol).to.equal("RWAT");
      expect(decimals).to.equal(2);
      expect(totalSupply).to.equal(0);
    });

    it("发行方应该能够铸造代币", async function () {
      const amount = ethers.utils.parseEther("100");

      // 铸造代币
      await rwaToken.mint(addr1.address, amount);

      // 检查余额
      const balance = await rwaToken.balanceOf(addr1.address);
      expect(balance).to.equal(amount);

      // 检查总供应量
      const totalSupply = await rwaToken.totalSupply();
      expect(totalSupply).to.equal(amount);
    });

    it("用户应该能够销毁代币", async function () {
      const amount = ethers.utils.parseEther("100");

      // 铸造代币
      await rwaToken.mint(addr1.address, amount);

      // 销毁代币
      await rwaToken.connect(addr1).burn(ethers.utils.parseEther("50"));

      // 检查余额
      const balance = await rwaToken.balanceOf(addr1.address);
      expect(balance).to.equal(ethers.utils.parseEther("50"));

      // 检查总供应量
      const totalSupply = await rwaToken.totalSupply();
      expect(totalSupply).to.equal(ethers.utils.parseEther("50"));
    });
  });

  describe("转账功能", function () {
    beforeEach(async function () {
      // 铸造代币
      await rwaToken.mint(owner.address, ethers.utils.parseEther("100"));
    });

    it("应该能够正常转账", async function () {
      const amount = ethers.utils.parseEther("50");

      // 转账
      await rwaToken.transfer(addr1.address, amount);

      // 检查余额
      const ownerBalance = await rwaToken.balanceOf(owner.address);
      const addr1Balance = await rwaToken.balanceOf(addr1.address);

      expect(ownerBalance).to.equal(ethers.utils.parseEther("50"));
      expect(addr1Balance).to.equal(amount);
    });

    it("应该能够通过授权转账", async function () {
      const amount = ethers.utils.parseEther("50");

      // 授权
      await rwaToken.approve(addr1.address, amount);

      // 通过授权转账
      await rwaToken.connect(addr1).transferFrom(owner.address, addr2.address, amount);

      // 检查余额
      const ownerBalance = await rwaToken.balanceOf(owner.address);
      const addr2Balance = await rwaToken.balanceOf(addr2.address);

      expect(ownerBalance).to.equal(ethers.utils.parseEther("50"));
      expect(addr2Balance).to.equal(amount);
    });

    it("应该拒绝余额不足的转账", async function () {
      const amount = ethers.utils.parseEther("200"); // 超过余额

      // 尝试转账
      await expect(rwaToken.transfer(addr1.address, amount)).to.be.revertedWith("Insufficient balance");
    });

    it("应该拒绝授权不足的转账", async function () {
      const amount = ethers.utils.parseEther("50");

      // 授权不足
      await rwaToken.approve(addr1.address, ethers.utils.parseEther("40"));

      // 尝试转账
      await expect(rwaToken.connect(addr1).transferFrom(owner.address, addr2.address, amount)).to.be.revertedWith("Insufficient allowance");
    });
  });

  describe("合规检查", function () {
    beforeEach(async function () {
      // 铸造代币
      await rwaToken.mint(owner.address, ethers.utils.parseEther("100"));
    });

    it("应该拒绝未验证KYC的地址转账", async function () {
      // addr2未验证KYC
      await expect(rwaToken.transfer(addr2.address, ethers.utils.parseEther("50"))).to.be.revertedWith("Recipient KYC not verified");
    });

    it("应该拒绝黑名单地址的转账", async function () {
      // 将addr1添加到黑名单
      await complianceEngine.addToBlacklist(addr1.address);

      // 尝试转账
      await expect(rwaToken.transfer(addr1.address, ethers.utils.parseEther("50"))).to.be.revertedWith("Recipient is blacklisted");
    });

    it("应该检查地址是否合规", async function () {
      // 检查owner是否合规
      const ownerCompliant = await rwaToken.isCompliant(owner.address);
      expect(ownerCompliant).to.be.true;

      // 检查addr2是否合规（未验证KYC）
      const addr2Compliant = await rwaToken.isCompliant(addr2.address);
      expect(addr2Compliant).to.be.false;
    });
  });
});
