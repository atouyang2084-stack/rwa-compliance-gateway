// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ComplianceRegistry {
    enum Role {
        Issuer,
        Investor,
        Custodian,
        Regulator
    }

    enum AssetStatus {
        Pending,
        Active,
        Frozen
    }

    enum ComplianceStandard {
        ERC3643,
        ERC1400
    }

    function verifyKYC(address user, string calldata verificationId) external returns (bool);
    function isKYCVerified(address user) external view returns (bool);
    function getVerificationId(address user) external view returns (string memory);
    function setKYCDataHash(address user, string calldata dataHash) external;
    function getKYCDataHash(address user) external view returns (string memory);

    function addToBlacklist(address user) external;
    function removeFromBlacklist(address user) external;
    function isBlacklisted(address user) external view returns (bool);

    function assignRole(address user, Role role) external;
    function revokeRole(address user, Role role) external;
    function hasRole(address user, Role role) external view returns (bool);

    function addJurisdiction(string calldata jurisdiction) external;
    function restrictJurisdiction(string calldata jurisdiction, bool restricted) external;
    function isJurisdictionRestricted(string calldata jurisdiction) external view returns (bool);
    function setAddressJurisdiction(address user, string calldata jurisdiction) external;
    function getAddressJurisdiction(address user) external view returns (string memory);

    function registerAsset(
        string calldata assetId,
        address token,
        ComplianceStandard standard,
        uint256 totalValuation
    ) external;
    function updateAssetStatus(string calldata assetId, AssetStatus status) external;
    function updateAssetValuation(string calldata assetId, uint256 totalValuation) external;
    function getAssetStatus(string calldata assetId) external view returns (AssetStatus);
    function getAssetDetails(string calldata assetId)
        external
        view
        returns (address token, uint256 totalValuation, ComplianceStandard standard, AssetStatus status);
    function getAssetManager(string calldata assetId) external view returns (address);
    function setAssetLimits(string calldata assetId, uint256 holderLimit, uint256 maxHoldingPerAccount) external;

    function setWhitelisted(address token, address user, bool allowed) external;
    function isWhitelisted(address token, address user) external view returns (bool);
    function isTransferAllowed(address token, address from, address to, uint256 amount)
        external
        view
        returns (bool, string memory);

    function transferred(address from, address to) external;
    function created(address to) external;
    function destroyed(address from) external;
}
