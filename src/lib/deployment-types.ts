import { LayerZeroChain } from './chains'

export interface DeploymentStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'failed'
  txHash?: string
  error?: string
  chainId?: number
}

export interface ONFTAdapterDeployment {
  type: 'adapter'
  sourceChain: LayerZeroChain
  targetChains: LayerZeroChain[]
  contractAddress: string
  contractInfo?: {
    name?: string
    symbol?: string
    totalSupply?: string
    isERC721: boolean
  }
  steps: DeploymentStep[]
  adapterAddress?: string
  onftAddresses?: Record<number, string> // chainId -> contract address
}

export interface NewONFTDeployment {
  type: 'new-onft'
  chains: LayerZeroChain[]
  collectionName: string
  collectionSymbol: string
  baseURI: string
  steps: DeploymentStep[]
  onftAddresses?: Record<number, string> // chainId -> contract address
}

export type Deployment = ONFTAdapterDeployment | NewONFTDeployment

export interface DeploymentConfig {
  // Owner / delegate (used by DeploymentManager)
  ownerAddress?: string
  delegateAddress?: string

  // Gas settings
  gasLimit?: bigint
  gasPrice?: bigint
  
  // LayerZero settings
  confirmations?: number
  
  // Deployment settings
  salt?: string // For deterministic deployments
  
  // Security settings
  dvnConfig?: {
    requiredDVNs: string[]
    optionalDVNs: string[]
    threshold: number
  }
}

export interface TransactionResult {
  hash: string
  chainId: number
  blockNumber?: number
  gasUsed?: bigint
  effectiveGasPrice?: bigint
  contractAddress?: string
}

export interface DeploymentProgress {
  currentStep: number
  totalSteps: number
  isComplete: boolean
  hasError: boolean
  estimatedTimeRemaining?: number
}
