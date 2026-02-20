'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  Shield, 
  Loader2,
  Info,
  RefreshCw
} from 'lucide-react'
import { 
  calculateCreate2Address, 
  verifyAddressAvailability,
  generateRandomSalt,
  getSaltSuggestions,
  Create2Config
} from '@/lib/create2-deployment'
import { ethers } from 'ethers'
import { LayerZeroChain } from '@/lib/chains'

interface DeterministicDeploymentConfigProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  salt: string
  onSaltChange: (salt: string) => void
  deployerAddress: string
  bytecode: string
  abi: any[]
  constructorArgs: any[]
  chain: LayerZeroChain
  onAddressCalculated?: (address: string) => void
}

export function DeterministicDeploymentConfig({
  enabled,
  onEnabledChange,
  salt,
  onSaltChange,
  deployerAddress,
  bytecode,
  abi,
  constructorArgs,
  chain,
  onAddressCalculated
}: DeterministicDeploymentConfigProps) {
  const [predictedAddress, setPredictedAddress] = useState<string>('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [addressStatus, setAddressStatus] = useState<'idle' | 'available' | 'taken' | 'checking' | 'error'>('idle')
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [saltSuggestions, setSaltSuggestions] = useState<string[]>([])

  // Calculate address when dependencies change
  useEffect(() => {
    if (!enabled || !bytecode || !deployerAddress) {
      setPredictedAddress('')
      setAddressStatus('idle')
      return
    }

    const calculateAddress = async () => {
      setIsCalculating(true)
      setVerificationError(null)
      
      try {
        // Use provided salt or generate one
        const finalSalt = salt || generateRandomSalt()
        
        const config: Create2Config = {
          deployerAddress,
          salt: finalSalt,
          bytecode,
          constructorArgs,
          abi
        }
        
        const result = calculateCreate2Address(config)
        
        if (result.isValid && result.predictedAddress) {
          setPredictedAddress(result.predictedAddress)
          setAddressStatus('idle')
          
          if (onAddressCalculated) {
            onAddressCalculated(result.predictedAddress)
          }
        } else {
          setPredictedAddress('')
          setAddressStatus('error')
          setVerificationError(result.error || 'Failed to calculate address')
        }
      } catch (error: any) {
        console.error('Error calculating CREATE2 address:', error)
        setPredictedAddress('')
        setAddressStatus('error')
        setVerificationError(error.message || 'Failed to calculate address')
      } finally {
        setIsCalculating(false)
      }
    }

    // Debounce calculation
    const timeoutId = setTimeout(calculateAddress, 300)
    return () => clearTimeout(timeoutId)
  }, [enabled, salt, deployerAddress, bytecode, JSON.stringify(constructorArgs), JSON.stringify(abi), onAddressCalculated])

  const handleVerifyAddress = useCallback(async () => {
    const rpcUrl = (chain.rpcUrls as { default?: { http?: string[] } })?.default?.http?.[0]
    if (!predictedAddress || !rpcUrl) return

    setIsVerifying(true)
    setAddressStatus('checking')
    setVerificationError(null)

    try {
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
      const result = await verifyAddressAvailability(predictedAddress, provider)

      if (result.available) {
        setAddressStatus('available')
      } else {
        setAddressStatus('taken')
        // Generate suggestions if address is taken
        if (salt) {
          const suggestions = getSaltSuggestions(salt)
          setSaltSuggestions(suggestions)
        }
      }
    } catch (error: any) {
      console.error('Error verifying address:', error)
      setAddressStatus('error')
      setVerificationError(error.message || 'Failed to verify address')
    } finally {
      setIsVerifying(false)
    }
  }, [predictedAddress, chain, salt])

  const handleCopyAddress = useCallback(() => {
    if (predictedAddress) {
      navigator.clipboard.writeText(predictedAddress)
      // You could add a toast notification here
    }
  }, [predictedAddress])

  const handleGenerateSalt = useCallback(() => {
    const randomSalt = generateRandomSalt()
    onSaltChange(randomSalt)
  }, [onSaltChange])

  const handleUseSuggestion = useCallback((suggestion: string) => {
    onSaltChange(suggestion)
    setSaltSuggestions([])
  }, [onSaltChange])

  if (!enabled) {
    return (
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={enabled}
                onCheckedChange={onEnabledChange}
                id="deterministic-deployment"
              />
              <Label htmlFor="deterministic-deployment" className="cursor-pointer">
                Use Deterministic Deployment (CREATE2)
              </Label>
              <div className="group relative">
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-popover border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-xs">
                  Predict contract address before deployment. Same salt = same address every time.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-500/20 bg-blue-500/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={enabled}
              onCheckedChange={onEnabledChange}
              id="deterministic-deployment"
            />
            <CardTitle className="text-base">Deterministic Deployment (CREATE2)</CardTitle>
            <div className="group relative">
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-popover border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-xs">
                Predict contract address before deployment. Same salt = same address every time.
              </div>
            </div>
          </div>
        </div>
        <CardDescription>
          Calculate and verify contract address before deployment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Salt Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="deployment-salt">Deployment Salt (optional)</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateSalt}
              className="h-7 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Generate
            </Button>
          </div>
          <Input
            id="deployment-salt"
            value={salt}
            onChange={(e) => onSaltChange(e.target.value)}
            placeholder="e.g., pixel-goblins-v1"
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for auto-generated salt. Same salt = same address every time.
          </p>
        </div>

        {/* Predicted Address Display */}
        {predictedAddress && (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4" />
                Predicted Contract Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono break-all flex-1">
                  {predictedAddress}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyAddress}
                  className="flex-shrink-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {isCalculating && (
                  <Badge variant="secondary">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Calculating...
                  </Badge>
                )}
                {addressStatus === 'available' && (
                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Address available
                  </Badge>
                )}
                {addressStatus === 'taken' && (
                  <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Address already in use
                  </Badge>
                )}
                {addressStatus === 'checking' && (
                  <Badge variant="secondary">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Verifying...
                  </Badge>
                )}
                {addressStatus === 'error' && verificationError && (
                  <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Error
                  </Badge>
                )}
              </div>

              {/* Verification Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleVerifyAddress}
                disabled={isVerifying || !predictedAddress}
                className="w-full"
              >
                <Shield className="h-3 w-3 mr-2" />
                {isVerifying ? 'Verifying...' : 'Verify Address Availability'}
              </Button>

              {/* Error Message */}
              {verificationError && (
                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                  {verificationError}
                </div>
              )}

              {/* Salt Suggestions */}
              {addressStatus === 'taken' && saltSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Address is already in use. Try one of these salts:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {saltSuggestions.slice(0, 3).map((suggestion, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        onClick={() => handleUseSuggestion(suggestion)}
                        className="text-xs h-7"
                      >
                        {suggestion.length > 20 ? `${suggestion.slice(0, 20)}...` : suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isCalculating && !predictedAddress && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Calculating address...</span>
          </div>
        )}

        {/* Waiting for compilation */}
        {enabled && !bytecode && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3" />
              <span>Address will be calculated after contract compilation</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
