// SPDX-License-Identifier: MIT
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AssetManager", function () {
  let AssetManager;
  let assetManager;
  let ComplianceEngine;
  let complianceEngine;
  let OracleManager;
  let oracleManager;
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

    // 部署OracleManager合约
    OracleManager = await ethers.getContractFactory("OracleManager");
    oracleManager = await OracleManager.deploy();
    await oracleManager.deployed();

    // 部署AssetManager合约
    AssetManager = await ethers.getContractFactory("AssetManager");
    assetManager = await AssetManager.deploy(oracleManager.address);
    await assetManager.deployed();

    // 添加授权发行方
    await assetManager.addAuthorizedIssuer(owner.address);

    // 验证KYC
    await complianceEngine.verifyKYC(owner.address, "{\"name\": \"Owner\", \"id\": \"123456789\"}");
    await complianceEngine.verifyKYC(addr1.address, "{\"name\": \"User1\", \"id\": \"987654321\"}");
  });

  describe("资产管理功能", function () {
    it("应该能够创建新资产", async function () {
      const assetId = "test-asset-1";
      const name = "Test Asset";
      const symbol = "TA";
      const initialValue = ethers.utils.parseEther("1000");

      // 创建资产
      const tokenAddress = await assetManager.createAsset(assetId, name, symbol, initialValue, complianceEngine.address);

      // 检查资产详情
      const [assetName, assetSymbol, totalValue, totalTokens, tokenAddr, isActive] = await assetManager.getAssetDetails(assetId);

      expect(assetName).to.equal(name);
      expect(assetSymbol).to.equal(symbol);
      expect(totalValue).to.equal(initialValue);
      expect(totalTokens).to.equal(initialValue);
      expect(tokenAddr).to.not.be.empty;
      expect(isActive).to.be.true;
    });

    it("应该能够存款并铸造代币", async function () {
      const assetId = "test-asset-1";
      const name = "Test Asset";
      const symbol = "TA";
      const initialValue = ethers.utils.parseEther("1000");

      // 创建资产
      await assetManager.createAsset(assetId, name, symbol, initialValue, complianceEngine.address);

      // 存款
      const depositAmount = ethers.utils.parseEther("500");
      await assetManager.deposit(assetId, depositAmount);

      // 检查资产详情
      const [, , totalValue, totalTokens, ,] = await assetManager.getAssetDetails(assetId);

      expect(totalValue).to.equal(initialValue.add(depositAmount));
      expect(totalTokens).to.equal(initialValue.add(depositAmount));
    });

    it("应该能够赎回并销毁代币", async function () {
      const assetId = "test-asset-1";
      const name = "Test Asset";
      const symbol = "TA";
      const initialValue = ethers.utils.parseEther("1000");

      // 创建资产
      const tokenAddress = await assetManager.createAsset(assetId, name, symbol, initialValue, complianceEngine.address);

      // 获取代币合约
      const RWAToken = await ethers.getContractFactory("RWAToken");
      const token = RWAToken.attach(tokenAddress);

      // 转账代币给addr1
      await token.transfer(addr1.address, ethers.utils.parseEther(200));

      // 授权AssetManager销毁代币
      await token.connect(addr1).approve(assetManager.address, ethers.utils.parseEther(100));

      // 赎回
      await assetManager.connect(addr1).redeem(assetId, ethers.utils.parseEther(100));

      // 检查资产详情
      const [, , totalValue, totalTokens, ,] = await assetManager.getAssetDetails(assetId);

      expect(totalValue).to.equal(initialValue.sub(ethers.utils.parseEther(100)));
      expect(totalTokens).to.equal(initialValue.sub(ethers.utils.parseEther(100)));
    });

    it("应该能够更新资产价值", async function () {
      const assetId = "test-asset-1";
      const name = "Test Asset";
      const symbol = "TA";
      const initialValue = ethers.utils.parseEther("1000");

      // 创建资产
      await assetManager.createAsset(assetId, name, symbol, initialValue, complianceEngine.address);

      // 更新资产价值
      const newValue = ethers.utils.parseEther("1500");
      await assetManager.updateAssetValue(assetId, newValue);

      // 检查资产详情
      const [, , totalValue, totalTokens, ,] = await assetManager.getAssetDetails(assetId);

      expect(totalValue).to.equal(newValue);
      expect(totalTokens).to.equal(newValue);
    });

    it("管理员应该能够暂停和恢复资产", async function () {
      const assetId = "test-asset-1";
      const name = "Test Asset";
      const symbol = "TA";
      const initialValue = ethers.utils.parseEther("1000");

      // 创建资产
      await assetManager.createAsset(assetId, name, symbol, initialValue, complianceEngine.address);

      // 暂停资产
      await assetManager.pauseAsset(assetId);

      // 检查资产状态
      const [, , , , , isActive] = await assetManager.getAssetDetails(assetId);
      expect(isActive).to.be.false;

      // 恢复资产
      await assetManager.resumeAsset(assetId);

      // 检查资产状态
      const [, , , , , isActiveAfter] = await assetManager.getAssetDetails(assetId);
      expect(isActiveAfter).to.be.true;
    });

    it("应该能够检查资产与代币的锚定状态", async function () {
      const assetId = "test-asset-1";
      const name = "Test Asset";
      const symbol = "TA";
      const initialValue = ethers.utils.parseEther("1000");

      // 创建资产
      await assetManager.createAsset(assetId, name, symbol, initialValue, complianceEngine.address);

      // 检查锚定状态
      const [isPegged, totalValue, totalTokens] = await assetManager.checkPegStatus(assetId);

      expect(isPegged).to.be.true;
      expect(totalValue).to.equal(totalTokens);
    });
  });

  describe("权限控制", function () {
    it("只有授权发行方可以创建资产", async function () {
      const assetId = "test-asset-1";
      const name = "Test Asset";
      const symbol = "TA";
      const initialValue = ethers.utils.parseEther("1000");

      // 尝试以非授权发行方身份创建资产
      await expect(assetManager.connect(addr1).createAsset(assetId, name, symbol, initialValue, complianceEngine.address)).to.be.revertedWith("Not authorized issuer");
    });

    it("只有授权发行方可以存款", async function () {
      const assetId = "test-asset-1";
      const name = "Test Asset";
      const symbol = "TA";
      const initialValue = ethers.utils.parseEther("1000");

      // 创建资产
      await assetManager.createAsset(assetId, name, symbol, initialValue, complianceEngine.address);

      // 尝试以非授权发行方身份存款
      await expect(assetManager.connect(addr1).deposit(assetId, ethers.utils.parseEther(100))).to.be.revertedWith("Not authorized issuer");
    });

    it("只有管理员可以添加授权发行方", async function () {
      // 尝试以非管理员身份添加授权发行方
      await expect(assetManager.connect(addr1).addAuthorizedIssuer(addr2.address)).to.be.revertedWith("Not authorized");
    });
  });
});
