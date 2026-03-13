import Head from 'next/head'
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
      const response = await fetch('http://localhost:8081/v1/compliance/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
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
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>KYC验证 - RWA Compliance Gateway</title>
        <meta name="description" content="KYC验证页面" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">KYC验证</h1>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* KYC表单 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">个人信息验证</h2>
            
            {message && (
              <div className={`mb-4 p-3 rounded-md ${status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  名字
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  姓氏
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  邮箱
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                  出生日期 (YYYY-MM-DD)
                </label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {loading ? '验证中...' : '提交验证'}
              </button>
            </form>
          </div>

          {/* 验证状态 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">验证状态</h2>
            
            {verificationId ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-md">
                  <h3 className="font-medium text-green-700">验证成功</h3>
                  <p className="text-sm text-gray-600 mt-1">验证ID: {verificationId}</p>
                  <p className="text-sm text-gray-600 mt-1">您的身份已通过验证，可以参与RWA资产交易。</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-md">
                <p className="text-gray-600">请先提交KYC验证申请。</p>
              </div>
            )}

            <div className="mt-8">
              <h3 className="font-medium text-gray-700 mb-2">验证流程说明</h3>
              <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                <li>填写个人基本信息</li>
                <li>提交验证申请</li>
                <li>系统进行身份验证</li>
                <li>获取验证结果</li>
                <li>验证通过后即可参与RWA资产交易</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
