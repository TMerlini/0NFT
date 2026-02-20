/**
 * Deployment Cost Configuration
 * 
 * This file contains configurable parameters for cost estimation.
 * Update these values based on current market conditions and your requirements.
 */

// Gas costs by chain (in ETH) - UPDATE THESE REGULARLY
export const DEPLOYMENT_COSTS = {
  // Ethereum Mainnet - High costs due to network congestion
  ethereum: {
    deployment: 0.15,    // ~$300 at $2000 ETH
    transaction: 0.02,   // ~$40 per transaction
    multiplier: 1.0,     // Base multiplier
  },
  
  // Layer 2 Solutions - Lower costs
  polygon: {
    deployment: 0.01,    // ~$20
    transaction: 0.001,  // ~$2 per transaction
    multiplier: 0.1,     // Much cheaper
  },
  
  arbitrum: {
    deployment: 0.05,    // ~$100
    transaction: 0.005,  // ~$10 per transaction
    multiplier: 0.3,     // Cheaper than mainnet
  },
  
  optimism: {
    deployment: 0.05,    // ~$100
    transaction: 0.005,  // ~$10 per transaction
    multiplier: 0.3,     // Similar to Arbitrum
  },
  
  base: {
    deployment: 0.03,    // ~$60
    transaction: 0.003,  // ~$6 per transaction
    multiplier: 0.2,     // Very cheap
  },
  
  // Other Chains
  avalanche: {
    deployment: 0.08,    // ~$160
    transaction: 0.008,  // ~$16 per transaction
    multiplier: 0.4,
  },
  
  bsc: {
    deployment: 0.02,    // ~$40
    transaction: 0.002,  // ~$4 per transaction
    multiplier: 0.1,
  },
  
  fantom: {
    deployment: 0.01,    // ~$20
    transaction: 0.001,  // ~$2 per transaction
    multiplier: 0.05,    // Very cheap
  },
  
  // Testnets - Much lower costs
  testnets: {
    deployment: 0.005,   // ~$10
    transaction: 0.0005, // ~$1 per transaction
    multiplier: 0.01,    // Extremely cheap
  }
} as const

// LayerZero Protocol Fees - These are set by LayerZero
export const LAYERZERO_FEES = {
  // Base message fee (in USD, converted to ETH)
  baseFeeUSD: 0.10,        // $0.10 per message (typical)
  
  // DVN (Decentralized Verifier Network) fees
  dvnFeeUSD: 0.05,         // $0.05 per verification
  
  // Multipliers by chain type
  mainnetMultiplier: 1.5,  // 50% higher for mainnets
  testnetMultiplier: 0.1,  // 90% lower for testnets
  
  // Gas fees for LayerZero operations (paid on destination)
  executionGasMultiplier: 1.2, // 20% buffer for execution
} as const

// Market Data Configuration
export const MARKET_CONFIG = {
  // Default ETH price (USD) - should be fetched from API
  defaultEthPrice: 2000,
  
  // Price API endpoints (for real-time pricing)
  priceApis: {
    coingecko: 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
    coinbase: 'https://api.coinbase.com/v2/exchange-rates?currency=ETH',
  },
  
  // Gas price multipliers for different urgency levels
  gasMultipliers: {
    slow: 0.8,     // 20% below standard
    standard: 1.0, // Base price
    fast: 1.5,     // 50% above standard
    instant: 2.0,  // 100% above standard
  }
} as const

// Deployment Configuration
export const DEPLOYMENT_CONFIG = {
  // Safety margins
  gasSafetyMargin: 1.2,    // 20% extra gas buffer
  costSafetyMargin: 1.1,   // 10% extra cost buffer
  
  // Timing estimates (minutes)
  deploymentTime: {
    perContract: 2,        // 2 minutes per contract deployment
    perPeerSetup: 1,       // 1 minute per peer setup
    networkDelay: 1,       // 1 minute network propagation
  },
  
  // Maximum recommended costs (in ETH)
  maxRecommendedCosts: {
    singleChain: 0.5,      // 0.5 ETH for single chain
    multiChain: 2.0,       // 2 ETH for multi-chain
    enterprise: 10.0,      // 10 ETH for enterprise deployments
  }
} as const

/**
 * Configuration for different deployment scenarios
 */
export const DEPLOYMENT_SCENARIOS = {
  // Small project: 1-3 chains, testnets preferred
  small: {
    maxChains: 3,
    preferTestnets: true,
    maxCostETH: 0.1,
    description: 'Perfect for testing and small projects'
  },
  
  // Medium project: 3-8 chains, mix of mainnet and L2
  medium: {
    maxChains: 8,
    preferTestnets: false,
    maxCostETH: 1.0,
    description: 'Good for production dApps with moderate reach'
  },
  
  // Large project: 8+ chains, full mainnet deployment
  large: {
    maxChains: 20,
    preferTestnets: false,
    maxCostETH: 5.0,
    description: 'Enterprise-grade omnichain deployment'
  }
} as const

/**
 * Helper function to get cost configuration for a specific chain
 */
export function getChainCostConfig(chainId: number, isTestnet: boolean = false) {
  if (isTestnet) {
    return DEPLOYMENT_COSTS.testnets
  }
  
  // Map chain IDs to cost configurations
  const chainCostMap: { [key: number]: keyof typeof DEPLOYMENT_COSTS } = {
    1: 'ethereum',      // Ethereum
    137: 'polygon',     // Polygon
    42161: 'arbitrum',  // Arbitrum
    10: 'optimism',     // Optimism
    8453: 'base',       // Base
    43114: 'avalanche', // Avalanche
    56: 'bsc',          // BSC
    250: 'fantom',      // Fantom
  }
  
  const configKey = chainCostMap[chainId]
  return configKey ? DEPLOYMENT_COSTS[configKey] : DEPLOYMENT_COSTS.ethereum
}

/**
 * Get current ETH price from API (with fallback)
 */
export async function getCurrentEthPrice(): Promise<number> {
  try {
    const response = await fetch(MARKET_CONFIG.priceApis.coingecko)
    const data = await response.json()
    return data.ethereum?.usd || MARKET_CONFIG.defaultEthPrice
  } catch (error) {
    console.warn('Failed to fetch ETH price, using default:', error)
    return MARKET_CONFIG.defaultEthPrice
  }
}
