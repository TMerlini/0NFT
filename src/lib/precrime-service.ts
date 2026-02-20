import { ethers } from 'ethers'
import { LayerZeroChain } from './chains'

/**
 * PreCrime Service for LayerZero V2
 * 
 * PreCrime validates cross-chain transactions by simulating them on a forked
 * destination chain before execution. This prevents failed transactions and
 * potential exploits.
 * 
 * Reference: https://docs.layerzero.network/v2/developers/evm/technical-reference/api#option_type_precrime
 */

export interface PreCrimeValidationResult {
  success: boolean
  isValid: boolean
  error?: string
  simulationResult?: string
  warnings?: string[]
}

export interface PreCrimeConfig {
  enabled: boolean
  preCrimeAddress?: string
  chain: LayerZeroChain
}

/**
 * Default PreCrime contract addresses (if available)
 * These are typically deployed by LayerZero Labs or the OApp developer
 */
export const DEFAULT_PRECRIME_ADDRESSES: { [chainId: number]: string } = {
  // PreCrime addresses are typically contract-specific
  // For now, we'll leave this empty and allow manual configuration
  // Users can configure PreCrime addresses in the DVN configurator
}

/**
 * PreCrime Service
 * 
 * Handles PreCrime validation for LayerZero V2 cross-chain messages
 */
export class PreCrimeService {
  /**
   * Check if PreCrime is available for a chain
   */
  static async isPreCrimeAvailable(
    chain: LayerZeroChain,
    preCrimeAddress?: string
  ): Promise<boolean> {
    if (!preCrimeAddress) {
      // Try default address if available
      const defaultAddress = DEFAULT_PRECRIME_ADDRESSES[chain.id]
      if (!defaultAddress) {
        return false
      }
      preCrimeAddress = defaultAddress
    }

    try {
      const rpcUrls = (chain.rpcUrls as { default?: { http?: string[] } })?.default?.http
      const rpcUrl = rpcUrls?.[0]
      if (!rpcUrl) throw new Error(`No RPC URL for chain ${chain.name}`)
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
      const preCrime = new ethers.Contract(
        preCrimeAddress,
        [
          'function version() external view returns (uint64 major, uint8 minor)',
        ],
        provider
      )

      await preCrime.version()
      return true
    } catch (error) {
      console.warn('⚠️ PreCrime not available:', error)
      return false
    }
  }

  /**
   * Simulate a cross-chain message using PreCrime
   * 
   * @param packets Message packets to simulate
   * @param packetMsgValues Message values for each packet
   * @param preCrimeAddress PreCrime contract address
   * @param chain Chain to run simulation on
   * @param provider Provider instance
   */
  static async simulate(
    packets: string[],
    packetMsgValues: ethers.BigNumber[],
    preCrimeAddress: string,
    chain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<PreCrimeValidationResult> {
    try {
      const preCrime = new ethers.Contract(
        preCrimeAddress,
        [
          'function simulate(bytes[] _packets, uint256[] _packetMsgValues) external payable returns (bytes)',
          'function preCrime(bytes[] _packets, uint256[] _packetMsgValues, bytes[] _simulations) external',
        ],
        provider
      )

      // Call simulate to get simulation result
      const simulationResult = await preCrime.simulate(packets, packetMsgValues, {
        value: ethers.utils.parseEther('0.01') // Small amount for simulation
      })

      return {
        success: true,
        isValid: true,
        simulationResult: simulationResult,
      }
    } catch (error: any) {
      // Check if it's a PreCrime validation error
      if (error.message?.includes('CrimeFound') || error.message?.includes('SimulationFailed')) {
        return {
          success: true,
          isValid: false,
          error: error.message,
          warnings: ['PreCrime detected potential issues with this transaction'],
        }
      }

      return {
        success: false,
        isValid: false,
        error: error.message || 'PreCrime simulation failed',
      }
    }
  }

  /**
   * Validate a cross-chain message using PreCrime
   * 
   * @param packets Message packets to validate
   * @param packetMsgValues Message values for each packet
   * @param simulations Simulation results from simulate()
   * @param preCrimeAddress PreCrime contract address
   * @param chain Chain to run validation on
   * @param provider Provider instance
   */
  static async validate(
    packets: string[],
    packetMsgValues: ethers.BigNumber[],
    simulations: string[],
    preCrimeAddress: string,
    chain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<PreCrimeValidationResult> {
    try {
      const preCrime = new ethers.Contract(
        preCrimeAddress,
        [
          'function preCrime(bytes[] _packets, uint256[] _packetMsgValues, bytes[] _simulations) external',
        ],
        provider
      )

      // Call preCrime to validate
      await preCrime.preCrime(packets, packetMsgValues, simulations)

      return {
        success: true,
        isValid: true,
      }
    } catch (error: any) {
      // Check if it's a PreCrime validation error
      if (error.message?.includes('CrimeFound')) {
        return {
          success: true,
          isValid: false,
          error: 'PreCrime detected a security violation',
          warnings: ['This transaction may fail or cause issues on the destination chain'],
        }
      }

      return {
        success: false,
        isValid: false,
        error: error.message || 'PreCrime validation failed',
      }
    }
  }

  /**
   * Validate an ONFT bridge transaction using PreCrime
   * 
   * This is a simplified version that checks if PreCrime is available
   * and can be used before bridging. Full validation requires the OApp
   * contract to implement PreCrime hooks.
   */
  static async validateONFTBridge(
    sourceChain: LayerZeroChain,
    destinationChain: LayerZeroChain,
    contractAddress: string,
    tokenId: string,
    recipientAddress: string,
    preCrimeAddress?: string
  ): Promise<PreCrimeValidationResult> {
    // For now, return a basic check
    // Full PreCrime validation requires:
    // 1. OApp contract to implement PreCrime hooks
    // 2. PreCrime contract address on source chain
    // 3. Message packet encoding
    
    try {
      // Check if PreCrime is available
      if (preCrimeAddress) {
        const isAvailable = await this.isPreCrimeAvailable(sourceChain, preCrimeAddress)
        if (!isAvailable) {
          return {
            success: false,
            isValid: false,
            error: 'PreCrime contract not available on source chain',
          }
        }
      }

      // Basic validation passed
      // Note: Full validation requires contract-level PreCrime implementation
      return {
        success: true,
        isValid: true,
        warnings: [
          'PreCrime validation is enabled. Full validation requires PreCrime hooks in the OApp contract.',
        ],
      }
    } catch (error: any) {
      return {
        success: false,
        isValid: false,
        error: error.message || 'PreCrime validation check failed',
      }
    }
  }
}
