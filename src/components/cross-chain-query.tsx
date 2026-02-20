'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { useAccount, useChainId, useWalletClient } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Loader2, Search, ExternalLink } from 'lucide-react'
import { LAYERZERO_CHAINS, LayerZeroChain } from '@/lib/chains'
import { 
  quoteReadFee, 
  executeRead, 
  supportsLzRead, 
  ONFT_READ_QUERIES,
  ReadRequest,
  ReadResult,
  estimateResponseSize
} from '@/lib/lzread-service'
import { 
  isReadPairSupported, 
  hasReadLibrary, 
  getReadSupportedDVNs,
  getReadLibraryAddress 
} from '@/lib/read-channels'
import { DeploymentStateManager } from '@/lib/deployment-state-manager'

interface CrossChainQueryProps {
  onQueryComplete?: (result: ReadResult) => void
}

export function CrossChainQuery({ onQueryComplete }: CrossChainQueryProps) {
  const [mounted, setMounted] = useState(false)
  
  // Hooks must be called unconditionally - they will work if WagmiProvider is available
  // Following the same pattern as NFT selector
  const account = useAccount()
  const chainIdHook = useChainId()
  const wallet = useWalletClient()
  
  const [fallbackAddress, setFallbackAddress] = useState<string | undefined>(undefined)
  const [fallbackConnected, setFallbackConnected] = useState(false)
  const [fallbackChainId, setFallbackChainId] = useState<number | undefined>(undefined)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Fallback: detect wallet via window.ethereum
  useEffect(() => {
    if (mounted && typeof window !== 'undefined' && window.ethereum) {
      // Get accounts
      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setFallbackAddress(accounts[0])
            setFallbackConnected(true)
          }
        })
        .catch(() => {
          // Ignore errors
        })
      
      // Get chain ID
      window.ethereum.request({ method: 'eth_chainId' })
        .then((chainIdHex: string) => {
          const chainIdDecimal = parseInt(chainIdHex, 16)
          setFallbackChainId(chainIdDecimal)
        })
        .catch(() => {
          // Ignore errors
        })
    }
  }, [mounted])
  
  // Use wagmi values if available, otherwise use fallback
  const address = account.address || fallbackAddress
  const isConnected = (account.isConnected && mounted) || fallbackConnected
  const chainId = chainIdHook || fallbackChainId
  const walletClient = wallet.data
  
  // Get chain from chainId
  const chain = chainId ? LAYERZERO_CHAINS.find(c => c.id === chainId) || null : null
  
  // Convert walletClient to ethers Signer
  const getSigner = async (): Promise<ethers.Signer | null> => {
    if (!window.ethereum) return null
    const provider = new ethers.providers.Web3Provider(window.ethereum)
    return provider.getSigner()
  }
  
  const [oappReadAddress, setOappReadAddress] = useState<string>('')
  const [targetContract, setTargetContract] = useState<string>('')
  const [targetChainId, setTargetChainId] = useState<number | null>(null)
  const [functionSelector, setFunctionSelector] = useState<string>('')
  const [parameters, setParameters] = useState<string>('') // JSON string
  const [returnType, setReturnType] = useState<string>('uint256')
  const [responseSize, setResponseSize] = useState<number>(32)
  
  const [isQuoting, setIsQuoting] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [quoteResult, setQuoteResult] = useState<{ nativeFee: string; lzTokenFee: string } | null>(null)
  const [queryResult, setQueryResult] = useState<ReadResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [availableOApps, setAvailableOApps] = useState<Array<{ address: string; chain: LayerZeroChain; type: string }>>([])

  // Load available OApp contracts from deployments
  useEffect(() => {
    if (!isConnected) return
    
    const loadOApps = () => {
      try {
        const deployments = DeploymentStateManager.getSuccessfulDeployments()
        const oapps: Array<{ address: string; chain: LayerZeroChain; type: string }> = []
        
        deployments.forEach(deployment => {
          // Add adapter if exists
          if (deployment.adapterAddress && deployment.sourceChain) {
            const chain = LAYERZERO_CHAINS.find(c => c.id === deployment.sourceChain?.id)
            if (chain) {
              oapps.push({
                address: deployment.adapterAddress,
                chain,
                type: 'ONFT Adapter'
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
                  address,
                  chain,
                  type: 'ONFT Contract'
                })
              }
            })
          }
        })
        
        setAvailableOApps(oapps)
        
        // Auto-select first OApp if available
        if (oapps.length > 0 && !oappReadAddress) {
          setOappReadAddress(oapps[0].address)
        }
      } catch (error: any) {
        console.error('Error loading OApps:', error)
      }
    }
    
    loadOApps()
  }, [isConnected, oappReadAddress])

  // Auto-update response size when return type changes
  useEffect(() => {
    const size = estimateResponseSize(returnType)
    setResponseSize(size)
  }, [returnType])

  const handleQuote = async () => {
    if (!oappReadAddress || !targetContract || !targetChainId || !functionSelector) {
      setError('Please fill in all required fields')
      return
    }

    if (!chain) {
      setError('Please connect your wallet and ensure you are on a supported chain')
      return
    }

    setIsQuoting(true)
    setError(null)
    setQuoteResult(null)

    try {
      const sourceChain = chain
      const targetChain = LAYERZERO_CHAINS.find(c => c.id === targetChainId)
      
      if (!sourceChain || !targetChain) {
        throw new Error('Invalid chain selection')
      }

      // Parse parameters if provided
      let parsedParams: any[] = []
      if (parameters.trim()) {
        try {
          parsedParams = JSON.parse(parameters)
          if (!Array.isArray(parsedParams)) {
            throw new Error('Parameters must be a JSON array')
          }
        } catch (e) {
          throw new Error('Invalid parameters format. Use JSON array, e.g., ["0x123...", "100"]')
        }
      }

      const request: ReadRequest = {
        targetContract,
        targetChain,
        functionSelector,
        parameters: parsedParams,
        responseSize,
      }

      // Get provider from walletClient or window.ethereum
      let provider: ethers.providers.Provider
      if (window.ethereum) {
        provider = new ethers.providers.Web3Provider(window.ethereum)
      } else {
        throw new Error('No wallet provider available')
      }
      const fee = await quoteReadFee(oappReadAddress, request, sourceChain, provider)
      
      setQuoteResult({
        nativeFee: ethers.utils.formatEther(fee.nativeFee),
        lzTokenFee: ethers.utils.formatEther(fee.lzTokenFee),
      })
    } catch (error: any) {
      console.error('Error quoting read fee:', error)
      setError(error.message || 'Failed to quote read fee')
    } finally {
      setIsQuoting(false)
    }
  }

  const handleExecute = async () => {
    if (!oappReadAddress || !targetContract || !targetChainId || !functionSelector) {
      setError('Please fill in all required fields')
      return
    }

    if (!chain) {
      setError('Please connect your wallet and ensure you are on a supported chain')
      return
    }

    setIsExecuting(true)
    setError(null)
    setQueryResult(null)

    try {
      const sourceChain = chain
      const targetChain = LAYERZERO_CHAINS.find(c => c.id === targetChainId)
      
      if (!sourceChain || !targetChain) {
        throw new Error('Invalid chain selection')
      }

      // Parse parameters if provided
      let parsedParams: any[] = []
      if (parameters.trim()) {
        try {
          parsedParams = JSON.parse(parameters)
          if (!Array.isArray(parsedParams)) {
            throw new Error('Parameters must be a JSON array')
          }
        } catch (e) {
          throw new Error('Invalid parameters format. Use JSON array, e.g., ["0x123...", "100"]')
        }
      }

      const request: ReadRequest = {
        targetContract,
        targetChain,
        functionSelector,
        parameters: parsedParams,
        responseSize,
      }

      const signer = await getSigner()
      if (!signer) {
        throw new Error('Unable to get wallet signer. Please ensure your wallet is connected.')
      }
      const result = await executeRead(oappReadAddress, request, sourceChain, signer)
      setQueryResult(result)
      
      if (result.success && onQueryComplete) {
        onQueryComplete(result)
      }
    } catch (error: any) {
      console.error('Error executing read:', error)
      setError(error.message || 'Failed to execute read')
      setQueryResult({
        success: false,
        error: error.message || 'Failed to execute read',
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const handlePresetQuery = (preset: keyof typeof ONFT_READ_QUERIES) => {
    const query = ONFT_READ_QUERIES[preset]
    setFunctionSelector(query.functionSelector)
    setReturnType(query.returnType)
    setResponseSize(query.responseSize)
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cross-Chain Query</CardTitle>
          <CardDescription>Query contract state from other chains using LayerZero Read</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Please connect your wallet to use cross-chain queries.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Cross-Chain Query (lzRead)
        </CardTitle>
        <CardDescription>
          Query contract state from other chains using LayerZero&apos;s read infrastructure.
          This uses a request-response pattern to pull data from remote chains.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* OApp Read Contract Selection */}
        <div className="space-y-2">
          <Label htmlFor="oapp-read">OApp Read Contract Address</Label>
          <div className="flex gap-2">
            <Select value={oappReadAddress} onValueChange={setOappReadAddress}>
              <SelectTrigger id="oapp-read" className="flex-1">
                <SelectValue placeholder="Select from deployed contracts" />
              </SelectTrigger>
              <SelectContent>
                {availableOApps.length > 0 ? (
                  availableOApps.map((oapp, idx) => (
                    <SelectItem key={idx} value={oapp.address}>
                      {oapp.type} on {oapp.chain.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="" disabled>
                    No deployed contracts found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <div className="flex-1">
              <Input
                id="oapp-read-manual"
                value={oappReadAddress}
                onChange={(e) => setOappReadAddress(e.target.value)}
                placeholder="Or enter address manually (0x...)"
                className="w-full"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Select from your deployed contracts above, or manually enter the OAppRead contract address on the current chain (source chain)
          </p>
        </div>

        {/* Target Contract */}
        <div className="space-y-2">
          <Label htmlFor="target-contract">Target Contract Address</Label>
          <Input
            id="target-contract"
            value={targetContract}
            onChange={(e) => setTargetContract(e.target.value)}
            placeholder="0x..."
          />
          <p className="text-xs text-muted-foreground">
            Address of the contract to query on the target chain
          </p>
        </div>

        {/* Target Chain */}
        <div className="space-y-2">
          <Label htmlFor="target-chain">Target Chain</Label>
          <Select
            value={targetChainId?.toString() || ''}
            onValueChange={(value) => setTargetChainId(parseInt(value))}
          >
            <SelectTrigger id="target-chain">
              <SelectValue placeholder="Select target chain" />
            </SelectTrigger>
            <SelectContent>
              {LAYERZERO_CHAINS.filter(c => c.id !== chain?.id).map((targetChain) => {
                const isSupported = chain && isReadPairSupported(chain.id, targetChain.id)
                return (
                  <SelectItem 
                    key={targetChain.id} 
                    value={targetChain.id.toString()}
                    disabled={!isSupported}
                  >
                    {targetChain.name}
                    {isSupported && <Badge variant="outline" className="ml-2">Supported</Badge>}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          {chain && targetChainId && (
            <div className="text-xs">
              {isReadPairSupported(chain.id, targetChainId) ? (
                <span className="text-green-500">✓ Read operations supported for this chain pair</span>
              ) : (
                <span className="text-yellow-500">
                  ⚠ Read operations may not be supported. Check{' '}
                  <a 
                    href="https://docs.layerzero.network/v2/deployments/read-contracts" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Read Data Channels
                  </a>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Function Selector */}
        <div className="space-y-2">
          <Label htmlFor="function-selector">Function Selector</Label>
          <div className="flex gap-2">
            <Input
              id="function-selector"
              value={functionSelector}
              onChange={(e) => setFunctionSelector(e.target.value)}
              placeholder="balanceOf(address)"
            />
            <div className="flex gap-1">
              {Object.keys(ONFT_READ_QUERIES).map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetQuery(preset as keyof typeof ONFT_READ_QUERIES)}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Function signature to call on the target contract (e.g., &quot;balanceOf(address)&quot;)
          </p>
        </div>

        {/* Parameters */}
        <div className="space-y-2">
          <Label htmlFor="parameters">Parameters (JSON Array)</Label>
          <Input
            id="parameters"
            value={parameters}
            onChange={(e) => setParameters(e.target.value)}
            placeholder='["0x123...", "100"]'
          />
          <p className="text-xs text-muted-foreground">
            Function parameters as JSON array (e.g., [&quot;0x123...&quot;, &quot;100&quot;])
          </p>
        </div>

        {/* Return Type & Response Size */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="return-type">Return Type</Label>
            <Input
              id="return-type"
              value={returnType}
              onChange={(e) => setReturnType(e.target.value)}
              placeholder="uint256"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="response-size">Response Size (bytes)</Label>
            <Input
              id="response-size"
              type="number"
              value={responseSize}
              onChange={(e) => setResponseSize(parseInt(e.target.value) || 32)}
              min={32}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Error</p>
              <p className="text-sm text-destructive/80">{error}</p>
            </div>
          </div>
        )}

        {/* Quote Result */}
        {quoteResult && (
          <div className="rounded-lg bg-muted p-3">
            <p className="text-sm font-medium mb-1">Fee Estimate</p>
            <div className="space-y-1 text-sm">
              <p>Native Fee: {quoteResult.nativeFee} ETH</p>
              <p>LZ Token Fee: {quoteResult.lzTokenFee} LZ</p>
            </div>
          </div>
        )}

        {/* Query Result */}
        {queryResult && (
          <div className={`rounded-lg p-3 ${queryResult.success ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
            <div className="flex items-start gap-2">
              {queryResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">
                  {queryResult.success ? 'Query Sent Successfully' : 'Query Failed'}
                </p>
                {queryResult.success && queryResult.transactionHash && (
                  <div className="space-y-1 text-sm">
                    <p>Transaction: {queryResult.transactionHash.slice(0, 10)}...</p>
                    {queryResult.guid && <p>GUID: {queryResult.guid.slice(0, 10)}...</p>}
                    <p className="text-xs text-muted-foreground mt-2">
                      The response will be delivered to your OAppRead contract. Check the DataReceived event.
                    </p>
                  </div>
                )}
                {queryResult.error && (
                  <p className="text-sm text-destructive/80">{queryResult.error}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleQuote}
            disabled={isQuoting || isExecuting || !oappReadAddress || !targetContract || !targetChainId || !functionSelector}
            variant="outline"
            className="flex-1"
          >
            {isQuoting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Quoting...
              </>
            ) : (
              'Quote Fee'
            )}
          </Button>
          <Button
            onClick={handleExecute}
            disabled={isExecuting || isQuoting || !oappReadAddress || !targetContract || !targetChainId || !functionSelector}
            className="flex-1"
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              'Execute Query'
            )}
          </Button>
        </div>

        {/* Read Library & DVN Info */}
        {chain && (
          <div className="rounded-lg bg-muted p-3 text-sm space-y-2">
            <p className="font-medium">📚 Read Configuration Info</p>
            {hasReadLibrary(chain.id) ? (
              <div className="space-y-1">
                <p className="text-green-500">✓ ReadLib1002 available on {chain.name}</p>
                <p className="text-xs text-muted-foreground">
                  Address: {getReadLibraryAddress(chain.id)}
                </p>
              </div>
            ) : (
              <p className="text-yellow-500">
                ⚠ ReadLib1002 may not be deployed on {chain.name}
              </p>
            )}
            {chain && (() => {
              const readDVNs = getReadSupportedDVNs(chain.id)
              const dvnCount = Object.keys(readDVNs).length
              return dvnCount > 0 ? (
                <div>
                  <p className="text-xs text-muted-foreground">
                    {dvnCount} DVN{dvnCount > 1 ? 's' : ''} with read support: {Object.keys(readDVNs).join(', ')}
                  </p>
                </div>
              ) : null
            })()}
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg bg-blue-500/10 p-3 text-sm">
          <p className="font-medium mb-1">ℹ️ How lzRead Works</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Your OAppRead contract sends a read request to the target chain</li>
            <li>DVNs with archival node access execute the function call (via eth_call)</li>
            <li>The response is delivered back to your OAppRead contract</li>
            <li>Check the DataReceived event on your contract to see the result</li>
          </ul>
          <p className="mt-2 text-xs">
            📖 Learn more:{' '}
            <a 
              href="https://docs.layerzero.network/v2/deployments/read-contracts" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline"
            >
              Read Data Channels Documentation
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
