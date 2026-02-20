'use client'

import { useState } from 'react'
import { ethers } from 'ethers'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Zap, 
  CreditCard, 
  Shield, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  Clock
} from 'lucide-react'

interface AutoVerifyModalProps {
  isOpen: boolean
  onClose: () => void
  contractAddress: string
  network: 'ethereum' | 'base'
  contractType: 'ONFT721Adapter' | 'ONFT721'
  constructorArgs: string
  onVerificationComplete?: (success: boolean) => void
}

const VERIFICATION_FEE = '0.001' // 0.001 ETH
const SERVICE_WALLET = '0xbC5167F9d8E0391d20B3e06c3cfd77398154EAd9'

export function AutoVerifyModal({
  isOpen,
  onClose,
  contractAddress,
  network,
  contractType,
  constructorArgs,
  onVerificationComplete
}: AutoVerifyModalProps) {
  const [step, setStep] = useState<'payment' | 'processing' | 'complete' | 'error'>('payment')
  const [paymentTxHash, setPaymentTxHash] = useState<string>('')
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [error, setError] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePayment = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask to use auto-verification')
      return
    }

    try {
      setIsProcessing(true)
      setError('')

      const provider = new ethers.providers.Web3Provider(window.ethereum)
      
      // Check current network BEFORE getting signer
      const currentNetwork = await provider.getNetwork()
      console.log('🌐 Current wallet network:', currentNetwork.name, `(${currentNetwork.chainId})`)
      
      // Determine required network for payment (always Ethereum for now)
      const requiredChainId = 1 // Ethereum mainnet
      const requiredNetworkName = 'Ethereum'
      
      // Validate network before proceeding
      if (currentNetwork.chainId !== requiredChainId) {
        console.log(`❌ Wrong network! Currently on ${currentNetwork.name} (${currentNetwork.chainId}), need ${requiredNetworkName} (${requiredChainId})`)
        
        try {
          console.log(`🔄 Attempting to switch to ${requiredNetworkName}...`)
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${requiredChainId.toString(16)}` }],
          })
          
          // Wait a moment for the switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Verify the switch was successful
          const newNetwork = await provider.getNetwork()
          if (newNetwork.chainId !== requiredChainId) {
            throw new Error(`Network switch failed. Still on ${newNetwork.name} instead of ${requiredNetworkName}`)
          }
          
          console.log(`✅ Successfully switched to ${requiredNetworkName}`)
        } catch (switchError: any) {
          console.error('❌ Network switch failed:', switchError)
          setError(`Please manually switch your wallet to ${requiredNetworkName} network before making payment. Currently on: ${currentNetwork.name}`)
          setIsProcessing(false)
          return
        }
      }

      const signer = provider.getSigner()
      const userAddress = await signer.getAddress()

      console.log('💳 Processing payment for auto-verification...')
      console.log(`💰 Fee: ${VERIFICATION_FEE} ETH`)
      console.log(`📍 Service Wallet: ${SERVICE_WALLET}`)
      console.log(`🌐 Payment Network: ${requiredNetworkName} (${requiredChainId})`)

      // Send payment transaction
      const tx = await signer.sendTransaction({
        to: SERVICE_WALLET,
        value: ethers.utils.parseEther(VERIFICATION_FEE),
        data: ethers.utils.toUtf8Bytes(`AutoVerify:${contractAddress}:${network}`)
      })

      console.log('⏳ Payment transaction sent:', tx.hash)
      setPaymentTxHash(tx.hash)
      setStep('processing')

      // Wait for transaction confirmation
      const receipt = await tx.wait()
      console.log('✅ Payment confirmed in block:', receipt.blockNumber)

      // Submit for auto-verification
      await submitAutoVerification(tx.hash, userAddress)

    } catch (error: any) {
      console.error('❌ Payment failed:', error)
      setError(`Payment failed: ${error.message}`)
      setIsProcessing(false)
    }
  }

  const submitAutoVerification = async (txHash: string, userAddress: string) => {
    try {
      console.log('🔍 Submitting for auto-verification...')

      const response = await fetch('/api/auto-verify-contract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contractAddress,
          network,
          contractType,
          constructorArgs,
          paymentTxHash: txHash,
          userAddress
        })
      })

      const result = await response.json()

      if (result.success) {
        console.log('✅ Auto-verification service activated!')
        console.log('📋 Service details:', result)
        
        // Check if it's real verification or manual service
        if (result.realVerification) {
          setVerificationResult({
            ...result,
            message: 'Contract submitted to Etherscan for verification!',
            note: 'Real verification submitted via Etherscan API. Check status in 5-10 minutes.',
            serviceType: 'real'
          })
        } else if (result.manualVerification) {
          setVerificationResult({
            ...result,
            message: 'Payment confirmed! Manual verification service activated.',
            note: 'Your contract will be verified manually within 1 hour by our team.',
            serviceType: 'manual'
          })
        } else {
          setVerificationResult(result)
        }
        
        setStep('complete')
        onVerificationComplete?.(true)
      } else {
        console.error('❌ Auto-verification failed:', result.error)
        setError(result.error || 'Auto-verification failed')
        setStep('error')
        onVerificationComplete?.(false)
      }
    } catch (error: any) {
      console.error('❌ Auto-verification error:', error)
      setError(`Auto-verification failed: ${error.message}`)
      setStep('error')
      onVerificationComplete?.(false)
    } finally {
      setIsProcessing(false)
    }
  }

  const resetModal = () => {
    setStep('payment')
    setPaymentTxHash('')
    setVerificationResult(null)
    setError('')
    setIsProcessing(false)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            Auto-Verify Contract
          </DialogTitle>
          <DialogDescription>
            Automated contract verification service with instant results
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contract Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address:</span>
                <code className="bg-gray-800 text-gray-200 px-2 py-1 rounded text-xs">
                  {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
                </code>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network:</span>
                <Badge variant="outline" className="text-xs">
                  {network === 'ethereum' ? 'Ethereum' : 'Base'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="text-xs">{contractType}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Step */}
          {step === 'payment' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Required
                </CardTitle>
                <CardDescription className="text-xs">
                  One-time fee for automated verification service
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Network Warning */}
                <div className="border border-yellow-500/20 bg-yellow-500/10 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-yellow-300 text-xs font-medium">
                    <AlertCircle className="h-3 w-3" />
                    Payment Network: Ethereum Mainnet
                  </div>
                  <p className="text-xs text-yellow-200 mt-1">
                    Payment must be made on Ethereum network. We&apos;ll automatically switch your wallet if needed.
                  </p>
                </div>

                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{VERIFICATION_FEE} ETH</div>
                  <div className="text-xs text-muted-foreground">≈ $3.00 USD</div>
                </div>
                
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    <span>Fully automated Etherscan/Basescan submission</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    <span>Real contract verification via API</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    <span>Complete in 5-10 minutes automatically</span>
                  </div>
                </div>

                <Button 
                  onClick={handlePayment} 
                  disabled={isProcessing}
                  className="w-full"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing Payment...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Pay {VERIFICATION_FEE} ETH & Auto-Verify
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-400" />
                <div>
                  <h3 className="font-medium">Verifying Contract...</h3>
                  <p className="text-sm text-muted-foreground">
                    Payment confirmed. Submitting to block explorer.
                  </p>
                </div>
                {paymentTxHash && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Payment TX: </span>
                    <code className="bg-gray-800 text-gray-200 px-2 py-1 rounded">
                      {paymentTxHash.slice(0, 10)}...
                    </code>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Success Step */}
          {step === 'complete' && verificationResult && (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <CheckCircle className="h-8 w-8 mx-auto text-green-400" />
                <div>
                  <h3 className="font-medium text-green-400">
                    {verificationResult.serviceType === 'manual' ? 'Service Activated!' : 'Contract Verified!'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {verificationResult.message || 'Your contract has been verified successfully'}
                  </p>
                </div>
                {verificationResult.note && (
                  <div className="text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded p-2">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {verificationResult.note}
                  </div>
                )}
                {verificationResult.guid && (
                  <div className="text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded p-2">
                    <CheckCircle className="h-3 w-3 inline mr-1" />
                    Service ID: {verificationResult.guid}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(verificationResult.verificationUrl || verificationResult.explorerUrl, '_blank')}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Verified Contract
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <Card>
              <CardContent className="pt-6 text-center space-y-4">
                <AlertCircle className="h-8 w-8 mx-auto text-red-400" />
                <div>
                  <h3 className="font-medium text-red-400">Verification Failed</h3>
                  <p className="text-sm text-muted-foreground">
                    {error}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setStep('payment')}
                  className="w-full"
                >
                  Try Again
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Manual Alternative */}
          {step === 'payment' && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Prefer manual verification?{' '}
                <button 
                  onClick={handleClose}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Use free manual process
                </button>
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
