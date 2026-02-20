'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Eye, EyeOff } from 'lucide-react'

export function WalletDebug() {
  const [isVisible, setIsVisible] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const refreshDebugInfo = () => {
    if (!mounted) return

    const info: any = {
      timestamp: new Date().toLocaleTimeString(),
      ethereum: !!((window as any).ethereum),
      accounts: null,
      wagmiStore: null,
      connectButton: null,
      accountButton: null,
    }

    // Check ethereum provider
    if ((window as any).ethereum) {
      (window as any).ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          info.accounts = accounts
          setDebugInfo({...info})
        })
        .catch((error: any) => {
          info.accountsError = error.message
          setDebugInfo({...info})
        })
    }

    // Check wagmi store
    try {
      const wagmiStore = localStorage.getItem('wagmi.store')
      if (wagmiStore) {
        const store = JSON.parse(wagmiStore)
        info.wagmiStore = {
          hasConnections: !!store.state?.connections,
          connectionCount: store.state?.connections?.size || 0,
          current: !!store.state?.current,
        }
      }
    } catch (error) {
      info.wagmiStoreError = 'Failed to parse'
    }

    // Check RainbowKit buttons
    const connectButton = document.querySelector('button[data-testid="rk-connect-button"]')
    const accountButton = document.querySelector('button[data-testid="rk-account-button"]')
    
    info.connectButton = connectButton ? {
      exists: true,
      text: connectButton.textContent,
      ariaLabel: connectButton.getAttribute('aria-label'),
    } : { exists: false }

    info.accountButton = accountButton ? {
      exists: true,
      text: accountButton.textContent,
      ariaLabel: accountButton.getAttribute('aria-label'),
    } : { exists: false }

    setDebugInfo(info)
  }

  useEffect(() => {
    if (mounted && isVisible) {
      refreshDebugInfo()
      const interval = setInterval(refreshDebugInfo, 2000)
      return () => clearInterval(interval)
    }
  }, [mounted, isVisible])

  if (!mounted) return null

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2"
      >
        {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {isVisible ? 'Hide' : 'Debug'}
      </Button>

      {isVisible && (
        <Card className="w-80 max-h-96 overflow-y-auto">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              Wallet Debug Info
              <Button variant="ghost" size="sm" onClick={refreshDebugInfo}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <div>
              <strong>Updated:</strong> {debugInfo.timestamp}
            </div>
            
            <div>
              <strong>Ethereum Provider:</strong>{' '}
              <Badge variant={debugInfo.ethereum ? 'default' : 'destructive'}>
                {debugInfo.ethereum ? 'Available' : 'Not Found'}
              </Badge>
            </div>

            {debugInfo.accounts && (
              <div>
                <strong>Accounts:</strong>
                <div className="bg-muted p-2 rounded text-xs mt-1">
                  {debugInfo.accounts.length > 0 ? (
                    debugInfo.accounts.map((account: string, i: number) => (
                      <div key={i}>{account}</div>
                    ))
                  ) : (
                    'No accounts'
                  )}
                </div>
              </div>
            )}

            {debugInfo.accountsError && (
              <div>
                <strong>Accounts Error:</strong>
                <div className="bg-red-100 p-2 rounded text-xs mt-1">
                  {debugInfo.accountsError}
                </div>
              </div>
            )}

            <div>
              <strong>Connect Button:</strong>{' '}
              <Badge variant={debugInfo.connectButton?.exists ? 'default' : 'destructive'}>
                {debugInfo.connectButton?.exists ? 'Found' : 'Not Found'}
              </Badge>
              {debugInfo.connectButton?.exists && (
                <div className="bg-muted p-2 rounded text-xs mt-1">
                  Text: &quot;{debugInfo.connectButton.text}&quot;
                </div>
              )}
            </div>

            <div>
              <strong>Account Button:</strong>{' '}
              <Badge variant={debugInfo.accountButton?.exists ? 'default' : 'destructive'}>
                {debugInfo.accountButton?.exists ? 'Found' : 'Not Found'}
              </Badge>
              {debugInfo.accountButton?.exists && (
                <div className="bg-muted p-2 rounded text-xs mt-1">
                  Text: &quot;{debugInfo.accountButton.text}&quot;
                </div>
              )}
            </div>

            {debugInfo.wagmiStore && (
              <div>
                <strong>Wagmi Store:</strong>
                <div className="bg-muted p-2 rounded text-xs mt-1">
                  Connections: {debugInfo.wagmiStore.connectionCount}<br/>
                  Current: {debugInfo.wagmiStore.current ? 'Yes' : 'No'}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
