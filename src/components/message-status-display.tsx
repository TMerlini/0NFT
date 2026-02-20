'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  MessageStatusInfo,
  LayerZeroMessageTracker,
  MessageStatus
} from '@/lib/layerzero-message-tracker'
import { LayerZeroChain } from '@/lib/chains'
import { 
  CheckCircle, 
  Clock, 
  XCircle, 
  ExternalLink,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { ethers } from 'ethers'
import { MessageRetryButton } from './message-retry-button'

interface MessageStatusDisplayProps {
  guid: string
  sourceChain: LayerZeroChain
  destinationChain: LayerZeroChain
  sourceTxHash: string
  destinationContractAddress?: string // Destination ONFT contract address
  tokenId?: string // Token ID for retry functionality
  recipient?: string // Recipient address for retry functionality
  bridgeContractAddress?: string // Source bridge contract address for retry
  onRetryComplete?: (result: import('@/lib/message-retry-service').RetryResult) => void
}

export function MessageStatusDisplay({
  guid,
  sourceChain,
  destinationChain,
  sourceTxHash,
  destinationContractAddress,
  tokenId,
  recipient,
  bridgeContractAddress,
  onRetryComplete
}: MessageStatusDisplayProps) {
  const [status, setStatus] = useState<MessageStatusInfo | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!guid || !destinationContractAddress) return

    let mounted = true
    let pollInterval: NodeJS.Timeout | null = null
    const getRpcUrl = (chain: typeof sourceChain, fallback: string) =>
      (chain.rpcUrls as { default?: { http?: string[] } })?.default?.http?.[0] || fallback

    const startPolling = async () => {
      setIsPolling(true)
      setError(null)

      try {
        const sourceProvider = new ethers.providers.JsonRpcProvider(
          getRpcUrl(sourceChain, 'https://eth.llamarpc.com')
        )
        const destinationProvider = new ethers.providers.JsonRpcProvider(
          getRpcUrl(destinationChain, 'https://base.llamarpc.com')
        )

        // Start polling
        await LayerZeroMessageTracker.pollMessageStatus(
          guid,
          sourceChain,
          destinationChain,
          sourceProvider,
          destinationProvider,
          destinationContractAddress,
          (updatedStatus) => {
            if (mounted) {
              setStatus(updatedStatus)
            }
          },
          5 * 60 * 1000, // 5 minute timeout
          5 * 1000 // Poll every 5 seconds
        )
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to track message status')
          setStatus({
            status: 'UNKNOWN',
            guid,
            sourceChain,
            destinationChain,
            error: err.message
          })
        }
      } finally {
        if (mounted) {
          setIsPolling(false)
        }
      }
    }

    // Initial status check
    const checkInitialStatus = async () => {
      try {
        const sourceProvider = new ethers.providers.JsonRpcProvider(
          getRpcUrl(sourceChain, 'https://eth.llamarpc.com')
        )
        const destinationProvider = new ethers.providers.JsonRpcProvider(
          getRpcUrl(destinationChain, 'https://base.llamarpc.com')
        )

        const initialStatus = await LayerZeroMessageTracker.getMessageStatus(
          guid,
          sourceChain,
          destinationChain,
          sourceProvider
        )
        
        if (mounted) {
          setStatus(initialStatus)
        }

        // Start polling if not delivered
        if (initialStatus.status !== 'DELIVERED' && destinationContractAddress) {
          startPolling()
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to get initial status')
        }
      }
    }

    checkInitialStatus()

    return () => {
      mounted = false
      if (pollInterval) {
        clearInterval(pollInterval)
      }
    }
  }, [guid, sourceChain, destinationChain, destinationContractAddress])

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'INFLIGHT':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: MessageStatus) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Delivered</Badge>
      case 'INFLIGHT':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">In Flight</Badge>
      case 'FAILED':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Failed</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  const getExplorerUrl = (chain: LayerZeroChain, txHash: string) => {
    if (chain.id === 1) return `https://etherscan.io/tx/${txHash}`
    if (chain.id === 8453) return `https://basescan.org/tx/${txHash}`
    return `https://etherscan.io/tx/${txHash}` // Fallback
  }

  if (!status) {
    return (
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading message status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground">
            {getStatusIcon(status.status)}
            Message Status
          </div>
          {getStatusBadge(status.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* GUID */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Message GUID:</span>
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {guid.slice(0, 10)}...{guid.slice(-8)}
          </code>
        </div>

        {/* Source Transaction */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Source Transaction:</span>
          <a
            href={getExplorerUrl(sourceChain, sourceTxHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline flex items-center gap-1"
          >
            View <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Destination Transaction */}
        {status.destinationTxHash && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Destination Transaction:</span>
            <a
              href={getExplorerUrl(destinationChain, status.destinationTxHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              View <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}

        {/* Status Message */}
        {status.status === 'INFLIGHT' && (
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-600 dark:text-blue-400">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3" />
              <span>Message is in transit. This usually takes 2-5 minutes.</span>
            </div>
          </div>
        )}

        {status.status === 'DELIVERED' && (
          <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-600 dark:text-green-400">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3" />
              <span>Message delivered successfully!</span>
            </div>
          </div>
        )}

        {status.error && (
          <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
            <span>{status.error}</span>
          </div>
        )}

        {/* LayerZero Scan Link */}
        <div className="pt-2 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            asChild
          >
            <a
              href={LayerZeroMessageTracker.getLayerZeroScanUrl(sourceTxHash)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              View on LayerZero Scan
            </a>
          </Button>
        </div>

        {/* Polling Indicator */}
        {isPolling && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Checking delivery status...</span>
          </div>
        )}

        {/* Retry Button for Failed/Stuck Messages */}
        {(status.status === 'FAILED' || 
          status.status === 'INFLIGHT' || 
          (status.status === 'UNKNOWN' && status.error)) && (
          <div className="pt-2 border-t border-border/50">
            <MessageRetryButton
              message={status}
              sourceChain={sourceChain}
              destinationChain={destinationChain}
              sourceTxHash={sourceTxHash}
              destinationContractAddress={destinationContractAddress}
              tokenId={tokenId}
              recipient={recipient}
              bridgeContractAddress={bridgeContractAddress}
              onRetryComplete={onRetryComplete}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}