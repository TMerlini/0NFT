'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChainSelector } from '@/components/ui/chain-selector'
import { MultiChainSelector } from '@/components/ui/multi-chain-selector'
import { ContractAnalyzer } from '@/components/contract-analyzer'
import { SafeDeploymentWizard } from '@/components/safe-deployment-wizard'
import RealLayerZeroDeployer from '@/components/real-layerzero-deployer'
import { Web3ReadyWrapper } from '@/components/web3-ready-wrapper'
import { WalletDebug } from '@/components/wallet-debug'
import { LayerZeroFeeInfo } from '@/components/layerzero-fee-info'
import { DeploymentStateManager, DeploymentState } from '@/lib/deployment-state-manager'
import { LayerZeroChain, MAINNET_CHAINS } from '@/lib/chains'
import { 
  Zap, 
  Link, 
  Coins, 
  Network, 
  ArrowRight, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  X
} from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState('adapter')
  
  // ONFT Adapter state
  const [sourceChain, setSourceChain] = useState<LayerZeroChain | undefined>()
  const [targetChains, setTargetChains] = useState<LayerZeroChain[]>([])
  const [contractAddress, setContractAddress] = useState('')
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [contractInfo, setContractInfo] = useState<any>(null)
  const [useExistingAdapter, setUseExistingAdapter] = useState(false)
  const [existingAdapterAddress, setExistingAdapterAddress] = useState('')
  const [existingAdapterChain, setExistingAdapterChain] = useState<LayerZeroChain | undefined>()
  const [availableAdapters, setAvailableAdapters] = useState<DeploymentState[]>([])
  
  // New ONFT state
  const [deploymentChains, setDeploymentChains] = useState<LayerZeroChain[]>([])
  const [collectionName, setCollectionName] = useState('')
  const [collectionSymbol, setCollectionSymbol] = useState('')
  const [baseURI, setBaseURI] = useState('')
  
  // Deployment wizard state
  const [showDeploymentWizard, setShowDeploymentWizard] = useState(false)
  const [showOfficialDeployer, setShowOfficialDeployer] = useState(false)
  const [deploymentType, setDeploymentType] = useState<'adapter' | 'new-onft'>('adapter')

  // Load available adapters on mount and when checkbox is toggled
  const loadAvailableAdapters = () => {
    try {
      const allDeployments = DeploymentStateManager.getSuccessfulDeployments()
      console.log('📦 All successful deployments:', allDeployments.length, allDeployments)
      const adapters = allDeployments.filter(d => d.type === 'adapter' && d.adapterAddress)
      console.log('📦 Filtered adapter deployments:', adapters.length, adapters)
      setAvailableAdapters(adapters)
    } catch (error) {
      console.error('Error loading adapters:', error)
      setAvailableAdapters([])
    }
  }

  useEffect(() => {
    loadAvailableAdapters()
  }, [])

  // Reload adapters when checkbox is toggled to ensure we have latest data
  useEffect(() => {
    if (useExistingAdapter) {
      loadAvailableAdapters()
    }
  }, [useExistingAdapter])

  return (
    <Web3ReadyWrapper>
      <div className="container mx-auto px-4 py-8">
      {/* Main Content */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Deploy Cross-Chain NFTs
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Create omnichain NFT collections and adapters with LayerZero&apos;s secure messaging protocol
        </p>
        
        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Link className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">ONFT Adapter</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Bridge existing NFT collections across chains without modifying the original contract
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">New ONFT</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create new omnichain NFT collections that exist natively across multiple blockchains
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Network className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Multi-Chain</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Deploy across 50+ supported chains with LayerZero&apos;s secure messaging protocol
              </CardDescription>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Main deployment interface */}
      <div className="max-w-4xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid grid-cols-2 w-auto">
              <TabsTrigger value="adapter" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                ONFT Adapter
              </TabsTrigger>
              <TabsTrigger value="new" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                New ONFT Collection
              </TabsTrigger>
            </TabsList>
            <LayerZeroFeeInfo />
          </div>

          {/* ONFT Adapter Tab */}
          <TabsContent value="adapter" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5 text-muted-foreground" />
                  Deploy ONFT Adapter for Existing Collection
                </CardTitle>
                <CardDescription>
                  Bridge your existing NFT collection to other chains using the lock-and-mint mechanism.
                  No changes to your original contract required.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step 1: Collection Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <h3 className="text-lg font-semibold">Collection Details</h3>
                  </div>

                  {useExistingAdapter && existingAdapterAddress ? (
                    <Card className="border-blue-500/20 bg-blue-500/10">
                      <CardContent className="pt-4">
                        <div className="text-sm text-blue-200 mb-3">
                          ℹ️ Using existing adapter - Collection details are auto-filled from the adapter configuration.
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="contract-address">NFT Contract Address</Label>
                            <Input 
                              id="contract-address"
                              placeholder="0x..." 
                              className="font-mono bg-muted"
                              value={contractAddress}
                              disabled
                              readOnly
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="source-chain">Source Chain</Label>
                            <Input
                              id="source-chain"
                              value={sourceChain?.name || ''}
                              className="bg-muted"
                              disabled
                              readOnly
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="contract-address">NFT Contract Address</Label>
                          <Input 
                            id="contract-address"
                            placeholder="0x..." 
                            className="font-mono"
                            value={contractAddress}
                            onChange={(e) => setContractAddress(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="source-chain">Source Chain</Label>
                          <ChainSelector
                            value={sourceChain}
                            onValueChange={setSourceChain}
                            placeholder="Select source chain..."
                          />
                        </div>
                      </div>

                      <Button 
                        className="w-full md:w-auto"
                        disabled={!contractAddress || !sourceChain}
                        onClick={() => setShowAnalysis(true)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Analyze Collection
                      </Button>
                    </>
                  )}
                </div>

                {/* Contract Analysis */}
                {showAnalysis && contractAddress && sourceChain && (
                  <ContractAnalyzer
                    contractAddress={contractAddress}
                    chain={sourceChain}
                    onAnalysisComplete={(info) => {
                      setContractInfo(info)
                    }}
                  />
                )}

                {/* Step 2: Target Chains */}
                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <h3 className="text-lg font-semibold text-muted-foreground">Select Target Chains</h3>
                  </div>
                  
                  <MultiChainSelector
                    selectedChains={targetChains}
                    onChainsChange={setTargetChains}
                    includeTestnets={false}
                  />
                </div>

                {/* Step 3: Adapter Options */}
                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <h3 className="text-lg font-semibold text-muted-foreground">Adapter Options</h3>
                  </div>

                  {/* Use Existing Adapter Option */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use-existing-adapter"
                        checked={useExistingAdapter}
                        onChange={(e) => {
                          setUseExistingAdapter(e.target.checked)
                          if (!e.target.checked) {
                            setExistingAdapterAddress('')
                            setExistingAdapterChain(undefined)
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="use-existing-adapter" className="cursor-pointer">
                        Use existing deployed adapter
                      </Label>
                    </div>

                    {useExistingAdapter && (
                      <Card className="border-blue-500/20 bg-blue-500/10">
                        <CardContent className="pt-4 space-y-3">
                          <div className="space-y-2">
                            <Label>Select Existing Adapter</Label>
                            {availableAdapters.length > 0 ? (
                              <select
                                className="w-full p-2 rounded-md border bg-background"
                                value={existingAdapterAddress}
                                onChange={(e) => {
                                  const adapter = availableAdapters.find(a => a.adapterAddress === e.target.value)
                                  if (adapter) {
                                    setExistingAdapterAddress(adapter.adapterAddress!)
                                    setExistingAdapterChain(adapter.sourceChain)
                                    setContractAddress(adapter.contractAddress || '')
                                    setSourceChain(adapter.sourceChain)
                                  }
                                }}
                              >
                                <option value="">Select an adapter...</option>
                                {availableAdapters.map((adapter) => (
                                  <option key={adapter.id} value={adapter.adapterAddress}>
                                    {adapter.collectionName || 'Unnamed'} - {adapter.adapterAddress?.slice(0, 6)}...{adapter.adapterAddress?.slice(-4)} ({adapter.sourceChain?.name})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                                No deployed adapters found. Deploy a new adapter first.
                              </div>
                            )}
                          </div>

                          {existingAdapterAddress && (
                            <div className="p-2 bg-green-500/10 border border-green-500/20 rounded text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-green-600 dark:text-green-400">
                                  ✅ Using existing adapter: {existingAdapterAddress.slice(0, 8)}...{existingAdapterAddress.slice(-6)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setUseExistingAdapter(false)
                                    setExistingAdapterAddress('')
                                    setExistingAdapterChain(undefined)
                                    setContractAddress('')
                                    setSourceChain(undefined)
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                              {existingAdapterChain && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Chain: {existingAdapterChain.name}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="text-xs text-muted-foreground">
                            💡 <strong>Workflow:</strong> Select target chains below, then deploy. Collection details (NFT contract & source chain) are auto-filled from the adapter. Only ONFT contracts on target chains will be deployed.
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Deploy Options */}
                  <div className="space-y-4 pt-4 border-t">
                    {/* Official LayerZero V2 Notice */}
                    <Card className="border-blue-500/20 bg-blue-500/10 mb-4">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-blue-400" />
                          <span className="font-semibold text-blue-300">Recommended: Official LayerZero V2</span>
                        </div>
                        <p className="text-sm text-blue-200 mb-3">
                          Use the official @layerzerolabs/onft-evm package for production-ready deployments with proper V2 integration.
                        </p>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Button 
                        disabled={
                          useExistingAdapter 
                            ? (!existingAdapterAddress || targetChains.length === 0)
                            : (!contractAddress || !sourceChain || targetChains.length === 0)
                        } 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => {
                          setDeploymentType('adapter')
                          setShowOfficialDeployer(true)
                        }}
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        {useExistingAdapter ? 'Add Target Chains to Adapter' : 'Deploy Official ONFT Adapter'}
                        {(useExistingAdapter 
                          ? (!existingAdapterAddress || targetChains.length === 0)
                          : (!contractAddress || !sourceChain || targetChains.length === 0)) && 
                          ' (Complete form first)'
                        }
                      </Button>
                      
                      <Button 
                        disabled={
                          useExistingAdapter 
                            ? (!existingAdapterAddress || targetChains.length === 0)
                            : (!contractAddress || !sourceChain || targetChains.length === 0)
                        } 
                        variant="outline"
                        onClick={() => {
                          setDeploymentType('adapter')
                          setShowDeploymentWizard(true)
                        }}
                      >
                        {useExistingAdapter ? 'Add Chains (Demo)' : 'Deploy Demo Version'}
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 <strong>Official:</strong> Real LayerZero V2 contracts for production use. 
                      <strong>Demo:</strong> For testing and development.
                      {useExistingAdapter && ' When using an existing adapter, only ONFT contracts on target chains will be deployed.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* New ONFT Collection Tab */}
          <TabsContent value="new" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                  Create New Omnichain NFT Collection
                </CardTitle>
                <CardDescription>
                  Deploy a new NFT collection that exists natively across multiple chains using burn-and-mint mechanism.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Collection Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <h3 className="text-lg font-semibold">Collection Configuration</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="collection-name">Collection Name</Label>
                      <Input 
                        id="collection-name"
                        placeholder="My Omnichain NFTs"
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="collection-symbol">Symbol</Label>
                      <Input 
                        id="collection-symbol"
                        placeholder="ONFT"
                        value={collectionSymbol}
                        onChange={(e) => setCollectionSymbol(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="base-uri">Base URI</Label>
                    <Input 
                      id="base-uri"
                      placeholder="https://api.example.com/metadata/"
                      value={baseURI}
                      onChange={(e) => setBaseURI(e.target.value)}
                    />
                  </div>
                </div>

                {/* Chain Selection */}
                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <h3 className="text-lg font-semibold">Select Deployment Chains</h3>
                  </div>
                  
                  <MultiChainSelector
                    selectedChains={deploymentChains}
                    onChainsChange={setDeploymentChains}
                    includeTestnets={false}
                    maxSelections={10}
                  />
                </div>

                {/* Deploy */}
                <div className="space-y-4 pt-6 border-t">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <h3 className="text-lg font-semibold text-muted-foreground">Deploy Collection</h3>
                  </div>
                  
                  {/* Official LayerZero V2 Notice */}
                  <Card className="border-blue-500/20 bg-blue-500/10 mb-4">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-blue-400" />
                        <span className="font-semibold text-blue-300">Recommended: Official LayerZero V2</span>
                      </div>
                      <p className="text-sm text-blue-200 mb-3">
                        Use the official @layerzerolabs/onft-evm package for production-ready deployments with proper V2 integration.
                      </p>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Button 
                      disabled={!collectionName || !collectionSymbol || deploymentChains.length < 2}
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setDeploymentType('new-onft')
                        setShowOfficialDeployer(true)
                      }}
                    >
                      <Network className="h-4 w-4 mr-2" />
                      Deploy Official ONFT Collection
                      {(!collectionName || !collectionSymbol || deploymentChains.length < 2) && 
                        ' (Select at least 2 chains)'
                      }
                    </Button>
                    
                    <Button 
                      disabled={!collectionName || !collectionSymbol || deploymentChains.length < 2}
                      variant="outline"
                      onClick={() => {
                        setDeploymentType('new-onft')
                        setShowDeploymentWizard(true)
                      }}
                    >
                      Deploy Demo Version
                    </Button>
                  </div>
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 <strong>Official:</strong> Real LayerZero V2 contracts for production use. 
                    <strong>Demo:</strong> For testing and development.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <strong className="text-foreground">ONFT Adapter:</strong> Locks original NFTs, mints on destination chains</li>
                <li>• <strong className="text-foreground">New ONFT:</strong> Burns on source, mints on destination for true omnichain NFTs</li>
                <li>• <strong className="text-foreground">LayerZero:</strong> Secure cross-chain messaging without bridges</li>
                <li>• <strong className="text-foreground">Mesh Network:</strong> All contracts interconnected for seamless transfers</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-muted-foreground" />
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• <a href="https://docs.layerzero.network" className="underline hover:text-foreground transition-colors">LayerZero Documentation</a></li>
                <li>• <a href="#" className="underline hover:text-foreground transition-colors">ONFT Contract Examples</a></li>
                <li>• <a href="#" className="underline hover:text-foreground transition-colors">Supported Chains List</a></li>
                <li>• <a href="#" className="underline hover:text-foreground transition-colors">Gas Estimation Tool</a></li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Deployment Wizard */}
      <SafeDeploymentWizard
        isOpen={showDeploymentWizard}
        onClose={() => setShowDeploymentWizard(false)}
        deploymentType={deploymentType}
        
        // ONFT Adapter props
        sourceChain={sourceChain}
        targetChains={targetChains}
        contractAddress={contractAddress}
        contractInfo={contractInfo}
        
        // New ONFT props
        chains={deploymentChains}
        collectionName={collectionName}
        collectionSymbol={collectionSymbol}
        baseURI={baseURI}
      />

      {/* Real LayerZero V2 Deployer */}
      <RealLayerZeroDeployer
        isOpen={showOfficialDeployer}
        onClose={() => setShowOfficialDeployer(false)}
        deploymentType={deploymentType}
        
        // ONFT Adapter props
        sourceChain={useExistingAdapter ? existingAdapterChain : sourceChain}
        targetChains={targetChains}
        contractAddress={contractAddress}
        contractInfo={contractInfo}
        existingAdapterAddress={useExistingAdapter ? existingAdapterAddress : undefined}
        existingAdapterChain={useExistingAdapter ? existingAdapterChain : undefined}
        
        // New ONFT props
        chains={deploymentChains}
        collectionName={collectionName}
        collectionSymbol={collectionSymbol}
        baseURI={baseURI}
      />
      
      {/* Debug component - remove in production */}
      <WalletDebug />
    </div>
    </Web3ReadyWrapper>
  )
}
