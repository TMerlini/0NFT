'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ArrowRight,
  Clock,
  Shield
} from 'lucide-react'
import { BatchBridgeProgress } from '@/lib/layerzero-bridge'
import { PreCrimeValidationDisplay } from '@/components/precrime-validation-display'

interface BatchBridgeProgressDisplayProps {
  progress: BatchBridgeProgress
}

export function BatchBridgeProgressDisplay({ progress }: BatchBridgeProgressDisplayProps) {
  const progressPercentage = progress.total > 0 
    ? ((progress.completed + progress.failed) / progress.total) * 100 
    : 0
  
  const successPercentage = progress.total > 0 
    ? (progress.completed / progress.total) * 100 
    : 0

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Batch Bridge Progress
          </span>
          <Badge variant="secondary">
            {progress.completed + progress.failed} / {progress.total}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium">
              {progress.completed + progress.failed} / {progress.total} NFTs
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {progress.completed} succeeded
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              {progress.failed} failed
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              {progress.total - progress.completed - progress.failed} pending
            </span>
          </div>
        </div>

        {/* Current NFT Status */}
        {progress.current && (
          <div className="border rounded-lg p-3 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current: NFT #{progress.current.tokenId}</span>
              <Badge 
                variant={
                  progress.current.status === 'success' ? 'default' :
                  progress.current.status === 'failed' ? 'destructive' :
                  'secondary'
                }
              >
                {progress.current.status === 'bridging' && (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                )}
                {progress.current.status === 'approving' && (
                  <Clock className="h-3 w-3 mr-1" />
                )}
                {progress.current.status === 'success' && (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                {progress.current.status === 'failed' && (
                  <XCircle className="h-3 w-3 mr-1" />
                )}
                {progress.current.status.charAt(0).toUpperCase() + progress.current.status.slice(1)}
              </Badge>
            </div>
            {progress.current.transactionHash && (
              <div className="text-xs text-muted-foreground break-all">
                TX: {progress.current.transactionHash.slice(0, 20)}...
              </div>
            )}
            {progress.current.error && (
              <div className="text-xs text-red-500 mt-1">
                Error: {progress.current.error}
              </div>
            )}
            {/* PreCrime validation result for current NFT */}
            {progress.current.preCrimeResult && (
              <div className="mt-2">
                <PreCrimeValidationDisplay
                  result={progress.current.preCrimeResult}
                  chainName="destination"
                />
              </div>
            )}
          </div>
        )}

        {/* Results Summary */}
        {progress.results.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Results:</div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {progress.results.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between text-xs p-2 rounded bg-background border"
                >
                  <span className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    NFT #{result.tokenId}
                  </span>
                  {result.transactionHash && (
                    <a
                      href={`https://etherscan.io/tx/${result.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View TX
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
