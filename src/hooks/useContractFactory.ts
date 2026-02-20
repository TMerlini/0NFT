'use client'

import { useMemo, useState, useEffect } from 'react'
import { ContractFactory } from '@/lib/contract-factory'
import { ethers } from 'ethers'

export function useContractFactory() {
  const [contractFactory, setContractFactory] = useState<ContractFactory | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    // Dynamically import wagmi hooks only after mounting and when WagmiProvider is available
    const initializeContractFactory = async () => {
      try {
        // Check if we're in a wagmi context
        const { useWalletClient, usePublicClient, useAccount } = await import('wagmi')
        
        // We can't use hooks in useEffect, so we'll create a mock factory for now
        // In a real implementation, this would need to be restructured
        setHasProvider(true)
        setIsConnected(false)
        setContractFactory(null)
        
      } catch (error) {
        console.warn('Wagmi not available, using fallback:', error)
        setHasProvider(false)
        setIsConnected(false)
        setContractFactory(null)
      }
    }

    initializeContractFactory()
  }, [mounted])

  return {
    contractFactory,
    isConnected,
    isMock: true, // Always mock for now to avoid provider issues
    hasProvider
  }
}

// Safe hook that can be used within WagmiProvider
export function useContractFactoryWithProvider() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only import and use wagmi hooks after mounting
  const wagmiHooks = useMemo(() => {
    if (!mounted || typeof window === 'undefined') {
      return null
    }

    try {
      // Dynamic import to avoid SSR issues
      const wagmi = require('wagmi')
      return {
        useWalletClient: wagmi.useWalletClient,
        usePublicClient: wagmi.usePublicClient,
        useAccount: wagmi.useAccount,
      }
    } catch (error) {
      console.warn('Failed to load wagmi hooks:', error)
      return null
    }
  }, [mounted])

  const contractFactory = useMemo(() => {
    if (!wagmiHooks || !mounted) {
      return null
    }

    try {
      // This is still problematic because we can't use hooks conditionally
      // We need a different approach
      return null
    } catch (error) {
      console.error('Failed to create contract factory:', error)
      return null
    }
  }, [wagmiHooks, mounted])

  return {
    contractFactory: null, // Always null for now to avoid hook issues
    isConnected: false,
    isMock: true,
    hasProvider: mounted
  }
}
