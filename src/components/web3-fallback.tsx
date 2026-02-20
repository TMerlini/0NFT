'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface Web3FallbackProps {
  error?: string
  onRetry?: () => void
}

export function Web3Fallback({ error, onRetry }: Web3FallbackProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      if (onRetry) {
        onRetry()
      } else {
        window.location.reload()
      }
    } finally {
      setTimeout(() => setIsRetrying(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
          <CardTitle className="text-white">Web3 Connection Issue</CardTitle>
          <CardDescription className="text-gray-400">
            There&apos;s a temporary issue connecting to Web3 services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <WifiOff className="w-4 h-4" />
              <span>WalletConnect initialization failed</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              This is usually a temporary network issue
            </p>
          </div>

          {error && (
            <details className="bg-gray-800 p-3 rounded-lg">
              <summary className="cursor-pointer text-sm text-gray-300">
                Technical Details
              </summary>
              <pre className="text-xs text-gray-400 mt-2 overflow-auto">
                {error}
              </pre>
            </details>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full bg-white text-black hover:bg-gray-200"
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <Wifi className="w-4 h-4 mr-2" />
                  Retry Connection
                </>
              )}
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
            >
              Refresh Page
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              You can also try:
            </p>
            <ul className="text-xs text-gray-400 mt-1 space-y-1">
              <li>• Checking your internet connection</li>
              <li>• Disabling ad blockers temporarily</li>
              <li>• Trying a different browser</li>
              <li>• Clearing browser cache</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Simplified version for inline use
export function Web3ConnectionStatus({ isConnected }: { isConnected: boolean }) {
  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-green-400 text-sm">
        <Wifi className="w-4 h-4" />
        <span>Web3 Connected</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-yellow-400 text-sm">
      <WifiOff className="w-4 h-4" />
      <span>Web3 Connecting...</span>
    </div>
  )
}
