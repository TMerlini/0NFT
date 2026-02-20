'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PeerConfigurator, PeerConfiguration } from '@/lib/peer-configurator'
import { LayerZeroChain } from '@/lib/chains'
import { 
  Link2, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Settings
} from 'lucide-react'

interface PeerConfiguratorProps {
  adapterAddress: string
  sourceChain: LayerZeroChain
  onftAddress: string
  targetChain: LayerZeroChain
}

export function PeerConfiguratorComponent({ 
  adapterAddress, 
  sourceChain, 
  onftAddress, 
  targetChain 
}: PeerConfiguratorProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [peerStatus, setPeerStatus] = useState<{
    sourceToTarget: boolean
    targetToSource: boolean
    sourceToTargetAddress?: string
    targetToSourceAddress?: string
  } | null>(null)
  const [configResult, setConfigResult] = useState<{
    sourceToTarget: string
    targetToSource: string
  } | null>(null)

  const checkPeerStatus = async () => {
    setIsChecking(true)
    try {
      const config: PeerConfiguration = {
        sourceContract: adapterAddress,
        sourceChain,
        targetContract: onftAddress,
        targetChain
      }

      const status = await PeerConfigurator.checkPeerConfiguration(config)
      setPeerStatus(status)
      console.log('🔍 Peer status:', status)
    } catch (error) {
      console.error('❌ Failed to check peer status:', error)
      alert(`Failed to check peer status: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsChecking(false)
    }
  }

  const configurePeers = async () => {
    setIsConfiguring(true)
    try {
      const config: PeerConfiguration = {
        sourceContract: adapterAddress,
        sourceChain,
        targetContract: onftAddress,
        targetChain
      }

      const result = await PeerConfigurator.configurePeers(config)
      setConfigResult(result)
      
      // Refresh peer status
      await checkPeerStatus()
      
      alert(`✅ Peer configuration complete!

Source->Target: ${result.sourceToTarget}
Target->Source: ${result.targetToSource}

Your contracts are now ready for cross-chain bridging!`)
      
    } catch (error) {
      console.error('❌ Failed to configure peers:', error)
      alert(`Failed to configure peers: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsConfiguring(false)
    }
  }

  const getExplorerUrl = (chainId: number, txHash: string) => {
    const explorers: { [key: number]: string } = {
      1: 'https://etherscan.io',
      8453: 'https://basescan.org',
    }
    
    const baseUrl = explorers[chainId] || 'https://etherscan.io'
    return `${baseUrl}/tx/${txHash}`
  }

  const isPeerConfigured = peerStatus?.sourceToTarget && peerStatus?.targetToSource

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Peer Configuration
        </CardTitle>
        <CardDescription>
          Configure cross-chain connections between your ONFT Adapter and ONFT contracts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contract Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-medium">ONFT Adapter</p>
            <p className="text-muted-foreground">{sourceChain.name}</p>
            <code className="text-xs bg-gray-800 text-gray-200 px-2 py-1 rounded block mt-1">
              {adapterAddress.slice(0, 8)}...{adapterAddress.slice(-6)}
            </code>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="font-medium">ONFT Contract</p>
            <p className="text-muted-foreground">{targetChain.name}</p>
            <code className="text-xs bg-gray-800 text-gray-200 px-2 py-1 rounded block mt-1">
              {onftAddress.slice(0, 8)}...{onftAddress.slice(-6)}
            </code>
          </div>
        </div>

        {/* Peer Status */}
        {peerStatus && (
          <div className="space-y-2">
            <h4 className="font-medium">Connection Status</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-sm">{sourceChain.name} → {targetChain.name}</span>
                {peerStatus.sourceToTarget ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                <span className="text-sm">{targetChain.name} → {sourceChain.name}</span>
                {peerStatus.targetToSource ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Connected
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configuration Results */}
        {configResult && (
          <div className="space-y-2">
            <h4 className="font-medium">Configuration Transactions</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded">
                <span className="text-sm">{sourceChain.name} Configuration</span>
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={getExplorerUrl(sourceChain.id, configResult.sourceToTarget)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-500/10 border border-green-500/20 rounded">
                <span className="text-sm">{targetChain.name} Configuration</span>
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={getExplorerUrl(targetChain.id, configResult.targetToSource)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={checkPeerStatus}
            disabled={isChecking}
            className="flex items-center gap-2"
          >
            {isChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
            Check Status
          </Button>

          {peerStatus && !isPeerConfigured && (
            <Button
              onClick={configurePeers}
              disabled={isConfiguring}
              className="flex items-center gap-2"
            >
              {isConfiguring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Configure Peers
            </Button>
          )}

          {isPeerConfigured && (
            <Button variant="default" className="bg-green-600 hover:bg-green-700" asChild>
              <a href="/bridge">
                <CheckCircle className="h-4 w-4 mr-2" />
                Ready to Bridge
              </a>
            </Button>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Note:</strong> Peer configuration requires you to be the owner of both contracts.</p>
          <p>This will require two transactions: one on each chain to establish bidirectional connections.</p>
          {isPeerConfigured && (
            <p className="text-green-400"><strong>✅ Ready:</strong> Your contracts are now connected and ready for cross-chain bridging!</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
