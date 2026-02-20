'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DvnConfiguratorComponent } from '@/components/dvn-configurator'
import { LayerZeroChain, LAYERZERO_CHAINS } from '@/lib/chains'
import { DeploymentState } from '@/lib/deployment-state-manager'
import { DvnConfigurator } from '@/lib/dvn-configurator'
import { ethers } from 'ethers'
import { 
  Settings, 
  Shield, 
  Zap, 
  Network, 
  Users, 
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Copy,
  Info,
  Eye,
  EyeOff
} from 'lucide-react'

interface OAppConfigurationManagerProps {
  oappAddress: string
  chain: LayerZeroChain
  deployment: DeploymentState
}

export function OAppConfigurationManager({
  oappAddress,
  chain,
  deployment
}: OAppConfigurationManagerProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [delegate, setDelegate] = useState<string | null>(null)
  const [newDelegateAddress, setNewDelegateAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Get all target chains from deployment
  const targetChains = deployment.targetChains || []
  const allChains = [chain, ...targetChains]

  useEffect(() => {
    loadDelegates()
  }, [oappAddress, chain])

  const loadDelegates = async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const delegateAddress = await DvnConfigurator.getDelegate(oappAddress, chain, provider)
        setDelegate(delegateAddress)
      }
    } catch (error) {
      console.error('Error loading delegate:', error)
      setDelegate(null)
    }
  }

  const handleSetDelegate = async () => {
    if (!newDelegateAddress) {
      alert('Please enter delegate address')
      return
    }

    // Validate address format
    if (!ethers.utils.isAddress(newDelegateAddress)) {
      alert('Invalid address format')
      return
    }

    setIsLoading(true)
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const network = await provider.getNetwork()
        
        // Check if we're on the correct network
        if (network.chainId !== chain.id) {
          throw new Error(`Please switch to ${chain.name} network`)
        }
        
        const signer = provider.getSigner()
        const txHash = await DvnConfigurator.setDelegate(
          oappAddress,
          newDelegateAddress,
          chain,
          signer
        )
        
        setNewDelegateAddress('')
        alert(`Delegate set successfully! Transaction: ${txHash}`)
        await loadDelegates() // Reload to get updated state
      } else {
        throw new Error('Please connect your wallet')
      }
    } catch (error: any) {
      console.error('Error setting delegate:', error)
      alert(`Failed to set delegate: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveDelegate = async () => {
    if (!delegate) {
      return
    }

    if (!confirm(`Remove delegate ${delegate}?\n\nThis will set the delegate to the zero address, effectively removing delegation.`)) {
      return
    }

    setIsLoading(true)
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        const network = await provider.getNetwork()
        
        // Check if we're on the correct network
        if (network.chainId !== chain.id) {
          throw new Error(`Please switch to ${chain.name} network`)
        }
        
        const signer = provider.getSigner()
        // Set delegate to zero address to remove delegation
        const txHash = await DvnConfigurator.setDelegate(
          oappAddress,
          ethers.constants.AddressZero,
          chain,
          signer
        )
        
        alert(`Delegate removed successfully! Transaction: ${txHash}`)
        await loadDelegates() // Reload to get updated state
      } else {
        throw new Error('Please connect your wallet')
      }
    } catch (error: any) {
      console.error('Error removing delegate:', error)
      alert(`Failed to remove delegate: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    alert('Address copied to clipboard')
  }

  const getExplorerUrl = (chainId: number, address: string) => {
    const explorers: { [key: number]: string } = {
      1: 'https://etherscan.io',
      8453: 'https://basescan.org',
      56: 'https://bscscan.com',
    }
    const baseUrl = explorers[chainId] || 'https://etherscan.io'
    return `${baseUrl}/address/${address}`
  }

  return (
    <div className="space-y-6">
      {/* OApp Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                OApp Configuration
              </CardTitle>
              <CardDescription className="mt-1">
                {deployment.collectionName || 'Unnamed Collection'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{chain.name}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyAddress(oappAddress)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Address
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={getExplorerUrl(chain.id, oappAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </a>
              </Button>
            </div>
          </div>
          <div className="mt-2">
            <code className="text-xs text-muted-foreground break-all">
              {oappAddress}
            </code>
          </div>
        </CardHeader>
      </Card>

      {/* Configuration Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <Eye className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="dvn">
            <Shield className="h-4 w-4 mr-2" />
            DVN Security
          </TabsTrigger>
          <TabsTrigger value="executor">
            <Zap className="h-4 w-4 mr-2" />
            Executor
          </TabsTrigger>
          <TabsTrigger value="delegates">
            <Users className="h-4 w-4 mr-2" />
            Delegates
          </TabsTrigger>
          <TabsTrigger value="paths">
            <Network className="h-4 w-4 mr-2" />
            Paths
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Overview</CardTitle>
              <CardDescription>
                Quick view of all OApp settings and status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* OApp Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Contract Type</Label>
                  <p className="font-medium">
                    {deployment.adapterAddress ? 'ONFT Adapter' : 'ONFT721'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Deployed Chains</Label>
                  <p className="font-medium">{allChains.length} chain{allChains.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Connected Chains */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Connected Chains</Label>
                <div className="flex flex-wrap gap-2">
                  {allChains.map(c => (
                    <Badge key={c.id} variant="outline">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t">
                <Label className="text-xs text-muted-foreground mb-2 block">Quick Actions</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('dvn')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Configure DVN
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('executor')}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Configure Executor
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('delegates')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Delegates
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DVN Security Tab */}
        <TabsContent value="dvn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                DVN Security Configuration
              </CardTitle>
              <CardDescription>
                Configure Decentralized Verifier Networks for each chain path
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {targetChains.length > 0 ? (
                <div className="space-y-6">
                  {targetChains.map(targetChain => (
                    <div key={targetChain.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{chain.name} → {targetChain.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Configure DVN settings for this path
                          </p>
                        </div>
                      </div>
                      <DvnConfiguratorComponent
                        oappAddress={oappAddress}
                        chain={chain}
                        remoteChain={targetChain}
                      />
                    </div>
                  ))}
                  
                  {/* Reverse paths */}
                  {targetChains.map(targetChain => (
                    <div key={`reverse-${targetChain.id}`} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{targetChain.name} → {chain.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Configure DVN settings for reverse path
                          </p>
                        </div>
                      </div>
                      <DvnConfiguratorComponent
                        oappAddress={deployment.onftAddresses?.[targetChain.id] || oappAddress}
                        chain={targetChain}
                        remoteChain={chain}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No target chains configured. Deploy to additional chains to configure paths.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Executor Tab */}
        <TabsContent value="executor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Executor Configuration
              </CardTitle>
              <CardDescription>
                Configure executor settings and gas limits (configured via DVN configurator)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">
                      Executor options are configured in the DVN Security tab. Navigate to the DVN Security tab
                      to configure executor gas limits and options for each chain path.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('dvn')}
                    >
                      Go to DVN Security Configuration
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delegates Tab */}
        <TabsContent value="delegates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Delegate Management
              </CardTitle>
              <CardDescription>
                Manage delegate addresses that can perform operations on behalf of this OApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Delegate */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">Current Delegate</h4>
                {delegate ? (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-mono text-sm">{delegate}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Delegate can perform operations on behalf of this OApp
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveDelegate}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Removing...
                        </>
                      ) : (
                        'Remove'
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No delegate configured</p>
                  </div>
                )}
              </div>

              {/* Set/Update Delegate */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-semibold">{delegate ? 'Update Delegate' : 'Set Delegate'}</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="delegateAddress">Delegate Address</Label>
                    <Input
                      id="delegateAddress"
                      placeholder="0x..."
                      value={newDelegateAddress}
                      onChange={(e) => setNewDelegateAddress(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      The delegate address will be able to perform operations on behalf of this OApp.
                      Set to zero address (0x0000...) to remove delegation.
                    </p>
                  </div>
                  <Button
                    onClick={handleSetDelegate}
                    disabled={!newDelegateAddress || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        {delegate ? 'Update Delegate' : 'Set Delegate'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paths Tab */}
        <TabsContent value="paths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5" />
                Path Configuration
              </CardTitle>
              <CardDescription>
                View and configure message options for each chain path
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {targetChains.length > 0 ? (
                <div className="space-y-4">
                  {targetChains.map(targetChain => (
                    <div key={targetChain.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-semibold">{chain.name} ↔ {targetChain.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Bidirectional path configuration
                          </p>
                        </div>
                        <Badge variant="outline">Active</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Source Contract</Label>
                          <p className="font-mono text-xs">{oappAddress.slice(0, 10)}...</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Destination Contract</Label>
                          <p className="font-mono text-xs">
                            {deployment.onftAddresses?.[targetChain.id]?.slice(0, 10) || 'N/A'}...
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                          Path-specific settings are configured in the DVN Security tab
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab('dvn')}
                        >
                          Configure Path Settings
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Network className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No paths configured. Deploy to additional chains to create paths.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
