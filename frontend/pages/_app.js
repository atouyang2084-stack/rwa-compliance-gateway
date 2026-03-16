import Head from 'next/head'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>RWA Compliance Gateway</title>
        <meta name="description" content="连接现实世界资产与DeFi生态的合规准入网关" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:* https://*;" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <style jsx global>{`
          :root {
            --primary-color: #0a3161;
            --primary-light: #1e40af;
            --primary-dark: #072142;
            --secondary-color: #059669;
            --secondary-light: #10b981;
            --secondary-dark: #047857;
            --danger-color: #dc2626;
            --danger-light: #ef4444;
            --danger-dark: #b91c1c;
            --warning-color: #ea580c;
            --warning-light: #f97316;
            --warning-dark: #c2410c;
            --info-color: #0284c7;
            --info-light: #0ea5e9;
            --info-dark: #0369a1;
            --light-color: #f8fafc;
            --dark-color: #1e293b;
            --gray-color: #64748b;
            --gray-light: #f1f5f9;
            --gray-medium: #cbd5e1;
            --white-color: #ffffff;
            --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            --border-radius: 0.375rem;
            --border-radius-lg: 0.75rem;
            --transition: all 0.2s ease-in-out;
            --spacing-xs: 0.25rem;
            --spacing-sm: 0.5rem;
            --spacing-md: 1rem;
            --spacing-lg: 1.5rem;
            --spacing-xl: 2rem;
            --spacing-2xl: 3rem;
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: var(--dark-color);
            background-color: var(--light-color);
          }
          
          h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            line-height: 1.2;
            margin-bottom: var(--spacing-md);
            color: var(--primary-dark);
          }
          
          h1 {
            font-size: 2.25rem;
          }
          
          h2 {
            font-size: 1.75rem;
          }
          
          h3 {
            font-size: 1.25rem;
          }
          
          p {
            margin-bottom: var(--spacing-md);
            color: var(--dark-color);
          }
          
          a {
            color: var(--primary-light);
            text-decoration: none;
            transition: var(--transition);
          }
          
          a:hover {
            color: var(--primary-color);
            text-decoration: underline;
          }
          
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 var(--spacing-md);
          }
          
          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-sm) var(--spacing-lg);
            border-radius: var(--border-radius);
            font-weight: 600;
            font-size: 0.875rem;
            transition: var(--transition);
            cursor: pointer;
            border: none;
            outline: none;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
          
          .btn-primary {
            background-color: var(--primary-color);
            color: var(--white-color);
            box-shadow: var(--shadow-sm);
          }
          
          .btn-primary:hover {
            background-color: var(--primary-dark);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
          }
          
          .btn-secondary {
            background-color: var(--secondary-color);
            color: var(--white-color);
            box-shadow: var(--shadow-sm);
          }
          
          .btn-secondary:hover {
            background-color: var(--secondary-dark);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
          }
          
          .btn-danger {
            background-color: var(--danger-color);
            color: var(--white-color);
            box-shadow: var(--shadow-sm);
          }
          
          .btn-danger:hover {
            background-color: var(--danger-dark);
            transform: translateY(-1px);
            box-shadow: var(--shadow-md);
          }
          
          .btn-outline {
            background-color: transparent;
            color: var(--primary-color);
            border: 1px solid var(--primary-color);
            box-shadow: var(--shadow-sm);
          }
          
          .btn-outline:hover {
            background-color: var(--primary-color);
            color: var(--white-color);
          }
          
          .card {
            background-color: var(--white-color);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-md);
            padding: var(--spacing-xl);
            margin-bottom: var(--spacing-xl);
            border: 1px solid var(--gray-medium);
          }
          
          .card-header {
            margin-bottom: var(--spacing-lg);
            padding-bottom: var(--spacing-lg);
            border-bottom: 2px solid var(--gray-light);
          }
          
          .card-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: var(--spacing-xs);
            color: var(--primary-dark);
          }
          
          .form-group {
            margin-bottom: var(--spacing-lg);
          }
          
          .form-label {
            display: block;
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
            color: var(--dark-color);
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
          
          .form-control {
            width: 100%;
            padding: var(--spacing-sm) var(--spacing-md);
            border: 1px solid var(--gray-medium);
            border-radius: var(--border-radius);
            font-size: 1rem;
            transition: var(--transition);
            background-color: var(--white-color);
          }
          
          .form-control:focus {
            outline: none;
            border-color: var(--primary-light);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          
          .alert {
            padding: var(--spacing-md);
            border-radius: var(--border-radius);
            margin-bottom: var(--spacing-lg);
            border-left: 4px solid transparent;
          }
          
          .alert-success {
            background-color: #d1fae5;
            color: var(--secondary-dark);
            border-left-color: var(--secondary-color);
            border: 1px solid #a7f3d0;
          }
          
          .alert-danger {
            background-color: #fee2e2;
            color: var(--danger-dark);
            border-left-color: var(--danger-color);
            border: 1px solid #fecaca;
          }
          
          .alert-info {
            background-color: #dbeafe;
            color: var(--info-dark);
            border-left-color: var(--info-color);
            border: 1px solid #bfdbfe;
          }
          
          .nav {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: var(--spacing-md) 0;
          }
          
          .nav-brand {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
          }
          
          .nav-brand-logo {
            width: 2.5rem;
            height: 2.5rem;
            background-color: var(--primary-color);
            border-radius: var(--border-radius);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--white-color);
            font-weight: bold;
            font-size: 1.25rem;
            box-shadow: var(--shadow-sm);
          }
          
          .nav-brand-name {
            font-size: 1.25rem;
            font-weight: bold;
            color: var(--primary-dark);
          }
          
          .nav-links {
            display: flex;
            gap: var(--spacing-xl);
            align-items: center;
          }
          
          .nav-link {
            color: var(--dark-color);
            font-weight: 500;
            transition: var(--transition);
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            padding: var(--spacing-sm) 0;
            position: relative;
          }
          
          .nav-link:hover {
            color: var(--primary-color);
            text-decoration: none;
          }
          
          .nav-link.active {
            color: var(--primary-color);
          }
          
          .nav-link.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background-color: var(--primary-color);
          }
          
          .footer {
            background-color: var(--primary-dark);
            color: var(--white-color);
            padding: var(--spacing-2xl) 0;
            margin-top: var(--spacing-2xl);
          }
          
          .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: var(--spacing-xl);
          }
          
          .footer-links {
            display: flex;
            gap: var(--spacing-xl);
          }
          
          .footer-link {
            color: rgba(255, 255, 255, 0.7);
            transition: var(--transition);
            font-size: 0.875rem;
          }
          
          .footer-link:hover {
            color: var(--white-color);
            text-decoration: none;
          }
          
          .footer-copyright {
            width: 100%;
            text-align: center;
            padding-top: var(--spacing-lg);
            margin-top: var(--spacing-lg);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.875rem;
          }
          
          .loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-2xl);
          }
          
          .loading-spinner {
            width: 2.5rem;
            height: 2.5rem;
            border: 3px solid #f3f4f6;
            border-top: 3px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: var(--spacing-lg);
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-2xl);
            text-align: center;
            background-color: var(--gray-light);
            border-radius: var(--border-radius-lg);
            margin: var(--spacing-lg) 0;
          }
          
          .empty-state-title {
            font-size: 1.25rem;
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
            color: var(--primary-dark);
          }
          
          .empty-state-description {
            color: var(--gray-color);
            margin-bottom: var(--spacing-lg);
          }
          
          .grid {
            display: grid;
            gap: var(--spacing-lg);
          }
          
          .grid-cols-1 {
            grid-template-columns: repeat(1, 1fr);
          }
          
          .grid-cols-2 {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .grid-cols-3 {
            grid-template-columns: repeat(3, 1fr);
          }
          
          .grid-cols-4 {
            grid-template-columns: repeat(4, 1fr);
          }
          
          @media (min-width: 768px) {
            .md\:grid-cols-2 {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .md\:grid-cols-3 {
              grid-template-columns: repeat(3, 1fr);
            }
            
            .md\:grid-cols-4 {
              grid-template-columns: repeat(4, 1fr);
            }
          }
          
          @media (min-width: 1024px) {
            .lg\:grid-cols-2 {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .lg\:grid-cols-3 {
              grid-template-columns: repeat(3, 1fr);
            }
            
            .lg\:grid-cols-4 {
              grid-template-columns: repeat(4, 1fr);
            }
          }
          
          /* 银行系统特有的样式 */
          .banking-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 0 var(--spacing-md);
          }
          
          .banking-card {
            background-color: var(--white-color);
            border-radius: var(--border-radius-lg);
            box-shadow: var(--shadow-md);
            padding: var(--spacing-xl);
            margin-bottom: var(--spacing-xl);
            border: 1px solid var(--gray-medium);
            transition: var(--transition);
          }
          
          .banking-card:hover {
            box-shadow: var(--shadow-lg);
            transform: translateY(-2px);
          }
          
          .banking-section-title {
            font-size: 1.125rem;
            font-weight: 600;
            margin-bottom: var(--spacing-lg);
            color: var(--primary-dark);
            text-transform: uppercase;
            letter-spacing: 0.025em;
            border-bottom: 2px solid var(--primary-light);
            padding-bottom: var(--spacing-sm);
          }
          
          .banking-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-sm) var(--spacing-lg);
            border-radius: var(--border-radius);
            font-weight: 600;
            font-size: 0.875rem;
            transition: var(--transition);
            cursor: pointer;
            border: none;
            outline: none;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            min-width: 120px;
          }
          
          .banking-input {
            width: 100%;
            padding: var(--spacing-sm) var(--spacing-md);
            border: 1px solid var(--gray-medium);
            border-radius: var(--border-radius);
            font-size: 1rem;
            transition: var(--transition);
            background-color: var(--white-color);
          }
          
          .banking-input:focus {
            outline: none;
            border-color: var(--primary-light);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          
          .banking-label {
            display: block;
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
            color: var(--dark-color);
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
          
          /* 表格样式 */
          .banking-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: var(--spacing-lg);
          }
          
          .banking-table th {
            background-color: var(--gray-light);
            padding: var(--spacing-sm) var(--spacing-md);
            text-align: left;
            font-weight: 600;
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.025em;
            color: var(--primary-dark);
            border-bottom: 2px solid var(--primary-light);
          }
          
          .banking-table td {
            padding: var(--spacing-sm) var(--spacing-md);
            border-bottom: 1px solid var(--gray-medium);
          }
          
          .banking-table tr:hover {
            background-color: var(--gray-light);
          }
          
          /* 响应式导航 */
          @media (max-width: 768px) {
            .nav {
              flex-direction: column;
              align-items: flex-start;
              gap: var(--spacing-md);
            }
            
            .nav-links {
              flex-wrap: wrap;
              gap: var(--spacing-md);
            }
            
            .footer-content {
              flex-direction: column;
              align-items: flex-start;
            }
            
            .footer-links {
              flex-wrap: wrap;
              gap: var(--spacing-md);
            }
          }
          
          /* 页面过渡动画 */
          .page-transition {
            animation: fadeIn 0.5s ease-in-out;
          }
          
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          /* 元素过渡效果 */
          .transition-all {
            transition: all 0.3s ease-in-out;
          }
          
          /* 悬停效果 */
          .hover-lift {
            transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
          }
          
          .hover-lift:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-lg);
          }
          
          /* 按钮点击效果 */
          .btn:active {
            transform: translateY(0);
          }
          
          /* 输入框焦点效果 */
          .form-control:focus {
            outline: none;
            border-color: var(--primary-light);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            transform: translateY(-1px);
          }
          
          /* 加载动画 */
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
          
          .animate-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
          
          /* 滚动条样式 */
          ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          
          ::-webkit-scrollbar-track {
            background: var(--gray-light);
            border-radius: var(--border-radius);
          }
          
          ::-webkit-scrollbar-thumb {
            background: var(--gray-medium);
            border-radius: var(--border-radius);
          }
          
          ::-webkit-scrollbar-thumb:hover {
            background: var(--gray-color);
          }
        `}</style>
      </Head>
      <Component {...pageProps} />
    </>
  )
}
