'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  CrossChainVerificationService, 
  ETHERSCAN_SUPPORTED_CHAINS,
  ChainVerificationStatus 
} from '@/lib/cross-chain-verification'
import { CheckCircle, XCircle, Loader2, ExternalLink, Search, AlertCircle } from 'lucide-react'

interface CrossChainVerificationProps {
  contractAddress: string
  chainIds?: number[] // Optional: specific chains to check. If not provided, checks all supported chains
}

export function CrossChainVerification({ 
  contractAddress, 
  chainIds 
}: CrossChainVerificationProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<ChainVerificationStatus[]>([])
  const [error, setError] = useState<string>('')
  const [service] = useState(() => new CrossChainVerificationService())

  const chainsToCheck = chainIds || Object.keys(ETHERSCAN_SUPPORTED_CHAINS).map(id => parseInt(id))

  const handleCheckVerification = async () => {
    setIsLoading(true)
    setError('')
    setResults([])

    try {
      const verificationResults = await service.checkVerificationStatus(
        contractAddress,
        chainsToCheck
      )
      setResults(verificationResults)
    } catch (err: any) {
      setError(err.message || 'Failed to check verification status')
    } finally {
      setIsLoading(false)
    }
  }

  const verifiedChains = results.filter(r => r.isVerified)
  const unverifiedChains = results.filter(r => !r.isVerified && !r.error)
  const errorChains = results.filter(r => r.error)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Cross-Chain Verification Status
        </CardTitle>
        <CardDescription>
          Check contract verification status across all Etherscan-supported chains
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="contract-address">Contract Address</Label>
            <Input
              id="contract-address"
              value={contractAddress}
              readOnly
              className="font-mono text-sm"
            />
          </div>
          <Button 
            onClick={handleCheckVerification} 
            disabled={isLoading || !contractAddress}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Check All Chains
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                <div className="text-2xl font-bold text-green-600">{verifiedChains.length}</div>
                <div className="text-xs text-muted-foreground">Verified</div>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                <div className="text-2xl font-bold text-yellow-600">{unverifiedChains.length}</div>
                <div className="text-xs text-muted-foreground">Not Verified</div>
              </div>
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                <div className="text-2xl font-bold text-red-600">{errorChains.length}</div>
                <div className="text-xs text-muted-foreground">Errors</div>
              </div>
            </div>

            {/* Verified Chains */}
            {verifiedChains.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Verified Chains ({verifiedChains.length})
                </h3>
                <div className="space-y-2">
                  {verifiedChains.map((result) => (
                    <div
                      key={result.chainId}
                      className="flex items-center justify-between p-3 bg-green-500/5 border border-green-500/20 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">{result.chainName}</span>
                        <Badge variant="outline" className="text-xs">
                          Chain ID: {result.chainId}
                        </Badge>
                        {result.abi && (
                          <Badge variant="secondary" className="text-xs">
                            ABI Available
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(result.contractUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unverified Chains */}
            {unverifiedChains.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-yellow-600" />
                  Not Verified ({unverifiedChains.length})
                </h3>
                <div className="space-y-2">
                  {unverifiedChains.map((result) => (
                    <div
                      key={result.chainId}
                      className="flex items-center justify-between p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-yellow-600" />
                        <span className="font-medium">{result.chainName}</span>
                        <Badge variant="outline" className="text-xs">
                          Chain ID: {result.chainId}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(result.contractUrl, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Chains */}
            {errorChains.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Errors ({errorChains.length})
                </h3>
                <div className="space-y-2">
                  {errorChains.map((result) => (
                    <div
                      key={result.chainId}
                      className="p-3 bg-red-500/5 border border-red-500/20 rounded-md"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="font-medium">{result.chainName}</span>
                        <Badge variant="outline" className="text-xs">
                          Chain ID: {result.chainId}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{result.error}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {results.length === 0 && !isLoading && !error && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click &quot;Check All Chains&quot; to verify contract status across all supported chains
          </p>
        )}
      </CardContent>
    </Card>
  )
}
