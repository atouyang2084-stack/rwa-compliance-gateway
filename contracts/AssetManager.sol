// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./RWAToken.sol";
import "./OracleManager.sol";
import "./ComplianceRegistry.sol";

contract AssetManager {
    // 资产信息结构体
    struct Asset {
        string assetId;
        string name;
        string symbol;
        uint256 totalValue; // 资产总价值（单位：美分）
        uint256 totalTokens; // 已发行的代币数量
        address tokenAddress; // 对应的代币合约地址
        bool isActive; // 资产是否活跃
    }

    // 资产映射
    mapping(string => Asset) public assets;
    // 资产ID列表
    string[] public assetIds;

    // 事件定义
    event AssetCreated(string indexed assetId, string name, string symbol, uint256 initialValue);
    event Deposit(string indexed assetId, uint256 value, uint256 tokensMinted);
    event Redeem(string indexed assetId, uint256 tokensBurned, uint256 valueReleased);
    event AssetValueUpdated(string indexed assetId, uint256 newValue);
    event Paused();
    event Unpaused();

    // 权限控制
    address public admin;
    mapping(address => bool) public authorizedIssuers;
    
    // Oracle管理器
    OracleManager public oracleManager;
    // 合规注册表
    ComplianceRegistry public complianceRegistry;
    
    // 紧急暂停
    bool public paused = false;
    
    // 重入锁
    bool private _reentrancyLock = false;

    // 修饰符
    modifier onlyAdmin() {
        require(msg.sender == admin, "Not authorized");
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
        require(!_reentrancyLock, "ReentrancyGuard: reentrant call");
        _reentrancyLock = true;
        _;
        _reentrancyLock = false;
    }

    // 构造函数
    constructor(address _oracleManager, address _complianceRegistry) {
        admin = msg.sender;
        oracleManager = OracleManager(_oracleManager);
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
    }
    
    // 暂停合约
    function pause() external onlyAdmin {
        require(!paused, "Contract is already paused");
        paused = true;
        emit Paused();
    }
    
    // 恢复合约
    function unpause() external onlyAdmin {
        require(paused, "Contract is not paused");
        paused = false;
        emit Unpaused();
    }

    // 设置Oracle管理器
    function setOracleManager(address _oracleManager) external onlyAdmin {
        oracleManager = OracleManager(_oracleManager);
    }
    
    // 设置合规注册表
    function setComplianceRegistry(address _complianceRegistry) external onlyAdmin {
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
    }

    // 添加授权发行方
    function addAuthorizedIssuer(address issuer) external onlyAdmin {
        authorizedIssuers[issuer] = true;
    }

    // 移除授权发行方
    function removeAuthorizedIssuer(address issuer) external onlyAdmin {
        authorizedIssuers[issuer] = false;
    }

    // 更新资产价值（用于资产价值变化时）
    function updateAssetValue(string calldata assetId, uint256 newValue) public onlyAuthorizedIssuer whenNotPaused {
        // 检查资产是否存在
        require(bytes(assets[assetId].assetId).length > 0, "Asset not found");
        // 检查资产是否活跃
        require(assets[assetId].isActive, "Asset is not active");
        // 检查调用者是否KYC验证通过
        require(complianceRegistry.isKYCVerified(msg.sender), "KYC verification required");

        Asset storage asset = assets[assetId];
        uint256 oldValue = asset.totalValue;

        // 更新资产价值
        asset.totalValue = newValue;

        // 调整代币数量以保持1:1锚定
        if (newValue > oldValue) {
            // 增加代币
            uint256 tokenToMint = newValue - oldValue;
            asset.totalTokens += tokenToMint;
            RWAToken token = RWAToken(asset.tokenAddress);
            token.mint(msg.sender, tokenToMint);
        } else if (newValue < oldValue) {
            // 减少代币
            uint256 tokenToBurn = oldValue - newValue;
            asset.totalTokens -= tokenToBurn;
            // 从储备中销毁代币
            RWAToken token = RWAToken(asset.tokenAddress);
            token.burn(tokenToBurn);
        }

        // 触发事件
        emit AssetValueUpdated(assetId, newValue);
    }

    // 通过Oracle自动更新资产价值
    function updateAssetValueWithOracle(string calldata assetId, uint256 quantity) external onlyAuthorizedIssuer whenNotPaused {
        // 检查资产是否存在
        require(bytes(assets[assetId].assetId).length > 0, "Asset not found");
        // 检查调用者是否KYC验证通过
        require(complianceRegistry.isKYCVerified(msg.sender), "KYC verification required");

        // 使用Oracle计算资产价值
        uint256 newValue = oracleManager.calculateAssetValue(assetId, quantity);

        // 调用现有的更新资产价值函数
        updateAssetValue(assetId, newValue);
    }

    // 创建新资产
    function createAsset(
        string calldata assetId,
        string calldata name,
        string calldata symbol,
        uint256 initialValue,
        address complianceRegistry
    ) external onlyAuthorizedIssuer whenNotPaused returns (address) {
        // 检查资产ID是否已存在
        require(bytes(assets[assetId].assetId).length == 0, "Asset already exists");
        // 检查调用者是否KYC验证通过
        require(ComplianceRegistry(complianceRegistry).isKYCVerified(msg.sender), "KYC verification required");

        // 部署新的代币合约
        RWAToken token = new RWAToken(name, symbol, 2, complianceRegistry);

        // 初始化资产信息
        assets[assetId] = Asset({
            assetId: assetId,
            name: name,
            symbol: symbol,
            totalValue: initialValue,
            totalTokens: initialValue, // 1:1 锚定，初始代币数量等于资产价值（单位：美分）
            tokenAddress: address(token),
            isActive: true
        });

        // 添加到资产ID列表
        assetIds.push(assetId);

        // 铸造初始代币到调用者地址
        token.mint(msg.sender, initialValue);

        // 触发事件
        emit AssetCreated(assetId, name, symbol, initialValue);
        emit Deposit(assetId, initialValue, initialValue);

        return address(token);
    }

    // 存款（增加资产价值并铸造相应代币）
    function deposit(string calldata assetId, uint256 value) external onlyAuthorizedIssuer nonReentrant whenNotPaused {
        // 检查资产是否存在且活跃
        require(bytes(assets[assetId].assetId).length > 0, "Asset not found");
        require(assets[assetId].isActive, "Asset is not active");
        // 检查调用者是否KYC验证通过
        require(complianceRegistry.isKYCVerified(msg.sender), "KYC verification required");

        Asset storage asset = assets[assetId];

        // 更新资产价值和代币数量
        asset.totalValue += value;
        asset.totalTokens += value;

        // 铸造代币到调用者地址
        RWAToken token = RWAToken(asset.tokenAddress);
        token.mint(msg.sender, value);

        // 触发事件
        emit Deposit(assetId, value, value);
    }

    // 赎回（销毁代币并释放相应资产价值）
    function redeem(string calldata assetId, uint256 tokens) external nonReentrant whenNotPaused {
        // 检查资产是否存在且活跃
        require(bytes(assets[assetId].assetId).length > 0, "Asset not found");
        require(assets[assetId].isActive, "Asset is not active");
        // 检查调用者是否KYC验证通过
        require(complianceRegistry.isKYCVerified(msg.sender), "KYC verification required");

        Asset storage asset = assets[assetId];

        // 检查代币数量是否足够
        RWAToken token = RWAToken(asset.tokenAddress);
        require(token.balanceOf(msg.sender) >= tokens, "Insufficient tokens");

        // 更新资产价值和代币数量
        asset.totalValue -= tokens;
        asset.totalTokens -= tokens;

        // 销毁代币
        token.burn(tokens);

        // 触发事件
        emit Redeem(assetId, tokens, tokens);
    }

    // 暂停资产
    function pauseAsset(string calldata assetId) external onlyAdmin {
        require(bytes(assets[assetId].assetId).length > 0, "Asset not found");
        assets[assetId].isActive = false;
    }

    // 恢复资产
    function resumeAsset(string calldata assetId) external onlyAdmin {
        require(bytes(assets[assetId].assetId).length > 0, "Asset not found");
        assets[assetId].isActive = true;
    }

    // 获取资产数量
    function getAssetCount() external view returns (uint256) {
        return assetIds.length;
    }

    // 获取资产详情
    function getAssetDetails(string calldata assetId) external view returns (
        string memory, // name
        string memory, // symbol
        uint256, // totalValue
        uint256, // totalTokens
        address, // tokenAddress
        bool // isActive
    ) {
        Asset storage asset = assets[assetId];
        return (
            asset.name,
            asset.symbol,
            asset.totalValue,
            asset.totalTokens,
            asset.tokenAddress,
            asset.isActive
        );
    }

    // 检查资产与代币的锚定状态
    function checkPegStatus(string calldata assetId) external view returns (bool, uint256, uint256) {
        Asset storage asset = assets[assetId];
        bool isPegged = asset.totalValue == asset.totalTokens;
        return (isPegged, asset.totalValue, asset.totalTokens);
    }
}
