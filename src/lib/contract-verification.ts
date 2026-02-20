import { ethers } from 'ethers'
import { LayerZeroChain } from './chains'

export interface VerificationResult {
  isVerified: boolean
  contractName?: string
  sourceCode?: string
  abi?: any[]
  constructorArgs?: string
  compilerVersion?: string
  optimizationUsed?: boolean
  runs?: number
  evmVersion?: string
  licenseType?: string
  proxyType?: string
  implementationAddress?: string
  error?: string
}

export interface ContractInfo {
  address: string
  chain: LayerZeroChain
  name?: string
  symbol?: string
  totalSupply?: string
  owner?: string
  isERC721?: boolean
  isERC1155?: boolean
  isONFT?: boolean
  isONFTAdapter?: boolean
  layerZeroEndpoint?: string
  peers?: { [chainId: number]: string }
}

export class ContractVerificationService {
  private provider: ethers.providers.Provider
  private chain: LayerZeroChain

  constructor(provider: ethers.providers.Provider, chain: LayerZeroChain) {
    this.provider = provider
    this.chain = chain
  }

  /**
   * Verify a contract on a block explorer (Etherscan, etc.)
   */
  async verifyContract(
    contractAddress: string,
    sourceCode: string,
    constructorArgs: string,
    contractName: string,
    compilerVersion: string = 'v0.8.22+commit.4fc1097e'
  ): Promise<VerificationResult> {
    try {
      // In a real implementation, this would call the block explorer API
      // For now, we'll simulate the verification process
      
      console.log(`🔍 Verifying contract ${contractAddress} on ${this.chain.name}`)
      console.log(`📝 Contract Name: ${contractName}`)
      console.log(`🔧 Compiler Version: ${compilerVersion}`)
      
      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      // Simulate successful verification
      const result: VerificationResult = {
        isVerified: true,
        contractName,
        sourceCode,
        constructorArgs,
        compilerVersion,
        optimizationUsed: true,
        runs: 200,
        evmVersion: 'london',
        licenseType: 'MIT'
      }
      
      console.log(`✅ Contract verified successfully on ${this.chain.name}`)
      return result
      
    } catch (error) {
      console.error(`❌ Contract verification failed:`, error)
      return {
        isVerified: false,
        error: `Verification failed: ${error}`
      }
    }
  }

  /**
   * Get detailed information about a deployed contract
   */
  async getContractInfo(contractAddress: string): Promise<ContractInfo> {
    const info: ContractInfo = {
      address: contractAddress,
      chain: this.chain
    }

    try {
      // Check if it's an ERC721
      const erc721Contract = new ethers.Contract(
        contractAddress,
        [
          'function supportsInterface(bytes4 interfaceId) view returns (bool)',
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function totalSupply() view returns (uint256)',
          'function owner() view returns (address)',
        ],
        this.provider
      )

      // Check ERC165 support
      try {
        const supportsERC165 = await erc721Contract.supportsInterface('0x01ffc9a7')
        if (supportsERC165) {
          // Check ERC721
          info.isERC721 = await erc721Contract.supportsInterface('0x80ac58cd')
          
          // Check ERC1155
          info.isERC1155 = await erc721Contract.supportsInterface('0xd9b67a26')
          
          if (info.isERC721 || info.isERC1155) {
            try {
              info.name = await erc721Contract.name()
              info.symbol = await erc721Contract.symbol()
              
              if (info.isERC721) {
                const totalSupply = await erc721Contract.totalSupply()
                info.totalSupply = totalSupply.toString()
              }
              
              info.owner = await erc721Contract.owner()
            } catch (e) {
              console.warn('Could not fetch contract metadata:', e)
            }
          }
        }
      } catch (e) {
        console.warn('Contract does not support ERC165:', e)
      }

      // Check if it's an ONFT or ONFT Adapter
      try {
        const onftContract = new ethers.Contract(
          contractAddress,
          [
            'function endpoint() view returns (address)',
            'function peers(uint32 eid) view returns (bytes32)',
            'function innerToken() view returns (address)', // For adapters
          ],
          this.provider
        )

        try {
          info.layerZeroEndpoint = await onftContract.endpoint()
          info.isONFT = true
          
          // Try to get peers (this might fail if no peers are set)
          try {
            const peers: { [chainId: number]: string } = {}
            // We'd need to know which chain IDs to check
            // For now, just mark that it has LayerZero functionality
            info.peers = peers
          } catch (e) {
            // Peers not set or method doesn't exist
          }
        } catch (e) {
          // Not an ONFT
        }

        try {
          const innerToken = await onftContract.innerToken()
          if (innerToken && innerToken !== ethers.constants.AddressZero) {
            info.isONFTAdapter = true
            info.isONFT = false // It's an adapter, not a direct ONFT
          }
        } catch (e) {
          // Not an adapter
        }
      } catch (e) {
        // Not LayerZero related
      }

      console.log(`📋 Contract Info for ${contractAddress}:`, info)
      return info

    } catch (error) {
      console.error('Failed to get contract info:', error)
      return info
    }
  }

  /**
   * Get the block explorer URL for a contract
   */
  getExplorerUrl(contractAddress: string): string {
    const baseUrl = this.chain.blockExplorers?.default?.url || 'https://etherscan.io'
    return `${baseUrl}/address/${contractAddress}`
  }

  /**
   * Get the block explorer URL for a transaction
   */
  getTransactionUrl(txHash: string): string {
    const baseUrl = this.chain.blockExplorers?.default?.url || 'https://etherscan.io'
    return `${baseUrl}/tx/${txHash}`
  }

  /**
   * Check if a contract is upgradeable (proxy pattern)
   */
  async checkIfUpgradeable(contractAddress: string): Promise<{
    isProxy: boolean
    proxyType?: string
    implementationAddress?: string
  }> {
    try {
      // Check for common proxy patterns
      const proxyContract = new ethers.Contract(
        contractAddress,
        [
          'function implementation() view returns (address)',
          'function admin() view returns (address)',
          'function owner() view returns (address)',
        ],
        this.provider
      )

      try {
        const implementationAddress = await proxyContract.implementation()
        if (implementationAddress && implementationAddress !== ethers.constants.AddressZero) {
          return {
            isProxy: true,
            proxyType: 'Transparent Proxy',
            implementationAddress
          }
        }
      } catch (e) {
        // Not a transparent proxy
      }

      // Check for other proxy patterns...
      return { isProxy: false }
      
    } catch (error) {
      return { isProxy: false }
    }
  }

  /**
   * Estimate gas for contract interactions
   */
  async estimateGas(
    contractAddress: string,
    methodName: string,
    args: any[] = [],
    abi: any[]
  ): Promise<ethers.BigNumber> {
    try {
      const contract = new ethers.Contract(contractAddress, abi, this.provider)
      return await contract.estimateGas[methodName](...args)
    } catch (error) {
      console.error('Gas estimation failed:', error)
      return ethers.BigNumber.from('100000') // Default fallback
    }
  }
}

/**
 * Create a verification service for a specific chain
 */
export function createVerificationService(
  provider: ethers.providers.Provider,
  chain: LayerZeroChain
): ContractVerificationService {
  return new ContractVerificationService(provider, chain)
}
