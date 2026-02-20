'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DeploymentStateManager, DeploymentState } from '@/lib/deployment-state-manager'
import { LAYERZERO_CHAINS } from '@/lib/chains'
import { AutoVerifyModal } from '@/components/auto-verify-modal'
import { SimpleVerificationButton } from '@/components/simple-verification-button'
import { PeerConfiguratorComponent } from '@/components/peer-configurator'
import { DvnConfiguratorComponent } from '@/components/dvn-configurator'
import { 
  FolderOpen, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  RefreshCw,
  Shield,
  AlertTriangle,
  Zap,
  Image,
  Download,
  Upload
} from 'lucide-react'

export default function PortfolioPage() {
  const [deployments, setDeployments] = useState<DeploymentState[]>([])
  const [mounted, setMounted] = useState(false)
  const [autoVerifyModal, setAutoVerifyModal] = useState<{
    isOpen: boolean
    contractAddress: string
    network: 'ethereum' | 'base'
    contractType: 'ONFT721Adapter' | 'ONFT721'
    constructorArgs: string
  }>({
    isOpen: false,
    contractAddress: '',
    network: 'ethereum',
    contractType: 'ONFT721Adapter',
    constructorArgs: ''
  })
  const [baseURIDialog, setBaseURIDialog] = useState<{
    isOpen: boolean
    onftAddress: string
    originalNFTAddress: string
    chainId: number
    tokenId: number
  }>({
    isOpen: false,
    onftAddress: '',
    originalNFTAddress: '',
    chainId: 0,
    tokenId: 1
  })
  const [manualBaseURI, setManualBaseURI] = useState('')
  const [useAutoFetch, setUseAutoFetch] = useState(true)

  useEffect(() => {
    setMounted(true)
    loadDeployments()
    
    // Expose utility functions to window for console access
    if (typeof window !== 'undefined') {
      (window as any).mergeAdapterDeployments = (adapterAddress: string) => {
        try {
          const allDeployments = DeploymentStateManager.getAllDeploymentStates()
          
          // Find all deployments with this adapter address
          const matchingDeployments = allDeployments.filter(d => 
            d.adapterAddress && 
            d.adapterAddress.toLowerCase() === adapterAddress.toLowerCase() &&
            d.type === 'adapter'
          )
          
          if (matchingDeployments.length <= 1) {
            console.log(`✅ No duplicates found for adapter ${adapterAddress}. Only ${matchingDeployments.length} deployment(s) found.`)
            return { success: true, message: 'No duplicates to merge', merged: 0 }
          }
          
          console.log(`🔍 Found ${matchingDeployments.length} deployments for adapter ${adapterAddress}. Merging...`)
          
          // Sort by timestamp to keep the oldest as the base
          const sortedDeployments = matchingDeployments.sort((a, b) => a.timestamp - b.timestamp)
          const baseDeployment = sortedDeployments[0]
          const duplicatesToMerge = sortedDeployments.slice(1)
          
          // Merge all duplicates into the base
          let mergedDeployment = { ...baseDeployment }
          
          for (const duplicate of duplicatesToMerge) {
            const mergedOnftAddresses = {
              ...(mergedDeployment.onftAddresses || {}),
              ...(duplicate.onftAddresses || {})
            }
            
            const existingTargetChainIds = new Set(
              (mergedDeployment.targetChains || []).map(c => c.id)
            )
            const mergedTargetChains = [
              ...(mergedDeployment.targetChains || []),
              ...(duplicate.targetChains || []).filter(c => !existingTargetChainIds.has(c.id))
            ]
            
            const existingStepIds = new Set(
              (mergedDeployment.steps || []).map(s => s.id)
            )
            const mergedSteps = [
              ...(mergedDeployment.steps || []),
              ...(duplicate.steps || []).filter(s => !existingStepIds.has(s.id))
            ]
            
            const mergedCompletedSteps = {
              ...(mergedDeployment.completedSteps || {}),
              ...(duplicate.completedSteps || {})
            }
            
            mergedDeployment = {
              ...mergedDeployment,
              onftAddresses: mergedOnftAddresses,
              targetChains: mergedTargetChains,
              steps: mergedSteps,
              completedSteps: mergedCompletedSteps,
              timestamp: Math.max(mergedDeployment.timestamp, duplicate.timestamp) // Keep the latest timestamp
            }
          }
          
          // Remove all duplicates and save the merged deployment
          const allOtherDeployments = allDeployments.filter(d => 
            !matchingDeployments.some(m => m.id === d.id)
          )
          
          const updatedDeployments = [
            ...allOtherDeployments,
            mergedDeployment
          ].sort((a, b) => b.timestamp - a.timestamp)
          
          localStorage.setItem('onft-deployment-states', JSON.stringify(updatedDeployments))
          
          console.log(`✅ Successfully merged ${duplicatesToMerge.length} duplicate(s) into base deployment.`)
          console.log(`📊 Merged deployment now has ${Object.keys(mergedDeployment.onftAddresses || {}).length} ONFT contracts across ${mergedDeployment.targetChains?.length || 0} chains.`)
          
          // Reload the deployments in the UI
          loadDeployments()
          
          return {
            success: true,
            message: `Merged ${duplicatesToMerge.length} duplicate(s)`,
            merged: duplicatesToMerge.length,
            deployment: mergedDeployment
          }
        } catch (error: any) {
          console.error('❌ Failed to merge deployments:', error)
          return { success: false, error: error.message }
        }
      }
      
      (window as any).listAdapterDeployments = (adapterAddress?: string) => {
        const allDeployments = DeploymentStateManager.getAllDeploymentStates()
        const adapterDeployments = adapterAddress
          ? allDeployments.filter(d => 
              d.adapterAddress && 
              d.adapterAddress.toLowerCase() === adapterAddress.toLowerCase() &&
              d.type === 'adapter'
            )
          : allDeployments.filter(d => d.type === 'adapter' && d.adapterAddress)
        
        console.table(adapterDeployments.map(d => ({
          id: d.id,
          adapterAddress: d.adapterAddress,
          chains: d.targetChains?.map(c => c.name).join(', ') || 'None',
          onftCount: Object.keys(d.onftAddresses || {}).length,
          timestamp: new Date(d.timestamp).toLocaleString()
        })))
        
        return adapterDeployments
      }
      
      console.log('💡 Console utilities available:')
      console.log('  - mergeAdapterDeployments(adapterAddress) - Merge duplicate deployments for an adapter')
      console.log('  - listAdapterDeployments([adapterAddress]) - List all adapter deployments')
    }
  }, [])

  const loadDeployments = () => {
    const allDeployments = DeploymentStateManager.getAllDeploymentStates()
    setDeployments(allDeployments.sort((a, b) => b.timestamp - a.timestamp))
  }

  const exportDeployments = () => {
    try {
      DeploymentStateManager.exportDeploymentsToFile()
      alert('✅ Deployments exported successfully!')
    } catch (error: any) {
      alert(`❌ Failed to export deployments: ${error.message}`)
    }
  }

  const importDeployments = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const result = await DeploymentStateManager.importDeploymentsFromFile(file)
        alert(`✅ Imported ${result.imported} deployments${result.skipped > 0 ? `, skipped ${result.skipped} duplicates` : ''}${result.errors.length > 0 ? `\n⚠️ ${result.errors.length} errors` : ''}`)
        loadDeployments()
      } catch (error: any) {
        alert(`❌ Failed to import deployments: ${error.message}`)
      }
    }
    input.click()
  }

  const clearDeployment = (deploymentId: string) => {
    const confirmed = confirm('Are you sure you want to remove this deployment from your portfolio?')
    if (confirmed) {
      const states = DeploymentStateManager.getAllDeploymentStates()
      const filteredStates = states.filter(s => s.id !== deploymentId)
      localStorage.setItem('onft-deployment-states', JSON.stringify(filteredStates))
      loadDeployments()
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const openAutoVerifyModal = (
    contractAddress: string, 
    network: 'ethereum' | 'base',
    contractType: 'ONFT721Adapter' | 'ONFT721',
    constructorArgs: string
  ) => {
    setAutoVerifyModal({
      isOpen: true,
      contractAddress,
      network,
      contractType,
      constructorArgs
    })
  }

  const handleVerificationComplete = (success: boolean) => {
    if (success) {
      // Reload deployments to update verification status
      loadDeployments()
    }
  }

  const setBaseURIForONFT = async (
    onftAddress: string,
    originalNFTAddress: string,
    chainId: number,
    tokenId: number = 1,
    manualBaseURIValue?: string
  ) => {
    if (!window.ethereum) {
      alert('Please connect your wallet')
      return
    }

    try {
      // Helper to get network params for wallet_addEthereumChain
      const getNetworkParams = (chainId: number) => {
        const params: any = {
          chainId: `0x${chainId.toString(16)}`,
          rpcUrls: [],
          blockExplorerUrls: [],
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
          }
        }
        
        switch (chainId) {
          case 56: // BNB Smart Chain
            params.chainName = 'BNB Smart Chain'
            params.rpcUrls = ['https://bsc-dataseed1.binance.org']
            params.blockExplorerUrls = ['https://bscscan.com']
            params.nativeCurrency = {
              name: 'BNB',
              symbol: 'BNB',
              decimals: 18
            }
            break
          case 8453: // Base
            params.chainName = 'Base'
            params.rpcUrls = ['https://mainnet.base.org']
            params.blockExplorerUrls = ['https://basescan.org']
            break
          default:
            params.chainName = 'Unknown Network'
            params.rpcUrls = ['https://eth.llamarpc.com']
        }
        
        return params
      }

      // Get chain info for display
      const chain = LAYERZERO_CHAINS.find(c => c.id === chainId)
      const chainName = chain?.name || 'Unknown Network'

      // Check current network
      let currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
      currentChainId = parseInt(currentChainId, 16)
      
      // Switch network if needed
      if (currentChainId !== chainId) {
        const switchConfirm = confirm(`Please switch to ${chainName} network to set baseURI. Switch now?`)
        if (!switchConfirm) {
          return
        }

        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          })
        } catch (switchError: any) {
          // If chain doesn't exist (error 4902), add it
          if (switchError.code === 4902) {
            const networkParams = getNetworkParams(chainId)
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [networkParams],
            })
          } else {
            throw switchError
          }
        }
        
        // Wait for network switch and verify
        await new Promise(resolve => setTimeout(resolve, 3000))
        const newChainId = await window.ethereum.request({ method: 'eth_chainId' })
        if (parseInt(newChainId, 16) !== chainId) {
          throw new Error(`Failed to switch to ${chainName}. Please manually switch and try again.`)
        }
      }

      // Recreate provider after network switch (important!)
      const provider = new ethers.providers.Web3Provider(window.ethereum as any, 'any')
      const signer = provider.getSigner()
      const userAddress = await signer.getAddress()

      let baseURI = manualBaseURIValue
      
      // If manual baseURI provided, use it; otherwise auto-fetch
      if (!baseURI) {
        // Get tokenURI from original NFT (always on Ethereum, use public RPC)
        console.log('🔍 Getting tokenURI from original NFT...')
        const ethProvider = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com')
        
        const originalNFT = new ethers.Contract(
          originalNFTAddress,
          ['function tokenURI(uint256) view returns (string)'],
          ethProvider
        )
        
        const tokenURI = await originalNFT.tokenURI(tokenId)
        console.log('📋 Original tokenURI:', tokenURI)
        
        // Extract baseURI (remove token ID)
        // For on-chain hybrid NFTs, the API endpoint should be the same
        // The API will fetch the original transaction from Ethereum to decode RLE pixels
        baseURI = tokenURI
        // Try to extract baseURI by removing the token ID
        if (tokenURI.includes(`/${tokenId}`)) {
          baseURI = tokenURI.replace(`/${tokenId}`, '/')
        } else if (tokenURI.endsWith(tokenId.toString())) {
          baseURI = tokenURI.slice(0, -tokenId.toString().length)
        }
        
        // Ensure it ends with /
        if (baseURI && !baseURI.endsWith('/')) {
          baseURI += '/'
        }
        
        console.log('📋 Auto-extracted BaseURI:', baseURI)
        console.log('ℹ️  Note: For on-chain hybrid NFTs, the API will fetch original transaction data from Ethereum')
      } else {
        // Ensure manual baseURI ends with /
        if (baseURI && !baseURI.endsWith('/')) {
          baseURI += '/'
        }
        console.log('📋 Using manual BaseURI:', baseURI)
      }
      
      // Verify we're the owner of the ONFT contract
      const baseONFT = new ethers.Contract(
        onftAddress,
        [
          'function setBaseURI(string calldata) external onlyOwner',
          'function owner() view returns (address)'
        ],
        signer
      )
      
      const contractOwner = await baseONFT.owner()
      if (contractOwner.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error('You are not the contract owner!')
      }
      
      // Set the baseURI
      console.log('📝 Setting baseURI on ONFT contract...')
      const tx = await baseONFT.setBaseURI(baseURI)
      console.log('📡 Transaction:', tx.hash)
      
      alert(`Setting baseURI... Transaction: ${tx.hash}\n\nWaiting for confirmation...`)
      
      await tx.wait()
      console.log('✅ BaseURI set successfully!')
      
      // Verify it was set by checking a few things
      const baseONFTWithURI = new ethers.Contract(
        onftAddress,
        [
          'function tokenURI(uint256) view returns (string)',
          'function ownerOf(uint256) view returns (address)'
        ],
        signer.provider
      )
      
      // Check if token exists first
      let tokenExists = false
      try {
        await baseONFTWithURI.ownerOf(tokenId)
        tokenExists = true
      } catch (error) {
        console.log('⚠️  Token does not exist yet, but baseURI is set')
      }
      
      if (tokenExists) {
        const newTokenURI = await baseONFTWithURI.tokenURI(tokenId)
        console.log('✅ Verified new tokenURI:', newTokenURI)
        alert(`✅ BaseURI set successfully!\n\nTransaction: ${tx.hash}\n\nNew tokenURI: ${newTokenURI}\n\n📋 For on-chain hybrid NFTs:\n- The API will fetch the original transaction from Ethereum\n- OpenSea may take a few minutes to refresh metadata\n- You can manually refresh on OpenSea if needed`)
      } else {
        alert(`✅ BaseURI set successfully!\n\nTransaction: ${tx.hash}\n\nNote: Token #${tokenId} doesn't exist yet. Once you bridge it, it will use this baseURI.\n\n📋 For on-chain hybrid NFTs:\n- The API endpoint will fetch original transaction data from Ethereum\n- The bridged NFT will display correctly once minted`)
      }
      
    } catch (error: any) {
      console.error('❌ Error setting baseURI:', error)
      alert(`Error setting baseURI: ${error.message || error}`)
    }
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getDeploymentProgress = (deployment: DeploymentState) => {
    try {
      return DeploymentStateManager.getDeploymentProgress(deployment)
    } catch (error) {
      console.warn('Error getting deployment progress:', error)
      return {
        totalSteps: 0,
        completedSteps: 0,
        nextStep: null,
        canResume: false
      }
    }
  }

  const getExplorerUrl = (chainId: number, address: string) => {
    const explorers: { [key: number]: string } = {
      1: 'https://etherscan.io',
      8453: 'https://basescan.org',
      137: 'https://polygonscan.com',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
    }
    
    const baseUrl = explorers[chainId] || 'https://etherscan.io'
    return `${baseUrl}/address/${address}`
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-card/30">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Portfolio
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              View and manage your deployed ONFT contracts and cross-chain infrastructure
            </p>
            <div className="flex justify-center gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={loadDeployments}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Portfolio
              </Button>
              <Button
                variant="outline"
                onClick={exportDeployments}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                onClick={importDeployments}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Content */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="deployments" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="deployments">Deployments</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
          </TabsList>

          {/* Deployments Tab */}
          <TabsContent value="deployments" className="space-y-6">
            {deployments.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Deployments Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by deploying your first ONFT contract or adapter
                  </p>
                  <Button asChild>
                    <a href="/">Deploy Now</a>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {deployments.map((deployment, index) => {
                  const progress = getDeploymentProgress(deployment)
                  const isComplete = progress.completedSteps === progress.totalSteps
                  const hasFailures = progress.completedSteps === 0
                  const isMostRecent = index === 0 // First deployment is most recent (sorted by timestamp desc)

                  return (
                    <Card key={deployment.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {deployment.type === 'adapter' ? 'ONFT Adapter' : 'New ONFT Collection'}
                              {isComplete ? (
                                <Badge variant="default" className="bg-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              ) : hasFailures ? (
                                <Badge variant="destructive">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Failed
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <Clock className="h-3 w-3 mr-1" />
                                  In Progress
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription>
                              Deployed {formatTimestamp(deployment.timestamp)} • 
                              {progress.completedSteps}/{progress.totalSteps} steps completed
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => clearDeployment(deployment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Deployment Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Deployer</p>
                            <p className="font-mono">{deployment.deployerAddress.slice(0, 6)}...{deployment.deployerAddress.slice(-4)}</p>
                          </div>
                          {deployment.type === 'adapter' && deployment.sourceChain && (
                            <div>
                              <p className="text-muted-foreground">Source Chain</p>
                              <p>{deployment.sourceChain.name}</p>
                            </div>
                          )}
                          {deployment.collectionName && (
                            <div>
                              <p className="text-muted-foreground">Collection</p>
                              <p>{deployment.collectionName} ({deployment.collectionSymbol})</p>
                            </div>
                          )}
                        </div>

                        {/* Contract Addresses */}
                        {(deployment.adapterAddress || deployment.onftAddresses) && (
                          <div className="space-y-3">
                            <h4 className="font-medium">Deployed Contracts</h4>
                            
                            {deployment.adapterAddress && (
                              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                <div>
                                  <p className="font-medium">ONFT Adapter</p>
                                  <p className="text-sm text-muted-foreground">{deployment.sourceChain?.name}</p>
                                  {/* Verification Status */}
                                  {(() => {
                                    const adapterStep = deployment.steps?.find(s => s.contractAddress === deployment.adapterAddress);
                                    return adapterStep && (
                                      <div className="flex items-center gap-1 mt-1">
                                        {adapterStep.verified ? (
                                          <>
                                            <Shield className="h-3 w-3 text-green-400" />
                                            <span className="text-xs text-green-400">Verified</span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertTriangle className="h-3 w-3 text-yellow-400" />
                                            <span className="text-xs text-yellow-400">Not Verified</span>
                                          </>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <code className="text-sm bg-gray-800 text-gray-200 px-2 py-1 rounded">
                                    {deployment.adapterAddress.slice(0, 6)}...{deployment.adapterAddress.slice(-4)}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(deployment.adapterAddress!)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" asChild>
                                    <a
                                      href={getExplorerUrl(deployment.sourceChain?.id || 1, deployment.adapterAddress)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                  {/* Verification Button */}
                                  {(() => {
                                    const adapterStep = deployment.steps?.find(s => s.contractAddress === deployment.adapterAddress);
                                    return adapterStep && !adapterStep.verified && deployment.sourceChain && (
                                      <SimpleVerificationButton
                                        contractAddress={deployment.adapterAddress!}
                                        chainId={deployment.sourceChain.id}
                                        chainName={deployment.sourceChain.name}
                                        sourceCode={adapterStep.sourceCode}
                                        constructorArgs={adapterStep.constructorArgs}
                                        contractName={adapterStep.contractName}
                                        compilerVersion={adapterStep.compilerVersion}
                                      />
                                    );
                                  })()}
                                </div>
                              </div>
                            )}

                            {deployment.onftAddresses && Object.entries(deployment.onftAddresses).map(([chainId, address]) => {
                              const chain = deployment.targetChains?.find(c => c.id === parseInt(chainId)) ||
                                           deployment.chains?.find(c => c.id === parseInt(chainId))
                              
                              return (
                                <div key={chainId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                  <div>
                                    <p className="font-medium">ONFT Contract</p>
                                    <p className="text-sm text-muted-foreground">{chain?.name || `Chain ${chainId}`}</p>
                                    {/* Verification Status */}
                                    {(() => {
                                      const onftStep = deployment.steps?.find(s => s.contractAddress === address);
                                      return onftStep && (
                                        <div className="flex items-center gap-1 mt-1">
                                          {onftStep.verified ? (
                                            <>
                                              <Shield className="h-3 w-3 text-green-400" />
                                              <span className="text-xs text-green-400">Verified</span>
                                            </>
                                          ) : (
                                            <>
                                              <AlertTriangle className="h-3 w-3 text-yellow-400" />
                                              <span className="text-xs text-yellow-400">Not Verified</span>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <code className="text-sm bg-gray-800 text-gray-200 px-2 py-1 rounded">
                                      {address.slice(0, 6)}...{address.slice(-4)}
                                    </code>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(address)}
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="sm" asChild>
                                      <a
                                        href={getExplorerUrl(parseInt(chainId), address)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </Button>
                                    {/* Verification Button */}
                                    {(() => {
                                      const onftStep = deployment.steps?.find(s => s.contractAddress === address);
                                      return onftStep && !onftStep.verified && chain && (
                                        <SimpleVerificationButton
                                          contractAddress={address}
                                          chainId={parseInt(chainId)}
                                          chainName={chain.name}
                                          sourceCode={onftStep.sourceCode}
                                          constructorArgs={onftStep.constructorArgs}
                                          contractName={onftStep.contractName}
                                          compilerVersion={onftStep.compilerVersion}
                                        />
                                      );
                                    })()}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Peer Configuration */}
                        {deployment.adapterAddress && deployment.onftAddresses && Object.keys(deployment.onftAddresses).length > 0 && (
                          <div className="mt-4">
                            {Object.entries(deployment.onftAddresses).map(([chainId, onftAddress]) => {
                              const targetChain = deployment.targetChains?.find(c => c.id === parseInt(chainId)) ||
                                                 deployment.chains?.find(c => c.id === parseInt(chainId))
                              
                              if (!targetChain || !deployment.sourceChain) return null
                              
                              return (
                                <PeerConfiguratorComponent
                                  key={chainId}
                                  adapterAddress={deployment.adapterAddress!}
                                  sourceChain={deployment.sourceChain}
                                  onftAddress={onftAddress}
                                  targetChain={targetChain}
                                />
                              )
                            })}
                          </div>
                        )}

                        {/* DVN Configuration - Show for all deployments with contracts */}
                        {deployment.adapterAddress && deployment.onftAddresses && Object.keys(deployment.onftAddresses).length > 0 && (
                          <div className="mt-4 space-y-3">
                            <h4 className="font-medium text-sm">DVN Security Configuration</h4>
                            <p className="text-xs text-muted-foreground mb-3">
                              Configure DVNs for both directions to enable bidirectional bridging
                            </p>
                            
                            {/* DVN Config for Source Chain → Target Chains (using adapter) */}
                            {Object.entries(deployment.onftAddresses).map(([chainId, onftAddress]) => {
                              const targetChain = deployment.targetChains?.find(c => c.id === parseInt(chainId)) ||
                                                 deployment.chains?.find(c => c.id === parseInt(chainId))
                              
                              if (!targetChain || !deployment.sourceChain) return null
                              
                              return (
                                <div key={`dvn-src-${chainId}`} className="p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        {deployment.sourceChain.name} → {targetChain.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Configure DVNs on {deployment.sourceChain.name} adapter
                                      </p>
                                    </div>
                                    <DvnConfiguratorComponent
                                      oappAddress={deployment.adapterAddress!}
                                      chain={deployment.sourceChain}
                                      remoteChain={targetChain}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                            
                            {/* DVN Config for Target Chains → Source Chain (using ONFT contracts) */}
                            {Object.entries(deployment.onftAddresses).map(([chainId, onftAddress]) => {
                              const targetChain = deployment.targetChains?.find(c => c.id === parseInt(chainId)) ||
                                                 deployment.chains?.find(c => c.id === parseInt(chainId))
                              
                              if (!targetChain || !deployment.sourceChain) return null
                              
                              return (
                                <div key={`dvn-dst-${chainId}`} className="p-3 bg-muted/50 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-medium flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        {targetChain.name} → {deployment.sourceChain.name}
                                      </p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Configure DVNs on {targetChain.name} ONFT contract
                                      </p>
                                    </div>
                                    <DvnConfiguratorComponent
                                      oappAddress={onftAddress}
                                      chain={targetChain}
                                      remoteChain={deployment.sourceChain}
                                    />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Set BaseURI for ONFT contracts - Show for adapter deployments */}
                        {deployment.type === 'adapter' && 
                         deployment.onftAddresses && 
                         Object.keys(deployment.onftAddresses).length > 0 && (
                          <div className="mt-4 space-y-2">
                            {Object.entries(deployment.onftAddresses).map(([chainId, onftAddress]) => {
                              const targetChain = deployment.targetChains?.find(c => c.id === parseInt(chainId)) ||
                                                 deployment.chains?.find(c => c.id === parseInt(chainId))
                              
                              if (!targetChain) return null
                              
                              // Use contractAddress if available, otherwise try to get from deployment state
                              const originalNFTAddress = deployment.contractAddress || '0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef'
                              
                              return (
                                <div key={chainId} className="flex flex-col gap-2 p-3 bg-muted rounded">
                                  <div className="flex items-center gap-2">
                                    <Image className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                      Set metadata URI for {targetChain.name} ONFT
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    For on-chain hybrid NFTs: The API will fetch original transaction data from Ethereum to decode RLE pixels.
                                  </p>
                                  <div className="flex gap-2">
                                    <Dialog 
                                      open={baseURIDialog.isOpen && baseURIDialog.onftAddress === onftAddress} 
                                      onOpenChange={(open) => {
                                        if (!open) {
                                          setBaseURIDialog({ isOpen: false, onftAddress: '', originalNFTAddress: '', chainId: 0, tokenId: 1 })
                                          setManualBaseURI('')
                                          setUseAutoFetch(true)
                                        }
                                      }}
                                    >
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setBaseURIDialog({
                                            isOpen: true,
                                            onftAddress,
                                            originalNFTAddress,
                                            chainId: parseInt(chainId),
                                            tokenId: 7 // Use token ID 7 as sample
                                          })
                                        }}
                                      >
                                        Set BaseURI
                                      </Button>
                                      <DialogContent>
                                        <DialogHeader>
                                          <DialogTitle>Set Base URI</DialogTitle>
                                          <DialogDescription>
                                            Configure the base URI for token metadata on this chain.
                                          </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                          <div className="flex items-center space-x-2">
                                            <input
                                              type="radio"
                                              id="auto-fetch"
                                              name="baseuri-mode"
                                              checked={useAutoFetch}
                                              onChange={() => setUseAutoFetch(true)}
                                              className="h-4 w-4"
                                            />
                                            <Label htmlFor="auto-fetch" className="cursor-pointer">
                                              Auto-fetch from original NFT
                                            </Label>
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <input
                                              type="radio"
                                              id="manual-input"
                                              name="baseuri-mode"
                                              checked={!useAutoFetch}
                                              onChange={() => setUseAutoFetch(false)}
                                              className="h-4 w-4"
                                            />
                                            <Label htmlFor="manual-input" className="cursor-pointer">
                                              Enter manually
                                            </Label>
                                          </div>
                                          
                                          {!useAutoFetch && (
                                            <div className="space-y-2">
                                              <Label htmlFor="manual-baseuri">Base URI</Label>
                                              <Input
                                                id="manual-baseuri"
                                                placeholder="https://api.example.com/metadata/"
                                                value={manualBaseURI}
                                                onChange={(e) => setManualBaseURI(e.target.value)}
                                              />
                                              <p className="text-xs text-muted-foreground">
                                                Enter the base URI. The token ID will be appended automatically (e.g., baseURI + tokenId).
                                              </p>
                                            </div>
                                          )}
                                          
                                          {useAutoFetch && (
                                            <p className="text-xs text-muted-foreground">
                                              The base URI will be automatically extracted from the original NFT contract on Ethereum.
                                            </p>
                                          )}
                                          
                                          <div className="flex justify-end gap-2">
                                            <Button
                                              variant="outline"
                                              onClick={() => {
                                                setBaseURIDialog({ isOpen: false, onftAddress: '', originalNFTAddress: '', chainId: 0, tokenId: 1 })
                                                setManualBaseURI('')
                                                setUseAutoFetch(true)
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              onClick={async () => {
                                                // Store values before clearing state
                                                const currentDialog = { ...baseURIDialog }
                                                const baseURIValue = useAutoFetch ? undefined : manualBaseURI
                                                
                                                // Close dialog first
                                                setBaseURIDialog({ isOpen: false, onftAddress: '', originalNFTAddress: '', chainId: 0, tokenId: 1 })
                                                setManualBaseURI('')
                                                setUseAutoFetch(true)
                                                
                                                // Then call the function with stored values
                                                await setBaseURIForONFT(
                                                  currentDialog.onftAddress,
                                                  currentDialog.originalNFTAddress,
                                                  currentDialog.chainId,
                                                  currentDialog.tokenId,
                                                  baseURIValue
                                                )
                                              }}
                                            >
                                              Set Base URI
                                            </Button>
                                          </div>
                                        </div>
                                      </DialogContent>
                                    </Dialog>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const openseaUrl = Number(chainId) === 8453 
                                          ? `https://opensea.io/assets/base/${onftAddress}/7`
                                          : `https://opensea.io/assets/${onftAddress}/7`
                                        window.open(`${openseaUrl}?force_update=true`, '_blank')
                                      }}
                                    >
                                      View on OpenSea
                                    </Button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Actions */}
                        {isComplete && (
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm" asChild>
                              <a href="/bridge">Bridge NFTs</a>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>All Deployed Contracts</CardTitle>
                <CardDescription>
                  A consolidated view of all your ONFT contracts across chains
                </CardDescription>
              </CardHeader>
              <CardContent>
                {deployments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No contracts deployed yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deployments.flatMap(deployment => {
                      const contracts = []
                      
                      if (deployment.adapterAddress) {
                        contracts.push({
                          type: 'ONFT Adapter',
                          address: deployment.adapterAddress,
                          chain: deployment.sourceChain?.name || 'Unknown',
                          chainId: deployment.sourceChain?.id || 1,
                          deploymentId: deployment.id
                        })
                      }
                      
                      if (deployment.onftAddresses) {
                        Object.entries(deployment.onftAddresses).forEach(([chainId, address]) => {
                          const chain = deployment.targetChains?.find(c => c.id === parseInt(chainId)) ||
                                       deployment.chains?.find(c => c.id === parseInt(chainId))
                          contracts.push({
                            type: 'ONFT Contract',
                            address,
                            chain: chain?.name || `Chain ${chainId}`,
                            chainId: parseInt(chainId),
                            deploymentId: deployment.id
                          })
                        })
                      }
                      
                      return contracts
                    }).map((contract, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{contract.type}</p>
                          <p className="text-sm text-muted-foreground">{contract.chain}</p>
                          {/* Verification Status */}
                          {(() => {
                            const deployment = deployments.find(d => d.id === contract.deploymentId);
                            const contractStep = deployment?.steps?.find(s => s.contractAddress === contract.address);
                            return contractStep && (
                              <div className="flex items-center gap-1 mt-1">
                                {contractStep.verified ? (
                                  <>
                                    <Shield className="h-3 w-3 text-green-400" />
                                    <span className="text-xs text-green-400">Verified</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="h-3 w-3 text-yellow-400" />
                                    <span className="text-xs text-yellow-400">Not Verified</span>
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-gray-800 text-gray-200 px-2 py-1 rounded">
                            {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(contract.address)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={getExplorerUrl(contract.chainId, contract.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                          {/* Manual Verification Button */}
                          {(() => {
                            const deployment = deployments.find(d => d.id === contract.deploymentId);
                            const contractStep = deployment?.steps?.find(s => s.contractAddress === contract.address);
                            return contractStep && !contractStep.verified && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const explorerUrl = contract.chainId === 1 
                                    ? `https://etherscan.io/verifyContract?a=${contract.address}`
                                    : `https://basescan.org/verifyContract?a=${contract.address}`;
                                  window.open(explorerUrl, '_blank');
                                }}
                                className="text-xs"
                              >
                                Verify
                              </Button>
                            );
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Auto-Verification Modal */}
      <AutoVerifyModal
        isOpen={autoVerifyModal.isOpen}
        onClose={() => setAutoVerifyModal(prev => ({ ...prev, isOpen: false }))}
        contractAddress={autoVerifyModal.contractAddress}
        network={autoVerifyModal.network}
        contractType={autoVerifyModal.contractType}
        constructorArgs={autoVerifyModal.constructorArgs}
        onVerificationComplete={handleVerificationComplete}
      />
    </div>
  )
}
