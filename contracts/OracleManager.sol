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

    // 设置资产价格
    function setAssetPrice(string calldata assetId, uint256 price, uint8 decimals) external onlyAdmin {
        assetPrices[assetId] = price;
        assetPriceTimestamps[assetId] = block.timestamp;
        assetDecimals[assetId] = decimals;
        emit PriceUpdated(assetId, price, block.timestamp);
    }

    // 获取资产价格
    function getAssetPrice(string calldata assetId) public view returns (uint256, uint256) {
        require(assetPrices[assetId] > 0, "Price not set");
        return (assetPrices[assetId], assetPriceTimestamps[assetId]);
    }

    // 计算资产价值（考虑小数位数）
    function calculateAssetValue(string calldata assetId, uint256 quantity) public view returns (uint256) {
        (uint256 price, ) = getAssetPrice(assetId);
        uint8 decimals = assetDecimals[assetId];
        
        // 计算资产价值：价格 * 数量 / 10^小数位数
        return (price * quantity) / (10 ** uint256(decimals));
    }

    // 检查价格是否过期
    function isPriceFresh(string calldata assetId, uint256 maxAge) public view returns (bool) {
        (, uint256 timestamp) = getAssetPrice(assetId);
        return (block.timestamp - timestamp) <= maxAge;
    }
}
