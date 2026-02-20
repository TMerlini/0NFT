import { ethers } from 'ethers'
import { LayerZeroChain } from './chains'

// LayerZero V2 Endpoint interface for fee quoting
const LAYERZERO_ENDPOINT_ABI = [
  "function quote(tuple(uint32 dstEid, bytes32 to, bytes message, bytes options, bool payInLzToken) _params, address _sender) view returns (tuple(uint256 nativeFee, uint256 lzTokenFee) fee)"
]

// Typical ONFT message sizes and gas requirements
export const ONFT_MESSAGE_CONFIGS = {
  // Standard ONFT transfer (single NFT)
  SINGLE_TRANSFER: {
    messageSize: 64, // bytes
    dstGasLimit: 200000, // gas units on destination
    description: 'Single NFT transfer'
  },
  
  // Batch ONFT transfer (multiple NFTs)
  BATCH_TRANSFER: {
    messageSize: 128, // bytes  
    dstGasLimit: 400000, // gas units on destination
    description: 'Batch NFT transfer (up to 10 NFTs)'
  },
  
  // ONFT Adapter setup (setPeer)
  SET_PEER: {
    messageSize: 32, // bytes
    dstGasLimit: 100000, // gas units on destination
    description: 'Set cross-chain peer configuration'
  }
}

export interface LayerZeroFeeQuote {
  nativeFee: string // Fee in source chain native token (ETH, MATIC, etc.)
  lzTokenFee: string // Alternative fee in LZ tokens (usually 0 if paying in native)
  gasLimit: number
  messageType: string
  sourceChain: string
  destinationChain: string
}

export interface LayerZeroFeeBreakdown {
  sourceChainGas: string // Source transaction gas cost
  dvnFees: string // Security verification fees
  executorFees: string // Message delivery fees
  destinationGas: string // Destination execution gas cost
  total: string // Total cost in source chain native token
  totalUSD?: string // Total cost in USD (if price data available)
}

export class LayerZeroFeeEstimator {
  private provider: ethers.providers.Provider
  private sourceChain: LayerZeroChain

  constructor(provider: ethers.providers.Provider, sourceChain: LayerZeroChain) {
    this.provider = provider
    this.sourceChain = sourceChain
  }

  /**
   * Get real-time fee quote from LayerZero endpoint
   */
  async getONFTTransferQuote(
    destinationChain: LayerZeroChain,
    messageType: keyof typeof ONFT_MESSAGE_CONFIGS = 'SINGLE_TRANSFER',
    recipientAddress: string
  ): Promise<LayerZeroFeeQuote> {
    if (!this.sourceChain.layerZeroEndpointV2) {
      throw new Error(`LayerZero endpoint not configured for ${this.sourceChain.name}`)
    }

    if (!destinationChain.layerZeroEndpointV2) {
      throw new Error(`LayerZero endpoint not configured for ${destinationChain.name}`)
    }

    const config = ONFT_MESSAGE_CONFIGS[messageType]
    const endpoint = new ethers.Contract(
      this.sourceChain.layerZeroEndpointV2,
      LAYERZERO_ENDPOINT_ABI,
      this.provider
    )

    // Prepare quote parameters
    const quoteParams = {
      dstEid: destinationChain.layerZeroEndpointId, // LayerZero Endpoint ID
      to: ethers.utils.hexZeroPad(recipientAddress, 32), // 32-byte recipient address
      message: ethers.utils.hexlify(ethers.utils.randomBytes(config.messageSize)), // Mock message
      options: this.encodeExecutorOptions(config.dstGasLimit), // Execution options
      payInLzToken: false // Pay in native token, not LZ token
    }

    try {
      const quote = await endpoint.quote(quoteParams, recipientAddress)
      
      return {
        nativeFee: ethers.utils.formatEther(quote.fee.nativeFee),
        lzTokenFee: ethers.utils.formatEther(quote.fee.lzTokenFee),
        gasLimit: config.dstGasLimit,
        messageType: config.description,
        sourceChain: this.sourceChain.name,
        destinationChain: destinationChain.name
      }
    } catch (error) {
      console.error('Failed to get LayerZero quote:', error)
      // Fallback to estimated fees
      return this.getEstimatedFees(destinationChain, messageType, recipientAddress)
    }
  }

  /**
   * Get estimated fees when real quote is not available
   */
  private getEstimatedFees(
    destinationChain: LayerZeroChain,
    messageType: keyof typeof ONFT_MESSAGE_CONFIGS,
    recipientAddress: string
  ): LayerZeroFeeQuote {
    const config = ONFT_MESSAGE_CONFIGS[messageType]
    
    // Estimated base fees (these are rough estimates based on historical data)
    const baseFeeETH = {
      'ethereum': 0.001, // ~$3-4 at current ETH prices
      'polygon': 0.0001, // Much cheaper on Polygon
      'arbitrum': 0.0005, // L2 efficiency
      'optimism': 0.0005, // L2 efficiency  
      'base': 0.0003, // Base L2
      'avalanche': 0.001, // Similar to Ethereum
      'bsc': 0.0002, // Cheaper alternative
    }

    const sourceKey = this.sourceChain.name.toLowerCase()
    const destKey = destinationChain.name.toLowerCase()
    
    const baseFee = baseFeeETH[sourceKey as keyof typeof baseFeeETH] || 0.001
    const destMultiplier = baseFeeETH[destKey as keyof typeof baseFeeETH] || 0.001
    
    // Estimate total fee based on message complexity
    const complexityMultiplier = {
      'SINGLE_TRANSFER': 1.0,
      'BATCH_TRANSFER': 2.5,
      'SET_PEER': 0.5
    }
    
    const estimatedFee = (baseFee + destMultiplier) * complexityMultiplier[messageType]
    
    return {
      nativeFee: estimatedFee.toFixed(6),
      lzTokenFee: '0',
      gasLimit: config.dstGasLimit,
      messageType: config.description,
      sourceChain: this.sourceChain.name,
      destinationChain: destinationChain.name
    }
  }

  /**
   * Encode executor options for LayerZero message
   */
  private encodeExecutorOptions(gasLimit: number): string {
    // LayerZero V2 executor options encoding
    // Type 1: LZ_RECEIVE option with gas limit
    const optionType = 1
    const gasLimitBytes = ethers.utils.hexZeroPad(ethers.utils.hexlify(gasLimit), 16)
    const valueBytes = ethers.utils.hexZeroPad('0x0', 16) // No additional value
    
    return ethers.utils.hexConcat([
      ethers.utils.hexZeroPad(ethers.utils.hexlify(optionType), 2),
      gasLimitBytes,
      valueBytes
    ])
  }

  /**
   * Calculate total deployment costs including all LayerZero fees
   */
  async calculateDeploymentCosts(
    targetChains: LayerZeroChain[],
    deployerAddress: string
  ): Promise<{
    totalNativeFee: string
    perChainFees: LayerZeroFeeQuote[]
    breakdown: LayerZeroFeeBreakdown
  }> {
    const perChainFees: LayerZeroFeeQuote[] = []
    let totalNativeFee = ethers.BigNumber.from(0)

    // Get quotes for each target chain
    for (const targetChain of targetChains) {
      try {
        // Quote for ONFT deployment (setPeer operation)
        const setPeerQuote = await this.getONFTTransferQuote(
          targetChain,
          'SET_PEER',
          deployerAddress
        )
        
        perChainFees.push(setPeerQuote)
        totalNativeFee = totalNativeFee.add(
          ethers.utils.parseEther(setPeerQuote.nativeFee)
        )
      } catch (error) {
        console.error(`Failed to get quote for ${targetChain.name}:`, error)
      }
    }

    // Estimate breakdown (these are approximations)
    const total = ethers.utils.formatEther(totalNativeFee)
    const totalBN = ethers.utils.parseEther(total)
    
    const breakdown: LayerZeroFeeBreakdown = {
      sourceChainGas: ethers.utils.formatEther(totalBN.mul(20).div(100)), // ~20%
      dvnFees: ethers.utils.formatEther(totalBN.mul(40).div(100)), // ~40%
      executorFees: ethers.utils.formatEther(totalBN.mul(30).div(100)), // ~30%
      destinationGas: ethers.utils.formatEther(totalBN.mul(10).div(100)), // ~10%
      total
    }

    return {
      totalNativeFee: total,
      perChainFees,
      breakdown
    }
  }
}

/**
 * Utility function to create fee estimator for a given chain
 */
export function createLayerZeroFeeEstimator(
  provider: ethers.providers.Provider,
  sourceChain: LayerZeroChain
): LayerZeroFeeEstimator {
  return new LayerZeroFeeEstimator(provider, sourceChain)
}

/**
 * Get current LayerZero fee documentation links
 */
export const LAYERZERO_FEE_DOCS = {
  pricing: 'https://docs.layerzero.network/v2/concepts/protocol/transaction-pricing',
  feeSwitch: 'https://layerzero.foundation/fee-switch',
  developerGuide: 'https://docs.layerzero.network/v2/developers/evm/gas-settings/options',
  calculator: 'https://layerzeroscan.com/', // LayerZero explorer with fee tracking
}
