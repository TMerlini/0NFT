'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DeploymentProgress } from './deployment-progress'
import { 
  Deployment, 
  ONFTAdapterDeployment, 
  NewONFTDeployment 
} from '@/lib/deployment-types'
import { LayerZeroChain } from '@/lib/chains'
// Removed WagmiWrapper to avoid provider context issues
import { 
  Zap, 
  Network, 
  AlertTriangle, 
  Info, 
  DollarSign,
  Clock,
  Shield
} from 'lucide-react'

interface DeploymentWizardProps {
  isOpen: boolean
  onClose: () => void
  deploymentType: 'adapter' | 'new-onft'
  
  // ONFT Adapter props
  sourceChain?: LayerZeroChain
  targetChains?: LayerZeroChain[]
  contractAddress?: string
  contractInfo?: {
    name?: string
    symbol?: string
    totalSupply?: string
    isERC721: boolean
  }
  
  // New ONFT props
  chains?: LayerZeroChain[]
  collectionName?: string
  collectionSymbol?: string
  baseURI?: string
}

export function DeploymentWizard({
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
}: DeploymentWizardProps) {
  const [currentStep, setCurrentStep] = useState<'review' | 'deploy' | 'complete'>('review')
  const [deployment, setDeployment] = useState<Deployment | null>(null)
  
  // Mock contract factory for now to avoid wagmi provider issues
  const contractFactory: import('@/lib/contract-factory').ContractFactory | undefined = undefined
  const isConnected = false
  const isMock = true
  const address = undefined

  const createDeployment = (): Deployment => {
    if (deploymentType === 'adapter') {
      return {
        type: 'adapter',
        sourceChain: sourceChain!,
        targetChains,
        contractAddress,
        contractInfo,
        steps: []
      } as ONFTAdapterDeployment
    } else {
      return {
        type: 'new-onft',
        chains,
        collectionName,
        collectionSymbol,
        baseURI,
        steps: []
      } as NewONFTDeployment
    }
  }

  const startDeployment = () => {
    if (!isConnected && !isMock) {
      alert('Please connect your wallet to deploy contracts')
      return
    }

    const newDeployment = createDeployment()
    setDeployment(newDeployment)
    setCurrentStep('deploy')
  }

  const handleDeploymentComplete = (completedDeployment: Deployment) => {
    setDeployment(completedDeployment)
    setCurrentStep('complete')
  }

  const handleClose = () => {
    setCurrentStep('review')
    setDeployment(null)
    onClose()
  }

  const estimatedGasCost = deploymentType === 'adapter' 
    ? (1 + targetChains.length) * 0.05 // Rough estimate
    : chains.length * 0.04

  const estimatedTime = deploymentType === 'adapter'
    ? (2 + targetChains.length * 2) // minutes
    : chains.length * 2

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
            {/* Deployment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Deployment Summary</CardTitle>
                <CardDescription>
                  Review your deployment configuration before proceeding
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deploymentType === 'adapter' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Source Contract</h4>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-muted-foreground">Address:</span> {contractAddress}</p>
                          <p><span className="text-muted-foreground">Chain:</span> {sourceChain?.name}</p>
                          {contractInfo?.name && (
                            <p><span className="text-muted-foreground">Name:</span> {contractInfo.name}</p>
                          )}
                          {contractInfo?.symbol && (
                            <p><span className="text-muted-foreground">Symbol:</span> {contractInfo.symbol}</p>
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
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Collection Details</h4>
                        <div className="space-y-1 text-sm">
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
                    </div>
                  </>
                )}
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
                  <p className="text-2xl font-bold">{estimatedGasCost.toFixed(3)} ETH</p>
                  <p className="text-xs text-muted-foreground">Gas fees across all chains</p>
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

            {/* Important Notes */}
            <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <h4 className="font-medium text-amber-800 dark:text-amber-400">
                      Important Notes
                    </h4>
                    <ul className="space-y-1 text-amber-700 dark:text-amber-300">
                      <li>• Ensure you have sufficient funds on all target chains</li>
                      <li>• Do not close this window during deployment</li>
                      <li>• Transactions cannot be reversed once confirmed</li>
                      <li>• Save the contract addresses after deployment</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={startDeployment} className="min-w-32">
                Start Deployment
              </Button>
            </div>
          </div>
        )}

        {currentStep === 'deploy' && deployment && (
          <DeploymentProgress
            deployment={deployment}
            onComplete={handleDeploymentComplete}
            onCancel={handleClose}
            contractFactory={contractFactory}
            ownerAddress={address}
          />
        )}

        {currentStep === 'complete' && deployment && (
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

            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Test Your Deployment</p>
                    <p className="text-muted-foreground">
                      Try sending an NFT across chains to verify everything works correctly.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Save Contract Addresses</p>
                    <p className="text-muted-foreground">
                      Keep a record of all deployed contract addresses for future reference.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Monitor Transactions</p>
                    <p className="text-muted-foreground">
                      Use LayerZero Scan to monitor cross-chain transactions.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-center">
              <Button onClick={handleClose} className="min-w-32">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
