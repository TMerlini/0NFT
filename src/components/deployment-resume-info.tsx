'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  ExternalLink,
  AlertCircle,
  Play
} from 'lucide-react'
import { DeploymentState, DeploymentStateManager } from '@/lib/deployment-state-manager'

interface DeploymentResumeInfoProps {
  deploymentState: DeploymentState
  onResume: () => void
  onStartFresh: () => void
}

export function DeploymentResumeInfo({ 
  deploymentState, 
  onResume, 
  onStartFresh 
}: DeploymentResumeInfoProps) {
  const progress = DeploymentStateManager.getDeploymentProgress(deploymentState)
  const progressPercentage = (progress.completedSteps / progress.totalSteps) * 100

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStepName = (stepId: string) => {
    if (stepId === 'verify-contract') return 'Contract Verification'
    if (stepId === 'deploy-adapter') return 'Deploy Adapter'
    if (stepId === 'setup-peers') return 'Setup Cross-Chain Peers'
    if (stepId.startsWith('deploy-onft-')) {
      const chainId = stepId.split('-')[2]
      const chain = deploymentState.targetChains?.find(c => c.id === parseInt(chainId)) ||
                   deploymentState.chains?.find(c => c.id === parseInt(chainId))
      return `Deploy ONFT on ${chain?.name || `Chain ${chainId}`}`
    }
    return stepId
  }

  const getExplorerUrl = (stepId: string, txHash: string) => {
    const chainId = deploymentState.completedSteps[stepId]?.chainId
    let explorerUrl = 'https://etherscan.io' // Default to Ethereum
    
    // Map chain IDs to explorer URLs
    const explorers: { [key: number]: string } = {
      1: 'https://etherscan.io',
      8453: 'https://basescan.org',
      137: 'https://polygonscan.com',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
      11155111: 'https://sepolia.etherscan.io',
    }
    
    if (chainId && explorers[chainId]) {
      explorerUrl = explorers[chainId]
    }
    
    return `${explorerUrl}/tx/${txHash}`
  }

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-500" />
          Resume Previous Deployment
        </CardTitle>
        <CardDescription>
          Found an existing deployment in progress. You can resume from where you left off.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {progress.completedSteps} of {progress.totalSteps} steps completed
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Deployment Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Deployment Details</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Type:</span>
                <Badge variant="secondary">
                  {deploymentState.type === 'adapter' ? 'ONFT Adapter' : 'New ONFT'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Started:</span>
                <span>{formatTimestamp(deploymentState.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Deployer:</span>
                <span className="font-mono">
                  {deploymentState.deployerAddress.slice(0, 6)}...{deploymentState.deployerAddress.slice(-4)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Next Step</h4>
            {progress.nextStep ? (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span className="text-sm">{getStepName(progress.nextStep)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">All steps completed</span>
              </div>
            )}
          </div>
        </div>

        {/* Completed Steps */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Completed Steps</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {Object.entries(deploymentState.completedSteps).map(([stepId, stepData]) => (
              <div key={stepId} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{getStepName(stepId)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {stepData.contractAddress && (
                    <Badge variant="outline" className="text-xs font-mono">
                      {stepData.contractAddress.slice(0, 6)}...{stepData.contractAddress.slice(-4)}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-6 w-6 p-0"
                  >
                    <a
                      href={getExplorerUrl(stepId, stepData.transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View transaction"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-orange-500">Important</p>
            <p className="text-muted-foreground mt-1">
              Resuming will verify all completed steps on-chain before continuing. 
              Invalid or failed transactions will be retried.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={onResume} className="flex-1">
            <Play className="h-4 w-4 mr-2" />
            Resume Deployment
          </Button>
          <Button variant="outline" onClick={onStartFresh}>
            Start Fresh
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
