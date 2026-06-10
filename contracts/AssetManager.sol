// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RWAToken.sol";
import "./OracleManager.sol";
import "./ComplianceRegistry.sol";

contract AssetManager {
    struct Asset {
        string assetId;
        string name;
        string symbol;
        uint256 totalValue;
        uint256 totalTokens;
        address tokenAddress;
        bool isActive;
    }

    mapping(string => Asset) public assets;
    string[] public assetIds;
    address public immutable admin;
    mapping(address => bool) public authorizedIssuers;
    OracleManager public oracleManager;
    ComplianceRegistry public immutable complianceRegistry;
    bool public paused;
    bool private entered;

    event AssetCreated(string indexed assetId, string name, string symbol, uint256 initialValue, address token);
    event Deposit(string indexed assetId, uint256 value, uint256 tokensMinted);
    event Redeem(string indexed assetId, address indexed investor, uint256 tokensBurned, uint256 valueReleased);
    event AssetValueUpdated(string indexed assetId, uint256 newValue);
    event AssetStatusChanged(string indexed assetId, bool active);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized admin");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(authorizedIssuers[msg.sender], "Not authorized issuer");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier nonReentrant() {
        require(!entered, "Reentrant call");
        entered = true;
        _;
        entered = false;
    }

    constructor(address oracleManager_, address complianceRegistry_) {
        require(oracleManager_ != address(0) && complianceRegistry_ != address(0), "Invalid dependency");
        admin = msg.sender;
        authorizedIssuers[msg.sender] = true;
        oracleManager = OracleManager(oracleManager_);
        complianceRegistry = ComplianceRegistry(complianceRegistry_);
    }

    function pause() external onlyAdmin {
        paused = true;
    }

    function unpause() external onlyAdmin {
        paused = false;
    }

    function setOracleManager(address oracleManager_) external onlyAdmin {
        require(oracleManager_ != address(0), "Invalid oracle");
        oracleManager = OracleManager(oracleManager_);
    }

    function addAuthorizedIssuer(address issuer) external onlyAdmin {
        authorizedIssuers[issuer] = true;
    }

    function removeAuthorizedIssuer(address issuer) external onlyAdmin {
        authorizedIssuers[issuer] = false;
    }

    function createAsset(
        string calldata assetId,
        string calldata name,
        string calldata symbol,
        uint256 initialValue
    ) external onlyAuthorizedIssuer whenNotPaused returns (address) {
        require(bytes(assetId).length > 0 && bytes(assets[assetId].assetId).length == 0, "Invalid or duplicate asset");
        require(initialValue > 0, "Initial value required");
        require(complianceRegistry.isKYCVerified(msg.sender), "KYC verification required");

        RWAToken token = new RWAToken(name, symbol, 2, address(complianceRegistry));
        assets[assetId] = Asset(assetId, name, symbol, initialValue, initialValue, address(token), true);
        assetIds.push(assetId);

        complianceRegistry.registerAsset(
            assetId, address(token), ComplianceRegistry.ComplianceStandard.ERC3643, initialValue
        );
        complianceRegistry.setWhitelisted(address(token), msg.sender, true);
        token.mint(msg.sender, initialValue);

        emit AssetCreated(assetId, name, symbol, initialValue, address(token));
        emit Deposit(assetId, initialValue, initialValue);
        return address(token);
    }

    function deposit(string calldata assetId, uint256 value)
        external
        onlyAuthorizedIssuer
        nonReentrant
        whenNotPaused
    {
        require(value > 0, "Value required");
        Asset storage asset = _activeAsset(assetId);
        require(complianceRegistry.isKYCVerified(msg.sender), "KYC verification required");
        asset.totalValue += value;
        asset.totalTokens += value;
        complianceRegistry.updateAssetValuation(assetId, asset.totalValue);
        RWAToken(asset.tokenAddress).mint(msg.sender, value);
        emit Deposit(assetId, value, value);
    }

    function redeem(string calldata assetId, uint256 tokens) external nonReentrant whenNotPaused {
        require(tokens > 0, "Tokens required");
        Asset storage asset = _activeAsset(assetId);
        require(complianceRegistry.isKYCVerified(msg.sender), "KYC verification required");
        require(tokens <= asset.totalTokens, "Exceeds asset supply");
        RWAToken(asset.tokenAddress).burnFrom(msg.sender, tokens);
        asset.totalValue -= tokens;
        asset.totalTokens -= tokens;
        complianceRegistry.updateAssetValuation(assetId, asset.totalValue);
        emit Redeem(assetId, msg.sender, tokens, tokens);
    }

    function updateAssetValue(string calldata assetId, uint256 newValue)
        public
        onlyAuthorizedIssuer
        nonReentrant
        whenNotPaused
    {
        require(newValue > 0, "Value required");
        Asset storage asset = _activeAsset(assetId);
        uint256 oldValue = asset.totalValue;
        RWAToken token = RWAToken(asset.tokenAddress);
        if (newValue > oldValue) {
            uint256 increase = newValue - oldValue;
            complianceRegistry.updateAssetValuation(assetId, newValue);
            token.mint(msg.sender, increase);
            asset.totalTokens += increase;
        } else if (newValue < oldValue) {
            uint256 decrease = oldValue - newValue;
            token.burnFrom(msg.sender, decrease);
            asset.totalTokens -= decrease;
            complianceRegistry.updateAssetValuation(assetId, newValue);
        }
        asset.totalValue = newValue;
        emit AssetValueUpdated(assetId, newValue);
    }

    function updateAssetValueWithOracle(string calldata assetId, uint256 quantity)
        external
        onlyAuthorizedIssuer
        whenNotPaused
    {
        updateAssetValue(assetId, oracleManager.calculateAssetValue(assetId, quantity));
    }

    function pauseAsset(string calldata assetId) external onlyAdmin {
        Asset storage asset = _asset(assetId);
        asset.isActive = false;
        complianceRegistry.updateAssetStatus(assetId, ComplianceRegistry.AssetStatus.Frozen);
        emit AssetStatusChanged(assetId, false);
    }

    function resumeAsset(string calldata assetId) external onlyAdmin {
        Asset storage asset = _asset(assetId);
        asset.isActive = true;
        complianceRegistry.updateAssetStatus(assetId, ComplianceRegistry.AssetStatus.Active);
        emit AssetStatusChanged(assetId, true);
    }

    function getAssetCount() external view returns (uint256) {
        return assetIds.length;
    }

    function getAssetDetails(string calldata assetId)
        external
        view
        returns (string memory, string memory, uint256, uint256, address, bool)
    {
        Asset storage asset = _asset(assetId);
        return (asset.name, asset.symbol, asset.totalValue, asset.totalTokens, asset.tokenAddress, asset.isActive);
    }

    function checkPegStatus(string calldata assetId) external view returns (bool, uint256, uint256) {
        Asset storage asset = _asset(assetId);
        return (asset.totalValue == asset.totalTokens, asset.totalValue, asset.totalTokens);
    }

    function _activeAsset(string memory assetId) internal view returns (Asset storage asset) {
        asset = _asset(assetId);
        require(asset.isActive, "Asset is not active");
    }

    function _asset(string memory assetId) internal view returns (Asset storage asset) {
        asset = assets[assetId];
        require(bytes(asset.assetId).length > 0, "Asset not found");
    }
}
