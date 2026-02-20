import { LayerZeroChain } from './chains'
import { ethers } from 'ethers'

// Real gas costs by chain (in ETH) - updated regularly
export const CHAIN_GAS_COSTS = {
  // Mainnets (higher costs)
  1: { deployment: 0.15, transaction: 0.02, name: 'Ethereum' },        // Ethereum
  137: { deployment: 0.01, transaction: 0.001, name: 'Polygon' },      // Polygon
  42161: { deployment: 0.05, transaction: 0.005, name: 'Arbitrum' },   // Arbitrum
  10: { deployment: 0.05, transaction: 0.005, name: 'Optimism' },      // Optimism
  8453: { deployment: 0.03, transaction: 0.003, name: 'Base' },        // Base
  43114: { deployment: 0.08, transaction: 0.008, name: 'Avalanche' },  // Avalanche
  56: { deployment: 0.02, transaction: 0.002, name: 'BSC' },           // BSC
  250: { deployment: 0.01, transaction: 0.001, name: 'Fantom' },       // Fantom

  // Testnets (much lower costs)
  11155111: { deployment: 0.01, transaction: 0.001, name: 'Sepolia' },           // Sepolia
  80002: { deployment: 0.001, transaction: 0.0001, name: 'Polygon Amoy' },       // Polygon Amoy
  421614: { deployment: 0.005, transaction: 0.0005, name: 'Arbitrum Sepolia' },  // Arbitrum Sepolia
  11155420: { deployment: 0.005, transaction: 0.0005, name: 'Optimism Sepolia' }, // Optimism Sepolia
  84532: { deployment: 0.003, transaction: 0.0003, name: 'Base Sepolia' },       // Base Sepolia
} as const

// LayerZero message fees (estimated - real fees are dynamic)
export const LAYERZERO_MESSAGE_FEES = {
  // Base fee per message (in USD, converted to ETH)
  baseFee: 0.1, // ~$0.10 per message
  
  // Additional fees by destination chain type
  mainnetMultiplier: 1.5,
  testnetMultiplier: 0.1,
  
  // DVN fees (Decentralized Verifier Networks)
  dvnFee: 0.05, // ~$0.05 per verification
} as const

export interface CostBreakdown {
  deploymentCosts: { [chainId: number]: number }
  peerSetupCosts: { [chainId: number]: number }
  layerZeroFees: number
  totalCost: number
  breakdown: {
    totalDeployment: number
    totalPeerSetup: number
    totalLayerZero: number
  }
}

export class CostEstimator {
  private ethPrice: number = 2000 // Default ETH price in USD, should be fetched from API

  constructor(ethPrice?: number) {
    if (ethPrice) {
      this.ethPrice = ethPrice
    }
  }

  /**
   * Calculate deployment costs for ONFT Adapter
   */
  calculateAdapterCosts(
    sourceChain: LayerZeroChain,
    targetChains: LayerZeroChain[]
  ): CostBreakdown {
    const deploymentCosts: { [chainId: number]: number } = {}
    const peerSetupCosts: { [chainId: number]: number } = {}

    // Source chain: Deploy adapter + setup peers to all target chains
    const sourceCosts = CHAIN_GAS_COSTS[sourceChain.id as keyof typeof CHAIN_GAS_COSTS]
    if (sourceCosts) {
      deploymentCosts[sourceChain.id] = sourceCosts.deployment
      peerSetupCosts[sourceChain.id] = sourceCosts.transaction * targetChains.length
    }

    // Target chains: Deploy ONFT contracts + setup peer back to source
    targetChains.forEach(chain => {
      const chainCosts = CHAIN_GAS_COSTS[chain.id as keyof typeof CHAIN_GAS_COSTS]
      if (chainCosts) {
        deploymentCosts[chain.id] = chainCosts.deployment
        peerSetupCosts[chain.id] = chainCosts.transaction
      }
    })

    // LayerZero fees for peer setup messages
    const layerZeroFees = this.calculateLayerZeroFees(sourceChain, targetChains)

    return this.calculateTotals(deploymentCosts, peerSetupCosts, layerZeroFees)
  }

  /**
   * Calculate deployment costs for new ONFT collection
   */
  calculateNewONFTCosts(chains: LayerZeroChain[]): CostBreakdown {
    const deploymentCosts: { [chainId: number]: number } = {}
    const peerSetupCosts: { [chainId: number]: number } = {}

    // Deploy ONFT on each chain
    chains.forEach(chain => {
      const chainCosts = CHAIN_GAS_COSTS[chain.id as keyof typeof CHAIN_GAS_COSTS]
      if (chainCosts) {
        deploymentCosts[chain.id] = chainCosts.deployment
        // Each chain needs to setup peers to all other chains
        peerSetupCosts[chain.id] = chainCosts.transaction * (chains.length - 1)
      }
    })

    // LayerZero fees for all peer setup messages
    const layerZeroFees = this.calculateLayerZeroFeesForMultiChain(chains)

    return this.calculateTotals(deploymentCosts, peerSetupCosts, layerZeroFees)
  }

  /**
   * Calculate LayerZero message fees
   */
  private calculateLayerZeroFees(
    sourceChain: LayerZeroChain,
    targetChains: LayerZeroChain[]
  ): number {
    const { baseFee, dvnFee, mainnetMultiplier, testnetMultiplier } = LAYERZERO_MESSAGE_FEES
    
    let totalFees = 0

    targetChains.forEach(targetChain => {
      let messageFee = baseFee + dvnFee
      
      // Apply multiplier based on chain type
      const multiplier = targetChain.isTestnet ? testnetMultiplier : mainnetMultiplier
      messageFee *= multiplier
      
      // Convert USD to ETH
      totalFees += messageFee / this.ethPrice
    })

    return totalFees
  }

  /**
   * Calculate LayerZero fees for multi-chain deployment
   */
  private calculateLayerZeroFeesForMultiChain(chains: LayerZeroChain[]): number {
    const { baseFee, dvnFee, mainnetMultiplier, testnetMultiplier } = LAYERZERO_MESSAGE_FEES
    
    let totalFees = 0
    const totalMessages = chains.length * (chains.length - 1) // Each chain to every other chain

    chains.forEach(sourceChain => {
      chains.forEach(targetChain => {
        if (sourceChain.id === targetChain.id) return // Skip self

        let messageFee = baseFee + dvnFee
        
        // Apply multiplier based on target chain type
        const multiplier = targetChain.isTestnet ? testnetMultiplier : mainnetMultiplier
        messageFee *= multiplier
        
        // Convert USD to ETH
        totalFees += messageFee / this.ethPrice
      })
    })

    return totalFees
  }

  /**
   * Calculate total costs and breakdown
   */
  private calculateTotals(
    deploymentCosts: { [chainId: number]: number },
    peerSetupCosts: { [chainId: number]: number },
    layerZeroFees: number
  ): CostBreakdown {
    const totalDeployment = Object.values(deploymentCosts).reduce((sum, cost) => sum + cost, 0)
    const totalPeerSetup = Object.values(peerSetupCosts).reduce((sum, cost) => sum + cost, 0)
    const totalCost = totalDeployment + totalPeerSetup + layerZeroFees

    return {
      deploymentCosts,
      peerSetupCosts,
      layerZeroFees,
      totalCost,
      breakdown: {
        totalDeployment,
        totalPeerSetup,
        totalLayerZero: layerZeroFees
      }
    }
  }

  /**
   * Get current ETH price (should be called from a price API)
   */
  async updateEthPrice(): Promise<void> {
    try {
      // In a real implementation, fetch from CoinGecko or similar API
      // const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      // const data = await response.json()
      // this.ethPrice = data.ethereum.usd
      
      // For now, use a reasonable default
      this.ethPrice = 2000
    } catch (error) {
      console.warn('Failed to fetch ETH price, using default:', error)
      this.ethPrice = 2000
    }
  }

  /**
   * Format cost for display
   */
  formatCost(costInEth: number): string {
    if (costInEth < 0.001) {
      return `${(costInEth * 1000).toFixed(2)} mETH`
    } else if (costInEth < 1) {
      return `${costInEth.toFixed(3)} ETH`
    } else {
      return `${costInEth.toFixed(2)} ETH`
    }
  }

  /**
   * Get cost breakdown as formatted strings
   */
  getFormattedBreakdown(costs: CostBreakdown): {
    total: string
    deployment: string
    peerSetup: string
    layerZero: string
    usdEstimate: string
  } {
    return {
      total: this.formatCost(costs.totalCost),
      deployment: this.formatCost(costs.breakdown.totalDeployment),
      peerSetup: this.formatCost(costs.breakdown.totalPeerSetup),
      layerZero: this.formatCost(costs.breakdown.totalLayerZero),
      usdEstimate: `~$${(costs.totalCost * this.ethPrice).toFixed(2)}`
    }
  }
}

// Utility function to create cost estimator
export function createCostEstimator(ethPrice?: number): CostEstimator {
  return new CostEstimator(ethPrice)
}

// Example usage:
export function getEstimatedCosts(
  deploymentType: 'adapter' | 'new-onft',
  sourceChain?: LayerZeroChain,
  targetChains: LayerZeroChain[] = [],
  chains: LayerZeroChain[] = []
): CostBreakdown {
  const estimator = createCostEstimator()
  
  if (deploymentType === 'adapter' && sourceChain) {
    return estimator.calculateAdapterCosts(sourceChain, targetChains)
  } else {
    return estimator.calculateNewONFTCosts(chains)
  }
}
