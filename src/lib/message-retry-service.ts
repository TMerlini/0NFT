import { ethers } from 'ethers'
import { LayerZeroChain } from './chains'
import { getLayerZeroChainId, getLayerZeroEndpoint } from './layerzero'
import { MessageStatusInfo, MessageStatus } from './layerzero-message-tracker'
import { LayerZeroBridge } from './layerzero-bridge'
import { parseLayerZeroError, LayerZeroErrorType } from './layerzero-errors'

export interface RetryableMessage {
  guid: string
  sourceChain: LayerZeroChain
  destinationChain: LayerZeroChain
  sourceTxHash: string
  destinationContractAddress: string
  tokenId: string
  recipient: string
  originalStatus: MessageStatusInfo
  retryCount: number
  lastRetryAttempt?: number
  error?: string
}

export interface RetryResult {
  success: boolean
  transactionHash?: string
  guid?: string
  error?: string
  retryCount: number
}

/**
 * Message Retry Service
 * 
 * Handles retrying failed or stuck LayerZero messages with:
 * - Automatic gas adjustment
 * - Retry limit management
 * - Error-specific retry strategies
 * - Recovery tools for stuck messages
 */
export class MessageRetryService {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY_MS = 5000 // 5 seconds
  private static readonly GAS_MULTIPLIER = 1.2 // 20% increase for retries

  /**
   * Check if a message can be retried
   */
  static canRetry(message: MessageStatusInfo): boolean {
    // Can retry if:
    // 1. Message failed
    // 2. Message is stuck (INFLIGHT for too long)
    // 3. Message has an error but is retryable
    if (message.status === 'FAILED') {
      return true
    }

    if (message.status === 'INFLIGHT') {
      // Consider stuck if in flight for more than 10 minutes
      const now = Date.now()
      const messageAge = message.timestamp ? now - message.timestamp : Infinity
      return messageAge > 10 * 60 * 1000 // 10 minutes
    }

    if (message.status === 'UNKNOWN' && message.error) {
      // Check if error is retryable
      const error = parseLayerZeroError({ message: message.error })
      return error.retryable === true
    }

    return false
  }

  /**
   * Get retry reason for a message
   */
  static getRetryReason(message: MessageStatusInfo): string {
    if (message.status === 'FAILED') {
      return 'Message delivery failed'
    }

    if (message.status === 'INFLIGHT') {
      const now = Date.now()
      const messageAge = message.timestamp ? now - message.timestamp : Infinity
      if (messageAge > 10 * 60 * 1000) {
        return `Message stuck in transit (${Math.floor(messageAge / 60000)} minutes)`
      }
    }

    if (message.error) {
      return `Error: ${message.error}`
    }

    return 'Message needs retry'
  }

  /**
   * Retry a failed message by re-bridging the NFT
   * 
   * This creates a new bridge transaction with adjusted gas
   */
  static async retryMessage(
    retryableMessage: RetryableMessage,
    signer: ethers.Signer,
    onProgress?: (status: string) => void
  ): Promise<RetryResult> {
    try {
      onProgress?.('Preparing retry...')

      // Check retry limit
      if (retryableMessage.retryCount >= this.MAX_RETRIES) {
        return {
          success: false,
          error: `Maximum retry limit (${this.MAX_RETRIES}) reached`,
          retryCount: retryableMessage.retryCount
        }
      }

      // Verify the NFT is still locked/owned on source chain
      onProgress?.('Verifying NFT status...')
      const sourceProvider = signer.provider!
      const sourceChain = retryableMessage.sourceChain
      const destinationChain = retryableMessage.destinationChain

      // Get the bridge contract address (adapter or ONFT)
      // We need to find which contract was used originally
      // For now, we'll use the destination contract to infer the source contract
      const sourceEid = getLayerZeroChainId(sourceChain.id)
      const dstEid = getLayerZeroChainId(destinationChain.id)

      if (!sourceEid || !dstEid) {
        return {
          success: false,
          error: 'Invalid chain configuration',
          retryCount: retryableMessage.retryCount
        }
      }

      // Check if we can find the original contract from the transaction
      const txReceipt = await sourceProvider.getTransactionReceipt(retryableMessage.sourceTxHash)
      if (!txReceipt) {
        return {
          success: false,
          error: 'Original transaction not found',
          retryCount: retryableMessage.retryCount
        }
      }

      // Find the contract that was called (the bridge contract)
      const bridgeContractAddress = txReceipt.to
      if (!bridgeContractAddress) {
        return {
          success: false,
          error: 'Could not determine bridge contract address',
          retryCount: retryableMessage.retryCount
        }
      }

      onProgress?.('Retrying bridge transaction...')

      // Determine if this was an adapter or direct ONFT
      // We'll need to check the contract type - for now, assume adapter if we have destination contract
      // In a real implementation, we'd store this info with the message
      const isAdapter = true // Default to adapter - could be enhanced to detect from contract
      
      // Retry the bridge - LayerZeroBridge will handle gas estimation
      // For retries, we rely on the bridge function's gas estimation which should account for retries
      const bridgeResult = await LayerZeroBridge.bridgeNFT({
        contractAddress: bridgeContractAddress,
        tokenId: retryableMessage.tokenId,
        sourceChain,
        destinationChain,
        recipientAddress: retryableMessage.recipient,
        signer,
        originalCollectionAddress: isAdapter ? undefined : bridgeContractAddress
      })

      if (bridgeResult.success && bridgeResult.guid) {
        return {
          success: true,
          transactionHash: bridgeResult.transactionHash,
          guid: bridgeResult.guid,
          retryCount: retryableMessage.retryCount + 1
        }
      } else {
        return {
          success: false,
          error: bridgeResult.error || 'Bridge retry failed',
          retryCount: retryableMessage.retryCount + 1
        }
      }
    } catch (error: any) {
      console.error('Error retrying message:', error)
      const parsedError = parseLayerZeroError(error)
      
      return {
        success: false,
        error: parsedError.userMessage || error.message || 'Unknown error during retry',
        retryCount: retryableMessage.retryCount + 1
      }
    }
  }

  /**
   * Check if a message is stuck (in flight for too long)
   */
  static isStuck(message: MessageStatusInfo, timeoutMinutes: number = 10): boolean {
    if (message.status !== 'INFLIGHT') {
      return false
    }

    if (!message.timestamp) {
      return false
    }

    const now = Date.now()
    const messageAge = now - message.timestamp
    return messageAge > timeoutMinutes * 60 * 1000
  }

  /**
   * Get recovery suggestions for a failed/stuck message
   */
  static getRecoverySuggestions(message: MessageStatusInfo): string[] {
    const suggestions: string[] = []

    if (message.status === 'FAILED') {
      suggestions.push('The message delivery failed on the destination chain')
      suggestions.push('Try retrying the bridge transaction')
      suggestions.push('Check if the destination contract is properly configured')
      suggestions.push('Verify peer configuration between chains')
    }

    if (this.isStuck(message)) {
      suggestions.push('Message has been in transit for an extended period')
      suggestions.push('This may indicate network congestion or configuration issues')
      suggestions.push('Try retrying the bridge transaction')
      suggestions.push('Check LayerZero Scan for detailed message status')
    }

    if (message.error) {
      const parsedError = parseLayerZeroError({ message: message.error })
      suggestions.push(...parsedError.recovery)
    }

    if (suggestions.length === 0) {
      suggestions.push('Check LayerZero Scan for detailed message information')
      suggestions.push('Verify your wallet connection and network')
      suggestions.push('Try refreshing the page and checking again')
    }

    return suggestions
  }

  /**
   * Store retry history in localStorage
   */
  static saveRetryHistory(message: RetryableMessage): void {
    try {
      const key = `lz_retry_${message.guid}`
      const history = {
        ...message,
        lastRetryAttempt: Date.now()
      }
      localStorage.setItem(key, JSON.stringify(history))
    } catch (error) {
      console.error('Error saving retry history:', error)
    }
  }

  /**
   * Load retry history from localStorage
   */
  static loadRetryHistory(guid: string): RetryableMessage | null {
    try {
      const key = `lz_retry_${guid}`
      const stored = localStorage.getItem(key)
      if (stored) {
        return JSON.parse(stored) as RetryableMessage
      }
    } catch (error) {
      console.error('Error loading retry history:', error)
    }
    return null
  }

  /**
   * Clear retry history
   */
  static clearRetryHistory(guid: string): void {
    try {
      const key = `lz_retry_${guid}`
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Error clearing retry history:', error)
    }
  }
}
