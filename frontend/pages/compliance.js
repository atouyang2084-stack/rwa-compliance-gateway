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
                <Link href="/" className="nav-link">Home</Link>
                <Link href="/kyc" className="nav-link">KYC Verification</Link>
                <Link href="/assets" className="nav-link">Asset Management</Link>
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
        <main className="container py-12">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold text-primary-dark mb-4">Access Denied</h1>
              <p className="text-gray-color">You do not have permission to access this page</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-color page-transition">
      <Head>
        <title>Compliance Management - RWA Compliance Gateway</title>
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
              <Link href="/" className="nav-link">Home</Link>
              <Link href="/kyc" className="nav-link">KYC Verification</Link>
              <Link href="/assets" className="nav-link">Asset Management</Link>
              <Link href="/compliance" className="nav-link active">Compliance Management</Link>
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
            <h1 className="text-3xl font-bold text-primary-dark mb-4">Compliance Management</h1>
            <p className="text-gray-color">Manage jurisdictions and sanction lists</p>
          </div>

          {message && (
            <div className={`alert ${status === 'success' ? 'alert-success' : status === 'error' ? 'alert-danger' : 'alert-info'}`}>
              {status === 'info' && <div className="loading-spinner inline-block mr-2"></div>}
              {message}
            </div>
          )}

          <div className="banking-card">
            <div className="card-header">
              <h2 className="card-title text-primary-dark">Sanction List Management</h2>
            </div>
            <div className="space-y-8">
              {/* 手动添加制裁地址 */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-light">
                <h3 className="text-lg font-medium text-primary-dark mb-4">Add Sanctioned Address</h3>
                <form onSubmit={handleAddSanction}>
                  <div className="form-group">
                    <label htmlFor="sanctionAddress" className="form-label">
                      Address
                    </label>
                    <input
                      type="text"
                      id="sanctionAddress"
                      name="address"
                      value={addSanctionForm.address}
                      onChange={(e) => handleInputChange(e, 'addSanction')}
                      required
                      className="form-control"
                      placeholder="Enter address to sanction"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary w-full mt-4 py-3"
                  >
                    {isLoading ? 'Adding...' : 'Add Sanctioned Address'}
                  </button>
                </form>
              </div>
              
              {/* 制裁名单操作 */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-light">
                <h3 className="text-lg font-medium text-primary-dark mb-4">Sanction List Operations</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleGetSanctionList}
                    disabled={isLoading}
                    className="btn btn-primary w-full py-3"
                  >
                    {isLoading ? 'Refreshing...' : 'Refresh Sanction List'}
                  </button>
                  <button
                    onClick={handleGetSanctionList}
                    disabled={isLoading}
                    className="btn btn-secondary w-full py-3"
                  >
                    {isLoading ? 'Loading...' : 'View Sanction List'}
                  </button>
                </div>
              </div>
              
              {/* 制裁地址列表 */}
              {sanctionedAddresses.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-primary-dark mb-4">Sanctioned Addresses List</h3>
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
              <p>Compliance gateway connecting real-world assets with DeFi ecosystem, providing secure and compliant solutions for institutional asset onboarding.</p>
            </div>
            <div className="footer-links">
              <div className="footer-link-group">
                <h4>Quick Links</h4>
                <ul className="footer-link-list">
                  <li><Link href="/" className="footer-link">Home</Link></li>
                  <li><Link href="/kyc" className="footer-link">KYC Verification</Link></li>
                  <li><Link href="/assets" className="footer-link">Asset Management</Link></li>
                  <li><Link href="/compliance" className="footer-link">Compliance Management</Link></li>
                </ul>
              </div>
              <div className="footer-link-group">
                <h4>Resources</h4>
                <ul className="footer-link-list">
                  <li><a href="#" className="footer-link">Documentation</a></li>
                  <li><a href="#" className="footer-link">API Reference</a></li>
                  <li><a href="#" className="footer-link">FAQ</a></li>
                </ul>
              </div>
              <div className="footer-link-group">
                <h4>Contact Us</h4>
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
