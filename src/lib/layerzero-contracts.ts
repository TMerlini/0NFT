/**
 * LayerZero V2 Official Contract Addresses
 * 
 * Source: https://docs.layerzero.network/v2/deployments/deployed-contracts
 * 
 * This file provides access to official LayerZero V2 contract addresses
 * including EndpointV2, SendUln302, ReceiveUln302, ReadLib1002, Executors, etc.
 */

import layerZeroContracts from './layerzero-contracts.json'

export interface LayerZeroContractAddresses {
  name: string
  chainId: number
  endpointId: number
  endpointV2: string
  sendUln302: string
  receiveUln302: string
  readLib1002?: string
  blockedMessageLib: string
  lzExecutor: string
  lzDeadDvn?: string
}

export interface LayerZeroContractsData {
  version: string
  source: string
  lastUpdated: string
  chains: { [chainId: string]: LayerZeroContractAddresses }
  notes: {
    endpointIds: string
    specialChains: { [chain: string]: string }
  }
}

const contractsData = layerZeroContracts as LayerZeroContractsData

/**
 * Get LayerZero contract addresses for a specific chain
 */
export function getLayerZeroContracts(chainId: number): LayerZeroContractAddresses | null {
  const chainData = contractsData.chains[chainId.toString()]
  return chainData || null
}

/**
 * Get EndpointV2 address for a chain
 */
export function getEndpointV2(chainId: number): string | null {
  const contracts = getLayerZeroContracts(chainId)
  return contracts?.endpointV2 || null
}

/**
 * Get SendUln302 address for a chain
 */
export function getSendUln302(chainId: number): string | null {
  const contracts = getLayerZeroContracts(chainId)
  return contracts?.sendUln302 || null
}

/**
 * Get ReceiveUln302 address for a chain
 */
export function getReceiveUln302(chainId: number): string | null {
  const contracts = getLayerZeroContracts(chainId)
  return contracts?.receiveUln302 || null
}

/**
 * Get ReadLib1002 address for a chain (for lzRead)
 */
export function getReadLib1002(chainId: number): string | null {
  const contracts = getLayerZeroContracts(chainId)
  return contracts?.readLib1002 || null
}

/**
 * Get LZ Executor address for a chain
 */
export function getLzExecutor(chainId: number): string | null {
  const contracts = getLayerZeroContracts(chainId)
  return contracts?.lzExecutor || null
}

/**
 * Get Endpoint ID (EID) for a chain
 */
export function getEndpointId(chainId: number): number | null {
  const contracts = getLayerZeroContracts(chainId)
  return contracts?.endpointId || null
}

/**
 * Get all supported chain IDs
 */
export function getSupportedChainIds(): number[] {
  return Object.keys(contractsData.chains).map(id => parseInt(id))
}

/**
 * Check if a chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId.toString() in contractsData.chains
}

/**
 * Get special chain notes (warnings/requirements)
 */
export function getSpecialChainNote(chainName: string): string | null {
  return contractsData.notes.specialChains[chainName.toLowerCase()] || null
}

/**
 * Get all contract addresses for a chain pair (source -> destination)
 */
export function getChainPairContracts(sourceChainId: number, destinationChainId: number): {
  source: LayerZeroContractAddresses | null
  destination: LayerZeroContractAddresses | null
} {
  return {
    source: getLayerZeroContracts(sourceChainId),
    destination: getLayerZeroContracts(destinationChainId)
  }
}
