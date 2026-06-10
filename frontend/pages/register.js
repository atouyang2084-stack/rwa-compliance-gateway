import Head from 'next/head'
import Link from 'next/link'
import { useState } from 'react'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password, address }),
      })

      const data = await response.json()
      
      if (data.success) {
        // 注册成功后重定向到登录页面
        window.location.href = '/login'
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (err) {
      setError('Network error, please try again later')
      console.error('Registration error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-light-color page-transition">
      <Head>
        <title>Register - RWA Compliance Gateway</title>
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
                <Link href="/login" className="btn btn-primary">Login</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 注册表单 */}
      <section className="py-20 bg-gray-light">
        <div className="container">
          <div className="max-w-md mx-auto">
            <div className="banking-card p-8 shadow-lg hover-lift">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-light bg-opacity-10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary-color">👤</span>
                </div>
                <h2 className="text-2xl font-bold text-primary-dark">User Registration</h2>
                <p className="text-gray-color mt-2">Create a new account to get started</p>
              </div>
              
              {error && (
                <div className="alert alert-error mb-6">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleRegister}>
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
                
                <div className="form-group mb-6">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    id="email"
                    className="form-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>
                
                <div className="form-group mb-6">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    id="password"
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Enter your password"
                  />
                </div>
                
                <div className="form-group mb-6">
                  <label htmlFor="address" className="form-label">Wallet Address</label>
                  <input
                    type="text"
                    id="address"
                    className="form-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="Ethereum address starting with 0x"
                  />
                </div>
                
                <button 
                  type="submit" 
                  className="btn btn-primary w-full py-3"
                  disabled={loading}
                >
                  {loading ? 'Registering...' : 'Register'}
                </button>
                
                <div className="text-center mt-6">
                  <p className="text-gray-color">
                    Already have an account? <Link href="/login" className="text-primary-color hover:underline font-medium">Login now</Link>
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
