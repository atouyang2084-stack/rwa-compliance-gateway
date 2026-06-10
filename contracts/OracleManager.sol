// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OracleManager {
    // 资产价格映射
    mapping(string => uint256) public assetPrices;
    // 资产价格更新时间映射
    mapping(string => uint256) public assetPriceTimestamps;
    // 资产小数位数映射
    mapping(string => uint8) public assetDecimals;

    // 事件定义
    event PriceUpdated(string indexed assetId, uint256 price, uint256 timestamp);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event PriceUpdateDelayed(string indexed assetId, uint256 nextAllowedTime);

    // 权限控制
    address public primaryAdmin;
    mapping(address => bool) public admins;
    uint256 public adminCount;

    // 价格更新限制
    uint256 public constant PRICE_UPDATE_DELAY = 1 days; // 每24小时只能更新一次
    mapping(string => uint256) public nextAllowedUpdateTime;

    // 修饰符
    modifier onlyAdmin() {
        require(admins[msg.sender], "Not authorized admin");
        _;
    }

    // 构造函数
    constructor() {
        primaryAdmin = msg.sender;
        admins[msg.sender] = true;
        adminCount = 1;
    }

    // 添加管理员
    function addAdmin(address newAdmin) external {
        require(msg.sender == primaryAdmin, "Only primary admin can add admins");
        require(newAdmin != address(0), "Invalid admin address");
        require(!admins[newAdmin], "Already an admin");
        
        admins[newAdmin] = true;
        adminCount++;
        emit AdminAdded(newAdmin);
    }

    // 移除管理员
    function removeAdmin(address adminAddress) external {
        require(msg.sender == primaryAdmin, "Only primary admin can remove admins");
        require(adminAddress != primaryAdmin, "Cannot remove primary admin");
        require(admins[adminAddress], "Not an admin");
        
        admins[adminAddress] = false;
        adminCount--;
        emit AdminRemoved(adminAddress);
    }

    // 设置资产价格（带时间限制）
    function setAssetPrice(string calldata assetId, uint256 price, uint8 decimals) external onlyAdmin {
        require(price > 0, "Price must be greater than 0");
        
        // 检查是否超过价格更新频率限制
        if (nextAllowedUpdateTime[assetId] > 0) {
            require(block.timestamp >= nextAllowedUpdateTime[assetId], "Price update too frequent");
        }

        assetPrices[assetId] = price;
        assetPriceTimestamps[assetId] = block.timestamp;
        assetDecimals[assetId] = decimals;
        
        // 设置下一次允许更新的时间
        nextAllowedUpdateTime[assetId] = block.timestamp + PRICE_UPDATE_DELAY;
        
        emit PriceUpdated(assetId, price, block.timestamp);
        
        // 如果更新太频繁，发出警告
        if (block.timestamp < nextAllowedUpdateTime[assetId] - PRICE_UPDATE_DELAY + 1 days) {
            emit PriceUpdateDelayed(assetId, nextAllowedUpdateTime[assetId]);
        }
    }

    // 获取资产价格
    function getAssetPrice(string calldata assetId) public view returns (uint256, uint256) {
        require(assetPrices[assetId] > 0, "Price not set");
        return (assetPrices[assetId], assetPriceTimestamps[assetId]);
    }

    // 计算资产价值（考虑小数位数，带价格新鲜度检查）
    function calculateAssetValue(string calldata assetId, uint256 quantity) public view returns (uint256) {
        (uint256 price,) = getAssetPrice(assetId);
        uint8 decimals = assetDecimals[assetId];
        
        // 检查价格是否过期（默认24小时）
        require(isPriceFresh(assetId, 1 days), "Price is stale");
        
        // 计算资产价值：价格 * 数量 / 10^小数位数
        return (price * quantity) / (10 ** uint256(decimals));
    }

    // 检查价格是否新鲜
    function isPriceFresh(string calldata assetId, uint256 maxAge) public view returns (bool) {
        (, uint256 timestamp) = getAssetPrice(assetId);
        return (block.timestamp - timestamp) <= maxAge;
    }

    // 批量设置资产价格
    function setBatchAssetPrices(
        string[] calldata assetIds,
        uint256[] calldata prices,
        uint8[] calldata decimalsArray
    ) external onlyAdmin {
        require(assetIds.length == prices.length, "Array length mismatch");
        require(prices.length == decimalsArray.length, "Array length mismatch");

        for (uint256 i = 0; i < assetIds.length; i++) {
            // 检查是否超过价格更新频率限制
            if (nextAllowedUpdateTime[assetIds[i]] > 0) {
                require(block.timestamp >= nextAllowedUpdateTime[assetIds[i]], "Price update too frequent");
            }

            assetPrices[assetIds[i]] = prices[i];
            assetPriceTimestamps[assetIds[i]] = block.timestamp;
            assetDecimals[assetIds[i]] = decimalsArray[i];
            
            // 设置下一次允许更新的时间
            nextAllowedUpdateTime[assetIds[i]] = block.timestamp + PRICE_UPDATE_DELAY;
            
            emit PriceUpdated(assetIds[i], prices[i], block.timestamp);
        }
    }

    // 获取下一次允许更新时间
    function getNextAllowedUpdateTime(string calldata assetId) public view returns (uint256) {
        return nextAllowedUpdateTime[assetId];
    }

    // 紧急更新价格（忽略时间限制，仅限主管理员）
    function emergencySetAssetPrice(string calldata assetId, uint256 price, uint8 decimals) external {
        require(msg.sender == primaryAdmin, "Only primary admin can perform emergency update");
        require(price > 0, "Price must be greater than 0");

        assetPrices[assetId] = price;
        assetPriceTimestamps[assetId] = block.timestamp;
        assetDecimals[assetId] = decimals;
        
        emit PriceUpdated(assetId, price, block.timestamp);
    }
}
