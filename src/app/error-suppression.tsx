'use client'

import { useEffect } from 'react'

export function ErrorSuppression() {
  useEffect(() => {
    // Comprehensive error suppression for WalletConnect issues
    const originalError = console.error
    const originalWarn = console.warn
    
    // Override window.onerror to catch all errors
    const originalWindowError = window.onerror
    window.onerror = (message, source, lineno, colno, error) => {
      const errorMessage = typeof message === 'string' ? message : String(message)
      
      if (
        errorMessage.includes('Connection interrupted') ||
        errorMessage.includes('WalletConnect') ||
        errorMessage.includes('WebSocket') ||
        errorMessage.includes('jsonrpc') ||
        errorMessage.includes('ethereum-provider') ||
        errorMessage.includes('WagmiProviderNotFoundError') ||
        errorMessage.includes('useConfig')
      ) {
        console.debug('Suppressed window error:', errorMessage)
        return true // Prevent default error handling
      }
      
      if (originalWindowError) {
        return originalWindowError(message, source, lineno, colno, error)
      }
      return false
    }
    
    console.error = (...args) => {
      const message = args.join(' ')
      
      // Suppress specific WalletConnect and Web3 errors
      if (
        message.includes('Connection interrupted while trying to subscribe') ||
        message.includes('WalletConnect') ||
        message.includes('localStorage.getItem is not a function') ||
        message.includes('localStorage.setItem is not a function') ||
        message.includes('WebSocket connection') ||
        message.includes('jsonrpc') ||
        message.includes('EventEmitter') ||
        message.includes('@walletconnect') ||
        message.includes('ChunkLoadError') ||
        message.includes('Loading chunk') ||
        message.includes('Failed to fetch') ||
        message.includes('NetworkError') ||
        message.includes('@react-native-async-storage') ||
        message.includes('react-native') ||
        message.includes('MetaMask SDK') ||
        message.includes('Module not found') ||
        message.includes('Can\'t resolve') ||
        message.includes('WagmiProviderNotFoundError') ||
        message.includes('useConfig') ||
        message.includes('must be used within') ||
        message.includes('Cannot set property ethereum') ||
        message.includes('Cannot redefine property') ||
        message.includes('Failed setting Xverse') ||
        message.includes('Another wallet may have already set it')
      ) {
        // Silently ignore these errors
        return
      }
      
      // Allow other errors through
      originalError.apply(console, args)
    }

    console.warn = (...args) => {
      const message = args.join(' ')
      
      // Suppress specific warnings
      if (
        message.includes('WalletConnect') ||
        message.includes('localStorage') ||
        message.includes('WebSocket') ||
        message.includes('jsonrpc') ||
        message.includes('@walletconnect') ||
        message.includes('@react-native-async-storage') ||
        message.includes('react-native') ||
        message.includes('MetaMask SDK') ||
        message.includes('Module not found') ||
        message.includes('Lit is in dev mode') ||
        message.includes('Reown Config') ||
        message.includes('Failed to fetch remote project configuration') ||
        message.includes('Default config') ||
        message.includes('Default executor config') ||
        message.includes('No executor address available') ||
        message.includes('Config (type') ||
        message.includes('does not exist for chain') ||
        message.includes('Download the React DevTools')
      ) {
        return
      }
      
      originalWarn.apply(console, args)
    }

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason?.message || String(reason)
      
      if (
        message.includes('Connection interrupted') ||
        message.includes('WalletConnect') ||
        message.includes('localStorage') ||
        message.includes('WebSocket') ||
        message.includes('jsonrpc') ||
        message.includes('EventEmitter') ||
        message.includes('@react-native-async-storage') ||
        message.includes('react-native') ||
        message.includes('MetaMask SDK')
      ) {
        event.preventDefault()
        return
      }
    }

    // Handle runtime errors
    const handleError = (event: ErrorEvent) => {
      const message = event.message || ''
      
      if (
        message.includes('Connection interrupted') ||
        message.includes('WalletConnect') ||
        message.includes('localStorage') ||
        message.includes('WebSocket') ||
        message.includes('jsonrpc') ||
        message.includes('ChunkLoadError') ||
        message.includes('@react-native-async-storage') ||
        message.includes('react-native') ||
        message.includes('MetaMask SDK') ||
        message.includes('Module not found')
      ) {
        event.preventDefault()
        return
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      console.error = originalError
      console.warn = originalWarn
      window.onerror = originalWindowError
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  return null
}
