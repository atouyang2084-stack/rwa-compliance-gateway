// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ComplianceRegistry {
    // 角色定义
enum Role {
        Issuer, // 资产发行方
        Investor, // 投资者
        Custodian, // 托管方
        Regulator // 监管者
    }

    // 资产状态
enum AssetStatus {
        Pending, // 待审核
        Active, // 活跃
        Frozen // 冻结
    }

    // 合规标准
enum ComplianceStandard {
        ERC3643,
        ERC1400
    }

    // 事件定义
    event KYCVerified(address indexed user, string indexed verificationId, uint256 timestamp);
    event BlacklistUpdated(address indexed address_, bool isBlacklisted);
    event RoleAssigned(address indexed user, Role role);
    event AssetRegistered(string indexed assetId, address indexed contractAddress, ComplianceStandard standard);
    event AssetStatusChanged(string indexed assetId, AssetStatus status);

    // KYC验证相关
    function verifyKYC(address user, string calldata verificationData) external returns (bool);
    function isKYCVerified(address user) external view returns (bool);
    function getVerificationId(address user) external view returns (string memory);

    // 黑名单管理
    function addToBlacklist(address address_) external;
    function removeFromBlacklist(address address_) external;
    function isBlacklisted(address address_) external view returns (bool);

    // 角色管理
    function assignRole(address user, Role role) external;
    function revokeRole(address user, Role role) external;
    function hasRole(address user, Role role) external view returns (bool);

    // 资产管理
    function registerAsset(string calldata assetId, address contractAddress, ComplianceStandard standard, uint256 totalValuation) external;
    function updateAssetStatus(string calldata assetId, AssetStatus status) external;
    function getAssetStatus(string calldata assetId) external view returns (AssetStatus);
    function getAssetDetails(string calldata assetId) external view returns (
        address contractAddress,
        uint256 totalValuation,
        ComplianceStandard standard,
        AssetStatus status
    );

    // 合规规则检查
    function isTransferAllowed(address from, address to, uint256 amount) external view returns (bool, string memory);
    function setHolderLimit(uint256 limit) external;
    function setMaxHoldingPerAccount(uint256 limit) external;
    function addToWhitelist(address address_) external;
    function removeFromWhitelist(address address_) external;
    function isWhitelisted(address address_) external view returns (bool);
}
