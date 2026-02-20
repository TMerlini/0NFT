import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import '@/lib/polyfills' // Import polyfills for Web3 compatibility
import { Web3Provider } from '@/components/providers/web3-provider'
import { Header } from '@/components/header'
import { ErrorBoundary } from '@/components/error-boundary'
import { WalletConnectErrorBoundary } from '@/components/walletconnect-error-boundary'
import { ErrorSuppression } from './error-suppression'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '0NFT Deployer - Cross-Chain NFT Adapter Platform',
  description: 'Deploy ONFT adapters and create cross-chain NFT collections using LayerZero',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ErrorSuppression />
        <ErrorBoundary>
          <WalletConnectErrorBoundary>
            <Web3Provider>
              <div className="min-h-screen bg-black">
                <Header />
                {children}
              </div>
            </Web3Provider>
          </WalletConnectErrorBoundary>
        </ErrorBoundary>
      </body>
    </html>
  )
}
