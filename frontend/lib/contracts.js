// 智能合约配置
import { ethers } from 'ethers'

// 合约地址（Sepolia测试网）
export const contractAddresses = {
  complianceEngine: '0xcd2d48Dd1B02e9499B7Ca8a8BfAF7E9CD7Ee47FE',
  oracleManager: '0x6804CAc6d1162321A9451f65275C8A2124AEDeFb',
  assetManager: '0x868FA7447E5b4cf28B0d2C787dB8a15f57EB0868',
  rwaToken: '0x8221201A5c1c62bDfB0431beAD8843931f2A72aE'
}

// 简化的ABI（实际项目中应该从artifacts中导入完整ABI）
export const complianceEngineABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "string", "name": "data", "type": "string" }
    ],
    "name": "verifyKYC",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" }
    ],
    "name": "addToWhitelist",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "assetId", "type": "string" },
      { "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "internalType": "uint256", "name": "assetType", "type": "uint256" },
      { "internalType": "uint256", "name": "initialValue", "type": "uint256" }
    ],
    "name": "registerAsset",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "assetId", "type": "string" },
      { "internalType": "uint256", "name": "status", "type": "uint256" }
    ],
    "name": "updateAssetStatus",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "role", "type": "uint256" }
    ],
    "name": "assignRole",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

export const assetManagerABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "oracleManager", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "issuer", "type": "address" }
    ],
    "name": "addAuthorizedIssuer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "assetId", "type": "string" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "assetId", "type": "string" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "redeem",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

export const rwaTokenABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "symbol", "type": "string" },
      { "internalType": "uint8", "name": "decimals", "type": "uint8" },
      { "internalType": "address", "name": "complianceEngine", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

// 获取合约实例
export const getContract = (address, abi, provider) => {
  return new ethers.Contract(address, abi, provider)
}

// 获取签名者
export const getSigner = async (provider) => {
  if (!provider) return null
  try {
    const signer = await provider.getSigner()
    return signer
  } catch (error) {
    console.error('获取签名者失败:', error)
    return null
  }
}
