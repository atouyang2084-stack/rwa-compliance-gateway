import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function Home() {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // 检查是否有以太坊钱包
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.BrowserProvider(window.ethereum)
      setProvider(provider)
    }

    // 检查是否已登录
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
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
              <Link href="/" className="nav-link active">Home</Link>
              <Link href="/kyc" className="nav-link">KYC Verification</Link>
              <Link href="/assets" className="nav-link">Asset Management</Link>
              {user && user.role === 'regulator' && (
                <Link href="/compliance" className="nav-link">Compliance Management</Link>
              )}
              {user ? (
                <>
                  <div className="bg-gray-light px-3 py-1 rounded-full text-sm font-medium text-gray-color border border-gray-medium">
                    {user.username} ({user.role})
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('token')
                      localStorage.removeItem('user')
                      setUser(null)
                      window.location.href = '/'
                    }}
                    className="btn btn-outline"
                  >
Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-outline">Login</Link>
                  <Link href="/register" className="btn btn-primary">Register</Link>
                </>
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
              Compliance gateway connecting real-world assets with DeFi ecosystem
            </p>
            <p className="text-lg mb-12 opacity-80 max-w-2xl mx-auto">
              Building compliant, secure, and transparent asset tokenization solutions, providing one-stop services for institutional asset onboarding
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/assets" className="btn" style={{ backgroundColor: 'white', color: 'var(--primary-color)', minWidth: '200px' }}>
                Start Asset Tokenization
              </Link>
              <Link href="/kyc" className="btn btn-outline" style={{ borderColor: 'white', color: 'white', minWidth: '200px' }}>
                Complete KYC Verification
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 使用流程 */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4 text-primary-dark">Usage Process</h2>
          <p className="text-gray-color text-center mb-12 max-w-2xl mx-auto">
            Follow these steps to start your RWA asset tokenization journey
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-color">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Complete KYC Verification</h3>
              <p className="text-gray-color">Submit personal information, complete identity verification, and obtain on-chain verifiable credentials</p>
            </div>
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-color">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Connect Wallet</h3>
              <p className="text-gray-color">Connect your Ethereum wallet to ensure secure access to the system</p>
            </div>
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-color">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Create Asset</h3>
              <p className="text-gray-color">Create your RWA asset, set asset parameters and compliance rules</p>
            </div>
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-color">4</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Manage Asset</h3>
              <p className="text-gray-color">Perform deposit, redemption, and other operations to manage your asset portfolio</p>
            </div>
          </div>
        </div>
      </section>

      {/* 核心功能 */}
      <section className="py-16 bg-gray-light">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4 text-primary-dark">Core Features</h2>
          <p className="text-gray-color text-center mb-12 max-w-2xl mx-auto">
            We provide comprehensive RWA asset tokenization solutions
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="banking-card">
              <h3 className="text-xl font-semibold mb-3 text-primary-dark">Identity and Permission Management</h3>
              <p className="text-gray-color">
                Integrates third-party KYC services, generates on-chain verifiable credentials for users, implements role-based access control, and ensures compliance
              </p>
            </div>
            <div className="banking-card">
              <h3 className="text-xl font-semibold mb-3 text-primary-dark">Asset Tokenization Engine</h3>
              <p className="text-gray-color">
                Supports ERC-3643 or ERC-1400 standards, implements 1:1 anchoring between asset value and on-chain tokens, ensuring asset security
              </p>
            </div>
            <div className="banking-card">
              <h3 className="text-xl font-semibold mb-3 text-primary-dark">Compliance Rule Engine</h3>
              <p className="text-gray-color">
                Programmable restrictions, including holder quantity limits, single account maximum holding limits, and mandatory transfer whitelist verification
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 安全保障 */}
      <section className="py-16 bg-white">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-4 text-primary-dark">Security Assurance</h2>
          <p className="text-gray-color text-center mb-12 max-w-2xl mx-auto">
            We adopt multi-layered security measures to ensure the safety of your assets
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-secondary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-secondary-color">🔒</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Smart Contract Security</h3>
              <p className="text-gray-color">Multi-audited smart contracts to ensure asset transaction security</p>
            </div>
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-info-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-info-color">🛡️</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Compliance Monitoring</h3>
              <p className="text-gray-color">Real-time transaction monitoring to ensure regulatory compliance</p>
            </div>
            <div className="banking-card text-center">
              <div className="w-16 h-16 bg-warning-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-warning-color">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-primary-dark">Risk Control</h3>
              <p className="text-gray-color">Multi-layered risk control mechanisms to ensure asset security</p>
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
              <p className="text-gray-color">Connecting real-world assets with DeFi ecosystem</p>
            </div>
            <div className="footer-links">
              <Link href="/" className="footer-link">Home</Link>
              <Link href="/kyc" className="footer-link">KYC Verification</Link>
              <Link href="/assets" className="footer-link">Asset Management</Link>
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
