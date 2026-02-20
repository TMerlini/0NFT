'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { DvnConfigurator, UlnConfig, ExecutorConfig, ExecutorOptions, ExecutorOptionType, CONFIG_TYPES, DEFAULT_DVN_ADDRESSES, DEFAULT_EXECUTOR_ADDRESSES, DEFAULT_MESSAGE_LIBRARIES } from '@/lib/dvn-configurator'
import { LayerZeroChain } from '@/lib/chains'
import { getLayerZeroChainId } from '@/lib/layerzero'
import { ethers } from 'ethers'
import { 
  Shield, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ExternalLink,
  Settings,
  Info,
  AlertTriangle,
  HelpCircle,
  Zap
} from 'lucide-react'

interface DvnConfiguratorProps {
  oappAddress: string
  chain: LayerZeroChain
  remoteChain: LayerZeroChain
}

export function DvnConfiguratorComponent({ 
  oappAddress, 
  chain, 
  remoteChain 
}: DvnConfiguratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  
  // Configuration state
  const [confirmations, setConfirmations] = useState(15)
  const [selectedRequiredDVNs, setSelectedRequiredDVNs] = useState<string[]>([])
  const [selectedOptionalDVNs, setSelectedOptionalDVNs] = useState<string[]>([])
  const [optionalDVNThreshold, setOptionalDVNThreshold] = useState(0)
  const [maxMessageSize, setMaxMessageSize] = useState(10000)
  
  // Executor options state
  const [executorOptions, setExecutorOptions] = useState<ExecutorOptions>(DvnConfigurator.getDefaultExecutorOptions())
  const [showExecutorOptionsInfo, setShowExecutorOptionsInfo] = useState(false)
  
  // Available DVNs for this chain
  const availableDVNs = DvnConfigurator.getAvailableDVNs(chain.id)
  const dvnNames = Object.keys(availableDVNs)
  
  // Current configs (for validation)
  const [sendConfig, setSendConfig] = useState<UlnConfig | null>(null)
  const [receiveConfig, setReceiveConfig] = useState<UlnConfig | null>(null)
  const [executorConfig, setExecutorConfig] = useState<ExecutorConfig | null>(null)
  const [defaultConfig, setDefaultConfig] = useState<UlnConfig | null>(null)

  const remoteEid = getLayerZeroChainId(remoteChain.id)
  const [sendLibAddress, setSendLibAddress] = useState<string | null>(null)
  const [receiveLibAddress, setReceiveLibAddress] = useState<string | null>(null)
  const [receiveLibIsDefault, setReceiveLibIsDefault] = useState<boolean>(false)
  const [executorAddress, setExecutorAddress] = useState<string | null>(null)

  // Load libraries and executor address on mount
  useEffect(() => {
    if (remoteEid) {
      loadMessageLibraries()
      loadExecutorAddress()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteEid])

  // Load full configuration when dialog opens
  useEffect(() => {
    if (isOpen && remoteEid) {
      loadCurrentConfig()
      loadDefaultConfig()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, remoteEid])

  // Check config status for indicator (runs when libraries are loaded)
  useEffect(() => {
    if (remoteEid && sendLibAddress && receiveLibAddress && !isOpen) {
      // Only check when dialog is closed to avoid conflicts with loadCurrentConfig
      const checkConfigStatus = async () => {
        try {
          // Use RPC URL from chain definition (supports all chains dynamically)
          const rpcUrl = chain.rpcUrls?.default?.http?.[0]
          if (!rpcUrl) {
            console.debug(`⚠️ No RPC URL for chain ${chain.id} (${chain.name}), skipping config check`)
            return
          }
          
          // Use public RPC provider for read-only operations (no wallet needed)
          const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
          
          // Check if send config exists (lightweight check for indicator)
          console.log(`🔍 Checking DVN config for indicator: ${chain.name} → ${remoteChain.name} (${oappAddress})`)
          
          // Get both OApp-specific config and default config to compare
          const [sendUln, defaultSendUln] = await Promise.all([
            DvnConfigurator.getConfig(
              oappAddress,
              sendLibAddress,
              remoteEid,
              CONFIG_TYPES.SEND_ULN,
              chain,
              provider
            ) as Promise<UlnConfig | null>,
            DvnConfigurator.getDefaultConfig(
              remoteEid,
              CONFIG_TYPES.SEND_ULN,
              chain,
              provider
            ) as Promise<UlnConfig | null>
          ])
          
          // Only consider it configured if:
          // 1. OApp config exists AND
          // 2. It's different from the default config (meaning it was explicitly set)
          if (sendUln && defaultSendUln) {
            // Compare configs to see if they're different
            const isDifferent = 
              sendUln.confirmations !== defaultSendUln.confirmations ||
              sendUln.requiredDVNCount !== defaultSendUln.requiredDVNCount ||
              sendUln.requiredDVNs.length !== defaultSendUln.requiredDVNs.length ||
              JSON.stringify(sendUln.requiredDVNs.sort()) !== JSON.stringify(defaultSendUln.requiredDVNs.sort())
            
            if (isDifferent) {
              console.log('✅ Found explicit DVN config for indicator:', { 
                oappAddress, 
                chain: chain.name, 
                remoteChain: remoteChain.name,
                requiredDVNs: sendUln.requiredDVNs.length,
                confirmations: sendUln.confirmations
              })
              setSendConfig(sendUln)
            } else {
              // Config matches default - not explicitly configured
              console.debug(`ℹ️ DVN config matches default for ${chain.name} → ${remoteChain.name}, not explicitly configured`)
              setSendConfig(null)
            }
          } else if (sendUln && !defaultSendUln) {
            // OApp has config but no default exists - consider it configured
            console.log('✅ Found DVN config for indicator (no default to compare):', { 
              oappAddress, 
              chain: chain.name, 
              remoteChain: remoteChain.name,
              requiredDVNs: sendUln.requiredDVNs.length,
              confirmations: sendUln.confirmations
            })
            setSendConfig(sendUln)
          } else {
            // Config doesn't exist - clear state
            console.debug(`⚠️ No DVN config found for ${chain.name} → ${remoteChain.name}`)
            setSendConfig(null)
          }
        } catch (e: any) {
          // Error checking config - this is OK, just log it
          console.debug('⚠️ Config check for indicator failed:', e.message || e)
          setSendConfig(null) // Clear on error to be safe
        }
      }
      
      // Add a small delay to avoid race conditions
      const timeoutId = setTimeout(() => {
        checkConfigStatus()
      }, 2000)
      
      return () => clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteEid, sendLibAddress, receiveLibAddress, oappAddress, chain.id, chain.name, remoteChain.name, isOpen])


  const loadMessageLibraries = async () => {
    if (!remoteEid) return

    // Use RPC URL from chain definition (supports all chains dynamically)
    const rpcUrl = chain.rpcUrls?.default?.http?.[0]
    if (!rpcUrl) {
      console.warn(`No RPC URL found for chain ${chain.id} (${chain.name})`)
      return
    }

    try {
      // Use public RPC provider (works without wallet connection)
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl)

      // Try to get OApp-specific libraries first, fall back to defaults
      try {
        const oappLibs = await DvnConfigurator.getOAppMessageLibraries(
          oappAddress,
          remoteEid,
          chain,
          provider
        )
        setSendLibAddress(oappLibs.send)
        setReceiveLibAddress(oappLibs.receive)
        setReceiveLibIsDefault(oappLibs.receiveIsDefault)
        console.log('📚 OApp message libraries:', {
          send: oappLibs.send,
          receive: oappLibs.receive,
          sendIsDefault: oappLibs.sendIsDefault,
          receiveIsDefault: oappLibs.receiveIsDefault,
        })
      } catch (e) {
        console.warn('Could not get OApp libraries, trying defaults:', e)
        // Fall back to default libraries
        const defaultLibs = await DvnConfigurator.getDefaultMessageLibraries(
          remoteEid,
          chain,
          provider
        )
        setSendLibAddress(defaultLibs.send)
        setReceiveLibAddress(defaultLibs.receive)
        console.log('📚 Default message libraries:', defaultLibs)
      }
    } catch (error: any) {
      console.error('Error loading message libraries:', error)
      // Fall back to hardcoded defaults if available
      const fallbackSend = DEFAULT_MESSAGE_LIBRARIES[chain.id]?.send
      const fallbackReceive = DEFAULT_MESSAGE_LIBRARIES[chain.id]?.receive
      if (fallbackSend && fallbackSend !== '0x0000000000000000000000000000000000000000') {
        setSendLibAddress(fallbackSend)
      }
      if (fallbackReceive && fallbackReceive !== '0x0000000000000000000000000000000000000000') {
        setReceiveLibAddress(fallbackReceive)
      }
    }
  }

  const loadExecutorAddress = async () => {
    if (!window.ethereum || !remoteEid) return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chain.id.toString(16)}` }]
      })
      await new Promise(resolve => setTimeout(resolve, 1000))

      const provider = new ethers.providers.Web3Provider(window.ethereum as any, 'any')

      // Try to get executor address from default config
      const defaultExecutorAddress = await DvnConfigurator.getDefaultExecutorAddress(
        remoteEid,
        chain,
        provider
      )
      
      // Check if the address is valid (not zero address)
      if (defaultExecutorAddress && defaultExecutorAddress !== '0x0000000000000000000000000000000000000000') {
        setExecutorAddress(defaultExecutorAddress)
        console.log('⚙️ Default executor address:', defaultExecutorAddress)
      } else {
        // Try fallback if no address was returned
        const fallbackExecutor = DEFAULT_EXECUTOR_ADDRESSES[chain.id]
        if (fallbackExecutor && fallbackExecutor !== '0x0000000000000000000000000000000000000000') {
          setExecutorAddress(fallbackExecutor)
          console.log('⚙️ Using fallback executor address:', fallbackExecutor)
        } else {
          // This is expected for many chain pairs - use debug instead of warn
          console.debug('No executor address available (this is normal for some chain pairs)')
        }
      }
    } catch (error: any) {
      console.error('Error loading executor address:', error)
      console.error('Error details:', error.message, error.stack)
      
      // Fall back to hardcoded default if available
      const fallbackExecutor = DEFAULT_EXECUTOR_ADDRESSES[chain.id]
      if (fallbackExecutor && fallbackExecutor !== '0x0000000000000000000000000000000000000000') {
        setExecutorAddress(fallbackExecutor)
        console.log('⚙️ Using fallback executor address:', fallbackExecutor)
      }
    }
  }

  const loadDefaultConfig = async () => {
    if (!window.ethereum || !remoteEid) return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chain.id.toString(16)}` }]
      })
      await new Promise(resolve => setTimeout(resolve, 1000))

      const provider = new ethers.providers.Web3Provider(window.ethereum as any, 'any')

      // Load default Send ULN config to get official DVN addresses
      try {
        const defaultUln = await DvnConfigurator.getDefaultConfig(
          remoteEid,
          CONFIG_TYPES.SEND_ULN,
          chain,
          provider
        ) as UlnConfig | null
        if (defaultUln) {
          setDefaultConfig(defaultUln)
          console.log('📋 Default DVN addresses from endpoint:', defaultUln.requiredDVNs)
        }
      } catch (e) {
        console.warn('Could not load default config:', e)
      }
    } catch (error: any) {
      console.error('Error loading default config:', error)
    }
  }

  const loadCurrentConfig = async () => {
    if (!window.ethereum || !remoteEid || !sendLibAddress || !receiveLibAddress) return

    setIsLoading(true)
    try {
      // Switch to correct network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chain.id.toString(16)}` }]
      })
      await new Promise(resolve => setTimeout(resolve, 1500))

      const provider = new ethers.providers.Web3Provider(window.ethereum as any, 'any')

      // Load config using the fetched library addresses
      if (sendLibAddress) {
        // Load Send ULN config
        try {
          const sendUln = await DvnConfigurator.getConfig(
            oappAddress,
            sendLibAddress,
            remoteEid,
            CONFIG_TYPES.SEND_ULN,
            chain,
            provider
          ) as UlnConfig | null
          if (sendUln) {
            setSendConfig(sendUln)
            setConfirmations(sendUln.confirmations)
            setSelectedRequiredDVNs(sendUln.requiredDVNs)
            setSelectedOptionalDVNs(sendUln.optionalDVNs)
            setOptionalDVNThreshold(sendUln.optionalDVNThreshold)
          }
        } catch (e) {
          console.warn('Could not load Send ULN config (may be using defaults):', e)
        }
      }

      if (receiveLibAddress) {
        // Load Receive ULN config
        try {
          const receiveUln = await DvnConfigurator.getConfig(
            oappAddress,
            receiveLibAddress,
            remoteEid,
            CONFIG_TYPES.RECEIVE_ULN,
            chain,
            provider
          ) as UlnConfig | null
          if (receiveUln) {
            setReceiveConfig(receiveUln)
          }
        } catch (e) {
          console.warn('Could not load Receive ULN config (may be using defaults):', e)
        }
      }

      if (sendLibAddress) {
        // Load Executor config
        try {
          const exec = await DvnConfigurator.getConfig(
            oappAddress,
            sendLibAddress,
            remoteEid,
            CONFIG_TYPES.EXECUTOR,
            chain,
            provider
          ) as ExecutorConfig | null
          if (exec) {
            setExecutorConfig(exec)
            setMaxMessageSize(exec.maxMessageSize)
          }
        } catch (e) {
          console.warn('Could not load Executor config (may be using defaults):', e)
        }
      }
    } catch (error: any) {
      console.error('Error loading config:', error)
      alert(`Failed to load current configuration: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRequiredDVNToggle = (dvnName: string) => {
    const dvnAddress = availableDVNs[dvnName]
    if (!dvnAddress || dvnAddress === '0x0000000000000000000000000000000000000000') {
      alert('This DVN address is not configured. Please update DVN addresses in the configurator.')
      return
    }

    setSelectedRequiredDVNs(prev => {
      if (prev.includes(dvnAddress)) {
        // Removing from required - this is fine, it can stay in optional if it's there
        return prev.filter(addr => addr !== dvnAddress)
      } else {
        // Adding to required - automatically remove from optional if it's there
        setSelectedOptionalDVNs(opt => opt.filter(addr => addr !== dvnAddress))
        return [...prev, dvnAddress].sort() // Sort alphabetically
      }
    })
  }

  const handleOptionalDVNToggle = (dvnName: string) => {
    const dvnAddress = availableDVNs[dvnName]
    if (!dvnAddress || dvnAddress === '0x0000000000000000000000000000000000000000') {
      alert('This DVN address is not configured. Please update DVN addresses in the configurator.')
      return
    }

    // Check if this DVN is already in required list
    if (selectedRequiredDVNs.includes(dvnAddress)) {
      alert('This DVN is already selected as required. A DVN cannot be both required and optional.')
      return
    }

    setSelectedOptionalDVNs(prev => {
      if (prev.includes(dvnAddress)) {
        return prev.filter(addr => addr !== dvnAddress)
      } else {
        return [...prev, dvnAddress].sort() // Sort alphabetically
      }
    })
  }

  const configureDVN = async () => {
    if (!window.ethereum || !remoteEid) {
      alert('Please connect your wallet')
      return
    }

    // Check if library addresses are loaded
    if (!sendLibAddress || !receiveLibAddress) {
      alert('Message library addresses are being loaded. Please wait a moment and try again.')
      return
    }

    if (selectedRequiredDVNs.length === 0) {
      alert('Please select at least one required DVN')
      return
    }

    setIsConfiguring(true)
    try {
      // Switch to correct network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chain.id.toString(16)}` }]
      })
      await new Promise(resolve => setTimeout(resolve, 1500))

      const provider = new ethers.providers.Web3Provider(window.ethereum as any, 'any')
      const signer = provider.getSigner()

      // Filter out any DVNs that are in both required and optional lists
      // LayerZero doesn't allow the same DVN in both arrays
      const filteredOptionalDVNs = selectedOptionalDVNs.filter(
        dvn => !selectedRequiredDVNs.includes(dvn)
      )

      if (selectedOptionalDVNs.length !== filteredOptionalDVNs.length) {
        console.warn('⚠️ Some DVNs were removed from optional list because they are already in required list')
        const removed = selectedOptionalDVNs.filter(dvn => selectedRequiredDVNs.includes(dvn))
        console.warn('⚠️ Removed duplicates:', removed)
      }

      const ulnConfig: UlnConfig = {
        confirmations,
        requiredDVNCount: selectedRequiredDVNs.length,
        optionalDVNCount: filteredOptionalDVNs.length,
        optionalDVNThreshold: Math.min(optionalDVNThreshold, filteredOptionalDVNs.length),
        requiredDVNs: selectedRequiredDVNs,
        optionalDVNs: filteredOptionalDVNs,
      }

      // Determine if we should configure executor (only if address is available)
      const shouldConfigureExecutor = executorAddress && executorAddress !== '0x0000000000000000000000000000000000000000'

      const executorConfig: ExecutorConfig = {
        maxMessageSize,
        executorAddress: executorAddress || '0x0000000000000000000000000000000000000000',
      }

      if (!sendLibAddress || !receiveLibAddress) {
        throw new Error('Message library addresses not loaded. Please wait and try again.')
      }

      const txHashes: string[] = []

      // Configure Send ULN
      console.log('Configuring Send ULN...')
      const sendTxHash = await DvnConfigurator.setUlnConfig(
        oappAddress,
        sendLibAddress,
        remoteEid,
        CONFIG_TYPES.SEND_ULN,
        ulnConfig,
        chain,
        signer
      )
      txHashes.push(sendTxHash)
      console.log('✅ Send ULN configured:', sendTxHash)

      // Configure Receive ULN
      // Note: In LayerZero V2, receive ULN config might not be configurable when using default libraries
      // We'll try to configure it, but if it fails, we'll skip it (defaults will be used)
      let receiveTxHash: string | null = null
      console.log('Configuring Receive ULN...')
      try {
        // If receive library is using default, try setting it explicitly first
        if (receiveLibIsDefault && receiveLibAddress) {
          console.log('📚 Receive library is using default, attempting to set it explicitly first...')
          try {
            const setLibTxHash = await DvnConfigurator.setReceiveLibrary(
              oappAddress,
              remoteEid,
              receiveLibAddress,
              0, // gracePeriod (0 means immediate)
              chain,
              signer
            )
            txHashes.push(setLibTxHash)
            console.log('✅ Receive library set:', setLibTxHash)
            
            // Wait for transaction to be mined
            await new Promise(resolve => setTimeout(resolve, 3000))
          } catch (setLibError: any) {
            // If setting library fails, we might not be able to configure receive ULN
            console.warn('⚠️ Could not set receive library:', setLibError.message)
            console.warn('⚠️ This may mean receive ULN config is not available for default libraries')
          }
        }

        receiveTxHash = await DvnConfigurator.setUlnConfig(
          oappAddress,
          receiveLibAddress,
          remoteEid,
          CONFIG_TYPES.RECEIVE_ULN,
          ulnConfig,
          chain,
          signer
        )
        txHashes.push(receiveTxHash)
        console.log('✅ Receive ULN configured:', receiveTxHash)
      } catch (receiveError: any) {
        // If receive ULN config fails, it might be because:
        // 1. Default libraries don't support custom ULN config
        // 2. The library needs to be set differently
        // 3. Receive ULN config might not be necessary for this setup
        console.warn('⚠️ Could not configure Receive ULN:', receiveError.message)
        console.warn('ℹ️ LayerZero will use default receive ULN settings')
        console.warn('ℹ️ This is often acceptable - default settings are usually sufficient')
        console.log('ℹ️ Skipping Receive ULN configuration - defaults will be used')
        // receiveTxHash remains null - we're skipping receive config
      }

      // Configure Executor (only for send, and only if executor address is available)
      let executorTxHash: string | null = null
      if (shouldConfigureExecutor && sendLibAddress) {
        console.log('Configuring Executor...')
        executorTxHash = await DvnConfigurator.setExecutorConfig(
          oappAddress,
          sendLibAddress,
          remoteEid,
          executorConfig,
          chain,
          signer
        )
        txHashes.push(executorTxHash)
        console.log('✅ Executor configured:', executorTxHash)
      } else if (!shouldConfigureExecutor) {
        console.log('⚠️ Executor address not available, skipping executor configuration')
      }

      const txList = [
        `- Send ULN: ${sendTxHash}`,
        receiveTxHash ? `- Receive ULN: ${receiveTxHash}` : `- Receive ULN: Skipped (using defaults)`,
        executorTxHash ? `- Executor: ${executorTxHash}` : null
      ].filter(Boolean).join('\n')

      alert(`✅ DVN configuration complete!

Transactions:
${txList}

⚠️ Important: You must configure the same settings on ${remoteChain.name} for messages to work!`)

      // Reload configs
      await loadCurrentConfig()
    } catch (error: any) {
      console.error('Error configuring DVN:', error)
      alert(`Failed to configure DVN: ${error.message}`)
    } finally {
      setIsConfiguring(false)
    }
  }

  // Validate config match
  const validation = sendConfig && receiveConfig 
    ? DvnConfigurator.validateConfigMatch(sendConfig, receiveConfig)
    : { valid: true, errors: [] }

  const getExplorerUrl = (txHash: string) => {
    const explorers: { [key: number]: string } = {
      1: 'https://etherscan.io',
      8453: 'https://basescan.org',
    }
    const baseUrl = explorers[chain.id] || 'https://etherscan.io'
    return `${baseUrl}/tx/${txHash}`
  }

  // Check if configuration is active (has send or receive config)
  const isConfigured = !!(sendConfig || receiveConfig)
  
  // Debug logging
  useEffect(() => {
    if (sendConfig || receiveConfig) {
      console.log('✅ DVN Config detected for indicator:', { 
        hasSendConfig: !!sendConfig, 
        hasReceiveConfig: !!receiveConfig,
        isConfigured 
      })
    }
  }, [sendConfig, receiveConfig, isConfigured])
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Configure DVN
          {isConfigured && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            DVN Configuration
          </DialogTitle>
          <DialogDescription>
            Configure Decentralized Verifier Networks (DVNs) for {chain.name} → {remoteChain.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning about matching configs */}
          {!validation.valid && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-600">Configuration Mismatch</p>
                  <ul className="text-xs text-yellow-500 mt-1 list-disc list-inside">
                    {validation.errors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                  <p className="text-xs text-yellow-500 mt-2">
                    ⚠️ Send and Receive configs must match for messages to work!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Info about DVN addresses */}
          {(dvnNames.length === 0 || Object.values(availableDVNs).every(addr => addr === '0x0000000000000000000000000000000000000000')) && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-600">DVN Addresses Not Configured</p>
                  <p className="text-xs text-blue-500 mt-1">
                    Please update DVN addresses in <code>src/lib/dvn-configurator.ts</code> with official LayerZero V2 addresses.
                    {defaultConfig && defaultConfig.requiredDVNs.length > 0 && (
                      <span className="block mt-2">
                        <strong>Default DVNs from endpoint:</strong> {defaultConfig.requiredDVNs.join(', ')}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Display default DVN addresses if fetched */}
          {defaultConfig && defaultConfig.requiredDVNs.length > 0 && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-600">Default DVN Addresses (from LayerZero Endpoint)</p>
                  <div className="text-xs text-green-500 mt-1 space-y-1">
                    <p><strong>Required DVNs:</strong></p>
                    <ul className="list-disc list-inside ml-2">
                      {defaultConfig.requiredDVNs.map((dvn, i) => (
                        <li key={i} className="font-mono">{dvn}</li>
                      ))}
                    </ul>
                    {defaultConfig.optionalDVNs.length > 0 && (
                      <>
                        <p className="mt-2"><strong>Optional DVNs:</strong></p>
                        <ul className="list-disc list-inside ml-2">
                          {defaultConfig.optionalDVNs.map((dvn, i) => (
                            <li key={i} className="font-mono">{dvn}</li>
                          ))}
                        </ul>
                      </>
                    )}
                    <p className="mt-2 text-muted-foreground">
                      💡 You can use these addresses or configure your own DVNs above.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Block Confirmations */}
          <div className="space-y-2">
            <Label htmlFor="confirmations">Block Confirmations</Label>
            <Input
              id="confirmations"
              type="number"
              value={confirmations}
              onChange={(e) => setConfirmations(parseInt(e.target.value) || 15)}
              min={1}
              max={100}
            />
            <p className="text-xs text-muted-foreground">
              Number of block confirmations required before message is verified. Must match on both chains.
            </p>
          </div>

          {/* Required DVNs */}
          <div className="space-y-2">
            <Label>Required DVNs</Label>
            <p className="text-xs text-muted-foreground mb-2">
              All selected DVNs must verify the message for it to be accepted.
            </p>
            <div className="space-y-2">
              {dvnNames.map(dvnName => {
                const dvnAddress = availableDVNs[dvnName]
                const isSelected = selectedRequiredDVNs.includes(dvnAddress)
                const isDead = dvnAddress === '0x0000000000000000000000000000000000000000'
                
                return (
                  <div key={dvnName} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id={`required-${dvnName}`}
                      checked={isSelected}
                      onCheckedChange={() => handleRequiredDVNToggle(dvnName)}
                      disabled={isDead}
                    />
                    <Label 
                      htmlFor={`required-${dvnName}`} 
                      className={`flex-1 cursor-pointer ${isDead ? 'text-muted-foreground' : ''}`}
                    >
                      {dvnName}
                      {isDead && <Badge variant="destructive" className="ml-2 text-xs">Dead DVN</Badge>}
                    </Label>
                    <code className="text-xs text-muted-foreground">
                      {dvnAddress.slice(0, 8)}...{dvnAddress.slice(-6)}
                    </code>
                  </div>
                )
              })}
            </div>
            {selectedRequiredDVNs.length === 0 && (
              <p className="text-xs text-yellow-500">⚠️ At least one required DVN must be selected</p>
            )}
          </div>

          {/* Optional DVNs */}
          <div className="space-y-2">
            <Label>Optional DVNs</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Additional DVNs for extra security. Threshold determines how many must verify.
            </p>
            <div className="space-y-2">
              {dvnNames.map(dvnName => {
                const dvnAddress = availableDVNs[dvnName]
                const isSelected = selectedOptionalDVNs.includes(dvnAddress)
                const isDead = dvnAddress === '0x0000000000000000000000000000000000000000'
                const isRequired = selectedRequiredDVNs.includes(dvnAddress)
                
                return (
                  <div key={dvnName} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      id={`optional-${dvnName}`}
                      checked={isSelected}
                      onCheckedChange={() => handleOptionalDVNToggle(dvnName)}
                      disabled={isDead || isRequired}
                    />
                    <Label 
                      htmlFor={`optional-${dvnName}`} 
                      className={`flex-1 cursor-pointer ${isDead || isRequired ? 'text-muted-foreground' : ''}`}
                    >
                      {dvnName}
                      {isRequired && <Badge variant="secondary" className="ml-2 text-xs">Required</Badge>}
                      {isDead && <Badge variant="destructive" className="ml-2 text-xs">Dead DVN</Badge>}
                    </Label>
                    <code className="text-xs text-muted-foreground">
                      {dvnAddress.slice(0, 8)}...{dvnAddress.slice(-6)}
                    </code>
                  </div>
                )
              })}
            </div>
            {selectedOptionalDVNs.length > 0 && (
              <div className="space-y-2 mt-2">
                <Label htmlFor="optionalThreshold">Optional DVN Threshold</Label>
                <Input
                  id="optionalThreshold"
                  type="number"
                  value={optionalDVNThreshold}
                  onChange={(e) => setOptionalDVNThreshold(parseInt(e.target.value) || 0)}
                  min={0}
                  max={selectedOptionalDVNs.length}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum number of optional DVNs that must verify (0-{selectedOptionalDVNs.length})
                </p>
              </div>
            )}
          </div>

          {/* Executor Config */}
          <div className="space-y-2">
            <Label htmlFor="maxMessageSize">Max Message Size (bytes)</Label>
            <Input
              id="maxMessageSize"
              type="number"
              value={maxMessageSize}
              onChange={(e) => setMaxMessageSize(parseInt(e.target.value) || 10000)}
              min={1000}
              max={100000}
            />
            <p className="text-xs text-muted-foreground">
              Maximum size of cross-chain messages in bytes. Default: 10,000 bytes.
            </p>
            
            {/* Executor Address Display */}
            {executorAddress && executorAddress !== '0x0000000000000000000000000000000000000000' ? (
              <div className="mt-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-xs">
                <p className="text-green-600 font-medium mb-1">✅ Executor Address (fetched from endpoint)</p>
                <code className="text-green-500 break-all">{executorAddress}</code>
                <p className="text-green-500/70 mt-1">This executor will pay for destination chain gas fees.</p>
              </div>
            ) : (
              <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs">
                <p className="text-blue-600 font-medium mb-1">ℹ️ Executor Address Not Configured</p>
                <p className="text-blue-500/70">
                  No default executor address found for this chain pair. This is normal for some chains. 
                  Executor configuration will be skipped. Users will need to pay gas fees on the destination chain.
                </p>
              </div>
            )}
          </div>

          {/* Executor Options & Gas Settings */}
          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <Label className="text-base font-semibold">Executor Options & Gas Settings</Label>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowExecutorOptionsInfo(!showExecutorOptionsInfo)}
                className="h-6 px-2"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>

            {/* Info Section */}
            {showExecutorOptionsInfo && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg space-y-3">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  About Executor Options & Gas Settings
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <div>
                    <p className="font-medium">What is an Executor?</p>
                    <p className="text-xs mt-1">
                      An executor is a service that automatically executes transactions on the destination chain after 
                      payload verification. It allows users to pay for destination chain gas fees using the source chain&apos;s 
                      native token, providing a seamless omnichain experience.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Executor Option Types:</p>
                    <ul className="text-xs mt-1 space-y-1 list-disc list-inside">
                      <li><strong>LZ_RECEIVE</strong>: Required for ONFT bridging. Specifies gas limit for receiving messages on destination chain.</li>
                      <li><strong>LZ_COMPOSE</strong>: Optional. Enables complex multi-step operations (not needed for simple NFT transfers).</li>
                      <li><strong>ORDERED</strong>: Optional. Ensures messages are processed in order (usually not needed for NFTs).</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Gas Limits:</p>
                    <p className="text-xs mt-1">
                      Gas limit determines the maximum computational work a transaction can perform. Set too low and 
                      transactions may fail. Set too high and you pay for unused gas (though unused gas is refunded). 
                      Default: 200,000 gas for ONFT receive operations.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">When to Configure:</p>
                    <p className="text-xs mt-1">
                      For simple NFT bridging, LZ_RECEIVE with default gas (200,000) is sufficient. Only configure 
                      LZ_COMPOSE or ORDERED if you need complex cross-chain operations.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Receive Gas Limit (LZ_RECEIVE) - Always enabled for ONFT */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="receiveGasLimit">
                  LZ_RECEIVE Gas Limit (required)
                  <Badge variant="secondary" className="ml-2 text-xs">Default for ONFT</Badge>
                </Label>
              </div>
              <Input
                id="receiveGasLimit"
                type="number"
                value={executorOptions.receiveGasLimit}
                onChange={(e) => setExecutorOptions({
                  ...executorOptions,
                  receiveGasLimit: parseInt(e.target.value) || 200000
                })}
                min={50000}
                max={5000000}
              />
              <p className="text-xs text-muted-foreground">
                Gas limit for receiving messages on destination chain. Default: 200,000 (recommended for ONFT).
              </p>
            </div>

            {/* Optional: Enable LZ_COMPOSE */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableCompose"
                  checked={(executorOptions.enabledOptions & 2) !== 0}
                  onCheckedChange={(checked) => {
                    setExecutorOptions({
                      ...executorOptions,
                      enabledOptions: checked 
                        ? (executorOptions.enabledOptions | 2)
                        : (executorOptions.enabledOptions & ~2),
                      composeGasLimit: checked ? (executorOptions.composeGasLimit || 500000) : undefined
                    })
                  }}
                />
                <Label htmlFor="enableCompose" className="cursor-pointer">
                  Enable LZ_COMPOSE (optional - for complex operations)
                </Label>
              </div>
              {(executorOptions.enabledOptions & 2) !== 0 && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="composeGasLimit" className="text-sm">LZ_COMPOSE Gas Limit</Label>
                  <Input
                    id="composeGasLimit"
                    type="number"
                    value={executorOptions.composeGasLimit || 500000}
                    onChange={(e) => setExecutorOptions({
                      ...executorOptions,
                      composeGasLimit: parseInt(e.target.value) || 500000
                    })}
                    min={100000}
                    max={10000000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gas limit for compose operations. Default: 500,000. Only needed for complex cross-chain workflows.
                  </p>
                </div>
              )}
            </div>

            {/* Optional: Enable ORDERED */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enableOrdered"
                  checked={(executorOptions.enabledOptions & 4) !== 0}
                  onCheckedChange={(checked) => {
                    setExecutorOptions({
                      ...executorOptions,
                      enabledOptions: checked 
                        ? (executorOptions.enabledOptions | 4)
                        : (executorOptions.enabledOptions & ~4),
                      orderedGasLimit: checked ? (executorOptions.orderedGasLimit || 300000) : undefined
                    })
                  }}
                />
                <Label htmlFor="enableOrdered" className="cursor-pointer">
                  Enable ORDERED (optional - for ordered message delivery)
                </Label>
              </div>
              {(executorOptions.enabledOptions & 4) !== 0 && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="orderedGasLimit" className="text-sm">ORDERED Gas Limit</Label>
                  <Input
                    id="orderedGasLimit"
                    type="number"
                    value={executorOptions.orderedGasLimit || 300000}
                    onChange={(e) => setExecutorOptions({
                      ...executorOptions,
                      orderedGasLimit: parseInt(e.target.value) || 300000
                    })}
                    min={100000}
                    max={5000000}
                  />
                  <p className="text-xs text-muted-foreground">
                    Gas limit for ordered operations. Default: 300,000. Only needed if message ordering is critical.
                  </p>
                </div>
              )}
            </div>

            {/* PreCrime Configuration */}
            <div className="space-y-3 border-t pt-4 mt-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-purple-500" />
                <Label className="text-base font-semibold">PreCrime Security Validation</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="enablePreCrime"
                  checked={executorOptions.preCrimeEnabled || false}
                  onCheckedChange={(checked) => {
                    setExecutorOptions({
                      ...executorOptions,
                      preCrimeEnabled: checked as boolean,
                      preCrimeAddress: checked ? (executorOptions.preCrimeAddress || '') : undefined
                    })
                  }}
                />
                <Label htmlFor="enablePreCrime" className="cursor-pointer">
                  Enable PreCrime validation (simulates transactions before sending)
                </Label>
              </div>
              {executorOptions.preCrimeEnabled && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="preCrimeAddress" className="text-sm">PreCrime Contract Address</Label>
                  <Input
                    id="preCrimeAddress"
                    type="text"
                    placeholder="0x..."
                    value={executorOptions.preCrimeAddress || ''}
                    onChange={(e) => setExecutorOptions({
                      ...executorOptions,
                      preCrimeAddress: e.target.value
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional: Leave empty if your OApp contract has PreCrime hooks built-in. 
                    Otherwise, provide the PreCrime contract address for this chain.
                  </p>
                </div>
              )}
              <div className="ml-6 p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg text-xs text-purple-800 dark:text-purple-200">
                <p className="font-medium mb-1">What is PreCrime?</p>
                <p className="mb-2">
                  PreCrime validates cross-chain transactions by simulating them on a forked destination chain before execution. 
                  This prevents failed transactions and potential exploits.
                </p>
                <p className="font-medium mb-1">Benefits:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Prevents failed transactions (saves gas)</li>
                  <li>Detects potential exploits before execution</li>
                  <li>Validates transaction outcomes on destination chain</li>
                  <li>Provides early warning of issues</li>
                </ul>
                <p className="mt-2 text-muted-foreground">
                  Note: Full PreCrime validation requires your OApp contract to implement PreCrime hooks. 
                  The address field is only needed if using an external PreCrime contract.
                </p>
              </div>
            </div>

            {/* Encoded Options Preview */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <Label className="text-xs font-medium">Encoded Options (hex):</Label>
              <code className="block text-xs mt-1 break-all font-mono text-muted-foreground">
                {DvnConfigurator.encodeExecutorOptions(executorOptions)}
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                This encoded value will be used in bridge transactions. Copy this if you need to use it programmatically.
              </p>
            </div>
          </div>

          {/* Current Configuration Display */}
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading current configuration...
            </div>
          ) : (sendConfig || receiveConfig) && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">Current Configuration</p>
              {sendConfig && (
                <div className="text-xs space-y-1">
                  <p><strong>Send:</strong> {sendConfig.requiredDVNCount} required DVN(s), {sendConfig.confirmations} confirmations</p>
                </div>
              )}
              {receiveConfig && (
                <div className="text-xs space-y-1">
                  <p><strong>Receive:</strong> {receiveConfig.requiredDVNCount} required DVN(s), {receiveConfig.confirmations} confirmations</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={loadCurrentConfig}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              Reload Config
            </Button>

            <Button
              onClick={configureDVN}
              disabled={isConfiguring || selectedRequiredDVNs.length === 0}
              className="flex items-center gap-2 flex-1"
            >
              {isConfiguring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Configure DVN
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
            <p><strong>Important:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Send and Receive configurations must match for messages to work</li>
              <li>You must configure the same settings on {remoteChain.name}</li>
              <li>DVN addresses must be sorted alphabetically (handled automatically)</li>
              <li>Block confirmations must match on both chains</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
