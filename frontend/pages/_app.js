import Head from 'next/head'
import '../styles/global.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>RWA Compliance Gateway</title>
        <meta name="description" content="连接现实世界资产与DeFi生态的合规准入网关" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:8081 https://*;" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-Frame-Options" content="DENY" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
