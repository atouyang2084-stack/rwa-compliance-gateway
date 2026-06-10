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
        setError(data.error || 'Login failed')
      }
    } catch (err) {
      setError('Network error, please try again later')
      console.error('Login error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-light-color page-transition">
      <Head>
        <title>Login - RWA Compliance Gateway</title>
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
              <div className="flex items-center gap-6">
                <Link href="/" className="nav-link">Home</Link>
                <Link href="/kyc" className="nav-link">KYC Verification</Link>
                <Link href="/assets" className="nav-link">Asset Management</Link>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/register" className="btn btn-outline">Register</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 登录表单 */}
      <section className="py-20 bg-gray-light">
        <div className="container">
          <div className="max-w-md mx-auto">
            <div className="banking-card p-8 shadow-lg hover-lift">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary-color">🔐</span>
                </div>
                <h2 className="text-2xl font-bold text-primary-dark">User Login</h2>
                <p className="text-gray-color mt-2">Sign in to access your account</p>
              </div>
              
              {error && (
                <div className="alert alert-error mb-6">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleLogin}>
                <div className="form-group mb-6">
                  <label htmlFor="username" className="form-label">Username</label>
                  <input
                    type="text"
                    id="username"
                    className="form-input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Enter your username"
                  />
                </div>
                
                <div className="form-group mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="password" className="form-label">Password</label>
                    <Link href="#" className="text-sm text-primary-color hover:underline">Forgot password?</Link>
                  </div>
                  <input
                    type="password"
                    id="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary w-full py-3"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
                
                <div className="text-center mt-6">
                  <p className="text-gray-color">
                    Don't have an account? <Link href="/register" className="text-primary-color hover:underline font-medium">Register now</Link>
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