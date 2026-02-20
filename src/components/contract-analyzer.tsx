'use client'

import { useState } from 'react'
import { usePublicClient } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LayerZeroChain } from '@/lib/chains'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2,
  ExternalLink,
  Info
} from 'lucide-react'

interface ContractInfo {
  address: string
  name?: string
  symbol?: string
  totalSupply?: string
  owner?: string
  isERC721: boolean
  isERC721Enumerable: boolean
  isOwnable: boolean
  supportsInterface: {
    erc165: boolean
    erc721: boolean
    erc721Metadata: boolean
    erc721Enumerable: boolean
  }
}

interface ContractAnalyzerProps {
  contractAddress: string
  chain: LayerZeroChain
  onAnalysisComplete?: (info: ContractInfo) => void
}

export function ContractAnalyzer({ 
  contractAddress, 
  chain, 
  onAnalysisComplete 
}: ContractAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const publicClient = usePublicClient({ chainId: chain.id })

  const analyzeContract = async () => {
    if (!contractAddress || !publicClient) return
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      // Basic contract validation
      const code = await publicClient.getBytecode({ address: contractAddress as `0x${string}` })
      
      if (!code || code === '0x') {
        throw new Error('No contract found at this address')
      }

      // ERC165 interface IDs
      const ERC165_ID = '0x01ffc9a7'
      const ERC721_ID = '0x80ac58cd'
      const ERC721_METADATA_ID = '0x5b5e139f'
      const ERC721_ENUMERABLE_ID = '0x780e9d63'

      // Check interface support
      const supportsInterface = {
        erc165: false,
        erc721: false,
        erc721Metadata: false,
        erc721Enumerable: false,
      }

      try {
        // Check ERC165 support
        const erc165Result = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: [
            {
              inputs: [{ name: 'interfaceId', type: 'bytes4' }],
              name: 'supportsInterface',
              outputs: [{ name: '', type: 'bool' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'supportsInterface',
          args: [ERC165_ID],
        })
        
        supportsInterface.erc165 = erc165Result as boolean

        if (supportsInterface.erc165) {
          // Check other interfaces
          const [erc721, erc721Metadata, erc721Enumerable] = await Promise.all([
            publicClient.readContract({
              address: contractAddress as `0x${string}`,
              abi: [
                {
                  inputs: [{ name: 'interfaceId', type: 'bytes4' }],
                  name: 'supportsInterface',
                  outputs: [{ name: '', type: 'bool' }],
                  stateMutability: 'view',
                  type: 'function',
                },
              ],
              functionName: 'supportsInterface',
              args: [ERC721_ID],
            }),
            publicClient.readContract({
              address: contractAddress as `0x${string}`,
              abi: [
                {
                  inputs: [{ name: 'interfaceId', type: 'bytes4' }],
                  name: 'supportsInterface',
                  outputs: [{ name: '', type: 'bool' }],
                  stateMutability: 'view',
                  type: 'function',
                },
              ],
              functionName: 'supportsInterface',
              args: [ERC721_METADATA_ID],
            }),
            publicClient.readContract({
              address: contractAddress as `0x${string}`,
              abi: [
                {
                  inputs: [{ name: 'interfaceId', type: 'bytes4' }],
                  name: 'supportsInterface',
                  outputs: [{ name: '', type: 'bool' }],
                  stateMutability: 'view',
                  type: 'function',
                },
              ],
              functionName: 'supportsInterface',
              args: [ERC721_ENUMERABLE_ID],
            }),
          ])

          supportsInterface.erc721 = erc721 as boolean
          supportsInterface.erc721Metadata = erc721Metadata as boolean
          supportsInterface.erc721Enumerable = erc721Enumerable as boolean
        }
      } catch (e) {
        console.warn('Interface check failed:', e)
      }

      // Try to get basic NFT info
      let name, symbol, totalSupply, owner

      try {
        name = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: 'name',
              outputs: [{ name: '', type: 'string' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'name',
        }) as string
      } catch (e) {
        console.warn('Name not available')
      }

      try {
        symbol = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: 'symbol',
              outputs: [{ name: '', type: 'string' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'symbol',
        }) as string
      } catch (e) {
        console.warn('Symbol not available')
      }

      try {
        const totalSupplyResult = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: 'totalSupply',
              outputs: [{ name: '', type: 'uint256' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'totalSupply',
        })
        totalSupply = totalSupplyResult?.toString()
      } catch (e) {
        console.warn('Total supply not available')
      }

      try {
        owner = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: [
            {
              inputs: [],
              name: 'owner',
              outputs: [{ name: '', type: 'address' }],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'owner',
        }) as string
      } catch (e) {
        console.warn('Owner not available')
      }

      const info: ContractInfo = {
        address: contractAddress,
        name,
        symbol,
        totalSupply: totalSupply,
        owner,
        isERC721: supportsInterface.erc721,
        isERC721Enumerable: supportsInterface.erc721Enumerable,
        isOwnable: !!owner,
        supportsInterface,
      }

      setContractInfo(info)
      onAnalysisComplete?.(info)
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to analyze contract'
      setError(message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  if (!contractAddress) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Contract Analysis
        </CardTitle>
        <CardDescription>
          Analyzing NFT contract compatibility for ONFT deployment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!contractInfo && !error && (
          <Button 
            onClick={analyzeContract} 
            disabled={isAnalyzing}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Contract...
              </>
            ) : (
              'Analyze Contract'
            )}
          </Button>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {contractInfo && (
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-sm text-muted-foreground">
                  {contractInfo.name || 'Not available'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Symbol</p>
                <p className="text-sm text-muted-foreground">
                  {contractInfo.symbol || 'Not available'}
                </p>
              </div>
              {contractInfo.totalSupply && (
                <div>
                  <p className="text-sm font-medium">Total Supply</p>
                  <p className="text-sm text-muted-foreground">
                    {contractInfo.totalSupply}
                  </p>
                </div>
              )}
              {contractInfo.owner && (
                <div>
                  <p className="text-sm font-medium">Owner</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {contractInfo.owner.slice(0, 6)}...{contractInfo.owner.slice(-4)}
                  </p>
                </div>
              )}
            </div>

            {/* Compatibility Status */}
            <div className="space-y-2">
              <p className="text-sm font-medium">ONFT Compatibility</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant={contractInfo.isERC721 ? "default" : "destructive"}>
                  {contractInfo.isERC721 ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  ERC721
                </Badge>
                
                <Badge variant={contractInfo.supportsInterface.erc721Metadata ? "default" : "secondary"}>
                  {contractInfo.supportsInterface.erc721Metadata ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  )}
                  Metadata
                </Badge>
                
                <Badge variant={contractInfo.isERC721Enumerable ? "default" : "secondary"}>
                  {contractInfo.isERC721Enumerable ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  )}
                  Enumerable
                </Badge>
                
                <Badge variant={contractInfo.isOwnable ? "default" : "secondary"}>
                  {contractInfo.isOwnable ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  )}
                  Ownable
                </Badge>
              </div>
            </div>

            {/* Recommendations */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Recommendations</p>
              {contractInfo.isERC721 ? (
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                      Compatible with ONFT Adapter
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This contract can be bridged using the ONFT Adapter pattern.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm text-destructive font-medium">
                      Not ERC721 Compatible
                    </p>
                    <p className="text-xs text-muted-foreground">
                      This contract does not implement ERC721 and cannot be used with ONFT Adapter.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Explorer Link */}
            <Button variant="outline" size="sm" asChild>
              <a 
                href={`${chain.blockExplorers?.default.url}/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-3 w-3" />
                View on {chain.blockExplorers?.default.name}
              </a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
