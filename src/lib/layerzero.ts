import { ethers } from 'ethers'

// LayerZero V2 Endpoint addresses
export const LAYERZERO_ENDPOINTS = {
  // Mainnets
  1: '0x1a44076050125825900e736c501f859c50fE728c', // Ethereum
  137: '0x1a44076050125825900e736c501f859c50fE728c', // Polygon
  10: '0x1a44076050125825900e736c501f859c50fE728c', // Optimism
  42161: '0x1a44076050125825900e736c501f859c50fE728c', // Arbitrum
  8453: '0x1a44076050125825900e736c501f859c50fE728c', // Base
  43114: '0x1a44076050125825900e736c501f859c50fE728c', // Avalanche
  56: '0x1a44076050125825900e736c501f859c50fE728c', // BNB Smart Chain
  250: '0x1a44076050125825900e736c501f859c50fE728c', // Fantom
  
  // Testnets
  11155111: '0x6EDCE65403992e310A62460808c4b910D972f10f', // Sepolia
  80002: '0x6EDCE65403992e310A62460808c4b910D972f10f', // Polygon Amoy
  421614: '0x6EDCE65403992e310A62460808c4b910D972f10f', // Arbitrum Sepolia
  11155420: '0x6EDCE65403992e310A62460808c4b910D972f10f', // Optimism Sepolia
  84532: '0x6EDCE65403992e310A62460808c4b910D972f10f', // Base Sepolia
} as const

// LayerZero Chain IDs (EIDs)
export const LAYERZERO_CHAIN_IDS = {
  1: 30101, // Ethereum
  137: 30109, // Polygon
  10: 30111, // Optimism
  42161: 30110, // Arbitrum
  8453: 30184, // Base
  43114: 30106, // Avalanche
  56: 30102, // BNB Smart Chain
  250: 30112, // Fantom
  
  // Testnets
  11155111: 40161, // Sepolia
  80002: 40267, // Polygon Amoy
  421614: 40231, // Arbitrum Sepolia
  11155420: 40232, // Optimism Sepolia
  84532: 40245, // Base Sepolia
} as const

// ONFT Contract ABI (simplified for key functions)
export const ONFT_ABI = [
  // ERC721 Standard
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  
  // ERC721 Approval functions
  'function approve(address to, uint256 tokenId)',
  'function getApproved(uint256 tokenId) view returns (address)',
  'function setApprovalForAll(address operator, bool approved)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  
  // ONFT Specific (LayerZero V2 official signatures)
  'function send(tuple(uint32 dstEid, bytes32 to, uint256 tokenId, bytes extraOptions, bytes composeMsg, bytes onftCmd) _sendParam, tuple(uint256 nativeFee, uint256 lzTokenFee) _fee, address _refundAddress) payable returns (tuple(bytes32 guid, uint256 nativeFee, uint256 lzTokenFee))',
  'function quoteSend(tuple(uint32 dstEid, bytes32 to, uint256 tokenId, bytes extraOptions, bytes composeMsg, bytes onftCmd) _sendParam, bool _payInLzToken) view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))',
  
  // Standard OApp quote function (as per LayerZero V2 docs)
  'function quote(uint32 _dstEid, bytes _message, bytes _options, bool _payInLzToken) view returns (tuple(uint256 nativeFee, uint256 lzTokenFee))',
  
  // OApp functions
  'function peers(uint32 eid) view returns (bytes32)',
  'function setPeer(uint32 _eid, bytes32 _peer)',
  'function owner() view returns (address)',
  
  // Events
  'event ONFTSent(bytes32 indexed guid, uint32 dstEid, address indexed fromAddress, uint256 tokenId)',
  'event ONFTReceived(bytes32 indexed guid, uint32 srcEid, address indexed toAddress, uint256 tokenId)',
] as const

// ONFT Adapter ABI (only adapter-specific functions to avoid duplicates)
export const ONFT_ADAPTER_ABI = [
  // Adapter specific functions
  'function innerToken() view returns (address)',
  'function isTokenLocked(uint256 tokenId) view returns (bool)',
] as const

// ERC721 Standard ABI for analysis
export const ERC721_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function owner() view returns (address)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
] as const

// Interface IDs for ERC165 checks
export const INTERFACE_IDS = {
  ERC165: '0x01ffc9a7',
  ERC721: '0x80ac58cd',
  ERC721Metadata: '0x5b5e139f',
  ERC721Enumerable: '0x780e9d63',
  ONFT: '0x23de6651', // Custom ONFT interface
} as const

// LayerZero message options
export const DEFAULT_OPTIONS = {
  TYPE_1: 1, // LZ_RECEIVE option type
  TYPE_2: 2, // LZ_RECEIVE + LZ_COMPOSE option types
  TYPE_3: 3, // LZ_RECEIVE + LZ_COMPOSE + ORDERED option types
}

// Gas limits for different operations
export const GAS_LIMITS = {
  RECEIVE: 200000,
  COMPOSE: 500000,
  ORDERED: 300000,
}

// Helper function to encode LayerZero options
export function encodeOptions(gasLimit: number, msgValue: number = 0): string {
  const options = ethers.utils.solidityPack(
    ['uint16', 'uint256'],
    [DEFAULT_OPTIONS.TYPE_1, gasLimit]
  )
  
  if (msgValue > 0) {
    return ethers.utils.solidityPack(
      ['bytes', 'uint16', 'uint256'],
      [options, DEFAULT_OPTIONS.TYPE_2, msgValue]
    )
  }
  
  return options
}

// Helper function to convert address to bytes32
export function addressToBytes32(address: string): string {
  return ethers.utils.hexZeroPad(address, 32)
}

// Helper function to convert bytes32 to address
export function bytes32ToAddress(bytes32: string): string {
  return ethers.utils.getAddress('0x' + bytes32.slice(-40))
}

// Get LayerZero endpoint for chain
export function getLayerZeroEndpoint(chainId: number): string | undefined {
  return LAYERZERO_ENDPOINTS[chainId as keyof typeof LAYERZERO_ENDPOINTS]
}

// Get LayerZero chain ID (EID) for chain
export function getLayerZeroChainId(chainId: number): number | undefined {
  return LAYERZERO_CHAIN_IDS[chainId as keyof typeof LAYERZERO_CHAIN_IDS]
}

// Validate if chain supports LayerZero
export function isLayerZeroSupported(chainId: number): boolean {
  return chainId in LAYERZERO_ENDPOINTS
}
