'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class WalletConnectErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a WalletConnect related error
    const isWalletConnectError = 
      error.message?.includes('Connection interrupted') ||
      error.message?.includes('WalletConnect') ||
      error.message?.includes('WebSocket') ||
      error.message?.includes('jsonrpc') ||
      error.message?.includes('ethereum-provider') ||
      error.stack?.includes('walletconnect') ||
      error.stack?.includes('ethereum-provider')

    if (isWalletConnectError) {
      console.debug('WalletConnect error caught by boundary:', error.message)
      // Don't show error UI for WalletConnect errors, just suppress them
      return { hasError: false, error: null }
    }

    // For other errors, show the error boundary
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log non-WalletConnect errors
    const isWalletConnectError = 
      error.message?.includes('Connection interrupted') ||
      error.message?.includes('WalletConnect') ||
      error.message?.includes('WebSocket') ||
      error.message?.includes('jsonrpc') ||
      error.message?.includes('ethereum-provider')

    if (!isWalletConnectError) {
      console.error('Non-WalletConnect error caught:', error, errorInfo)
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-gray-400 mb-6">
              An unexpected error occurred. This might be a temporary issue.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null })
                }}
                className="w-full px-4 py-2 bg-white text-black rounded hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
              >
                Refresh Page
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <pre className="mt-2 text-xs bg-gray-900 p-2 rounded overflow-auto">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook version for functional components
export function useWalletConnectErrorHandler() {
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      const isWalletConnectError = 
        event.message?.includes('Connection interrupted') ||
        event.message?.includes('WalletConnect') ||
        event.message?.includes('WebSocket') ||
        event.message?.includes('jsonrpc') ||
        event.message?.includes('ethereum-provider')

      if (isWalletConnectError) {
        event.preventDefault()
        console.debug('WalletConnect error suppressed:', event.message)
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason?.message || String(reason)
      
      const isWalletConnectError = 
        message.includes('Connection interrupted') ||
        message.includes('WalletConnect') ||
        message.includes('WebSocket') ||
        message.includes('jsonrpc') ||
        message.includes('ethereum-provider')

      if (isWalletConnectError) {
        event.preventDefault()
        console.debug('WalletConnect promise rejection suppressed:', message)
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
}
