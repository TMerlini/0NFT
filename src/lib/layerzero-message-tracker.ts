import { ethers } from 'ethers'
import { LayerZeroChain } from './chains'
import { getLayerZeroEndpoint } from './layerzero'

export type MessageStatus = 'INFLIGHT' | 'DELIVERED' | 'FAILED' | 'UNKNOWN'

export interface MessageStatusInfo {
  status: MessageStatus
  guid: string
  sourceChain: LayerZeroChain
  destinationChain: LayerZeroChain
  sourceTxHash?: string
  destinationTxHash?: string
  timestamp?: number
  error?: string
}

/**
 * Track LayerZero message status by querying on-chain state
 * 
 * LayerZero V2 messages can be tracked by:
 * 1. Querying the LayerZero Endpoint contract for message status
 * 2. Checking if the message was executed on the destination chain
 * 3. Using LayerZero Scan API (if available)
 */
export class LayerZeroMessageTracker {
  /**
   * Get message status from LayerZero Endpoint
   * 
   * @param guid Message GUID (from ONFTSent event)
   * @param sourceChain Source chain
   * @param destinationChain Destination chain
   * @param provider Provider for source chain
   */
  static async getMessageStatus(
    guid: string,
    sourceChain: LayerZeroChain,
    destinationChain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<MessageStatusInfo> {
    try {
      const endpointAddress = getLayerZeroEndpoint(sourceChain.id)
      if (!endpointAddress) {
        return {
          status: 'UNKNOWN',
          guid,
          sourceChain,
          destinationChain,
          error: 'LayerZero endpoint not found for source chain'
        }
      }

      // LayerZero V2 Endpoint ABI for message status
      const endpointABI = [
        'function inboundNonce(uint32 srcEid, bytes32 sender) view returns (uint64)',
        'function outboundNonce(address sender, uint32 dstEid) view returns (uint64)',
        // Note: LayerZero V2 doesn't expose message status directly
        // We need to check if the message was executed on destination
      ]

      const endpoint = new ethers.Contract(endpointAddress, endpointABI, provider)
      
      // For now, we'll use a simple approach:
      // Check if we can find the message execution on destination chain
      // This is a simplified version - full implementation would require
      // checking the destination chain's LayerZero endpoint
      
      return {
        status: 'INFLIGHT', // Default - will be updated by polling
        guid,
        sourceChain,
        destinationChain
      }
    } catch (error: any) {
      console.error('Error getting message status:', error)
      return {
        status: 'UNKNOWN',
        guid,
        sourceChain,
        destinationChain,
        error: error.message
      }
    }
  }

  /**
   * Check if message was delivered by checking destination chain
   * 
   * @param guid Message GUID
   * @param destinationChain Destination chain
   * @param destinationProvider Provider for destination chain
   * @param destinationContract Destination ONFT contract address
   */
  static async checkDeliveryStatus(
    guid: string,
    destinationChain: LayerZeroChain,
    destinationProvider: ethers.providers.Provider,
    destinationContract: string
  ): Promise<{ delivered: boolean; txHash?: string; timestamp?: number }> {
    try {
      // Check for ONFTReceived event on destination chain
      const ONFT_ABI = [
        'event ONFTReceived(bytes32 indexed guid, uint32 srcEid, address indexed toAddress, uint256 tokenId)'
      ]

      const contract = new ethers.Contract(destinationContract, ONFT_ABI, destinationProvider)
      
      // Get current block
      const currentBlock = await destinationProvider.getBlockNumber()
      const fromBlock = Math.max(0, currentBlock - 10000) // Check last ~10k blocks

      // Filter for ONFTReceived events with this GUID
      const filter = contract.filters.ONFTReceived(guid)
      const events = await contract.queryFilter(filter, fromBlock, currentBlock)

      if (events.length > 0) {
        const event = events[0]
        const receipt = await destinationProvider.getTransactionReceipt(event.transactionHash)
        const block = await destinationProvider.getBlock(receipt.blockNumber)
        
        return {
          delivered: true,
          txHash: event.transactionHash,
          timestamp: block.timestamp * 1000 // Convert to milliseconds
        }
      }

      return { delivered: false }
    } catch (error: any) {
      console.error('Error checking delivery status:', error)
      return { delivered: false }
    }
  }

  /**
   * Poll message status until delivered or timeout
   * 
   * @param guid Message GUID
   * @param sourceChain Source chain
   * @param destinationChain Destination chain
   * @param sourceProvider Provider for source chain
   * @param destinationProvider Provider for destination chain
   * @param destinationContract Destination ONFT contract address
   * @param onUpdate Callback when status updates
   * @param timeoutMs Timeout in milliseconds (default: 5 minutes)
   * @param pollIntervalMs Poll interval in milliseconds (default: 5 seconds)
   */
  static async pollMessageStatus(
    guid: string,
    sourceChain: LayerZeroChain,
    destinationChain: LayerZeroChain,
    sourceProvider: ethers.providers.Provider,
    destinationProvider: ethers.providers.Provider,
    destinationContract: string,
    onUpdate?: (status: MessageStatusInfo) => void,
    timeoutMs: number = 5 * 60 * 1000, // 5 minutes
    pollIntervalMs: number = 5 * 1000 // 5 seconds
  ): Promise<MessageStatusInfo> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check delivery status
        const deliveryStatus = await this.checkDeliveryStatus(
          guid,
          destinationChain,
          destinationProvider,
          destinationContract
        )

        if (deliveryStatus.delivered) {
          const status: MessageStatusInfo = {
            status: 'DELIVERED',
            guid,
            sourceChain,
            destinationChain,
            destinationTxHash: deliveryStatus.txHash,
            timestamp: deliveryStatus.timestamp
          }
          
          if (onUpdate) onUpdate(status)
          return status
        }

        // Still in flight
        const status: MessageStatusInfo = {
          status: 'INFLIGHT',
          guid,
          sourceChain,
          destinationChain
        }
        
        if (onUpdate) onUpdate(status)
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs))
      } catch (error: any) {
        console.error('Error polling message status:', error)
        const status: MessageStatusInfo = {
          status: 'UNKNOWN',
          guid,
          sourceChain,
          destinationChain,
          error: error.message
        }
        if (onUpdate) onUpdate(status)
      }
    }

    // Timeout - message still in flight
    return {
      status: 'INFLIGHT',
      guid,
      sourceChain,
      destinationChain,
      error: 'Polling timeout - message may still be in transit'
    }
  }

  /**
   * Get LayerZero Scan URL for a message
   * 
   * LayerZero Scan uses transaction hash in the URL format:
   * https://layerzeroscan.com/tx/<txHash>
   * 
   * Note: The chain ID is not needed in the URL - LayerZero Scan identifies it automatically
   * The GUID format (/message/{guid}) doesn't work, so we use transaction hash
   */
  static getLayerZeroScanUrl(transactionHash: string): string {
    // LayerZero Scan format: /tx/{txHash} (no chain ID needed)
    return `https://layerzeroscan.com/tx/${transactionHash}`
  }
}