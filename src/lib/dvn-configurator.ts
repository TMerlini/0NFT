import { ethers } from 'ethers'
import { LayerZeroChain } from './chains'
import { LAYERZERO_ENDPOINTS, getLayerZeroChainId, getLayerZeroEndpoint } from './layerzero'

// LayerZero V2 Endpoint ABI for configuration
const LAYERZERO_ENDPOINT_ABI = [
  'function getConfig(address _oapp, address _lib, uint32 _eid, uint32 _configType) external view returns (bytes memory config)',
  'function setConfig(address _oapp, address _lib, tuple(uint32 eid, uint32 configType, bytes config)[] _params) external',
  'function setSendLibrary(address _oapp, uint32 _eid, address _sendLib) external',
  'function setReceiveLibrary(address _oapp, uint32 _eid, address _receiveLib, uint32 _gracePeriod) external',
  'function defaultSendLibrary(uint32 _eid) external view returns (address)',
  'function defaultReceiveLibrary(uint32 _eid) external view returns (address)',
  'function getSendLibrary(address _sender, uint32 _eid) external view returns (address)',
  'function getReceiveLibrary(address _receiver, uint32 _eid) external view returns (address lib, bool isDefault)',
  'function delegates(address _oapp) external view returns (address)',
  'function setDelegate(address _oapp, address _delegate) external',
]

// UlnConfig structure
export interface UlnConfig {
  confirmations: number
  requiredDVNCount: number
  optionalDVNCount: number
  optionalDVNThreshold: number
  requiredDVNs: string[]
  optionalDVNs: string[]
}

// ExecutorConfig structure
export interface ExecutorConfig {
  maxMessageSize: number
  executorAddress: string
}

// Executor Option Types (LayerZero V2)
export const ExecutorOptionType = {
  LZ_RECEIVE: 1,      // Basic receive option (default for ONFT)
  LZ_COMPOSE: 2,      // Compose option (for complex operations)
  ORDERED: 3,         // Ordered option (for ordered message delivery)
} as const

// Executor Options configuration per chain pair
export interface ExecutorOptions {
  // Gas limit for LZ_RECEIVE operation
  receiveGasLimit: number
  
  // Gas limit for LZ_COMPOSE operation (optional)
  composeGasLimit?: number
  
  // Gas limit for ORDERED operation (optional)
  orderedGasLimit?: number
  
  // Enabled option types (bitmask: 1=LZ_RECEIVE, 2=LZ_COMPOSE, 4=ORDERED)
  enabledOptions: number
  
  // Additional value to send with message (optional)
  msgValue?: number
  
  // PreCrime configuration (optional)
  preCrimeEnabled?: boolean
  preCrimeAddress?: string
}

// Configuration types
export const CONFIG_TYPES = {
  EXECUTOR: 1,
  SEND_ULN: 2,
  RECEIVE_ULN: 3,
} as const

/**
 * Default DVN addresses (LayerZero V2 official DVNs)
 * 
 * ✅ Updated with official addresses from LayerZero V2 documentation:
 *    https://docs.layerzero.network/v2/deployments/dvn-addresses
 * 
 * These addresses are verified from the official LayerZero V2 DVN Providers page.
 * All addresses are for mainnet deployments.
 * 
 * Note: DVN addresses may vary by chain. Always verify addresses on LayerZero Scan.
 * You can also query the LayerZero Endpoint contract's default config to get current addresses.
 */
export const DEFAULT_DVN_ADDRESSES: { [chainId: number]: { [name: string]: string } } = {
  1: { // Ethereum Mainnet
    // LayerZero Labs DVN (official) - https://docs.layerzero.network/v2/deployments/dvn-addresses
    'LayerZero Labs': '0x589dedbd617e0cbcb916a9223f4d1300c294236b',
    // Google Cloud DVN - https://docs.layerzero.network/v2/deployments/dvn-addresses
    'Google Cloud': '0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc',
    // Polyhedra zkBridge DVN - https://docs.layerzero.network/v2/deployments/dvn-addresses
    'Polyhedra zkBridge': '0x8ddf05f9a5c488b4973897e278b58895bf87cb24',
    // Horizen DVN
    'Horizen': '0x380275805876ff19055ea900cdb2b46a94ecf20d',
    // Nethermind DVN
    'Nethermind': '0xa59ba433ac34d2927232918ef5b2eaafcf130ba5',
    // Canary DVN
    'Canary': '0xa4fe5a5b9a846458a70cd0748228aed3bf65c2cd',
    // Stargate DVN
    'Stargate': '0x8fafae7dd957044088b3d0f67359c327c6200d18',
    // Frax DVN
    'Frax': '0x38654142f5e672ae86a1b21523aafc765e6a1e08',
    // BCW Group DVN
    'BCW Group': '0xe552485d02edd3067fe7fcbd4dd56bb1d3a998d2',
    // P2P DVN
    'P2P': '0x06559ee34d85a88317bf0bfe307444116c631b67',
    // Deutsche Telekom DVN
    'Deutsche Telekom': '0x373a6e5c0c4e89e24819f00aa37ea370917aaff4',
    // BitGo DVN
    'BitGo': '0xc9ca319f6da263910fd9b037ec3d817a814ef3d8',
    // Luganodes DVN
    'Luganodes': '0x58249a2ec05c1978bf21df1f5ec1847e42455cf4',
    // Nansen DVN
    'Nansen': '0x3a4636e9ab975d28d3af808b4e1c9fd936374e30',
    // StablecoinX DVN
    'StablecoinX': '0x394fe81886baf6e2d5bee37ffa24b07133c320c6',
    // StakingCabin DVN
    'StakingCabin': '0xcd0ca0619fc8db4d47b19a1f04105312952e5f6d',
    // Animoca-Blockdaemon DVN
    'Animoca-Blockdaemon': '0x7e65bdd15c8db8995f80abf0d6593b57dc8be437',
  },
  8453: { // Base Mainnet
    // LayerZero Labs DVN (official) - https://docs.layerzero.network/v2/deployments/dvn-addresses
    'LayerZero Labs': '0x9e059a54699a285714207b43b055483e78faac25',
    // Google Cloud DVN - https://docs.layerzero.network/v2/deployments/dvn-addresses
    'Google Cloud': '0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc',
    // Polyhedra zkBridge DVN - https://docs.layerzero.network/v2/deployments/dvn-addresses
    'Polyhedra zkBridge': '0x8ddf05f9a5c488b4973897e278b58895bf87cb24',
    // Horizen DVN
    'Horizen': '0xa7b5189bca84cd304d8553977c7c614329750d99',
    // Nethermind DVN
    'Nethermind': '0xcd37ca043f8479064e10635020c65ffc005d36f6',
    // Canary DVN
    'Canary': '0x554833698ae0fb22ecc90b01222903fd62ca4b47',
    // Stargate DVN
    'Stargate': '0xcdf31d62140204c08853b547e64707110fbc6680',
    // Frax DVN
    'Frax': '0x187cf227f81c287303ee765ee001e151347faaa2',
    // BCW Group DVN
    'BCW Group': '0xb3ce0a5d132cd9bf965aba435e650c55edce0062',
    // P2P DVN
    'P2P': '0x5b6735c66d97479ccd18294fc96b3084ecb2fa3f',
    // Deutsche Telekom DVN
    'Deutsche Telekom': '0xc2a0c36f5939a14966705c7cec813163faeea1f0',
    // BitGo DVN
    'BitGo': '0x133e9fb2d339d8428476a714b1113b024343811e',
    // Luganodes DVN
    'Luganodes': '0xa0af56164f02bdf9d75287ee77c568889f11d5f2',
    // Nansen DVN
    'Nansen': '0x93ac538152e1bc4f093ae5666ee9fd1d84f4f4bf',
    // StablecoinX DVN
    'StablecoinX': '0x8b4874a130d7f1f702d59115f6d31bcc3e0972c3',
    // Animoca-Blockdaemon DVN
    'Animoca-Blockdaemon': '0x41ef29f974fc9f6772654f005271c64210425391',
    // Mantle Bank DVN
    'Mantle Bank': '0x761bc869351293c5572ed5581e23e7d5d9c6d3d1',
    // Lagrange DVN
    'Lagrange': '0xc50a49186aa80427aa3b0d3c2cec19ba64222a29',
  },
}

/**
 * Default executor addresses (LayerZero Labs executors) - FALLBACK ONLY
 * 
 * Executors pay for destination chain gas fees.
 * 
 * These addresses are only used as a fallback if querying the endpoint fails.
 * The app now automatically fetches executor addresses from the LayerZero Endpoint
 * using `getDefaultExecutorAddress()` function.
 */
export const DEFAULT_EXECUTOR_ADDRESSES: { [chainId: number]: string } = {
  1: '0x173272739Bd7Aa6e4e214714048a9fE699453059', // Ethereum Mainnet - Official LZ Executor
  8453: '0x2CCA08ae69E0C44b18a57Ab2A87644234dAebaE4', // Base Mainnet - Official LZ Executor
  56: '0x3ebD570ed38B1b3b4BC886999fcF507e9D584859', // BNB Smart Chain - Official LZ Executor
  137: '0xCd3F213AD101472e1713C72B1697E727C803885b', // Polygon Mainnet - Official LZ Executor
  42161: '0x31CAe3B7fB82d847621859fb1585353c5720660D', // Arbitrum Mainnet - Official LZ Executor
  10: '0x2D2ea0697bdbede3F01553D2Ae4B8d0c486B666e', // Optimism Mainnet - Official LZ Executor
  43114: '0x90E595783E43eb89fF07f63d27B8430e6B44bD9c', // Avalanche Mainnet - Official LZ Executor
  250: '0x2957eBc0D2931270d4a539696514b047756b3056', // Fantom Mainnet - Official LZ Executor
  // Testnets
  11155111: '0x718B92b5CB0a5552039B593faF724D182A881eDA', // Ethereum Sepolia
  84532: '0x8A3D588D9f6AC041476b094f97FF94ec30169d3D', // Base Sepolia
  421614: '0x5Df3a1cEbBD9c8BA7F8dF51Fd632A9aef8308897', // Arbitrum Sepolia
  11155420: '0xDc0D68899405673b932F0DB7f8A49191491A5bcB', // Optimism Sepolia
  80002: '0x4Cf1B3Fa61465c2c907f82fC488B43223BA0CF93', // Polygon Amoy
  43113: '0xa7BFA9D51032F82D649A501B6a1f922FC2f7d4e3', // Avalanche Fuji
  97: '0x31894b190a8bAbd9A067Ce59fde0BfCFD2B18470', // BNB Testnet
}

/**
 * Default message library addresses (ULN302)
 * 
 * ULN302 is the standard message library for LayerZero V2.
 * These libraries handle sending and receiving messages.
 * 
 * Find official addresses:
 * - LayerZero V2 Developer Resources
 * - LayerZero Scan Default Configs
 * - LayerZero GitHub: @layerzerolabs/lz-evm-messagelib-v2
 */
export const DEFAULT_MESSAGE_LIBRARIES: { [chainId: number]: { send: string; receive: string } } = {
  1: { // Ethereum Mainnet
    send: '0x0000000000000000000000000000000000000000', // ULN302 Send Library - UPDATE THIS
    receive: '0x0000000000000000000000000000000000000000', // ULN302 Receive Library - UPDATE THIS
  },
  8453: { // Base Mainnet
    send: '0x0000000000000000000000000000000000000000', // ULN302 Send Library - UPDATE THIS
    receive: '0x0000000000000000000000000000000000000000', // ULN302 Receive Library - UPDATE THIS
  },
}

export interface DvnConfiguration {
  oappAddress: string
  chain: LayerZeroChain
  remoteChain: LayerZeroChain
}

export class DvnConfigurator {
  /**
   * Get current configuration from LayerZero Endpoint
   */
  static async getConfig(
    oappAddress: string,
    libAddress: string,
    remoteEid: number,
    configType: number,
    chain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<UlnConfig | ExecutorConfig | null> {
    const endpointAddress = LAYERZERO_ENDPOINTS[chain.id as keyof typeof LAYERZERO_ENDPOINTS]
    if (!endpointAddress) {
      throw new Error(`LayerZero endpoint not found for chain ${chain.id}`)
    }

    const endpoint = new ethers.Contract(endpointAddress, LAYERZERO_ENDPOINT_ABI, provider)
    
    try {
      const configBytes = await endpoint.getConfig(oappAddress, libAddress, remoteEid, configType)
      
      if (configType === CONFIG_TYPES.EXECUTOR) {
        // Decode ExecutorConfig
        const executorConfigAbi = ['tuple(uint32 maxMessageSize, address executorAddress)']
        const decoded = ethers.utils.defaultAbiCoder.decode(executorConfigAbi, configBytes)
        const maxSize = decoded[0].maxMessageSize
        return {
          maxMessageSize: typeof maxSize === 'number' ? maxSize : (maxSize.toNumber ? maxSize.toNumber() : parseInt(maxSize.toString())),
          executorAddress: decoded[0].executorAddress,
        } as ExecutorConfig
      } else if (configType === CONFIG_TYPES.SEND_ULN || configType === CONFIG_TYPES.RECEIVE_ULN) {
        // Decode UlnConfig
        const ulnConfigAbi = [
          'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
        ]
        const decoded = ethers.utils.defaultAbiCoder.decode(ulnConfigAbi, configBytes)
        const confirmationsVal = decoded[0].confirmations
        return {
          confirmations: typeof confirmationsVal === 'number' ? confirmationsVal : (confirmationsVal.toNumber ? confirmationsVal.toNumber() : parseInt(confirmationsVal.toString())),
          requiredDVNCount: decoded[0].requiredDVNCount,
          optionalDVNCount: decoded[0].optionalDVNCount === 255 ? 0 : decoded[0].optionalDVNCount, // Handle NIL value
          optionalDVNThreshold: decoded[0].optionalDVNThreshold,
          requiredDVNs: decoded[0].requiredDVNs,
          optionalDVNs: decoded[0].optionalDVNs,
        } as UlnConfig
      }
      
      return null
    } catch (error: any) {
      // Handle revert errors gracefully - config might not exist
      if (error.code === 'CALL_EXCEPTION' || error.message?.includes('revert') || error.message?.includes('CALL_EXCEPTION')) {
        // This is expected when checking for optional configs - use debug instead of warn
        console.debug(`Config (type ${configType}) does not exist for OApp ${oappAddress} on chain ${chain.id}`)
        return null
      }
      console.error('Error getting config:', error)
      throw new Error(`Failed to get configuration: ${error.message}`)
    }
  }

  /**
   * Set DVN configuration (UlnConfig)
   */
  static async setUlnConfig(
    oappAddress: string,
    libAddress: string,
    remoteEid: number,
    configType: number, // 2 for SEND_ULN, 3 for RECEIVE_ULN
    ulnConfig: UlnConfig,
    chain: LayerZeroChain,
    signer: ethers.Signer
  ): Promise<string> {
    const endpointAddress = LAYERZERO_ENDPOINTS[chain.id as keyof typeof LAYERZERO_ENDPOINTS]
    if (!endpointAddress) {
      throw new Error(`LayerZero endpoint not found for chain ${chain.id}`)
    }

    // Sort DVN addresses alphabetically (required by LayerZero)
    const sortedRequiredDVNs = [...ulnConfig.requiredDVNs].sort()
    const sortedOptionalDVNs = [...ulnConfig.optionalDVNs].sort()

    // Handle NIL values for optionalDVNCount
    const optionalDVNCount = ulnConfig.optionalDVNCount === 0 ? 255 : ulnConfig.optionalDVNCount

    // Encode UlnConfig
    const ulnConfigStruct = [
      'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
    ]
    const encodedConfig = ethers.utils.defaultAbiCoder.encode(ulnConfigStruct, [
      {
        confirmations: ulnConfig.confirmations,
        requiredDVNCount: ulnConfig.requiredDVNCount,
        optionalDVNCount: optionalDVNCount,
        optionalDVNThreshold: ulnConfig.optionalDVNThreshold,
        requiredDVNs: sortedRequiredDVNs,
        optionalDVNs: sortedOptionalDVNs,
      },
    ])

    const endpoint = new ethers.Contract(endpointAddress, LAYERZERO_ENDPOINT_ABI, signer)

    // Create SetConfigParam
    const params = [
      {
        eid: remoteEid,
        configType: configType,
        config: encodedConfig,
      },
    ]

    try {
      const tx = await endpoint.setConfig(oappAddress, libAddress, params)
      await tx.wait()
      return tx.hash
    } catch (error: any) {
      console.error('Error setting ULN config:', error)
      throw new Error(`Failed to set ULN configuration: ${error.message}`)
    }
  }

  /**
   * Set Executor configuration
   */
  static async setExecutorConfig(
    oappAddress: string,
    libAddress: string,
    remoteEid: number,
    executorConfig: ExecutorConfig,
    chain: LayerZeroChain,
    signer: ethers.Signer
  ): Promise<string> {
    const endpointAddress = LAYERZERO_ENDPOINTS[chain.id as keyof typeof LAYERZERO_ENDPOINTS]
    if (!endpointAddress) {
      throw new Error(`LayerZero endpoint not found for chain ${chain.id}`)
    }

    // Encode ExecutorConfig
    const executorConfigStruct = ['tuple(uint32 maxMessageSize, address executorAddress)']
    const encodedConfig = ethers.utils.defaultAbiCoder.encode(executorConfigStruct, [
      {
        maxMessageSize: executorConfig.maxMessageSize,
        executorAddress: executorConfig.executorAddress,
      },
    ])

    const endpoint = new ethers.Contract(endpointAddress, LAYERZERO_ENDPOINT_ABI, signer)

    // Create SetConfigParam
    const params = [
      {
        eid: remoteEid,
        configType: CONFIG_TYPES.EXECUTOR,
        config: encodedConfig,
      },
    ]

    try {
      const tx = await endpoint.setConfig(oappAddress, libAddress, params)
      await tx.wait()
      return tx.hash
    } catch (error: any) {
      console.error('Error setting executor config:', error)
      throw new Error(`Failed to set executor configuration: ${error.message}`)
    }
  }

  /**
   * Validate that Send and Receive configs match
   */
  static validateConfigMatch(sendConfig: UlnConfig, receiveConfig: UlnConfig): {
    valid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Check confirmations match
    if (sendConfig.confirmations !== receiveConfig.confirmations) {
      errors.push(
        `Block confirmations mismatch: Send=${sendConfig.confirmations}, Receive=${receiveConfig.confirmations}`
      )
    }

    // Check required DVNs match
    const sendDVNs = [...sendConfig.requiredDVNs].sort().join(',')
    const receiveDVNs = [...receiveConfig.requiredDVNs].sort().join(',')
    if (sendDVNs !== receiveDVNs) {
      errors.push(`Required DVNs mismatch: Send=[${sendConfig.requiredDVNs.join(', ')}], Receive=[${receiveConfig.requiredDVNs.join(', ')}]`)
    }

    // Check required DVN count matches
    if (sendConfig.requiredDVNCount !== receiveConfig.requiredDVNCount) {
      errors.push(
        `Required DVN count mismatch: Send=${sendConfig.requiredDVNCount}, Receive=${receiveConfig.requiredDVNCount}`
      )
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  /**
   * Get available DVN addresses for a chain
   * 
   * If DVN addresses are not in the hardcoded list, this will return an empty object.
   * The UI should handle this gracefully - users can still configure DVNs by:
   * 1. Fetching default DVN addresses from the LayerZero Endpoint using getDefaultConfig()
   * 2. Manually entering DVN addresses
   * 
   * TODO: Add more chain-specific DVN addresses as they become available
   * or implement automatic fetching from LayerZero Endpoint default config
   */
  static getAvailableDVNs(chainId: number): { [name: string]: string } {
    return DEFAULT_DVN_ADDRESSES[chainId] || {}
  }
  
  /**
   * Fetch DVN addresses from LayerZero Endpoint default config
   * This can be used as a fallback when hardcoded addresses aren't available
   * 
   * @param remoteEid Remote endpoint ID (destination chain)
   * @param chain Chain to query (source chain)
   * @param provider Provider instance
   */
  static async getDefaultDVNAddresses(
    remoteEid: number,
    chain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<string[]> {
    try {
      const defaultConfig = await this.getDefaultConfig(
        remoteEid,
        CONFIG_TYPES.SEND_ULN,
        chain,
        provider
      ) as UlnConfig | null
      
      if (defaultConfig && defaultConfig.requiredDVNs) {
        return defaultConfig.requiredDVNs
      }
      
      return []
    } catch (error) {
      console.warn('Failed to fetch default DVN addresses from endpoint:', error)
      return []
    }
  }

  /**
   * Fetch default configuration from LayerZero Endpoint
   * This can be used to get the actual default DVN addresses and libraries
   * 
   * @param remoteEid Remote endpoint ID
   * @param configType 1=Executor, 2=Send ULN, 3=Receive ULN
   * @param chain Chain to query
   * @param provider Provider instance
   */
  static async getDefaultConfig(
    remoteEid: number,
    configType: number,
    chain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<UlnConfig | ExecutorConfig | null> {
    const endpointAddress = LAYERZERO_ENDPOINTS[chain.id as keyof typeof LAYERZERO_ENDPOINTS]
    if (!endpointAddress) {
      throw new Error(`LayerZero endpoint not found for chain ${chain.id}`)
    }

    const endpoint = new ethers.Contract(endpointAddress, LAYERZERO_ENDPOINT_ABI, provider)
    
    // Use address(0) to get default config
    const zeroAddress = '0x0000000000000000000000000000000000000000'
    
    try {
      const configBytes = await endpoint.getConfig(zeroAddress, zeroAddress, remoteEid, configType)
      
      if (configType === CONFIG_TYPES.EXECUTOR) {
        const executorConfigAbi = ['tuple(uint32 maxMessageSize, address executorAddress)']
        const decoded = ethers.utils.defaultAbiCoder.decode(executorConfigAbi, configBytes)
        return {
          maxMessageSize: decoded[0].maxMessageSize.toNumber(),
          executorAddress: decoded[0].executorAddress,
        } as ExecutorConfig
      } else if (configType === CONFIG_TYPES.SEND_ULN || configType === CONFIG_TYPES.RECEIVE_ULN) {
        const ulnConfigAbi = [
          'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
        ]
        const decoded = ethers.utils.defaultAbiCoder.decode(ulnConfigAbi, configBytes)
        const confirmationsVal = decoded[0].confirmations
        return {
          confirmations: typeof confirmationsVal === 'number' ? confirmationsVal : (confirmationsVal.toNumber ? confirmationsVal.toNumber() : parseInt(confirmationsVal.toString())),
          requiredDVNCount: decoded[0].requiredDVNCount,
          optionalDVNCount: decoded[0].optionalDVNCount === 255 ? 0 : decoded[0].optionalDVNCount,
          optionalDVNThreshold: decoded[0].optionalDVNThreshold,
          requiredDVNs: decoded[0].requiredDVNs,
          optionalDVNs: decoded[0].optionalDVNs,
        } as UlnConfig
      }
      
      return null
    } catch (error: any) {
      // Handle revert errors gracefully - some configs might not exist for certain chain pairs
      if (error.code === 'CALL_EXCEPTION' || error.message?.includes('revert') || error.message?.includes('CALL_EXCEPTION')) {
        // This is expected for many chain pairs - use debug instead of warn
        console.debug(`Default config (type ${configType}) does not exist for chain ${chain.id} -> remote EID ${remoteEid}`)
        return null
      }
      console.error('Error getting default config:', error)
      throw new Error(`Failed to get default configuration: ${error.message}`)
    }
  }

  /**
   * Get default message library addresses from LayerZero Endpoint
   * ULN302 is the protocol/encoding format - this fetches the contract addresses
   * that implement ULN302 for sending and receiving messages
   * 
   * @param remoteEid Remote endpoint ID (destination chain)
   * @param chain Chain to query (source chain)
   * @param provider Provider instance
   */
  static async getDefaultMessageLibraries(
    remoteEid: number,
    chain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<{ send: string; receive: string }> {
    const endpointAddress = LAYERZERO_ENDPOINTS[chain.id as keyof typeof LAYERZERO_ENDPOINTS]
    if (!endpointAddress) {
      throw new Error(`LayerZero endpoint not found for chain ${chain.id}`)
    }

    const endpoint = new ethers.Contract(endpointAddress, LAYERZERO_ENDPOINT_ABI, provider)
    
    try {
      // Get default send and receive library addresses for the remote endpoint
      const sendLib = await endpoint.defaultSendLibrary(remoteEid)
      const receiveLib = await endpoint.defaultReceiveLibrary(remoteEid)
      
      return {
        send: sendLib,
        receive: receiveLib,
      }
    } catch (error: any) {
      console.error('Error getting default message libraries:', error)
      throw new Error(`Failed to get default message libraries: ${error.message}`)
    }
  }

  /**
   * Get message library addresses for a specific OApp
   * Returns the libraries the OApp is using (or defaults if not set)
   * 
   * @param oappAddress OApp contract address
   * @param remoteEid Remote endpoint ID (destination chain)
   * @param chain Chain to query (source chain)
   * @param provider Provider instance
   */
  static async getOAppMessageLibraries(
    oappAddress: string,
    remoteEid: number,
    chain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<{ send: string; receive: string; sendIsDefault: boolean; receiveIsDefault: boolean }> {
    const endpointAddress = LAYERZERO_ENDPOINTS[chain.id as keyof typeof LAYERZERO_ENDPOINTS]
    if (!endpointAddress) {
      throw new Error(`LayerZero endpoint not found for chain ${chain.id}`)
    }

    const endpoint = new ethers.Contract(endpointAddress, LAYERZERO_ENDPOINT_ABI, provider)
    
    try {
      // Get send library (always returns address, no isDefault flag)
      const sendLib = await endpoint.getSendLibrary(oappAddress, remoteEid)
      
      // Get receive library (returns address and isDefault flag)
      const receiveLibResult = await endpoint.getReceiveLibrary(oappAddress, remoteEid)
      const receiveLib = Array.isArray(receiveLibResult) ? receiveLibResult[0] : receiveLibResult.lib
      const receiveIsDefault = Array.isArray(receiveLibResult) ? receiveLibResult[1] : receiveLibResult.isDefault
      
      // For send library, check if it's the default by comparing with defaultSendLibrary
      const defaultSendLib = await endpoint.defaultSendLibrary(remoteEid)
      const sendIsDefault = sendLib.toLowerCase() === defaultSendLib.toLowerCase()
      
      return {
        send: sendLib,
        receive: receiveLib,
        sendIsDefault,
        receiveIsDefault,
      }
    } catch (error: any) {
      console.error('Error getting OApp message libraries:', error)
      throw new Error(`Failed to get OApp message libraries: ${error.message}`)
    }
  }

  /**
   * Get default executor address from LayerZero Endpoint
   * Executors pay for destination chain gas fees
   * 
   * @param remoteEid Remote endpoint ID (destination chain)
   * @param chain Chain to query (source chain)
   * @param provider Provider instance
   */
  static async getDefaultExecutorAddress(
    remoteEid: number,
    chain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<string | null> {
    try {
      // Get default executor config which contains the executor address
      const defaultExecutorConfig = await this.getDefaultConfig(
        remoteEid,
        CONFIG_TYPES.EXECUTOR,
        chain,
        provider
      ) as ExecutorConfig | null
      
      // If config doesn't exist, return null (this is expected for some chain pairs)
      if (!defaultExecutorConfig) {
        // This is expected for many chain pairs - use debug instead of warn
        console.debug(`Default executor config does not exist for chain ${chain.id} -> remote EID ${remoteEid}`)
        return null
      }
      
      if (!defaultExecutorConfig.executorAddress) {
        // This is expected for many chain pairs - use debug instead of warn
        console.debug(`Executor address is missing from config for chain ${chain.id} -> remote EID ${remoteEid}`)
        return null
      }
      
      // Check if executor address is zero address (which means no executor is configured)
      if (defaultExecutorConfig.executorAddress === '0x0000000000000000000000000000000000000000') {
        // This is expected for many chain pairs - use debug instead of warn
        console.debug(`Executor address is zero address (no default executor configured) for chain ${chain.id} -> remote EID ${remoteEid}`)
        return null
      }
      
      console.log('✅ Fetched executor config:', {
        executorAddress: defaultExecutorConfig.executorAddress,
        maxMessageSize: defaultExecutorConfig.maxMessageSize,
      })
      
      return defaultExecutorConfig.executorAddress
    } catch (error: any) {
      // Only log unexpected errors, but return null for graceful handling
      if (error.code !== 'CALL_EXCEPTION' && !error.message?.includes('revert')) {
        console.error('Unexpected error getting default executor address:', error)
        console.error('Chain:', chain.id, 'Remote Eid:', remoteEid)
      }
      return null
    }
  }

  /**
   * Get OApp executor config (or default if not set)
   * 
   * @param oappAddress OApp contract address
   * @param sendLibAddress Send library address (needed to query config)
   * @param remoteEid Remote endpoint ID (destination chain)
   * @param chain Chain to query (source chain)
   * @param provider Provider instance
   */
  static async getOAppExecutorConfig(
    oappAddress: string,
    sendLibAddress: string,
    remoteEid: number,
    chain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<ExecutorConfig> {
    try {
      // Try to get OApp-specific executor config
      const oappExecutorConfig = await this.getConfig(
        oappAddress,
        sendLibAddress,
        remoteEid,
        CONFIG_TYPES.EXECUTOR,
        chain,
        provider
      ) as ExecutorConfig | null
      
      if (oappExecutorConfig) {
        return oappExecutorConfig
      }
      
      // Fall back to default executor config
      const defaultExecutorConfig = await this.getDefaultConfig(
        remoteEid,
        CONFIG_TYPES.EXECUTOR,
        chain,
        provider
      ) as ExecutorConfig | null
      
      if (defaultExecutorConfig) {
        return defaultExecutorConfig
      }
      
      throw new Error('Could not retrieve executor config')
    } catch (error: any) {
      console.error('Error getting OApp executor config:', error)
      throw new Error(`Failed to get executor config: ${error.message}`)
    }
  }

  /**
   * Encode executor options for LayerZero V2
   * 
   * @param options ExecutorOptions configuration
   * @returns Encoded options bytes
   */
  static encodeExecutorOptions(options: ExecutorOptions): string {
    let encoded = '0x'
    
    // LZ_RECEIVE option (always enabled for ONFT)
    if (options.enabledOptions & 1) {
      const receiveOption = ethers.utils.solidityPack(
        ['uint16', 'uint256'],
        [ExecutorOptionType.LZ_RECEIVE, options.receiveGasLimit]
      )
      encoded = encoded === '0x' ? receiveOption : ethers.utils.hexConcat([encoded, receiveOption])
    }
    
    // LZ_COMPOSE option (optional)
    if ((options.enabledOptions & 2) && options.composeGasLimit) {
      const composeOption = ethers.utils.solidityPack(
        ['uint16', 'uint256'],
        [ExecutorOptionType.LZ_COMPOSE, options.composeGasLimit]
      )
      encoded = ethers.utils.hexConcat([encoded, composeOption])
    }
    
    // ORDERED option (optional)
    if ((options.enabledOptions & 4) && options.orderedGasLimit) {
      const orderedOption = ethers.utils.solidityPack(
        ['uint16', 'uint256'],
        [ExecutorOptionType.ORDERED, options.orderedGasLimit]
      )
      encoded = ethers.utils.hexConcat([encoded, orderedOption])
    }
    
    // Additional msgValue if specified
    if (options.msgValue && options.msgValue > 0) {
      const valueOption = ethers.utils.solidityPack(
        ['uint16', 'uint256'],
        [ExecutorOptionType.LZ_COMPOSE, options.msgValue]
      )
      encoded = ethers.utils.hexConcat([encoded, valueOption])
    }
    
    return encoded === '0x' ? '0x' : encoded
  }

  /**
   * Get default executor options for ONFT bridging
   */
  static getDefaultExecutorOptions(): ExecutorOptions {
    return {
      receiveGasLimit: 200000, // Standard gas limit for ONFT receive
      enabledOptions: 1, // Only LZ_RECEIVE enabled by default
      msgValue: 0,
    }
  }

  /**
   * Set receive library for OApp
   * This must be done before configuring receive ULN settings
   * 
   * @param oappAddress OApp contract address
   * @param remoteEid Remote endpoint ID
   * @param receiveLibAddress Receive library address
   * @param gracePeriod Grace period for library migration (default: 0)
   * @param chain Chain to set library on
   * @param signer Signer for transaction
   */
  static async setReceiveLibrary(
    oappAddress: string,
    remoteEid: number,
    receiveLibAddress: string,
    gracePeriod: number,
    chain: LayerZeroChain,
    signer: ethers.Signer
  ): Promise<string> {
    const endpointAddress = LAYERZERO_ENDPOINTS[chain.id as keyof typeof LAYERZERO_ENDPOINTS]
    if (!endpointAddress) {
      throw new Error(`LayerZero endpoint not found for chain ${chain.id}`)
    }

    const endpoint = new ethers.Contract(endpointAddress, LAYERZERO_ENDPOINT_ABI, signer)
    
    try {
      const tx = await endpoint.setReceiveLibrary(
        oappAddress,
        remoteEid,
        receiveLibAddress,
        gracePeriod
      )
      await tx.wait()
      return tx.hash
    } catch (error: any) {
      console.error('Error setting receive library:', error)
      throw new Error(`Failed to set receive library: ${error.message}`)
    }
  }

  /**
   * Get delegate address for an OApp
   */
  static async getDelegate(
    oappAddress: string,
    chain: LayerZeroChain,
    provider: ethers.providers.Provider
  ): Promise<string | null> {
    try {
      const endpointAddress = getLayerZeroEndpoint(chain.id) || LAYERZERO_ENDPOINTS[chain.id as keyof typeof LAYERZERO_ENDPOINTS]
      if (!endpointAddress) {
        throw new Error('LayerZero endpoint not found for chain')
      }

      const endpoint = new ethers.Contract(endpointAddress, LAYERZERO_ENDPOINT_ABI, provider)
      const delegate = await endpoint.delegates(oappAddress)
      
      // Check if delegate is zero address (no delegate)
      if (delegate === ethers.constants.AddressZero || delegate === '0x0000000000000000000000000000000000000000') {
        return null
      }
      
      return delegate
    } catch (error: any) {
      if (error.code === 'CALL_EXCEPTION') {
        return null
      }
      console.error('Error getting delegate:', error)
      throw error
    }
  }

  /**
   * Set delegate address for an OApp
   */
  static async setDelegate(
    oappAddress: string,
    delegateAddress: string,
    chain: LayerZeroChain,
    signer: ethers.Signer
  ): Promise<string> {
    try {
      const endpointAddress = getLayerZeroEndpoint(chain.id) || LAYERZERO_ENDPOINTS[chain.id as keyof typeof LAYERZERO_ENDPOINTS]
      if (!endpointAddress) {
        throw new Error('LayerZero endpoint not found for chain')
      }

      const endpoint = new ethers.Contract(endpointAddress, LAYERZERO_ENDPOINT_ABI, signer)
      const tx = await endpoint.setDelegate(oappAddress, delegateAddress)
      await tx.wait()
      
      return tx.hash
    } catch (error: any) {
      console.error('Error setting delegate:', error)
      throw error
    }
  }
}
