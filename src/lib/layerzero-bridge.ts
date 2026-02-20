import { ethers } from 'ethers'
import { 
  ONFT_ABI, 
  ONFT_ADAPTER_ABI, 
  getLayerZeroChainId, 
  addressToBytes32, 
  encodeOptions,
  GAS_LIMITS 
} from './layerzero'
import { LayerZeroChain } from './chains'
import { ExecutorOptions, DvnConfigurator } from './dvn-configurator'

export interface BridgeParams {
  contractAddress: string // Bridge contract (ONFT Adapter or direct ONFT)
  tokenId: string
  sourceChain: LayerZeroChain
  destinationChain: LayerZeroChain
  recipientAddress: string
  signer: ethers.Signer
  originalCollectionAddress?: string // Original NFT collection for ownership checking
  executorOptions?: ExecutorOptions // Optional: Custom executor options (uses defaults if not provided)
}

export interface GasBreakdown {
  sourceChainGas: string // Source transaction gas cost (ETH)
  layerZeroFee: string // Total LayerZero fee (ETH)
  dvnFees: string // DVN verification fees (ETH)
  executorFees: string // Executor fees (ETH)
  destinationGas: string // Destination chain gas (ETH)
  totalCost: string // Total cost paid by user (ETH)
}

export interface BridgeResult {
  success: boolean
  transactionHash?: string
  error?: string
  guid?: string
  gasBreakdown?: GasBreakdown // Fee breakdown when transaction succeeds
  destinationContractAddress?: string // Destination ONFT contract address (peer address)
}

export interface BatchBridgeItem {
  tokenId: string
  contractAddress: string
  bridgeContractAddress: string
  originalCollectionAddress?: string
  preCrimeResult?: import('@/lib/precrime-service').PreCrimeValidationResult
}

export interface BatchBridgeProgress {
  total: number
  completed: number
  failed: number
  current?: {
    tokenId: string
    status: 'pending' | 'approving' | 'bridging' | 'success' | 'failed'
    error?: string
    transactionHash?: string
    guid?: string
    preCrimeResult?: import('@/lib/precrime-service').PreCrimeValidationResult
  }
  results: Array<{
    tokenId: string
    success: boolean
    transactionHash?: string
    guid?: string
    error?: string
  }>
}

export interface BatchBridgeResult {
  success: boolean
  total: number
  succeeded: number
  failed: number
  results: BridgeResult[]
  totalGasBreakdown?: GasBreakdown
}

export class LayerZeroBridge {
  
  /**
   * Bridge an NFT using LayerZero ONFT or ONFT Adapter
   */
  static async bridgeNFT(params: BridgeParams): Promise<BridgeResult> {
    const { contractAddress, tokenId, sourceChain, destinationChain, recipientAddress, signer, originalCollectionAddress } = params
    
    try {
      console.log('🌉 Starting LayerZero NFT bridge...')
      console.log(`📍 From: ${sourceChain.name} (${contractAddress})`)
      console.log(`📍 To: ${destinationChain.name}`)
      console.log(`🆔 Token ID: ${tokenId}`)
      console.log(`👤 Recipient: ${recipientAddress}`)
      
      // Get LayerZero chain IDs
      const srcEid = getLayerZeroChainId(sourceChain.id)
      const dstEid = getLayerZeroChainId(destinationChain.id)
      
      if (!srcEid || !dstEid) {
        throw new Error(`LayerZero not supported for chains: ${sourceChain.name} -> ${destinationChain.name}`)
      }
      
      console.log(`🔗 LayerZero EIDs: ${srcEid} -> ${dstEid}`)
      
      // Determine if we're using an adapter or direct ONFT
      const isAdapter = !!originalCollectionAddress
      const ownershipAddress = originalCollectionAddress || contractAddress
      
      console.log(`🔍 Contract type: ${isAdapter ? 'ONFT Adapter' : 'Direct ONFT'}`)
      console.log(`🔍 Ownership contract: ${ownershipAddress}`)
      console.log(`🔍 Bridge contract: ${contractAddress}`)
      
      // Check ownership on the appropriate contract
      const ownershipContract = new ethers.Contract(ownershipAddress, ONFT_ABI, signer)
      
      // Bridge contract uses appropriate ABI based on type
      const bridgeABI = isAdapter ? [...ONFT_ADAPTER_ABI, ...ONFT_ABI] : ONFT_ABI
      const bridgeContract = new ethers.Contract(contractAddress, bridgeABI, signer)
      
      // Check if user owns the NFT (on original collection for adapters)
      const owner = await ownershipContract.ownerOf(tokenId)
      const userAddress = await signer.getAddress()
      
      if (owner.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error(`You don't own NFT #${tokenId}. Owner: ${owner}`)
      }
      
      console.log(`✅ Verified ownership of NFT #${tokenId}`)
      
      // Check if peer is set for destination chain (on bridge contract)
      const peer = await bridgeContract.peers(dstEid)
      if (peer === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        throw new Error(`No peer set for destination chain ${destinationChain.name}. Please deploy ONFT on destination chain first.`)
      }
      
      // Extract the actual address from bytes32 peer (remove padding)
      const peerAddress = ethers.utils.getAddress('0x' + peer.slice(-40))
      console.log(`✅ Peer found for ${destinationChain.name}: ${peer} (address: ${peerAddress})`)
      
      // Store peer address for message tracking
      const destinationContractAddress = peerAddress
      
      // For adapters, we need to approve the adapter to transfer the NFT
      if (isAdapter) {
        console.log('🔐 Checking approval for ONFT Adapter...')
        const approved = await ownershipContract.getApproved(tokenId)
        const isApprovedForAll = await ownershipContract.isApprovedForAll(userAddress, contractAddress)
        
        if (approved.toLowerCase() !== contractAddress.toLowerCase() && !isApprovedForAll) {
          console.log('🔐 Approving ONFT Adapter to transfer NFT...')
          const approveTx = await ownershipContract.approve(contractAddress, tokenId)
          console.log(`📡 Approval transaction: ${approveTx.hash}`)
          await approveTx.wait()
          console.log('✅ ONFT Adapter approved')
        } else {
          console.log('✅ ONFT Adapter already approved')
        }
      }
      
      // Use bridge contract for all bridge operations
      const contract = bridgeContract
      
      console.log(`🔧 Using ABI: ${isAdapter ? 'ONFT_ADAPTER_ABI + ONFT_ABI' : 'ONFT_ABI'}`)
      
      // Validate contract has required functions and check available functions
      console.log('🔍 Checking contract functions and state...')
      try {
        const contractInterface = contract.interface
        const allFunctions = Object.keys(contractInterface.functions)
        console.log('📋 Available contract functions:', allFunctions.slice(0, 20).join(', '), allFunctions.length > 20 ? `... (${allFunctions.length} total)` : '')
        
        // Try to call basic functions to verify contract works
        try {
          const contractOwner = await contract.owner()
          console.log('✅ Contract owner:', contractOwner)
        } catch (e: any) {
          console.log('⚠️ Could not get contract owner:', e.message)
        }
        
        // Check if quoteSend exists
        const hasQuoteSend = allFunctions.some(f => f.includes('quoteSend'))
        console.log('🔍 Has quoteSend function:', hasQuoteSend)
        
        // Check if innerToken exists (for adapters) - but don't call it if it's failing
        if (isAdapter) {
          const hasInnerToken = allFunctions.some(f => f.includes('innerToken'))
          console.log('🔍 Has innerToken function:', hasInnerToken)
          
          // innerToken() is failing, so skip calling it for now
          console.log('⚠️ Skipping innerToken() call - function exists but reverting')
        }
        
        // Check peer configuration one more time
        try {
          const peerCheck = await contract.peers(dstEid)
          console.log('✅ Peer check successful:', peerCheck)
        } catch (e: any) {
          console.log('❌ Peer check failed:', e.message)
        }
      } catch (error: any) {
        console.log('⚠️ Contract function check warning:', error.message)
      }
      
      // Prepare execution options for LayerZero V2
      // Use configured executor options or defaults
      const executorOpts = params.executorOptions || DvnConfigurator.getDefaultExecutorOptions()
      const defaultEncodedOptions = DvnConfigurator.encodeExecutorOptions(executorOpts)
      
      console.log('⚙️ Executor options configured:', {
        receiveGasLimit: executorOpts.receiveGasLimit,
        enabledOptions: executorOpts.enabledOptions,
        hasExecutor: !!params.executorOptions,
        preCrimeEnabled: executorOpts.preCrimeEnabled || false
      })
      
      // PreCrime validation (if enabled)
      if (executorOpts.preCrimeEnabled && executorOpts.preCrimeAddress) {
        console.log('🛡️ Running PreCrime validation...')
        try {
          const { PreCrimeService } = await import('@/lib/precrime-service')
          const provider = signer.provider || new ethers.providers.Web3Provider(window.ethereum)
          
          const validationResult = await PreCrimeService.validateONFTBridge(
            sourceChain,
            destinationChain,
            contractAddress,
            tokenId,
            recipientAddress,
            executorOpts.preCrimeAddress
          )
          
          if (!validationResult.isValid) {
            console.warn('⚠️ PreCrime validation failed:', validationResult.error)
            // Don't block the transaction, but log the warning
            // In production, you might want to show this to the user
          } else {
            console.log('✅ PreCrime validation passed')
          }
        } catch (error: any) {
          console.warn('⚠️ PreCrime validation error (continuing anyway):', error.message)
          // Don't block the transaction if PreCrime fails
        }
      }
      
      // Try empty options first - some contracts prefer empty
      // If that fails, we'll use the configured executor options
      let executionOptions = '0x' // Start with empty options
      
      console.log('🔍 Testing with empty execution options first...')
      
      // Prepare send parameters following LayerZero V2 documentation
      const sendParam = {
        dstEid: dstEid,
        to: addressToBytes32(recipientAddress),
        tokenId: tokenId,
        extraOptions: executionOptions, // Start with empty - will try encoded if needed
        composeMsg: '0x',   // The composed message for the send() operation
        onftCmd: '0x'       // The ONFT command to be executed (unused in default implementations)
      }
      
      console.log('📋 Send parameters:', sendParam)
      console.log('📋 Destination EID:', dstEid)
      console.log('📋 Recipient (bytes32):', addressToBytes32(recipientAddress))
      console.log('📋 Token ID:', tokenId)
      console.log('📋 Extra Options:', sendParam.extraOptions)
      console.log('📋 Compose Msg:', sendParam.composeMsg)
      console.log('📋 ONFT Cmd:', sendParam.onftCmd)
      
      // Quote the fee using proper LayerZero V2 method
      // IMPORTANT: Use contract's quoteSend first - this is what the send() function validates against
      console.log('💰 Quoting LayerZero fee...')
      let nativeFee: ethers.BigNumber
      
      // Try contract's quoteSend first (CRITICAL - this is what send() validates against)
      // Try with empty options first, then try with encoded options if that fails
      let quoteSendSucceeded = false
      try {
        console.log('🔍 Attempting contract quoteSend with empty options (primary method)...')
        console.log('🔍 Contract address:', contract.address)
        console.log('🔍 Send parameters for quote:', JSON.stringify({
          dstEid: sendParam.dstEid,
          to: sendParam.to,
          tokenId: sendParam.tokenId.toString(),
          extraOptions: sendParam.extraOptions,
          composeMsg: sendParam.composeMsg,
          onftCmd: sendParam.onftCmd
        }, null, 2))
        
        // Try to call quoteSend with empty options first
        const quote = await contract.quoteSend(sendParam, false)
        nativeFee = quote.nativeFee
        quoteSendSucceeded = true
        console.log('✅ Contract quoteSend successful with empty options! Fee:', ethers.utils.formatEther(nativeFee), 'ETH')
        console.log('💡 This fee will be validated by the send() function')
      } catch (error1: any) {
        console.log('⚠️ quoteSend failed with empty options, trying with encoded options...')
        console.log('Error:', error1.message)
        
        // Try with properly encoded execution options
        try {
          // Use configured executor options (from DVN configurator or defaults)
          sendParam.extraOptions = defaultEncodedOptions
          
          console.log('🔍 Attempting quoteSend with configured executor options:', defaultEncodedOptions)
          console.log('⚙️ Options details:', {
            receiveGasLimit: executorOpts.receiveGasLimit,
            composeGasLimit: executorOpts.composeGasLimit,
            orderedGasLimit: executorOpts.orderedGasLimit,
            enabledOptions: executorOpts.enabledOptions
          })
          const quote = await contract.quoteSend(sendParam, false)
          nativeFee = quote.nativeFee
          quoteSendSucceeded = true
          console.log('✅ Contract quoteSend successful with encoded options! Fee:', ethers.utils.formatEther(nativeFee), 'ETH')
        } catch (error2: any) {
          console.error('❌ Contract quoteSend FAILED with both empty and encoded options!')
          console.error('❌ Empty options error:', error1.message)
          console.error('❌ Encoded options error:', error2.message)
          
          // Try the standard OApp quote function as a last resort
          console.log('🔍 Attempting fallback to standard OApp.quote function...')
          try {
            // For OApp.quote, we need to encode the message differently
            // ONFT typically sends: recipient (bytes32) + tokenId (uint256)
            const messagePayload = ethers.utils.defaultAbiCoder.encode(
              ['bytes32', 'uint256'],
              [addressToBytes32(recipientAddress), tokenId]
            )
            
            // Try with empty options first
            let quoteResult
            try {
              quoteResult = await contract['quote(uint32,bytes,bytes,bool)'](
                dstEid,
                messagePayload,
                '0x',
                false
              )
              nativeFee = quoteResult.nativeFee
              quoteSendSucceeded = true
              console.log('✅ OApp.quote with empty options succeeded! Fee:', ethers.utils.formatEther(nativeFee), 'ETH')
              console.log('⚠️ Using OApp.quote instead of quoteSend - proceed with caution')
            } catch (oappError1: any) {
              // Try with configured executor options
              quoteResult = await contract['quote(uint32,bytes,bytes,bool)'](
                dstEid,
                messagePayload,
                defaultEncodedOptions,
                false
              )
              nativeFee = quoteResult.nativeFee
              quoteSendSucceeded = true
              console.log('✅ OApp.quote with encoded options succeeded! Fee:', ethers.utils.formatEther(nativeFee), 'ETH')
              console.log('⚠️ Using OApp.quote instead of quoteSend - proceed with caution')
            }
          } catch (oappError: any) {
            console.error('❌ OApp.quote also failed:', oappError.message)
            
            // All contract quote methods failed - try LayerZero endpoint directly as last resort
            console.log('🔍 Attempting final fallback: LayerZero endpoint direct quote...')
            try {
              const { getLayerZeroEndpoint } = await import('./layerzero')
              const lzEndpoint = getLayerZeroEndpoint(sourceChain.id)
              
              if (!lzEndpoint) {
                throw new Error('No LayerZero endpoint found')
              }
              
              const endpointContract = new ethers.Contract(lzEndpoint, [
                'function quote(tuple(uint32 dstEid, bytes32 to, bytes message, bytes options, bool payInLzToken) _params, address _sender) view returns (tuple(uint256 nativeFee, uint256 lzTokenFee) fee)'
              ], signer)
              
              // Encode ONFT message: recipient (bytes32) + tokenId (uint256)
              const onftMessage = ethers.utils.defaultAbiCoder.encode(
                ['bytes32', 'uint256'],
                [addressToBytes32(recipientAddress), tokenId]
              )
              
              // For endpoint quote, 'to' should be the destination ONFT contract (peer address)
              const endpointParams = {
                dstEid: dstEid,
                to: addressToBytes32(peerAddress), // Destination is the ONFT contract on Base
                message: onftMessage,
                options: '0x', // Empty options for now
                payInLzToken: false
              }
              
              console.log('🔍 Endpoint quote params:', {
                dstEid,
                to: peerAddress,
                messageLength: onftMessage.length
              })
              
              const endpointQuote = await endpointContract.quote(endpointParams, userAddress)
              nativeFee = endpointQuote.nativeFee
              quoteSendSucceeded = true
              console.log('✅ LayerZero endpoint quote succeeded! Fee:', ethers.utils.formatEther(nativeFee), 'ETH')
              console.log('⚠️ WARNING: Using endpoint quote instead of contract quote - proceeding with caution')
            } catch (endpointError: any) {
              console.error('❌ LayerZero endpoint quote also failed:', endpointError.message)
              console.error('❌ Endpoint error data:', endpointError.data)
              
              // All quote methods failed - use fallback fee and proceed anyway to get real error
              console.log('⚠️ All quote methods failed - using fallback fee estimate and proceeding...')
              console.log('⚠️ The send() call will likely fail, but we\'ll get a better error message')
              
              // Use a reasonable fallback fee (0.002 ETH = ~$6, higher than typical to ensure we have enough)
              nativeFee = ethers.utils.parseEther('0.002')
              quoteSendSucceeded = true // Set to true so we proceed
              console.log('⚠️ Using fallback fee:', ethers.utils.formatEther(nativeFee), 'ETH')
              console.log('⚠️ WARNING: This fee may not be accurate - proceeding to see actual error')
            }
          }
        }
      }
      
      if (!quoteSendSucceeded) {
        // This shouldn't happen due to the fallback above, but just in case
        throw new Error('quoteSend failed but error was not properly handled')
      }
      
      console.log(`💰 LayerZero fee: ${ethers.utils.formatEther(nativeFee)} ETH`)
      console.log('💡 Fee breakdown:')
      console.log('  • Source chain gas (Ethereum)')
      console.log('  • DVN verification fees (security)')
      console.log('  • Executor fees (message delivery)')
      console.log('  • Destination gas (Base network)')
      console.log('  • This fee is paid to LayerZero infrastructure, not us!')
      
      // Prepare fee structure as MessagingFee (following LayerZero V2 docs)
      const messagingFee = {
        nativeFee: nativeFee,
        lzTokenFee: ethers.BigNumber.from(0)
      }
      
      // Ensure we use executor options for the actual send (if they were used for quoting)
      // This enables single-transaction bridging when executor is configured
      if (quoteSendSucceeded && sendParam.extraOptions !== '0x') {
        console.log('✅ Using executor options for bridge transaction - users will only pay on source chain!')
        console.log('⚙️ Executor will pay destination chain gas fees')
      } else if (sendParam.extraOptions === '0x' && defaultEncodedOptions !== '0x') {
        console.log('🔄 Updating to use executor options for better UX (single-transaction bridging)...')
        sendParam.extraOptions = defaultEncodedOptions
      } else {
        console.log('ℹ️ No executor options - users will need to pay destination chain gas separately')
      }
      
      console.log('📋 Final send parameters:', {
        sendParam,
        messagingFee,
        refundAddress: userAddress,
        extraOptions: sendParam.extraOptions
      })
      
      // Pre-flight validation before attempting send
      console.log('🔍 Running pre-flight validation...')
      
      // For adapters, double-check approval status right before sending
      if (isAdapter) {
        console.log('🔐 Final approval check before send...')
        const finalApprovalCheck = await ownershipContract.getApproved(tokenId)
        const finalApprovalForAllCheck = await ownershipContract.isApprovedForAll(userAddress, contractAddress)
        console.log(`🔐 Token-specific approval: ${finalApprovalCheck}`)
        console.log(`🔐 Approval for all: ${finalApprovalForAllCheck}`)
        
        if (finalApprovalCheck.toLowerCase() !== contractAddress.toLowerCase() && !finalApprovalForAllCheck) {
          throw new Error(`ONFT Adapter is not approved to transfer NFT #${tokenId}. Please approve the adapter first.`)
        }
        
        // Check if token is already locked (this would prevent sending)
        // Note: Official LayerZero adapters may not have this function
        try {
          if (contract.isTokenLocked) {
            const isLocked = await contract.isTokenLocked(tokenId)
            if (isLocked) {
              throw new Error(`NFT #${tokenId} is already locked in the adapter. It cannot be bridged again until unlocked.`)
            }
            console.log('✅ Token is not locked')
          } else {
            console.log('ℹ️ Lock status check not available (using official LayerZero adapter)')
          }
        } catch (checkError: any) {
          if (checkError.message && checkError.message.includes('already locked')) {
            throw checkError
          }
          // Function doesn't exist or other error - ignore for now (official contracts may not have this)
          console.log('⚠️ Could not check lock status:', checkError.message || 'Function may not exist')
        }
      }
      
      // Verify ownership one more time
      const finalOwnerCheck = await ownershipContract.ownerOf(tokenId)
      if (finalOwnerCheck.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error(`You no longer own NFT #${tokenId}. Current owner: ${finalOwnerCheck}`)
      }
      console.log('✅ Final ownership verification passed')
      
      // Estimate gas first to catch potential issues early
      let estimatedGas: ethers.BigNumber | undefined
      try {
        console.log('🔍 Estimating gas for bridge transaction...')
        // Use callStatic to simulate the transaction and catch revert reasons
        try {
          await contract.callStatic.send(
            sendParam,
            messagingFee,
            userAddress,
            {
              value: nativeFee
            }
          )
        } catch (staticError: any) {
          console.error('❌ Transaction simulation failed:', staticError.message)
          console.error('❌ Full error:', staticError)
          
          // Try to extract revert reason from error data
          if (staticError.data && staticError.data !== '0x') {
            console.error('📋 Error data:', staticError.data)
            const errorSelector = staticError.data.slice(0, 10)
            console.error('📋 Error selector:', errorSelector)
            
            // Try to decode as a string revert message
            if (staticError.data.length > 10) {
              try {
                const revertData = '0x' + staticError.data.slice(10) // Remove selector
                console.error('📋 Revert data (without selector):', revertData)
                
                // Try decoding as string
                if (revertData.length >= 130) {
                  try {
                    const decoded = ethers.utils.defaultAbiCoder.decode(['string'], revertData)
                    console.error('📋 Decoded revert message (string):', decoded[0])
                  } catch (e) {
                    console.error('📋 Could not decode as string')
                  }
                }
              } catch (decodeError) {
                console.error('📋 Could not decode revert data:', decodeError)
              }
            }
            
            // Common LayerZero error selectors
            const knownErrors: { [key: string]: string } = {
              '0x6592671c': 'InvalidPeer - peer not configured or invalid',
              '0x08c379a0': 'Error(string) - standard Solidity error',
              '0x4e487b71': 'Panic(uint256) - Solidity panic'
            }
            
            if (knownErrors[errorSelector]) {
              console.error('📋 Known error type:', knownErrors[errorSelector])
            }
          } else {
            console.error('📋 No error data (empty revert) - suggests a require() or revert without message')
          }
          
          // Try to extract revert reason
          if (staticError.reason) {
            console.error('📋 Revert reason:', staticError.reason)
            throw new Error(`Transaction would fail: ${staticError.reason}`)
          }
          
          // Provide helpful error message
          const errorMsg = `Transaction would fail. All contract quote methods are reverting, which suggests:
1. Contract state issue - LayerZero endpoint may not be properly initialized
2. Peer configuration issue - peer may not be correctly set up
3. Contract ABI mismatch - contract may not match expected ONFT721Adapter interface

Error: ${staticError.message || 'Unknown error'}
Contract: ${contract.address}
Check on Etherscan: https://etherscan.io/address/${contract.address}`

          throw new Error(errorMsg)
        }
        
        // If simulation passed, estimate gas
        estimatedGas = await contract.estimateGas.send(
          sendParam,
          messagingFee,
          userAddress,
          {
            value: nativeFee
          }
        )
        console.log(`✅ Gas estimation successful: ${estimatedGas.toString()}`)
      } catch (gasError: any) {
        console.error('❌ Gas estimation failed:', gasError.message)
        // If it's already our custom error, re-throw it
        if (gasError.message.includes('Transaction would fail')) {
          throw gasError
        }
        // Otherwise use default gas limit
        console.log('⚠️ Using default gas limit: 500000')
        estimatedGas = ethers.BigNumber.from(500000)
      }
      
      // Execute the bridge transaction
      console.log('🚀 Executing bridge transaction...')
      const gasLimit = estimatedGas ? estimatedGas.mul(120).div(100) : ethers.BigNumber.from(500000)
      console.log(`⛽ Using gas limit: ${gasLimit.toString()}`)
      
      const tx = await contract.send(
        sendParam,
        messagingFee,
        userAddress, // refund address
        {
          value: nativeFee,
          gasLimit: gasLimit
        }
      )
      
      console.log(`⏳ Transaction submitted: ${tx.hash}`)
      console.log('⏳ Waiting for confirmation...')
      
      const receipt = await tx.wait()
      
      console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`)
      
      // Extract GUID from events
      let guid: string | undefined
      for (const log of receipt.logs) {
        try {
          const parsed = contract.interface.parseLog(log)
          if (parsed.name === 'ONFTSent') {
            guid = parsed.args.guid
            console.log(`📨 ONFT sent with GUID: ${guid}`)
            break
          }
        } catch (e) {
          // Ignore parsing errors for other events
        }
      }
      
      // Calculate gas breakdown
      let gasBreakdown: GasBreakdown | undefined
      try {
        // Get transaction details to calculate source chain gas cost
        const txResponse = await signer.provider!.getTransaction(tx.hash)
        const gasPrice = txResponse.gasPrice || receipt.effectiveGasPrice || ethers.BigNumber.from(0)
        const gasUsed = receipt.gasUsed
        const sourceChainGasCost = gasUsed.mul(gasPrice)
        const sourceChainGasCostEth = ethers.utils.formatEther(sourceChainGasCost)
        
        // LayerZero fee breakdown estimation
        // Based on typical LayerZero fee structure:
        // - DVN fees: ~40% of LayerZero fee
        // - Executor fees: ~30% of LayerZero fee  
        // - Destination gas: ~10% of LayerZero fee (if executor is not configured)
        // - Remaining: ~20% (protocol overhead)
        
        const layerZeroFeeEth = ethers.utils.formatEther(nativeFee)
        const layerZeroFeeBN = nativeFee
        
        // Check if executor is configured (executor pays destination gas)
        const hasExecutor = sendParam.extraOptions !== '0x'
        
        // Calculate breakdown (approximate percentages)
        const dvnFeesBN = layerZeroFeeBN.mul(40).div(100) // ~40%
        const executorFeesBN = layerZeroFeeBN.mul(30).div(100) // ~30%
        const destinationGasBN = hasExecutor 
          ? ethers.BigNumber.from(0) // Executor pays destination gas
          : layerZeroFeeBN.mul(10).div(100) // ~10% if no executor
        
        // Total cost = source chain gas + LayerZero fee
        const totalCostBN = sourceChainGasCost.add(layerZeroFeeBN)
        
        gasBreakdown = {
          sourceChainGas: sourceChainGasCostEth,
          layerZeroFee: layerZeroFeeEth,
          dvnFees: ethers.utils.formatEther(dvnFeesBN),
          executorFees: ethers.utils.formatEther(executorFeesBN),
          destinationGas: hasExecutor ? '0' : ethers.utils.formatEther(destinationGasBN),
          totalCost: ethers.utils.formatEther(totalCostBN)
        }
        
        console.log('💰 Gas Breakdown:', {
          sourceChainGas: gasBreakdown.sourceChainGas,
          layerZeroFee: gasBreakdown.layerZeroFee,
          dvnFees: gasBreakdown.dvnFees,
          executorFees: gasBreakdown.executorFees,
          destinationGas: gasBreakdown.destinationGas,
          totalCost: gasBreakdown.totalCost,
          hasExecutor: hasExecutor
        })
      } catch (breakdownError: any) {
        console.warn('⚠️ Could not calculate gas breakdown:', breakdownError.message)
        // Continue without breakdown - not critical
      }
      
      return {
        success: true,
        transactionHash: tx.hash,
        guid: guid,
        gasBreakdown: gasBreakdown,
        destinationContractAddress: destinationContractAddress
      }
      
    } catch (error: any) {
      console.error('❌ Bridge failed:', error)
      
      let errorMessage = 'Unknown error occurred'
      if (error.message) {
        errorMessage = error.message
      } else if (error.reason) {
        errorMessage = error.reason
      } else if (error.data?.message) {
        errorMessage = error.data.message
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }
  
  /**
   * Batch bridge multiple NFTs using LayerZero
   * Optimizes by batching approvals and sending sequentially with progress tracking
   */
  static async batchBridgeNFTs(
    items: BatchBridgeItem[],
    sourceChain: LayerZeroChain,
    destinationChain: LayerZeroChain,
    recipientAddress: string,
    signer: ethers.Signer,
    executorOptions?: ExecutorOptions,
    onProgress?: (progress: BatchBridgeProgress) => void
  ): Promise<BatchBridgeResult> {
    console.log(`🚀 Starting batch bridge for ${items.length} NFTs...`)
    
    const results: BridgeResult[] = []
    const progress: BatchBridgeProgress = {
      total: items.length,
      completed: 0,
      failed: 0,
      results: []
    }
    
    // Group NFTs by collection for batch approvals
    const collectionGroups = new Map<string, BatchBridgeItem[]>()
    for (const item of items) {
      const collectionKey = item.originalCollectionAddress || item.contractAddress
      if (!collectionGroups.has(collectionKey)) {
        collectionGroups.set(collectionKey, [])
      }
      collectionGroups.get(collectionKey)!.push(item)
    }
    
    console.log(`📦 Grouped into ${collectionGroups.size} collection(s) for batch approvals`)
    
    // Step 1: Batch approve all collections
    const userAddress = await signer.getAddress()
    for (const [collectionAddress, collectionItems] of Array.from(collectionGroups.entries())) {
      const firstItem = collectionItems[0]
      const isAdapter = !!firstItem.originalCollectionAddress
      
      if (isAdapter) {
        const ownershipContract = new ethers.Contract(collectionAddress, ONFT_ABI, signer)
        const bridgeContractAddress = firstItem.bridgeContractAddress
        
        // Check if already approved for all
        const isApprovedForAll = await ownershipContract.isApprovedForAll(userAddress, bridgeContractAddress)
        
        if (!isApprovedForAll) {
          console.log(`🔐 Batch approving collection ${collectionAddress} for adapter ${bridgeContractAddress}...`)
          const approveTx = await ownershipContract.setApprovalForAll(bridgeContractAddress, true)
          await approveTx.wait()
          console.log(`✅ Batch approved ${collectionItems.length} NFTs from collection ${collectionAddress}`)
        } else {
          console.log(`✅ Collection ${collectionAddress} already approved for all`)
        }
      }
    }
    
    // Step 2: Bridge each NFT sequentially with progress tracking
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      
      // PreCrime validation (if enabled)
      if (executorOptions?.preCrimeEnabled && executorOptions?.preCrimeAddress) {
        try {
          console.log(`🛡️ Running PreCrime validation for NFT #${item.tokenId}...`)
          const { PreCrimeService } = await import('@/lib/precrime-service')
          const provider = signer.provider || new ethers.providers.Web3Provider(window.ethereum)
          
          const validationResult = await PreCrimeService.validateONFTBridge(
            sourceChain,
            destinationChain,
            item.contractAddress,
            item.tokenId,
            recipientAddress,
            executorOptions.preCrimeAddress
          )
          
          if (!validationResult.isValid) {
            console.warn(`⚠️ PreCrime validation failed for NFT #${item.tokenId}:`, validationResult.error)
            // Store validation result in item
            item.preCrimeResult = validationResult
          } else {
            console.log(`✅ PreCrime validation passed for NFT #${item.tokenId}`)
            item.preCrimeResult = validationResult
          }
        } catch (error: any) {
          console.warn(`⚠️ PreCrime validation error for NFT #${item.tokenId} (continuing anyway):`, error.message)
        }
      }
      
      progress.current = {
        tokenId: item.tokenId,
        status: 'bridging',
        preCrimeResult: item.preCrimeResult
      }
      onProgress?.(progress)
      
      try {
        const bridgeResult = await LayerZeroBridge.bridgeNFT({
          contractAddress: item.bridgeContractAddress,
          tokenId: item.tokenId,
          sourceChain,
          destinationChain,
          recipientAddress,
          signer,
          originalCollectionAddress: item.originalCollectionAddress,
          executorOptions
        })
        
        results.push(bridgeResult)
        
        if (bridgeResult.success) {
          progress.completed++
          progress.current.status = 'success'
          progress.current.transactionHash = bridgeResult.transactionHash
          progress.current.guid = bridgeResult.guid
          progress.results.push({
            tokenId: item.tokenId,
            success: true,
            transactionHash: bridgeResult.transactionHash,
            guid: bridgeResult.guid
          })
          console.log(`✅ [${i + 1}/${items.length}] Successfully bridged NFT #${item.tokenId}`)
        } else {
          progress.failed++
          progress.current.status = 'failed'
          progress.current.error = bridgeResult.error
          progress.results.push({
            tokenId: item.tokenId,
            success: false,
            error: bridgeResult.error
          })
          console.error(`❌ [${i + 1}/${items.length}] Failed to bridge NFT #${item.tokenId}: ${bridgeResult.error}`)
        }
      } catch (error: any) {
        progress.failed++
        progress.current.status = 'failed'
        progress.current.error = error.message || 'Unknown error'
        results.push({
          success: false,
          error: error.message || 'Unknown error'
        })
        progress.results.push({
          tokenId: item.tokenId,
          success: false,
          error: error.message || 'Unknown error'
        })
        console.error(`❌ [${i + 1}/${items.length}] Exception bridging NFT #${item.tokenId}:`, error)
      }
      
      onProgress?.(progress)
    }
    
    // Calculate total gas breakdown
    let totalGasBreakdown: GasBreakdown | undefined
    try {
      const successfulResults = results.filter(r => r.success && r.gasBreakdown)
      if (successfulResults.length > 0) {
        const totalSourceGas = successfulResults.reduce((sum, r) => 
          sum.add(ethers.utils.parseEther(r.gasBreakdown!.sourceChainGas)), 
          ethers.BigNumber.from(0)
        )
        const totalLayerZeroFee = successfulResults.reduce((sum, r) => 
          sum.add(ethers.utils.parseEther(r.gasBreakdown!.layerZeroFee)), 
          ethers.BigNumber.from(0)
        )
        const totalDvnFees = successfulResults.reduce((sum, r) => 
          sum.add(ethers.utils.parseEther(r.gasBreakdown!.dvnFees)), 
          ethers.BigNumber.from(0)
        )
        const totalExecutorFees = successfulResults.reduce((sum, r) => 
          sum.add(ethers.utils.parseEther(r.gasBreakdown!.executorFees)), 
          ethers.BigNumber.from(0)
        )
        const totalDestinationGas = successfulResults.reduce((sum, r) => 
          sum.add(ethers.utils.parseEther(r.gasBreakdown!.destinationGas)), 
          ethers.BigNumber.from(0)
        )
        const totalCost = totalSourceGas.add(totalLayerZeroFee)
        
        totalGasBreakdown = {
          sourceChainGas: ethers.utils.formatEther(totalSourceGas),
          layerZeroFee: ethers.utils.formatEther(totalLayerZeroFee),
          dvnFees: ethers.utils.formatEther(totalDvnFees),
          executorFees: ethers.utils.formatEther(totalExecutorFees),
          destinationGas: ethers.utils.formatEther(totalDestinationGas),
          totalCost: ethers.utils.formatEther(totalCost)
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not calculate total gas breakdown:', error)
    }
    
    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    
    console.log(`📊 Batch bridge complete: ${succeeded} succeeded, ${failed} failed out of ${items.length} total`)
    
    return {
      success: failed === 0,
      total: items.length,
      succeeded,
      failed,
      results,
      totalGasBreakdown
    }
  }
  
  /**
   * Check if a contract is an ONFT or ONFT Adapter
   */
  static async detectContractType(contractAddress: string, provider: ethers.providers.Provider): Promise<'onft' | 'adapter' | 'erc721' | 'unknown'> {
    try {
      const contract = new ethers.Contract(contractAddress, [...ONFT_ABI, ...ONFT_ADAPTER_ABI], provider)
      
      // Try to call ONFT Adapter specific function
      try {
        await contract.innerToken()
        return 'adapter'
      } catch (e) {
        // Not an adapter
      }
      
      // Try to call ONFT specific functions
      try {
        await contract.peers(30101) // Try to get Ethereum peer
        return 'onft'
      } catch (e) {
        // Not an ONFT
      }
      
      // Check if it's at least ERC721
      try {
        await contract.name()
        await contract.symbol()
        return 'erc721'
      } catch (e) {
        return 'unknown'
      }
      
    } catch (error) {
      console.error('Error detecting contract type:', error)
      return 'unknown'
    }
  }
  
  /**
   * Get available destination chains for a contract
   */
  static async getAvailableDestinations(contractAddress: string, sourceChain: LayerZeroChain, provider: ethers.providers.Provider): Promise<LayerZeroChain[]> {
    try {
      const contract = new ethers.Contract(contractAddress, ONFT_ABI, provider)
      const availableChains: LayerZeroChain[] = []
      
      // Import chains here to avoid circular dependency
      const { LAYERZERO_CHAINS } = await import('./chains')
      
      // Check each chain for peer connections
      for (const chain of LAYERZERO_CHAINS) {
        if (chain.id === sourceChain.id) continue // Skip source chain
        
        const dstEid = getLayerZeroChainId(chain.id)
        if (!dstEid) continue
        
        try {
          const peer = await contract.peers(dstEid)
          if (peer !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            availableChains.push(chain)
          }
        } catch (e) {
          // Ignore errors for individual chain checks
        }
      }
      
      return availableChains
      
    } catch (error) {
      console.error('Error getting available destinations:', error)
      return []
    }
  }
}

