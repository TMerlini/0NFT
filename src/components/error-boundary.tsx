'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Check if it's a WalletConnect or Web3 related error that we can safely ignore
    const isIgnorableError = 
      error.message?.includes('Connection interrupted') ||
      error.message?.includes('WalletConnect') ||
      error.message?.includes('localStorage') ||
      error.message?.includes('WebSocket') ||
      error.message?.includes('jsonrpc') ||
      error.name === 'ChunkLoadError'

    if (isIgnorableError) {
      console.warn('Suppressed non-critical Web3 error:', error.message)
      return { hasError: false } // Don't show error boundary for these
    }

    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging, but don't crash the app for WalletConnect issues
    const isIgnorableError = 
      error.message?.includes('Connection interrupted') ||
      error.message?.includes('WalletConnect') ||
      error.message?.includes('localStorage') ||
      error.message?.includes('WebSocket') ||
      error.message?.includes('jsonrpc')

    if (isIgnorableError) {
      console.warn('Caught and suppressed Web3 error:', error, errorInfo)
    } else {
      console.error('Caught error:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">Please refresh the page to continue.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white text-black rounded hover:bg-gray-200"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Global error handler for unhandled promise rejections and runtime errors
export function setupGlobalErrorHandlers() {
  if (typeof window === 'undefined') return

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason
    
    if (error?.message?.includes('Connection interrupted') ||
        error?.message?.includes('WalletConnect') ||
        error?.message?.includes('localStorage') ||
        error?.message?.includes('WebSocket') ||
        error?.message?.includes('jsonrpc')) {
      console.warn('Suppressed unhandled Web3 promise rejection:', error)
      event.preventDefault()
      return
    }
    
    console.error('Unhandled promise rejection:', error)
  })

  // Handle runtime errors
  window.addEventListener('error', (event) => {
    const error = event.error
    
    if (error?.message?.includes('Connection interrupted') ||
        error?.message?.includes('WalletConnect') ||
        error?.message?.includes('localStorage') ||
        error?.message?.includes('WebSocket') ||
        error?.message?.includes('jsonrpc') ||
        error?.name === 'ChunkLoadError') {
      console.warn('Suppressed runtime Web3 error:', error)
      event.preventDefault()
      return
    }
    
    console.error('Runtime error:', error)
  })

  // Override console.error to filter WalletConnect spam
  const originalConsoleError = console.error
  console.error = (...args) => {
    const message = args.join(' ')
    
    if (message.includes('Connection interrupted') ||
        message.includes('WalletConnect') ||
        message.includes('localStorage.getItem is not a function') ||
        message.includes('localStorage.setItem is not a function') ||
        message.includes('WebSocket') ||
        message.includes('jsonrpc')) {
      // Suppress these specific errors
      return
    }
    
    originalConsoleError.apply(console, args)
  }
}
