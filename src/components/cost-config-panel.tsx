'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DEPLOYMENT_COSTS, LAYERZERO_FEES, MARKET_CONFIG } from '@/config/deployment-costs'
import { Settings, DollarSign, Zap, Globe, Save, RefreshCw } from 'lucide-react'

interface CostConfigPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function CostConfigPanel({ isOpen, onClose }: CostConfigPanelProps) {
  const [ethPrice, setEthPrice] = useState<number>(MARKET_CONFIG.defaultEthPrice)
  const [layerZeroBaseFee, setLayerZeroBaseFee] = useState<number>(LAYERZERO_FEES.baseFeeUSD)
  const [updating, setUpdating] = useState(false)

  const updateEthPrice = async () => {
    setUpdating(true)
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      const data = await response.json()
      const newPrice = data.ethereum?.usd || MARKET_CONFIG.defaultEthPrice
      setEthPrice(newPrice)
    } catch (error) {
      console.error('Failed to fetch ETH price:', error)
    } finally {
      setUpdating(false)
    }
  }

  const saveConfiguration = () => {
    // In a real app, this would save to a database or local storage
    localStorage.setItem('0nft-eth-price', ethPrice.toString())
    localStorage.setItem('0nft-lz-base-fee', layerZeroBaseFee.toString())
    
    alert('Configuration saved! Costs will be updated on next deployment estimate.')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cost Configuration
          </CardTitle>
          <CardDescription>
            Configure deployment cost parameters and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="market" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="market">Market Data</TabsTrigger>
              <TabsTrigger value="chains">Chain Costs</TabsTrigger>
              <TabsTrigger value="layerzero">LayerZero Fees</TabsTrigger>
            </TabsList>

            <TabsContent value="market" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Market Pricing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eth-price">ETH Price (USD)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="eth-price"
                          type="number"
                          value={ethPrice}
                          onChange={(e) => setEthPrice(Number(e.target.value))}
                          placeholder="2000"
                        />
                        <Button 
                          variant="outline" 
                          onClick={updateEthPrice}
                          disabled={updating}
                        >
                          {updating ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Current market price: ${ethPrice.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chains" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Chain Deployment Costs
                  </CardTitle>
                  <CardDescription>
                    Gas costs for contract deployment on different chains
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(DEPLOYMENT_COSTS).map(([chain, costs]) => (
                      <div key={chain} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium capitalize">{chain}</h4>
                          <Badge variant={chain === 'testnets' ? 'secondary' : 'default'}>
                            {chain === 'testnets' ? 'Testnet' : 'Mainnet'}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Deployment:</span>
                            <span>{costs.deployment} ETH</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Transaction:</span>
                            <span>{costs.transaction} ETH</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">USD Est:</span>
                            <span>${(costs.deployment * ethPrice).toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="layerzero" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    LayerZero Protocol Fees
                  </CardTitle>
                  <CardDescription>
                    Fees charged by the LayerZero protocol for cross-chain messages
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="base-fee">Base Message Fee (USD)</Label>
                      <Input
                        id="base-fee"
                        type="number"
                        step="0.01"
                        value={layerZeroBaseFee}
                        onChange={(e) => setLayerZeroBaseFee(Number(e.target.value))}
                        placeholder="0.10"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Typical range: $0.05 - $0.50 per message
                      </p>
                    </div>
                    
                    <div>
                      <Label>DVN Fee (USD)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={LAYERZERO_FEES.dvnFeeUSD}
                        disabled
                        placeholder="0.05"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Decentralized Verifier Network fee
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">Fee Multipliers</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span>Mainnet Multiplier:</span>
                        <span>{LAYERZERO_FEES.mainnetMultiplier}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Testnet Multiplier:</span>
                        <span>{LAYERZERO_FEES.testnetMultiplier}x</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between pt-6 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={saveConfiguration}>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
