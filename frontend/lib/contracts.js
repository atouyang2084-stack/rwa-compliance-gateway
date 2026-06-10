import { ethers } from 'ethers'

export const contractAddresses = {
  complianceEngine: process.env.NEXT_PUBLIC_COMPLIANCE_ENGINE_ADDRESS || '',
  oracleManager: process.env.NEXT_PUBLIC_ORACLE_MANAGER_ADDRESS || '',
  assetManager: process.env.NEXT_PUBLIC_ASSET_MANAGER_ADDRESS || ''
}

export const complianceEngineABI = [
  'function verifyKYC(address user, string verificationId) returns (bool)',
  'function isKYCVerified(address user) view returns (bool)',
  'function setKYCDataHash(address user, string dataHash)',
  'function getKYCDataHash(address user) view returns (string)',
  'function assignRole(address user, uint8 role)',
  'function hasRole(address user, uint8 role) view returns (bool)',
  'function setAddressJurisdiction(address user, string jurisdiction)',
  'function setWhitelisted(address token, address user, bool allowed)',
  'function updateAssetStatus(string assetId, uint8 status)',
  'function updateAssetValuation(string assetId, uint256 totalValuation)',
  'function getAssetDetails(string assetId) view returns (address token, uint256 totalValuation, uint8 standard, uint8 status)',
  'event KYCVerified(address indexed user, string indexed verificationId, uint256 timestamp)',
  'event AssetRegistered(string indexed assetId, address indexed token, uint8 standard)',
  'event AssetStatusChanged(string indexed assetId, uint8 status)'
]

export const assetManagerABI = [
  'function createAsset(string assetId, string name, string symbol, uint256 initialValue) returns (address)',
  'function deposit(string assetId, uint256 value)',
  'function redeem(string assetId, uint256 tokens)',
  'function updateAssetValue(string assetId, uint256 newValue)',
  'function pauseAsset(string assetId)',
  'function resumeAsset(string assetId)',
  'function getAssetDetails(string assetId) view returns (string name, string symbol, uint256 totalValue, uint256 totalTokens, address tokenAddress, bool isActive)',
  'function checkPegStatus(string assetId) view returns (bool isPegged, uint256 totalValue, uint256 totalTokens)',
  'event AssetCreated(string indexed assetId, string name, string symbol, uint256 initialValue, address token)',
  'event Deposit(string indexed assetId, uint256 value, uint256 tokensMinted)',
  'event Redeem(string indexed assetId, address indexed investor, uint256 tokensBurned, uint256 valueReleased)'
]

export const rwaTokenABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address user) view returns (uint256)',
  'function transfer(address to, uint256 value) returns (bool)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function transferFrom(address from, address to, uint256 value) returns (bool)',
  'function burn(uint256 value)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]

export function getContract(address, abi, runner) {
  if (!ethers.isAddress(address)) {
    throw new Error('Contract address is not configured')
  }
  return new ethers.Contract(address, abi, runner)
}

export async function getSigner(provider) {
  if (!provider) {
    throw new Error('Wallet provider is required')
  }
  return provider.getSigner()
}
