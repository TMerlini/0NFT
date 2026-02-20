'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  Info, 
  ExternalLink, 
  DollarSign, 
  Shield, 
  Zap, 
  Network,
  Calculator,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

export function LayerZeroFeeInfo() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="h-4 w-4" />
          LayerZero Fees
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            LayerZero Fee Structure for ONFT Operations
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <h4 className="font-medium text-green-500">No Protocol Fees (December 2024)</h4>
                  <p className="text-sm text-muted-foreground">
                    LayerZero currently has <strong>NO additional protocol fees</strong>. 
                    You only pay operational costs for cross-chain messaging.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Components */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4" />
                  Source Chain Gas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Standard blockchain transaction fees paid to miners/validators on the source network.
                </p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Ethereum:</span>
                    <span className="font-mono">~$5-20</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Polygon:</span>
                    <span className="font-mono">~$0.01-0.10</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Arbitrum/Optimism:</span>
                    <span className="font-mono">~$0.50-2</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4" />
                  Security Stack (DVN Fees)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Payment to Decentralized Verifier Networks (DVNs) for message verification and attestation.
                </p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Standard Security:</span>
                    <span className="font-mono">~$0.10-0.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enhanced Security:</span>
                    <span className="font-mono">~$0.50-2</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4" />
                  Executor Fees
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Payment to Executors for delivering and executing messages on destination chains.
                </p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>Message Delivery:</span>
                    <span className="font-mono">~$0.05-0.20</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Infrastructure:</span>
                    <span className="font-mono">~$0.02-0.10</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Network className="h-4 w-4" />
                  Destination Gas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Cost of gas tokens needed to execute the message on the destination chain.
                </p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>ONFT Transfer:</span>
                    <span className="font-mono">~200k gas</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Set Peer:</span>
                    <span className="font-mono">~100k gas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ONFT Operation Costs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Typical ONFT Operation Costs
              </CardTitle>
              <CardDescription>
                Estimated total costs for common ONFT operations (fees vary by network congestion)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Single NFT Transfer</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Ethereum → Polygon:</span>
                        <Badge variant="secondary">$8-15</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Polygon → Arbitrum:</span>
                        <Badge variant="secondary">$1-3</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Base → Optimism:</span>
                        <Badge variant="secondary">$2-5</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Batch Transfer (10 NFTs)</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Ethereum → Polygon:</span>
                        <Badge variant="secondary">$15-25</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Polygon → Arbitrum:</span>
                        <Badge variant="secondary">$2-5</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Base → Optimism:</span>
                        <Badge variant="secondary">$3-8</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Set Peer Configuration</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Ethereum:</span>
                        <Badge variant="secondary">$5-12</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Polygon:</span>
                        <Badge variant="secondary">$0.50-1</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>L2 Networks:</span>
                        <Badge variant="secondary">$1-3</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Costs are estimates and vary based on network congestion, 
                    gas prices, and security configuration. Use LayerZero&apos;s quote API for exact fees.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fee Switch Information */}
          <Card className="border-blue-500/20 bg-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                Protocol Fee Switch (Governance)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                LayerZero has a governance mechanism called the &quot;Fee Switch&quot; that allows ZRO token holders 
                to vote on activating protocol fees. Currently <strong>INACTIVE</strong>.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">If Activated:</h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• Additional fee up to verification + execution cost</li>
                    <li>• Fees collected and converted to ZRO tokens</li>
                    <li>• ZRO tokens are burned (deflationary)</li>
                    <li>• Decided by community governance</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Current Status:</h4>
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Fee Switch: INACTIVE
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Last referendum ended December 27, 2024. No protocol fees currently charged.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentation Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Official Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://docs.layerzero.network/v2/concepts/protocol/transaction-pricing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="justify-start"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Transaction Pricing
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://layerzero.foundation/fee-switch" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="justify-start"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Fee Switch Governance
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://docs.layerzero.network/v2/developers/evm/gas-settings/options" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="justify-start"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Developer Guide
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://layerzeroscan.com/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="justify-start"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    LayerZero Explorer
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
