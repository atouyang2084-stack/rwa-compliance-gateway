// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ComplianceRegistry.sol";

interface IComplianceBalance {
    function balanceOf(address user) external view returns (uint256);
}

contract ComplianceEngine is ComplianceRegistry {
    struct Asset {
        string assetId;
        address token;
        uint256 totalValuation;
        ComplianceStandard standard;
        AssetStatus status;
        uint256 holderLimit;
        uint256 maxHoldingPerAccount;
    }

    address public immutable admin;
    mapping(address => bool) private kycVerified;
    mapping(address => string) private verificationIds;
    mapping(address => string) private kycDataHashes;
    mapping(address => bool) private blacklisted;
    mapping(address => mapping(Role => bool)) private roles;
    mapping(bytes32 => bool) private jurisdictions;
    mapping(bytes32 => bool) private restrictedJurisdictions;
    mapping(address => string) private addressJurisdictions;
    mapping(string => Asset) private assets;
    mapping(address => string) private assetIdByToken;
    mapping(address => mapping(address => bool)) private whitelist;
    mapping(address => mapping(address => bool)) public tokenHolders;
    mapping(address => uint256) public holderCount;

    event KYCVerified(address indexed user, string indexed verificationId, uint256 timestamp);
    event KYCDataHashed(address indexed user, string indexed dataHash, uint256 timestamp);
    event BlacklistUpdated(address indexed user, bool isBlacklisted);
    event RoleAssigned(address indexed user, Role role);
    event RoleRevoked(address indexed user, Role role);
    event AssetRegistered(string indexed assetId, address indexed token, ComplianceStandard standard);
    event AssetStatusChanged(string indexed assetId, AssetStatus status);
    event AssetValuationChanged(string indexed assetId, uint256 totalValuation);
    event AssetLimitsChanged(string indexed assetId, uint256 holderLimit, uint256 maxHoldingPerAccount);
    event WhitelistUpdated(address indexed token, address indexed user, bool allowed);
    event JurisdictionAdded(string indexed jurisdiction);
    event JurisdictionRestricted(string indexed jurisdiction, bool restricted);
    event AddressJurisdictionUpdated(address indexed user, string indexed jurisdiction);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized admin");
        _;
    }

    modifier onlyRegulator() {
        require(msg.sender == admin || roles[msg.sender][Role.Regulator], "Not authorized regulator");
        _;
    }

    modifier onlyIssuer() {
        require(msg.sender == admin || roles[msg.sender][Role.Issuer], "Not authorized issuer");
        _;
    }

    modifier onlyIssuerOrRegulator() {
        require(
            msg.sender == admin || roles[msg.sender][Role.Issuer] || roles[msg.sender][Role.Regulator],
            "Not authorized compliance operator"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
        roles[msg.sender][Role.Issuer] = true;
        roles[msg.sender][Role.Regulator] = true;
        _addJurisdiction("US");
        _addJurisdiction("CN");
        _addJurisdiction("EU");
        _addJurisdiction("JP");
    }

    function verifyKYC(address user, string calldata verificationId) external onlyRegulator returns (bool) {
        require(user != address(0), "Invalid user");
        require(bytes(verificationId).length > 0, "Verification ID required");
        kycVerified[user] = true;
        verificationIds[user] = verificationId;
        emit KYCVerified(user, verificationId, block.timestamp);
        return true;
    }

    function isKYCVerified(address user) external view returns (bool) {
        return kycVerified[user];
    }

    function getVerificationId(address user) external view returns (string memory) {
        return verificationIds[user];
    }

    function setKYCDataHash(address user, string calldata dataHash) external onlyRegulator {
        require(bytes(dataHash).length > 0, "Data hash required");
        kycDataHashes[user] = dataHash;
        emit KYCDataHashed(user, dataHash, block.timestamp);
    }

    function getKYCDataHash(address user) external view returns (string memory) {
        return kycDataHashes[user];
    }

    function addToBlacklist(address user) external onlyRegulator {
        blacklisted[user] = true;
        emit BlacklistUpdated(user, true);
    }

    function removeFromBlacklist(address user) external onlyRegulator {
        blacklisted[user] = false;
        emit BlacklistUpdated(user, false);
    }

    function isBlacklisted(address user) external view returns (bool) {
        return blacklisted[user];
    }

    function assignRole(address user, Role role) external onlyAdmin {
        require(user != address(0), "Invalid user");
        roles[user][role] = true;
        emit RoleAssigned(user, role);
    }

    function revokeRole(address user, Role role) external onlyAdmin {
        roles[user][role] = false;
        emit RoleRevoked(user, role);
    }

    function hasRole(address user, Role role) external view returns (bool) {
        return roles[user][role];
    }

    function addJurisdiction(string calldata jurisdiction) external onlyRegulator {
        _addJurisdiction(jurisdiction);
    }

    function _addJurisdiction(string memory jurisdiction) internal {
        bytes32 key = keccak256(bytes(jurisdiction));
        require(bytes(jurisdiction).length > 0, "Jurisdiction required");
        require(!jurisdictions[key], "Jurisdiction already exists");
        jurisdictions[key] = true;
        emit JurisdictionAdded(jurisdiction);
    }

    function restrictJurisdiction(string calldata jurisdiction, bool restricted) external onlyRegulator {
        bytes32 key = keccak256(bytes(jurisdiction));
        require(jurisdictions[key], "Jurisdiction not found");
        restrictedJurisdictions[key] = restricted;
        emit JurisdictionRestricted(jurisdiction, restricted);
    }

    function isJurisdictionRestricted(string calldata jurisdiction) external view returns (bool) {
        return restrictedJurisdictions[keccak256(bytes(jurisdiction))];
    }

    function setAddressJurisdiction(address user, string calldata jurisdiction) external onlyRegulator {
        require(jurisdictions[keccak256(bytes(jurisdiction))], "Jurisdiction not found");
        addressJurisdictions[user] = jurisdiction;
        emit AddressJurisdictionUpdated(user, jurisdiction);
    }

    function getAddressJurisdiction(address user) external view returns (string memory) {
        return addressJurisdictions[user];
    }

    function registerAsset(
        string calldata assetId,
        address token,
        ComplianceStandard standard,
        uint256 totalValuation
    ) external onlyIssuer {
        require(bytes(assetId).length > 0, "Asset ID required");
        require(token != address(0), "Invalid token");
        require(totalValuation > 0, "Valuation required");
        require(bytes(assets[assetId].assetId).length == 0, "Asset already exists");
        require(bytes(assetIdByToken[token]).length == 0, "Token already registered");

        assets[assetId] = Asset({
            assetId: assetId,
            token: token,
            totalValuation: totalValuation,
            standard: standard,
            status: AssetStatus.Active,
            holderLimit: 100,
            maxHoldingPerAccount: totalValuation
        });
        assetIdByToken[token] = assetId;
        emit AssetRegistered(assetId, token, standard);
    }

    function updateAssetStatus(string calldata assetId, AssetStatus status) external onlyRegulator {
        Asset storage asset = _asset(assetId);
        asset.status = status;
        emit AssetStatusChanged(assetId, status);
    }

    function updateAssetValuation(string calldata assetId, uint256 totalValuation) external onlyIssuer {
        Asset storage asset = _asset(assetId);
        if (asset.maxHoldingPerAccount == asset.totalValuation) {
            asset.maxHoldingPerAccount = totalValuation;
        }
        asset.totalValuation = totalValuation;
        emit AssetValuationChanged(assetId, totalValuation);
    }

    function getAssetStatus(string calldata assetId) external view returns (AssetStatus) {
        return _asset(assetId).status;
    }

    function getAssetDetails(string calldata assetId)
        external
        view
        returns (address token, uint256 totalValuation, ComplianceStandard standard, AssetStatus status)
    {
        Asset storage asset = _asset(assetId);
        return (asset.token, asset.totalValuation, asset.standard, asset.status);
    }

    function setAssetLimits(string calldata assetId, uint256 holderLimit_, uint256 maxHoldingPerAccount)
        external
        onlyRegulator
    {
        require(holderLimit_ > 0 && maxHoldingPerAccount > 0, "Invalid limits");
        Asset storage asset = _asset(assetId);
        asset.holderLimit = holderLimit_;
        asset.maxHoldingPerAccount = maxHoldingPerAccount;
        emit AssetLimitsChanged(assetId, holderLimit_, maxHoldingPerAccount);
    }

    function setWhitelisted(address token, address user, bool allowed) external onlyIssuerOrRegulator {
        require(bytes(assetIdByToken[token]).length > 0, "Token not registered");
        whitelist[token][user] = allowed;
        emit WhitelistUpdated(token, user, allowed);
    }

    function isWhitelisted(address token, address user) external view returns (bool) {
        return whitelist[token][user];
    }

    function isTransferAllowed(address token, address from, address to, uint256 amount)
        external
        view
        returns (bool, string memory)
    {
        string memory assetId = assetIdByToken[token];
        if (bytes(assetId).length == 0) return (false, "Token not registered");
        Asset storage asset = assets[assetId];
        if (asset.status != AssetStatus.Active) return (false, "Asset is not active");
        if (to == address(0) || amount == 0) return (false, "Invalid transfer");
        if (from != address(0)) {
            (bool senderAllowed, string memory senderReason) = _isIdentityAllowed(token, from, "Sender");
            if (!senderAllowed) return (false, senderReason);
        }
        (bool recipientAllowed, string memory recipientReason) = _isIdentityAllowed(token, to, "Recipient");
        if (!recipientAllowed) return (false, recipientReason);

        uint256 currentHolding = IComplianceBalance(token).balanceOf(to);
        if (!tokenHolders[token][to] && currentHolding == 0 && holderCount[token] >= asset.holderLimit) {
            return (false, "Holder limit reached");
        }
        if (currentHolding + amount > asset.maxHoldingPerAccount) {
            return (false, "Exceeds maximum holding per account");
        }
        return (true, "Transfer allowed");
    }

    function _isIdentityAllowed(address token, address user, string memory label)
        internal
        view
        returns (bool, string memory)
    {
        if (blacklisted[user]) return (false, string.concat(label, " is blacklisted"));
        if (!kycVerified[user]) return (false, string.concat(label, " KYC not verified"));
        string memory jurisdiction = addressJurisdictions[user];
        if (bytes(jurisdiction).length == 0) return (false, string.concat(label, " jurisdiction not set"));
        if (restrictedJurisdictions[keccak256(bytes(jurisdiction))]) {
            return (false, string.concat(label, " jurisdiction is restricted"));
        }
        if (!whitelist[token][user]) return (false, "Address not in whitelist");
        return (true, "");
    }

    function transferred(address from, address to) external {
        _requireRegisteredToken(msg.sender);
        _syncHolder(msg.sender, from);
        _syncHolder(msg.sender, to);
    }

    function created(address to) external {
        _requireRegisteredToken(msg.sender);
        _syncHolder(msg.sender, to);
    }

    function destroyed(address from) external {
        _requireRegisteredToken(msg.sender);
        _syncHolder(msg.sender, from);
    }

    function _syncHolder(address token, address holder) internal {
        if (holder == address(0)) return;
        bool hasBalance = IComplianceBalance(token).balanceOf(holder) > 0;
        if (hasBalance && !tokenHolders[token][holder]) {
            tokenHolders[token][holder] = true;
            holderCount[token] += 1;
        } else if (!hasBalance && tokenHolders[token][holder]) {
            tokenHolders[token][holder] = false;
            holderCount[token] -= 1;
        }
    }

    function _requireRegisteredToken(address token) internal view {
        require(bytes(assetIdByToken[token]).length > 0, "Caller is not a registered token");
    }

    function _asset(string memory assetId) internal view returns (Asset storage asset) {
        asset = assets[assetId];
        require(bytes(asset.assetId).length > 0, "Asset not found");
    }
}
