'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CrossChainVerificationService, ChainVerificationStatus } from '@/lib/cross-chain-verification'
import { CheckCircle, XCircle, Loader2, ExternalLink, Shield, AlertTriangle } from 'lucide-react'

interface SimpleVerificationButtonProps {
  contractAddress: string
  chainId: number
  chainName?: string
  // Optional verification data for programmatic verification
  sourceCode?: string
  constructorArgs?: string
  contractName?: string
  compilerVersion?: string
}

export function SimpleVerificationButton({ 
  contractAddress, 
  chainId,
  chainName,
  sourceCode,
  constructorArgs,
  contractName,
  compilerVersion = 'v0.8.22+commit.4fc1097e' // Default Hardhat compiler version
}: SimpleVerificationButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<ChainVerificationStatus | null>(null)
  const [verificationGuid, setVerificationGuid] = useState<string | null>(null)
  const [service] = useState(() => {
    // Try to get API key from environment
    // In Next.js, NEXT_PUBLIC_ variables are available at build time
    const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || ''
    console.log('🔑 SimpleVerificationButton - API Key check:', {
      hasKey: !!apiKey,
      keyLength: apiKey.length,
      keyPreview: apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'none',
      envVar: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY ? 'exists' : 'missing'
    })
    
    // If no key in env, try to use a fallback (for development)
    const finalKey = apiKey || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG'
    console.log('🔑 Using API key:', finalKey ? `${finalKey.substring(0, 10)}...${finalKey.substring(finalKey.length - 4)}` : 'none')
    
    return new CrossChainVerificationService(finalKey)
  })

  const handleCheckVerification = async () => {
    setIsLoading(true)
    try {
      const results = await service.checkVerificationStatus(contractAddress, [chainId])
      setVerificationStatus(results[0])
      setIsDialogOpen(true)
    } catch (error: any) {
      console.error('Verification check failed:', error)
      setVerificationStatus({
        chainId,
        chainName: chainName || `Chain ${chainId}`,
        isVerified: false,
        explorerUrl: '',
        contractUrl: '',
        error: error.message || 'Failed to check verification'
      })
      setIsDialogOpen(true)
    } finally {
      setIsLoading(false)
    }
  }

  const getExplorerUrl = () => {
    if (verificationStatus?.contractUrl) {
      return verificationStatus.contractUrl
    }
    // Fallback URLs
    if (chainId === 1) return `https://etherscan.io/address/${contractAddress}`
    if (chainId === 8453) return `https://basescan.org/address/${contractAddress}`
    if (chainId === 137) return `https://polygonscan.com/address/${contractAddress}`
    if (chainId === 42161) return `https://arbiscan.io/address/${contractAddress}`
    if (chainId === 56) return `https://bscscan.com/address/${contractAddress}`
    return `https://etherscan.io/address/${contractAddress}`
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCheckVerification}
        disabled={isLoading}
        className="text-xs"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <Shield className="h-3 w-3 mr-1" />
            Check Verification
          </>
        )}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verification Status</DialogTitle>
            <DialogDescription>
              Contract: {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
            </DialogDescription>
          </DialogHeader>
          
          {verificationStatus && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border-2 ${
                verificationStatus.isVerified 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : verificationStatus.error
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-yellow-500/10 border-yellow-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {verificationStatus.isVerified ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-600">Verified</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-600">Not Verified</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Chain: {verificationStatus.chainName} (ID: {verificationStatus.chainId})
                </p>
                {verificationStatus.error && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                    <p className="text-xs text-red-600 font-medium">Error:</p>
                    <p className="text-xs text-red-600 mt-1">{verificationStatus.error}</p>
                    {verificationStatus.error.includes('API key') && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Make sure ETHERSCAN_API_KEY is set in your environment variables.
                      </p>
                    )}
                  </div>
                )}
                {verificationStatus.abi && (
                  <Badge variant="secondary" className="mt-2">
                    ABI Available
                  </Badge>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getExplorerUrl(), '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
                {!verificationStatus.isVerified && (
                  <div className="flex gap-2">
                    {sourceCode && constructorArgs && contractName ? (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={async () => {
                          setIsVerifying(true)
                          try {
                            const result = await service.verifyContract(
                              contractAddress,
                              chainId,
                              sourceCode,
                              contractName,
                              compilerVersion,
                              constructorArgs
                            )
                            if (result.success && result.guid) {
                              setVerificationGuid(result.guid)
                              setVerificationStatus({
                                ...verificationStatus!,
                                verificationStatus: 'Pending'
                              })
                            } else {
                              alert(`Verification failed: ${result.error || 'Unknown error'}`)
                            }
                          } catch (error: any) {
                            console.error('Verification submission failed:', error)
                            alert(`Verification failed: ${error.message}`)
                          } finally {
                            setIsVerifying(false)
                          }
                        }}
                        disabled={isVerifying}
                        className="flex-1"
                      >
                        {isVerifying ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Shield className="h-4 w-4 mr-2" />
                            Verify Contract
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          // Get the correct explorer URL for verification
                          let verifyUrl = ''
                          if (chainId === 1) {
                            verifyUrl = `https://etherscan.io/verifyContract?a=${contractAddress}`
                          } else if (chainId === 8453) {
                            verifyUrl = `https://basescan.org/verifyContract?a=${contractAddress}`
                          } else if (chainId === 137) {
                            verifyUrl = `https://polygonscan.com/verifyContract?a=${contractAddress}`
                          } else if (chainId === 42161) {
                            verifyUrl = `https://arbiscan.io/verifyContract?a=${contractAddress}`
                          } else if (chainId === 56) {
                            verifyUrl = `https://bscscan.com/verifyContract?a=${contractAddress}`
                          } else {
                            // Fallback: try to construct from explorer URL
                            const explorerUrl = verificationStatus.explorerUrl || getExplorerUrl()
                            verifyUrl = explorerUrl.replace('/address/', '/verifyContract?a=')
                          }
                          window.open(verifyUrl, '_blank')
                        }}
                        className="flex-1"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Verify on Explorer
                      </Button>
                    )}
                  </div>
                )}
                {verificationGuid && (
                  <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                    <p className="text-xs text-blue-600 font-medium">
                      Verification submitted! GUID: {verificationGuid.slice(0, 10)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Check back in a few minutes for verification status.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
