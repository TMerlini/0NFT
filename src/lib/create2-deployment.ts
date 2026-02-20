import { ethers } from 'ethers'

/**
 * CREATE2 Deterministic Deployment Service
 * 
 * Calculates contract addresses before deployment using CREATE2 opcode.
 * Address = keccak256(0xff ++ deployerAddress ++ salt ++ keccak256(initCode))[12:]
 * 
 * Reference: EIP-1014 (CREATE2)
 */

export interface Create2Config {
  deployerAddress: string
  salt: string // Can be any string, will be hashed
  bytecode: string // Contract bytecode
  constructorArgs?: any[] // Constructor arguments (will be encoded)
  abi?: any[] // ABI for encoding constructor args
}

export interface Create2Result {
  predictedAddress: string
  salt: string
  saltHash: string // keccak256 of salt
  isValid: boolean
  error?: string
}

/**
 * Calculate CREATE2 address
 * 
 * @param config CREATE2 configuration
 * @returns Predicted contract address
 */
export function calculateCreate2Address(config: Create2Config): Create2Result {
  try {
    // Normalize deployer address
    const deployerAddress = ethers.utils.getAddress(config.deployerAddress)
    
    // Hash the salt (if it's a string, convert to bytes32)
    let saltHash: string
    if (config.salt.startsWith('0x') && config.salt.length === 66) {
      // Already a 32-byte hex string
      saltHash = config.salt
    } else {
      // Hash the salt string to get a 32-byte value
      saltHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(config.salt))
    }
    
    // Prepare init code (bytecode + encoded constructor args)
    let initCode = config.bytecode
    
    // If constructor args are provided, encode them and append to bytecode
    if (config.constructorArgs && config.constructorArgs.length > 0 && config.abi) {
      try {
        const iface = new ethers.utils.Interface(config.abi)
        const encodedArgs = iface.encodeDeploy(config.constructorArgs)
        // Remove the 0x prefix and combine with bytecode
        initCode = config.bytecode + encodedArgs.slice(2)
      } catch (error) {
        console.warn('Failed to encode constructor args, using bytecode only:', error)
      }
    }
    
    // Calculate CREATE2 address using ethers utility
    // address = keccak256(0xff ++ deployerAddress ++ salt ++ keccak256(initCode))[12:]
    const initCodeHash = ethers.utils.keccak256(initCode)
    
    // Use ethers' getCreate2Address utility
    const predictedAddress = ethers.utils.getCreate2Address(
      deployerAddress,
      saltHash,
      initCodeHash
    )
    
    return {
      predictedAddress: ethers.utils.getAddress(predictedAddress),
      salt: config.salt,
      saltHash,
      isValid: true
    }
  } catch (error: any) {
    return {
      predictedAddress: '',
      salt: config.salt,
      saltHash: '',
      isValid: false,
      error: error.message || 'Failed to calculate CREATE2 address'
    }
  }
}

/**
 * Generate a random salt
 * 
 * @returns Random salt string
 */
export function generateRandomSalt(): string {
  const randomBytes = ethers.utils.randomBytes(16)
  return ethers.utils.hexlify(randomBytes)
}

/**
 * Generate a salt from a string (deterministic)
 * 
 * @param input Input string (e.g., "pixel-goblins-v1")
 * @returns Salt string
 */
export function generateSaltFromString(input: string): string {
  // Hash the input to get a consistent salt
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(input))
}

/**
 * Verify if an address is available (not already deployed)
 * 
 * @param address Address to check
 * @param provider Provider for the chain
 * @returns true if address is available (has no code)
 */
export async function verifyAddressAvailability(
  address: string,
  provider: ethers.providers.Provider
): Promise<{ available: boolean; hasCode: boolean; error?: string }> {
  try {
    const code = await provider.getCode(address)
    const hasCode = code !== '0x' && code !== '0x0'
    
    return {
      available: !hasCode,
      hasCode
    }
  } catch (error: any) {
    return {
      available: false,
      hasCode: false,
      error: error.message || 'Failed to verify address'
    }
  }
}

/**
 * Prepare bytecode with constructor arguments for CREATE2
 * 
 * @param bytecode Contract bytecode
 * @param abi Contract ABI
 * @param constructorArgs Constructor arguments
 * @returns Combined bytecode with encoded constructor args
 */
export function prepareInitCode(
  bytecode: string,
  abi: any[],
  constructorArgs: any[]
): string {
  try {
    const iface = new ethers.utils.Interface(abi)
    const encodedArgs = iface.encodeDeploy(constructorArgs)
    // Combine bytecode with encoded constructor args
    return bytecode + encodedArgs.slice(2) // Remove 0x prefix from encoded args
  } catch (error: any) {
    throw new Error(`Failed to encode constructor arguments: ${error.message}`)
  }
}

/**
 * Deploy contract using CREATE2 via factory
 * 
 * This uses a CREATE2 factory contract to deploy at a deterministic address.
 * 
 * @param chainId Chain ID to deploy on
 * @param bytecode Contract bytecode (with constructor args encoded)
 * @param salt Salt for CREATE2
 * @param signer Signer for transaction
 * @param value Optional ETH value to send with deployment
 * @returns Deployed contract address and transaction hash
 */
export async function deployWithCreate2(
  chainId: number,
  bytecode: string,
  salt: string,
  signer: ethers.Signer,
  value: ethers.BigNumber = ethers.BigNumber.from(0)
): Promise<{ address: string; transactionHash: string; error?: string }> {
  try {
    const { 
      getCreate2FactoryAddress, 
      deployWithCreate2Factory,
      deployCreate2Factory 
    } = await import('./create2-factory')
    
    // Get or deploy factory
    let factoryAddress = getCreate2FactoryAddress(chainId)
    
    if (!factoryAddress) {
      // Factory not available, deploy it first
      console.log('📦 CREATE2 factory not found, deploying factory...')
      const factoryDeployment = await deployCreate2Factory(signer)
      factoryAddress = factoryDeployment.address
      console.log(`✅ CREATE2 factory deployed at: ${factoryAddress}`)
    }
    
    // Deploy contract via factory
    const result = await deployWithCreate2Factory(
      factoryAddress,
      bytecode,
      salt,
      signer,
      value
    )
    
    return result
  } catch (error: any) {
    return {
      address: '',
      transactionHash: '',
      error: error.message || 'CREATE2 deployment failed'
    }
  }
}

/**
 * Get salt suggestions if address is taken
 * 
 * @param baseSalt Original salt
 * @returns Array of suggested salts
 */
export function getSaltSuggestions(baseSalt: string): string[] {
  const suggestions: string[] = []
  
  // Add version suffixes
  suggestions.push(`${baseSalt}-v2`)
  suggestions.push(`${baseSalt}-v3`)
  suggestions.push(`${baseSalt}-2024`)
  suggestions.push(`${baseSalt}-${Date.now()}`)
  
  // Add numeric suffixes
  for (let i = 1; i <= 5; i++) {
    suggestions.push(`${baseSalt}-${i}`)
  }
  
  return suggestions
}
