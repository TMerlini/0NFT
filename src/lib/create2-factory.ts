import { ethers } from 'ethers'

/**
 * CREATE2 Factory Contract
 * 
 * This is a minimal CREATE2 factory that can be deployed once and reused.
 * It uses the standard CREATE2 factory pattern.
 * 
 * Factory ABI for CREATE2 deployment
 */
export const CREATE2_FACTORY_ABI = [
  'function deploy(bytes memory bytecode, bytes32 salt) public returns (address)',
  'function deploy(uint256 value, bytes memory bytecode, bytes32 salt) public returns (address)',
  'function computeAddress(bytes32 salt, bytes32 bytecodeHash) public view returns (address)',
  'function computeAddress(bytes32 salt, bytes32 bytecodeHash, address deployer) public pure returns (address)'
]

/**
 * Well-known CREATE2 Factory addresses on various chains
 * These are pre-deployed factory contracts that support CREATE2
 */
export const CREATE2_FACTORY_ADDRESSES: { [chainId: number]: string } = {
  // Ethereum Mainnet - Using a well-known CREATE2 factory
  1: '0x4e59b44847b379578588920cA78FbF26c0B49565', // CREATE2 Factory (commonly used)
  
  // Base
  8453: '0x4e59b44847b379578588920cA78FbF26c0B49565', // Same factory address (if deployed)
  
  // Arbitrum
  42161: '0x4e59b44847b379578588920cA78FbF26c0B49565',
  
  // Optimism
  10: '0x4e59b44847b379578588920cA78FbF26c0B49565',
  
  // Polygon
  137: '0x4e59b44847b379578588920cA78FbF26c0B49565',
  
  // BNB Smart Chain
  56: '0x4e59b44847b379578588920cA78FbF26c0B49565',
  
  // Avalanche
  43114: '0x4e59b44847b379578588920cA78FbF26c0B49565',
  
  // Testnets
  11155111: '0x4e59b44847b379578588920cA78FbF26c0B49565', // Sepolia
  84532: '0x4e59b44847b379578588920cA78FbF26c0B49565', // Base Sepolia
}

/**
 * Get CREATE2 factory address for a chain
 */
export function getCreate2FactoryAddress(chainId: number): string | null {
  return CREATE2_FACTORY_ADDRESSES[chainId] || null
}

/**
 * Deploy contract using CREATE2 via factory
 * 
 * @param factoryAddress CREATE2 factory contract address
 * @param bytecode Contract bytecode (with constructor args encoded)
 * @param salt Salt for CREATE2 (32 bytes)
 * @param signer Signer for transaction
 * @param value Optional ETH value to send with deployment
 * @returns Deployed contract address and transaction hash
 */
export async function deployWithCreate2Factory(
  factoryAddress: string,
  bytecode: string,
  salt: string,
  signer: ethers.Signer,
  value: ethers.BigNumber = ethers.BigNumber.from(0)
): Promise<{ address: string; transactionHash: string }> {
  const factory = new ethers.Contract(factoryAddress, CREATE2_FACTORY_ABI, signer)
  
  // Ensure salt is 32 bytes
  let saltBytes32: string
  if (salt.startsWith('0x') && salt.length === 66) {
    saltBytes32 = salt
  } else {
    // Hash the salt to get 32 bytes
    saltBytes32 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(salt))
  }
  
  // Convert salt to bytes32
  const saltBytes = ethers.utils.hexZeroPad(saltBytes32, 32)
  
  // Calculate expected address first
  const initCodeHash = ethers.utils.keccak256(bytecode)
  const expectedAddress = ethers.utils.getCreate2Address(
    factoryAddress,
    saltBytes,
    initCodeHash
  )
  
  // Deploy via factory
  let tx: ethers.ContractTransaction
  if (value.gt(0)) {
    tx = await factory.deploy(value, bytecode, saltBytes, { value })
  } else {
    tx = await factory.deploy(bytecode, saltBytes)
  }
  
  const receipt = await tx.wait()
  
  // The factory's deploy function should return the address
  // If not, we can extract it from events or use the calculated address
  let deployedAddress = expectedAddress
  
  // Try to get the address from the transaction result
  try {
    const result = await factory.callStatic.deploy(bytecode, saltBytes)
    if (result && ethers.utils.isAddress(result)) {
      deployedAddress = result
    }
  } catch (error) {
    // If callStatic fails, use the calculated address
    console.log('Using calculated CREATE2 address:', deployedAddress)
  }
  
  // Verify the address has code (contract was deployed)
  const provider = signer.provider
  if (provider) {
    const code = await provider.getCode(deployedAddress)
    if (code === '0x' || code === '0x0') {
      throw new Error('Contract was not deployed at expected address. CREATE2 deployment may have failed.')
    }
  }
  
  return {
    address: ethers.utils.getAddress(deployedAddress),
    transactionHash: receipt.transactionHash
  }
}

/**
 * Alternative: Deploy CREATE2 factory if not available
 * 
 * This is a minimal CREATE2 factory contract that can be deployed once
 */
export const CREATE2_FACTORY_BYTECODE = '0x604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3'

/**
 * Deploy CREATE2 factory contract (if not already deployed)
 */
export async function deployCreate2Factory(
  signer: ethers.Signer
): Promise<{ address: string; transactionHash: string }> {
  const factory = new ethers.ContractFactory(
    CREATE2_FACTORY_ABI,
    CREATE2_FACTORY_BYTECODE,
    signer
  )
  
  const contract = await factory.deploy()
  await contract.deployed()
  
  return {
    address: contract.address,
    transactionHash: contract.deployTransaction.hash
  }
}
