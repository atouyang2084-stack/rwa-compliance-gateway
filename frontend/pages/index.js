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
              <div className="flex items-center gap-6">
                <Link href="/" className="nav-link active">Home</Link>
                <Link href="/kyc" className="nav-link">KYC Verification</Link>
                <Link href="/assets" className="nav-link">Asset Management</Link>
                {user && user.role === 'regulator' && (
                  <Link href="/compliance" className="nav-link">Compliance Management</Link>
                )}
              </div>
              <div className="flex items-center gap-4">
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
        </div>
      </nav>

      {/* Hero区域 */}
      <section className="py-24 bg-gradient-to-r from-primary-color to-primary-dark text-white relative overflow-hidden">
        {/* 装饰元素 */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white"></div>
          <div className="absolute top-1/2 left-1/4 w-20 h-20 rounded-full bg-white"></div>
        </div>
        <div className="container relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              RWA Compliance Gateway
            </h1>
            <p className="text-xl md:text-2xl mb-10 opacity-90 font-light">
              Compliance gateway connecting real-world assets with DeFi ecosystem
            </p>
            <p className="text-lg mb-12 opacity-80 max-w-2xl mx-auto leading-relaxed">
              Building compliant, secure, and transparent asset tokenization solutions, providing one-stop services for institutional asset onboarding
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Link href="/assets" className="btn hover-lift" style={{ backgroundColor: 'white', color: 'var(--primary-color)', minWidth: '220px', padding: '1rem 2rem', fontSize: '1.125rem' }}>
                Start Asset Tokenization
              </Link>
              <Link href="/kyc" className="btn btn-outline hover-lift" style={{ borderColor: 'white', color: 'white', minWidth: '220px', padding: '1rem 2rem', fontSize: '1.125rem' }}>
                Complete KYC Verification
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 使用流程 */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-dark">How It Works</h2>
            <p className="text-gray-color text-lg max-w-3xl mx-auto font-light leading-relaxed">
              Follow these simple steps to start your RWA asset tokenization journey
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="banking-card hover-lift p-6 border border-gray-medium">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-xl font-bold text-primary-color">1</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">Complete KYC Verification</h3>
                  <p className="text-gray-color text-sm leading-relaxed">Submit personal information, complete identity verification, and obtain on-chain verifiable credentials</p>
                </div>
              </div>
            </div>

            <div className="banking-card hover-lift p-6 border border-gray-medium">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-xl font-bold text-primary-color">2</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">Connect Wallet</h3>
                  <p className="text-gray-color text-sm leading-relaxed">Connect your Ethereum wallet to ensure secure access to the system</p>
                </div>
              </div>
            </div>

            <div className="banking-card hover-lift p-6 border border-gray-medium">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-xl font-bold text-primary-color">3</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">Create Asset</h3>
                  <p className="text-gray-color text-sm leading-relaxed">Create your RWA asset, set asset parameters and compliance rules</p>
                </div>
              </div>
            </div>

            <div className="banking-card hover-lift p-6 border border-gray-medium">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-xl font-bold text-primary-color">4</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">Manage Asset</h3>
                  <p className="text-gray-color text-sm leading-relaxed">Perform deposit, redemption, and other operations to manage your asset portfolio</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 核心功能 */}
      <section className="py-16 bg-gray-light">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-dark">Core Features</h2>
            <p className="text-gray-color text-lg max-w-3xl mx-auto font-light leading-relaxed">
              We provide comprehensive RWA asset tokenization solutions
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="banking-card hover-lift p-6 border border-gray-medium bg-white">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-primary-light bg-opacity-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl font-bold text-primary-color">👤</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">Identity & Permission Management</h3>
                  <p className="text-gray-color text-sm leading-relaxed">
                    Integrates third-party KYC services, generates on-chain verifiable credentials for users, implements role-based access control, and ensures compliance
                  </p>
                </div>
              </div>
            </div>
            <div className="banking-card hover-lift p-6 border border-gray-medium bg-white">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-secondary-light bg-opacity-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl font-bold text-secondary-color">🏛️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">Asset Tokenization Engine</h3>
                  <p className="text-gray-color text-sm leading-relaxed">
                    Supports ERC-3643 or ERC-1400 standards, implements 1:1 anchoring between asset value and on-chain tokens, ensuring asset security
                  </p>
                </div>
              </div>
            </div>
            <div className="banking-card hover-lift p-6 border border-gray-medium bg-white">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-success-light bg-opacity-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl font-bold text-success-color">📋</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">Compliance Rule Engine</h3>
                  <p className="text-gray-color text-sm leading-relaxed">
                    Programmable restrictions, including holder quantity limits, single account maximum holding limits, and mandatory transfer whitelist verification
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 安全保障 */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary-dark">Security & Compliance</h2>
            <p className="text-gray-color text-lg max-w-3xl mx-auto font-light leading-relaxed">
              We adopt multi-layered security measures to ensure the safety of your assets
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="banking-card hover-lift p-6 border border-gray-medium">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-secondary-light bg-opacity-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl font-bold text-secondary-color">🔒</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">Smart Contract Security</h3>
                  <p className="text-gray-color text-sm leading-relaxed">Multi-audited smart contracts to ensure asset transaction security with built-in reentrancy protection and emergency pause functionality</p>
                </div>
              </div>
            </div>
            <div className="banking-card hover-lift p-6 border border-gray-medium">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-info-light bg-opacity-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl font-bold text-info-color">🛡️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">Compliance Monitoring</h3>
                  <p className="text-gray-color text-sm leading-relaxed">Real-time transaction monitoring to ensure regulatory compliance with automated sanctions list checks and jurisdiction restrictions</p>
                </div>
              </div>
            </div>
            <div className="banking-card hover-lift p-6 border border-gray-medium">
              <div className="flex items-start mb-4">
                <div className="w-12 h-12 bg-warning-light bg-opacity-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                  <span className="text-2xl font-bold text-warning-color">📊</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-primary-dark">Risk Control</h3>
                  <p className="text-gray-color text-sm leading-relaxed">Multi-layered risk control mechanisms to ensure asset security with holder limits and maximum position restrictions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 底部 */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="nav-brand mb-6">
                <div className="nav-brand-logo" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>RWA</div>
                <div className="nav-brand-name" style={{ color: 'white' }}>RWA Compliance Gateway</div>
              </div>
              <p className="text-gray-color">Connecting real-world assets with DeFi ecosystem</p>
              <div className="mt-6 flex gap-4">
                <a href="#" className="text-white hover:text-gray-light transition-all">
                  <span className="text-xl">📧</span>
                </a>
                <a href="#" className="text-white hover:text-gray-light transition-all">
                  <span className="text-xl">📱</span>
                </a>
                <a href="#" className="text-white hover:text-gray-light transition-all">
                  <span className="text-xl">🌐</span>
                </a>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-link-group">
                <h4 className="text-white font-semibold mb-4">Quick Links</h4>
                <ul className="footer-link-list">
                  <li><Link href="/" className="footer-link">Home</Link></li>
                  <li><Link href="/kyc" className="footer-link">KYC Verification</Link></li>
                  <li><Link href="/assets" className="footer-link">Asset Management</Link></li>
                  {user && user.role === 'regulator' && (
                    <li><Link href="/compliance" className="footer-link">Compliance Management</Link></li>
                  )}
                </ul>
              </div>
              <div className="footer-link-group">
                <h4 className="text-white font-semibold mb-4">Resources</h4>
                <ul className="footer-link-list">
                  <li><a href="#" className="footer-link">Documentation</a></li>
                  <li><a href="#" className="footer-link">API Reference</a></li>
                  <li><a href="#" className="footer-link">FAQ</a></li>
                </ul>
              </div>
              <div className="footer-link-group">
                <h4 className="text-white font-semibold mb-4">Contact</h4>
                <ul className="footer-link-list">
                  <li><a href="#" className="footer-link">Support</a></li>
                  <li><a href="#" className="footer-link">Partners</a></li>
                  <li><a href="#" className="footer-link">About Us</a></li>
                </ul>
              </div>
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
