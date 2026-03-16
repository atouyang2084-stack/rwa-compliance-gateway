import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { contractAddresses, assetManagerABI, getContract, getSigner } from '../lib/contracts'

export default function Assets() {
  const [account, setAccount] = useState(null)
  const [provider, setProvider] = useState(null)
  const [assets, setAssets] = useState([])
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  
  // 资产创建表单
  const [createForm, setCreateForm] = useState({
    assetId: '',
    name: '',
    symbol: '',
    initialValue: ''
  })
  
  // 存款表单
  const [depositForm, setDepositForm] = useState({
    assetId: '',
    value: ''
  })
  
  // 赎回表单
  const [redeemForm, setRedeemForm] = useState({
    assetId: '',
    tokens: ''
  })

  useEffect(() => {
    // 检查是否有以太坊钱包
    if (typeof window.ethereum !== 'undefined') {
      const provider = new ethers.BrowserProvider(window.ethereum)
      setProvider(provider)
    }
    
    // 获取资产列表
    fetchAssets()
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

  const fetchAssets = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8081/v1/assets/list', {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
      const data = await response.json()
      if (response.ok) {
        setAssets(data.assets)
      } else {
        setMessage(`获取资产列表失败: ${data.error}`)
        setStatus('error')
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAsset = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('http://localhost:8081/v1/assets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          assetId: createForm.assetId,
          name: createForm.name,
          symbol: createForm.symbol,
          initialValue: parseInt(createForm.initialValue),
          complianceRegistry: contractAddresses.complianceEngine
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('资产创建成功！')
        setStatus('success')
        // 重置表单
        setCreateForm({
          assetId: '',
          name: '',
          symbol: '',
          initialValue: ''
        })
        // 刷新资产列表
        fetchAssets()
      } else {
        let errorMessage = `创建资产失败: ${data.error}`
        if (data.error.includes('UNIQUE constraint failed')) {
          errorMessage = '资产ID已存在，请使用其他资产ID'
        }
        setMessage(errorMessage)
        setStatus('error')
        alert(errorMessage)
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeposit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('http://localhost:8081/v1/assets/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          assetId: depositForm.assetId,
          value: parseInt(depositForm.value)
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('存款成功！')
        setStatus('success')
        // 重置表单
        setDepositForm({
          assetId: '',
          value: ''
        })
        // 刷新资产列表
        fetchAssets()
      } else {
        let errorMessage = `存款失败: ${data.error}`
        setMessage(errorMessage)
        setStatus('error')
        alert(errorMessage)
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedeem = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('http://localhost:8081/v1/assets/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          assetId: redeemForm.assetId,
          tokens: parseInt(redeemForm.tokens)
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('赎回成功！')
        setStatus('success')
        // 重置表单
        setRedeemForm({
          assetId: '',
          tokens: ''
        })
        // 刷新资产列表
        fetchAssets()
      } else {
        let errorMessage = `赎回失败: ${data.error}`
        setMessage(errorMessage)
        setStatus('error')
        alert(errorMessage)
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssetClick = async (asset) => {
    setSelectedAsset(asset)
    try {
      const response = await fetch(`http://localhost:8081/v1/assets/details?assetId=${asset.assetId}`, {
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
      const data = await response.json()
      if (response.ok) {
        setSelectedAsset(data.asset)
      }
    } catch (error) {
      console.error('获取资产详情失败:', error)
    }
  }

  const handleInputChange = (e, form) => {
    const { name, value } = e.target
    if (form === 'create') {
      setCreateForm(prev => ({
        ...prev,
        [name]: value
      }))
    } else if (form === 'deposit') {
      setDepositForm(prev => ({
        ...prev,
        [name]: value
      }))
    } else if (form === 'redeem') {
      setRedeemForm(prev => ({
        ...prev,
        [name]: value
      }))
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
              <Link href="/kyc" className="nav-link">KYC验证</Link>
              <Link href="/assets" className="nav-link active">资产管理</Link>
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
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-primary-dark mb-4">资产管理</h1>
            <p className="text-gray-color">管理您的RWA资产，进行创建、存款和赎回操作</p>
          </div>

          {message && (
            <div className={`alert ${status === 'success' ? 'alert-success' : 'alert-danger'}`}>
              {message}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8">
            {/* 资产列表 */}
            <div className="w-full md:w-1/4">
              <div className="banking-card">
                <div className="card-header">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="card-title text-primary-dark">资产列表</h2>
                    <button 
                      onClick={fetchAssets}
                      className="btn btn-primary w-full sm:w-auto"
                    >
                      刷新列表
                    </button>
                  </div>
                </div>
                {isLoading ? (
                  <div className="loading">
                    <div className="loading-spinner"></div>
                    <p className="text-gray-color">加载中...</p>
                  </div>
                ) : assets.length > 0 ? (
                  <ul className="space-y-3">
                    {assets.map((asset) => (
                      <li 
                        key={asset.assetId}
                        onClick={() => handleAssetClick(asset)}
                        className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${selectedAsset?.assetId === asset.assetId ? 'bg-primary-light bg-opacity-10 border border-primary-light' : 'hover:bg-gray-light border border-gray-medium border-opacity-20'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-primary-dark">{asset.name}</div>
                            <div className="text-sm text-gray-color">{asset.symbol}</div>
                          </div>
                          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${asset.isActive ? 'bg-secondary-light bg-opacity-20 text-secondary-dark' : 'bg-gray-color bg-opacity-20 text-gray-color'}`}>
                            {asset.isActive ? '活跃' : '暂停'}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-color">
                          <div>ID: {asset.assetId}</div>
                          <div className="font-medium text-primary-dark">价值: ${(asset.totalValue / 100).toFixed(2)}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="empty-state">
                    <p className="empty-state-title">暂无资产</p>
                    <p className="empty-state-description">点击"创建资产"按钮开始</p>
                  </div>
                )}
              </div>
            </div>

            {/* 资产详情 */}
            <div className="w-full md:w-3/4">
              <div className="banking-card">
                <div className="card-header">
                  <h2 className="card-title text-primary-dark">资产详情</h2>
                </div>
                {selectedAsset ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">资产名称</h3>
                          <p className="text-primary-dark font-medium">{selectedAsset.name}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">资产符号</h3>
                          <p className="text-primary-dark font-medium">{selectedAsset.symbol}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">资产ID</h3>
                          <p className="text-primary-dark font-medium">{selectedAsset.assetId}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">状态</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedAsset.isActive ? 'bg-secondary-light bg-opacity-20 text-secondary-dark' : 'bg-gray-color bg-opacity-20 text-gray-color'}`}>
                            {selectedAsset.isActive ? '活跃' : '暂停'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">总价值</h3>
                          <p className="text-primary-dark font-medium">${(selectedAsset.totalValue / 100).toFixed(2)}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">代币数量</h3>
                          <p className="text-primary-dark font-medium">{selectedAsset.totalTokens}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">代币地址</h3>
                          <p className="text-primary-dark font-medium break-all">{selectedAsset.tokenAddress}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p className="empty-state-title">请从左侧选择一个资产查看详情</p>
                    <p className="empty-state-description">点击资产列表中的资产项查看详细信息</p>
                  </div>
                )}
              </div>

              {/* 创建资产 */}
              <div className="banking-card">
                <div className="card-header">
                  <h2 className="card-title text-primary-dark">创建资产</h2>
                </div>
                <form onSubmit={handleCreateAsset}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-group">
                      <label htmlFor="assetId" className="form-label">
                        资产ID
                      </label>
                      <input
                        type="text"
                        id="assetId"
                        name="assetId"
                        value={createForm.assetId}
                        onChange={(e) => handleInputChange(e, 'create')}
                        required
                        className="form-control"
                        placeholder="例如: real-estate-001"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="name" className="form-label">
                        资产名称
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={createForm.name}
                        onChange={(e) => handleInputChange(e, 'create')}
                        required
                        className="form-control"
                        placeholder="例如: 商业地产"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="symbol" className="form-label">
                        资产符号
                      </label>
                      <input
                        type="text"
                        id="symbol"
                        name="symbol"
                        value={createForm.symbol}
                        onChange={(e) => handleInputChange(e, 'create')}
                        required
                        className="form-control"
                        placeholder="例如: CRE"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="initialValue" className="form-label">
                        初始价值（美分）
                      </label>
                      <input
                        type="number"
                        id="initialValue"
                        name="initialValue"
                        value={createForm.initialValue}
                        onChange={(e) => handleInputChange(e, 'create')}
                        required
                        className="form-control"
                        placeholder="例如: 100000"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-full mt-6"
                  >
                    {isLoading ? '创建中...' : '创建资产'}
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* 存款 */}
                <div className="banking-card">
                  <div className="card-header">
                    <h2 className="card-title text-primary-dark">存款</h2>
                  </div>
                  <form onSubmit={handleDeposit}>
                    <div className="form-group">
                      <label htmlFor="depositAssetId" className="form-label">
                        资产ID
                      </label>
                      <input
                        type="text"
                        id="depositAssetId"
                        name="assetId"
                        value={depositForm.assetId}
                        onChange={(e) => handleInputChange(e, 'deposit')}
                        required
                        className="form-control"
                        placeholder="输入资产ID"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="depositValue" className="form-label">
                        存款金额（美分）
                      </label>
                      <input
                        type="number"
                        id="depositValue"
                        name="value"
                        value={depositForm.value}
                        onChange={(e) => handleInputChange(e, 'deposit')}
                        required
                        className="form-control"
                        placeholder="输入存款金额"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn btn-secondary w-full"
                    >
                      {isLoading ? '存款中...' : '存款'}
                    </button>
                  </form>
                </div>

                {/* 赎回 */}
                <div className="banking-card">
                  <div className="card-header">
                    <h2 className="card-title text-primary-dark">赎回</h2>
                  </div>
                  <form onSubmit={handleRedeem}>
                    <div className="form-group">
                      <label htmlFor="redeemAssetId" className="form-label">
                        资产ID
                      </label>
                      <input
                        type="text"
                        id="redeemAssetId"
                        name="assetId"
                        value={redeemForm.assetId}
                        onChange={(e) => handleInputChange(e, 'redeem')}
                        required
                        className="form-control"
                        placeholder="输入资产ID"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="redeemTokens" className="form-label">
                        赎回代币数量
                      </label>
                      <input
                        type="number"
                        id="redeemTokens"
                        name="tokens"
                        value={redeemForm.tokens}
                        onChange={(e) => handleInputChange(e, 'redeem')}
                        required
                        className="form-control"
                        placeholder="输入赎回数量"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn btn-danger w-full"
                    >
                      {isLoading ? '赎回中...' : '赎回'}
                    </button>
                  </form>
                </div>
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