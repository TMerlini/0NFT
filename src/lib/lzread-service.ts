import { ethers } from 'ethers'
import { LayerZeroChain } from './chains'
import { getLayerZeroChainId, getLayerZeroEndpoint } from './layerzero'
import { 
  isReadPairSupported, 
  getReadLibraryAddress, 
  hasReadLibrary,
  getReadSupportedDVNs,
  READ_CHANNEL_IDS 
} from './read-channels'

/**
 * LayerZero Read (lzRead) Service
 * 
 * Enables cross-chain state queries using LayerZero's read infrastructure.
 * Unlike traditional messaging (push), lzRead implements a request-response pattern
 * where contracts can pull external state data from other blockchains.
 * 
 * Reference: https://docs.layerzero.network/v2/developers/evm/lzread/overview
 */

export interface ReadRequest {
  targetContract: string
  targetChain: LayerZeroChain
  functionSelector: string
  parameters: any[]
  responseSize?: number // Estimated response size in bytes
}

export interface ReadResult {
  success: boolean
  data?: any
  error?: string
  transactionHash?: string
  guid?: string
}

/**
 * ABI for OAppRead contracts
 * This is a minimal interface for interacting with deployed OAppRead contracts
 */
const OAPP_READ_ABI = [
  'function quoteReadFee(address _targetContractAddress, uint32 _targetEid, bytes calldata _extraOptions) external view returns ((uint256 nativeFee, uint256 lzTokenFee))',
  'function readData(address _targetContractAddress, uint32 _targetEid, bytes calldata _extraOptions) external payable returns ((bytes32 guid, uint256 nonce))',
  'function READ_CHANNEL() external view returns (uint32)',
  'event DataReceived(uint256 data)',
]

// Read Channel IDs are now imported from read-channels.ts
export { READ_CHANNEL_IDS } from './read-channels'

/**
 * Estimate response size in bytes for common return types
 */
export function estimateResponseSize(returnType: string, sampleValue?: any): number {
  const type = returnType.toLowerCase().trim()
  
  // Basic types
  if (type.includes('uint256') || type.includes('int256') || type.includes('bytes32')) {
    return 32
  }
  if (type.includes('uint128') || type.includes('int128')) {
    return 16
  }
  if (type.includes('uint64') || type.includes('int64')) {
    return 8
  }
  if (type.includes('uint32') || type.includes('int32')) {
    return 4
  }
  if (type.includes('bool')) {
    return 32 // Padded
  }
  if (type.includes('address')) {
    return 32 // Padded
  }
  
  // Arrays
  if (type.includes('[]')) {
    const elementType = type.replace('[]', '')
    const elementSize = estimateResponseSize(elementType)
    // Array: 32 bytes (length) + (elementSize * length)
    const length = sampleValue?.length || 1
    return 32 + (elementSize * length)
  }
  
  // Tuples/structs
  if (type.includes('tuple')) {
    // Estimate based on common struct sizes
    // This is a rough estimate - actual size depends on struct definition
    return 64 // Default for simple structs
  }
  
  // Strings
  if (type.includes('string')) {
    const length = sampleValue?.length || 0
    // String: 32 bytes (offset) + 32 bytes (length) + content + padding
    return 64 + length + (32 - (length % 32))
  }
  
  // Bytes
  if (type.includes('bytes')) {
    const length = sampleValue?.length || 0
    // Bytes: 32 bytes (offset) + 32 bytes (length) + content + padding
    return 64 + length + (32 - (length % 32))
  }
  
  // Default: assume 32 bytes
  return 32
}

/**
 * Build execution options for lzRead
 * 
 * lzRead uses addExecutorLzReadOption instead of addExecutorLzReceiveOption
 * Key difference: includes size parameter for response data estimation
 * 
 * @param gasLimit Gas limit for response processing
 * @param responseSize Estimated response data size in bytes
 * @param value Native value (usually 0 for reads)
 */
export function buildReadOptions(gasLimit: number, responseSize: number, value: number = 0): string {
  // Option type: LZ_READ = 3
  // Format: [optionType (2 bytes)][gas (3 bytes)][size (3 bytes)][value (1 byte)]
  // This is a simplified encoding - full implementation would use OptionsBuilder
  
  // For now, return empty options - the contract should have enforced options configured
  // Users should configure enforced options in their OAppRead contract
  return '0x'
}

/**
 * Quote the fee for a cross-chain read operation
 * 
 * @param oappReadAddress Address of the OAppRead contract
 * @param request Read request parameters
 * @param sourceChain Source chain (where OAppRead contract is deployed)
 * @param provider Provider for source chain
 */
export async function quoteReadFee(
  oappReadAddress: string,
  request: ReadRequest,
  sourceChain: LayerZeroChain,
  provider: ethers.providers.Provider
): Promise<{ nativeFee: ethers.BigNumber; lzTokenFee: ethers.BigNumber }> {
  try {
    // Validate read pair support
    if (!isReadPairSupported(sourceChain.id, request.targetChain.id)) {
      throw new Error(
        `Read operations not supported for ${sourceChain.name} -> ${request.targetChain.name}. ` +
        `Check https://docs.layerzero.network/v2/deployments/read-contracts for supported pairs.`
      )
    }

    // Check if source chain has ReadLib1002
    if (!hasReadLibrary(sourceChain.id)) {
      throw new Error(
        `ReadLib1002 not deployed on ${sourceChain.name}. ` +
        `Read operations require ReadLib1002 to be deployed on the origin chain.`
      )
    }

    const targetEid = getLayerZeroChainId(request.targetChain.id)
    if (!targetEid) {
      throw new Error(`LayerZero not supported for target chain: ${request.targetChain.name}`)
    }

    const oappRead = new ethers.Contract(oappReadAddress, OAPP_READ_ABI, provider)
    
    // Note: The actual call data encoding is handled by the OAppRead contract's _getCmd function
    // This service just provides the interface for quoting and executing reads
    // The OAppRead contract will build the proper EVMCallRequestV1 structure
    
    // Quote the fee (extraOptions is usually empty for basic reads)
    const fee = await oappRead.quoteReadFee(
      request.targetContract,
      targetEid,
      '0x' // Empty extra options
    )
    
    return {
      nativeFee: fee.nativeFee,
      lzTokenFee: fee.lzTokenFee,
    }
  } catch (error: any) {
    console.error('Error quoting read fee:', error)
    throw new Error(`Failed to quote read fee: ${error.message}`)
  }
}

/**
 * Execute a cross-chain read operation
 * 
 * @param oappReadAddress Address of the OAppRead contract
 * @param request Read request parameters
 * @param sourceChain Source chain (where OAppRead contract is deployed)
 * @param signer Signer for executing the transaction
 */
export async function executeRead(
  oappReadAddress: string,
  request: ReadRequest,
  sourceChain: LayerZeroChain,
  signer: ethers.Signer
): Promise<ReadResult> {
  try {
    // Validate read pair support
    if (!isReadPairSupported(sourceChain.id, request.targetChain.id)) {
      return {
        success: false,
        error: `Read operations not supported for ${sourceChain.name} -> ${request.targetChain.name}. ` +
               `Check https://docs.layerzero.network/v2/deployments/read-contracts for supported pairs.`
      }
    }

    // Check if source chain has ReadLib1002
    if (!hasReadLibrary(sourceChain.id)) {
      return {
        success: false,
        error: `ReadLib1002 not deployed on ${sourceChain.name}. ` +
               `Read operations require ReadLib1002 to be deployed on the origin chain.`
      }
    }

    const targetEid = getLayerZeroChainId(request.targetChain.id)
    if (!targetEid) {
      return {
        success: false,
        error: `LayerZero not supported for target chain: ${request.targetChain.name}`
      }
    }

    // First, quote the fee
    const provider = signer.provider!
    const fee = await quoteReadFee(oappReadAddress, request, sourceChain, provider)
    
    const oappRead = new ethers.Contract(oappReadAddress, OAPP_READ_ABI, signer)
    
    // Execute the read with the quoted fee
    const tx = await oappRead.readData(
      request.targetContract,
      targetEid,
      '0x', // Empty extra options
      {
        value: fee.nativeFee,
        gasLimit: 500000, // Reasonable gas limit for read operations
      }
    )
    
    const receipt = await tx.wait()
    
    // Extract GUID from receipt (if available in events)
    let guid: string | undefined
    try {
      // Look for LayerZero events in the receipt
      // This is simplified - actual GUID extraction depends on event structure
      if (receipt.logs && receipt.logs.length > 0) {
        // Try to decode events to find GUID
        // For now, we'll use the transaction hash as identifier
        guid = receipt.transactionHash
      }
    } catch (e) {
      // GUID extraction failed, continue without it
    }
    
    return {
      success: true,
      transactionHash: receipt.transactionHash,
      guid,
    }
  } catch (error: any) {
    console.error('Error executing read:', error)
    return {
      success: false,
      error: error.message || 'Unknown error executing read',
    }
  }
}

/**
 * Check if a contract supports lzRead
 * 
 * @param contractAddress Contract address to check
 * @param provider Provider for the chain
 */
export async function supportsLzRead(
  contractAddress: string,
  provider: ethers.providers.Provider
): Promise<boolean> {
  try {
    const contract = new ethers.Contract(contractAddress, OAPP_READ_ABI, provider)
    
    // Try to read the READ_CHANNEL - if it exists, the contract supports lzRead
    await contract.READ_CHANNEL()
    return true
  } catch (error) {
    return false
  }
}

/**
 * Get common read queries for ONFT contracts
 */
export const ONFT_READ_QUERIES = {
  /**
   * Query balance of an address on a target chain
   */
  balanceOf: {
    functionSelector: 'balanceOf(address)',
    returnType: 'uint256',
    responseSize: 32,
  },
  
  /**
   * Query owner of a token on a target chain
   */
  ownerOf: {
    functionSelector: 'ownerOf(uint256)',
    returnType: 'address',
    responseSize: 32,
  },
  
  /**
   * Query total supply on a target chain
   */
  totalSupply: {
    functionSelector: 'totalSupply()',
    returnType: 'uint256',
    responseSize: 32,
  },
  
  /**
   * Query token URI on a target chain
   */
  tokenURI: {
    functionSelector: 'tokenURI(uint256)',
    returnType: 'string',
    responseSize: 128, // Estimated size for URI strings
  },
} as const
