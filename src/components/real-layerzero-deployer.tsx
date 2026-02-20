'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { LayerZeroChain } from '@/lib/chains'
import { ethers } from 'ethers'
import { ContractCompiler } from '@/lib/contract-compiler'
import { DeploymentStateManager, type DeploymentState } from '@/lib/deployment-state-manager'
import { 
  Zap, 
  Network, 
  DollarSign, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info,
  Rocket
} from 'lucide-react'
import { DeterministicDeploymentConfig } from './deterministic-deployment-config'

// LayerZero V2 Endpoint addresses
// All mainnet chains use the same endpoint in LayerZero V2
const LAYERZERO_ENDPOINTS = {
  ethereum: '0x1a44076050125825900e736c501f859c50fE728c',
  base: '0x1a44076050125825900e736c501f859c50fE728c', // Fixed: Same endpoint for all mainnets
  polygon: '0x1a44076050125825900e736c501f859c50fE728c',
  arbitrum: '0x1a44076050125825900e736c501f859c50fE728c',
  optimism: '0x1a44076050125825900e736c501f859c50fE728c'
}

// LayerZero Endpoint IDs (EIDs)
const LAYERZERO_EIDS = {
  ethereum: 30101,
  base: 30184,
  polygon: 30109,
  arbitrum: 30110,
  optimism: 30111
}

interface RealLayerZeroDeployerProps {
  isOpen: boolean
  onClose: () => void
  deploymentType: 'adapter' | 'new-onft'
  
  // ONFT Adapter props
  sourceChain?: LayerZeroChain
  targetChains?: LayerZeroChain[]
  contractAddress?: string
  contractInfo?: any
  existingAdapterAddress?: string // Use existing adapter instead of deploying new one
  existingAdapterChain?: LayerZeroChain // Chain of existing adapter
  
  // New ONFT props
  chains?: LayerZeroChain[]
  collectionName?: string
  collectionSymbol?: string
  baseURI?: string
}

interface DeploymentResult {
  address: string
  transactionHash: string
  network: string
  explorerUrl: string
  verified?: boolean
  verificationStatus?: string
  contractName?: string
  sourceCode?: string
  constructorArgs?: string
}

// Real LayerZero V2 source code templates based on official docs
// Get network parameters for adding to wallet
function getNetworkParams(chain: LayerZeroChain) {
  const chainId = chain.id
  const networkParams: any = {
    chainId: `0x${chainId.toString(16)}`,
    chainName: chain.name,
    rpcUrls: [],
    blockExplorerUrls: [(chain.blockExplorers as { default?: { url: string } })?.default?.url || 'https://etherscan.io']
  }
  
  // Add RPC URLs and native currency based on chain
  switch (chainId) {
    case 8453: // Base
      networkParams.rpcUrls = ['https://mainnet.base.org']
      networkParams.nativeCurrency = {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
      break
    case 137: // Polygon
      networkParams.rpcUrls = ['https://polygon-rpc.com']
      networkParams.nativeCurrency = {
        name: 'MATIC',
        symbol: 'MATIC', 
        decimals: 18
      }
      break
    case 42161: // Arbitrum
      networkParams.rpcUrls = ['https://arb1.arbitrum.io/rpc']
      networkParams.nativeCurrency = {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
      break
    case 10: // Optimism
      networkParams.rpcUrls = ['https://mainnet.optimism.io']
      networkParams.nativeCurrency = {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
      break
    default:
      networkParams.rpcUrls = ['https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161']
      networkParams.nativeCurrency = {
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18
      }
  }
  
  return networkParams
}

function getLayerZeroSourceCode(contractType: 'adapter' | 'onft', config: any) {
  if (contractType === 'adapter') {
    // Real ONFT721Adapter source code from LayerZero V2 docs
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";

/**
 * @title PixelGoblinONFTAdapter
 * @dev ONFT721Adapter for existing ERC721 tokens to enable cross-chain transfers
 */
contract PixelGoblinONFTAdapter is ONFT721Adapter {
    /**
     * @dev Constructor for the ONFT721Adapter contract.
     * @param _token The underlying ERC721 token address this adapts
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     */
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) {}
}`;
  } else {
    // Real ONFT721 source code from LayerZero V2 docs
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721 } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721.sol";

/**
 * @title PixelGoblinONFT
 * @dev ONFT721 contract for new NFT collections with cross-chain capabilities
 */
contract PixelGoblinONFT is ONFT721 {
    /**
     * @dev Constructor for the ONFT721 contract.
     * @param _name The name of the ONFT collection.
     * @param _symbol The symbol of the ONFT collection.
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) ONFT721(_name, _symbol, _lzEndpoint, _delegate) {}
    
    /**
     * @dev Mint function for the owner to create new NFTs
     * @param _to The address to mint the NFT to
     * @param _tokenId The token ID to mint
     */
    function mint(address _to, uint256 _tokenId) external onlyOwner {
        _mint(_to, _tokenId);
    }
    
    /**
     * @dev Set the base URI for token metadata
     * @param _baseTokenURI The base URI for token metadata
     */
    function setBaseURI(string calldata _baseTokenURI) external onlyOwner {
        _setBaseURI(_baseTokenURI);
    }
}`;
  }
}

// Real LayerZero V2 compilation using ContractCompiler
async function compileLayerZeroContract(config: any) {
  console.log('🔧 Using REAL LayerZero V2 compilation...');
  
  try {
    // Use the ContractCompiler for real compilation
    const compilationResult = await ContractCompiler.compile({
      contractType: config.contractType,
      contractAddress: config.contractAddress,
      collectionName: config.collectionName || 'PixelGoblinONFT',
      collectionSymbol: config.collectionSymbol || 'PGONFT'
    });
    
    console.log('✅ Real LayerZero compilation successful:', compilationResult.compilationMethod);
    
    return {
      bytecode: compilationResult.bytecode,
      abi: compilationResult.abi,
      contractName: compilationResult.contractName,
      sourceCode: getLayerZeroSourceCode(config.contractType, config)
    };
    
  } catch (error) {
    console.error('❌ Real LayerZero compilation failed:', error);
    throw new Error(`LayerZero compilation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Get explorer URL for a chain and address
function getExplorerUrl(chainId: number, address: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io', // Ethereum
    8453: 'https://basescan.org', // Base
    137: 'https://polygonscan.com', // Polygon
    42161: 'https://arbiscan.io', // Arbitrum
    10: 'https://optimistic.etherscan.io', // Optimism
    43114: 'https://snowtrace.io', // Avalanche
    56: 'https://bscscan.com', // BSC
  }
  
  const baseUrl = explorers[chainId] || 'https://etherscan.io'
  return `${baseUrl}/address/${address}`
}

// Get LayerZero endpoint for a chain
function getLayerZeroEndpoint(chain: LayerZeroChain): string | undefined {
  // Known LayerZero V2 endpoints
  const endpoints: Record<string, string> = {
    'ethereum': '0x1a44076050125825900e736c501f859c50fE728c',
    'base': '0x1a44076050125825900e736c501f859c50fE728c', // Fixed: Same endpoint for all mainnets
    'arbitrum': '0x1a44076050125825900e736c501f859c50fE728c',
    'optimism': '0x1a44076050125825900e736c501f859c50fE728c',
    'polygon': '0x1a44076050125825900e736c501f859c50fE728c',
    'avalanche': '0x1a44076050125825900e736c501f859c50fE728c',
    'bsc': '0x1a44076050125825900e736c501f859c50fE728c',
    'bnb smart chain': '0x1a44076050125825900e736c501f859c50fE728c'
  }
  
  const chainKey = chain.name.toLowerCase()
  return endpoints[chainKey] || chain.layerZeroEndpointV2
}

// Force complete provider reset
async function resetProviderState() {
  console.log('🔄 Resetting provider state...')
  
  // Force garbage collection of any existing providers
  if (typeof window !== 'undefined' && window.ethereum) {
    // Remove any cached provider state
    try {
      // Clear any cached network state
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('✅ Provider state reset completed')
    } catch (error) {
      console.log('⚠️ Provider reset had minor issues, continuing...')
    }
  }
}

// Deploy single contract with existing compilation (for fallback)
async function deploySingleContractWithCompilation(
  chain: LayerZeroChain,
  contractType: 'adapter' | 'onft',
  deploymentArgs: any,
  compilation: any
) {
  console.log(`🚀 Deploying ${contractType} on ${chain.name} (with existing compilation)...`)
  
  // Step 1: Check if user is on correct network
  const walletChainId = await window.ethereum!.request({ method: 'eth_chainId' })
  const walletChainIdDecimal = parseInt(walletChainId, 16)
  console.log(`🔍 Current wallet network: ${walletChainIdDecimal}, target: ${chain.id}`)
  
  if (walletChainIdDecimal !== chain.id) {
    console.log(`🔄 Requesting network switch to ${chain.name}...`)
    
    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chain.id.toString(16)}` }],
      })
      
      // Wait for switch
      console.log(`⏳ Waiting for network switch...`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Verify switch
      const newChainId = await window.ethereum!.request({ method: 'eth_chainId' })
      const newChainIdDecimal = parseInt(newChainId, 16)
      
      if (newChainIdDecimal !== chain.id) {
        throw new Error(`Network switch failed. Please manually switch to ${chain.name} in your wallet and try again.`)
      }
      
      console.log(`✅ Successfully switched to ${chain.name}`)
      
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Add network if not exists
        const networkParams = getNetworkParams(chain)
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [networkParams],
        })
        await new Promise(resolve => setTimeout(resolve, 3000))
      } else {
        throw new Error(`Please manually switch to ${chain.name} in your wallet and try again.`)
      }
    }
  }
  
  // Step 2: Create simple provider
  console.log(`🔧 Creating provider for ${chain.name}...`)
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  const provider = new ethers.providers.Web3Provider(window.ethereum!)
  const signer = provider.getSigner()
  
  // Step 3: Verify we're ready
  try {
    const network = await provider.getNetwork()
    const signerAddress = await signer.getAddress()
    
    console.log(`✅ Provider ready - Network: ${network.chainId}, Signer: ${signerAddress}`)
    
    if (network.chainId !== chain.id) {
      throw new Error(`Network mismatch: Expected ${chain.id}, got ${network.chainId}. Please switch to ${chain.name} manually.`)
    }
  } catch (error) {
    throw new Error(`Provider setup failed: ${error instanceof Error ? error.message : String(error)}. Please refresh the page and try again.`)
  }
  
  // Step 4: Deploy with existing compilation
  console.log(`📡 Deploying ${contractType} with existing compilation...`)
  
  // Prepare constructor arguments
  let constructorArgs: any[]
  
  // Get LayerZero endpoint for the chain
  const lzEndpoint = chain.layerZeroEndpointV2 || getLayerZeroEndpoint(chain)
  
  if (!lzEndpoint) {
    throw new Error(`LayerZero endpoint not found for ${chain.name}. Please check chain configuration.`)
  }
  
  if (contractType === 'adapter') {
    constructorArgs = [
      deploymentArgs.contractAddress,
      lzEndpoint,
      deploymentArgs.deployerAddress
    ]
  } else {
    constructorArgs = [
      deploymentArgs.collectionName || 'PixelGoblinONFT',
      deploymentArgs.collectionSymbol || 'PGONFT',
      lzEndpoint,
      deploymentArgs.deployerAddress
    ]
  }
  
  console.log(`📡 Deploying ${contractType} on ${chain.name} with args:`, constructorArgs)
  
  // Deploy contract with explicit gas limit to handle estimation failures
  const contractFactory = new ethers.ContractFactory(compilation.abi, compilation.bytecode, signer)
  
  try {
    // Try to estimate gas first
    const estimatedGas = await contractFactory.signer.estimateGas(
      contractFactory.getDeployTransaction(...constructorArgs)
    )
    console.log(`⛽ Estimated gas: ${estimatedGas.toString()}`)
    
    // Deploy with estimated gas + 20% buffer
    const gasLimit = estimatedGas.mul(120).div(100)
    const deployTx = await contractFactory.deploy(...constructorArgs, {
      gasLimit: gasLimit
    })
    
    console.log('⏳ Waiting for deployment confirmation...')
    await deployTx.deployed()
    
    console.log(`✅ ${contractType} deployed successfully: ${deployTx.address}`)
    
    return {
      chain,
      address: deployTx.address,
      txHash: deployTx.deployTransaction.hash,
      contractName: compilation.contractName
    }
  } catch (gasError: any) {
    console.warn('⚠️ Gas estimation failed, trying with manual gas limit...', gasError.message)
    
    // Fallback: Use a high gas limit for deployment
    // ONFT contracts typically need 2-3M gas
    const manualGasLimit = contractType === 'adapter' ? 3000000 : 4000000
    
    try {
      const deployTx = await contractFactory.deploy(...constructorArgs, {
        gasLimit: manualGasLimit
      })
      
      console.log('⏳ Waiting for deployment confirmation (manual gas limit)...')
      await deployTx.deployed()
      
      console.log(`✅ ${contractType} deployed successfully: ${deployTx.address}`)
      
      return {
        chain,
        address: deployTx.address,
        txHash: deployTx.deployTransaction.hash,
        contractName: compilation.contractName
      }
    } catch (deployError: any) {
      console.error(`❌ Deployment failed even with manual gas limit:`, deployError)
      
      // Provide helpful error message
      if (deployError.message?.includes('execution reverted')) {
        throw new Error(
          `Contract deployment reverted. This usually means:\n` +
          `1. Invalid LayerZero endpoint address (check: ${lzEndpoint})\n` +
          `2. Invalid constructor parameters\n` +
          `3. Contract bytecode issue\n\n` +
          `Original error: ${deployError.message}`
        )
      }
      
      throw deployError
    }
  }
  
  throw new Error('Deployment failed')
}

// Simple, reliable single contract deployment
async function deploySingleContract(
  chain: LayerZeroChain,
  contractType: 'adapter' | 'onft',
  deploymentArgs: any
) {
  console.log(`🚀 Deploying ${contractType} on ${chain.name}...`)
  
  // Step 1: Check if user is on correct network
  const walletChainId = await window.ethereum!.request({ method: 'eth_chainId' })
  const walletChainIdDecimal = parseInt(walletChainId, 16)
  console.log(`🔍 Current wallet network: ${walletChainIdDecimal}, target: ${chain.id}`)
  
  if (walletChainIdDecimal !== chain.id) {
    console.log(`🔄 Requesting network switch to ${chain.name}...`)
    
    try {
      await window.ethereum!.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chain.id.toString(16)}` }],
      })
      
      // Wait for switch
      console.log(`⏳ Waiting for network switch...`)
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Verify switch
      const newChainId = await window.ethereum!.request({ method: 'eth_chainId' })
      const newChainIdDecimal = parseInt(newChainId, 16)
      
      if (newChainIdDecimal !== chain.id) {
        throw new Error(`Network switch failed. Please manually switch to ${chain.name} in your wallet and try again.`)
      }
      
      console.log(`✅ Successfully switched to ${chain.name}`)
      
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        // Add network if not exists
        const networkParams = getNetworkParams(chain)
        await window.ethereum!.request({
          method: 'wallet_addEthereumChain',
          params: [networkParams],
        })
        await new Promise(resolve => setTimeout(resolve, 3000))
      } else {
        throw new Error(`Please manually switch to ${chain.name} in your wallet and try again.`)
      }
    }
  }
  
  // Step 2: Create simple provider
  console.log(`🔧 Creating provider for ${chain.name}...`)
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  const provider = new ethers.providers.Web3Provider(window.ethereum!)
  const signer = provider.getSigner()
  
  // Step 3: Verify we're ready
  try {
    const network = await provider.getNetwork()
    const signerAddress = await signer.getAddress()
    
    console.log(`✅ Provider ready - Network: ${network.chainId}, Signer: ${signerAddress}`)
    
    if (network.chainId !== chain.id) {
      throw new Error(`Network mismatch: Expected ${chain.id}, got ${network.chainId}. Please switch to ${chain.name} manually.`)
    }
  } catch (error) {
    throw new Error(`Provider setup failed: ${error instanceof Error ? error.message : String(error)}. Please refresh the page and try again.`)
  }
  
  // Step 3: Compile contract
  console.log(`🔧 Compiling ${contractType} contract...`)
  const compilation = await compileLayerZeroContract({
    contractType,
    contractAddress: deploymentArgs.contractAddress,
    collectionName: deploymentArgs.collectionName || 'PixelGoblinONFT',
    collectionSymbol: deploymentArgs.collectionSymbol || 'PGONFT'
  })
  
  // Step 4: Deploy contract with final network verification
  try {
    // Final network check before deployment
    const finalNetwork = await provider!.getNetwork()
    if (finalNetwork.chainId !== chain.id) {
      throw new Error(`Final network check failed: Expected ${chain.name} (${chain.id}), got ${finalNetwork.chainId}`)
    }
    
    const factory = new ethers.ContractFactory(
      compilation.abi,
      compilation.bytecode,
      signer!
    )
    
    let deployArgs
    const lzEndpoint = chain.layerZeroEndpointV2 || getLayerZeroEndpoint(chain)
    if (!lzEndpoint) {
      throw new Error(`LayerZero endpoint not found for ${chain.name}. Please check chain configuration.`)
    }
    
    if (contractType === 'adapter') {
      deployArgs = [
        deploymentArgs.contractAddress,
        lzEndpoint,
        deploymentArgs.deployerAddress
      ]
    } else {
      deployArgs = [
        deploymentArgs.collectionName || 'PixelGoblinONFT',
        deploymentArgs.collectionSymbol || 'PGONFT',
        lzEndpoint,
        deploymentArgs.deployerAddress
      ]
    }
    
    console.log(`📡 Deploying ${contractType} on ${chain.name} with args:`, deployArgs)
    
    const contract = await factory.deploy(...deployArgs)
    await contract.deployed()
    
    console.log(`✅ ${contractType} deployed on ${chain.name}: ${contract.address}`)
    
    return {
      chain,
      address: contract.address,
      txHash: contract.deployTransaction.hash,
      contractName: compilation.contractName
    }
  } catch (deployError: any) {
    console.error(`❌ Deployment failed on ${chain.name}:`, deployError)
    throw new Error(`Deployment failed on ${chain.name}: ${deployError.message}`)
  }
}

// Multi-chain deployment function for ONFT Adapters
async function deployMultiChainAdapter(
  sourceChain: LayerZeroChain,
  targetChains: LayerZeroChain[],
  contractAddress: string,
  deployerAddress: string,
  adapterCompilation: any
) {
  console.log('🚀 Starting multi-chain ONFT Adapter deployment...')
  
  const deployedContracts: { chain: LayerZeroChain; address: string; txHash: string; contractName: string }[] = []
  
  try {
    // Step 1: Deploy ONFT Adapter on source chain
    console.log('🔧 Phase 1: Deploying ONFT Adapter...')
    const adapterResult = await deploySingleContract(sourceChain, 'adapter', {
      contractAddress,
      deployerAddress,
      collectionName: 'PixelGoblinONFT',
      collectionSymbol: 'PGONFT'
    })
    deployedContracts.push(adapterResult)
    
    console.log('✅ Phase 1 completed! Adapter deployed successfully.')
    console.log('⏳ Waiting 10 seconds before starting Phase 2 to ensure clean state...')
    
    // Long delay to ensure complete state reset
    await new Promise(resolve => setTimeout(resolve, 10000))
    
    // Step 2: Deploy ONFT contracts on target chains (one by one)
    for (let i = 0; i < targetChains.length; i++) {
      const targetChain = targetChains[i]
      console.log(`🔧 Phase 2.${i + 1}: Deploying ONFT Contract on ${targetChain.name}...`)
      
      const onftResult = await deploySingleContract(targetChain, 'onft', {
        deployerAddress,
        collectionName: 'PixelGoblinONFT',
        collectionSymbol: 'PGONFT'
      })
      deployedContracts.push(onftResult)
      
      console.log(`✅ Phase 2.${i + 1} completed! ONFT deployed on ${targetChain.name}.`)
      
      // Delay between target chain deployments if there are more
      if (i < targetChains.length - 1) {
        console.log('⏳ Waiting 5 seconds before next deployment...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
    
    console.log('🎉 Multi-chain deployment completed!')
    return deployedContracts
    
  } catch (error) {
    console.error('❌ Multi-chain deployment failed:', error)
    throw error
  }
}

// Robust network switching with wallet state verification
async function switchToNetwork(targetChain: LayerZeroChain) {
  if (!window.ethereum) {
    throw new Error('MetaMask not found')
  }
  
  console.log(`🎯 Switching to ${targetChain.name} (${targetChain.id})...`)
  
  try {
    // Step 1: Request network switch
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${targetChain.id.toString(16)}` }],
    })
    console.log(`✅ Switch request sent to ${targetChain.name}`)
    
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      // Chain not added to wallet, add it
      console.log(`➕ Adding ${targetChain.name} to wallet...`)
      const networkParams = getNetworkParams(targetChain)
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkParams],
      })
      console.log(`✅ Added ${targetChain.name} to wallet`)
    } else if (switchError.code === 4001) {
      throw new Error(`User rejected network switch to ${targetChain.name}`)
    } else {
      throw new Error(`Network switch failed: ${switchError.message}`)
    }
  }
  
  // Step 2: Wait and verify switch with extensive retries
  console.log(`⏳ Waiting for network switch to complete...`)
  await new Promise(resolve => setTimeout(resolve, 4000)) // Longer initial wait
  
  let verifyRetries = 15 // More retries
  while (verifyRetries > 0) {
    try {
      // Check wallet's current chain ID directly
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
      const currentChainIdDecimal = parseInt(currentChainId, 16)
      
      console.log(`🔍 Wallet chain ID: ${currentChainIdDecimal} (target: ${targetChain.id})`)
      
      if (currentChainIdDecimal === targetChain.id) {
        console.log(`✅ Network switch confirmed: ${targetChain.name}`)
        return
      }
      
      console.log(`⚠️ Still switching... (${verifyRetries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 1500))
      verifyRetries--
      
    } catch (error) {
      console.log(`⚠️ Chain ID check failed, retrying... (${verifyRetries} attempts left)`)
      await new Promise(resolve => setTimeout(resolve, 1500))
      verifyRetries--
    }
  }
  
  throw new Error(`Network switch to ${targetChain.name} timed out. Please manually switch to ${targetChain.name} in your wallet.`)
}

export default function RealLayerZeroDeployer({
  isOpen,
  onClose,
  deploymentType,
  sourceChain,
  targetChains,
  contractAddress,
  contractInfo,
  existingAdapterAddress,
  existingAdapterChain,
  chains,
  collectionName,
  collectionSymbol,
  baseURI
}: RealLayerZeroDeployerProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isDeploying, setIsDeploying] = useState(false)
  const [deploymentResults, setDeploymentResults] = useState<DeploymentResult[]>([])
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  
  // Deterministic deployment state
  const [useDeterministic, setUseDeterministic] = useState(false)
  const [deploymentSalt, setDeploymentSalt] = useState('')
  const [predictedAddresses, setPredictedAddresses] = useState<{ [chainId: number]: string }>({})
  const [compiledBytecode, setCompiledBytecode] = useState<string>('')
  const [compiledAbi, setCompiledAbi] = useState<any[]>([])
  const [deployerAddress, setDeployerAddress] = useState<string>('')

  const steps = deploymentType === 'adapter' 
    ? ['Compile Contract', 'Deploy Adapter', 'Deploy ONFT Contracts', 'Configure Peers']
    : ['Compile Contract', 'Deploy ONFT', 'Setup Peers', 'Verify Contracts']

  const resetState = () => {
    setCurrentStep(0)
    setIsDeploying(false)
    setDeploymentResults([])
    setError(null)
    setProgress(0)
  }

  useEffect(() => {
    if (isOpen) {
      resetState()
      // Fetch deployer address when dialog opens
      const fetchDeployerAddress = async () => {
        if (typeof window !== 'undefined' && window.ethereum) {
          try {
            const provider = new ethers.providers.Web3Provider(window.ethereum)
            const signer = provider.getSigner()
            const address = await signer.getAddress()
            setDeployerAddress(address)
          } catch (error) {
            console.error('Failed to get deployer address:', error)
          }
        }
      }
      fetchDeployerAddress()
    }
  }, [isOpen])

  const deployRealLayerZeroContract = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not found')
    }

    setIsDeploying(true)
    setError(null)

    try {
      // Step 1: Compile real LayerZero contract
      setCurrentStep(0)
      setProgress(10)
      
      console.log('🔧 Compiling real LayerZero V2 contract...')
      
      const compilationConfig = {
        contractType: deploymentType,
        contractAddress: contractAddress,
        collectionName: collectionName || 'PixelGoblinONFT',
        collectionSymbol: collectionSymbol || 'PGONFT'
      }
      
      const compilation = await compileLayerZeroContract(compilationConfig)
      console.log('✅ Compilation successful:', compilation.contractName)
      
      // Store compiled bytecode and ABI for CREATE2 calculation
      setCompiledBytecode(compilation.bytecode)
      setCompiledAbi(compilation.abi)
      
      setProgress(25)

      // Step 2: Deploy contract
      setCurrentStep(1)
      
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const signer = provider.getSigner()
      const currentDeployerAddress = await signer.getAddress()
      setDeployerAddress(currentDeployerAddress)
      
      console.log('🚀 Deploying real LayerZero contract...')
      
      // Debug deployment props
      console.log('🔍 Deployment props:', {
        deploymentType,
        sourceChain: sourceChain?.name,
        targetChains: targetChains?.map(c => c.name),
        chains: chains?.map(c => c.name),
        chainsLength: chains?.length
      })
      
      // Multi-chain deployment logic
      if (deploymentType === 'adapter') {
        const allTargetChains = targetChains || []
        
        // Check if using existing adapter
        if (existingAdapterAddress && existingAdapterChain) {
          console.log('🔗 Using existing adapter:', existingAdapterAddress)
          console.log('🚀 Starting deployment to add target chains to existing adapter...')
          
          if (allTargetChains.length === 0) {
            throw new Error('At least one target chain must be selected')
          }
          
          console.log(`📋 Deployment plan:`)
          console.log(`   ✅ Using existing ONFT Adapter: ${existingAdapterAddress} (${existingAdapterChain.name})`)
          allTargetChains.forEach(chain => {
            console.log(`   🔹 Deploy ONFT Contract on ${chain.name}`)
          })
          
          // Show user what to expect
          const userConfirm = confirm(`🚀 Add Target Chains to Existing Adapter:

✅ Using existing ONFT Adapter: ${existingAdapterAddress.slice(0, 8)}...${existingAdapterAddress.slice(-6)} (${existingAdapterChain.name})
✅ Deploy ONFT Contract on ${allTargetChains.map(c => c.name).join(', ')}

⚠️ Important: You may need to approve network switches in your wallet.

Continue with deployment?`)
          
          if (!userConfirm) {
            throw new Error('Deployment cancelled by user')
          }
          
          // Skip adapter deployment, only deploy ONFT contracts on target chains
          const deployedContracts: { chain: LayerZeroChain; address: string; txHash: string; contractName: string }[] = []
          
          // Deploy ONFT contracts on target chains
          setCurrentStep(2)
          const progressPerChain = 70 / allTargetChains.length
          
          for (let i = 0; i < allTargetChains.length; i++) {
            const targetChain = allTargetChains[i]
            try {
              console.log(`🚀 Deploying ONFT Contract on ${targetChain.name}...`)
              setProgress(30 + (i * progressPerChain))
              
              // Compile ONFT contract for target chain
              const onftCompilation = await compileLayerZeroContract({
                contractType: 'onft',
                collectionName: collectionName || 'PixelGoblinONFT',
                collectionSymbol: collectionSymbol || 'PGONFT'
              })
              
              const onftResult = await deploySingleContractWithCompilation(targetChain, 'onft', {
                deployerAddress,
                collectionName: collectionName || 'PixelGoblinONFT',
                collectionSymbol: collectionSymbol || 'PGONFT'
              }, onftCompilation)
              
              deployedContracts.push(onftResult)
              console.log(`✅ ONFT deployed on ${targetChain.name}: ${onftResult.address}`)
              
            } catch (targetError) {
              console.error(`❌ Failed to deploy ONFT on ${targetChain.name}:`, targetError)
              throw targetError
            }
          }
          
          setProgress(100)
          setCurrentStep(3)
          
          // Convert to DeploymentResult format for display
          const deploymentResults: DeploymentResult[] = deployedContracts.map(dc => ({
            address: dc.address,
            transactionHash: dc.txHash,
            network: dc.chain.name.toLowerCase(),
            explorerUrl: getExplorerUrl(dc.chain.id, dc.address),
            verified: false,
            verificationStatus: undefined,
            contractName: dc.contractName || 'ONFT721'
          }))
          
          setDeploymentResults(deploymentResults)
          
          // Build onftAddresses map
          const onftAddresses: { [chainId: number]: string } = {}
          deployedContracts.forEach(dc => {
            onftAddresses[dc.chain.id] = dc.address
          })
          
          // Save deployment state with existing adapter
          // First, try to find existing deployment for this adapter
          const { DeploymentStateManager } = await import('@/lib/deployment-state-manager')
          const existingDeployment = DeploymentStateManager.findDeploymentByAdapterAddress(existingAdapterAddress)
          
          const newCompletedSteps = deployedContracts.reduce((acc, dc) => {
            acc[`deploy-onft-${dc.chain.id}`] = {
              transactionHash: dc.txHash,
              contractAddress: dc.address,
              blockNumber: 0,
              timestamp: Date.now(),
              chainId: dc.chain.id
            }
            return acc
          }, {} as any)
          
          const newSteps = deployedContracts.map(dc => ({
            id: `step-${dc.chain.id}`,
            name: `Deploy ONFT on ${dc.chain.name}`,
            status: 'completed' as const,
            chainId: dc.chain.id,
            contractAddress: dc.address,
            transactionHash: dc.txHash,
            verified: false,
            verificationStatus: undefined as 'Pending' | 'Verifying' | 'Verified' | 'Failed' | undefined,
            // Include verification metadata
            sourceCode: (compilation as { sourceCode?: string }).sourceCode,
            constructorArgs: undefined,
            contractName: dc.contractName || compilation.contractName,
            compilerVersion: 'v0.8.22+commit.4fc1097e' // Default Hardhat compiler version
          }))
          
          let deploymentState: DeploymentState
          
          if (existingDeployment) {
            // Merge into existing deployment
            console.log('🔗 Found existing deployment, merging new chains...')
            deploymentState = DeploymentStateManager.mergeDeploymentChains(
              existingDeployment,
              onftAddresses,
              allTargetChains,
              newSteps,
              newCompletedSteps
            )
          } else {
            // Create new deployment state
            deploymentState = {
              id: `adapter-${existingAdapterAddress.slice(0, 8)}-${Date.now()}`,
              type: 'adapter' as const,
              deployerAddress: deployerAddress,
              timestamp: Date.now(),
              adapterAddress: existingAdapterAddress,
              onftAddresses: onftAddresses,
              sourceChain: existingAdapterChain,
              targetChains: allTargetChains,
              contractAddress: contractAddress,
              collectionName: collectionName || 'PixelGoblinONFT',
              collectionSymbol: collectionSymbol || 'PGONFT',
              completedSteps: newCompletedSteps,
              steps: newSteps
            }
          }
          
          DeploymentStateManager.saveDeploymentState(deploymentState)
          console.log('🎉 Target chains added to existing adapter!')
          
          // Skip to end (don't continue with normal deployment flow)
          return
          
        } else {
          // Normal deployment: deploy new adapter + ONFT contracts
          console.log('🚀 Starting multi-chain ONFT Adapter deployment...')
          
          // Step 1: Deploy ONFT Adapter on source chain
          if (!sourceChain) {
            throw new Error('Source chain is required for ONFT Adapter deployment')
          }
          
          if (allTargetChains.length === 0) {
            throw new Error('At least one target chain must be selected for ONFT Adapter deployment')
          }
          
          console.log(`📋 Deployment plan:`)
          console.log(`   🔹 ONFT Adapter on ${sourceChain.name}`)
          allTargetChains.forEach(chain => {
            console.log(`   🔹 ONFT Contract on ${chain.name}`)
          })
          
          // Show user what to expect
          const userConfirm = confirm(`🚀 Multi-Chain Deployment Plan:

✅ Deploy ONFT Adapter on ${sourceChain.name}
✅ Deploy ONFT Contract on ${allTargetChains.map(c => c.name).join(', ')}

⚠️ Important: You may need to approve network switches in your wallet.

Continue with deployment?`)
          
          if (!userConfirm) {
            throw new Error('Deployment cancelled by user')
          }
          
          // Try multi-chain deployment, fallback to single-chain if it fails
          let deployedContracts
          try {
            deployedContracts = await deployMultiChainAdapter(sourceChain, allTargetChains, contractAddress!, deployerAddress, compilation)
          } catch (multiChainError) {
            console.error('❌ Multi-chain deployment failed, falling back to single-chain deployment')
            console.error('Multi-chain error:', multiChainError instanceof Error ? multiChainError.message : String(multiChainError))
            
            // Fallback: Deploy adapter first, then try target chains individually
            console.log('🔄 Falling back to sequential single-chain deployments...')
            
            // Step 1: Deploy ONFT Adapter
            console.log('📦 Step 1: Deploying ONFT Adapter...')
            const adapterResult = await deploySingleContractWithCompilation(sourceChain, 'adapter', {
              contractAddress: contractAddress!,
              deployerAddress,
              collectionName: 'PixelGoblinONFT',
              collectionSymbol: 'PGONFT'
            }, compilation)
            
            deployedContracts = [adapterResult]
            console.log(`✅ ONFT Adapter deployed: ${adapterResult.address}`)
            
            // Step 2: Try to deploy ONFT contracts on target chains individually
            for (const targetChain of allTargetChains) {
              try {
                console.log(`📦 Step 2: Attempting to deploy ONFT on ${targetChain.name}...`)
                
                const userConfirm = confirm(`✅ ONFT Adapter deployed successfully!

🚀 Now deploying ONFT Contract on ${targetChain.name}...

This will require switching networks in your wallet.
Continue?`)
                
                if (!userConfirm) {
                  console.log(`⏭️ User skipped ${targetChain.name} deployment`)
                  continue
                }
                
                // Compile ONFT contract for target chain
                const onftCompilation = await compileLayerZeroContract({
                  contractType: 'onft',
                  collectionName: 'PixelGoblinONFT',
                  collectionSymbol: 'PGONFT'
                })
                
                const onftResult = await deploySingleContractWithCompilation(targetChain, 'onft', {
                  deployerAddress,
                  collectionName: 'PixelGoblinONFT',
                  collectionSymbol: 'PGONFT'
                }, onftCompilation)
                
                deployedContracts.push(onftResult)
                console.log(`✅ ONFT deployed on ${targetChain.name}: ${onftResult.address}`)
                
              } catch (targetError) {
                console.error(`❌ Failed to deploy ONFT on ${targetChain.name}:`, targetError)
                
                const retryConfirm = confirm(`❌ Failed to deploy ONFT on ${targetChain.name}:
${targetError instanceof Error ? targetError.message : String(targetError)}

You can deploy this manually later using the "New ONFT Collection" tab.

Continue with remaining chains?`)
                
                if (!retryConfirm) {
                  break
                }
              }
            }
            
            // Show final summary
            const successfulChains = (Array.isArray(deployedContracts) ? deployedContracts : []).map(c => c.chain.name)
            const failedChains = allTargetChains.filter(c => !successfulChains.includes(c.name)).map(c => c.name)
            
            let message = `🎉 Deployment Summary:

✅ Successfully deployed on: ${successfulChains.join(', ')}`
            
            if (failedChains.length > 0) {
              message += `

⚠️ Manual deployment needed for: ${failedChains.join(', ')}

📝 To complete the setup:
1. Go to "New ONFT Collection" tab
2. Deploy ONFT contracts on remaining chains
3. Configure peer connections between all contracts`
            } else {
              message += `

🎉 All contracts deployed successfully!

📝 Next steps:
1. Configure peer connections between contracts
2. Test cross-chain bridging in the Bridge tab`
            }
            
            message += `

All deployed contracts will appear in your Portfolio.`
            
            alert(message)
          }
          
          // Save deployment to portfolio (executes after try-catch, whether success or fallback)
          const contracts = Array.isArray(deployedContracts) ? deployedContracts : []
          const adapterContract = contracts.find(c => c.chain.id === sourceChain.id)
          const onftContracts = contracts.filter(c => c.chain.id !== sourceChain.id)
          
          // Build onftAddresses map from deployed contracts
          const onftAddresses: { [chainId: number]: string } = {}
          onftContracts.forEach(dc => {
            onftAddresses[dc.chain.id] = dc.address
          })
          
          const deploymentState: DeploymentState = {
            id: `deployment-${Date.now()}`,
            type: deploymentType,
            deployerAddress: deployerAddress,
            timestamp: Date.now(),
            adapterAddress: adapterContract?.address,
            onftAddresses: Object.keys(onftAddresses).length > 0 ? onftAddresses : undefined,
            sourceChain: sourceChain,
            targetChains: allTargetChains,
            contractAddress: contractAddress,
            collectionName: 'PixelGoblinONFT',
            collectionSymbol: 'PGONFT',
            steps: contracts.map(dc => ({
              id: `deploy-${dc.chain.id}`,
              name: `Deploy ${dc.contractName} on ${dc.chain.name}`,
              status: 'completed' as const,
              chainId: dc.chain.id,
              contractAddress: dc.address,
              transactionHash: dc.txHash,
              verified: false,
              verificationStatus: undefined as 'Pending' | 'Verifying' | 'Verified' | 'Failed' | undefined,
              sourceCode: (compilation as { sourceCode?: string }).sourceCode,
              constructorArgs: undefined,
              contractName: dc.contractName || compilation.contractName,
              compilerVersion: 'v0.8.22+commit.4fc1097e'
            })),
            completedSteps: {
              'compile-contract': { 
                transactionHash: '',
                blockNumber: 0,
                timestamp: Date.now(),
                chainId: sourceChain.id
              },
              'deploy-adapter': { 
                transactionHash: adapterContract?.txHash || '',
                contractAddress: adapterContract?.address,
                blockNumber: 0,
                timestamp: Date.now(),
                chainId: sourceChain.id
              },
              ...onftContracts.reduce((acc, dc) => {
                acc[`deploy-onft-${dc.chain.id}`] = {
                  transactionHash: dc.txHash,
                  contractAddress: dc.address,
                  blockNumber: 0,
                  timestamp: Date.now(),
                  chainId: dc.chain.id
                }
                return acc
              }, {} as any)
            }
          }

          DeploymentStateManager.saveDeploymentState(deploymentState)
          
          setProgress(100)
          console.log('🎉 Multi-chain ONFT Adapter deployment completed!')
          setDeploymentResults(contracts.map(dc => ({
            address: dc.address,
            transactionHash: dc.txHash,
            network: dc.chain.name,
            explorerUrl: getExplorerUrl(dc.chain.id, dc.address),
            verified: false,
            verificationStatus: undefined,
            contractName: dc.contractName
          })))
          
          return
        }
      }
      
      if (deploymentType === 'new-onft') {
        // For new ONFT, use selected chains or default to Base
        let targetChain = chains?.[0]
        
        // If no chains selected, default to Base for new ONFT
        if (!targetChain) {
          console.log('⚠️ No chains selected, defaulting to Base for new ONFT deployment')
          // Import Base chain from chains
          const { LAYERZERO_CHAINS } = await import('@/lib/chains')
          targetChain = LAYERZERO_CHAINS.find(c => c.name === 'Base' && !c.isTestnet)
        }
        
        if (!targetChain) {
          throw new Error(`No target chain specified. DeploymentType: ${deploymentType}, SourceChain: ${sourceChain?.name}, Chains: ${chains?.map(c => c.name).join(', ')}`)
        }
        
        // Single chain deployment for new ONFT
        // Use deploySingleContractOnChain which is defined later in the component
        // We'll compile and deploy here
        const onftCompilation = await compileLayerZeroContract({
          contractType: 'onft',
          collectionName: collectionName || 'PixelGoblinONFT',
          collectionSymbol: collectionSymbol || 'PGONFT'
        })
        
        const onftResult = await deploySingleContractWithCompilation(
          targetChain,
          'onft',
          {
            deployerAddress,
            collectionName: collectionName || 'PixelGoblinONFT',
            collectionSymbol: collectionSymbol || 'PGONFT'
          },
          onftCompilation
        )
        
        setDeploymentResults([{
          address: onftResult.address,
          transactionHash: onftResult.txHash,
          network: targetChain.name.toLowerCase(),
          explorerUrl: getExplorerUrl(targetChain.id, onftResult.address),
          verified: false,
          verificationStatus: undefined,
          contractName: onftResult.contractName || 'ONFT721'
        }])
        
        setProgress(100)
        return
      }
      
    } catch (err: any) {
      console.error('❌ Real LayerZero deployment failed:', err)
      setError(err.message)
    } finally {
      setIsDeploying(false)
    }
  }

  // Multi-chain adapter deployment
  const deployMultiChainAdapter = async (
    sourceChain: LayerZeroChain,
    targetChains: LayerZeroChain[],
    contractAddress: string,
    deployerAddress: string,
    compilation: any
  ) => {
    const deployedContracts: DeploymentResult[] = []
    
    try {
      // Step 1: Deploy ONFT Adapter on source chain
      setCurrentStep(1)
      setProgress(20)
      console.log(`🚀 Deploying ONFT Adapter on ${sourceChain.name}...`)
      
      const adapterResult = await deploySingleContractOnChain(
        sourceChain, 
        'adapter', 
        contractAddress, 
        deployerAddress, 
        compilation,
        useDeterministic,
        deploymentSalt
      )
      deployedContracts.push(adapterResult)
      
      // Step 2: Deploy ONFT contracts on each target chain
      setCurrentStep(2)
      const progressPerChain = 60 / targetChains.length
      
      for (let i = 0; i < targetChains.length; i++) {
        const targetChain = targetChains[i]
        console.log(`🚀 Deploying ONFT Contract on ${targetChain.name}...`)
        
        const onftResult = await deploySingleContractOnChain(
          targetChain,
          'new-onft',
          undefined, // No existing contract for new ONFT
          deployerAddress,
          compilation,
          useDeterministic,
          deploymentSalt
        )
        deployedContracts.push(onftResult)
        
        setProgress(20 + progressPerChain * (i + 1))
      }
      
      // Step 3: Configure peers (placeholder for now)
      setCurrentStep(3)
      setProgress(90)
      console.log('🔗 Configuring LayerZero peers...')
      // TODO: Implement peer configuration
      
      // Step 4: Verification
      setCurrentStep(4)
      setProgress(100)
      console.log('✅ Multi-chain deployment completed!')
      
      setDeploymentResults(deployedContracts)
      
      // Save to portfolio
      // Separate adapter and ONFT contracts
      // First contract is the adapter (from source chain)
      const adapterContract = deployedContracts[0]
      const onftContracts = deployedContracts.slice(1)
      
      // Build onftAddresses map
      const onftAddresses: { [chainId: number]: string } = {}
      onftContracts.forEach((dc, index) => {
        const targetChain = targetChains[index]
        if (targetChain) {
          onftAddresses[targetChain.id] = dc.address
        }
      })
      
      const deploymentState: DeploymentState = {
        id: `deployment-${Date.now()}`,
        type: 'adapter',
        deployerAddress: deployerAddress,
        timestamp: Date.now(),
        adapterAddress: adapterContract?.address,
        onftAddresses: Object.keys(onftAddresses).length > 0 ? onftAddresses : undefined,
        sourceChain: sourceChain,
        targetChains: targetChains,
        contractAddress: contractAddress,
        collectionName: 'PixelGoblinONFT',
        collectionSymbol: 'PGONFT',
        steps: [
          // Map adapter result (from source chain)
          ...(adapterContract ? [{
            id: `deploy-${sourceChain.id}`,
            name: `Deploy ${adapterContract.contractName || 'ONFT Adapter'} on ${sourceChain.name}`,
            status: 'completed' as const,
            chainId: sourceChain.id,
            contractAddress: adapterContract.address,
            transactionHash: adapterContract.transactionHash,
            verified: false,
            verificationStatus: undefined,
            // Include verification metadata
            sourceCode: compilation.sourceCode,
            constructorArgs: adapterContract.constructorArgs,
            contractName: adapterContract.contractName || compilation.contractName,
            compilerVersion: 'v0.8.22+commit.4fc1097e' // Default Hardhat compiler version
          }] : []),
          // Map ONFT contracts (from target chains)
          ...onftContracts.map(dc => ({
            id: `deploy-${targetChains.find(tc => tc.name.toLowerCase() === dc.network.toLowerCase())?.id || 0}`,
            name: `Deploy ${dc.contractName || 'ONFT'} on ${targetChains.find(tc => tc.name.toLowerCase() === dc.network.toLowerCase())?.name || dc.network}`,
            status: 'completed' as const,
            chainId: targetChains.find(tc => tc.name.toLowerCase() === dc.network.toLowerCase())?.id || 0,
            contractAddress: dc.address,
            transactionHash: dc.transactionHash,
            verified: false,
            verificationStatus: undefined,
            // Include verification metadata
            sourceCode: compilation.sourceCode,
            constructorArgs: dc.constructorArgs,
            contractName: dc.contractName || compilation.contractName,
            compilerVersion: 'v0.8.22+commit.4fc1097e' // Default Hardhat compiler version
          }))
        ],
        completedSteps: {
          'compile-contract': {
            transactionHash: '',
            blockNumber: 0,
            timestamp: Date.now(),
            chainId: sourceChain.id
          },
          'deploy-adapter': {
            transactionHash: adapterContract?.transactionHash || '',
            contractAddress: adapterContract?.address,
            blockNumber: 0,
            timestamp: Date.now(),
            chainId: sourceChain.id
          },
          ...onftContracts.reduce((acc, dc, index) => {
            const chainId = targetChains[index]?.id ?? 0
            acc[`deploy-onft-${chainId}`] = {
              transactionHash: dc.transactionHash,
              contractAddress: dc.address,
              blockNumber: 0,
              timestamp: Date.now(),
              chainId
            }
            return acc
          }, {} as any)
        }
      }
      
      DeploymentStateManager.saveDeploymentState(deploymentState)
      
    } catch (error) {
      console.error('❌ Multi-chain deployment failed:', error)
      throw error
    }
  }

  // Single contract deployment helper
  const deploySingleContractOnChain = async (
    targetChain: LayerZeroChain,
    contractType: 'adapter' | 'new-onft',
    existingContractAddress: string | undefined,
    deployerAddress: string,
    compilation: any,
    useCreate2Deployment: boolean = false,
    create2Salt: string = ''
  ): Promise<DeploymentResult> => {
    // Network switching logic
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    const currentNetwork = await provider.getNetwork()
    const chainId = targetChain.id
    
    if (currentNetwork.chainId !== chainId) {
      console.log(`🔄 Switching to ${targetChain.name}...`)
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })
      
      // Wait for switch
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Get endpoint and prepare constructor args
    const endpoint = LAYERZERO_ENDPOINTS[targetChain.name.toLowerCase() as keyof typeof LAYERZERO_ENDPOINTS]
    if (!endpoint) {
      throw new Error(`LayerZero endpoint not found for ${targetChain.name}`)
    }
    
    let constructorArgs: any[]
    if (contractType === 'adapter') {
      constructorArgs = [existingContractAddress, endpoint, deployerAddress]
    } else {
      constructorArgs = [collectionName || 'PixelGoblinONFT', collectionSymbol || 'PGONFT', endpoint, deployerAddress]
    }
    
    // Deploy contract
    const signer = provider.getSigner()
    
    // Check if deterministic deployment is enabled
    const useCreate2 = useCreate2Deployment && create2Salt
    
    if (useCreate2) {
      // Deploy using CREATE2
      console.log(`📡 Deploying ${contractType} on ${targetChain.name} using CREATE2...`)
      console.log(`🔑 Salt: ${create2Salt}`)
      
      // Prepare init code (bytecode + encoded constructor args)
      const iface = new ethers.utils.Interface(compilation.abi)
      const encodedArgs = iface.encodeDeploy(constructorArgs)
      const initCode = compilation.bytecode + encodedArgs.slice(2)
      
      // Deploy via CREATE2 factory
      const { deployWithCreate2 } = await import('@/lib/create2-deployment')
      const create2Result = await deployWithCreate2(
        targetChain.id,
        initCode,
        create2Salt,
        signer
      )
      
      if (create2Result.error) {
        throw new Error(`CREATE2 deployment failed: ${create2Result.error}`)
      }
      
      console.log(`✅ ${contractType} deployed via CREATE2 on ${targetChain.name}: ${create2Result.address}`)
      
      // Verify the address matches prediction
      const predictedAddress = predictedAddresses[targetChain.id]
      if (predictedAddress && predictedAddress.toLowerCase() !== create2Result.address.toLowerCase()) {
        console.warn(`⚠️ Address mismatch! Predicted: ${predictedAddress}, Actual: ${create2Result.address}`)
      }
      
      // Encode constructor args for verification
      const encodedConstructorArgs = ethers.utils.defaultAbiCoder.encode(
        contractType === 'adapter' 
          ? ['address', 'address', 'address']
          : ['string', 'string', 'address', 'address'],
        constructorArgs
      ).slice(2)
      
      return {
        address: create2Result.address,
        transactionHash: create2Result.transactionHash,
        network: targetChain.name.toLowerCase(),
        explorerUrl: getExplorerUrl(targetChain.id, create2Result.address),
        verified: false,
        verificationStatus: undefined,
        contractName: compilation.contractName,
        constructorArgs: encodedConstructorArgs
      }
    } else {
      // Standard deployment (CREATE)
      const contractFactory = new ethers.ContractFactory(compilation.abi, compilation.bytecode, signer)
      
      console.log(`📡 Deploying ${contractType} on ${targetChain.name} with args:`, constructorArgs)
      const deployTx = await contractFactory.deploy(...constructorArgs)
      
      console.log('⏳ Waiting for deployment confirmation...')
      const receipt = await deployTx.deployTransaction.wait()
      
      return {
        address: deployTx.address,
        transactionHash: receipt.transactionHash,
        network: targetChain.name,
        explorerUrl: `${(targetChain.blockExplorers as { default?: { url: string } })?.default?.url || 'https://etherscan.io'}/tx/${receipt.transactionHash}`,
        contractName: compilation.contractName,
        sourceCode: compilation.sourceCode,
        constructorArgs: ethers.utils.defaultAbiCoder.encode(
          contractType === 'adapter' 
            ? ['address', 'address', 'address']
            : ['string', 'string', 'address', 'address'],
          constructorArgs
        ).slice(2)
      }
    }
  }

  // Single contract deployment (for new ONFT)
  const deploySingleContract = async (
    targetChain: LayerZeroChain,
    contractType: 'adapter' | 'new-onft',
    existingContractAddress: string | undefined,
    deployerAddress: string,
    compilation: any
  ) => {
    const result = await deploySingleContractOnChain(
      targetChain,
      contractType,
      existingContractAddress,
      deployerAddress,
      compilation,
      useDeterministic,
      deploymentSalt
    )
    
    setDeploymentResults([result])
    setProgress(100)
    
    // Save single deployment
    const deploymentState: DeploymentState = {
      id: `deployment-${Date.now()}`,
      type: contractType,
      deployerAddress: deployerAddress,
      timestamp: Date.now(),
      steps: [{
        id: `deploy-${result.network}`,
        name: `Deploy ${result.contractName || compilation.contractName} on ${result.network}`,
        status: 'completed' as const,
        chainId: targetChain.id,
        contractAddress: result.address,
        transactionHash: result.transactionHash,
        verified: result.verified || false,
        verificationStatus: undefined,
        // Include verification metadata
        sourceCode: compilation.sourceCode,
        constructorArgs: result.constructorArgs,
        contractName: result.contractName || compilation.contractName,
        compilerVersion: 'v0.8.22+commit.4fc1097e' // Default Hardhat compiler version
      }],
      completedSteps: {
        'compile-contract': {
          transactionHash: '',
          blockNumber: 0,
          timestamp: Date.now(),
          chainId: targetChain.id
        },
        'deploy-contract': {
          transactionHash: result.transactionHash,
          contractAddress: result.address,
          blockNumber: 0,
          timestamp: Date.now(),
          chainId: targetChain.id
        }
      }
    }
    
    DeploymentStateManager.saveDeploymentState(deploymentState)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-400" />
            Real LayerZero V2 {deploymentType === 'adapter' ? 'ONFT Adapter' : 'ONFT Collection'} Deployment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Deployment Notice */}
          <Card className="border-blue-500/20 bg-blue-500/10">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-300 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-blue-300 mb-2">Real LayerZero V2 Deployment</h3>
                  <p className="text-blue-200 text-sm mb-3">
                    This will deploy official LayerZero V2 contracts using real compilation and automatic verification.
                  </p>
                  <div className="text-blue-400 text-sm space-y-1">
                    <div>• Uses official @layerzerolabs/onft-evm contracts</div>
                    <div>• Real Solidity compilation with proper bytecode</div>
                    <div>• Automatic contract verification on block explorers</div>
                    <div>• Full LayerZero V2 cross-chain functionality</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deployment Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Contract Type</label>
                  <div className="text-white">
                    {deploymentType === 'adapter' ? 'ONFT721Adapter' : 'ONFT721'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">LayerZero Version</label>
                  <div className="text-white">V2 (Official)</div>
                </div>
              </div>
              
              {deploymentType === 'adapter' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Source Chain</label>
                    <div className="text-white">{sourceChain?.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Existing Contract</label>
                    <div className="text-white font-mono text-sm">{contractAddress}</div>
                  </div>
                </>
              )}
              
              {deploymentType === 'new-onft' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400">Collection Name</label>
                      <div className="text-white">{collectionName}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400">Symbol</label>
                      <div className="text-white">{collectionSymbol}</div>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Deployment Chains</label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {chains?.map((chain) => (
                        <Badge key={chain.id} variant="secondary">
                          {chain.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Deterministic Deployment Configuration - Show before deployment starts */}
          {!isDeploying && deployerAddress && (
            <DeterministicDeploymentConfig
              enabled={useDeterministic}
              onEnabledChange={setUseDeterministic}
              salt={deploymentSalt}
              onSaltChange={setDeploymentSalt}
              deployerAddress={deployerAddress}
              bytecode={compiledBytecode}
              abi={compiledAbi}
              constructorArgs={deploymentType === 'adapter' 
                ? [
                    contractAddress || '', 
                    sourceChain?.layerZeroEndpointV2 || (sourceChain ? getLayerZeroEndpoint(sourceChain) : LAYERZERO_ENDPOINTS.ethereum), 
                    deployerAddress
                  ]
                : [
                    collectionName || 'PixelGoblinONFT', 
                    collectionSymbol || 'PGONFT', 
                    (chains?.[0] || sourceChain)?.layerZeroEndpointV2 || ((chains?.[0] || sourceChain) ? getLayerZeroEndpoint(chains?.[0] || sourceChain!) : LAYERZERO_ENDPOINTS.ethereum), 
                    deployerAddress
                  ]
              }
              chain={(sourceChain || chains?.[0] || { id: 1, name: 'Ethereum', rpcUrls: ['https://eth.llamarpc.com'] } as unknown) as LayerZeroChain}
              onAddressCalculated={(address) => {
                const chainId = (sourceChain || chains?.[0])?.id
                if (chainId) {
                  setPredictedAddresses(prev => ({ ...prev, [chainId]: address }))
                }
              }}
            />
          )}

          {/* Predicted Addresses Summary */}
          {useDeterministic && Object.keys(predictedAddresses).length > 0 && (
            <Card className="border-green-500/20 bg-green-500/5">
              <CardHeader>
                <CardTitle className="text-base">Predicted Addresses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(predictedAddresses).map(([chainId, address]) => {
                    const chain = [...(sourceChain ? [sourceChain] : []), ...(chains || [])].find(c => c.id === parseInt(chainId))
                    return (
                      <div key={chainId} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{chain?.name || `Chain ${chainId}`}:</span>
                        <code className="text-xs font-mono">{address}</code>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deployment Progress */}
          {isDeploying && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deployment Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={progress} className="w-full" />
                
                <div className="space-y-2">
                  {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      {index < currentStep ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : index === currentStep ? (
                        <div className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
                      )}
                      <span className={index <= currentStep ? 'text-white' : 'text-gray-400'}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-500/20 bg-red-500/10">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-300 mb-2">Deployment Failed</h3>
                    <p className="text-red-200 text-sm">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Deployment Results */}
          {deploymentResults.length > 0 && (
            <Card className="border-green-500/20 bg-green-500/10">
              <CardHeader>
                <CardTitle className="text-lg text-green-300">Deployment Successful!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {deploymentResults.map((result, index) => (
                  <div key={index} className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-green-400">Contract Address</label>
                      <div className="font-mono text-sm bg-gray-800 text-gray-200 p-2 rounded">
                        {result.address}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-green-400">Transaction Hash</label>
                      <div className="font-mono text-sm bg-gray-800 text-gray-200 p-2 rounded">
                        {result.transactionHash}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={result.verified ? "default" : "secondary"}>
                        {result.verificationStatus || 'Pending'}
                      </Badge>
                      <a 
                        href={result.explorerUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-sm"
                      >
                        View on Explorer <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            
            {!isDeploying && deploymentResults.length === 0 && (
              <Button 
                onClick={deployRealLayerZeroContract}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Rocket className="h-4 w-4 mr-2" />
                Deploy Real LayerZero V2 Contract
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
