import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const data = await response.json()
      
      if (data.success) {
        // 存储token到本地存储
        localStorage.setItem('token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))
        // 重定向到首页
        window.location.href = '/'
      } else {
        setError(data.error || '登录失败')
      }
    } catch (err) {
      setError('网络错误，请稍后重试')
      console.error('登录错误:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-light-color page-transition">
      <Head>
        <title>登录 - RWA Compliance Gateway</title>
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
              <Link href="/register" className="btn btn-outline">注册</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 登录表单 */}
      <section className="py-16 bg-white">
        <div className="container">
          <div className="max-w-md mx-auto">
            <div className="banking-card p-8">
              <h2 className="text-2xl font-bold mb-6 text-center text-primary-dark">用户登录</h2>
              
              {error && (
                <div className="alert alert-error mb-4">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleLogin}>
                <div className="form-group mb-4">
                  <label htmlFor="username" className="form-label">用户名</label>
                  <input
                    type="text"
                    id="username"
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group mb-6">
                  <label htmlFor="password" className="form-label">密码</label>
                  <input
                    type="password"
                    id="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary w-full" 
                  disabled={loading}
                >
                  {loading ? '登录中...' : '登录'}
                </button>
                
                <div className="text-center mt-4">
                  <p className="text-gray-color">
                    还没有账户？ <Link href="/register" className="text-primary-color hover:underline">立即注册</Link>
                  </p>
                </div>
              </form>
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