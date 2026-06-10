// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ComplianceRegistry.sol";

contract RWAToken {
    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;
    ComplianceRegistry public immutable complianceRegistry;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    bool public paused;
    bool private entered;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Paused();
    event Unpaused();

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

    constructor(string memory name_, string memory symbol_, uint8 decimals_, address registry_) {
        require(registry_ != address(0), "Invalid registry");
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        complianceRegistry = ComplianceRegistry(registry_);
    }

    function pause() external {
        require(complianceRegistry.hasRole(msg.sender, ComplianceRegistry.Role.Regulator), "Not authorized regulator");
        require(!paused, "Contract is already paused");
        paused = true;
        emit Paused();
    }

    function unpause() external {
        require(complianceRegistry.hasRole(msg.sender, ComplianceRegistry.Role.Regulator), "Not authorized regulator");
        require(paused, "Contract is not paused");
        paused = false;
        emit Unpaused();
    }

    function transfer(address to, uint256 value) external nonReentrant whenNotPaused returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external whenNotPaused returns (bool) {
        require(spender != address(0), "Invalid spender");
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external nonReentrant whenNotPaused returns (bool) {
        uint256 currentAllowance = allowance[from][msg.sender];
        require(currentAllowance >= value, "Insufficient allowance");
        allowance[from][msg.sender] = currentAllowance - value;
        emit Approval(from, msg.sender, allowance[from][msg.sender]);
        _transfer(from, to, value);
        return true;
    }

    function mint(address to, uint256 value) external nonReentrant whenNotPaused {
        require(complianceRegistry.hasRole(msg.sender, ComplianceRegistry.Role.Issuer), "Not authorized issuer");
        (bool allowed, string memory reason) =
            complianceRegistry.isTransferAllowed(address(this), address(0), to, value);
        require(allowed, reason);
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
        complianceRegistry.created(to);
    }

    function burn(uint256 value) external nonReentrant whenNotPaused {
        _burn(msg.sender, value);
    }

    function burnFrom(address from, uint256 value) external nonReentrant whenNotPaused {
        require(complianceRegistry.hasRole(msg.sender, ComplianceRegistry.Role.Issuer), "Not authorized issuer");
        _burn(from, value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(balanceOf[from] >= value, "Insufficient balance");
        (bool allowed, string memory reason) = complianceRegistry.isTransferAllowed(address(this), from, to, value);
        require(allowed, reason);
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        complianceRegistry.transferred(from, to);
    }

    function _burn(address from, uint256 value) internal {
        require(value > 0, "Invalid burn");
        require(balanceOf[from] >= value, "Insufficient balance");
        require(isCompliant(from), "Sender is not compliant");
        balanceOf[from] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
        complianceRegistry.destroyed(from);
    }

    function isCompliant(address user) public view returns (bool) {
        return complianceRegistry.isKYCVerified(user) && !complianceRegistry.isBlacklisted(user);
    }
}
