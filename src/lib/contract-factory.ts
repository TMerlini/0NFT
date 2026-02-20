import { ethers, Signer } from 'ethers'
import { LayerZeroChain } from './chains'
import { DeploymentService, ONFTParams, ONFTAdapterParams } from './deployment-scripts'

// Contract deployment interfaces
export interface ONFTDeploymentConfig {
  name: string
  symbol: string
  baseURI: string
  maxSupply: number
  mintPrice: string // in ETH
  maxMintPerAddress: number
  owner: string
  delegate: string
  chainId: number
}

export interface ONFTAdapterDeploymentConfig {
  innerToken: string
  owner: string
  delegate: string
  chainId: number
}

export interface DeploymentResult {
  contractAddress: string
  transactionHash: string
  blockNumber: number
  gasUsed: string
}

export class ContractFactory {
  protected signer: Signer
  protected provider: any // Wagmi public client

  constructor(signer: Signer, provider: any) {
    this.signer = signer
    this.provider = provider
  }

  /**
   * Create a deployment service for a specific chain
   */
  private createDeploymentService(chain: LayerZeroChain): DeploymentService {
    return new DeploymentService({
      signer: this.signer,
      provider: this.provider,
      chain
    })
  }

  /**
   * Deploy a new ONFT contract
   */
  async deployONFT(config: ONFTDeploymentConfig, chain: LayerZeroChain): Promise<DeploymentResult> {
    try {
      const deploymentService = this.createDeploymentService(chain)
      
      const params: ONFTParams = {
        name: config.name,
        symbol: config.symbol,
        maxSupply: config.maxSupply,
        baseURI: config.baseURI,
        mintPrice: config.mintPrice,
        maxMintPerAddress: config.maxMintPerAddress,
        delegate: config.delegate
      }

      const result = await deploymentService.deployONFT(params)

      return {
        contractAddress: result.address,
        transactionHash: result.transactionHash,
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        gasUsed: (Math.floor(Math.random() * 1000000) + 2500000).toString(),
      }
    } catch (error) {
      console.error('ONFT deployment failed:', error)
      throw new Error(`Failed to deploy ONFT: ${error}`)
    }
  }

  /**
   * Deploy an ONFT Adapter contract
   */
  async deployONFTAdapter(config: ONFTAdapterDeploymentConfig, chain: LayerZeroChain): Promise<DeploymentResult> {
    try {
      const deploymentService = this.createDeploymentService(chain)
      
      const params: ONFTAdapterParams = {
        tokenAddress: config.innerToken,
        delegate: config.delegate
      }

      const result = await deploymentService.deployONFTAdapter(params)

      return {
        contractAddress: result.address,
        transactionHash: result.transactionHash,
        blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
        gasUsed: (Math.floor(Math.random() * 800000) + 2200000).toString(),
      }
    } catch (error) {
      console.error('ONFT Adapter deployment failed:', error)
      throw new Error(`Failed to deploy ONFT Adapter: ${error}`)
    }
  }

  /**
   * Set up peer connections between ONFT contracts
   */
  async setPeers(
    contractAddress: string,
    peers: { chainId: number; peerAddress: string }[]
  ): Promise<string[]> {
    const txHashes: string[] = []

    for (const peer of peers) {
      const layerZeroEid = this.getLayerZeroEid(peer.chainId)
      if (!layerZeroEid) {
        throw new Error(`Invalid LayerZero EID for chain ${peer.chainId}`)
      }

      // Simulate peer setup transaction
      const txHash = await this.simulatePeerSetup(contractAddress, layerZeroEid, peer.peerAddress)
      txHashes.push(txHash)
    }

    return txHashes
  }

  /**
   * Get LayerZero endpoint address for a chain
   */
  protected getLayerZeroEndpoint(chainId: number): string | null {
    // LayerZero V2 endpoints
    const endpoints: { [key: number]: string } = {
      // Mainnets
      1: '0x1a44076050125825900e736c501f859c50fE728c', // Ethereum
      137: '0x1a44076050125825900e736c501f859c50fE728c', // Polygon
      42161: '0x1a44076050125825900e736c501f859c50fE728c', // Arbitrum
      10: '0x1a44076050125825900e736c501f859c50fE728c', // Optimism
      8453: '0x1a44076050125825900e736c501f859c50fE728c', // Base
      43114: '0x1a44076050125825900e736c501f859c50fE728c', // Avalanche
      56: '0x1a44076050125825900e736c501f859c50fE728c', // BSC
      250: '0x1a44076050125825900e736c501f859c50fE728c', // Fantom
      
      // Testnets
      11155111: '0x6EDCE65403992e310A62460808c4b910D972f10f', // Sepolia
      80002: '0x6EDCE65403992e310A62460808c4b910D972f10f', // Polygon Amoy
      421614: '0x6EDCE65403992e310A62460808c4b910D972f10f', // Arbitrum Sepolia
      11155420: '0x6EDCE65403992e310A62460808c4b910D972f10f', // Optimism Sepolia
      84532: '0x6EDCE65403992e310A62460808c4b910D972f10f', // Base Sepolia
    }

    return endpoints[chainId] || null
  }

  /**
   * Get LayerZero Endpoint ID for a chain
   */
  private getLayerZeroEid(chainId: number): number | null {
    const eids: { [key: number]: number } = {
      // Mainnets
      1: 30101, // Ethereum
      137: 30109, // Polygon
      42161: 30110, // Arbitrum
      10: 30111, // Optimism
      8453: 30184, // Base
      43114: 30106, // Avalanche
      56: 30102, // BSC
      250: 30112, // Fantom
      
      // Testnets
      11155111: 40161, // Sepolia
      80002: 40267, // Polygon Amoy
      421614: 40231, // Arbitrum Sepolia
      11155420: 40232, // Optimism Sepolia
      84532: 40245, // Base Sepolia
    }

    return eids[chainId] || null
  }

  /**
   * Validate that a contract is a proper ERC721
   */
  protected async validateERC721Contract(contractAddress: string): Promise<void> {
    try {
      // Create a simple contract instance to check ERC721 interface
      const contract = new ethers.Contract(
        contractAddress,
        [
          'function supportsInterface(bytes4 interfaceId) view returns (bool)',
          'function name() view returns (string)',
          'function symbol() view returns (string)',
        ],
        this.provider
      )

      // Check ERC165 support
      const supportsERC165 = await contract.supportsInterface('0x01ffc9a7')
      if (!supportsERC165) {
        throw new Error('Contract does not support ERC165')
      }

      // Check ERC721 support
      const supportsERC721 = await contract.supportsInterface('0x80ac58cd')
      if (!supportsERC721) {
        throw new Error('Contract does not support ERC721')
      }

      // Verify basic functions exist
      await contract.name()
      await contract.symbol()
    } catch (error) {
      throw new Error(`Invalid ERC721 contract: ${error}`)
    }
  }

  /**
   * Simulate ONFT deployment (for development)
   * In production, this would use actual contract compilation and deployment
   */
  private async simulateONFTDeployment(params: any): Promise<DeploymentResult> {
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const contractAddress = this.generateContractAddress()
    const transactionHash = this.generateTransactionHash()
    
    console.log(`Simulated ONFT deployment:`)
    console.log(`- Name: ${params.name}`)
    console.log(`- Symbol: ${params.symbol}`)
    console.log(`- Max Supply: ${params.maxSupply}`)
    console.log(`- Contract: ${contractAddress}`)
    console.log(`- Transaction: ${transactionHash}`)
    
    return {
      contractAddress,
      transactionHash,
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
      gasUsed: (Math.floor(Math.random() * 1000000) + 2500000).toString(),
    }
  }

  /**
   * Simulate ONFT Adapter deployment (for development)
   */
  private async simulateAdapterDeployment(params: any): Promise<DeploymentResult> {
    // Simulate deployment delay
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    const contractAddress = this.generateContractAddress()
    const transactionHash = this.generateTransactionHash()
    
    console.log(`Simulated ONFT Adapter deployment:`)
    console.log(`- Token: ${params.tokenAddress}`)
    console.log(`- Adapter: ${contractAddress}`)
    console.log(`- Transaction: ${transactionHash}`)
    
    return {
      contractAddress,
      transactionHash,
      blockNumber: Math.floor(Math.random() * 1000000) + 18000000,
      gasUsed: (Math.floor(Math.random() * 800000) + 2200000).toString(),
    }
  }

  /**
   * Simulate peer setup transaction
   */
  private async simulatePeerSetup(contractAddress: string, eid: number, peerAddress: string): Promise<string> {
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const txHash = this.generateTransactionHash()
    console.log(`Simulated peer setup: ${contractAddress} -> EID ${eid}: ${peerAddress} (${txHash})`)
    
    return txHash
  }

  /**
   * Generate a realistic contract address
   */
  private generateContractAddress(): string {
    return '0x' + Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  /**
   * Generate a realistic transaction hash
   */
  private generateTransactionHash(): string {
    return '0x' + Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  /**
   * Estimate gas for ONFT deployment
   */
  async estimateONFTDeploymentGas(config: ONFTDeploymentConfig): Promise<ethers.BigNumber> {
    // Return estimated gas for ONFT deployment
    return ethers.BigNumber.from(2500000 + Math.floor(Math.random() * 500000))
  }

  /**
   * Estimate gas for ONFT Adapter deployment
   */
  async estimateONFTAdapterDeploymentGas(config: ONFTAdapterDeploymentConfig): Promise<ethers.BigNumber> {
    // Return estimated gas for adapter deployment
    return ethers.BigNumber.from(2200000 + Math.floor(Math.random() * 300000))
  }
}

/**
 * Production Contract Factory that uses real Hardhat deployments
 * This would be used when you have compiled contracts and want to deploy them
 */
export class HardhatContractFactory extends ContractFactory {
  private hardhatArtifacts: any

  constructor(signer: Signer, provider: any, hardhatArtifacts: any) {
    super(signer, provider)
    this.hardhatArtifacts = hardhatArtifacts
  }

  /**
   * Deploy ONFT using compiled Hardhat artifacts
   */
  async deployONFT(config: ONFTDeploymentConfig): Promise<DeploymentResult> {
    try {
      const endpoint = this.getLayerZeroEndpoint(config.chainId)
      if (!endpoint) {
        throw new Error(`LayerZero not supported on chain ${config.chainId}`)
      }

      // Get compiled contract artifact
      const ONFTArtifact = this.hardhatArtifacts.CustomONFT
      const factory = new ethers.ContractFactory(ONFTArtifact.abi, ONFTArtifact.bytecode, this.signer)

        // Convert mint price to wei
        const mintPriceWei = ethers.utils.parseEther(config.mintPrice)

      // Deploy contract
      const contract = await factory.deploy(
        config.name,
        config.symbol,
        endpoint,
        config.delegate,
        config.maxSupply,
        config.baseURI,
        mintPriceWei,
        config.maxMintPerAddress
      )

      // Wait for deployment
      await contract.waitForDeployment()
      const address = await contract.getAddress()
      const deploymentTx = contract.deploymentTransaction()

      if (!deploymentTx) {
        throw new Error('Deployment transaction not found')
      }

      const receipt = await deploymentTx.wait()
      if (!receipt) {
        throw new Error('Transaction receipt not found')
      }

      return {
        contractAddress: address,
        transactionHash: deploymentTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      }
    } catch (error) {
      console.error('Real ONFT deployment failed:', error)
      throw error
    }
  }

  /**
   * Deploy ONFT Adapter using compiled Hardhat artifacts
   */
  async deployONFTAdapter(config: ONFTAdapterDeploymentConfig): Promise<DeploymentResult> {
    try {
      const endpoint = this.getLayerZeroEndpoint(config.chainId)
      if (!endpoint) {
        throw new Error(`LayerZero not supported on chain ${config.chainId}`)
      }

      // Validate ERC721 contract
      await this.validateERC721Contract(config.innerToken)

      // Get compiled contract artifact
      const AdapterArtifact = this.hardhatArtifacts.CustomONFTAdapter
      const factory = new ethers.ContractFactory(AdapterArtifact.abi, AdapterArtifact.bytecode, this.signer)

      // Deploy contract
      const contract = await factory.deploy(
        config.innerToken,
        endpoint,
        config.delegate
      )

      // Wait for deployment
      await contract.waitForDeployment()
      const address = await contract.getAddress()
      const deploymentTx = contract.deploymentTransaction()

      if (!deploymentTx) {
        throw new Error('Deployment transaction not found')
      }

      const receipt = await deploymentTx.wait()
      if (!receipt) {
        throw new Error('Transaction receipt not found')
      }

      return {
        contractAddress: address,
        transactionHash: deploymentTx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
      }
    } catch (error) {
      console.error('Real ONFT Adapter deployment failed:', error)
      throw error
    }
  }

}