'use client'

import { ReactNode, useState, useEffect } from 'react'

interface Web3ReadyWrapperProps {
  children: ReactNode
  fallback?: ReactNode
}

export function Web3ReadyWrapper({ children, fallback }: Web3ReadyWrapperProps) {
  const [isReady, setIsReady] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Wait for Web3 providers to be ready
    const checkWeb3Ready = () => {
      // Check if wagmi context is available
      try {
        // Look for wagmi provider in the DOM or window
        const hasWagmiProvider = document.querySelector('[data-rk]') !== null ||
                                (window as any).__WAGMI_CONFIG__ !== undefined ||
                                (window as any).ethereum !== undefined

        if (hasWagmiProvider) {
          setIsReady(true)
        } else {
          // Retry after a short delay
          setTimeout(checkWeb3Ready, 500)
        }
      } catch (error) {
        console.debug('Web3 not ready yet:', error)
        setTimeout(checkWeb3Ready, 500)
      }
    }

    // Start checking after a brief delay to allow providers to initialize
    const timer = setTimeout(checkWeb3Ready, 100)

    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return fallback || (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Initializing...</p>
        </div>
      </div>
    )
  }

  if (!isReady) {
    return fallback || (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-8 w-8 bg-white/20 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Web3...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
