'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  MessageStatusInfo,
  MessageStatus
} from '@/lib/layerzero-message-tracker'
import { 
  MessageRetryService,
  RetryableMessage,
  RetryResult
} from '@/lib/message-retry-service'
import { LayerZeroChain } from '@/lib/chains'
import { RefreshCw, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { ethers } from 'ethers'
import { useWalletClient } from 'wagmi'

interface MessageRetryButtonProps {
  message: MessageStatusInfo
  sourceChain: LayerZeroChain
  destinationChain: LayerZeroChain
  sourceTxHash: string
  destinationContractAddress?: string
  tokenId?: string
  recipient?: string
  bridgeContractAddress?: string
  onRetryComplete?: (result: RetryResult) => void
}

export function MessageRetryButton({
  message,
  sourceChain,
  destinationChain,
  sourceTxHash,
  destinationContractAddress,
  tokenId,
  recipient,
  bridgeContractAddress,
  onRetryComplete
}: MessageRetryButtonProps) {
  const [isRetrying, setIsRetrying] = useState(false)
  const [retryStatus, setRetryStatus] = useState<string | null>(null)
  const [retryResult, setRetryResult] = useState<RetryResult | null>(null)
  const { data: walletClient } = useWalletClient()

  // Check if message can be retried
  const canRetry = MessageRetryService.canRetry(message)
  const retryReason = MessageRetryService.getRetryReason(message)

  // Load retry history
  const retryHistory = tokenId ? MessageRetryService.loadRetryHistory(message.guid) : null
  const retryCount = retryHistory?.retryCount || 0

  const handleRetry = async () => {
    if (!walletClient || !tokenId || !recipient || !bridgeContractAddress || !destinationContractAddress) {
      alert('Missing required information for retry. Please ensure all message details are available.')
      return
    }

    setIsRetrying(true)
    setRetryStatus('Preparing retry...')
    setRetryResult(null)

    try {
      // Convert walletClient to ethers Signer
      const provider = new ethers.providers.Web3Provider(window.ethereum!)
      const signer = provider.getSigner()

      // Create retryable message
      const retryableMessage: RetryableMessage = {
        guid: message.guid,
        sourceChain,
        destinationChain,
        sourceTxHash,
        destinationContractAddress,
        tokenId,
        recipient,
        originalStatus: message,
        retryCount: retryCount
      }

      // Perform retry
      const result = await MessageRetryService.retryMessage(
        retryableMessage,
        signer,
        (status) => setRetryStatus(status)
      )

      setRetryResult(result)
      
      if (result.success) {
        // Save retry history
        retryableMessage.retryCount = result.retryCount
        MessageRetryService.saveRetryHistory(retryableMessage)
        setRetryStatus('Retry successful! New transaction created.')
      } else {
        setRetryStatus(`Retry failed: ${result.error}`)
      }

      if (onRetryComplete) {
        onRetryComplete(result)
      }
    } catch (error: any) {
      console.error('Error during retry:', error)
      setRetryResult({
        success: false,
        error: error.message || 'Unknown error during retry',
        retryCount: retryCount + 1
      })
      setRetryStatus(`Error: ${error.message || 'Unknown error'}`)
    } finally {
      setIsRetrying(false)
    }
  }

  if (!canRetry) {
    return null
  }

  if (retryCount >= MessageRetryService['MAX_RETRIES']) {
    return (
      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-600 dark:text-red-400">
        <div className="flex items-center gap-2">
          <XCircle className="h-3 w-3" />
          <span>Maximum retry limit reached ({MessageRetryService['MAX_RETRIES']} attempts)</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Retry Reason */}
      <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs text-yellow-600 dark:text-yellow-400">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3 w-3" />
          <span>{retryReason}</span>
        </div>
      </div>

      {/* Retry Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRetry}
        disabled={isRetrying || !walletClient || !tokenId || !recipient || !bridgeContractAddress}
        className="w-full"
      >
        {isRetrying ? (
          <>
            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
            Retrying...
          </>
        ) : (
          <>
            <RefreshCw className="h-3 w-3 mr-2" />
            Retry Message {retryCount > 0 && `(${retryCount}/${MessageRetryService['MAX_RETRIES']})`}
          </>
        )}
      </Button>

      {/* Retry Status */}
      {retryStatus && (
        <div className={`p-2 rounded text-xs ${
          retryResult?.success 
            ? 'bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400'
            : retryResult?.success === false
            ? 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
            : 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
        }`}>
          <div className="flex items-center gap-2">
            {retryResult?.success ? (
              <CheckCircle className="h-3 w-3" />
            ) : retryResult?.success === false ? (
              <XCircle className="h-3 w-3" />
            ) : (
              <RefreshCw className="h-3 w-3 animate-spin" />
            )}
            <span>{retryStatus}</span>
          </div>
        </div>
      )}

      {/* Retry Result */}
      {retryResult?.success && retryResult.transactionHash && (
        <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-3 w-3" />
              <span className="font-medium">Retry successful!</span>
            </div>
            <div className="text-muted-foreground">
              <div>New transaction: <code className="text-xs">{retryResult.transactionHash.slice(0, 10)}...{retryResult.transactionHash.slice(-8)}</code></div>
              {retryResult.guid && (
                <div>New GUID: <code className="text-xs">{retryResult.guid.slice(0, 10)}...{retryResult.guid.slice(-8)}</code></div>
              )}
            </div>
          </div>
        </div>
      )}

      {retryResult?.success === false && retryResult.error && (
        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <XCircle className="h-3 w-3" />
            <span>{retryResult.error}</span>
          </div>
        </div>
      )}
    </div>
  )
}
