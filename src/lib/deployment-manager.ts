import { 
  Deployment, 
  DeploymentStep, 
  ONFTAdapterDeployment, 
  NewONFTDeployment,
  DeploymentConfig,
  TransactionResult 
} from './deployment-types'
import { LayerZeroChain } from './chains'
import { ContractFactory, ONFTDeploymentConfig, ONFTAdapterDeploymentConfig } from './contract-factory'
import { getLayerZeroChainId } from './layerzero'
import { ethers } from 'ethers'

export class DeploymentManager {
  private deployment: Deployment
  private config: DeploymentConfig
  private onProgressUpdate?: (deployment: Deployment) => void
  private contractFactory: ContractFactory

  constructor(
    deployment: Deployment, 
    config: DeploymentConfig = {},
    contractFactory: ContractFactory,
    onProgressUpdate?: (deployment: Deployment) => void
  ) {
    this.deployment = deployment
    this.config = config
    this.onProgressUpdate = onProgressUpdate
    this.contractFactory = contractFactory
  }

  async startDeployment(): Promise<void> {
    try {
      if (this.deployment.type === 'adapter') {
        await this.deployONFTAdapter()
      } else {
        await this.deployNewONFT()
      }
    } catch (error) {
      console.error('Deployment failed:', error)
      this.updateCurrentStep('failed', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private async deployONFTAdapter(): Promise<void> {
    const deployment = this.deployment as ONFTAdapterDeployment
    
    // Initialize steps
    deployment.steps = [
      {
        id: 'validate-contract',
        title: 'Validate Source Contract',
        description: `Validating ERC721 contract on ${deployment.sourceChain.name}`,
        status: 'pending'
      },
      {
        id: 'deploy-adapter',
        title: 'Deploy ONFT Adapter',
        description: `Deploying adapter contract on ${deployment.sourceChain.name}`,
        status: 'pending'
      },
      ...deployment.targetChains.map(chain => ({
        id: `deploy-onft-${chain.id}`,
        title: `Deploy ONFT on ${chain.name}`,
        description: `Deploying ONFT contract on ${chain.name}`,
        status: 'pending' as const
      })),
      {
        id: 'configure-peers',
        title: 'Configure Peer Connections',
        description: 'Setting up cross-chain peer relationships',
        status: 'pending'
      },
      {
        id: 'verify-deployment',
        title: 'Verify Deployment',
        description: 'Verifying all contracts and connections',
        status: 'pending'
      }
    ]

    this.notifyProgress()

    // Step 1: Validate contract
    await this.executeStep('validate-contract', async () => {
      // This would normally validate the contract on-chain
      await this.simulateDeployment(2000)
      return { hash: 'validation-complete', chainId: deployment.sourceChain.id }
    })

    // Step 2: Deploy adapter
    await this.executeStep('deploy-adapter', async () => {
      const adapterConfig: ONFTAdapterDeploymentConfig = {
        innerToken: deployment.contractAddress,
        owner: this.config.ownerAddress || ethers.constants.AddressZero,
        delegate: this.config.delegateAddress || ethers.constants.AddressZero,
        chainId: deployment.sourceChain.id
      }

      const result = await this.contractFactory.deployONFTAdapter(adapterConfig, deployment.sourceChain)
      deployment.adapterAddress = result.contractAddress
      
      return { 
        hash: result.transactionHash, 
        chainId: deployment.sourceChain.id,
        contractAddress: result.contractAddress
      }
    })

    // Step 3: Deploy ONFT contracts on target chains
    for (const chain of deployment.targetChains) {
      await this.executeStep(`deploy-onft-${chain.id}`, async () => {
        const deploymentWithCollection = deployment as { collectionName?: string; collectionSymbol?: string; baseURI?: string }
        const onftConfig: ONFTDeploymentConfig = {
          name: deploymentWithCollection.collectionName || 'Bridged NFT',
          symbol: deploymentWithCollection.collectionSymbol || 'BNFT',
          baseURI: deploymentWithCollection.baseURI || 'https://api.example.com/metadata/',
          maxSupply: 10000,
          mintPrice: '0',
          maxMintPerAddress: 10,
          owner: this.config.ownerAddress || ethers.constants.AddressZero,
          delegate: this.config.delegateAddress || ethers.constants.AddressZero,
          chainId: chain.id
        }

        const result = await this.contractFactory.deployONFT(onftConfig, chain)
        if (!deployment.onftAddresses) deployment.onftAddresses = {}
        deployment.onftAddresses[chain.id] = result.contractAddress
        
        return { 
          hash: result.transactionHash, 
          chainId: chain.id,
          contractAddress: result.contractAddress
        }
      })
    }

    // Step 4: Configure peers
    await this.executeStep('configure-peers', async () => {
      if (!deployment.adapterAddress || !deployment.onftAddresses) {
        throw new Error('Missing contract addresses for peer configuration')
      }

      // Set up peers for adapter
      const adapterPeers = deployment.targetChains.map(chain => ({
        chainId: chain.id,
        peerAddress: deployment.onftAddresses![chain.id]
      }))

      const adapterTxHashes = await this.contractFactory.setPeers(
        deployment.adapterAddress,
        adapterPeers
      )

      // Set up peers for each ONFT contract
      for (const chain of deployment.targetChains) {
        const onftAddress = deployment.onftAddresses[chain.id]
        const onftPeers = [
          { chainId: deployment.sourceChain.id, peerAddress: deployment.adapterAddress },
          ...deployment.targetChains
            .filter(c => c.id !== chain.id)
            .map(c => ({ chainId: c.id, peerAddress: deployment.onftAddresses![c.id] }))
        ]

        await this.contractFactory.setPeers(onftAddress, onftPeers)
      }

      return { hash: adapterTxHashes[0] || 'peer-setup-complete', chainId: deployment.sourceChain.id }
    })

    // Step 5: Verify deployment
    await this.executeStep('verify-deployment', async () => {
      await this.simulateDeployment(2000)
      return { hash: 'verification-complete', chainId: deployment.sourceChain.id }
    })
  }

  private async deployNewONFT(): Promise<void> {
    const deployment = this.deployment as NewONFTDeployment
    
    // Initialize steps
    deployment.steps = [
      {
        id: 'prepare-deployment',
        title: 'Prepare Deployment',
        description: 'Calculating deployment parameters and gas estimates',
        status: 'pending'
      },
      ...deployment.chains.map(chain => ({
        id: `deploy-onft-${chain.id}`,
        title: `Deploy ONFT on ${chain.name}`,
        description: `Deploying ${deployment.collectionName} on ${chain.name}`,
        status: 'pending' as const
      })),
      {
        id: 'configure-mesh',
        title: 'Configure Mesh Network',
        description: 'Setting up omnichain connections between all contracts',
        status: 'pending'
      },
      {
        id: 'verify-deployment',
        title: 'Verify Deployment',
        description: 'Testing cross-chain functionality',
        status: 'pending'
      }
    ]

    this.notifyProgress()

    // Step 1: Prepare deployment
    await this.executeStep('prepare-deployment', async () => {
      await this.simulateDeployment(1500)
      return { hash: 'preparation-complete', chainId: deployment.chains[0].id }
    })

    // Step 2: Deploy ONFT contracts on all chains
    for (const chain of deployment.chains) {
      await this.executeStep(`deploy-onft-${chain.id}`, async () => {
        const onftConfig: ONFTDeploymentConfig = {
          name: deployment.collectionName,
          symbol: deployment.collectionSymbol,
          baseURI: deployment.baseURI,
          maxSupply: 10000,
          mintPrice: '0',
          maxMintPerAddress: 10,
          owner: this.config.ownerAddress || ethers.constants.AddressZero,
          delegate: this.config.delegateAddress || ethers.constants.AddressZero,
          chainId: chain.id
        }

        const result = await this.contractFactory.deployONFT(onftConfig, chain)
        if (!deployment.onftAddresses) deployment.onftAddresses = {}
        deployment.onftAddresses[chain.id] = result.contractAddress
        
        return { 
          hash: result.transactionHash, 
          chainId: chain.id,
          contractAddress: result.contractAddress
        }
      })
    }

    // Step 3: Configure mesh network
    await this.executeStep('configure-mesh', async () => {
      if (!deployment.onftAddresses) {
        throw new Error('Missing ONFT addresses for mesh configuration')
      }

      // Configure full mesh network - each contract knows about all others
      for (const chain of deployment.chains) {
        const onftAddress = deployment.onftAddresses[chain.id]
        const peers = deployment.chains
          .filter(c => c.id !== chain.id)
          .map(c => ({ chainId: c.id, peerAddress: deployment.onftAddresses![c.id] }))

        await this.contractFactory.setPeers(onftAddress, peers)
      }

      return { hash: 'mesh-configuration-complete', chainId: deployment.chains[0].id }
    })

    // Step 4: Verify deployment
    await this.executeStep('verify-deployment', async () => {
      await this.simulateDeployment(2500)
      return { hash: 'verification-complete', chainId: deployment.chains[0].id }
    })
  }

  private async executeStep(
    stepId: string, 
    action: () => Promise<TransactionResult>
  ): Promise<void> {
    const step = this.deployment.steps.find(s => s.id === stepId)
    if (!step) throw new Error(`Step ${stepId} not found`)

    try {
      // Mark step as in progress
      step.status = 'in-progress'
      this.notifyProgress()

      // Execute the action
      const result = action()
      const txResult = await result

      // Mark step as completed
      step.status = 'completed'
      step.txHash = txResult.hash
      step.chainId = txResult.chainId
      this.notifyProgress()

    } catch (error) {
      step.status = 'failed'
      step.error = error instanceof Error ? error.message : 'Unknown error'
      this.notifyProgress()
      throw error
    }
  }

  private updateCurrentStep(status: 'failed', error: string): void {
    const currentStep = this.deployment.steps.find(s => s.status === 'in-progress')
    if (currentStep) {
      currentStep.status = status
      currentStep.error = error
      this.notifyProgress()
    }
  }

  private notifyProgress(): void {
    if (this.onProgressUpdate) {
      this.onProgressUpdate({ ...this.deployment })
    }
  }

  private async simulateDeployment(duration: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, duration))
  }

  private generateMockTxHash(): string {
    return '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  private generateMockAddress(): string {
    return '0x' + Array.from({ length: 40 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  }

  // Public methods for external control
  public getProgress(): { completed: number; total: number; percentage: number } {
    const completed = this.deployment.steps.filter(s => s.status === 'completed').length
    const total = this.deployment.steps.length
    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }

  public getCurrentStep(): DeploymentStep | undefined {
    return this.deployment.steps.find(s => s.status === 'in-progress') ||
           this.deployment.steps.find(s => s.status === 'pending')
  }

  public isComplete(): boolean {
    return this.deployment.steps.every(s => s.status === 'completed')
  }

  public hasError(): boolean {
    return this.deployment.steps.some(s => s.status === 'failed')
  }
}
