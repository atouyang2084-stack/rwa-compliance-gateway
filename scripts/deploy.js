// SPDX-License-Identifier: MIT
const { ethers } = require("hardhat");
const { parseEther } = require("ethers");

async function main() {
  // 获取签名者
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    console.error("无法获取签名者，请确保您的RPC端点配置正确并且有可用的账户");
    process.exit(1);
  }
  const deployer = signers[0];
  console.log("部署合约的地址:", deployer.address);

  // 部署ComplianceEngine合约
  console.log("\n部署ComplianceEngine合约...");
  const ComplianceEngine = await ethers.getContractFactory("ComplianceEngine");
  const complianceEngine = await ComplianceEngine.deploy();
  await complianceEngine.waitForDeployment();
  const complianceEngineAddress = await complianceEngine.getAddress();
  console.log("ComplianceEngine合约地址:", complianceEngineAddress);

  // 部署OracleManager合约
  console.log("\n部署OracleManager合约...");
  const OracleManager = await ethers.getContractFactory("OracleManager");
  const oracleManager = await OracleManager.deploy();
  await oracleManager.waitForDeployment();
  const oracleManagerAddress = await oracleManager.getAddress();
  console.log("OracleManager合约地址:", oracleManagerAddress);

  // 部署AssetManager合约
  console.log("\n部署AssetManager合约...");
  const AssetManager = await ethers.getContractFactory("AssetManager");
  const assetManager = await AssetManager.deploy(oracleManagerAddress);
  await assetManager.waitForDeployment();
  const assetManagerAddress = await assetManager.getAddress();
  console.log("AssetManager合约地址:", assetManagerAddress);

  // 部署示例RWAToken合约
  console.log("\n部署RWAToken合约...");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = await RWAToken.deploy("Real World Asset Token", "RWAT", 2, complianceEngineAddress);
  await rwaToken.waitForDeployment();
  const rwaTokenAddress = await rwaToken.getAddress();
  console.log("RWAToken合约地址:", rwaTokenAddress);

  // 配置权限
  console.log("\n配置权限...");
  await assetManager.addAuthorizedIssuer(deployer.address);
  await complianceEngine.assignRole(deployer.address, 0); // 0是Issuer角色
  console.log("权限配置完成");

  // 验证KYC
  console.log("\n验证KYC...");
  await complianceEngine.verifyKYC(deployer.address, '{"name": "Deployer", "id": "123456789"}');
  console.log("KYC验证完成");

  // 注册资产
  console.log("\n注册资产...");
  const assetId = "test-asset-1";
  const initialValue = parseEther("1000");
  await complianceEngine.registerAsset(assetId, rwaTokenAddress, 0, initialValue);
  console.log("资产注册完成");

  // 添加到白名单
  console.log("\n添加到白名单...");
  await complianceEngine.addToWhitelist(deployer.address);
  console.log("白名单添加完成");
  
  // 更新资产状态为活跃
  console.log("\n更新资产状态...");
  await complianceEngine.updateAssetStatus(assetId, 1); // 1 是 Active 状态
  console.log("资产状态更新完成");

  console.log("\n所有合约部署和配置完成！");
  console.log("===============================");
  console.log("ComplianceEngine:", complianceEngineAddress);
  console.log("OracleManager:", oracleManagerAddress);
  console.log("AssetManager:", assetManagerAddress);
  console.log("RWAToken:", rwaTokenAddress);
  console.log("===============================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
