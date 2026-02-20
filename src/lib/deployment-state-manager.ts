import { ethers } from 'ethers'
import { LayerZeroChain } from './chains'

export interface DeploymentState {
  id: string
  type: 'adapter' | 'new-onft'
  timestamp: number
  deployerAddress: string
  
  // Configuration
  sourceChain?: LayerZeroChain
  targetChains?: LayerZeroChain[]
  chains?: LayerZeroChain[]
  contractAddress?: string
  collectionName?: string
  collectionSymbol?: string
  baseURI?: string
  
  // Completed steps (for state management)
  completedSteps: {
    [stepId: string]: {
      transactionHash: string
      contractAddress?: string
      blockNumber: number
      timestamp: number
      chainId: number
    }
  }
  
  // Deployment results
  adapterAddress?: string
  onftAddresses?: { [chainId: number]: string }
  
  // Steps array for UI display (includes verification status)
  steps?: Array<{
    id: string
    name: string
    status: 'completed' | 'pending' | 'failed'
    chainId: number
    contractAddress?: string
    transactionHash?: string
    verified?: boolean
    verificationStatus?: 'Pending' | 'Verifying' | 'Verified' | 'Failed'
    // Verification metadata for programmatic verification
    sourceCode?: string
    constructorArgs?: string
    contractName?: string
    compilerVersion?: string
  }>
}

export class DeploymentStateManager {
  private static STORAGE_KEY = 'onft-deployment-states'
  private static MAX_DEPLOYMENTS = 50 // Keep last 50 successful deployments
  
  /**
   * Save deployment state to localStorage
   */
  static saveDeploymentState(state: DeploymentState): void {
    try {
      const existingStates = this.getAllDeploymentStates()
      const updatedStates = existingStates.filter(s => s.id !== state.id)
      updatedStates.push(state)
      
      // Keep only last 50 deployments (sorted by timestamp, most recent first)
      const recentStates = updatedStates
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, this.MAX_DEPLOYMENTS)
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentStates))
      console.log(`💾 Saved deployment state: ${state.id}`)
      
      // Auto-export to JSON file (optional background task)
      this.autoExportToFile(recentStates).catch(err => {
        console.warn('Auto-export failed (non-critical):', err)
      })
    } catch (error) {
      console.error('Failed to save deployment state:', error)
    }
  }
  
  /**
   * Load deployment state from localStorage
   */
  static loadDeploymentState(deploymentId: string): DeploymentState | null {
    try {
      const states = this.getAllDeploymentStates()
      return states.find(s => s.id === deploymentId) || null
    } catch (error) {
      console.error('Failed to load deployment state:', error)
      return null
    }
  }
  
  /**
   * Get all deployment states
   */
  static getAllDeploymentStates(): DeploymentState[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Failed to load deployment states:', error)
      return []
    }
  }
  
  /**
   * Create deployment ID from configuration
   */
  static createDeploymentId(
    type: 'adapter' | 'new-onft',
    deployerAddress: string,
    config: any
  ): string {
    const configHash = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(JSON.stringify(config))
    ).slice(0, 10)
    
    return `${type}-${deployerAddress.slice(0, 8)}-${configHash}`
  }
  
  /**
   * Check if a transaction exists and is confirmed
   */
  static async verifyTransaction(
    provider: ethers.providers.Provider,
    txHash: string
  ): Promise<{ exists: boolean; confirmed: boolean; receipt?: ethers.providers.TransactionReceipt }> {
    try {
      const receipt = await provider.getTransactionReceipt(txHash)
      
      if (!receipt) {
        return { exists: false, confirmed: false }
      }
      
      const currentBlock = await provider.getBlockNumber()
      const confirmations = currentBlock - receipt.blockNumber
      
      return {
        exists: true,
        confirmed: confirmations >= 1,
        receipt
      }
    } catch (error) {
      console.error('Failed to verify transaction:', error)
      return { exists: false, confirmed: false }
    }
  }
  
  /**
   * Detect completed deployment steps by checking on-chain state
   */
  static async detectCompletedSteps(
    provider: ethers.providers.Provider,
    deploymentState: DeploymentState
  ): Promise<{
    verifiedSteps: string[]
    contractAddresses: { [stepId: string]: string }
    invalidSteps: string[]
  }> {
    const verifiedSteps: string[] = []
    const contractAddresses: { [stepId: string]: string } = {}
    const invalidSteps: string[] = []
    
    console.log(`🔍 Detecting completed steps for deployment: ${deploymentState.id}`)
    
    for (const [stepId, stepData] of Object.entries(deploymentState.completedSteps || {})) {
      try {
        console.log(`   Checking step: ${stepId}`)
        
        // Verify transaction exists and is confirmed
        const verification = await this.verifyTransaction(provider, stepData.transactionHash)
        
        if (!verification.exists) {
          console.log(`   ❌ Transaction not found: ${stepData.transactionHash}`)
          invalidSteps.push(stepId)
          continue
        }
        
        if (!verification.confirmed) {
          console.log(`   ⏳ Transaction pending: ${stepData.transactionHash}`)
          continue
        }
        
        // For contract deployment steps, verify the contract exists
        if (stepData.contractAddress) {
          const code = await provider.getCode(stepData.contractAddress)
          if (code === '0x') {
            console.log(`   ❌ Contract not found at: ${stepData.contractAddress}`)
            invalidSteps.push(stepId)
            continue
          }
          
          contractAddresses[stepId] = stepData.contractAddress
          console.log(`   ✅ Contract verified: ${stepData.contractAddress}`)
        }
        
        verifiedSteps.push(stepId)
        console.log(`   ✅ Step verified: ${stepId}`)
        
      } catch (error) {
        console.error(`   ❌ Failed to verify step ${stepId}:`, error)
        invalidSteps.push(stepId)
      }
    }
    
    console.log(`🔍 Detection complete: ${verifiedSteps.length} verified, ${invalidSteps.length} invalid`)
    
    return { verifiedSteps, contractAddresses, invalidSteps }
  }
  
  /**
   * Find existing deployment for current configuration
   */
  static findExistingDeployment(
    type: 'adapter' | 'new-onft',
    deployerAddress: string,
    config: any
  ): DeploymentState | null {
    const deploymentId = this.createDeploymentId(type, deployerAddress, config)
    return this.loadDeploymentState(deploymentId)
  }
  
  /**
   * Find existing deployment by adapter address
   */
  static findDeploymentByAdapterAddress(adapterAddress: string): DeploymentState | null {
    try {
      const states = this.getAllDeploymentStates()
      return states.find(s => 
        s.adapterAddress && 
        s.adapterAddress.toLowerCase() === adapterAddress.toLowerCase()
      ) || null
    } catch (error) {
      console.error('Failed to find deployment by adapter address:', error)
      return null
    }
  }
  
  /**
   * Merge new ONFT addresses into existing deployment
   */
  static mergeDeploymentChains(
    existingDeployment: DeploymentState,
    newOnftAddresses: { [chainId: number]: string },
    newTargetChains: LayerZeroChain[],
    newSteps: Array<{
      id: string
      name: string
      status: 'completed' | 'pending' | 'failed'
      chainId: number
      contractAddress?: string
      transactionHash?: string
      verified?: boolean
      verificationStatus?: 'Pending' | 'Verifying' | 'Verified' | 'Failed'
    }>,
    newCompletedSteps: { [stepId: string]: {
      transactionHash: string
      contractAddress?: string
      blockNumber: number
      timestamp: number
      chainId: number
    }}
  ): DeploymentState {
    // Merge ONFT addresses
    const mergedOnftAddresses = {
      ...(existingDeployment.onftAddresses || {}),
      ...newOnftAddresses
    }
    
    // Merge target chains (avoid duplicates)
    const existingTargetChainIds = new Set(
      (existingDeployment.targetChains || []).map(c => c.id)
    )
    const mergedTargetChains = [
      ...(existingDeployment.targetChains || []),
      ...newTargetChains.filter(c => !existingTargetChainIds.has(c.id))
    ]
    
    // Merge steps (avoid duplicates by step id)
    const existingStepIds = new Set(
      (existingDeployment.steps || []).map(s => s.id)
    )
    const mergedSteps = [
      ...(existingDeployment.steps || []),
      ...newSteps.filter(s => !existingStepIds.has(s.id))
    ]
    
    // Merge completed steps
    const mergedCompletedSteps = {
      ...(existingDeployment.completedSteps || {}),
      ...newCompletedSteps
    }
    
    return {
      ...existingDeployment,
      onftAddresses: mergedOnftAddresses,
      targetChains: mergedTargetChains,
      steps: mergedSteps,
      completedSteps: mergedCompletedSteps,
      timestamp: Date.now() // Update timestamp to reflect the merge
    }
  }
  
  /**
   * Clean up old or invalid deployment states
   */
  static cleanupDeploymentStates(): void {
    try {
      const states = this.getAllDeploymentStates()
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
      
      const validStates = states.filter(state => state.timestamp > oneWeekAgo)
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validStates))
      console.log(`🧹 Cleaned up deployment states: ${states.length - validStates.length} removed`)
    } catch (error) {
      console.error('Failed to cleanup deployment states:', error)
    }
  }
  
  /**
   * Export deployments to JSON file (downloads to user's computer)
   */
  static exportDeploymentsToFile(filename: string = `onft-deployments-${Date.now()}.json`): void {
    try {
      const deployments = this.getAllDeploymentStates()
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        count: deployments.length,
        deployments: deployments.sort((a, b) => b.timestamp - a.timestamp)
      }
      
      const json = JSON.stringify(exportData, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      console.log(`📥 Exported ${deployments.length} deployments to ${filename}`)
    } catch (error) {
      console.error('Failed to export deployments:', error)
      throw error
    }
  }
  
  /**
   * Import deployments from JSON file
   */
  static importDeploymentsFromFile(file: File): Promise<{ imported: number; skipped: number; errors: string[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const importData = JSON.parse(text)
          
          // Support both new format (with metadata) and old format (just array)
          const deployments: DeploymentState[] = importData.deployments || importData
          
          if (!Array.isArray(deployments)) {
            throw new Error('Invalid file format: expected array of deployments')
          }
          
          const existingStates = this.getAllDeploymentStates()
          const existingIds = new Set(existingStates.map(s => s.id))
          
          let imported = 0
          let skipped = 0
          const errors: string[] = []
          
          // Merge with existing deployments (newer ones take precedence)
          const mergedStates = [...existingStates]
          
          for (const deployment of deployments) {
            // Validate deployment structure
            if (!deployment.id || !deployment.timestamp || !deployment.type) {
              errors.push(`Invalid deployment: missing required fields (id: ${deployment.id})`)
              continue
            }
            
            // Skip if already exists (keep existing version)
            if (existingIds.has(deployment.id)) {
              skipped++
              continue
            }
            
            mergedStates.push(deployment)
            imported++
          }
          
          // Keep only last 50 deployments (sorted by timestamp)
          const recentStates = mergedStates
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, this.MAX_DEPLOYMENTS)
          
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recentStates))
          
          console.log(`📤 Imported ${imported} deployments, skipped ${skipped} duplicates`)
          
          resolve({ imported, skipped, errors })
        } catch (error: any) {
          console.error('Failed to import deployments:', error)
          reject(new Error(`Failed to import deployments: ${error.message}`))
        }
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsText(file)
    })
  }
  
  /**
   * Auto-export deployments to a downloadable file (optional background export)
   * This creates a data URL that could be used for automatic backups
   */
  private static async autoExportToFile(deployments: DeploymentState[]): Promise<void> {
    try {
      // Store a compressed version in localStorage for backup
      // This is optional - the main storage is still the primary source
      const exportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        count: deployments.length,
        deployments: deployments
      }
      
      const BACKUP_KEY = 'onft-deployment-backup'
      localStorage.setItem(BACKUP_KEY, JSON.stringify(exportData))
      
      // Note: Actual file download requires user interaction, so we just store a backup
      // Users can manually export using exportDeploymentsToFile()
    } catch (error) {
      // Silently fail - this is just a backup mechanism
      console.debug('Auto-export backup failed (non-critical):', error)
    }
  }
  
  /**
   * Get only successful deployments (deployments with contract addresses)
   */
  static getSuccessfulDeployments(): DeploymentState[] {
    const allDeployments = this.getAllDeploymentStates()
    return allDeployments.filter(deployment => {
      // Consider successful if it has adapter address or at least one ONFT address
      return deployment.adapterAddress || 
             (deployment.onftAddresses && Object.keys(deployment.onftAddresses).length > 0)
    }).sort((a, b) => b.timestamp - a.timestamp)
  }
  
  /**
   * Get deployment progress summary
   */
  static getDeploymentProgress(state: DeploymentState): {
    totalSteps: number
    completedSteps: number
    nextStep: string | null
    canResume: boolean
  } {
    const allSteps = this.getAllPossibleSteps(state)
    const completedStepIds = Object.keys(state.completedSteps || {})
    
    const nextStepIndex = allSteps.findIndex(step => !completedStepIds.includes(step))
    const nextStep = nextStepIndex >= 0 ? allSteps[nextStepIndex] : null
    
    return {
      totalSteps: allSteps.length,
      completedSteps: completedStepIds.length,
      nextStep,
      canResume: completedStepIds.length > 0 && nextStep !== null
    }
  }
  
  /**
   * Get all possible steps for a deployment configuration
   */
  private static getAllPossibleSteps(state: DeploymentState): string[] {
    if (state.type === 'adapter') {
      const steps = [
        'verify-contract',
        'deploy-adapter'
      ]
      
      if (state.targetChains) {
        state.targetChains.forEach(chain => {
          steps.push(`deploy-onft-${chain.id}`)
        })
      }
      
      steps.push('setup-peers')
      return steps
    } else {
      const steps: string[] = []
      
      if (state.chains) {
        state.chains.forEach(chain => {
          steps.push(`deploy-onft-${chain.id}`)
        })
      }
      
      steps.push('setup-peers')
      return steps
    }
  }
}
