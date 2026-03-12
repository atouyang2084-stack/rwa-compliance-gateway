// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ComplianceEngine", function () {
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
  });

  describe("KYC验证功能", function () {
    it("应该能够验证KYC", async function () {
      // 验证KYC
      const verificationData = "{\"name\": \"John Doe\", \"id\": \"123456789\"}";
      await complianceEngine.verifyKYC(addr1.address, verificationData);

      // 检查KYC状态
      const isVerified = await complianceEngine.isKYCVerified(addr1.address);
      expect(isVerified).to.be.true;

      // 检查验证ID
      const verificationId = await complianceEngine.getVerificationId(addr1.address);
      expect(verificationId).to.not.be.empty;
    });

    it("未验证KYC的地址应该返回false", async function () {
      const isVerified = await complianceEngine.isKYCVerified(addr2.address);
      expect(isVerified).to.be.false;
    });
  });

  describe("黑名单管理", function () {
    it("管理员应该能够添加地址到黑名单", async function () {
      // 添加到黑名单
      await complianceEngine.addToBlacklist(addr1.address);

      // 检查黑名单状态
      const isBlacklisted = await complianceEngine.isBlacklisted(addr1.address);
      expect(isBlacklisted).to.be.true;
    });

    it("管理员应该能够从黑名单中移除地址", async function () {
      // 添加到黑名单
      await complianceEngine.addToBlacklist(addr1.address);
      
      // 从黑名单中移除
      await complianceEngine.removeFromBlacklist(addr1.address);

      // 检查黑名单状态
      const isBlacklisted = await complianceEngine.isBlacklisted(addr1.address);
      expect(isBlacklisted).to.be.false;
    });
  });

  describe("角色管理", function () {
    it("管理员应该能够分配角色", async function () {
      // 分配Issuer角色
      await complianceEngine.assignRole(addr1.address, 0); // 0是Issuer角色

      // 检查角色状态
      const hasRole = await complianceEngine.hasRole(addr1.address, 0);
      expect(hasRole).to.be.true;
    });

    it("管理员应该能够撤销角色", async function () {
      // 分配Issuer角色
      await complianceEngine.assignRole(addr1.address, 0);
      
      // 撤销角色
      await complianceEngine.revokeRole(addr1.address, 0);

      // 检查角色状态
      const hasRole = await complianceEngine.hasRole(addr1.address, 0);
      expect(hasRole).to.be.false;
    });
  });

  describe("资产管理", function () {
    it("应该能够注册资产", async function () {
      const assetId = "test-asset-1";
      const contractAddress = addr1.address;
      const standard = 0; // ERC3643
      const totalValuation = ethers.utils.parseEther("1000");

      // 注册资产
      await complianceEngine.registerAsset(assetId, contractAddress, standard, totalValuation);

      // 检查资产状态
      const status = await complianceEngine.getAssetStatus(assetId);
      expect(status).to.equal(0); // Pending状态

      // 检查资产详情
      const [addr, valuation, std, stat] = await complianceEngine.getAssetDetails(assetId);
      expect(addr).to.equal(contractAddress);
      expect(valuation).to.equal(totalValuation);
      expect(std).to.equal(standard);
      expect(stat).to.equal(0);
    });

    it("管理员应该能够更新资产状态", async function () {
      const assetId = "test-asset-1";
      const contractAddress = addr1.address;
      const standard = 0;
      const totalValuation = ethers.utils.parseEther("1000");

      // 注册资产
      await complianceEngine.registerAsset(assetId, contractAddress, standard, totalValuation);
      
      // 更新资产状态为Active
      await complianceEngine.updateAssetStatus(assetId, 1); // 1是Active状态

      // 检查资产状态
      const status = await complianceEngine.getAssetStatus(assetId);
      expect(status).to.equal(1);
    });
  });

  describe("合规规则检查", function () {
    beforeEach(async function () {
      // 验证KYC
      await complianceEngine.verifyKYC(owner.address, "{\"name\": \"Owner\", \"id\": \"123456789\"}");
      await complianceEngine.verifyKYC(addr1.address, "{\"name\": \"User1\", \"id\": \"987654321\"}");

      // 注册资产
      const assetId = "test-asset-1";
      const contractAddress = addr2.address;
      const standard = 0;
      const totalValuation = ethers.utils.parseEther("1000");
      await complianceEngine.registerAsset(assetId, contractAddress, standard, totalValuation);

      // 添加到白名单
      await complianceEngine.addToWhitelist(contractAddress, owner.address);
      await complianceEngine.addToWhitelist(contractAddress, addr1.address);
    });

    it("应该允许合规的转账", async function () {
      const contractAddress = addr2.address;
      const amount = ethers.utils.parseEther("10");

      // 检查转账是否允许
      const [allowed, reason] = await complianceEngine.isTransferAllowed(owner.address, addr1.address, amount);
      expect(allowed).to.be.true;
      expect(reason).to.equal("Transfer allowed");
    });

    it("应该拒绝黑名单地址的转账", async function () {
      const contractAddress = addr2.address;
      const amount = ethers.utils.parseEther("10");

      // 将addr1添加到黑名单
      await complianceEngine.addToBlacklist(addr1.address);

      // 检查转账是否允许
      const [allowed, reason] = await complianceEngine.isTransferAllowed(owner.address, addr1.address, amount);
      expect(allowed).to.be.false;
      expect(reason).to.equal("Recipient is blacklisted");
    });

    it("应该拒绝未验证KYC的地址转账", async function () {
      const contractAddress = addr2.address;
      const amount = ethers.utils.parseEther("10");

      // 检查转账是否允许（addr2未验证KYC）
      const [allowed, reason] = await complianceEngine.isTransferAllowed(owner.address, addr2.address, amount);
      expect(allowed).to.be.false;
      expect(reason).to.equal("Recipient KYC not verified");
    });
  });
});
