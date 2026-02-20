'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Network, ArrowRight, CheckCircle } from 'lucide-react'
import { LayerZeroChain } from '@/lib/chains'

interface NetworkSwitchGuideProps {
  chains: LayerZeroChain[]
  currentStep?: string
}

export function NetworkSwitchGuide({ chains, currentStep }: NetworkSwitchGuideProps) {
  if (chains.length <= 1) return null

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-blue-500" />
          Multi-Chain Deployment Process
        </CardTitle>
        <CardDescription>
          This deployment will require switching between multiple networks. Please approve network switches when prompted.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <p className="text-sm text-muted-foreground">
            Your wallet will prompt you to switch networks during deployment. 
            This is normal for cross-chain operations.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Deployment Sequence:</h4>
          <div className="space-y-2">
            {chains.map((chain, index) => {
              const isActive = currentStep?.includes(chain.name.toLowerCase()) || 
                              currentStep?.includes(chain.id.toString())
              const isCompleted = false // You can track this based on deployment progress
              
              return (
                <div key={chain.id} className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-3 w-3" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium">{chain.name}</span>
                    <Badge variant={chain.isTestnet ? "secondary" : "default"} className="text-xs">
                      {chain.isTestnet ? 'Testnet' : 'Mainnet'}
                    </Badge>
                  </div>

                  {isActive && (
                    <Badge variant="outline" className="text-blue-600 border-blue-600">
                      Current
                    </Badge>
                  )}
                  
                  {index < chains.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-sm">What to Expect:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Wallet will prompt to switch networks for each chain</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>New networks may be automatically added to your wallet</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Each network requires separate transaction approval</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Process may take several minutes to complete</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
