import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function Home() {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)

  useEffect(() => {
    // 检查是否有以太坊钱包
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.BrowserProvider(window.ethereum)
      setProvider(provider)
    }
  }, [])

  const connectWallet = async () => {
    if (!provider) return
    try {
      const accounts = await provider.send('eth_requestAccounts', [])
      setAccount(accounts[0])
    } catch (error) {
      console.error('连接钱包失败:', error)
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>RWA Compliance Gateway</title>
        <meta name="description" content="连接链下现实世界资产与链上DeFi生态的合规准入网关" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">RWA Compliance Gateway</h1>
          <div className="flex items-center space-x-4">
            <Link href="/kyc" className="text-blue-600 hover:text-blue-800 font-medium">
              KYC验证
            </Link>
            {account ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{account.substring(0, 6)}...{account.substring(38)}</span>
                <button 
                  onClick={disconnectWallet}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  断开连接
                </button>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                连接钱包
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to RWA Compliance Gateway</h2>
          <p className="text-gray-600 mb-6">
            构建连接链下现实世界资产(RWA)与链上DeFi生态的合规准入网关
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-medium text-blue-700">身份与权限管理</h3>
              <p className="text-sm text-gray-600">集成第三方KYC服务，为用户生成链上可验证凭证</p>
            </div>
            <div className="bg-green-50 p-4 rounded-md">
              <h3 className="font-medium text-green-700">资产代币化引擎</h3>
              <p className="text-sm text-gray-600">支持ERC-3643或ERC-1400标准，实现资产价值与链上代币的1:1锚定</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-md">
              <h3 className="font-medium text-purple-700">合规规则引擎</h3>
              <p className="text-sm text-gray-600">可编程限制，包括持有者数量上限、单一账户最大持仓限制等</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
