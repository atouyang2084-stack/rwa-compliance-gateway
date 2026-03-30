import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function KYC() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dob: ''
  })
  const [verificationId, setVerificationId] = useState('')
  const [status, setStatus] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
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

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!account) {
      setMessage('请先连接钱包')
      setStatus('error')
      return
    }
    setLoading(true)
    setMessage('')

    try {
      // 从localStorage获取token
      const token = localStorage.getItem('token')
      if (!token) {
        setMessage('请先登录')
        setStatus('error')
        return
      }

      const response = await fetch('http://localhost:8081/v1/compliance/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userAddress: account,
          verificationData: JSON.stringify(formData)
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('KYC验证成功！')
        setVerificationId(data.verificationId)
        setStatus('success')
        // 验证成功后，自动跳转到资产管理页面
        setTimeout(() => {
          window.location.href = '/assets'
        }, 2000)
      } else {
        setMessage(`验证失败: ${data.error}`)
        setStatus('error')
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setLoading(false)
    }
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
              <Link href="/" className="nav-link">首页</Link>
              <Link href="/kyc" className="nav-link active">KYC验证</Link>
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

      {/* 主要内容 */}
      <main className="container py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-primary-dark mb-4">KYC身份验证</h1>
            <p className="text-gray-color">完成身份验证，开启RWA资产交易之旅</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* KYC表单 */}
            <div className="banking-card">
              <div className="card-header">
                <h2 className="card-title text-primary-dark">个人信息验证</h2>
              </div>
              
              {message && (
                <div className={`alert ${status === 'success' ? 'alert-success' : 'alert-danger'}`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="firstName" className="form-label">
                    名字
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                    placeholder="请输入您的名字"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName" className="form-label">
                    姓氏
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                    placeholder="请输入您的姓氏"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    邮箱
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                    placeholder="请输入您的邮箱"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dob" className="form-label">
                    出生日期
                  </label>
                  <input
                    type="date"
                    id="dob"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full"
                >
                  {loading ? '验证中...' : '提交验证'}
                </button>
              </form>
            </div>

            {/* 验证状态 */}
            <div className="banking-card">
              <div className="card-header">
                <h2 className="card-title text-primary-dark">验证状态</h2>
              </div>
              
              {verificationId ? (
                <div className="space-y-6">
                  <div className="p-6 bg-secondary-light bg-opacity-10 rounded-lg border border-secondary-light border-opacity-30">
                    <h3 className="text-lg font-semibold text-secondary-dark mb-4">验证成功</h3>
                    <p className="text-gray-color mb-2">验证ID: <span className="font-medium">{verificationId}</span></p>
                    <p className="text-gray-color">您的身份已通过验证，可以参与RWA资产交易。</p>
                    <div className="mt-4">
                      <Link href="/assets" className="btn btn-secondary w-full">
                        前往资产管理
                      </Link>
                    </div>
                  </div>
                  <div className="bg-info-light bg-opacity-10 p-4 rounded-lg border border-info-light border-opacity-30">
                    <p className="text-info-dark text-sm">
                      验证成功后，您的验证信息将被加密存储，并生成链上可验证凭证(VC)。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-light rounded-lg border border-gray-medium border-opacity-20">
                  <h3 className="text-lg font-semibold text-primary-dark mb-4">待验证</h3>
                  <p className="text-gray-color mb-4">请先提交KYC验证申请，完成身份验证后即可参与RWA资产交易。</p>
                  <div className="bg-info-light bg-opacity-10 p-4 rounded-lg border border-info-light border-opacity-30">
                    <p className="text-info-dark text-sm">
                      我们重视您的隐私，所有个人信息将被加密存储，仅用于身份验证目的。
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <h3 className="banking-section-title">验证流程说明</h3>
                <ol className="space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-primary-color text-sm font-medium">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-dark">填写个人基本信息</h4>
                      <p className="text-gray-color text-sm">请确保信息准确无误，以便顺利完成验证</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-primary-color text-sm font-medium">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-dark">提交验证申请</h4>
                      <p className="text-gray-color text-sm">点击提交按钮，系统将开始验证流程</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-primary-color text-sm font-medium">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-dark">系统进行身份验证</h4>
                      <p className="text-gray-color text-sm">系统将验证您提供的信息</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-primary-color text-sm font-medium">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-dark">获取验证结果</h4>
                      <p className="text-gray-color text-sm">验证结果将显示在本页面</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-primary-color text-sm font-medium">5</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-dark">开始交易</h4>
                      <p className="text-gray-color text-sm">验证通过后即可参与RWA资产交易</p>
                    </div>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>

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