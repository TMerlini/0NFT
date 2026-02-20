'use client'

import { ReactNode, useState, useEffect } from 'react'
import { ContractFactory } from '@/lib/contract-factory'
import { ethers } from 'ethers'

interface WagmiWrapperProps {
  children: (props: {
    contractFactory: ContractFactory | null
    isConnected: boolean
    hasProvider: boolean
    address?: string
  }) => ReactNode
}

export function WagmiWrapper({ children }: WagmiWrapperProps) {
  const [mounted, setMounted] = useState(false)
  const [contractFactory, setContractFactory] = useState<ContractFactory | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)
  const [address, setAddress] = useState<string | undefined>(undefined)
  const [wagmiReady, setWagmiReady] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check if we're in a wagmi context by trying to access the provider
    const checkWagmiContext = () => {
      try {
        // Try to access wagmi context without using hooks
        const wagmiContext = (window as any).__WAGMI_CONTEXT__
        if (wagmiContext) {
          setWagmiReady(true)
          setHasProvider(true)
        } else {
          // Fallback: assume wagmi is available after a delay
          setTimeout(() => {
            setWagmiReady(true)
            setHasProvider(true)
          }, 1000)
        }
      } catch (error) {
        console.debug('Wagmi context not ready:', error)
        setWagmiReady(false)
        setHasProvider(false)
      }
    }

    checkWagmiContext()
  }, [])

  useEffect(() => {
    if (!mounted || !wagmiReady) return

    // Dynamically import and use wagmi hooks only when ready
    const initializeWagmi = async () => {
      try {
        const wagmi = await import('wagmi')
        
        // We still can't use hooks here, so we'll provide mock data for now
        // In a real implementation, this would need a different architecture
        setIsConnected(false)
        setContractFactory(null)
        setAddress(undefined)
        
      } catch (error) {
        console.warn('Failed to initialize wagmi:', error)
        setIsConnected(false)
        setContractFactory(null)
        setHasProvider(false)
      }
    }

    initializeWagmi()
  }, [mounted, wagmiReady])

  if (!mounted) {
    return children({
      contractFactory: null,
      isConnected: false,
      hasProvider: false,
    })
  }

  return children({
    contractFactory,
    isConnected,
    hasProvider,
    address,
  })
}
