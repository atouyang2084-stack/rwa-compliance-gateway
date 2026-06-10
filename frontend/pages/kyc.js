import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'

export default function KYC() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    dob: '',
    passport: '',
    idCard: ''
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
        setMessage('Please connect wallet first')
        setStatus('error')
        return
      }
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null')
    if (!storedUser?.address || storedUser.address.toLowerCase() !== account.toLowerCase()) {
      setMessage('Connected wallet must match the authenticated account')
      setStatus('error')
      return
    }
    setLoading(true)
    setMessage('')

    try {
      // 从localStorage获取token
      const token = localStorage.getItem('token')
      if (!token) {
        setMessage('Please login first')
        setStatus('error')
        return
      }

      const response = await fetch('/api/compliance/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          verificationData: JSON.stringify(formData)
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('KYC verification successful!')
        setVerificationId(data.verificationId)
        setStatus('success')
        // After successful verification, automatically redirect to asset management page
        setTimeout(() => {
          window.location.href = '/assets'
        }, 2000)
      } else {
        setMessage(`Verification failed: ${data.error}`)
        setStatus('error')
      }
    } catch (error) {
      setMessage('Network error, please try again later')
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
              <Link href="/" className="nav-link">Home</Link>
              <Link href="/kyc" className="nav-link active">KYC Verification</Link>
              <Link href="/assets" className="nav-link">Asset Management</Link>
              {account ? (
                <>
                  <div className="bg-gray-light px-3 py-1 rounded-full text-sm font-medium text-gray-color border border-gray-medium">
                    {account.substring(0, 6)}...{account.substring(38)}
                  </div>
                  <button 
                    onClick={disconnectWallet}
                    className="btn btn-outline"
                  >
Disconnect
                  </button>
                </>
              ) : (
                <button 
                  onClick={connectWallet}
                  className="btn btn-primary"
                >
Connect Wallet
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
            <h1 className="text-3xl font-bold text-primary-dark mb-4">KYC Identity Verification</h1>
            <p className="text-gray-color">Complete identity verification to start your RWA asset trading journey</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* KYC表单 */}
            <div className="banking-card">
              <div className="card-header">
                <h2 className="card-title text-primary-dark">Personal Information Verification</h2>
              </div>
              
              {message && (
                <div className={`alert ${status === 'success' ? 'alert-success' : 'alert-danger'}`}>
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="firstName" className="form-label">
                    First Name
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                    placeholder="Enter your first name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lastName" className="form-label">
                    Last Name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                    placeholder="Enter your last name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="form-control"
                    placeholder="Enter your email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="dob" className="form-label">
                    Date of Birth
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

                <div className="form-group">
                  <label htmlFor="passport" className="form-label">
                    Passport Number (Optional)
                  </label>
                  <input
                    type="text"
                    id="passport"
                    name="passport"
                    value={formData.passport}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Enter your passport number"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="idCard" className="form-label">
                    ID Card Number (Optional)
                  </label>
                  <input
                    type="text"
                    id="idCard"
                    name="idCard"
                    value={formData.idCard}
                    onChange={handleInputChange}
                    className="form-control"
                    placeholder="Enter your ID card number"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full"
                >
                  {loading ? 'Verifying...' : 'Submit Verification'}
                </button>
              </form>
            </div>

            {/* 验证状态 */}
            <div className="banking-card">
              <div className="card-header">
                <h2 className="card-title text-primary-dark">Verification Status</h2>
              </div>
              
              {verificationId ? (
                <div className="space-y-6">
                  <div className="p-6 bg-secondary-light bg-opacity-10 rounded-lg border border-secondary-light border-opacity-30">
                    <h3 className="text-lg font-semibold text-secondary-dark mb-4">Verification Successful</h3>
                  <p className="text-gray-color mb-2">Verification ID: <span className="font-medium">{verificationId}</span></p>
                  <p className="text-gray-color">Your identity has been verified, you can now participate in RWA asset trading.</p>
                  <div className="mt-4">
                    <Link href="/assets" className="btn btn-secondary w-full">
                      Go to Asset Management
                    </Link>
                  </div>
                  </div>
                  <div className="bg-info-light bg-opacity-10 p-4 rounded-lg border border-info-light border-opacity-30">
                    <p className="text-info-dark text-sm">
                      After successful verification, your verification information will be encrypted and stored, and an on-chain verifiable credential (VC) will be generated.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-light rounded-lg border border-gray-medium border-opacity-20">
                  <h3 className="text-lg font-semibold text-primary-dark mb-4">Pending Verification</h3>
                  <p className="text-gray-color mb-4">Please submit your KYC verification application first. After completing identity verification, you can participate in RWA asset trading.</p>
                  <div className="bg-info-light bg-opacity-10 p-4 rounded-lg border border-info-light border-opacity-30">
                    <p className="text-info-dark text-sm">
                      We value your privacy. All personal information will be encrypted and stored only for identity verification purposes.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-8">
                <h3 className="banking-section-title">Verification Process Instructions</h3>
                <ol className="space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-primary-color text-sm font-medium">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-dark">Fill in Basic Personal Information</h4>
                      <p className="text-gray-color text-sm">Please ensure the information is accurate to complete verification smoothly</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-primary-color text-sm font-medium">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-dark">Submit Verification Application</h4>
                      <p className="text-gray-color text-sm">Click the submit button, and the system will start the verification process</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-primary-color text-sm font-medium">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-dark">System Performs Identity Verification</h4>
                      <p className="text-gray-color text-sm">The system will verify the information you provided</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-primary-color text-sm font-medium">4</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-dark">Get Verification Result</h4>
                      <p className="text-gray-color text-sm">The verification result will be displayed on this page</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary-light bg-opacity-20 rounded-full flex items-center justify-center mr-4 mt-0.5">
                      <span className="text-primary-color text-sm font-medium">5</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-primary-dark">Start Trading</h4>
                      <p className="text-gray-color text-sm">After verification, you can participate in RWA asset trading</p>
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
