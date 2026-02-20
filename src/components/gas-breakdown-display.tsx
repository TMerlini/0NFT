'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  GasBreakdown
} from '@/lib/layerzero-bridge'
import { 
  DollarSign, 
  Zap, 
  Shield, 
  Network,
  Coins,
  CheckCircle
} from 'lucide-react'
import { ethers } from 'ethers'

interface GasBreakdownDisplayProps {
  gasBreakdown: GasBreakdown
  sourceChainName?: string
  destinationChainName?: string
  hasExecutor?: boolean
}

export function GasBreakdownDisplay({ 
  gasBreakdown, 
  sourceChainName = 'Source',
  destinationChainName = 'Destination',
  hasExecutor = false
}: GasBreakdownDisplayProps) {
  // Format ETH values with appropriate precision
  const formatEth = (value: string): string => {
    const num = parseFloat(value)
    if (num < 0.0001) return '<0.0001'
    if (num < 0.01) return num.toFixed(6)
    if (num < 1) return num.toFixed(4)
    return num.toFixed(4)
  }

  // Calculate percentages for visualization
  const totalCostBN = ethers.utils.parseEther(gasBreakdown.totalCost)
  const sourceGasBN = ethers.utils.parseEther(gasBreakdown.sourceChainGas)
  const layerZeroFeeBN = ethers.utils.parseEther(gasBreakdown.layerZeroFee)
  
  const sourceGasPercent = totalCostBN.gt(0) 
    ? sourceGasBN.mul(100).div(totalCostBN).toNumber() 
    : 0
  const layerZeroPercent = totalCostBN.gt(0)
    ? layerZeroFeeBN.mul(100).div(totalCostBN).toNumber()
    : 0

  return (
    <Card className="border-border bg-muted/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
          <Coins className="h-4 w-4 text-muted-foreground" />
          Gas & Fee Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Cost Highlight */}
        <div className="p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total Cost</span>
            <span className="text-lg font-semibold text-foreground">{formatEth(gasBreakdown.totalCost)} ETH</span>
          </div>
        </div>

        {/* Breakdown Items */}
        <div className="space-y-3">
          {/* Source Chain Gas */}
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Source Chain Gas</div>
                <div className="text-xs text-muted-foreground">{sourceChainName}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium">{formatEth(gasBreakdown.sourceChainGas)} ETH</div>
              <div className="text-xs text-muted-foreground">{sourceGasPercent}%</div>
            </div>
          </div>

          {/* LayerZero Fee Breakdown */}
          <div className="space-y-2 pl-6 border-l-2 border-border/50">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <Network className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">LayerZero Fee (Total)</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">{formatEth(gasBreakdown.layerZeroFee)} ETH</span>
                <span className="text-xs text-muted-foreground ml-2">({layerZeroPercent}%)</span>
              </div>
            </div>

            {/* DVN Fees */}
            <div className="flex items-center justify-between py-1 pl-4">
              <div className="flex items-center gap-2">
                <Shield className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">DVN Verification</span>
              </div>
              <span className="text-xs font-medium text-foreground">{formatEth(gasBreakdown.dvnFees)} ETH</span>
            </div>

            {/* Executor Fees */}
            <div className="flex items-center justify-between py-1 pl-4">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Executor Fees</span>
              </div>
              <span className="text-xs font-medium text-foreground">{formatEth(gasBreakdown.executorFees)} ETH</span>
            </div>

            {/* Destination Gas */}
            {hasExecutor ? (
              <div className="flex items-center justify-between py-1 pl-4">
                <div className="flex items-center gap-2">
                  <Network className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Destination Gas</span>
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    <CheckCircle className="h-2 w-2 mr-1" />
                    Executor Paid
                  </Badge>
                </div>
                <span className="text-xs font-medium text-muted-foreground">0 ETH</span>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1 pl-4">
                <div className="flex items-center gap-2">
                  <Network className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Destination Gas</span>
                  <span className="text-xs text-muted-foreground">({destinationChainName})</span>
                </div>
                <span className="text-xs font-medium text-foreground">{formatEth(gasBreakdown.destinationGas)} ETH</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Note */}
        {hasExecutor && (
          <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-600 dark:text-green-400">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-3 w-3 mt-0.5 shrink-0" />
              <div>
                <div className="font-medium mb-1">Single-Transaction Bridge</div>
                <div className="text-green-500/70">
                  Executor will pay destination chain gas fees. You only pay on the source chain.
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}