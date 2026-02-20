'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ChainSelector } from '@/components/ui/chain-selector'
import { NFTSelector } from '@/components/nft-selector'
import { LayerZeroChain, MAINNET_CHAINS } from '@/lib/chains'
import { GasBreakdownDisplay } from '@/components/gas-breakdown-display'
import { MessageStatusDisplay } from '@/components/message-status-display'
import { ErrorDisplay } from '@/components/error-display'
import { BatchBridgeProgressDisplay } from '@/components/batch-bridge-progress'
import { PreCrimeValidationDisplay } from '@/components/precrime-validation-display'
import { BridgeResult, BatchBridgeItem, BatchBridgeProgress, BatchBridgeResult } from '@/lib/layerzero-bridge'
import { parseLayerZeroError, isRetryableError, getRetryDelay, LayerZeroError } from '@/lib/layerzero-errors'
import { NFT } from '@/components/nft-selector'
import { 
  ArrowLeftRight, 
  ArrowRight, 
  Coins, 
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Zap,
  Sparkles,
  Shield
} from 'lucide-react'

export default function BridgePage() {
  const [sourceChain, setSourceChain] = useState<LayerZeroChain | null>(null)
  const [destinationChain, setDestinationChain] = useState<LayerZeroChain | null>(null)
  const [tokenId, setTokenId] = useState('')
  const [contractAddress, setContractAddress] = useState('')
  const [bridgeContractAddress, setBridgeContractAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<'idle' | 'bridging' | 'success' | 'error'>('idle')
  const [bridgeResult, setBridgeResult] = useState<BridgeResult | null>(null)
  const [bridgeError, setBridgeError] = useState<LayerZeroError | null>(null)
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [userAddress, setUserAddress] = useState<string | null>(null)
  
  // PreCrime validation state
  const [preCrimeResult, setPreCrimeResult] = useState<import('@/lib/precrime-service').PreCrimeValidationResult | null>(null)
  const [isPreCrimeLoading, setIsPreCrimeLoading] = useState(false)
  
  // Batch mode state
  const [batchMode, setBatchMode] = useState(false)
  const [selectedNFTs, setSelectedNFTs] = useState<NFT[]>([])
  const [batchProgress, setBatchProgress] = useState<BatchBridgeProgress | null>(null)
  const [batchResult, setBatchResult] = useState<BatchBridgeResult | null>(null)

  // Real deployed contracts (from your successful deployments)
  const exampleContracts = {
    ethereum: '0x20507738D04355c8255AfA547E9858c522796485', // Latest ONFT Adapter (Real LayerZero V2)
    base: '0x3d843E9Fc456eA112F968Bfe701903251696E577', // Latest ONFT Contract (Real LayerZero V2)
    ethereumOld: '0x79CE8f5d8892502A99f040be88Cb94a07aD548D1', // Previous ONFT Adapter
    ethereumOlder: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f' // Older ONFT Adapter
  }

  // Your latest deployed ONFT Adapter (Real LayerZero V2)
  const deployedONFTAdapter = '0x20507738D04355c8255AfA547E9858c522796485'

  const handleSwapChains = () => {
    const temp = sourceChain
    setSourceChain(destinationChain)
    setDestinationChain(temp)
  }

  const handleBridge = async (isRetry: boolean = false) => {
    if (!sourceChain || !destinationChain || !tokenId || !contractAddress || !bridgeContractAddress) {
      alert('Please fill in all fields including the bridge contract address')
      return
    }

    setIsLoading(true)
    setBridgeStatus('bridging')
    if (!isRetry) {
      setBridgeError(null)
      setRetryAttempt(0)
    }

    try {
      // Import LayerZero bridge functionality
      const { LayerZeroBridge } = await import('@/lib/layerzero-bridge')
      
      // Get wallet signer with proper connection
      if (typeof window !== 'undefined' && window.ethereum) {
        // Request account access first
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        await provider.send("eth_requestAccounts", [])
        const signer = provider.getSigner()
        const currentUserAddress = await signer.getAddress()
        setUserAddress(currentUserAddress)
        
        console.log('🌉 Starting real LayerZero NFT bridge...')
        console.log(`👤 User: ${currentUserAddress}`)
        console.log(`📍 From: ${sourceChain.name} (${contractAddress})`)
        console.log(`📍 To: ${destinationChain.name}`)
        console.log(`🆔 Token ID: ${tokenId}`)
        
        // Check network
        const network = await provider.getNetwork()
        console.log(`🌐 Current network: ${network.name} (${network.chainId})`)
        console.log(`🎯 Expected network: ${sourceChain.name} (${sourceChain.id})`)
        
        if (network.chainId !== sourceChain.id) {
          throw new Error(`Please switch to ${sourceChain.name} network. Currently on ${network.name}.`)
        }
        
        // Use separate addresses for NFT ownership vs bridge contract
        const isUsingAdapter = bridgeContractAddress === deployedONFTAdapter
        
        console.log(`🔍 NFT Collection: ${contractAddress}`)
        console.log(`🔍 Bridge Contract: ${bridgeContractAddress}`)
        console.log(`🔍 Bridge mode: ${isUsingAdapter ? 'ONFT Adapter' : 'Direct ONFT'}`)
        
        // Validate and auto-correct bridge contract for the source chain
        if (sourceChain.id === 1 && destinationChain.id === 8453) {
          // Ethereum -> Base: Must use adapter
          if (bridgeContractAddress.toLowerCase() !== exampleContracts.ethereum.toLowerCase()) {
            console.warn('⚠️ Auto-correcting: Using Ethereum adapter for Ethereum -> Base bridge')
            setBridgeContractAddress(exampleContracts.ethereum)
            // Wait a moment for state update
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        } else if (sourceChain.id === 8453 && destinationChain.id === 1) {
          // Base -> Ethereum: Must use Base ONFT
          if (bridgeContractAddress.toLowerCase() !== exampleContracts.base.toLowerCase()) {
            console.warn('⚠️ Auto-correcting: Using Base ONFT for Base -> Ethereum bridge')
            setBridgeContractAddress(exampleContracts.base)
            // Wait a moment for state update
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }
        
        // Final validation
        if (sourceChain.id === 1 && bridgeContractAddress.toLowerCase() === exampleContracts.base.toLowerCase()) {
          throw new Error('❌ Cannot use Base ONFT contract on Ethereum. Please use the ONFT Adapter for Ethereum → Base bridging.')
        }
        if (sourceChain.id === 8453 && bridgeContractAddress.toLowerCase() === exampleContracts.ethereum.toLowerCase()) {
          throw new Error('❌ Cannot use Ethereum ONFT Adapter on Base. Please use the Base ONFT contract for Base → Ethereum bridging.')
        }
        
        // Execute the bridge
        const result = await LayerZeroBridge.bridgeNFT({
          contractAddress: bridgeContractAddress,
          tokenId,
          sourceChain,
          destinationChain,
          recipientAddress: currentUserAddress, // Bridge to same address on destination
          signer,
          originalCollectionAddress: isUsingAdapter ? contractAddress : undefined
        })
        
        if (result.success) {
          setBridgeStatus('success')
          setBridgeResult(result)
          console.log('✅ Bridge completed successfully!')
          console.log(`📋 Transaction: ${result.transactionHash}`)
          if (result.guid) {
            console.log(`📨 LayerZero GUID: ${result.guid}`)
          }
          if (result.gasBreakdown) {
            console.log('💰 Gas Breakdown:', result.gasBreakdown)
          }
        } else {
          throw new Error(result.error || 'Bridge failed')
        }
      } else {
        throw new Error('Please connect your wallet first')
      }
      
    } catch (error: any) {
      console.error('❌ Bridge failed:', error)
      
      // Parse error using the new error handling system
      const parsedError = parseLayerZeroError(error)
      setBridgeError(parsedError)
      setBridgeStatus('error')
      
      // Auto-retry for retryable errors (only on first attempt, not on manual retries)
      if (isRetryableError(parsedError) && !isRetry && retryAttempt < (parsedError.maxRetries || 3)) {
        const delay = getRetryDelay(parsedError, retryAttempt)
        console.log(`⏳ Auto-retrying in ${delay}ms... (Attempt ${retryAttempt + 1}/${parsedError.maxRetries || 3})`)
        
        setTimeout(() => {
          setRetryAttempt(prev => prev + 1)
          handleBridge(true)
        }, delay)
        return
      }
    } finally {
      setIsLoading(false)
    }
  }

  const resetBridge = () => {
    setBridgeStatus('idle')
    setTokenId('')
    setBridgeResult(null)
    setBridgeError(null)
    setRetryAttempt(0)
  }
  
  const handleRetry = () => {
    setRetryAttempt(0)
    handleBridge(false)
  }
  
  const handleDismissError = () => {
    setBridgeError(null)
    setBridgeStatus('idle')
    setRetryAttempt(0)
  }

  // Auto-select bridge contract based on source chain
  useEffect(() => {
    if (sourceChain && destinationChain) {
      // For Ethereum -> Base: Use Ethereum adapter
      if (sourceChain.id === 1 && destinationChain.id === 8453) {
        setBridgeContractAddress(exampleContracts.ethereum)
        console.log('✅ Auto-selected Ethereum adapter for Ethereum -> Base bridge')
      }
      // For Base -> Ethereum: Use Base ONFT
      else if (sourceChain.id === 8453 && destinationChain.id === 1) {
        setBridgeContractAddress(exampleContracts.base)
        console.log('✅ Auto-selected Base ONFT for Base -> Ethereum bridge')
      }
    }
  }, [sourceChain, destinationChain])

  const handleNFTSelect = (nft: any) => {
    if (batchMode) {
      // Batch mode: handled by onBatchSelect
      return
    }
    
    // Single mode: Keep the original NFT contract address
    setContractAddress(nft.contractAddress)
    setTokenId(nft.tokenId)
    
    // Auto-select the source chain based on the NFT's chain
    const nftChain = MAINNET_CHAINS.find(chain => chain.id === nft.chain.id)
    if (nftChain) {
      setSourceChain(nftChain)
      
      // Auto-select destination chain (opposite of source)
      if (nftChain.id === 1) {
        const baseChain = MAINNET_CHAINS.find(chain => chain.id === 8453)
        if (baseChain) setDestinationChain(baseChain)
      } else if (nftChain.id === 8453) {
        const ethChain = MAINNET_CHAINS.find(chain => chain.id === 1)
        if (ethChain) setDestinationChain(ethChain)
      }
    }
  }
  
  const handleBatchNFTSelect = (nfts: NFT[]) => {
    setSelectedNFTs(nfts)
  }
  
  const handleBatchBridge = async () => {
    if (!sourceChain || !destinationChain || selectedNFTs.length === 0) {
      alert('Please select source chain, destination chain, and at least one NFT')
      return
    }
    
    setIsLoading(true)
    setBridgeStatus('bridging')
    setBatchProgress({
      total: selectedNFTs.length,
      completed: 0,
      failed: 0,
      results: []
    })
    setBatchResult(null)
    setBridgeError(null)
    
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        await provider.send("eth_requestAccounts", [])
        const signer = provider.getSigner()
        const userAddress = await signer.getAddress()
        
        // Check network
        const network = await provider.getNetwork()
        if (network.chainId !== sourceChain.id) {
          throw new Error(`Please switch to ${sourceChain.name} network. Currently on ${network.name}.`)
        }
        
        // Prepare batch items
        const batchItems: BatchBridgeItem[] = selectedNFTs.map(nft => {
          // Determine if using adapter based on bridge contract
          const isUsingAdapter = bridgeContractAddress === deployedONFTAdapter
          
          return {
            tokenId: nft.tokenId,
            contractAddress: nft.contractAddress,
            bridgeContractAddress: bridgeContractAddress || nft.contractAddress,
            originalCollectionAddress: isUsingAdapter ? nft.contractAddress : undefined
          }
        })
        
        console.log(`🚀 Starting batch bridge for ${batchItems.length} NFTs...`)
        
        // Import batch bridge function
        const { LayerZeroBridge } = await import('@/lib/layerzero-bridge')
        
        // Execute batch bridge with progress tracking
        const result = await LayerZeroBridge.batchBridgeNFTs(
          batchItems,
          sourceChain,
          destinationChain,
          userAddress,
          signer,
          undefined, // Use default executor options
          (progress) => {
            setBatchProgress(progress)
          }
        )
        
        setBatchResult(result)
        
        if (result.success) {
          setBridgeStatus('success')
          console.log(`✅ Batch bridge completed: ${result.succeeded} succeeded, ${result.failed} failed`)
        } else {
          setBridgeStatus('error')
          console.log(`⚠️ Batch bridge completed with errors: ${result.succeeded} succeeded, ${result.failed} failed`)
        }
      } else {
        throw new Error('Please connect your wallet first')
      }
    } catch (error: any) {
      console.error('❌ Batch bridge failed:', error)
      const parsedError = parseLayerZeroError(error)
      setBridgeError(parsedError)
      setBridgeStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b border-border bg-card/30">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              Cross-Chain NFT Bridge
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Bridge your NFTs seamlessly across different blockchains using LayerZero technology
            </p>
            <div className="flex justify-center gap-4">
              <Badge variant="secondary" className="px-3 py-1">
                <Zap className="h-3 w-3 mr-1" />
                LayerZero V2
              </Badge>
              <Badge variant="secondary" className="px-3 py-1">
                <CheckCircle className="h-3 w-3 mr-1" />
                Secure & Fast
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Bridge Interface */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Main Bridge Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5" />
                Bridge NFT
              </CardTitle>
              <CardDescription>
                Transfer your NFTs between different blockchain networks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* NFT Selection Methods */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-medium">Select Your NFT</h3>
                </div>

                {/* NFT Browser */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Browse Your NFTs</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="batch-mode" className="text-xs font-normal cursor-pointer">
                        Batch Mode
                      </Label>
                      <input
                        id="batch-mode"
                        type="checkbox"
                        checked={batchMode}
                        onChange={(e) => {
                          setBatchMode(e.target.checked)
                          if (!e.target.checked) {
                            setSelectedNFTs([])
                            setBatchProgress(null)
                            setBatchResult(null)
                          }
                        }}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                  <NFTSelector
                    selectedChain={sourceChain}
                    onNFTSelect={handleNFTSelect}
                    onBatchSelect={handleBatchNFTSelect}
                    batchMode={batchMode}
                    exampleContracts={exampleContracts}
                  />
                  <p className="text-xs text-muted-foreground">
                    {batchMode 
                      ? `Select multiple NFTs to bridge in one batch (${selectedNFTs.length} selected)`
                      : 'Select a source chain first, then browse your NFTs to auto-fill contract and token ID'
                    }
                  </p>
                  {batchMode && selectedNFTs.length > 0 && (
                    <Button
                      onClick={handleBatchBridge}
                      disabled={isLoading || !sourceChain || !destinationChain}
                      className="w-full"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Bridge {selectedNFTs.length} NFT{selectedNFTs.length > 1 ? 's' : ''}
                    </Button>
                  )}
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or enter manually</span>
                  </div>
                </div>

                {/* Manual Entry */}
                <div className="space-y-4">
                  {/* Contract Address */}
                  <div className="space-y-2">
                    <Label htmlFor="contract">NFT Contract Address</Label>
                    <Input
                      id="contract"
                      placeholder="0x..."
                      value={contractAddress}
                      onChange={(e) => setContractAddress(e.target.value)}
                    />
                    <div className="text-xs text-muted-foreground">
                      The original NFT collection contract address
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bridgeContract">Bridge Contract Address</Label>
                    <Input
                      id="bridgeContract"
                      placeholder="0x..."
                      value={bridgeContractAddress}
                      onChange={(e) => setBridgeContractAddress(e.target.value)}
                    />
                    {bridgeContractAddress === deployedONFTAdapter && (
                      <div className="text-xs text-green-400 mt-1">
                        ✅ Using ONFT Adapter for cross-chain bridging
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      The bridge contract to use (ONFT Adapter or direct ONFT)
                    </div>
                    <div className="flex gap-2 text-xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBridgeContractAddress(exampleContracts.ethereum)}
                        className="h-6 px-2 text-xs"
                      >
                        Use ONFT Adapter (Ethereum)
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBridgeContractAddress(exampleContracts.base)}
                        className="h-6 px-2 text-xs"
                      >
                        Use Base ONFT (Base)
                      </Button>
                    </div>
                    <div className="text-xs text-yellow-400 mt-1">
                      ⚠️ For Ethereum → Base: Use ONFT Adapter (Ethereum)<br/>
                      ⚠️ For Base → Ethereum: Use Base ONFT (Base)
                    </div>
                  </div>

                  {/* Token ID */}
                  <div className="space-y-2">
                    <Label htmlFor="tokenId">Token ID</Label>
                    <Input
                      id="tokenId"
                      placeholder="1"
                      value={tokenId}
                      onChange={(e) => setTokenId(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Chain Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Chain</Label>
                  <ChainSelector
                    value={sourceChain ?? undefined}
                    onValueChange={setSourceChain}
                    placeholder="Select source chain"
                  />
                </div>

                <div className="space-y-2">
                  <Label>To Chain</Label>
                  <ChainSelector
                    value={destinationChain ?? undefined}
                    onValueChange={setDestinationChain}
                    placeholder="Select destination chain"
                    excludeChains={sourceChain ? [sourceChain] : []}
                  />
                </div>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwapChains}
                  disabled={!sourceChain || !destinationChain}
                  className="rounded-full"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Bridge Summary */}
              {sourceChain && destinationChain && tokenId && contractAddress && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <h4 className="font-medium mb-3">Bridge Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">NFT:</span>
                        <span className="font-mono">{contractAddress.slice(0, 6)}...{contractAddress.slice(-4)} #{tokenId}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Route:</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{sourceChain.name}</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="outline">{destinationChain.name}</Badge>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Estimated Time:</span>
                        <span>~2-5 minutes</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bridge Fee:</span>
                        <span>~$1-5 USD</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Bridge Button - Only show in single mode */}
              {!batchMode && (
                <Button
                  onClick={() => handleBridge()}
                  disabled={!sourceChain || !destinationChain || !tokenId || !contractAddress || isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Bridging...
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="h-4 w-4 mr-2" />
                      Bridge NFT
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* PreCrime Validation Display */}
          {(isPreCrimeLoading || preCrimeResult) && (
            <PreCrimeValidationDisplay
              result={preCrimeResult}
              isLoading={isPreCrimeLoading}
              chainName={destinationChain?.name}
            />
          )}

          {/* Bridge Status */}
          {bridgeStatus !== 'idle' && (
            <Card className={`border ${
              bridgeStatus === 'success' ? 'border-green-500/20 bg-green-500/5' :
              bridgeStatus === 'error' ? 'border-red-500/20 bg-red-500/5' :
              'border-blue-500/20 bg-blue-500/5'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {bridgeStatus === 'bridging' && (
                    <>
                      <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                      <div>
                        <h4 className="font-medium text-blue-500">Bridging in Progress</h4>
                        <p className="text-sm text-muted-foreground">
                          Your NFT is being bridged across chains. This may take a few minutes.
                        </p>
                      </div>
                    </>
                  )}
                  {bridgeStatus === 'success' && (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div className="flex-1">
                        <h4 className="font-medium text-green-500">Bridge Successful! 🎉</h4>
                        <p className="text-sm text-muted-foreground">
                          Your NFT has been successfully bridged to {destinationChain?.name}.
                        </p>
                        {bridgeResult?.transactionHash && (
                          <div className="mt-2">
                            <a
                              href={`https://${sourceChain?.id === 1 ? 'etherscan.io' : sourceChain?.id === 8453 ? 'basescan.org' : 'etherscan.io'}/tx/${bridgeResult.transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                            >
                              View Transaction <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>
                      <Button onClick={resetBridge} variant="outline" size="sm">
                        Bridge Another
                      </Button>
                    </>
                  )}
                  {bridgeStatus === 'error' && bridgeError && (
                    <div className="w-full">
                      <ErrorDisplay
                        error={bridgeError}
                        onRetry={handleRetry}
                        onDismiss={handleDismissError}
                        showDetails={true}
                        retryAttempt={retryAttempt}
                        maxRetries={bridgeError.maxRetries || 3}
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gas Breakdown Display */}
          {bridgeStatus === 'success' && bridgeResult?.gasBreakdown && (
            <GasBreakdownDisplay
              gasBreakdown={bridgeResult.gasBreakdown}
              sourceChainName={sourceChain?.name || 'Source'}
              destinationChainName={destinationChain?.name || 'Destination'}
              hasExecutor={bridgeResult.gasBreakdown.destinationGas === '0'}
            />
          )}

          {/* Message Status Tracking */}
          {bridgeStatus === 'success' && bridgeResult?.guid && sourceChain && destinationChain && bridgeResult.transactionHash && !batchMode && (
            <MessageStatusDisplay
              guid={bridgeResult.guid}
              sourceChain={sourceChain}
              destinationChain={destinationChain}
              sourceTxHash={bridgeResult.transactionHash}
              destinationContractAddress={bridgeResult.destinationContractAddress}
              tokenId={tokenId}
              recipient={userAddress || undefined}
              bridgeContractAddress={bridgeContractAddress}
              onRetryComplete={(result) => {
                if (result.success && result.guid) {
                  // Update bridge result with new transaction
                  setBridgeResult({
                    ...bridgeResult,
                    transactionHash: result.transactionHash,
                    guid: result.guid
                  })
                }
              }}
            />
          )}

          {/* Batch Bridge Progress */}
          {batchMode && batchProgress && (
            <BatchBridgeProgressDisplay progress={batchProgress} />
          )}

          {/* Batch Bridge Results */}
          {batchMode && batchResult && (
            <Card className={`border ${
              batchResult.success ? 'border-green-500/20 bg-green-500/5' : 'border-yellow-500/20 bg-yellow-500/5'
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  {batchResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-medium ${batchResult.success ? 'text-green-500' : 'text-yellow-500'}`}>
                      Batch Bridge {batchResult.success ? 'Completed!' : 'Completed with Errors'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {batchResult.succeeded} succeeded, {batchResult.failed} failed out of {batchResult.total} NFTs
                    </p>
                  </div>
                </div>
                
                {batchResult.totalGasBreakdown && (
                  <div className="mt-4">
                    <GasBreakdownDisplay
                      gasBreakdown={batchResult.totalGasBreakdown}
                      sourceChainName={sourceChain?.name || 'Source'}
                      destinationChainName={destinationChain?.name || 'Destination'}
                      hasExecutor={batchResult.totalGasBreakdown.destinationGas === '0'}
                    />
                  </div>
                )}
                
                <Button onClick={() => {
                  setBatchMode(false)
                  setSelectedNFTs([])
                  setBatchProgress(null)
                  setBatchResult(null)
                  setBridgeStatus('idle')
                }} variant="outline" size="sm" className="mt-4">
                  Bridge More NFTs
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Your NFT is locked on the source chain</p>
                <p>• A corresponding NFT is minted on the destination chain</p>
                <p>• LayerZero ensures secure cross-chain messaging</p>
                <p>• The process is fully reversible</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Supported Chains</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {MAINNET_CHAINS.slice(0, 6).map(chain => (
                    <Badge key={chain.id} variant="secondary" className="text-xs">
                      {chain.name}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  And {MAINNET_CHAINS.length - 6}+ more networks
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Deployments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Recent Deployments</CardTitle>
              <CardDescription>
                Use these contract addresses for testing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">ONFT Adapter</p>
                  <p className="text-sm text-muted-foreground">Ethereum Mainnet</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{exampleContracts.ethereum}</p>
                  <Button variant="ghost" size="sm" asChild className="h-6 px-2">
                    <a
                      href={`https://etherscan.io/address/${exampleContracts.ethereum}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </a>
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">ONFT Contract</p>
                  <p className="text-sm text-muted-foreground">Base Mainnet</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm">{exampleContracts.base}</p>
                  <Button variant="ghost" size="sm" asChild className="h-6 px-2">
                    <a
                      href={`https://basescan.org/address/${exampleContracts.base}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
