/**
 * Cross-Chain Contract Verification Service
 * 
 * Uses Etherscan's unified API with chainid parameter to verify contracts
 * across multiple chains using a single API endpoint.
 * 
 * Documentation: https://docs.etherscan.io/api-endpoints/contracts
 */

import { LayerZeroChain } from './chains'

export interface CrossChainVerificationResult {
  chainId: number
  chainName: string
  contractAddress: string
  isVerified: boolean
  contractName?: string
  compilerVersion?: string
  optimizationUsed?: boolean
  runs?: number
  abi?: any[]
  sourceCode?: string
  constructorArgs?: string
  proxyType?: string
  implementationAddress?: string
  error?: string
}

export interface ChainVerificationStatus {
  chainId: number
  chainName: string
  isVerified: boolean
  explorerUrl: string
  contractUrl: string
  abi?: any[]
  error?: string
  /** UI state: Pending | Verifying | Verified | Failed */
  verificationStatus?: string
}

/**
 * Etherscan-supported chains mapping
 * Based on: https://docs.etherscan.io/supported-chains
 * All chains support unified API with chainid parameter
 */
export const ETHERSCAN_SUPPORTED_CHAINS: { [chainId: number]: { name: string; apiUrl: string; explorerUrl: string } } = {
  // Mainnets
  1: { name: 'Ethereum Mainnet', apiUrl: 'https://api.etherscan.io/v2/api', explorerUrl: 'https://etherscan.io' },
  8453: { name: 'Base Mainnet', apiUrl: 'https://api.etherscan.io/v2/api', explorerUrl: 'https://basescan.org' },
  137: { name: 'Polygon Mainnet', apiUrl: 'https://api.polygonscan.com/v2/api', explorerUrl: 'https://polygonscan.com' },
  42161: { name: 'Arbitrum One Mainnet', apiUrl: 'https://api.arbiscan.io/v2/api', explorerUrl: 'https://arbiscan.io' },
  42170: { name: 'Arbitrum Nova Mainnet', apiUrl: 'https://api-nova.arbiscan.io/v2/api', explorerUrl: 'https://nova.arbiscan.io' },
  10: { name: 'OP Mainnet', apiUrl: 'https://api-optimistic.etherscan.io/v2/api', explorerUrl: 'https://optimistic.etherscan.io' },
  43114: { name: 'Avalanche C-Chain', apiUrl: 'https://api.snowtrace.io/v2/api', explorerUrl: 'https://snowtrace.io' },
  56: { name: 'BNB Smart Chain Mainnet', apiUrl: 'https://api.bscscan.com/v2/api', explorerUrl: 'https://bscscan.com' },
  42220: { name: 'Celo Mainnet', apiUrl: 'https://api.celoscan.io/v2/api', explorerUrl: 'https://celoscan.io' },
  1284: { name: 'Moonbeam Mainnet', apiUrl: 'https://api-moonbeam.moonscan.io/v2/api', explorerUrl: 'https://moonbeam.moonscan.io' },
  1285: { name: 'Moonriver Mainnet', apiUrl: 'https://api-moonriver.moonscan.io/v2/api', explorerUrl: 'https://moonriver.moonscan.io' },
  1101: { name: 'Polygon zkEVM', apiUrl: 'https://api-zkevm.polygonscan.com/v2/api', explorerUrl: 'https://zkevm.polygonscan.com' },
  324: { name: 'zkSync Mainnet', apiUrl: 'https://api-era.zksync.network/v2/api', explorerUrl: 'https://explorer.zksync.io' },
  59144: { name: 'Linea Mainnet', apiUrl: 'https://api.lineascan.build/v2/api', explorerUrl: 'https://lineascan.build' },
  5000: { name: 'Mantle Mainnet', apiUrl: 'https://api-explorer.mantle.xyz/v2/api', explorerUrl: 'https://explorer.mantle.xyz' },
  534352: { name: 'Scroll Mainnet', apiUrl: 'https://api.scrollscan.com/v2/api', explorerUrl: 'https://scrollscan.com' },
  81457: { name: 'Blast Mainnet', apiUrl: 'https://api.blastscan.io/v2/api', explorerUrl: 'https://blastscan.io' },
  100: { name: 'Gnosis', apiUrl: 'https://api.gnosisscan.io/v2/api', explorerUrl: 'https://gnosisscan.io' },
  252: { name: 'Fraxtal Mainnet', apiUrl: 'https://api.fraxtal.blockscout.com/v2/api', explorerUrl: 'https://fraxtal.blockscout.com' },
  999: { name: 'HyperEVM Mainnet', apiUrl: 'https://api.hyperevm.com/v2/api', explorerUrl: 'https://hyperevm.com' },
  737373: { name: 'Katana Bokuto', apiUrl: 'https://api.katana.blockscout.com/v2/api', explorerUrl: 'https://katana.blockscout.com' },
  747474: { name: 'Katana Mainnet', apiUrl: 'https://api.katana.blockscout.com/v2/api', explorerUrl: 'https://katana.blockscout.com' },
  143: { name: 'Monad Mainnet', apiUrl: 'https://api.monad.blockscout.com/v2/api', explorerUrl: 'https://monad.blockscout.com' },
  204: { name: 'opBNB Mainnet', apiUrl: 'https://api-opbnb.bscscan.com/v2/api', explorerUrl: 'https://opbnb.bscscan.com' },
  1329: { name: 'Sei Mainnet', apiUrl: 'https://api.sei.blockscout.com/v2/api', explorerUrl: 'https://sei.blockscout.com' },
  146: { name: 'Sonic Mainnet', apiUrl: 'https://api.sonic.blockscout.com/v2/api', explorerUrl: 'https://sonic.blockscout.com' },
  988: { name: 'Stable Mainnet', apiUrl: 'https://api.stable.blockscout.com/v2/api', explorerUrl: 'https://stable.blockscout.com' },
  1923: { name: 'Swellchain Mainnet', apiUrl: 'https://api.swellchain.blockscout.com/v2/api', explorerUrl: 'https://swellchain.blockscout.com' },
  167000: { name: 'Taiko Mainnet', apiUrl: 'https://api.taiko.blockscout.com/v2/api', explorerUrl: 'https://taiko.blockscout.com' },
  130: { name: 'Unichain Mainnet', apiUrl: 'https://api.unichain.blockscout.com/v2/api', explorerUrl: 'https://unichain.blockscout.com' },
  480: { name: 'World Mainnet', apiUrl: 'https://api.world.blockscout.com/v2/api', explorerUrl: 'https://world.blockscout.com' },
  50: { name: 'XDC Mainnet', apiUrl: 'https://api.xdcscan.com/v2/api', explorerUrl: 'https://xdcscan.com' },
  199: { name: 'BitTorrent Chain Mainnet', apiUrl: 'https://api.bttcscan.com/v2/api', explorerUrl: 'https://bttcscan.com' },
  2741: { name: 'Abstract Mainnet', apiUrl: 'https://api.abstract.blockscout.com/v2/api', explorerUrl: 'https://abstract.blockscout.com' },
  33139: { name: 'ApeChain Mainnet', apiUrl: 'https://api.apechain.blockscout.com/v2/api', explorerUrl: 'https://apechain.blockscout.com' },
  
  // Testnets
  11155111: { name: 'Sepolia Testnet', apiUrl: 'https://api-sepolia.etherscan.io/v2/api', explorerUrl: 'https://sepolia.etherscan.io' },
  17000: { name: 'Holesky Testnet', apiUrl: 'https://api-holesky.etherscan.io/v2/api', explorerUrl: 'https://holesky.etherscan.io' },
  560048: { name: 'Hoodi Testnet', apiUrl: 'https://api.hoodi.blockscout.com/v2/api', explorerUrl: 'https://hoodi.blockscout.com' },
  11124: { name: 'Abstract Sepolia Testnet', apiUrl: 'https://api.abstract-sepolia.blockscout.com/v2/api', explorerUrl: 'https://abstract-sepolia.blockscout.com' },
  33111: { name: 'ApeChain Curtis Testnet', apiUrl: 'https://api.apechain-curtis.blockscout.com/v2/api', explorerUrl: 'https://apechain-curtis.blockscout.com' },
  421614: { name: 'Arbitrum Sepolia Testnet', apiUrl: 'https://api-sepolia.arbiscan.io/v2/api', explorerUrl: 'https://sepolia.arbiscan.io' },
  43113: { name: 'Avalanche Fuji Testnet', apiUrl: 'https://api-testnet.snowtrace.io/v2/api', explorerUrl: 'https://testnet.snowtrace.io' },
  84532: { name: 'Base Sepolia Testnet', apiUrl: 'https://api-sepolia.basescan.org/api', explorerUrl: 'https://sepolia.basescan.org' },
  80069: { name: 'Berachain Bepolia Testnet', apiUrl: 'https://api.berachain-bepolia.blockscout.com/v2/api', explorerUrl: 'https://berachain-bepolia.blockscout.com' },
  80094: { name: 'Berachain Mainnet', apiUrl: 'https://api.berachain.blockscout.com/v2/api', explorerUrl: 'https://berachain.blockscout.com' },
  1029: { name: 'BitTorrent Chain Testnet', apiUrl: 'https://api-testnet.bttcscan.com/v2/api', explorerUrl: 'https://testnet.bttcscan.com' },
  168587773: { name: 'Blast Sepolia Testnet', apiUrl: 'https://api-sepolia.blastscan.io/v2/api', explorerUrl: 'https://sepolia.blastscan.io' },
  97: { name: 'BNB Smart Chain Testnet', apiUrl: 'https://api-testnet.bscscan.com/v2/api', explorerUrl: 'https://testnet.bscscan.com' },
  11142220: { name: 'Celo Sepolia Testnet', apiUrl: 'https://api-sepolia.celoscan.io/v2/api', explorerUrl: 'https://sepolia.celoscan.io' },
  2523: { name: 'Fraxtal Hoodi Testnet', apiUrl: 'https://api.fraxtal-hoodi.blockscout.com/v2/api', explorerUrl: 'https://fraxtal-hoodi.blockscout.com' },
  59141: { name: 'Linea Sepolia Testnet', apiUrl: 'https://api-sepolia.lineascan.build/v2/api', explorerUrl: 'https://sepolia.lineascan.build' },
  5003: { name: 'Mantle Sepolia Testnet', apiUrl: 'https://api-sepolia.explorer.mantle.xyz/v2/api', explorerUrl: 'https://sepolia.explorer.mantle.xyz' },
  43521: { name: 'Memecore Testnet', apiUrl: 'https://api.memecore.blockscout.com/v2/api', explorerUrl: 'https://memecore.blockscout.com' },
  10143: { name: 'Monad Testnet', apiUrl: 'https://api.monad-testnet.blockscout.com/v2/api', explorerUrl: 'https://monad-testnet.blockscout.com' },
  1287: { name: 'Moonbase Alpha Testnet', apiUrl: 'https://api-moonbase.moonscan.io/v2/api', explorerUrl: 'https://moonbase.moonscan.io' },
  11155420: { name: 'OP Sepolia Testnet', apiUrl: 'https://api-sepolia-optimistic.etherscan.io/v2/api', explorerUrl: 'https://sepolia-optimistic.etherscan.io' },
  5611: { name: 'opBNB Testnet', apiUrl: 'https://api-opbnb-testnet.bscscan.com/v2/api', explorerUrl: 'https://opbnb-testnet.bscscan.com' },
  80002: { name: 'Polygon Amoy Testnet', apiUrl: 'https://api-amoy.polygonscan.com/v2/api', explorerUrl: 'https://amoy.polygonscan.com' },
  534351: { name: 'Scroll Sepolia Testnet', apiUrl: 'https://api-sepolia.scrollscan.com/v2/api', explorerUrl: 'https://sepolia.scrollscan.com' },
  1328: { name: 'Sei Testnet', apiUrl: 'https://api.sei-testnet.blockscout.com/v2/api', explorerUrl: 'https://sei-testnet.blockscout.com' },
  14601: { name: 'Sonic Testnet', apiUrl: 'https://api.sonic-testnet.blockscout.com/v2/api', explorerUrl: 'https://sonic-testnet.blockscout.com' },
  2201: { name: 'Stable Testnet', apiUrl: 'https://api.stable-testnet.blockscout.com/v2/api', explorerUrl: 'https://stable-testnet.blockscout.com' },
  1924: { name: 'Swellchain Testnet', apiUrl: 'https://api.swellchain-testnet.blockscout.com/v2/api', explorerUrl: 'https://swellchain-testnet.blockscout.com' },
  167013: { name: 'Taiko Hoodi', apiUrl: 'https://api.taiko-hoodi.blockscout.com/v2/api', explorerUrl: 'https://taiko-hoodi.blockscout.com' },
  1301: { name: 'Unichain Sepolia Testnet', apiUrl: 'https://api.unichain-sepolia.blockscout.com/v2/api', explorerUrl: 'https://unichain-sepolia.blockscout.com' },
  4801: { name: 'World Sepolia Testnet', apiUrl: 'https://api.world-sepolia.blockscout.com/v2/api', explorerUrl: 'https://world-sepolia.blockscout.com' },
  51: { name: 'XDC Apothem Testnet', apiUrl: 'https://api-apothem.xdcscan.com/v2/api', explorerUrl: 'https://apothem.xdcscan.com' },
  300: { name: 'zkSync Sepolia Testnet', apiUrl: 'https://api-sepolia-era.zksync.network/v2/api', explorerUrl: 'https://sepolia.explorer.zksync.io' },
}

export class CrossChainVerificationService {
  private apiKey: string

  constructor(apiKey?: string) {
    // Try to get API key from environment or use provided one
    // For client-side, we need NEXT_PUBLIC_ prefix
    const envKey = typeof window !== 'undefined' 
      ? process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY 
      : (process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY)
    
    this.apiKey = apiKey || envKey || ''
    
    console.log('🔑 CrossChainVerificationService initialized:', {
      hasProvidedKey: !!apiKey,
      hasEnvKey: !!envKey,
      finalKeyLength: this.apiKey.length,
      finalKeyPreview: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'none'
    })
    
    if (!this.apiKey) {
      console.warn('⚠️ No Etherscan API key provided. Some features may not work.')
      console.warn('💡 Set NEXT_PUBLIC_ETHERSCAN_API_KEY in .env.local and restart dev server')
    }
  }

  /**
   * Get API key for a specific chain
   * Some chains may use different API keys
   */
  private getApiKeyForChain(chainId: number): string {
    // If service doesn't have API key, try to get it from environment again
    if (!this.apiKey) {
      const envKey = typeof window !== 'undefined' 
        ? process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY 
        : (process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY)
      if (envKey) {
        this.apiKey = envKey
        console.log('🔑 Retrieved API key from environment at runtime')
      } else {
        // Fallback for development (remove in production)
        const fallbackKey = 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG'
        console.warn('⚠️ No API key found, using fallback (development only)')
        this.apiKey = fallbackKey
      }
    }
    // For now, use the same API key for all chains
    // In the future, we could support chain-specific keys
    return this.apiKey
  }

  /**
   * Check if a chain is supported by Etherscan API
   */
  isChainSupported(chainId: number): boolean {
    return chainId in ETHERSCAN_SUPPORTED_CHAINS
  }

  /**
   * Get contract ABI from any supported chain
   * Uses the unified API with chainid parameter
   */
  async getContractABI(contractAddress: string, chainId: number): Promise<{ abi: any[] | null; error?: string }> {
    if (!this.isChainSupported(chainId)) {
      return { abi: null, error: `Chain ${chainId} is not supported by Etherscan API` }
    }

    const chainConfig = ETHERSCAN_SUPPORTED_CHAINS[chainId]
    const apiKey = this.getApiKeyForChain(chainId)

    try {
      // Base now uses unified Etherscan API V2 with chainid (like other unified APIs)
      // Other chain-specific APIs use their own V1 API without chainid
      // Unified APIs (etherscan.io) use V2 API with chainid parameter
      const isUnifiedAPI = chainConfig.apiUrl.includes('etherscan.io')
      
      // For chain-specific APIs, use the URL as-is (don't modify)
      // For unified APIs, convert /api to /v2/api
      let apiUrl = chainConfig.apiUrl
      if (isUnifiedAPI && !apiUrl.includes('/v2/api')) {
        // Only for unified APIs: replace /api at the END of the path
        apiUrl = apiUrl.replace(/\/api$/, '/v2/api')
      }
      // Chain-specific APIs are already correct, don't modify them
      
      // Build URL - chain-specific APIs don't need chainid
      let url: string
      if (isUnifiedAPI) {
        // Unified API requires chainid
        url = `${apiUrl}?chainid=${chainId}&module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`
      } else {
        // Chain-specific API doesn't need chainid (API is already scoped to that chain)
        url = `${apiUrl}?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`
      }
      
      console.log('📡 Fetching ABI:', {
        chainId,
        chainName: chainConfig.name,
        isUnifiedAPI,
        apiUrl: apiUrl.replace(apiKey, '***'),
        url: url.replace(apiKey, '***')
      })
      
      // Use Next.js API route proxy to avoid CORS issues
      const proxyUrl = `/api/proxy-etherscan?url=${encodeURIComponent(url)}`
      
      let response: Response
      try {
        response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        })
      } catch (fetchError: any) {
        console.error('Fetch error (network):', fetchError)
        return { 
          abi: null, 
          error: `Network error: ${fetchError.message || 'Failed to connect to API'}` 
        }
      }
      
      // Check response status
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText)
        return { abi: null, error: `API request failed: ${response.status} ${response.statusText}` }
      }
      
      let responseText = await response.text()
      
      // Check if response is HTML (error page)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('API returned HTML instead of JSON. Full response:', responseText.substring(0, 500))
        // Try to extract error message from HTML if possible
        const errorMatch = responseText.match(/<title>(.*?)<\/title>/i) || responseText.match(/error[^<]*/i)
        const errorMsg = errorMatch ? errorMatch[1] || errorMatch[0] : 'API returned HTML error page'
        return { abi: null, error: `API error: ${errorMsg}` }
      }

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse API response:', responseText.substring(0, 200))
        return { abi: null, error: 'Invalid API response format' }
      }

      // Check for API errors
      if (data.status === '0' || data.status === 'NOTOK') {
        const resultMsg = String(data.result || '').trim()
        const errorMsg = data.message || data.result || 'API request failed'
        
        // "Contract source code not verified" is a valid response, not an error
        const isNotVerified = resultMsg === 'Contract source code not verified' || 
            resultMsg.toLowerCase() === 'contract source code not verified' ||
            resultMsg.toLowerCase().includes('contract source code not verified')
        
        if (isNotVerified) {
          // Contract is not verified - return without error (this is normal)
          return { abi: null }
        }
        
        // For actual errors, log and return error
        console.error('Etherscan API error:', errorMsg, 'Full response:', data)
        
        // Provide more helpful error messages
        if (errorMsg.includes('Invalid API Key') || errorMsg.includes('api key') || errorMsg.toLowerCase().includes('key')) {
          return { abi: null, error: 'Invalid or missing API key. Please set NEXT_PUBLIC_ETHERSCAN_API_KEY in your .env.local file.' }
        }
        if (errorMsg.includes('rate limit') || errorMsg.includes('Max rate limit')) {
          return { abi: null, error: 'API rate limit exceeded. Please try again later.' }
        }
        if (errorMsg.includes('Invalid address')) {
          return { abi: null, error: 'Invalid contract address format.' }
        }
        
        return { abi: null, error: errorMsg }
      }

      if (data.status === '1' && data.result && data.result !== 'Contract source code not verified') {
        try {
          const abi = typeof data.result === 'string' ? JSON.parse(data.result) : data.result
          return { abi }
        } catch (parseError) {
          return { abi: null, error: 'Failed to parse ABI' }
        }
      } else {
        // Contract not verified
        return { abi: null, error: data.message || 'Contract not verified' }
      }
    } catch (error: any) {
      console.error('Error fetching ABI:', error)
      
      // Handle network errors specifically
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        return { 
          abi: null, 
          error: 'Network error: Failed to connect to API. This might be a CORS issue or network connectivity problem.' 
        }
      }
      
      // Handle other errors
      const errorMessage = error.message || 'Failed to fetch ABI'
      return { abi: null, error: errorMessage }
    }
  }

  /**
   * Check verification status across multiple chains
   */
  async checkVerificationStatus(
    contractAddress: string,
    chainIds: number[]
  ): Promise<ChainVerificationStatus[]> {
    const results: ChainVerificationStatus[] = []

    // Check each chain in parallel
    const promises = chainIds.map(async (chainId) => {
      if (!this.isChainSupported(chainId)) {
        return {
          chainId,
          chainName: `Chain ${chainId}`,
          isVerified: false,
          explorerUrl: '',
          contractUrl: '',
          error: 'Chain not supported by Etherscan API'
        }
      }

      const chainConfig = ETHERSCAN_SUPPORTED_CHAINS[chainId]
      const apiKey = this.getApiKeyForChain(chainId)

      console.log('🔑 checkVerificationStatus - API Key status:', {
        chainId,
        chainName: chainConfig.name,
        hasApiKey: !!apiKey,
        keyLength: apiKey?.length || 0,
        keyPreview: apiKey ? `${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}` : 'none'
      })

      if (!apiKey) {
        return {
          chainId,
          chainName: chainConfig.name,
          isVerified: false,
          explorerUrl: chainConfig.explorerUrl,
          contractUrl: `${chainConfig.explorerUrl}/address/${contractAddress}`,
          error: 'API key is required. Please set NEXT_PUBLIC_ETHERSCAN_API_KEY in your .env.local file and restart the dev server.'
        }
      }

      try {
        // Check if contract is verified by trying to get ABI
        const abiResult = await this.getContractABI(contractAddress, chainId)
        
        // If we got an error about invalid response, try V1 API directly
        if (abiResult.error && abiResult.error.includes('Invalid API response')) {
          // Try V1 API as fallback
          const v1ApiUrl = chainConfig.apiUrl.replace('/v2/api', '/api')
          const apiKey = this.getApiKeyForChain(chainId)
          
          try {
            const v1Url = `${v1ApiUrl}?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`
            const v1Response = await fetch(v1Url)
            const v1Text = await v1Response.text()
            
            if (!v1Text.trim().startsWith('<!DOCTYPE') && !v1Text.trim().startsWith('<html')) {
              const v1Data = JSON.parse(v1Text)
              if (v1Data.status === '1' && v1Data.result && v1Data.result !== 'Contract source code not verified') {
                const abi = typeof v1Data.result === 'string' ? JSON.parse(v1Data.result) : v1Data.result
                return {
                  chainId,
                  chainName: chainConfig.name,
                  isVerified: true,
                  explorerUrl: chainConfig.explorerUrl,
                  contractUrl: `${chainConfig.explorerUrl}/address/${contractAddress}`,
                  abi
                }
              }
            }
          } catch (v1Error) {
            // V1 also failed, continue with original error
          }
        }
        
        return {
          chainId,
          chainName: chainConfig.name,
          isVerified: abiResult.abi !== null,
          explorerUrl: chainConfig.explorerUrl,
          contractUrl: `${chainConfig.explorerUrl}/address/${contractAddress}`,
          abi: abiResult.abi || undefined,
          error: abiResult.error
        }
      } catch (error: any) {
        return {
          chainId,
          chainName: chainConfig.name,
          isVerified: false,
          explorerUrl: chainConfig.explorerUrl,
          contractUrl: `${chainConfig.explorerUrl}/address/${contractAddress}`,
          error: error.message || 'Failed to check verification status'
        }
      }
    })

    const resultsArray = await Promise.all(promises)
    return resultsArray
  }

  /**
   * Get detailed contract information from a specific chain
   */
  async getContractSourceCode(
    contractAddress: string,
    chainId: number
  ): Promise<CrossChainVerificationResult> {
    if (!this.isChainSupported(chainId)) {
      return {
        chainId,
        chainName: `Chain ${chainId}`,
        contractAddress,
        isVerified: false,
        error: `Chain ${chainId} is not supported by Etherscan API`
      }
    }

    const chainConfig = ETHERSCAN_SUPPORTED_CHAINS[chainId]
    const apiKey = this.getApiKeyForChain(chainId)

    try {
      // Base now uses unified Etherscan API V2 with chainid (like other unified APIs)
      // Other chain-specific APIs use their own V1 API without chainid
      // Unified APIs (etherscan.io) use V2 API with chainid parameter
      const isUnifiedAPI = chainConfig.apiUrl.includes('etherscan.io')
      
      // Ensure V2 API format for unified APIs (including Base)
      let apiUrl = chainConfig.apiUrl
      if (isUnifiedAPI && !apiUrl.includes('/v2/api')) {
        // For unified APIs: replace /api at the END of the path
        apiUrl = apiUrl.replace(/\/api$/, '/v2/api')
      }
      
      // Build URL - unified APIs (including Base) need chainid
      let url: string
      if (isUnifiedAPI) {
        // Unified API (etherscan.io) requires chainid with V2 API
        url = `${apiUrl}?chainid=${chainId}&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`
      } else {
        // Chain-specific API doesn't need chainid (API is already scoped to that chain)
        url = `${apiUrl}?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`
      }
      
      console.log('📡 Fetching source code:', {
        chainId,
        chainName: chainConfig.name,
        isUnifiedAPI,
        apiUrl: apiUrl.replace(apiKey, '***'),
        url: url.replace(apiKey, '***')
      })
      
      // Use Next.js API route proxy to avoid CORS issues
      const proxyUrl = `/api/proxy-etherscan?url=${encodeURIComponent(url)}`
      
      let response: Response
      try {
        response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        })
      } catch (fetchError: any) {
        console.error('Fetch error (network):', fetchError)
        return {
          chainId,
          chainName: chainConfig.name,
          contractAddress,
          isVerified: false,
          error: `Network error: ${fetchError.message || 'Failed to connect to API'}`
        }
      }
      
      // Check response status
      if (!response.ok) {
        console.error('API response not OK:', response.status, response.statusText)
        return {
          chainId,
          chainName: chainConfig.name,
          contractAddress,
          isVerified: false,
          error: `API request failed: ${response.status} ${response.statusText}`
        }
      }
      
      let responseText = await response.text()
      
      // Check if response is HTML (error page)
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
        console.error('API returned HTML instead of JSON. Full response:', responseText.substring(0, 500))
        // Try to extract error message from HTML if possible
        const errorMatch = responseText.match(/<title>(.*?)<\/title>/i) || responseText.match(/error[^<]*/i)
        const errorMsg = errorMatch ? errorMatch[1] || errorMatch[0] : 'API returned HTML error page'
        return {
          chainId,
          chainName: chainConfig.name,
          contractAddress,
          isVerified: false,
          error: `API error: ${errorMsg}`
        }
      }

      // Try to parse as JSON
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('Failed to parse API response:', responseText.substring(0, 200))
        return {
          chainId,
          chainName: chainConfig.name,
          contractAddress,
          isVerified: false,
          error: 'Invalid API response format'
        }
      }

      // Check for API errors
      if (data.status === '0' || data.status === 'NOTOK') {
        const resultMsg = String(data.result || '').trim()
        const errorMsg = data.message || data.result || 'API request failed'
        
        // "Contract source code not verified" is a valid response, not an error
        // Check result field first (that's where the actual message is)
        const isNotVerifiedResponse = resultMsg === 'Contract source code not verified' || 
            resultMsg.toLowerCase() === 'contract source code not verified' ||
            resultMsg.toLowerCase().includes('contract source code not verified')
        
        if (isNotVerifiedResponse) {
          // This is a normal response - contract is not verified
          // Don't log as error, just return the status
          return {
            chainId,
            chainName: chainConfig.name,
            contractAddress,
            isVerified: false
            // No error field - this is a normal response
          }
        }
        
        // For actual errors, log and return error
        console.error('Etherscan API error:', errorMsg, 'Full response:', data)
        
        // Provide more helpful error messages
        let friendlyError = errorMsg
        if (errorMsg.includes('Invalid API Key') || errorMsg.includes('api key') || errorMsg.toLowerCase().includes('key')) {
          friendlyError = 'Invalid or missing API key. Please set NEXT_PUBLIC_ETHERSCAN_API_KEY in your .env.local file.'
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('Max rate limit')) {
          friendlyError = 'API rate limit exceeded. Please try again later.'
        } else if (errorMsg.includes('Invalid address')) {
          friendlyError = 'Invalid contract address format.'
        }
        
        return {
          chainId,
          chainName: chainConfig.name,
          contractAddress,
          isVerified: false,
          error: friendlyError
        }
      }

      if (data.status === '1' && data.result && data.result.length > 0) {
        const contractData = data.result[0]
        
        // Check if contract is verified
        const isVerified = contractData.SourceCode && 
                          contractData.SourceCode !== '' && 
                          contractData.SourceCode !== null

        if (!isVerified) {
          return {
            chainId,
            chainName: chainConfig.name,
            contractAddress,
            isVerified: false,
            error: 'Contract source code not verified'
          }
        }

        // Parse ABI if available
        let abi: any[] = []
        try {
          if (contractData.ABI && contractData.ABI !== 'Contract source code not verified') {
            abi = JSON.parse(contractData.ABI)
          }
        } catch (e) {
          console.warn('Failed to parse ABI:', e)
        }

        return {
          chainId,
          chainName: chainConfig.name,
          contractAddress,
          isVerified: true,
          contractName: contractData.ContractName || undefined,
          compilerVersion: contractData.CompilerVersion || undefined,
          optimizationUsed: contractData.OptimizationUsed === '1',
          runs: contractData.Runs ? parseInt(contractData.Runs) : undefined,
          abi,
          sourceCode: contractData.SourceCode || undefined,
          constructorArgs: contractData.ConstructorArguments || undefined,
          proxyType: contractData.Proxy || undefined,
          implementationAddress: contractData.Implementation || undefined
        }
      } else {
        return {
          chainId,
          chainName: chainConfig.name,
          contractAddress,
          isVerified: false,
          error: data.message || 'Contract not found or not verified'
        }
      }
    } catch (error: any) {
      return {
        chainId,
        chainName: chainConfig.name,
        contractAddress,
        isVerified: false,
        error: error.message || 'Failed to fetch contract source code'
      }
    }
  }

  /**
   * Verify a contract on a specific chain
   * Note: This requires the source code and constructor arguments
   */
  async verifyContract(
    contractAddress: string,
    chainId: number,
    sourceCode: string,
    contractName: string,
    compilerVersion: string,
    constructorArgs: string,
    optimizationUsed: boolean = true,
    runs: number = 200,
    licenseType: string = 'MIT'
  ): Promise<{ success: boolean; guid?: string; error?: string }> {
    if (!this.isChainSupported(chainId)) {
      return { success: false, error: `Chain ${chainId} is not supported` }
    }

    const chainConfig = ETHERSCAN_SUPPORTED_CHAINS[chainId]
    const apiKey = this.getApiKeyForChain(chainId)

    try {
      // Build form data for verification
      const formData = {
        apikey: apiKey,
        chainid: chainId.toString(),
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: contractAddress,
        sourceCode: sourceCode,
        codeformat: 'solidity-single-file',
        contractname: contractName,
        compilerversion: compilerVersion,
        optimizationUsed: optimizationUsed ? '1' : '0',
        runs: runs.toString(),
        constructorArguements: constructorArgs, // Note: Etherscan API uses this spelling
        licenseType: licenseType
      }
      
      // Use proxy API route for POST requests (verification requires POST)
      const response = await fetch('/api/proxy-etherscan-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: chainConfig.apiUrl,
          formData: formData
        })
      })

      const responseText = await response.text()
      let data: any
      try {
        data = JSON.parse(responseText)
      } catch (e) {
        return { success: false, error: 'Invalid API response format' }
      }

      if (data.status === '1' && data.result) {
        // Extract GUID from result (format: "guid:xxxxx" or just "xxxxx")
        const guid = data.result.toString().replace('guid:', '').trim()
        return { success: true, guid }
      } else {
        return { success: false, error: data.message || 'Verification submission failed' }
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to submit verification' }
    }
  }

  /**
   * Check verification status using GUID
   */
  async checkVerificationStatusByGUID(
    guid: string,
    chainId: number
  ): Promise<{ status: string; message?: string }> {
    if (!this.isChainSupported(chainId)) {
      return { status: 'error', message: `Chain ${chainId} is not supported` }
    }

    const chainConfig = ETHERSCAN_SUPPORTED_CHAINS[chainId]
    const apiKey = this.getApiKeyForChain(chainId)

    try {
      const url = `${chainConfig.apiUrl}?chainid=${chainId}&module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`
      
      const response = await fetch(url)
      const data = await response.json()

      return {
        status: data.status === '1' ? 'success' : 'pending',
        message: data.result || data.message
      }
    } catch (error: any) {
      return { status: 'error', message: error.message || 'Failed to check verification status' }
    }
  }
}

/**
 * Create a cross-chain verification service instance
 */
export function createCrossChainVerificationService(apiKey?: string): CrossChainVerificationService {
  return new CrossChainVerificationService(apiKey)
}
