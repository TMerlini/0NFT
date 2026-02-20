import { ethers } from 'ethers'
import { LayerZeroChain } from './chains'

// LayerZero V2 ONFT ABI (simplified for peer configuration)
const ONFT_ABI = [
  'function setPeer(uint32 _eid, bytes32 _peer) external',
  'function peers(uint32 _eid) external view returns (bytes32)',
  'function owner() external view returns (address)',
  'function transferOwnership(address newOwner) external'
]

// Convert address to bytes32 format for LayerZero
function addressToBytes32(address: string): string {
  return ethers.utils.hexZeroPad(address, 32)
}

// Convert bytes32 back to address for display
function bytes32ToAddress(bytes32: string): string {
  return ethers.utils.getAddress('0x' + bytes32.slice(-40))
}

// Get LayerZero Endpoint ID for chain
// If a LayerZeroChain object is provided, use its layerZeroEndpointId property
// Otherwise, fall back to a hardcoded mapping
function getLayerZeroChainId(chainId: number, chain?: LayerZeroChain): number | null {
  // If chain object is provided, use its layerZeroEndpointId
  if (chain && chain.layerZeroEndpointId) {
    return chain.layerZeroEndpointId
  }
  
  // Fallback to hardcoded mapping
  const mapping: { [key: number]: number } = {
    1: 30101,     // Ethereum
    8453: 30184,  // Base
    137: 30109,   // Polygon
    42161: 30110, // Arbitrum
    10: 30111,    // Optimism
    56: 30102,    // BNB Smart Chain
    43114: 30106, // Avalanche
    250: 30112,   // Fantom
  }
  return mapping[chainId] || null
}

export interface PeerConfiguration {
  sourceContract: string
  sourceChain: LayerZeroChain
  targetContract: string
  targetChain: LayerZeroChain
}

export class PeerConfigurator {
  /**
   * Configure peer connection between two ONFT contracts
   */
  static async configurePeers(config: PeerConfiguration): Promise<{
    sourceToTarget: string
    targetToSource: string
  }> {
    const { sourceContract, sourceChain, targetContract, targetChain } = config

    console.log('🔗 Configuring peer connections...')
    console.log(`📍 Source: ${sourceContract} on ${sourceChain.name}`)
    console.log(`📍 Target: ${targetContract} on ${targetChain.name}`)

    // Get LayerZero EIDs
    const sourceEid = getLayerZeroChainId(sourceChain.id, sourceChain)
    const targetEid = getLayerZeroChainId(targetChain.id, targetChain)

    if (!sourceEid || !targetEid) {
      throw new Error(`LayerZero not supported for chains: ${sourceChain.name} -> ${targetChain.name}`)
    }

    console.log(`🔗 LayerZero EIDs: ${sourceEid} <-> ${targetEid}`)

    // Configure source -> target peer with isolated provider
    console.log(`🔄 Setting peer on ${sourceChain.name}...`)
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${sourceChain.id.toString(16)}` }]
    })
    
    // Wait for network switch
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Create fresh provider and signer for source chain
    const sourceProvider = new ethers.providers.Web3Provider(window.ethereum as any, 'any')
    const sourceSigner = sourceProvider.getSigner()
    const sourceContractInstance = new ethers.Contract(sourceContract, ONFT_ABI, sourceSigner)
    const targetBytes32 = addressToBytes32(targetContract)
    
    console.log(`📡 Calling setPeer(${targetEid}, ${targetBytes32}) on source...`)
    const sourceToTargetTx = await sourceContractInstance.setPeer(targetEid, targetBytes32)
    console.log(`📡 Source->Target transaction: ${sourceToTargetTx.hash}`)
    await sourceToTargetTx.wait()
    console.log(`✅ Peer set on ${sourceChain.name}`)

    // Configure target -> source peer with isolated provider
    console.log(`🔄 Setting peer on ${targetChain.name}...`)
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChain.id.toString(16)}` }]
    })
    
    // Wait for network switch
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Create fresh provider and signer for target chain
    const targetProvider = new ethers.providers.Web3Provider(window.ethereum as any, 'any')
    const targetSigner = targetProvider.getSigner()
    const targetContractInstance = new ethers.Contract(targetContract, ONFT_ABI, targetSigner)
    const sourceBytes32 = addressToBytes32(sourceContract)
    
    console.log(`📡 Calling setPeer(${sourceEid}, ${sourceBytes32}) on target...`)
    const targetToSourceTx = await targetContractInstance.setPeer(sourceEid, sourceBytes32)
    console.log(`📡 Target->Source transaction: ${targetToSourceTx.hash}`)
    await targetToSourceTx.wait()
    console.log(`✅ Peer set on ${targetChain.name}`)

    console.log('🎉 Peer configuration complete!')

    return {
      sourceToTarget: sourceToTargetTx.hash,
      targetToSource: targetToSourceTx.hash
    }
  }

  /**
   * Check if peers are configured between two contracts
   */
  static async checkPeerConfiguration(config: PeerConfiguration): Promise<{
    sourceToTarget: boolean
    targetToSource: boolean
    sourceToTargetAddress?: string
    targetToSourceAddress?: string
  }> {
    const { sourceContract, sourceChain, targetContract, targetChain } = config

    const sourceEid = getLayerZeroChainId(sourceChain.id, sourceChain)
    const targetEid = getLayerZeroChainId(targetChain.id, targetChain)

    if (!sourceEid || !targetEid) {
      throw new Error(`LayerZero not supported for chains: ${sourceChain.name} -> ${targetChain.name}`)
    }

    console.log('🔍 Checking peer configuration...')
    console.log(`📍 Source: ${sourceContract} on ${sourceChain.name} (EID: ${sourceEid})`)
    console.log(`📍 Target: ${targetContract} on ${targetChain.name} (EID: ${targetEid})`)

    // Check source -> target peer with isolated provider
    console.log(`🔄 Switching to ${sourceChain.name} to check source->target peer...`)
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${sourceChain.id.toString(16)}` }]
    })
    
    // Wait a moment for network switch
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Create fresh provider for source chain
    const sourceProvider = new ethers.providers.Web3Provider(window.ethereum as any, 'any')
    const sourceContractInstance = new ethers.Contract(sourceContract, ONFT_ABI, sourceProvider)
    
    console.log(`📡 Checking peers(${targetEid}) on source contract...`)
    const sourceToTargetPeer = await sourceContractInstance.peers(targetEid)
    const sourceToTargetConfigured = sourceToTargetPeer !== '0x0000000000000000000000000000000000000000000000000000000000000000'
    const sourceToTargetAddress = sourceToTargetConfigured ? bytes32ToAddress(sourceToTargetPeer) : undefined
    
    console.log(`✅ Source->Target peer: ${sourceToTargetConfigured ? 'Configured' : 'Not configured'}`)
    if (sourceToTargetConfigured) {
      console.log(`   Address: ${sourceToTargetAddress}`)
    }

    // Check target -> source peer with isolated provider
    console.log(`🔄 Switching to ${targetChain.name} to check target->source peer...`)
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChain.id.toString(16)}` }]
    })
    
    // Wait a moment for network switch
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Create fresh provider for target chain
    const targetProvider = new ethers.providers.Web3Provider(window.ethereum as any, 'any')
    const targetContractInstance = new ethers.Contract(targetContract, ONFT_ABI, targetProvider)
    
    console.log(`📡 Checking peers(${sourceEid}) on target contract...`)
    const targetToSourcePeer = await targetContractInstance.peers(sourceEid)
    const targetToSourceConfigured = targetToSourcePeer !== '0x0000000000000000000000000000000000000000000000000000000000000000'
    const targetToSourceAddress = targetToSourceConfigured ? bytes32ToAddress(targetToSourcePeer) : undefined
    
    console.log(`✅ Target->Source peer: ${targetToSourceConfigured ? 'Configured' : 'Not configured'}`)
    if (targetToSourceConfigured) {
      console.log(`   Address: ${targetToSourceAddress}`)
    }

    const result = {
      sourceToTarget: sourceToTargetConfigured,
      targetToSource: targetToSourceConfigured,
      sourceToTargetAddress,
      targetToSourceAddress
    }
    
    console.log('🎯 Peer check complete:', result)
    return result
  }

  /**
   * Get the owner of a contract
   */
  static async getContractOwner(contractAddress: string, chain: LayerZeroChain): Promise<string> {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chain.id.toString(16)}` }]
    })
    
    // Wait for network switch
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const provider = new ethers.providers.Web3Provider(window.ethereum as any, 'any')
    const contract = new ethers.Contract(contractAddress, ONFT_ABI, provider)
    return await contract.owner()
  }
}

export { addressToBytes32, bytes32ToAddress, getLayerZeroChainId }
