/**
 * LayerZero Read Data Channels Configuration
 * 
 * Reference: https://docs.layerzero.network/v2/deployments/read-contracts
 * 
 * This file contains ReadLib1002 addresses, supported DVNs, and channel IDs
 * for cross-chain read operations.
 */

import { LayerZeroChain } from './chains'

/**
 * Read Library (ReadLib1002) addresses by chain
 * Official addresses from: https://docs.layerzero.network/v2/deployments/read-contracts
 * 
 * These are the message libraries that handle read operations.
 * Each chain has a specific ReadLib1002 deployment.
 */
export const READ_LIBRARY_ADDRESSES: { [chainId: number]: string } = {
  // Mainnets
  1: '0x74F55Bc2a79A27A0bF1D1A35DB5d0Fc36b9FDB9D', // Ethereum Mainnet
  8453: '0x1273141a3f7923AA2d9edDfA402440cE075ed8Ff', // Base Mainnet
  42161: '0xbcd4CADCac3F767C57c4F402932C4705DF62BEFf', // Arbitrum Mainnet
  10: '0x01B29c03fAD8F455184573D6624a8136cF6106Fb', // Optimism Mainnet
  137: '0xc214d690031d3f873365f94d381d6d50c35aa7fa', // Polygon Mainnet
  43114: '0x8839D3f169f473193423b402BDC4B5c51daAABDc', // Avalanche Mainnet
  56: '0x37375049CDc522Bd6bAeEbf527A42D54688d784c', // BNB Smart Chain
  
  // Testnets
  11155111: '0x908E86e9cb3F16CC94AE7569Bf64Ce2CE04bbcBE', // Ethereum Sepolia
  84532: '0x29270F0CFC54432181C853Cd25E2Fb60A68E03f2', // Base Sepolia
  421614: '0x54320b901FDe49Ba98de821Ccf374BA4358a8bf6', // Arbitrum Sepolia
}

/**
 * DVNs that support read operations (have archival node access)
 * Official addresses from: https://docs.layerzero.network/v2/deployments/read-contracts
 * 
 * These DVNs can execute eth_call on target chains to fulfill read requests.
 * Note: DVN addresses are chain-specific and may differ from standard messaging DVNs.
 */
export const READ_SUPPORTED_DVNS: { [chainId: number]: { [name: string]: string } } = {
  1: { // Ethereum Mainnet
    'LayerZero Labs (lzRead)': '0xdb979d0a36af0525afa60fc265b1525505c55d79',
    'Horizen (lzRead)': '0x2f0ba3dbb93cf087e32c15aab46726fdb4fb24cf',
    'Nethermind (lzRead)': '0xf4064220871e3b94ca6ab3b0cee8e29178bf47de',
    'Animoca-Blockdaemon (lzRead)': '0x864b42dddc43a610e7506c163048c087f0b406ef',
    'BCW Group (lzRead)': '0x3a283ed6bcce8d9dfb673fbfba6e644c9d02e9ab',
    'AltLayer (lzRead)': '0x1e129c36bc3afc3f0d46a42c9d9cab7586bda94c',
    'Nocturnal Labs (lzRead)': '0x7c42f598d22e8711998bac7c3360a7b3a514863d',
  },
  8453: { // Base Mainnet
    'LayerZero Labs (lzRead)': '0xb1473ac9f58fb27597a21710da9d1071841e8163',
    'Horizen (lzRead)': '0x3a4636e9ab975d28d3af808b4e1c9fd936374e30',
    'Nethermind (lzRead)': '0x658947bc7956aea0067a62cf87ab02ae199ef3f3',
    'Animoca-Blockdaemon (lzRead)': '0x41ef29f974fc9f6772654f005271c64210425391',
    'BCW Group (lzRead)': '0xd77a62b54ee18bcd667b6cd158d5a000182af5cf',
    'Nocturnal Labs (lzRead)': '0xf4c489afd83625f510947e63ff8f90dfee0ae46c',
  },
  42161: { // Arbitrum Mainnet
    'LayerZero Labs (lzRead)': '0x1308151a7ebac14f435d3ad5ff95c34160d539a5',
    'Horizen (lzRead)': '0x5cff49d69d79d677dd3e5b38e048a0dcb6d86aaf',
    'Nethermind (lzRead)': '0x14e570a1684c7ca883b35e1b25d2f7cec98a16cd',
    'Animoca-Blockdaemon (lzRead)': '0xf0e40968e27f63b3b0a0b3baac4a274149376591',
    'BCW Group (lzRead)': '0x05ce650134d943c5e336dc7990e84fb4e69fdf29',
    'AltLayer (lzRead)': '0x8ede21203e062d7d1eaec11c4c72ad04cdc15658',
    'Nocturnal Labs (lzRead)': '0xfdd2e77a6addc1e18862f43297500d2ebfbd94ac',
  },
  10: { // Optimism Mainnet
    'LayerZero Labs (lzRead)': '0xd4925b81f62457caca368412315d230535b9a48a',
    'Horizen (lzRead)': '0xeb64c44109ede90cc6e34953ab122a1f09460a44',
    'Nethermind (lzRead)': '0x6075e53dc2ddcfa81142fbad52315ae627ffce75',
    'Animoca-Blockdaemon (lzRead)': '0x3b247f1b48f055ebf2db593672b98c9597e3081e',
    'BCW Group (lzRead)': '0x41f3a349e6ac46caad2da04cfceae3e0de0e6c0c',
    'AltLayer (lzRead)': '0x06e8042729cef3ae6d6db5350f48f9d736c3675d',
    'Nocturnal Labs (lzRead)': '0x47039f4327f74e755f65821040a7e0addd596d09',
  },
  137: { // Polygon Mainnet
    'LayerZero Labs (lzRead)': '0xa70c51c38d5a9990f3113a403d74eba01fce4ccb',
    'Horizen (lzRead)': '0x5cff49d69d79d677dd3e5b38e048a0dcb6d86aaf',
    'Nethermind (lzRead)': '0xbcefdadb8d24b1d36c26b522235012cd4cf162f6',
    'BCW Group (lzRead)': '0x66d771b8f938ccb82a1a9cb7a93671cb92016ab0',
    'AltLayer (lzRead)': '0xbabbb709b3cefe563f2ab14898a53301686d48b9',
    'Nocturnal Labs (lzRead)': '0xf60c89799c85d8fab79519f7666dcde2a7c97cca',
  },
  43114: { // Avalanche Mainnet
    'LayerZero Labs (lzRead)': '0x0ffe02df012299a370d5dd69298a5826eacafdf8',
    'Horizen (lzRead)': '0x1a5df1367f21d55b13d5e2f8778ad644bc97ac6d',
    'Nethermind (lzRead)': '0x1308151a7ebac14f435d3ad5ff95c34160d539a5',
    'Animoca-Blockdaemon (lzRead)': '0xab82e9b24004b954985528dac14d1b020722a3c8',
    'BCW Group (lzRead)': '0x7a42a1c1deba75756f9af12bee6b29cfc2be3d70',
    'AltLayer (lzRead)': '0x8efb6b7dc61c6b6638714747d5e6b81a3512b5c3',
    'Nocturnal Labs (lzRead)': '0xbd836c4c9d2c3ff94718173b463054c3e2c11cf4',
  },
  56: { // BNB Smart Chain
    'LayerZero Labs (lzRead)': '0x509889389cfb7a89850017425810116a44676f58',
    'Horizen (lzRead)': '0x81d8516adae92b655acaf6a04c9526716baeb849',
    'Nethermind (lzRead)': '0x0321a1b9e48ccdc5a8a32c524b858e10072ef798',
    'Animoca-Blockdaemon (lzRead)': '0xd4925b81f62457caca368412315d230535b9a48a',
    'BCW Group (lzRead)': '0x5246d80e5673251eb1977ae9d07a93fbd8649963',
    'AltLayer (lzRead)': '0xdb979d0a36af0525afa60fc265b1525505c55d79',
    'Nocturnal Labs (lzRead)': '0x48ecf6d66045aad8d75e72109489ac29da6066a9',
  },
  // Testnets
  11155111: { // Ethereum Sepolia
    'LayerZero Labs (lzRead)': '0x530fbe405189204ef459fa4b767167e4d41e3a37',
    'Horizen (lzRead)': '0x76b3c210a22402e5e95f938074234676136c6023',
  },
  84532: { // Base Sepolia
    'LayerZero Labs (lzRead)': '0xbf6ff58f60606edb2f190769b951d825bcb214e2',
    'Horizen (lzRead)': '0xe1cdd37c13450bc256a39d27b1e1b5d1bc26dde2',
  },
  421614: { // Arbitrum Sepolia
    'LayerZero Labs (lzRead)': '0x5c8c267174e1f345234ff5315d6cfd6716763bac',
    'Horizen (lzRead)': '0xaea6677ece4534bb29a9c63a3475fdb02709f179',
  },
}

/**
 * Read Channel IDs
 * LayerZero uses special channel IDs for read operations
 */
export const READ_CHANNEL_IDS = {
  READ_CHANNEL_1: 4294967295, // 0xFFFFFFFF - Most common
} as const

/**
 * Supported chain pairs for read operations
 * Official data from: https://docs.layerzero.network/v2/deployments/read-contracts
 * 
 * Maps origin chain -> array of supported target chains (data chains).
 * This represents which chains can be read FROM each origin chain.
 */
export const SUPPORTED_READ_PAIRS: { [originChainId: number]: number[] } = {
  // Mainnets
  1: [1, 10, 137, 42161, 43114, 56, 8453], // Ethereum Mainnet
  8453: [1, 10, 137, 42161, 43114, 56, 8453], // Base Mainnet
  42161: [1, 10, 137, 42161, 43114, 56, 8453], // Arbitrum Mainnet
  10: [1, 10, 137, 42161, 43114, 56, 8453], // Optimism Mainnet
  137: [1, 10, 137, 42161, 43114, 56, 8453], // Polygon Mainnet
  43114: [1, 10, 137, 42161, 43114, 56, 8453], // Avalanche Mainnet
  56: [1, 10, 137, 42161, 43114, 56, 8453], // BNB Smart Chain
  
  // Testnets
  11155111: [11155111, 421614, 84532], // Ethereum Sepolia
  84532: [11155111, 421614, 84532], // Base Sepolia
  421614: [11155111, 421614, 84532], // Arbitrum Sepolia
}

/**
 * Check if a chain pair is supported for read operations
 */
export function isReadPairSupported(originChainId: number, targetChainId: number): boolean {
  const supportedTargets = SUPPORTED_READ_PAIRS[originChainId]
  if (!supportedTargets) return false
  return supportedTargets.includes(targetChainId)
}

/**
 * Get ReadLib1002 address for a chain
 */
export function getReadLibraryAddress(chainId: number): string | null {
  return READ_LIBRARY_ADDRESSES[chainId] || null
}

/**
 * Get DVNs that support read operations for a chain
 */
export function getReadSupportedDVNs(chainId: number): { [name: string]: string } {
  return READ_SUPPORTED_DVNS[chainId] || {}
}

/**
 * Check if a chain has ReadLib1002 deployed
 */
export function hasReadLibrary(chainId: number): boolean {
  return !!READ_LIBRARY_ADDRESSES[chainId]
}

/**
 * Get recommended DVNs for read operations on a chain
 * Returns the most commonly supported DVNs (LayerZero Labs, Horizen, Nethermind)
 */
export function getRecommendedReadDVNs(chainId: number): string[] {
  const dvns = getReadSupportedDVNs(chainId)
  // Return LayerZero Labs, Horizen, and Nethermind as they're most commonly supported
  const recommended: string[] = []
  if (dvns['LayerZero Labs (lzRead)']) recommended.push(dvns['LayerZero Labs (lzRead)'])
  if (dvns['Horizen (lzRead)']) recommended.push(dvns['Horizen (lzRead)'])
  if (dvns['Nethermind (lzRead)']) recommended.push(dvns['Nethermind (lzRead)'])
  return recommended
}
