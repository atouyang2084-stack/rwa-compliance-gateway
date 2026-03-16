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
    <div className="min-h-screen bg-light-color page-transition">
      {/* 导航栏 */}
      <nav className="bg-white shadow-md py-4 sticky top-0 z-50">
        <div className="container">
          <div className="nav">
            <div className="nav-brand">
              <div className="nav-brand-logo">RWA</div>
              <div className="nav-brand-name">RWA Compliance Gateway</div>
            </div>
            <div className="nav-links">
              <Link href="/" className="nav-link active">首页</Link>
              <Link href="/kyc" className="nav-link">KYC验证</Link>
              <Link href="/assets" className="nav-link">资产管理</Link>
              {account ? (
                <>
                  <div className="bg-gray-light px-3 py-1 rounded-full text-sm font-medium text-gray-color border border-gray-medium">
                    {account.substring(0, 6)}...{account.substring(38)}
                  </div>
                  <button 
                    onClick={disconnectWallet}
                    className="btn btn-outline"
                  >
                    断开连接
                  </button>
                </>
              ) : (
                <button 
                  onClick={connectWallet}
                  className="btn btn-primary"
                >
                  连接钱包
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero区域 */}
      <section className="py-20 bg-gradient-to-r from-primary-color to-primary-dark text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">RWA Compliance Gateway</h1>
            <p className="text-xl mb-10 opacity-90">
              连接现实世界资产与DeFi生态的合规准入网关
            </p>
            <p className="text-lg mb-12 opacity-80 max-w-2xl mx-auto">
              构建合规、安全、透明的资产代币化解决方案，为机构资产上链提供一站式服务
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/assets" className="btn" style={{ backgroundColor: 'white', color: 'var(--primary-color)', minWidth: '200px' }}>
                开始资产代币化
              </Link>
              <Link href="/kyc" className="btn btn-outline" style={{ borderColor: 'white', color: 'white', minWidth: '200px' }}>
                完成KYC验证
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 使用流程 */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4 text-primary-dark">使用流程</h2>
          <p className="text-gray-color text-center mb-12 max-w-2xl mx-auto">
            按照以下步骤开始您的RWA资产代币化之旅
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-color">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">完成KYC验证</h3>
              <p className="text-gray-color">提交个人信息，完成身份验证，获得链上可验证凭证</p>
            </div>
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-color">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">连接钱包</h3>
              <p className="text-gray-color">连接您的以太坊钱包，确保安全访问系统</p>
            </div>
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-color">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">创建资产</h3>
              <p className="text-gray-color">创建您的RWA资产，设置资产参数和合规规则</p>
            </div>
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-color">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">管理资产</h3>
              <p className="text-gray-color">进行存款、赎回等操作，管理您的资产组合</p>
            </div>
          </div>
        </div>
      </section>

      {/* 核心功能 */}
      <section className="py-16 bg-gray-light">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4 text-primary-dark">核心功能</h2>
          <p className="text-gray-color text-center mb-12 max-w-2xl mx-auto">
            我们提供全面的RWA资产代币化解决方案
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="banking-card">
              <h3 className="text-xl font-semibold mb-3 text-primary-dark">身份与权限管理</h3>
              <p className="text-gray-color">
                集成第三方KYC服务，为用户生成链上可验证凭证，实现基于角色的访问控制，确保合规性
              </p>
            </div>
            <div className="banking-card">
              <h3 className="text-xl font-semibold mb-3 text-primary-dark">资产代币化引擎</h3>
              <p className="text-gray-color">
                支持ERC-3643或ERC-1400标准，实现资产价值与链上代币的1:1锚定，确保资产安全
              </p>
            </div>
            <div className="banking-card">
              <h3 className="text-xl font-semibold mb-3 text-primary-dark">合规规则引擎</h3>
              <p className="text-gray-color">
                可编程限制，包括持有者数量上限、单一账户最大持仓限制、转账白名单强制校验
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 安全保障 */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4 text-primary-dark">安全保障</h2>
          <p className="text-gray-color text-center mb-12 max-w-2xl mx-auto">
            我们采用多层次安全措施，确保您的资产安全
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-secondary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-secondary-color">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">智能合约安全</h3>
              <p className="text-gray-color">经过多重审计的智能合约，确保资产交易安全</p>
            </div>
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-info-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-info-color">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">合规监控</h3>
              <p className="text-gray-color">实时监控交易，确保符合监管要求</p>
            </div>
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-warning-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-warning-color">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">风险控制</h3>
              <p className="text-gray-color">多层次风险控制机制，保障资产安全</p>
            </div>
          </div>
        </div>
      </section>

      {/* 底部 */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div>
              <h3 className="text-xl font-bold mb-2">RWA Compliance Gateway</h3>
              <p className="text-gray-color">连接现实世界资产与DeFi生态</p>
            </div>
            <div className="footer-links">
              <Link href="/" className="footer-link">首页</Link>
              <Link href="/kyc" className="footer-link">KYC验证</Link>
              <Link href="/assets" className="footer-link">资产管理</Link>
            </div>
          </div>
          <div className="footer-copyright">
            © 2026 RWA Compliance Gateway. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
