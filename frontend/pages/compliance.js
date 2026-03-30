import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'

export default function Compliance() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState('investor')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // 司法管辖区表单
  const [jurisdictionForm, setJurisdictionForm] = useState({
    jurisdiction: ''
  })
  
  // 限制司法管辖区表单
  const [restrictForm, setRestrictForm] = useState({
    jurisdiction: '',
    restricted: false
  })
  
  // 地址司法管辖区表单
  const [addressJurisdictionForm, setAddressJurisdictionForm] = useState({
    address: '',
    jurisdiction: ''
  })
  
  // 制裁名单
  const [sanctionedAddresses, setSanctionedAddresses] = useState([])
  
  // 添加制裁地址表单
  const [addSanctionForm, setAddSanctionForm] = useState({
    address: ''
  })

  useEffect(() => {
    // 检查是否已登录
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setUserRole(userData.role)
      }
    }
  }, [])

  const handleInputChange = (e, form) => {
    const { name, value, type, checked } = e.target
    if (form === 'jurisdiction') {
      setJurisdictionForm(prev => ({
        ...prev,
        [name]: value
      }))
    } else if (form === 'restrict') {
      setRestrictForm(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    } else if (form === 'addressJurisdiction') {
      setAddressJurisdictionForm(prev => ({
        ...prev,
        [name]: value
      }))
    } else if (form === 'addSanction') {
      setAddSanctionForm(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleAddJurisdiction = async (e) => {
    e.preventDefault()
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/compliance/jurisdiction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          jurisdiction: jurisdictionForm.jurisdiction
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        setMessage(`添加司法管辖区失败: ${data.error}`)
        setStatus('error')
        return
      }
      
      const data = await response.json()
      setMessage('司法管辖区添加成功！')
      setStatus('success')
      setJurisdictionForm({ jurisdiction: '' })
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRestrictJurisdiction = async (e) => {
    e.preventDefault()
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/compliance/jurisdiction/restrict', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          jurisdiction: restrictForm.jurisdiction,
          restricted: restrictForm.restricted
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        setMessage(`限制司法管辖区失败: ${data.error}`)
        setStatus('error')
        return
      }
      
      const data = await response.json()
      setMessage('司法管辖区限制状态更新成功！')
      setStatus('success')
      setRestrictForm({ jurisdiction: '', restricted: false })
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetAddressJurisdiction = async (e) => {
    e.preventDefault()
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/compliance/address-jurisdiction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          address: addressJurisdictionForm.address,
          jurisdiction: addressJurisdictionForm.jurisdiction
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        setMessage(`设置地址司法管辖区失败: ${data.error}`)
        setStatus('error')
        return
      }
      
      const data = await response.json()
      setMessage('地址司法管辖区设置成功！')
      setStatus('success')
      setAddressJurisdictionForm({ address: '', jurisdiction: '' })
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSyncSanctionList = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/compliance/sync-sanction-list', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        setMessage(`同步制裁名单失败: ${data.error}`)
        setStatus('error')
        return
      }
      
      const data = await response.json()
      setMessage('制裁名单同步成功！')
      setStatus('success')
      setSanctionedAddresses(data.sanctionedAddresses)
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGetSanctionList = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/compliance/sanction-list', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        }
      })
      
      if (!response.ok) {
        const data = await response.json()
        setMessage(`获取制裁名单失败: ${data.error}`)
        setStatus('error')
        return
      }
      
      const data = await response.json()
      setSanctionedAddresses(data.sanctionedAddresses)
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddSanction = async (e) => {
    e.preventDefault()
    
    const token = localStorage.getItem('token')
    if (!token) {
      setMessage('请先登录')
      setStatus('error')
      return
    }
    
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/compliance/sanction-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Role': userRole
        },
        body: JSON.stringify({
          address: addSanctionForm.address
        })
      })
      
      if (!response.ok) {
        const data = await response.json()
        setMessage(`添加制裁地址失败: ${data.error}`)
        setStatus('error')
        return
      }
      
      const data = await response.json()
      setMessage('制裁地址添加成功！')
      setStatus('success')
      setAddSanctionForm({ address: '' })
      // 刷新制裁名单
      await handleGetSanctionList()
    } catch (error) {
      setMessage('网络错误，请稍后重试')
      setStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  // 只有监管者可以访问此页面
  if (userRole !== 'regulator') {
    return (
      <div className="min-h-screen bg-light-color page-transition">
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
                <Link href="/assets" className="nav-link">资产管理</Link>
                {user ? (
                  <>
                    <div className="bg-gray-light px-3 py-1 rounded-full text-sm font-medium text-gray-color border border-gray-medium">
                      {user.username} ({user.role})
                    </div>
                    <button 
                      onClick={() => {
                        localStorage.removeItem('token')
                        localStorage.removeItem('user')
                        window.location.href = '/'
                      }}
                      className="btn btn-outline"
                    >
                      退出登录
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login" className="btn btn-outline">登录</Link>
                    <Link href="/register" className="btn btn-primary">注册</Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
        <main className="container py-12">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-primary-dark mb-4">权限不足</h1>
              <p className="text-gray-color">您没有访问此页面的权限</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-color page-transition">
      <Head>
        <title>合规管理 - RWA Compliance Gateway</title>
      </Head>

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
              <Link href="/assets" className="nav-link">资产管理</Link>
              <Link href="/compliance" className="nav-link active">合规管理</Link>
              {user ? (
                <>
                  <div className="bg-gray-light px-3 py-1 rounded-full text-sm font-medium text-gray-color border border-gray-medium">
                    {user.username} ({user.role})
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('token')
                      localStorage.removeItem('user')
                      window.location.href = '/'
                    }}
                    className="btn btn-outline"
                  >
                    退出登录
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn btn-outline">登录</Link>
                  <Link href="/register" className="btn btn-primary">注册</Link>
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
            <h1 className="text-3xl font-bold text-primary-dark mb-4">合规管理</h1>
            <p className="text-gray-color">管理司法管辖区和制裁名单</p>
          </div>

          {message && (
            <div className={`alert ${status === 'success' ? 'alert-success' : status === 'error' ? 'alert-danger' : 'alert-info'}`}>
              {status === 'info' && <div className="loading-spinner inline-block mr-2"></div>}
              {message}
            </div>
          )}

          <div className="banking-card">
            <div className="card-header">
              <h2 className="card-title text-primary-dark">制裁名单管理</h2>
            </div>
            <div className="space-y-8">
              {/* 手动添加制裁地址 */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-light">
                <h3 className="text-lg font-medium text-primary-dark mb-4">添加制裁地址</h3>
                <form onSubmit={handleAddSanction}>
                  <div className="form-group">
                    <label htmlFor="sanctionAddress" className="form-label">
                      地址
                    </label>
                    <input
                      type="text"
                      id="sanctionAddress"
                      name="address"
                      value={addSanctionForm.address}
                      onChange={(e) => handleInputChange(e, 'addSanction')}
                      required
                      className="form-control"
                      placeholder="输入要制裁的地址"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-full mt-4 py-3"
                  >
                    {isLoading ? '添加中...' : '添加制裁地址'}
                  </button>
                </form>
              </div>
              
              {/* 制裁名单操作 */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-light">
                <h3 className="text-lg font-medium text-primary-dark mb-4">制裁名单操作</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleSyncSanctionList}
                    disabled={isLoading}
                    className="btn btn-primary w-full py-3"
                  >
                    {isLoading ? '同步中...' : '同步制裁名单'}
                  </button>
                  <button
                    onClick={handleGetSanctionList}
                    disabled={isLoading}
                    className="btn btn-secondary w-full py-3"
                  >
                    {isLoading ? '获取中...' : '查看制裁名单'}
                  </button>
                </div>
              </div>
              
              {/* 制裁地址列表 */}
              {sanctionedAddresses.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-primary-dark mb-4">制裁地址列表</h3>
                  <ul className="space-y-2">
                    {sanctionedAddresses.map((address, index) => (
                      <li key={index} className="bg-gray-light p-3 rounded-lg">
                        {address}
                      </li>
                    ))}
                  </ul>
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
            <div className="footer-brand">
              <h3>RWA Compliance Gateway</h3>
              <p>连接现实世界资产与DeFi生态的合规准入网关，为机构资产上链提供安全、合规的解决方案。</p>
            </div>
            <div className="footer-links">
              <div className="footer-link-group">
                <h4>快速链接</h4>
                <ul className="footer-link-list">
                  <li><Link href="/" className="footer-link">首页</Link></li>
                  <li><Link href="/kyc" className="footer-link">KYC验证</Link></li>
                  <li><Link href="/assets" className="footer-link">资产管理</Link></li>
                  <li><Link href="/compliance" className="footer-link">合规管理</Link></li>
                </ul>
              </div>
              <div className="footer-link-group">
                <h4>资源</h4>
                <ul className="footer-link-list">
                  <li><a href="#" className="footer-link">文档</a></li>
                  <li><a href="#" className="footer-link">API参考</a></li>
                  <li><a href="#" className="footer-link">常见问题</a></li>
                </ul>
              </div>
              <div className="footer-link-group">
                <h4>联系我们</h4>
                <ul className="footer-link-list">
                  <li><a href="#" className="footer-link">支持</a></li>
                  <li><a href="#" className="footer-link">合作伙伴</a></li>
                  <li><a href="#" className="footer-link">关于我们</a></li>
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