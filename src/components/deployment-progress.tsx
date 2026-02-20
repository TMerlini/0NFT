'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Deployment, DeploymentStep } from '@/lib/deployment-types'
import { DeploymentManager } from '@/lib/deployment-manager'
import { ContractFactory } from '@/lib/contract-factory'
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Clock,
  ExternalLink,
  Copy,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DeploymentProgressProps {
  deployment: Deployment
  onComplete?: (deployment: Deployment) => void
  onCancel?: () => void
  contractFactory?: ContractFactory
  ownerAddress?: string
}

export function DeploymentProgress({ 
  deployment: initialDeployment, 
  onComplete, 
  onCancel,
  contractFactory,
  ownerAddress
}: DeploymentProgressProps) {
  const [deployment, setDeployment] = useState<Deployment>(initialDeployment)
  const [manager, setManager] = useState<DeploymentManager | null>(null)
  const [isStarted, setIsStarted] = useState(false)

  useEffect(() => {
    if (!contractFactory) {
      console.warn('No contract factory provided to DeploymentProgress')
      return
    }

    const deploymentManager = new DeploymentManager(
      deployment,
      {
        ownerAddress: ownerAddress || '0x0000000000000000000000000000000000000000',
        delegateAddress: ownerAddress || '0x0000000000000000000000000000000000000000'
      },
      contractFactory,
      (updatedDeployment) => {
        setDeployment(updatedDeployment)
        
        // Check if deployment is complete
        const allCompleted = updatedDeployment.steps.every(s => s.status === 'completed')
        if (allCompleted && onComplete) {
          onComplete(updatedDeployment)
        }
      }
    )
    setManager(deploymentManager)
  }, [deployment, onComplete])

  const startDeployment = async () => {
    if (!manager) return
    setIsStarted(true)
    try {
      await manager.startDeployment()
    } catch (error) {
      console.error('Deployment failed:', error)
    }
  }

  const getStepIcon = (step: DeploymentStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'in-progress':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStepBadge = (step: DeploymentStep) => {
    switch (step.status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Completed</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      case 'in-progress':
        return <Badge className="bg-blue-500">In Progress</Badge>
      default:
        return <Badge variant="secondary">Pending</Badge>
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getExplorerUrl = (chainId: number, txHash: string) => {
    // This would normally use the chain's block explorer URL
    return `https://etherscan.io/tx/${txHash}`
  }

  const progress = manager?.getProgress() || { completed: 0, total: 0, percentage: 0 }
  const isComplete = manager?.isComplete() || false
  const hasError = manager?.hasError() || false

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {deployment.type === 'adapter' ? 'ONFT Adapter Deployment' : 'New ONFT Collection Deployment'}
              {isComplete && <CheckCircle className="h-5 w-5 text-green-500" />}
              {hasError && <AlertTriangle className="h-5 w-5 text-destructive" />}
            </CardTitle>
            <CardDescription>
              {deployment.type === 'adapter' 
                ? `Deploying adapter for contract on ${(deployment as any).sourceChain.name}`
                : `Deploying ${(deployment as any).collectionName} across ${(deployment as any).chains.length} chains`
              }
            </CardDescription>
          </div>
          
          {!isStarted && !isComplete && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button onClick={startDeployment}>
                Start Deployment
              </Button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress.completed}/{progress.total} steps completed</span>
          </div>
          <Progress value={progress.percentage} className="w-full" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Deployment Steps */}
        <div className="space-y-3">
          {deployment.steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                step.status === 'in-progress' && "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
                step.status === 'completed' && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                step.status === 'failed' && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
                step.status === 'pending' && "bg-muted/30"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">{step.title}</h4>
                  {getStepBadge(step)}
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {step.description}
                </p>

                {/* Transaction Hash */}
                {step.txHash && step.txHash !== 'validation-complete' && step.txHash !== 'preparation-complete' && step.txHash !== 'verification-complete' && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Transaction:</span>
                    <code className="bg-muted px-1 py-0.5 rounded font-mono">
                      {step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => copyToClipboard(step.txHash!)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    {step.chainId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        asChild
                      >
                        <a
                          href={getExplorerUrl(step.chainId, step.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {step.error && (
                  <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                    {step.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Deployment Results */}
        {isComplete && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/20 dark:border-green-800">
            <h3 className="font-medium text-green-800 dark:text-green-400 mb-3">
              🎉 Deployment Complete!
            </h3>
            
            <div className="space-y-2 text-sm">
              {deployment.type === 'adapter' && (deployment as any).adapterAddress && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Adapter Address:</span>
                  <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                    {(deployment as any).adapterAddress}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard((deployment as any).adapterAddress)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {(deployment as any).onftAddresses && (
                <div>
                  <span className="text-muted-foreground">ONFT Contracts:</span>
                  <div className="mt-1 space-y-1">
                    {Object.entries((deployment as any).onftAddresses).map(([chainId, address]) => (
                      <div key={chainId} className="flex items-center gap-2 ml-4">
                        <span className="text-xs text-muted-foreground">Chain {chainId}:</span>
                        <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                          {address as string}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(address as string)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Summary */}
        {hasError && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <h3 className="font-medium text-destructive mb-2">
              Deployment Failed
            </h3>
            <p className="text-sm text-muted-foreground">
              One or more steps failed during deployment. Please check the error messages above and try again.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
