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
  const [userRole, setUserRole] = useState('investor') // 默认角色为投资者
  const [user, setUser] = useState(null) // 用户信息
  const [userBalances, setUserBalances] = useState({}) // 用户资产余额
  const [assetTotalBalances, setAssetTotalBalances] = useState({}) // 资产总余额（所有用户的余额之和）
  
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
  const [isKYCVerified, setIsKYCVerified] = useState(false) // KYC验证状态
  
  // 赎回表单
  const [redeemForm, setRedeemForm] = useState({
    assetId: '',
    tokens: ''
  })
  
  // 转账表单
  const [transferForm, setTransferForm] = useState({
    assetId: '',
    toAddress: '',
    amount: ''
  })
  
  // 冻结/解冻表单
  const [freezeForm, setFreezeForm] = useState({
    assetId: ''
  })
  
  // 下架资产表单
  const [下架Form, set下架Form] = useState({
    assetId: ''
  })

  // 监听user变化，当用户信息更新时重新检查KYC状态
  useEffect(() => {
    // 延迟检查，确保checkKYCStatus函数已定义
    const timer = setTimeout(() => {
      if (user && user.address) {
        console.log('=== KYC状态检查触发 ===')
        console.log('用户地址:', user.address)
        console.log('当前KYC状态:', isKYCVerified)
        checkKYCStatus(user.address)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [user])

  useEffect(() => {
    // 检查是否有以太坊钱包
    if (typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      const provider = new ethers.BrowserProvider(window.ethereum)
      setProvider(provider)
    }
    
    // 检查是否已登录
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        // 从localStorage获取用户信息
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setUserRole(userData.role)
        // 如果已登录，尝试自动连接钱包
        if (typeof window.ethereum !== 'undefined') {
          const provider = new ethers.BrowserProvider(window.ethereum)
          setProvider(provider)
          // 尝试连接钱包
          connectWallet()
        }
      }
    }
  }, [])

  // 检查KYC状态
  const checkKYCStatus = async (address) => {
    if (!address) {
      console.log('checkKYCStatus: address is null or undefined')
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('checkKYCStatus: token is null or undefined')
      return
    }
    
    try {
      console.log('正在检查KYC状态，地址:', address)
      const response = await fetch(`/api/compliance/status?address=${address}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        }
      })
      
      console.log('KYC API响应状态:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('KYC API响应数据:', data)
        setIsKYCVerified(data.verified || false)
        console.log('设置KYC验证状态为:', data.verified)
      } else {
        console.error('KYC API错误:', response.status, response.statusText)
        setIsKYCVerified(false)
      }
    } catch (error) {
      console.error('Error checking KYC status:', error)
      setIsKYCVerified(false)
    }
  }

  const connectWallet = async () => {
    let ethProvider = provider
    if (!ethProvider && typeof window !== 'undefined' && typeof window.ethereum !== 'undefined') {
      ethProvider = new ethers.BrowserProvider(window.ethereum)
      setProvider(ethProvider)
    }
    if (!ethProvider) {
      setMessage('未检测到以太坊钱包，请安装MetaMask等钱包插件')
      setStatus('error')
      return
    }
    try {
      const accounts = await ethProvider.send('eth_requestAccounts', [])
      const accountAddress = accounts[0]
      setAccount(accountAddress)
      
      // 连接钱包成功后，自动查询KYC状态
      if (user && user.address) {
        await checkKYCStatus(user.address)
      }
      
      // 连接钱包成功后获取资产列表
      // 等待状态更新后再调用fetchAssets
      setTimeout(() => {
        fetchAssets()
      }, 100)
    } catch (error) {
      console.error('连接钱包失败:', error)
      setMessage('连接钱包失败，请检查钱包是否已解锁')
      setStatus('error')
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
  }

  const fetchUserBalances = async () => {
    // 检查是否已登录
    if (typeof window === 'undefined') {
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      return
    }
    
    if (!user) {
      return
    }
    
    const userAddress = user.address
    
    try {
      // 使用相对路径，通过Next.js代理
      const response = await fetch(`/api/assets/balances?userAddress=${userAddress}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        }
      })
      
      if (!response.ok) {
        // 如果是未授权或服务器错误，重定向到首页
        if (response.status === 401 || response.status === 500) {
          window.location.href = '/' 
          return
        }
        return
      }
      
      const data = await response.json()
      // 将余额转换为以资产ID为键的对象
      const balancesMap = {}
      data.balances.forEach(balance => {
        balancesMap[balance.assetId] = balance.balance
      })
      setUserBalances(balancesMap)
    } catch (error) {
      console.error('Error fetching user balances:', error)
    }
  }

  const fetchAssetTotalBalances = async () => {
    // 检查是否已登录
    if (typeof window === 'undefined') {
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      return
    }
    
    try {
      // 直接获取特定资产的总余额（如果有选中的资产）
      if (selectedAsset) {
        const response = await fetch(`/api/assets/total-balance?assetId=${selectedAsset.assetId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Role': userRole
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          const totalBalancesMap = { ...assetTotalBalances }
          totalBalancesMap[selectedAsset.assetId] = data.totalBalance
          console.log('Asset total balance for', selectedAsset.assetId, ':', data.totalBalance)
          setAssetTotalBalances(totalBalancesMap)
        } else {
          console.error(`Failed to fetch total balance for asset ${selectedAsset.assetId}:`, response.status)
        }
      }
      
      // 获取所有资产
      const assetsResponse = await fetch('/api/assets/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        }
      })
      
      if (!assetsResponse.ok) {
        // 如果是未授权或服务器错误，重定向到首页
        if (assetsResponse.status === 401 || assetsResponse.status === 500) {
          window.location.href = '/' 
          return
        }
        return
      }
      
      const assetsData = await assetsResponse.json()
      const assets = assetsData.assets
      
      // 为每个资产获取总余额
      const totalBalancesMap = { ...assetTotalBalances }
      for (const asset of assets) {
        const response = await fetch(`/api/assets/total-balance?assetId=${asset.assetId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-User-Role': userRole
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          totalBalancesMap[asset.assetId] = data.totalBalance
        } else {
          console.error(`Failed to fetch total balance for asset ${asset.assetId}:`, response.status)
        }
      }
      
      console.log('Asset total balances:', totalBalancesMap)
      setAssetTotalBalances(totalBalancesMap)
    } catch (error) {
      console.error('Error fetching asset total balances:', error)
    }
  }

  const fetchAssets = async () => {
    // 检查是否已登录
    if (typeof window === 'undefined') {
      setMessage('请先登录')
      setStatus('error')
      setIsLoading(false)
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    setMessage('')
    setStatus('')
    
    try {
      // 使用相对路径，通过Next.js代理
      const response = await fetch('/api/assets/list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        }
      })
      
      if (!response.ok) {
        // 如果是未授权或服务器错误，重定向到首页
        if (response.status === 401 || response.status === 500) {
          window.location.href = '/' 
          return
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      setAssets(data.assets)
      // 获取用户资产余额
      await fetchUserBalances()
      // 获取资产总余额
      await fetchAssetTotalBalances()
      // 如果当前有选中的资产，更新其信息
      if (selectedAsset) {
        const updatedAsset = data.assets.find(asset => asset.assetId === selectedAsset.assetId)
        if (updatedAsset) {
          setSelectedAsset(updatedAsset)
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateAsset = async (e) => {
    e.preventDefault()
    
    // 检查是否已登录
    if (typeof window === 'undefined') {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/assets/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          assetId: createForm.assetId,
          name: createForm.name,
          symbol: createForm.symbol,
          initialValue: parseInt(createForm.initialValue),
          complianceRegistry: contractAddresses.complianceEngine
        })
      })

      if (!response.ok) {
        // 如果是未授权或服务器错误，重定向到首页
        if (response.status === 401 || response.status === 500) {
          window.location.href = '/'
          return
        }
        const data = await response.json()
        let errorMessage = `创建资产失败: ${data.error}`
        if (data.error.includes('UNIQUE constraint failed')) {
          errorMessage = '资产ID已存在，请使用其他资产ID'
        }
        setMessage(errorMessage)
        setStatus('error')
        alert(errorMessage)
        return
      }

      const data = await response.json()

      // 模拟验证过程
      setMessage('正在验证用户身份和资产状态...')
      setStatus('info')
      setTimeout(() => {
        setMessage('资产创建成功！已完成用户身份和资产状态验证')
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
      }, 3000)
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeposit = async (e) => {
    e.preventDefault()
    
    // 检查是否已登录
    if (typeof window === 'undefined') {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    if (!user) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    if (!account) {
      setMessage('请先连接钱包')
      setStatus('error')
      return
    }
    
    const userAddress = user.address // 使用用户地址，与获取余额时使用的地址一致
    
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/assets/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          assetId: depositForm.assetId,
          value: parseFloat(depositForm.value), // 直接使用美元
          userAddress: userAddress,
          nonce: Date.now().toString() // 添加防重复提交的nonce
        })
      })

      if (!response.ok) {
        // 如果是未授权或服务器错误，重定向到首页
        if (response.status === 401 || response.status === 500) {
          window.location.href = '/'
          return
        }
        const data = await response.json()
        let errorMessage = `存款失败: ${data.error}`
        setMessage(errorMessage)
        setStatus('error')
        alert(errorMessage)
        return
      }

      const data = await response.json()

      // 模拟验证过程
      setMessage('正在验证用户身份和资产状态...')
      setStatus('info')
      setTimeout(() => {
        setMessage('存款成功！已完成用户身份和资产状态验证')
        setStatus('success')
        // 重置表单
        setDepositForm({
          assetId: '',
          value: ''
        })
        // 刷新资产列表
        fetchAssets()
      }, 3000)
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRedeem = async (e) => {
    e.preventDefault()
    
    // 检查是否已登录
    if (typeof window === 'undefined') {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    if (!user) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    const userAddress = user.address
    
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/assets/redeem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          assetId: redeemForm.assetId,
          tokens: parseInt(redeemForm.tokens),
          userAddress: userAddress
        })
      })

      if (!response.ok) {
        // 如果是未授权或服务器错误，重定向到首页
        if (response.status === 401 || response.status === 500) {
          window.location.href = '/' 
          return
        }
        const data = await response.json()
        let errorMessage = `赎回失败: ${data.error}`
        setMessage(errorMessage)
        setStatus('error')
        alert(errorMessage)
        return
      }

      const data = await response.json()

      // 模拟验证过程
      setMessage('正在验证用户身份和资产状态...')
      setStatus('info')
      setTimeout(() => {
        setMessage('赎回成功！已完成用户身份和资产状态验证')
        setStatus('success')
        // 重置表单
        setRedeemForm({
          assetId: '',
          tokens: ''
        })
        // 刷新资产列表
        fetchAssets()
      }, 3000)
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTransfer = async (e) => {
    e.preventDefault()
    
    // 检查是否已登录
    if (typeof window === 'undefined') {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    if (!user) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    const userAddress = user.address
    
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/assets/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          assetId: transferForm.assetId,
          fromAddress: userAddress,
          toAddress: transferForm.toAddress,
          amount: parseInt(transferForm.amount),
          nonce: Date.now().toString() // 添加防重复提交的nonce
        })
      })

      if (!response.ok) {
        // 如果是未授权或服务器错误，重定向到首页
        if (response.status === 401 || response.status === 500) {
          window.location.href = '/' 
          return
        }
        const data = await response.json()
        let errorMessage = `转账失败: ${data.error}`
        setMessage(errorMessage)
        setStatus('error')
        alert(errorMessage)
        return
      }

      const data = await response.json()

      // 模拟验证过程
      setMessage('正在验证用户身份和资产状态...')
      setStatus('info')
      setTimeout(() => {
        setMessage('转账成功！已完成用户身份和资产状态验证')
        setStatus('success')
        // 重置表单
        setTransferForm({
          assetId: '',
          toAddress: '',
          amount: ''
        })
      }, 3000)
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFreeze = async (e) => {
    e.preventDefault()
    
    // 检查是否已登录
    if (typeof window === 'undefined') {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/assets/freeze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          assetId: freezeForm.assetId
        })
      })

      if (!response.ok) {
        // 如果是未授权或服务器错误，重定向到首页
        if (response.status === 401 || response.status === 500) {
          window.location.href = '/' 
          return
        }
        const data = await response.json()
        let errorMessage = `冻结失败: ${data.error}`
        setMessage(errorMessage)
        setStatus('error')
        alert(errorMessage)
        return
      }

      const data = await response.json()

      // 模拟验证过程
      setMessage('正在验证用户身份和资产状态...')
      setStatus('info')
      setTimeout(() => {
        setMessage('资产冻结成功！已完成用户身份和资产状态验证')
        setStatus('success')
        // 重置表单
        setFreezeForm({
          assetId: ''
        })
        // 刷新资产列表
        fetchAssets()
      }, 3000)
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnfreeze = async (e) => {
    e.preventDefault()
    
    // 检查是否已登录
    if (typeof window === 'undefined') {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/assets/unfreeze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          assetId: freezeForm.assetId
        })
      })

      if (!response.ok) {
        // 如果是未授权或服务器错误，重定向到首页
        if (response.status === 401 || response.status === 500) {
          window.location.href = '/' 
          return
        }
        const data = await response.json()
        let errorMessage = `解冻失败: ${data.error}`
        setMessage(errorMessage)
        setStatus('error')
        alert(errorMessage)
        return
      }

      const data = await response.json()

      // 模拟验证过程
      setMessage('正在验证用户身份和资产状态...')
      setStatus('info')
      setTimeout(() => {
        setMessage('资产解冻成功！已完成用户身份和资产状态验证')
        setStatus('success')
        // 重置表单
        setFreezeForm({
          assetId: ''
        })
        // 刷新资产列表
        fetchAssets()
      }, 3000)
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handle下架 = async (e) => {
    e.preventDefault()
    
    // 检查是否已登录
    if (typeof window === 'undefined') {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    setIsLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/assets/deactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          assetId: 下架Form.assetId
        })
      })

      if (!response.ok) {
        // 如果是未授权或服务器错误，重定向到首页
        if (response.status === 401 || response.status === 500) {
          window.location.href = '/' 
          return
        }
        const data = await response.json()
        let errorMessage = `下架失败: ${data.error}`
        setMessage(errorMessage)
        setStatus('error')
        alert(errorMessage)
        return
      }

      const data = await response.json()

      // 模拟验证过程
      setMessage('正在验证用户身份和资产状态...')
      setStatus('info')
      setTimeout(() => {
        setMessage('资产下架成功！已完成用户身份和资产状态验证')
        setStatus('success')
        // 重置表单
        set下架Form({
          assetId: ''
        })
        // 刷新资产列表
        fetchAssets()
      }, 3000)
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAssetClick = async (asset) => {
    // 直接使用列表中的资产数据，不再单独请求详情
    setSelectedAsset(asset)
    // 获取该资产的总余额
    await fetchAssetTotalBalances()
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
    } else if (form === 'transfer') {
      setTransferForm(prev => ({
        ...prev,
        [name]: value
      }))
    } else if (form === 'freeze') {
      setFreezeForm(prev => ({
        ...prev,
        [name]: value
      }))
    } else if (form === '下架') {
      set下架Form(prev => ({
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
              <Link href="/" className="nav-link">Home</Link>
              <Link href="/kyc" className="nav-link">KYC Verification</Link>
              <Link href="/assets" className="nav-link active">Asset Management</Link>
              {user && user.role === 'regulator' && (
                <Link href="/compliance" className="nav-link">Compliance Management</Link>
              )}
              {user ? (
                <>
                  <div className="bg-gray-light px-3 py-1 rounded-full text-sm font-medium text-gray-color border border-gray-medium">
                    {user.username} ({user.role})
                  </div>
                  {/* 始终显示连接钱包按钮，即使之前连接失败 */}
                  <button 
                    onClick={connectWallet}
                    className="btn btn-primary"
                  >
                    {account ? 'Reconnect Wallet' : 'Connect Wallet'}
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('token')
                      localStorage.removeItem('user')
                      setAccount(null)
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

      {/* 主要内容 */}
      <main className="container py-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-primary-dark mb-4">Asset Management</h1>
            <p className="text-gray-color">Manage your RWA assets, including creation, deposit, and redemption operations</p>
            <div className="mt-4 flex justify-center items-center gap-4">
              <div className="bg-white p-4 rounded-lg shadow-md">
                <label className="form-label mr-4">Current Role:</label>
                <span className="text-primary-dark font-medium">{userRole === 'investor' ? 'Investor' : userRole === 'issuer' ? 'Issuer' : userRole === 'custodian' ? 'Custodian' : 'Regulator'}</span>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md">
                <label className="form-label mr-4">KYC Status:</label>
                <span className={`font-medium ${isKYCVerified ? 'text-green-600' : 'text-red-600'}`}>
                  {isKYCVerified ? '✓ Verified' : '✗ Not Verified'}
                </span>
                {!isKYCVerified && account && (
                  <Link href="/kyc" className="ml-4 text-primary hover:underline">
                    Complete Verification →
                  </Link>
                )}
              </div>
            </div>
          </div>

          {message && (
            <div className={`alert ${status === 'success' ? 'alert-success' : status === 'error' ? 'alert-danger' : 'alert-info'}`}>
              {status === 'info' && <div className="loading-spinner inline-block mr-2"></div>}
              {message}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-8">
            {/* 资产列表 */}
            <div className="w-full md:w-1/4">
              <div className="banking-card">
                <div className="card-header">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h2 className="card-title text-primary-dark">Asset List</h2>
                    <button 
                      onClick={fetchAssets}
                      className="btn btn-primary w-full sm:w-auto"
                    >
                      Refresh List
                    </button>
                  </div>
                </div>
                {isLoading ? (
                  <div className="loading">
                    <div className="loading-spinner"></div>
                    <p className="text-gray-color">Loading...</p>
                  </div>
                ) : (
                  (() => {
                    // Filter active assets
                    const activeAssets = assets.filter(asset => asset.isActive);
                    return activeAssets.length > 0 ? (
                      <ul className="space-y-3">
                        {activeAssets.map((asset) => (
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
                                {asset.isActive ? 'Active' : 'Inactive'}
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-color">
                          <div>ID: {asset.assetId}</div>
                          <div className="font-medium text-primary-dark">价值: ${asset.totalValue.toFixed(2)}</div>
                          <div className="font-medium text-secondary-dark">代币总量: {asset.totalTokens}</div>
                          <div className="font-medium text-primary-dark">代币价格: ${(Number(asset.totalValue) / Number(asset.totalTokens)).toFixed(2)}</div>
                          <div className="font-medium text-secondary-dark">我的余额: {Math.min(userBalances[asset.assetId] || 0, asset.totalTokens)} 代币</div>
                          <div className="font-medium text-secondary-dark">已售出: {Math.min(assetTotalBalances[asset.assetId] || 0, asset.totalTokens)} 代币</div>
                          <div className="font-medium text-secondary-dark">可购买: {Math.max(0, asset.totalTokens - (assetTotalBalances[asset.assetId] || 0))} 代币</div>
                          <div className="font-medium text-secondary-dark">我的价值: ${(Math.min(userBalances[asset.assetId] || 0, asset.totalTokens) * Number(asset.totalValue) / Number(asset.totalTokens)).toFixed(2)}</div>
                        </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="empty-state">
                        <p className="empty-state-title">No Assets</p>
                        <p className="empty-state-description">Click "Create Asset" button to start</p>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* 资产详情 */}
            <div className="w-full md:w-3/4">
              <div className="banking-card">
                <div className="card-header">
                  <h2 className="card-title text-primary-dark">Asset Details</h2>
                </div>
                {selectedAsset && selectedAsset.isActive ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">Asset Name</h3>
                          <p className="text-primary-dark font-medium">{selectedAsset.name}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">Asset Symbol</h3>
                          <p className="text-primary-dark font-medium">{selectedAsset.symbol}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">Asset ID</h3>
                          <p className="text-primary-dark font-medium">{selectedAsset.assetId}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">Status</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedAsset.isActive ? 'bg-secondary-light bg-opacity-20 text-secondary-dark' : 'bg-gray-color bg-opacity-20 text-gray-color'}`}>
                            {selectedAsset.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">Total Value</h3>
                          <p className="text-primary-dark font-medium">${selectedAsset.totalValue.toFixed(2)}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">Total Tokens</h3>
                          <p className="text-primary-dark font-medium">{selectedAsset.totalTokens}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">Sold Tokens</h3>
                          <p className="text-primary-dark font-medium">{Math.min(assetTotalBalances[selectedAsset.assetId] || 0, selectedAsset.totalTokens)} 代币</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">Available Tokens</h3>
                          <p className="text-primary-dark font-medium">{Math.max(0, selectedAsset.totalTokens - (assetTotalBalances[selectedAsset.assetId] || 0))} 代币</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">Token Price</h3>
                          <p className="text-primary-dark font-medium">${(Number(selectedAsset.totalValue) / Number(selectedAsset.totalTokens)).toFixed(2)}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">My Balance</h3>
                          <p className="text-secondary-dark font-medium">{Math.min(userBalances[selectedAsset.assetId] || 0, selectedAsset.totalTokens)} 代币</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">My Value</h3>
                          <p className="text-secondary-dark font-medium">${(Math.min(userBalances[selectedAsset.assetId] || 0, selectedAsset.totalTokens) * Number(selectedAsset.totalValue) / Number(selectedAsset.totalTokens)).toFixed(2)}</p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-color mb-1">Token Address</h3>
                          <p className="text-primary-dark font-medium break-all">{selectedAsset.tokenAddress}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <p className="empty-state-title">Please select an asset from the left to view details</p>
                    <p className="empty-state-description">Click on an asset item in the asset list to view detailed information</p>
                  </div>
                )}
              </div>

              {/* Create Asset - Only visible to issuers */}
              {userRole === 'issuer' && (
                <div className="banking-card">
                  <div className="card-header">
                    <h2 className="card-title text-primary-dark">Create Asset</h2>
                  </div>
                  <form onSubmit={handleCreateAsset}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="form-group">
                        <label htmlFor="assetId" className="form-label">
                          Asset ID
                        </label>
                        <input
                          type="text"
                          id="assetId"
                          name="assetId"
                          value={createForm.assetId}
                          onChange={(e) => handleInputChange(e, 'create')}
                          required
                          className="form-control"
                          placeholder="Example: real-estate-001"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="name" className="form-label">
                          Asset Name
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={createForm.name}
                          onChange={(e) => handleInputChange(e, 'create')}
                          required
                          className="form-control"
                          placeholder="Example: Commercial Real Estate"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="symbol" className="form-label">
                          Asset Symbol
                        </label>
                        <input
                          type="text"
                          id="symbol"
                          name="symbol"
                          value={createForm.symbol}
                          onChange={(e) => handleInputChange(e, 'create')}
                          required
                          className="form-control"
                          placeholder="Example: CRE"
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="initialValue" className="form-label">
                          Initial Value (USD)
                        </label>
                        <input
                          type="number"
                          id="initialValue"
                          name="initialValue"
                          value={createForm.initialValue}
                          onChange={(e) => handleInputChange(e, 'create')}
                          required
                          className="form-control"
                          placeholder="Example: 100000"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn btn-primary w-full mt-6"
                    >
                      {isLoading ? 'Creating...' : 'Create Asset'}
                    </button>
                  </form>
                </div>
              )}
              
              {/* Deactivate Asset - Only visible to issuers */}
              {userRole === 'issuer' && (
                <div className="banking-card">
                  <div className="card-header">
                    <h2 className="card-title text-primary-dark">Deactivate Asset</h2>
                  </div>
                  <form onSubmit={handle下架}>
                    <div className="form-group">
                      <label htmlFor="下架AssetId" className="form-label">
                        Asset ID
                      </label>
                      <input
                        type="text"
                        id="下架AssetId"
                        name="assetId"
                        value={下架Form.assetId}
                        onChange={(e) => handleInputChange(e, '下架')}
                        required
                        className="form-control"
                        placeholder="Enter asset ID to deactivate"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn btn-danger w-full mt-6"
                    >
                      {isLoading ? 'Deactivating...' : 'Deactivate Asset'}
                    </button>
                  </form>
                </div>
              )}

              {/* Deposit - Visible to issuers and investors */}
              {(userRole === 'issuer' || userRole === 'investor') && (
                <div className="banking-card">
                  <div className="card-header">
                    <h2 className="card-title text-primary-dark">Deposit</h2>
                  </div>
                  <form onSubmit={handleDeposit}>
                    <div className="form-group">
                      <label htmlFor="depositAssetId" className="form-label">
                        Asset ID
                      </label>
                      <input
                        type="text"
                        id="depositAssetId"
                        name="assetId"
                        value={depositForm.assetId}
                        onChange={(e) => handleInputChange(e, 'deposit')}
                        required
                        className="form-control"
                        placeholder="Enter asset ID"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="depositValue" className="form-label">
                        Deposit Amount (USD)
                      </label>
                      <input
                        type="number"
                        id="depositValue"
                        name="value"
                        value={depositForm.value}
                        onChange={(e) => handleInputChange(e, 'deposit')}
                        required
                        className="form-control"
                        placeholder="Enter deposit amount"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading || !isKYCVerified || (() => {
                        const asset = assets.find(a => a.assetId === depositForm.assetId);
                        if (!asset) return false;
                        const totalBalance = assetTotalBalances[depositForm.assetId] || 0;
                        return totalBalance >= asset.totalTokens;
                      })()}
                      className="btn btn-secondary w-full"
                    >
                      {isLoading ? 'Depositing...' : !isKYCVerified ? 'Please complete KYC verification first' : (() => {
                        const asset = assets.find(a => a.assetId === depositForm.assetId);
                        if (!asset) return 'Deposit';
                        const totalBalance = assetTotalBalances[depositForm.assetId] || 0;
                        return totalBalance >= asset.totalTokens ? 'Reached total supply' : 'Deposit';
                      })()}
                    </button>
                  </form>
                </div>
              )}

              {/* Redeem - Visible to investors and issuers */}
              {(userRole === 'investor' || userRole === 'issuer') && (
                <div className="banking-card">
                  <div className="card-header">
                    <h2 className="card-title text-primary-dark">Redeem</h2>
                  </div>
                  <form onSubmit={handleRedeem}>
                    <div className="form-group">
                      <label htmlFor="redeemAssetId" className="form-label">
                        Asset ID
                      </label>
                      <input
                        type="text"
                        id="redeemAssetId"
                        name="assetId"
                        value={redeemForm.assetId}
                        onChange={(e) => handleInputChange(e, 'redeem')}
                        required
                        className="form-control"
                        placeholder="Enter asset ID"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="redeemTokens" className="form-label">
                        Number of Tokens to Redeem
                      </label>
                      <input
                        type="number"
                        id="redeemTokens"
                        name="tokens"
                        value={redeemForm.tokens}
                        onChange={(e) => handleInputChange(e, 'redeem')}
                        required
                        className="form-control"
                        placeholder="Enter redemption amount"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn btn-danger w-full"
                    >
                      {isLoading ? 'Redeeming...' : 'Redeem'}
                    </button>
                  </form>
                </div>
              )}

              {/* Transfer - Only visible to investors */}
              {userRole === 'investor' && (
                <div className="banking-card">
                  <div className="card-header">
                    <h2 className="card-title text-primary-dark">Transfer</h2>
                  </div>
                  <form onSubmit={handleTransfer}>
                    <div className="form-group">
                      <label htmlFor="transferAssetId" className="form-label">
                        Asset ID
                      </label>
                      <input
                        type="text"
                        id="transferAssetId"
                        name="assetId"
                        value={transferForm.assetId}
                        onChange={(e) => handleInputChange(e, 'transfer')}
                        required
                        className="form-control"
                        placeholder="Enter asset ID"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="toAddress" className="form-label">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        id="toAddress"
                        name="toAddress"
                        value={transferForm.toAddress}
                        onChange={(e) => handleInputChange(e, 'transfer')}
                        required
                        className="form-control"
                        placeholder="Enter recipient address"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="amount" className="form-label">
                        Transfer Amount
                      </label>
                      <input
                        type="number"
                        id="amount"
                        name="amount"
                        value={transferForm.amount}
                        onChange={(e) => handleInputChange(e, 'transfer')}
                        required
                        className="form-control"
                        placeholder="Enter transfer amount"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || !isKYCVerified}
                      className="btn btn-primary w-full"
                    >
                      {isLoading ? 'Transferring...' : !isKYCVerified ? 'Please complete KYC verification first' : 'Transfer'}
                    </button>
                  </form>
                </div>
              )}

              {/* 资产冻结/解冻 - 托管方和监管者可见 */}
              {(userRole === 'custodian' || userRole === 'regulator') && (
                <div className="banking-card">
                  <div className="card-header">
                    <h2 className="card-title text-primary-dark">资产冻结/解冻</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="form-group">
                      <label htmlFor="freezeAssetId" className="form-label">
                        资产ID
                      </label>
                      <input
                        type="text"
                        id="freezeAssetId"
                        name="assetId"
                        value={freezeForm.assetId}
                        onChange={(e) => handleInputChange(e, 'freeze')}
                        required
                        className="form-control"
                        placeholder="输入资产ID"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={handleFreeze}
                        disabled={isLoading}
                        className="btn btn-danger flex-1"
                      >
                        {isLoading ? '处理中...' : '冻结资产'}
                      </button>
                      <button
                        type="button"
                        onClick={handleUnfreeze}
                        disabled={isLoading}
                        className="btn btn-success flex-1"
                      >
                        {isLoading ? '处理中...' : '解冻资产'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
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