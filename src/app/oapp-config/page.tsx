'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DeploymentStateManager, DeploymentState } from '@/lib/deployment-state-manager'
import { LayerZeroChain, LAYERZERO_CHAINS } from '@/lib/chains'
import { OAppConfigurationManager } from '@/components/oapp-configuration-manager'
import { 
  Settings, 
  Shield, 
  Zap, 
  Network, 
  Users, 
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

export default function OAppConfigPage() {
  const [deployments, setDeployments] = useState<DeploymentState[]>([])
  const [selectedOApp, setSelectedOApp] = useState<{
    deployment: DeploymentState
    chain: LayerZeroChain
    address: string
  } | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadDeployments()
  }, [])

  const loadDeployments = () => {
    try {
      const successfulDeployments = DeploymentStateManager.getSuccessfulDeployments()
      setDeployments(successfulDeployments)
      console.log('📦 Loaded successful deployments:', successfulDeployments.length)
    } catch (error) {
      console.error('Error loading deployments:', error)
    }
  }

  // Get all unique OApp addresses from deployments
  const getAllOApps = () => {
    const oapps: Array<{
      deployment: DeploymentState
      chain: LayerZeroChain
      address: string
      type: 'adapter' | 'onft'
    }> = []

    deployments.forEach(deployment => {
      // Add adapter if exists
      if (deployment.adapterAddress && deployment.sourceChain) {
        const chain = LAYERZERO_CHAINS.find(c => c.id === deployment.sourceChain?.id)
        if (chain) {
          oapps.push({
            deployment,
            chain,
            address: deployment.adapterAddress,
            type: 'adapter'
          })
        }
      }

      // Add ONFT contracts
      if (deployment.onftAddresses) {
        Object.entries(deployment.onftAddresses).forEach(([chainIdStr, address]) => {
          const chainId = parseInt(chainIdStr)
          const chain = LAYERZERO_CHAINS.find(c => c.id === chainId)
          if (chain && address) {
            oapps.push({
              deployment,
              chain,
              address,
              type: 'onft'
            })
          }
        })
      }
    })

    return oapps
  }

  const oapps = getAllOApps()

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">OApp Configuration</h1>
        </div>
        <p className="text-muted-foreground">
          Manage security settings, executors, delegates, and message options for all your OApp contracts
        </p>
      </div>

      {oapps.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No OApp Contracts Found</h3>
            <p className="text-muted-foreground mb-4">
              Deploy an ONFT Adapter or ONFT contract to start configuring OApp settings.
            </p>
            <Button asChild>
              <a href="/">Go to Deployment</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* OApp Selector Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">OApp Contracts</CardTitle>
                <CardDescription className="text-xs">
                  {oapps.length} contract{oapps.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {oapps.map((oapp, index) => {
                    const isSelected = selectedOApp?.address.toLowerCase() === oapp.address.toLowerCase() &&
                                     selectedOApp?.chain.id === oapp.chain.id
                    
                    return (
                      <button
                        key={`${oapp.address}-${oapp.chain.id}-${index}`}
                        onClick={() => setSelectedOApp({
                          deployment: oapp.deployment,
                          chain: oapp.chain,
                          address: oapp.address
                        })}
                        className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
                          isSelected ? 'bg-primary/10 border-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={oapp.type === 'adapter' ? 'default' : 'secondary'} className="text-xs">
                                {oapp.type === 'adapter' ? 'Adapter' : 'ONFT'}
                              </Badge>
                              <span className="text-xs font-medium text-muted-foreground">
                                {oapp.chain.name}
                              </span>
                            </div>
                            <p className="text-xs font-mono text-muted-foreground truncate">
                              {oapp.address.slice(0, 6)}...{oapp.address.slice(-4)}
                            </p>
                            {oapp.deployment.collectionName && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {oapp.deployment.collectionName}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Configuration Panel */}
          <div className="lg:col-span-3">
            {selectedOApp ? (
              <OAppConfigurationManager
                oappAddress={selectedOApp.address}
                chain={selectedOApp.chain}
                deployment={selectedOApp.deployment}
              />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Select an OApp Contract</h3>
                  <p className="text-muted-foreground">
                    Choose an OApp contract from the list to view and manage its configuration
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
