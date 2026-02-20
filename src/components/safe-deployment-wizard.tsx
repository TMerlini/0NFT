'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LayerZeroChain } from '@/lib/chains'
import { getEstimatedCosts, createCostEstimator } from '@/lib/cost-estimation'
import { BlockchainDeploymentManager, DeploymentStep } from '@/lib/blockchain-deployment'
import { NetworkSwitchGuide } from '@/components/network-switch-guide'
import { DeploymentResumeInfo } from '@/components/deployment-resume-info'
import { DeploymentStateManager, DeploymentState } from '@/lib/deployment-state-manager'
import { ethers } from 'ethers'
import { 
  Zap, 
  Network, 
  DollarSign, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Info
} from 'lucide-react'

interface SafeDeploymentWizardProps {
  isOpen: boolean
  onClose: () => void
  deploymentType: 'adapter' | 'new-onft'
  
  // ONFT Adapter props
  sourceChain?: LayerZeroChain
  targetChains?: LayerZeroChain[]
  contractAddress?: string
  contractInfo?: any
  
  // New ONFT props
  chains?: LayerZeroChain[]
  collectionName?: string
  collectionSymbol?: string
  baseURI?: string
}

export function SafeDeploymentWizard({
  isOpen,
  onClose,
  deploymentType,
  sourceChain,
  targetChains = [],
  contractAddress = '',
  contractInfo,
  chains = [],
  collectionName = '',
  collectionSymbol = '',
  baseURI = ''
}: SafeDeploymentWizardProps) {
  const [currentStep, setCurrentStep] = useState<'review' | 'deploy' | 'complete'>('review')
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [deploymentSteps, setDeploymentSteps] = useState<DeploymentStep[]>([])
  const [deploymentManager, setDeploymentManager] = useState<BlockchainDeploymentManager | null>(null)
  const [existingDeployment, setExistingDeployment] = useState<DeploymentState | null>(null)
  const [showResumeOption, setShowResumeOption] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check for existing deployments when wallet connects
    const checkExistingDeployment = async () => {
      if (isWalletConnected && walletAddress) {
        const deploymentConfig = {
          type: deploymentType,
          sourceChain: sourceChain?.id,
          targetChains: targetChains?.map(c => c.id),
          chains: chains?.map(c => c.id),
          contractAddress,
          collectionName,
          collectionSymbol,
          baseURI
        }

        const existing = DeploymentStateManager.findExistingDeployment(
          deploymentType,
          walletAddress,
          deploymentConfig
        )

        if (existing) {
          const progress = DeploymentStateManager.getDeploymentProgress(existing)
          if (progress.canResume) {
            console.log(`📋 Found resumable deployment: ${existing.id}`)
            setExistingDeployment(existing)
            setShowResumeOption(true)
          }
        }
      }
    }
    
    // Check wallet connection status safely
    const checkWalletConnection = async () => {
      try {
        // Method 1: Check RainbowKit connect button
        const connectButton = document.querySelector('button[data-testid="rk-connect-button"], button[aria-label*="Connect"], button:has([data-testid="rk-account-button"])')
        const accountButton = document.querySelector('button[data-testid="rk-account-button"]')
        
        if (accountButton) {
          setIsWalletConnected(true)
          const buttonText = accountButton.textContent || ''
          // Look for shortened address pattern like "0x1234...5678"
          const addressMatch = buttonText.match(/(0x[a-fA-F0-9]{4}[\.…][a-fA-F0-9]{4})/)
          if (addressMatch) {
            setWalletAddress(addressMatch[1])
          }
          return
        }

        // Method 2: Check if connect button text indicates connection
        if (connectButton) {
          const buttonText = connectButton.textContent || ''
          const isConnected = buttonText.includes('0x') || 
                             buttonText.toLowerCase().includes('disconnect') ||
                             buttonText.toLowerCase().includes('connected')
          
          if (isConnected) {
            setIsWalletConnected(true)
            const addressMatch = buttonText.match(/(0x[a-fA-F0-9]{4}[\.…][a-fA-F0-9]{4})/)
            if (addressMatch) {
              setWalletAddress(addressMatch[1])
            }
            return
          }
        }

        // Method 3: Check ethereum provider directly
        if (typeof window !== 'undefined' && (window as any).ethereum) {
          try {
            // First check if accounts are already available
            const accounts = await (window as any).ethereum.request({ 
              method: 'eth_accounts' 
            })
            if (accounts && accounts.length > 0) {
              setIsWalletConnected(true)
              const fullAddress = accounts[0]
              setWalletAddress(fullAddress) // Store full address
              return
            }

            // Also check if the provider is connected
            const isConnected = await (window as any).ethereum.request({
              method: 'eth_accounts'
            }).then((accounts: string[]) => accounts.length > 0)
            
            if (isConnected) {
              setIsWalletConnected(true)
              return
            }
          } catch (error) {
            console.debug('Could not get accounts:', error)
          }
        }

        // Method 4: Check localStorage for wallet connection state
        const wagmiStore = localStorage.getItem('wagmi.store')
        if (wagmiStore) {
          try {
            const store = JSON.parse(wagmiStore)
            if (store.state?.connections?.size > 0 || store.state?.current) {
              setIsWalletConnected(true)
              return
            }
          } catch (error) {
            console.debug('Could not parse wagmi store:', error)
          }
        }

        // If none of the methods indicate connection, assume not connected
        setIsWalletConnected(false)
        setWalletAddress(undefined)
        
      } catch (error) {
        console.debug('Could not check wallet connection:', error)
        setIsWalletConnected(false)
        setWalletAddress(undefined)
      }
    }

    // Check immediately and then periodically
    checkWalletConnection()
    checkExistingDeployment()
    const interval = setInterval(checkWalletConnection, 2000)

    return () => clearInterval(interval)
  }, [isWalletConnected, walletAddress, deploymentType, sourceChain, targetChains, chains, contractAddress, collectionName, collectionSymbol, baseURI])

  // Calculate real costs using the cost estimation system
  const costBreakdown = deploymentType === 'adapter' && sourceChain
    ? getEstimatedCosts('adapter', sourceChain, targetChains)
    : getEstimatedCosts('new-onft', undefined, [], chains)

  const estimator = createCostEstimator()
  const formattedCosts = estimator.getFormattedBreakdown(costBreakdown)

  const estimatedTime = deploymentType === 'adapter'
    ? 3 + targetChains.length * 2
    : chains.length * 2

  const reconnectWallet = async () => {
    try {
      const ethereum = (window as any).ethereum
      if (!ethereum) {
        alert('No Ethereum provider found. Please install MetaMask.')
        return
      }

      // Request account access
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (accounts && accounts.length > 0) {
        setIsWalletConnected(true)
        setWalletAddress(accounts[0])
        alert('Wallet reconnected successfully!')
      } else {
        alert('Failed to connect wallet. Please try again.')
      }
    } catch (error) {
      console.error('Failed to reconnect wallet:', error)
      alert('Failed to reconnect wallet. Please try connecting manually.')
    }
  }

  const handleResumeDeployment = () => {
    setShowResumeOption(false)
    startDeployment()
  }

  const handleStartFresh = () => {
    if (existingDeployment) {
      // Clear the existing deployment state
      const states = DeploymentStateManager.getAllDeploymentStates()
      const filteredStates = states.filter(s => s.id !== existingDeployment.id)
      localStorage.setItem('onft-deployment-states', JSON.stringify(filteredStates))
      
      setExistingDeployment(null)
      setShowResumeOption(false)
      console.log('🗑️ Cleared existing deployment state')
    }
  }

  const startDeployment = async () => {
    if (!mounted) {
      alert('Please wait for the application to fully load.')
      return
    }

    if (!isWalletConnected) {
      alert('Please connect your wallet first to deploy contracts. Click the "Connect Wallet" button in the top-right corner.')
      return
    }

    try {
      // Get the ethereum provider and create signer
      const ethereum = (window as any).ethereum
      if (!ethereum) {
        alert('No Ethereum provider found. Please install MetaMask or another wallet.')
        return
      }

      // Request account access first
      console.log('Requesting account access...')
      const accounts = await ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (!accounts || accounts.length === 0) {
        alert('No accounts available. Please connect your wallet.')
        return
      }

      console.log('Available accounts:', accounts)

      // Create ethers provider and signer
      const provider = new ethers.providers.Web3Provider(ethereum)
      await provider.send("eth_requestAccounts", []) // Ensure connection
      
      const signer = provider.getSigner()

      // Verify we can get the address
      const address = await signer.getAddress()
      console.log('Deploying with address:', address)

      // Verify we can get the network
      const network = await provider.getNetwork()
      console.log('Connected to network:', network.name, network.chainId)

      // Create deployment manager
      const manager = new BlockchainDeploymentManager({
        type: deploymentType,
        sourceChain,
        targetChains,
        chains,
        contractAddress,
        collectionName,
        collectionSymbol,
        baseURI,
        signer,
        onProgress: (steps) => {
          setDeploymentSteps(steps)
          
          // Check if deployment is complete
          const allCompleted = steps.every(s => s.status === 'completed' || s.status === 'failed')
          const hasFailures = steps.some(s => s.status === 'failed')
          
          if (allCompleted && !hasFailures) {
            setTimeout(() => setCurrentStep('complete'), 1000)
          } else if (hasFailures) {
            console.error('Deployment failed with errors')
          }
        }
      })

      setDeploymentManager(manager)
      setCurrentStep('deploy')

      // Start the real deployment
      await manager.startDeployment()

    } catch (error) {
      console.error('Failed to start deployment:', error)
      
      let errorMessage = 'Failed to start deployment'
      
      if (error instanceof Error) {
        if (error.message.includes('unknown account')) {
          errorMessage = 'Wallet connection issue. Please disconnect and reconnect your wallet, then try again.'
        } else if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction was rejected by user.'
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas fees.'
        } else {
          errorMessage = `Deployment failed: ${error.message}`
        }
      }
      
      alert(errorMessage)
    }
  }

  const handleClose = () => {
    setCurrentStep('review')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {deploymentType === 'adapter' ? (
              <>
                <Network className="h-5 w-5" />
                Deploy ONFT Adapter
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Deploy New ONFT Collection
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {currentStep === 'review' && (
          <div className="space-y-6">
            {/* Configuration Review */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Configuration Review
                </CardTitle>
                <CardDescription>
                  Review your deployment configuration before proceeding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deploymentType === 'adapter' ? (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">Source Chain & Contract</h4>
                      <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                        <p><span className="text-muted-foreground">Chain:</span> {sourceChain?.name}</p>
                        <p><span className="text-muted-foreground">Contract:</span> {contractAddress}</p>
                        {contractInfo && (
                          <>
                            <p><span className="text-muted-foreground">Name:</span> {contractInfo.name}</p>
                            <p><span className="text-muted-foreground">Symbol:</span> {contractInfo.symbol}</p>
                            <p><span className="text-muted-foreground">Total Supply:</span> {contractInfo.totalSupply}</p>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Target Chains ({targetChains.length})</h4>
                      <div className="flex flex-wrap gap-1">
                        {targetChains.map(chain => (
                          <Badge key={chain.id} variant="secondary">
                            {chain.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <h4 className="font-medium mb-2">Collection Details</h4>
                      <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                        <p><span className="text-muted-foreground">Name:</span> {collectionName}</p>
                        <p><span className="text-muted-foreground">Symbol:</span> {collectionSymbol}</p>
                        <p><span className="text-muted-foreground">Base URI:</span> {baseURI}</p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Deployment Chains ({chains.length})</h4>
                      <div className="flex flex-wrap gap-1">
                        {chains.map(chain => (
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

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" />
                  Cost Breakdown
                </CardTitle>
                <CardDescription>
                  Detailed breakdown of deployment costs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Contract Deployment</span>
                  <span className="font-medium">{formattedCosts.deployment}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Peer Setup Transactions</span>
                  <span className="font-medium">{formattedCosts.peerSetup}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">LayerZero Message Fees</span>
                  <span className="font-medium">{formattedCosts.layerZero}</span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="font-medium">Total Cost</span>
                  <span className="font-bold text-lg">{formattedCosts.total}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  * Costs are estimates based on current network conditions and may vary
                </p>
              </CardContent>
            </Card>

            {/* Deployment Estimates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Estimated Cost</span>
                  </div>
                  <p className="text-2xl font-bold">{formattedCosts.total}</p>
                  <p className="text-xs text-muted-foreground">{formattedCosts.usdEstimate}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Estimated Time</span>
                  </div>
                  <p className="text-2xl font-bold">{estimatedTime} min</p>
                  <p className="text-xs text-muted-foreground">Including confirmations</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Security</span>
                  </div>
                  <p className="text-2xl font-bold">High</p>
                  <p className="text-xs text-muted-foreground">LayerZero V2 protocol</p>
                </CardContent>
              </Card>
            </div>

            {/* Security Notice */}
            <Card className="border-yellow-500/20 bg-yellow-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-500 mb-1">Important Security Notice</h4>
                    <p className="text-sm text-muted-foreground">
                      Please ensure you have sufficient funds for gas fees on all target chains. 
                      Contract deployment is irreversible, so double-check all configurations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet Status */}
            {mounted && (
              <Card className={`border ${isWalletConnected ? 'border-green-500/20 bg-green-500/5' : 'border-yellow-500/20 bg-yellow-500/5'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    {isWalletConnected ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <h4 className="font-medium text-green-500">Wallet Connected</h4>
                          <p className="text-sm text-muted-foreground">
                            {walletAddress ? `Connected as ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Ready to deploy contracts'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-500">Wallet Not Connected</h4>
                          <p className="text-sm text-muted-foreground">
                            Please connect your wallet using the &quot;Connect Wallet&quot; button in the top-right corner
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={reconnectWallet}
                          className="ml-auto"
                        >
                          Reconnect Wallet
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resume Deployment Option */}
            {mounted && isWalletConnected && showResumeOption && existingDeployment && (
              <DeploymentResumeInfo
                deploymentState={existingDeployment}
                onResume={handleResumeDeployment}
                onStartFresh={handleStartFresh}
              />
            )}

            {/* Network Switch Guide */}
            {mounted && isWalletConnected && !showResumeOption && (
              <>
                <NetworkSwitchGuide 
                  chains={deploymentType === 'adapter' 
                    ? [sourceChain, ...targetChains].filter(Boolean) as LayerZeroChain[]
                    : chains
                  }
                />

                {/* Real Deployment Warning */}
                <Card className="border-orange-500/20 bg-orange-500/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-500">Real Blockchain Deployment</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          This will create <strong>real transactions</strong> on the blockchain using your connected wallet. 
                          Make sure you have sufficient funds for gas fees on each network.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          <strong>Note:</strong> This is a demonstration deployment that will create real transactions 
                          but simulate contract deployments. In production, actual contract bytecode would be deployed.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={startDeployment} 
                className="min-w-32"
                disabled={!mounted || !isWalletConnected || showResumeOption}
              >
                {!mounted ? 'Loading...' : 
                 !isWalletConnected ? 'Connect Wallet First' : 
                 showResumeOption ? 'Choose Resume Option Above' :
                 'Deploy Contracts (Real)'}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'deploy' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-500 animate-pulse" />
                  Deploying Contracts
                </CardTitle>
                <CardDescription>
                  Your {deploymentType === 'adapter' ? 'ONFT Adapter' : 'omnichain NFT collection'} is being deployed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm">Wallet connected: {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Unknown'}</span>
                  </div>
                  
                  {deploymentSteps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        step.status === 'completed' 
                          ? 'bg-green-500' 
                          : step.status === 'in-progress' 
                          ? 'bg-blue-500 animate-pulse' 
                          : step.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                      }`}>
                        {step.status === 'completed' ? (
                          <CheckCircle className="w-4 h-4 text-white" />
                        ) : step.status === 'failed' ? (
                          <AlertTriangle className="w-4 h-4 text-white" />
                        ) : step.status === 'in-progress' ? (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        ) : (
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="text-sm">{step.name}</span>
                        {step.transactionHash && (
                          <div className="text-xs text-muted-foreground">
                            Tx: {step.transactionHash.slice(0, 10)}...{step.transactionHash.slice(-8)}
                          </div>
                        )}
                        {step.contractAddress && (
                          <div className="text-xs text-muted-foreground">
                            Contract: {step.contractAddress.slice(0, 10)}...{step.contractAddress.slice(-8)}
                          </div>
                        )}
                        {step.error && (
                          <div className="text-xs text-red-400">
                            Error: {step.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Note:</strong> This is a demonstration of the deployment flow. 
                    In the full implementation, this would:
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                    <li>• Deploy actual smart contracts using your connected wallet</li>
                    <li>• Set up LayerZero cross-chain connections</li>
                    <li>• Verify contracts on block explorers</li>
                    <li>• Provide real transaction hashes and contract addresses</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 'complete' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Deployment Complete! 🎉</h2>
              <p className="text-muted-foreground">
                Your {deploymentType === 'adapter' ? 'ONFT Adapter' : 'omnichain NFT collection'} has been successfully deployed.
              </p>
            </div>

            {deploymentManager && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Deployment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const summary = deploymentManager.getDeploymentSummary()
                    return (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-green-500">{summary.completedSteps}</div>
                            <div className="text-sm text-muted-foreground">Completed</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold">{summary.totalSteps}</div>
                            <div className="text-sm text-muted-foreground">Total Steps</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-red-500">{summary.failedSteps}</div>
                            <div className="text-sm text-muted-foreground">Failed</div>
                          </div>
                        </div>

                        {summary.contracts.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Deployed Contracts</h4>
                            <div className="space-y-2">
                              {summary.contracts.map((contract, index) => (
                                <div key={index} className="bg-muted/50 p-3 rounded-lg">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium">{contract.chain}</div>
                                      <div className="text-sm text-muted-foreground">
                                        {contract.address}
                                      </div>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                      <a 
                                        href={`https://etherscan.io/tx/${contract.txHash}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-center">
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
