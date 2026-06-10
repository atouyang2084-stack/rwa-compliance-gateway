// SPDX-License-Identifier: MIT
const { ethers } = require("hardhat");
const { parseUnits } = require("ethers");

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
  const assetManager = await AssetManager.deploy(oracleManagerAddress, complianceEngineAddress);
  await assetManager.waitForDeployment();
  const assetManagerAddress = await assetManager.getAddress();
  console.log("AssetManager合约地址:", assetManagerAddress);

  // 配置权限
  console.log("\n配置权限...");
  await complianceEngine.assignRole(assetManagerAddress, 0);
  await complianceEngine.assignRole(assetManagerAddress, 3);
  console.log("权限配置完成");

  // 验证KYC
  console.log("\n验证KYC...");
  await complianceEngine.verifyKYC(deployer.address, "demo-kyc-deployer");
  await complianceEngine.setAddressJurisdiction(deployer.address, "US");
  console.log("KYC验证完成");

  // 注册资产
  console.log("\n注册资产...");
  const assetId = "test-asset-1";
  const initialValue = parseUnits("1000", 2);
  const tx = await assetManager.createAsset(assetId, "Demo RWA", "DRWA", initialValue);
  await tx.wait();
  const details = await assetManager.getAssetDetails(assetId);
  const rwaTokenAddress = details[4];
  console.log("资产注册完成");

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
