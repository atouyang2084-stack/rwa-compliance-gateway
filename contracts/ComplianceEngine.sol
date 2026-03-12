// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ComplianceRegistry.sol";

contract ComplianceEngine is ComplianceRegistry {

    // KYC验证映射
    mapping(address => bool) public kycVerified;
    mapping(address => string) public verificationIds;

    // 黑名单映射
    mapping(address => bool) public blacklisted;

    // 角色映射
    mapping(address => mapping(Role => bool)) public roles;

    // 资产映射
    mapping(string => Asset) public assets;
    string[] public assetIds;

    // 资产结构体
    struct Asset {
        string assetId;
        address contractAddress;
        uint256 totalValuation;
        ComplianceStandard standard;
        AssetStatus status;
        uint256 holderLimit; // 持有者数量上限
        uint256 maxHoldingPerAccount; // 单一账户最大持仓限制
    }

    // 代币持有者映射（用于跟踪持有者数量）
    mapping(address => mapping(address => bool)) public tokenHolders; // 合约地址 -> 持有者地址 -> 是否持有
    mapping(address => uint256) public holderCount; // 合约地址 -> 持有者数量

    // 白名单映射
    mapping(address => mapping(address => bool)) public whitelist; // 合约地址 -> 地址 -> 是否在白名单

    // 权限控制
    address public admin;

    // 修饰符
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
        _;
    }

    // 构造函数
    constructor() {
        admin = msg.sender;
    }

    // KYC验证相关
    function verifyKYC(address user, string calldata verificationData) external returns (bool) {
        // 这里应该集成第三方KYC服务
        // 暂时模拟验证通过
        kycVerified[user] = true;
        verificationIds[user] = string(abi.encodePacked("KYC-", uint256(uint160(user))));
        emit KYCVerified(user, verificationIds[user], block.timestamp);
        return true;
    }

    function isKYCVerified(address user) external view returns (bool) {
        return kycVerified[user];
    }

    function getVerificationId(address user) external view returns (string memory) {
        return verificationIds[user];
    }

    // 黑名单管理
    function addToBlacklist(address address_) external onlyAdmin {
        blacklisted[address_] = true;
        emit BlacklistUpdated(address_, true);
    }

    function removeFromBlacklist(address address_) external onlyAdmin {
        blacklisted[address_] = false;
        emit BlacklistUpdated(address_, false);
    }

    function isBlacklisted(address address_) external view returns (bool) {
        return blacklisted[address_];
    }

    // 角色管理
    function assignRole(address user, Role role) external onlyAdmin {
        roles[user][role] = true;
        emit RoleAssigned(user, role);
    }

    function revokeRole(address user, Role role) external onlyAdmin {
        roles[user][role] = false;
    }

    function hasRole(address user, Role role) external view returns (bool) {
        return roles[user][role];
    }

    // 资产管理
    function registerAsset(string calldata assetId, address contractAddress, ComplianceStandard standard, uint256 totalValuation) external {
        require(bytes(assets[assetId].assetId).length == 0, "Asset already exists");

        assets[assetId] = Asset({
            assetId: assetId,
            contractAddress: contractAddress,
            totalValuation: totalValuation,
            standard: standard,
            status: AssetStatus.Pending,
            holderLimit: 100, // 默认持有者上限
            maxHoldingPerAccount: totalValuation / 10 // 默认最大持仓为总价值的10%
        });

        assetIds.push(assetId);
        emit AssetRegistered(assetId, contractAddress, standard);
    }

    function updateAssetStatus(string calldata assetId, AssetStatus status) external onlyAdmin {
        require(bytes(assets[assetId].assetId).length > 0, "Asset not found");
        assets[assetId].status = status;
        emit AssetStatusChanged(assetId, status);
    }

    function getAssetStatus(string calldata assetId) external view returns (AssetStatus) {
        require(bytes(assets[assetId].assetId).length > 0, "Asset not found");
        return assets[assetId].status;
    }

    function getAssetDetails(string calldata assetId) external view returns (
        address contractAddress,
        uint256 totalValuation,
        ComplianceStandard standard,
        AssetStatus status
    ) {
        require(bytes(assets[assetId].assetId).length > 0, "Asset not found");
        Asset storage asset = assets[assetId];
        return (
            asset.contractAddress,
            asset.totalValuation,
            asset.standard,
            asset.status
        );
    }

    // 设置持有者上限
    function setHolderLimit(uint256 limit) external onlyAdmin {
        // 为所有资产设置默认持有者上限
        for (uint i = 0; i < assetIds.length; i++) {
            assets[assetIds[i]].holderLimit = limit;
        }
    }

    // 设置单一账户最大持仓限制
    function setMaxHoldingPerAccount(uint256 limit) external onlyAdmin {
        // 为所有资产设置默认最大持仓限制
        for (uint i = 0; i < assetIds.length; i++) {
            assets[assetIds[i]].maxHoldingPerAccount = limit;
        }
    }

    // 白名单管理
    function addToWhitelist(address address_) external onlyAdmin {
        // 为所有资产合约添加白名单
        for (uint i = 0; i < assetIds.length; i++) {
            string memory assetId = assetIds[i];
            whitelist[assets[assetId].contractAddress][address_] = true;
        }
    }

    function removeFromWhitelist(address address_) external onlyAdmin {
        // 从所有资产合约中移除白名单
        for (uint i = 0; i < assetIds.length; i++) {
            string memory assetId = assetIds[i];
            whitelist[assets[assetId].contractAddress][address_] = false;
        }
    }

    function isWhitelisted(address address_) external view returns (bool) {
        // 检查是否在任何资产合约的白名单中
        for (uint i = 0; i < assetIds.length; i++) {
            string memory assetId = assetIds[i];
            if (whitelist[assets[assetId].contractAddress][address_]) {
                return true;
            }
        }
        return false;
    }

    // 合规规则检查
    function isTransferAllowed(address from, address to, uint256 amount) external view returns (bool, string memory) {
        // 检查发送方和接收方是否在黑名单
        if (blacklisted[from]) {
            return (false, "Sender is blacklisted");
        }
        if (blacklisted[to]) {
            return (false, "Recipient is blacklisted");
        }

        // 检查发送方和接收方是否通过KYC
        if (!kycVerified[from]) {
            return (false, "Sender KYC not verified");
        }
        if (!kycVerified[to]) {
            return (false, "Recipient KYC not verified");
        }

        // 这里应该根据具体的代币合约地址获取资产信息
        // 暂时使用第一个资产进行演示
        if (assetIds.length > 0) {
            string memory assetId = assetIds[0];
            Asset storage asset = assets[assetId];

            // 检查白名单
            if (!whitelist[asset.contractAddress][from] || !whitelist[asset.contractAddress][to]) {
                return (false, "Address not in whitelist");
            }

            // 检查持有者数量上限
            if (!tokenHolders[asset.contractAddress][to] && holderCount[asset.contractAddress] >= asset.holderLimit) {
                return (false, "Holder limit reached");
            }

            // 检查单一账户最大持仓限制
            // 这里应该获取实际的持仓数量，暂时模拟
            uint256 currentHolding = 0; // 实际项目中应该从代币合约获取
            if (currentHolding + amount > asset.maxHoldingPerAccount) {
                return (false, "Exceeds maximum holding per account");
            }
        }

        return (true, "Transfer allowed");
    }

    // 更新代币持有者信息
    function updateTokenHolder(address contractAddress, address holder, bool isHolder) external {
        // 这里应该只有代币合约可以调用
        if (isHolder && !tokenHolders[contractAddress][holder]) {
            tokenHolders[contractAddress][holder] = true;
            holderCount[contractAddress]++;
        } else if (!isHolder && tokenHolders[contractAddress][holder]) {
            tokenHolders[contractAddress][holder] = false;
            holderCount[contractAddress]--;
        }
    }
}
