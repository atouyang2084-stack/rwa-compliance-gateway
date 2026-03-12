// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ComplianceRegistry.sol";

contract RWAToken {
    // 代币基本信息
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;

    // 合规注册表
    ComplianceRegistry public complianceRegistry;

    // 余额映射
    mapping(address => uint256) public balanceOf;
    // 授权映射
    mapping(address => mapping(address => uint256)) public allowance;

    // 事件定义
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);

    // 构造函数
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        address _complianceRegistry
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        complianceRegistry = ComplianceRegistry(_complianceRegistry);
    }

    // 转账函数
    function transfer(address to, uint256 value) public returns (bool) {
        // 检查转账是否允许
        (bool allowed, string memory reason) = complianceRegistry.isTransferAllowed(msg.sender, to, value);
        require(allowed, reason);

        // 检查余额
        require(balanceOf[msg.sender] >= value, "Insufficient balance");

        // 执行转账
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;

        // 触发转账事件
        emit Transfer(msg.sender, to, value);

        return true;
    }

    // 授权函数
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    // 授权转账函数
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        // 检查转账是否允许
        (bool allowed, string memory reason) = complianceRegistry.isTransferAllowed(from, to, value);
        require(allowed, reason);

        // 检查余额和授权
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");

        // 执行转账
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;

        // 触发转账事件
        emit Transfer(from, to, value);

        return true;
    }

    // 铸造函数（仅限合规注册表授权的发行方）
    function mint(address to, uint256 value) public {
        // 检查调用者是否为发行方
        require(complianceRegistry.hasRole(msg.sender, ComplianceRegistry.Role.Issuer), "Not authorized issuer");

        // 执行铸造
        totalSupply += value;
        balanceOf[to] += value;

        // 触发铸造事件
        emit Mint(to, value);
        emit Transfer(address(0), to, value);
    }

    // 销毁函数
    function burn(uint256 value) public {
        // 检查余额
        require(balanceOf[msg.sender] >= value, "Insufficient balance");

        // 执行销毁
        totalSupply -= value;
        balanceOf[msg.sender] -= value;

        // 触发销毁事件
        emit Burn(msg.sender, value);
        emit Transfer(msg.sender, address(0), value);
    }

    // 获取代币信息
    function getTokenInfo() public view returns (
        string memory, 
        string memory, 
        uint8, 
        uint256
    ) {
        return (name, symbol, decimals, totalSupply);
    }

    // 检查地址是否合规
    function isCompliant(address user) public view returns (bool) {
        return complianceRegistry.isKYCVerified(user) && !complianceRegistry.isBlacklisted(user);
    }
}
