'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'

import { config } from '@/lib/wagmi'

// Configure QueryClient with better error handling and WalletConnect suppression
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry WalletConnect errors
        if (error?.message?.includes('WalletConnect') || 
            error?.message?.includes('Connection interrupted')) {
          return false
        }
        return failureCount < 3
      },
      retryDelay: 1000,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    // Handle multiple wallet extension conflicts
    const handleWalletConflicts = () => {
      if (typeof window !== 'undefined') {
        // Prioritize MetaMask if multiple wallets are present
        const ethereum = (window as any).ethereum
        if (ethereum && ethereum.providers) {
          // Multiple providers detected
          console.log('Multiple wallet providers detected:', ethereum.providers.length)
          
          // Find MetaMask provider
          const metamaskProvider = ethereum.providers.find((provider: any) => 
            provider.isMetaMask && !provider.isXverse && !provider.isPhantom
          )
          
          if (metamaskProvider) {
            console.log('Using MetaMask as primary provider')
            ;(window as any).ethereum = metamaskProvider
          }
        }
      }
    }

    // Handle wallet conflicts first
    handleWalletConflicts()
    
    // Enhanced global error handlers specifically for WalletConnect
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason?.message || String(reason)
      
      if (
        message.includes('Connection interrupted') ||
        message.includes('WalletConnect') ||
        message.includes('WebSocket') ||
        message.includes('jsonrpc') ||
        message.includes('ethereum-provider') ||
        message.includes('Cannot set property ethereum') ||
        message.includes('Cannot redefine property') ||
        message.includes('Failed setting Xverse') ||
        message.includes('Another wallet may have already set it')
      ) {
        event.preventDefault()
        console.debug('Suppressed WalletConnect error:', message)
        return
      }
    }

    const handleError = (event: ErrorEvent) => {
      const message = event.message || ''
      
      if (
        message.includes('Connection interrupted') ||
        message.includes('WalletConnect') ||
        message.includes('WebSocket') ||
        message.includes('jsonrpc') ||
        message.includes('ethereum-provider') ||
        message.includes('Cannot set property ethereum') ||
        message.includes('Cannot redefine property') ||
        message.includes('Failed setting Xverse') ||
        message.includes('Another wallet may have already set it')
      ) {
        event.preventDefault()
        console.debug('Suppressed WalletConnect error:', message)
        return
      }
    }

    // Override console.error temporarily to catch WalletConnect initialization errors
    const originalError = console.error
    console.error = (...args) => {
      const message = args.join(' ')
      
      if (
        message.includes('Connection interrupted') ||
        message.includes('WalletConnect') ||
        message.includes('WebSocket') ||
        message.includes('jsonrpc') ||
        message.includes('ethereum-provider') ||
        message.includes('Cannot set property ethereum') ||
        message.includes('Cannot redefine property') ||
        message.includes('Failed setting Xverse') ||
        message.includes('Another wallet may have already set it') ||
        message.includes('EventEmitter')
      ) {
        console.debug('Suppressed WalletConnect initialization error:', message)
        return
      }
      
      originalError(...args)
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    // Restore console.error after a delay to allow initialization to complete
    const restoreConsole = setTimeout(() => {
      console.error = originalError
    }, 5000)

    return () => {
      console.error = originalError
      clearTimeout(restoreConsole)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  // Don't render app children until providers are mounted (avoids wagmi hooks crashing on /query etc.)
  if (!mounted) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-white/70">Loading...</div>
      </div>
    )
  }

  // Error boundary for Web3 provider initialization
  if (hasError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">Web3 Initialization Error</h2>
          <p className="text-gray-400 mb-4">There was an issue connecting to Web3 services.</p>
          <button 
            onClick={() => {
              setHasError(false)
              window.location.reload()
            }}
            className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  try {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider 
            theme={darkTheme({
              accentColor: '#ffffff',
              accentColorForeground: '#000000',
              borderRadius: 'medium',
              fontStack: 'system',
              overlayBlur: 'small',
            })}
            showRecentTransactions={true}
            coolMode={true}
            modalSize="compact"
          >
            {children}
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    )
  } catch (error) {
    console.debug('Web3Provider initialization error:', error)
    setHasError(true)
    return null
  }
}
