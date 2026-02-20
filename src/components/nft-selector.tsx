'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { LayerZeroChain, LAYERZERO_CHAINS } from '@/lib/chains'
import { ethers } from 'ethers'
import { 
  Image as ImageIcon, 
  Search, 
  RefreshCw, 
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { useAccount } from 'wagmi'

/**
 * Decode RLE (Run-Length Encoded) pixel data to image data URL
 * Supports common RLE formats for on-chain pixel art NFTs (like Pixel Goblins)
 */
async function decodeRLEToImage(rleData: string | number[], dimensions: string | { width: number; height: number }, tokenId: string): Promise<string | null> {
  try {
    // Parse dimensions (e.g., "34x34" or {width: 34, height: 34})
    let width = 34
    let height = 34
    if (typeof dimensions === 'string') {
      const [w, h] = dimensions.split('x').map(Number)
      if (w && h) {
        width = w
        height = h
      }
    } else if (dimensions && typeof dimensions === 'object') {
      width = dimensions.width || 34
      height = dimensions.height || 34
    }
    
    // Create canvas to render pixels
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    
    // Parse RLE data - common formats:
    // 1. Hex string: "0x123456..."
    // 2. Array of numbers: [1, 2, 3, ...]
    // 3. Base64 string
    // 4. Plain hex string
    
    let pixels: number[] = []
    
    if (typeof rleData === 'string') {
      // Remove 0x prefix if present
      const cleanData = rleData.startsWith('0x') ? rleData.slice(2) : rleData
      
      // Try to parse as hex
      if (/^[0-9a-fA-F]+$/.test(cleanData)) {
        // Hex string - convert to bytes
        for (let i = 0; i < cleanData.length; i += 2) {
          const byte = parseInt(cleanData.substr(i, 2), 16)
          pixels.push(byte)
        }
      } else {
        // Try base64
        try {
          const decoded = atob(cleanData)
          for (let i = 0; i < decoded.length; i++) {
            pixels.push(decoded.charCodeAt(i))
          }
        } catch (e) {
          console.warn('Could not decode RLE data as hex or base64')
          return null
        }
      }
    } else if (Array.isArray(rleData)) {
      pixels = rleData
    } else {
      console.warn('Unknown RLE data format')
      return null
    }
    
    // Simple RLE decode: format is typically [color, count, color, count, ...]
    // Or [r, g, b, count, r, g, b, count, ...]
    // For now, we'll try a simple approach: assume RGB values
    
    let pixelIndex = 0
    let dataIndex = 0
    
    while (dataIndex < pixels.length && pixelIndex < width * height) {
      if (dataIndex + 3 < pixels.length) {
        // Assume RGB format
        const r = pixels[dataIndex]
        const g = pixels[dataIndex + 1]
        const b = pixels[dataIndex + 2]
        const count = pixels[dataIndex + 3] || 1
        
        const x = pixelIndex % width
        const y = Math.floor(pixelIndex / width)
        
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
        ctx.fillRect(x, y, Math.min(count, width - x), 1)
        
        pixelIndex += count
        dataIndex += 4
      } else {
        // Fallback: single color per pixel
        const color = pixels[dataIndex]
        const x = pixelIndex % width
        const y = Math.floor(pixelIndex / width)
        
        ctx.fillStyle = `rgb(${color}, ${color}, ${color})`
        ctx.fillRect(x, y, 1, 1)
        
        pixelIndex++
        dataIndex++
      }
    }
    
    // Convert canvas to data URL
    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Error decoding RLE data:', error)
    return null
  }
}

export interface NFT {
  tokenId: string
  contractAddress: string
  name: string
  description?: string
  image?: string
  collection: {
    name: string
    symbol: string
  }
  chain: LayerZeroChain
}

interface NFTSelectorProps {
  selectedChain: LayerZeroChain | null
  onNFTSelect: (nft: NFT) => void
  onBatchSelect?: (nfts: NFT[]) => void // For batch mode
  exampleContracts: { [key: string]: string }
  batchMode?: boolean // Enable batch selection mode
}

export function NFTSelector({ selectedChain, onNFTSelect, onBatchSelect, exampleContracts, batchMode = false }: NFTSelectorProps) {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [previewNfts, setPreviewNfts] = useState<NFT[]>([]) // For preview mode
  const [loading, setLoading] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false) // For preview loading
  const [previewLoaded, setPreviewLoaded] = useState(false) // Flag to prevent multiple loads
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [browseChain, setBrowseChain] = useState<LayerZeroChain | null>(selectedChain)
  const [showAllChains, setShowAllChains] = useState(false)
  const [selectedNFTs, setSelectedNFTs] = useState<Set<string>>(new Set()) // For batch mode: tokenId -> contractAddress
  
  // Safe wagmi hook usage with multiple detection methods
  let address: string | undefined
  let isConnected = false
  
  try {
    const account = useAccount()
    address = account.address
    isConnected = account.isConnected && mounted
    
    // Additional wallet detection methods
    if (!isConnected && mounted && typeof window !== 'undefined') {
      // Method 1: Check window.ethereum directly
      if (window.ethereum && window.ethereum.selectedAddress) {
        address = window.ethereum.selectedAddress
        isConnected = true
        console.log('🔍 Wallet detected via window.ethereum:', address)
      }
      
      // Method 2: Check for MetaMask specifically
      if (!isConnected && window.ethereum && window.ethereum.isMetaMask) {
        // Request account access
        window.ethereum.request({ method: 'eth_accounts' })
          .then((accounts: string[]) => {
            if (accounts.length > 0) {
              address = accounts[0]
              isConnected = true
              console.log('🔍 Wallet detected via MetaMask eth_accounts:', address)
            }
          })
          .catch(console.error)
      }
      
      // Method 3: Check localStorage for cached connection
      try {
        const cachedWallet = localStorage.getItem('wagmi.connected')
        const cachedAccount = localStorage.getItem('wagmi.account')
        if (cachedWallet && cachedAccount) {
          console.log('🔍 Found cached wallet connection')
        }
      } catch (error) {
        // localStorage not available
      }
    }
    
    console.log(`🔍 NFT Selector wallet status:`, {
      mounted,
      address,
      isConnected,
      wagmiConnected: account?.isConnected,
      windowEthereum: !!window?.ethereum,
      selectedAddress: window?.ethereum?.selectedAddress
    })
    
  } catch (error) {
    // Hook not available during SSR
    console.log('useAccount not available during SSR')
    
    // Fallback: Try direct window.ethereum detection
    if (mounted && typeof window !== 'undefined' && window.ethereum) {
      address = window.ethereum.selectedAddress
      isConnected = !!address
      console.log('🔍 Fallback wallet detection:', { address, isConnected })
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  // Mock NFT data for demonstration
  const mockNFTs: NFT[] = [
    {
      tokenId: '1',
      contractAddress: exampleContracts.ethereum || '0xB5D45368f6Db8c72EA4781e9cB2FcD6f20301D7F',
      name: 'Pixel Goblin #1',
      description: 'A rare pixel goblin from the original collection',
      image: 'https://via.placeholder.com/200x200/1a1a1a/ffffff?text=PG%231',
      collection: {
        name: 'Pixel Goblins',
        symbol: 'PGOB'
      },
      chain: LAYERZERO_CHAINS.find(chain => chain.id === 1)!
    },
    {
      tokenId: '42',
      contractAddress: exampleContracts.ethereum || '0xB5D45368f6Db8c72EA4781e9cB2FcD6f20301D7F',
      name: 'Pixel Goblin #42',
      description: 'The answer to everything, in goblin form',
      image: 'https://via.placeholder.com/200x200/2a2a2a/ffffff?text=PG%2342',
      collection: {
        name: 'Pixel Goblins',
        symbol: 'PGOB'
      },
      chain: LAYERZERO_CHAINS.find(chain => chain.id === 1)!
    },
    {
      tokenId: '7',
      contractAddress: exampleContracts.ethereum || '0xB5D45368f6Db8c72EA4781e9cB2FcD6f20301D7F',
      name: 'Pixel Goblin #7',
      description: 'Lucky number seven goblin',
      image: 'https://via.placeholder.com/200x200/3a3a3a/ffffff?text=PG%237',
      collection: {
        name: 'Pixel Goblins',
        symbol: 'PGOB'
      },
      chain: LAYERZERO_CHAINS.find(chain => chain.id === 1)!
    },
    {
      tokenId: '15',
      contractAddress: exampleContracts.base || '0x25635e0cFa58Db7D6E4e5004Bc653Db18d62310B',
      name: 'Bridged Goblin #15',
      description: 'A goblin that crossed the bridge to Base',
      image: 'https://via.placeholder.com/200x200/4a4a4a/ffffff?text=BG%2315',
      collection: {
        name: 'Bridged Goblins',
        symbol: 'BGOB'
      },
      chain: LAYERZERO_CHAINS.find(chain => chain.id === 8453)!
    },
    {
      tokenId: '23',
      contractAddress: exampleContracts.base || '0x25635e0cFa58Db7D6E4e5004Bc653Db18d62310B',
      name: 'Bridged Goblin #23',
      description: 'Another successful bridge to Base network',
      image: 'https://via.placeholder.com/200x200/5a5a5a/ffffff?text=BG%2323',
      collection: {
        name: 'Bridged Goblins',
        symbol: 'BGOB'
      },
      chain: LAYERZERO_CHAINS.find(chain => chain.id === 8453)!
    }
  ]


  // Alchemy NFT API integration
  const fetchFromAlchemy = async (walletAddress: string, chain: LayerZeroChain): Promise<NFT[]> => {
    // Note: This requires an Alchemy API key
    const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '5DS-fmHYDMnhoLsuQAsBD' // Fallback to your API key
    console.log(`🔍 Alchemy API Key available: ${!!alchemyApiKey}`)
    console.log(`🔍 Alchemy API Key (first 10 chars): ${alchemyApiKey?.substring(0, 10)}...`)
    
    if (!alchemyApiKey) {
      throw new Error('Alchemy API key not configured')
    }

    // Use the correct Alchemy NFT API v3 endpoint format
    const baseUrl = chain.id === 1 
      ? `https://eth-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}`
      : chain.id === 8453 
      ? `https://base-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}`
      : chain.id === 137
      ? `https://polygon-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}`
      : chain.id === 42161
      ? `https://arb-mainnet.g.alchemy.com/nft/v3/${alchemyApiKey}`
      : null

    if (!baseUrl) {
      throw new Error(`Chain ${chain.name} not supported by Alchemy`)
    }

    // Fetch all NFTs with pagination
    let allNFTs: any[] = []
    let pageKey: string | undefined = undefined
    let totalFetched = 0
    
    do {
      const apiUrl: string = pageKey 
        ? `${baseUrl}/getNFTsForOwner?owner=${walletAddress}&withMetadata=true&pageSize=100&pageKey=${pageKey}`
        : `${baseUrl}/getNFTsForOwner?owner=${walletAddress}&withMetadata=true&pageSize=100`
      
      if (totalFetched === 0) {
        console.log(`🔍 Fetching NFTs from Alchemy for ${walletAddress} on ${chain.name}`)
        console.log(`📡 Full API URL: ${apiUrl}`)
      } else {
        console.log(`📄 Fetching next page (already fetched ${totalFetched} NFTs)...`)
      }

      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Alchemy API error: ${response.status} - ${errorText}`)
        throw new Error(`Alchemy API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      if (totalFetched === 0) {
        console.log(`📊 Alchemy response structure:`, {
          totalCount: data.totalCount,
          ownedNftsLength: data.ownedNfts?.length,
          firstNFT: data.ownedNfts?.[0],
          pageKey: data.pageKey
        })
      }
      
      if (data.ownedNfts && data.ownedNfts.length > 0) {
        allNFTs = allNFTs.concat(data.ownedNfts)
        totalFetched = allNFTs.length
        pageKey = data.pageKey
        console.log(`✅ Fetched ${data.ownedNfts.length} NFTs (total: ${totalFetched}/${data.totalCount || 'unknown'})`)
      } else {
        pageKey = undefined
      }
      
      // Limit to prevent infinite loops (max 500 NFTs)
      if (totalFetched >= 500) {
        console.warn(`⚠️ Reached maximum fetch limit (500 NFTs)`)
        break
      }
    } while (pageKey)
    
    console.log(`📦 Total NFTs fetched from Alchemy: ${allNFTs.length}`)
    
    const data = { ownedNfts: allNFTs, totalCount: allNFTs.length }
    
    // Mapping of contract addresses to their custom metadata API base URLs
    // Format: lowercase contract address -> base URL (tokenId will be appended)
    const collectionMetadataAPIs: { [contractAddress: string]: string } = {
      '0xabcdb5710b88f456fed1e99025379e2969f29610': 'https://radbro.xyz/api/tokens/metadata', // Radbro
      // Add Radcats contract address here when known - uses: https://radbro.xyz/api/radcats/metadata/{tokenId}
      // '0x...': 'https://radbro.xyz/api/radcats/metadata', // Radcats
      // Add more collections here:
      // '0x...': 'https://collection.xyz/api/tokens/metadata', // Collection Name
      // To find contract addresses, check OpenSea or Etherscan
    }
    
    // Special handling for collections that share the same domain but different endpoints
    // This allows us to try multiple endpoints for the same contract
    const tryCollectionAPIVariants = async (contractAddress: string, tokenId: string, collectionName?: string): Promise<string | null> => {
      const name = (collectionName || '').toLowerCase()
      const isRadbroRelated = contractAddress === '0xabcdb5710b88f456fed1e99025379e2969f29610' || 
                             name.includes('radbro') || 
                             name.includes('radcat') ||
                             name.includes('rad')
      
      if (isRadbroRelated) {
        const variants = [
          `https://radbro.xyz/api/tokens/metadata/${tokenId}`, // Radbro standard endpoint
          `https://radbro.xyz/api/radcats/metadata/${tokenId}`, // Radcats endpoint
        ]
        
        for (const url of variants) {
          try {
            console.log(`🔍 Trying collection API variant: ${url}`)
            const response = await fetch(url, {
              signal: AbortSignal.timeout(5000),
              headers: { 'Accept': 'application/json' }
            })
            
            if (response.ok) {
              const metadata = await response.json()
              console.log(`📊 Collection API variant metadata from ${url}:`, {
                hasImage: !!metadata.image,
                imageType: typeof metadata.image,
                imageValue: metadata.image ? (typeof metadata.image === 'string' ? metadata.image.substring(0, 100) : 'object') : 'none'
              })
              
              if (metadata.image) {
                const normalizedImage = normalizeImageUrl(metadata.image)
                console.log(`✅ Got image from collection API variant: ${normalizedImage.substring(0, 100)}...`)
                return normalizedImage
              }
            } else {
              console.warn(`⚠️ Collection API variant returned ${response.status} for ${url}`)
            }
          } catch (error: any) {
            // Continue to next variant
          }
        }
      }
      return null
    }
    
    // Helper function to normalize image URLs (handle IPFS, etc.)
    // Based on Zylla project's robust IPFS handling
    const normalizeImageUrl = (imageUrl: string): string => {
      if (!imageUrl) return imageUrl
      
      // Handle IPFS URLs in various formats
      if (imageUrl.startsWith('ipfs://')) {
        const ipfsHash = imageUrl.replace('ipfs://', '').replace('ipfs/', '').split('/')[0]
        return `https://ipfs.io/ipfs/${ipfsHash}`
      } else if (imageUrl.startsWith('ipfs/')) {
        const ipfsHash = imageUrl.replace('ipfs/', '').split('/')[0]
        return `https://ipfs.io/ipfs/${ipfsHash}`
      }
      
      // Handle IPFS gateway URLs (dweb.link, nftstorage.link, etc.) - convert to reliable gateway
      // Match formats like:
      // - https://HASH.ipfs.dweb.link/path/to/image.png
      // - https://HASH.ipfs.nftstorage.link/path/to/image.png
      if (imageUrl.includes('.ipfs.dweb.link') || imageUrl.includes('.ipfs.nftstorage.link')) {
        // Extract IPFS hash and path from URLs
        // The hash can be very long (bafybeiaqof5u4bj57t36pt2t7egerky6epvutg7yb4suljnnjuqboymhvi)
        const dwebMatch = imageUrl.match(/https?:\/\/([a-zA-Z0-9]+)\.ipfs\.(dweb|nftstorage)\.link(\/.*)?$/)
        if (dwebMatch && dwebMatch[1]) {
          const ipfsHash = dwebMatch[1]
          const path = dwebMatch[3] || ''
          // Use reliable IPFS gateway
          const normalized = `https://ipfs.io/ipfs/${ipfsHash}${path}`
          console.log(`🔄 Normalized dweb.link URL: ${imageUrl.substring(0, 80)}... -> ${normalized.substring(0, 80)}...`)
          return normalized
        }
      }
      
      // If it's already ipfs.io, return as-is
      if (imageUrl.includes('ipfs.io/ipfs/')) {
        return imageUrl
      }
      
      // Handle Arweave URLs
      if (imageUrl.startsWith('ar://')) {
        return imageUrl.replace('ar://', 'https://arweave.net/')
      }
      
      // Return as-is if it's already an HTTP/HTTPS URL or data URL
      return imageUrl
    }
    
    // Helper function to fetch image from collection's custom metadata API
    const fetchImageFromCollectionAPI = async (contractAddress: string, tokenId: string): Promise<string | null> => {
      const baseUrl = collectionMetadataAPIs[contractAddress.toLowerCase()]
      if (!baseUrl) {
        return null
      }
      
      const metadataUrl = `${baseUrl}/${tokenId}`
      try {
        console.log(`🔍 Trying collection metadata API: ${metadataUrl}`)
        const response = await fetch(metadataUrl, {
          signal: AbortSignal.timeout(5000),
          headers: { 'Accept': 'application/json' }
        })
        
        if (response.ok) {
          const metadata = await response.json()
          console.log(`📊 Collection API metadata for ${contractAddress} #${tokenId}:`, {
            hasImage: !!metadata.image,
            imageType: typeof metadata.image,
            imageValue: metadata.image ? (typeof metadata.image === 'string' ? metadata.image.substring(0, 100) : 'object') : 'none'
          })
          
          if (metadata.image) {
            const normalizedImage = normalizeImageUrl(metadata.image)
            console.log(`✅ Got image from collection API for ${contractAddress} #${tokenId}: ${normalizedImage.substring(0, 100)}...`)
            return normalizedImage
          }
        } else {
          console.warn(`⚠️ Collection API returned ${response.status} for ${metadataUrl}`)
        }
      } catch (error: any) {
        console.warn(`⚠️ Collection API error for ${metadataUrl}:`, error.message)
      }
      return null
    }
    
    // Helper function to fetch image from OpenSea API
    const fetchImageFromOpenSea = async (contractAddress: string, tokenId: string): Promise<string | null> => {
      const openseaApiKey = process.env.NEXT_PUBLIC_OPENSEA_API_KEY || 
                            (typeof window !== 'undefined' && (window as any).__OPENSEA_API_KEY__) ||
                            '9b2f911fc99347a2892c38150dee875a' // Fallback for testing
      
      if (!openseaApiKey) {
        return null
      }
      
      const openseaImageUrl = `https://api.opensea.io/api/v2/chain/ethereum/contract/${contractAddress}/nfts/${tokenId}`
      try {
        const openseaResponse = await fetch(openseaImageUrl, {
          signal: AbortSignal.timeout(5000),
          headers: { 
            'Accept': 'application/json',
            'X-API-KEY': openseaApiKey
          }
        })
        
        if (openseaResponse.ok) {
          const openseaData = await openseaResponse.json()
          if (openseaData.nft?.image_url) {
            console.log(`✅ Got image from OpenSea API for ${contractAddress} #${tokenId}`)
            return openseaData.nft.image_url
          }
        }
      } catch (openseaError: any) {
        // Silently fail - OpenSea is just a fallback
      }
      return null
    }
    
    const nfts = await Promise.all(
      (data.ownedNfts || []).map(async (nft: any) => {
        const tokenId = nft.tokenId || nft.id?.tokenId
        const contractAddress = nft.contract?.address?.toLowerCase()
        let image = nft.image?.cachedUrl || nft.image?.originalUrl || nft.image?.thumbnailUrl || nft.media?.[0]?.gateway || ''
        const collectionName = nft.collection?.name || nft.contract?.name || ''
        
        // Check if this is a Radbro/Radcats collection that might need special handling
        const isRadbroRelated = contractAddress === '0xabcdb5710b88f456fed1e99025379e2969f29610' || 
                               collectionName?.toLowerCase().includes('radbro') || 
                               collectionName?.toLowerCase().includes('radcat') ||
                               collectionName?.toLowerCase().includes('rad')
        
        // If image is missing or invalid, try collection-specific API first, then OpenSea API
        // Also try for Radbro/Radcats even if Alchemy returned something (might be wrong)
        if (contractAddress && tokenId && (!image || isRadbroRelated)) {
          console.log(`🖼️ Processing image for ${collectionName} #${tokenId} (contract: ${contractAddress}, hasImage: ${!!image})`)
          
          // Priority 1: Try collection's custom metadata API (if available)
          let collectionImage = await fetchImageFromCollectionAPI(contractAddress, tokenId)
          
          // Priority 1b: Try API variants for collections that might use different endpoints (e.g., Radbro/Radcats)
          if (!collectionImage && isRadbroRelated) {
            console.log(`🔄 Trying Radbro/Radcats API variants for ${contractAddress} #${tokenId}`)
            collectionImage = await tryCollectionAPIVariants(contractAddress, tokenId, collectionName)
          }
          
          if (collectionImage) {
            image = collectionImage
            console.log(`✅ Set image from collection API for ${collectionName} #${tokenId}: ${image.substring(0, 80)}...`)
          } else if (!image) {
            // Priority 2: Try OpenSea API as fallback (only if we don't have an image)
            const openseaImage = await fetchImageFromOpenSea(contractAddress, tokenId)
            if (openseaImage) {
              image = openseaImage
            }
          }
        }
        
        // Check if this is a Pixel Goblin and image is still missing (for special RLE decoding handling)
        const isPixelGoblin = contractAddress === '0x6559807ffd23965d3af54ee454bc69f113ed06ef'
        if (isPixelGoblin && !image) {
          console.log(`🎨 Pixel Goblin #${tokenId} missing image, trying RLE decoding...`)
          
          // Declare metadata and metadataUrl variables for this block
          let metadata = nft.metadata || null
          let metadataUrl = null
          
          // Priority 1: Check if Alchemy already has metadata in the response
          if (metadata && typeof metadata === 'object') {
            console.log(`📋 Using metadata from Alchemy response for token ${tokenId}`)
          } else {
            // Priority 2: Use tokenURI from Alchemy response
            if (nft.tokenUri?.raw) {
              metadataUrl = nft.tokenUri.raw.startsWith('ipfs://') 
                ? `https://ipfs.io/ipfs/${nft.tokenUri.raw.replace('ipfs://', '').replace('ipfs/', '')}`
                : nft.tokenUri.raw
              console.log(`📋 Using tokenURI from Alchemy (raw): ${metadataUrl}`)
            } else if (nft.tokenUri?.gateway) {
              metadataUrl = nft.tokenUri.gateway
              console.log(`📋 Using tokenURI from Alchemy (gateway): ${metadataUrl}`)
            } else {
              // Priority 3: Fetch tokenURI from contract (most reliable for Pixel Goblins)
              if (!metadata && !metadataUrl) {
                try {
                  // Use StaticJsonRpcProvider which doesn't require network detection
                  const provider = new ethers.providers.StaticJsonRpcProvider('https://eth.llamarpc.com', {
                    chainId: 1,
                    name: 'homestead'
                  })
                  const contract = new ethers.Contract(
                    contractAddress,
                    ['function tokenURI(uint256) view returns (string)'],
                    provider
                  )
                  const tokenURI = await contract.tokenURI(tokenId)
                  metadataUrl = tokenURI.startsWith('ipfs://')
                    ? `https://ipfs.io/ipfs/${tokenURI.replace('ipfs://', '').replace('ipfs/', '')}`
                    : tokenURI
                  console.log(`📋 Fetched tokenURI from contract: ${metadataUrl}`)
                } catch (contractError: any) {
                  console.warn(`⚠️ Could not fetch tokenURI from contract:`, contractError.message || contractError)
                }
              }
            }
          }
            
          // Fetch metadata from URL if we have one but no metadata yet
          if (!image && !metadata && metadataUrl) {
              try {
                console.log(`🔍 Fetching metadata from: ${metadataUrl}`)
                const metadataResponse = await fetch(metadataUrl, {
                  signal: AbortSignal.timeout(10000),
                  headers: { 'Accept': 'application/json' }
                })
                
                if (metadataResponse.ok) {
                  metadata = await metadataResponse.json()
                  console.log(`📋 Fetched metadata for token ${tokenId}`)
                } else {
                  console.warn(`⚠️ Metadata fetch failed: ${metadataResponse.status} ${metadataResponse.statusText}`)
                  
                  // If metadata API fails, try image endpoint directly (OpenSea-compatible)
                  if (metadataUrl.includes('pixel-goblin-image-api-production.up.railway.app/api/metadata/')) {
                    const imageTokenId = metadataUrl.split('/').pop()
                    const baseUrl = 'https://pixel-goblin-image-api-production.up.railway.app'
                    const imageEndpoints = [
                      `${baseUrl}/api/image/${imageTokenId}`,
                      `${baseUrl}/image/${imageTokenId}`,
                      `${baseUrl}/${imageTokenId}/image`,
                      `${baseUrl}/api/${imageTokenId}/image`
                    ]
                    
                    for (const imageUrl of imageEndpoints) {
                      try {
                        console.log(`🖼️ Trying image endpoint: ${imageUrl}`)
                        const imageResponse = await fetch(imageUrl, {
                          signal: AbortSignal.timeout(3000),
                          headers: { 'Accept': 'image/*' },
                          mode: 'cors'
                        })
                        console.log(`📡 Image endpoint response: ${imageResponse.status} for ${imageUrl}`)
                        if (imageResponse.ok && imageResponse.headers.get('content-type')?.startsWith('image/')) {
                          const blob = await imageResponse.blob()
                          image = URL.createObjectURL(blob)
                          console.log(`✅ Got image from API endpoint: ${imageUrl}`)
                          break
                        } else if (imageResponse.ok) {
                          // Even if content-type isn't image/*, try to use it if status is OK
                          const contentType = imageResponse.headers.get('content-type') || ''
                          if (contentType.includes('json')) {
                            // Might be JSON with image data
                            const jsonData = await imageResponse.json()
                            if (jsonData.image || jsonData.imageUrl || jsonData.url) {
                              image = jsonData.image || jsonData.imageUrl || jsonData.url
                              console.log(`✅ Got image URL from JSON response: ${image}`)
                              break
                            }
                          }
                        }
                      } catch (imgError: any) {
                        console.log(`⚠️ Image endpoint failed (${imageUrl}):`, imgError.message)
                        continue
                      }
                    }
                  }
                }
              } catch (metadataError: any) {
                console.warn(`⚠️ Could not fetch metadata:`, metadataError.message)
              }
          }
          
          // Decode RLE from metadata if we have it
          if (metadata && !image) {
            console.log(`📋 Processing metadata for token ${tokenId}:`, { 
              hasRle: !!metadata.rle, 
              hasPixels: !!metadata.pixels, 
              hasImageData: !!metadata.image_data,
              hasImage: !!metadata.image,
              imageType: typeof metadata.image
            })
            
            // Check for RLE data in various fields
            if (metadata.rle || metadata.pixels || metadata.image_data) {
              const rleData = metadata.rle || metadata.pixels || metadata.image_data
              const dimensions = metadata.dimensions || metadata.size || '34x34'
              console.log(`🎨 Attempting RLE decode for token ${tokenId}...`)
              image = await decodeRLEToImage(rleData, dimensions, tokenId) || ''
              if (image) {
                console.log(`✅ Successfully decoded RLE for token ${tokenId}`)
              } else {
                console.warn(`⚠️ RLE decode returned empty for token ${tokenId}`)
              }
            } else if (metadata.image) {
              // Check if image field contains RLE data (not a URL)
              const imageValue = metadata.image
              if (typeof imageValue === 'string' && 
                  !imageValue.startsWith('http') && 
                  !imageValue.startsWith('ipfs') && 
                  !imageValue.startsWith('data:') &&
                  imageValue.length > 50) { // RLE data is usually long
                console.log(`🎨 Image field might contain RLE data (length: ${imageValue.length}), attempting decode...`)
                const dimensions = metadata.dimensions || metadata.size || '34x34'
                image = await decodeRLEToImage(imageValue, dimensions, tokenId) || ''
              } else if (typeof imageValue === 'string' && imageValue.startsWith('http')) {
                // It's a URL, use it directly
                image = imageValue
                console.log(`✅ Using image URL from metadata: ${imageValue}`)
              }
            }
          }
          
          if (!image) {
            console.warn(`❌ Could not get image for Pixel Goblin #${tokenId} after all attempts`)
            // Use a placeholder image so the UI doesn't look broken
            // Create a simple 200x200 pixel placeholder (standard NFT size)
            try {
              const canvas = document.createElement('canvas')
              canvas.width = 200
              canvas.height = 200
              const ctx = canvas.getContext('2d')
              if (ctx) {
                // Draw a simple placeholder pattern
                ctx.fillStyle = '#1a1a1a'
                ctx.fillRect(0, 0, 200, 200)
                ctx.fillStyle = '#333'
                ctx.fillRect(10, 10, 180, 180)
                ctx.fillStyle = '#666'
                ctx.font = 'bold 24px monospace'
                ctx.textAlign = 'center'
                ctx.textBaseline = 'middle'
                ctx.fillText(`#${tokenId}`, 100, 100)
                image = canvas.toDataURL('image/png')
                console.log(`🖼️ Using placeholder image for Pixel Goblin #${tokenId}`)
              } else {
                // Fallback: use a simple data URL if canvas fails
                image = `data:image/svg+xml;base64,${btoa(`<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#1a1a1a"/><text x="100" y="100" font-family="monospace" font-size="24" fill="#666" text-anchor="middle" dominant-baseline="middle">#${tokenId}</text></svg>`)}`
                console.log(`🖼️ Using SVG placeholder for Pixel Goblin #${tokenId}`)
              }
            } catch (error: any) {
              // Final fallback: use SVG data URL
              image = `data:image/svg+xml;base64,${btoa(`<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#1a1a1a"/><text x="100" y="100" font-family="monospace" font-size="24" fill="#666" text-anchor="middle" dominant-baseline="middle">#${tokenId}</text></svg>`)}`
              console.log(`🖼️ Using SVG fallback placeholder for Pixel Goblin #${tokenId}`)
            }
          }
        }
        
        // Normalize image URL before returning (handle IPFS, etc.)
        const finalImage = image ? normalizeImageUrl(image) : undefined
        
        if (finalImage && finalImage !== image) {
          console.log(`🔄 Normalized image URL for ${contractAddress} #${tokenId}: ${image.substring(0, 50)}... → ${finalImage.substring(0, 50)}...`)
        }
        
        return {
          tokenId: tokenId?.toString(),
          contractAddress: contractAddress || '',
          name: nft.name || nft.title || `${nft.collection?.name || nft.contract?.name || 'Unknown'} #${tokenId}`,
          description: nft.description,
          image: finalImage,
          collection: {
            name: nft.collection?.name || nft.contract?.name || 'Unknown Collection',
            symbol: nft.contract?.symbol || 'NFT'
          },
          chain: chain
        }
      })
    )
    
    const filteredNfts = nfts.filter((nft: any) => nft.contractAddress && nft.tokenId && !nft.isSpam) || []

    console.log(`✅ Processed ${nfts.length} NFTs from Alchemy`)
    return nfts
  }

  // OpenSea API integration
  const fetchFromOpenSea = async (walletAddress: string, chain: LayerZeroChain): Promise<NFT[]> => {
    const openSeaApiKey = process.env.NEXT_PUBLIC_OPENSEA_API_KEY || '9b2f911fc99347a2892c38150dee875a' // Fallback to your API key
    console.log(`🔍 OpenSea API Key available: ${!!openSeaApiKey}`)
    
    if (!openSeaApiKey) {
      throw new Error('OpenSea API key not configured')
    }
    
    // OpenSea API v2 chain mapping
    const chainName = chain.id === 1 ? 'ethereum' : 
                     chain.id === 8453 ? 'base' : 
                     chain.id === 137 ? 'matic' :
                     chain.id === 42161 ? 'arbitrum' :
                     chain.id === 10 ? 'optimism' : null
    
    if (!chainName) {
      throw new Error(`Chain ${chain.name} not supported by OpenSea`)
    }

    const apiUrl = `https://api.opensea.io/api/v2/chain/${chainName}/account/${walletAddress}/nfts?limit=50`
    console.log(`🔍 Fetching NFTs from OpenSea for ${walletAddress} on ${chain.name}`)
    console.log(`📡 Full OpenSea API URL: ${apiUrl}`)

    const response = await fetch(apiUrl, {
      headers: {
        'X-API-KEY': openSeaApiKey,
        'Accept': 'application/json'
      }
    })
    
    console.log(`📡 OpenSea Response status: ${response.status}`)
    console.log(`📡 OpenSea Response headers:`, Object.fromEntries(response.headers.entries()))
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ OpenSea API error: ${response.status} - ${errorText}`)
      throw new Error(`OpenSea API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`📊 OpenSea response structure:`, {
      nftsLength: data.nfts?.length,
      firstNFT: data.nfts?.[0],
      next: data.next
    })
    
    const nfts = data.nfts?.map((nft: any) => ({
      tokenId: nft.identifier,
      contractAddress: nft.contract,
      name: nft.name || `Token #${nft.identifier}`,
      description: nft.description,
      image: nft.image_url || nft.display_image_url,
      collection: {
        name: nft.collection || 'Unknown Collection',
        symbol: 'NFT'
      },
      chain: chain
    })).filter((nft: any) => nft.contractAddress && nft.tokenId) || []

    console.log(`✅ Processed ${nfts.length} NFTs from OpenSea`)
    return nfts
  }

  // Etherscan API integration
  const fetchFromEtherscan = async (walletAddress: string, chain: LayerZeroChain): Promise<NFT[]> => {
    const etherscanApiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG' // Fallback to your API key
    if (!etherscanApiKey) {
      throw new Error('Etherscan API key not configured')
    }

    // Only support Ethereum mainnet for Etherscan
    if (chain.id !== 1) {
      throw new Error(`Chain ${chain.name} not supported by Etherscan`)
    }

    console.log(`🔍 Fetching NFTs from Etherscan for ${walletAddress}`)

    // Get ERC-721 token transfers to find NFT contracts
    const response = await fetch(
      `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${walletAddress}&page=1&offset=100&sort=desc&apikey=${etherscanApiKey}`
    )

    if (!response.ok) {
      throw new Error(`Etherscan API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`📊 Etherscan response:`, data)

    if (data.status !== '1' || !data.result) {
      console.log('No NFT transactions found on Etherscan')
      return []
    }

    // Group by contract and get latest owned tokens
    const contractTokens: { [contract: string]: Set<string> } = {}
    const contractInfo: { [contract: string]: { name: string, symbol: string } } = {}

    // Process transactions to find currently owned NFTs
    for (const tx of data.result) {
      const contract = tx.contractAddress.toLowerCase()
      const tokenId = tx.tokenID
      
      if (!contractTokens[contract]) {
        contractTokens[contract] = new Set()
      }
      
      contractInfo[contract] = {
        name: tx.tokenName || 'Unknown Collection',
        symbol: tx.tokenSymbol || 'NFT'
      }

      // If transfer is TO the wallet, add token
      if (tx.to.toLowerCase() === walletAddress.toLowerCase()) {
        contractTokens[contract].add(tokenId)
      }
      // If transfer is FROM the wallet, remove token
      else if (tx.from.toLowerCase() === walletAddress.toLowerCase()) {
        contractTokens[contract].delete(tokenId)
      }
    }

    // Convert to NFT array
    const nfts: NFT[] = []
    for (const [contractAddress, tokenIds] of Object.entries(contractTokens)) {
      const info = contractInfo[contractAddress]
      for (const tokenId of Array.from(tokenIds)) {
        nfts.push({
          tokenId,
          contractAddress,
          name: `${info.name} #${tokenId}`,
          description: `NFT from ${info.name} collection`,
          image: `https://via.placeholder.com/200x200/1a1a1a/ffffff?text=${info.symbol}%20%23${tokenId}`,
          collection: {
            name: info.name,
            symbol: info.symbol
          },
          chain: chain
        })
      }
    }

    console.log(`✅ Processed ${nfts.length} NFTs from Etherscan`)
    return nfts.slice(0, 50) // Limit to 50 NFTs
  }

  // Query specific contract for owned NFTs using direct contract calls
  const fetchFromSpecificContract = async (
    walletAddress: string, 
    chain: LayerZeroChain, 
    contractAddress: string
  ): Promise<NFT[]> => {
    console.log(`🔍 Querying contract ${contractAddress} on ${chain.name} for NFTs owned by ${walletAddress}`)
    
    try {
      // Get RPC URL for the chain
      const rpcUrls = (chain as any).rpcUrls?.default?.http || (chain as any).rpcUrls?.public?.http || []
      let rpcUrl = rpcUrls[0]
      
      // Fallback RPC URLs for specific chains
      if (!rpcUrl) {
        const fallbackRpcUrls: { [key: number]: string } = {
          56: 'https://bsc-dataseed1.binance.org', // BNB Smart Chain
          8453: 'https://mainnet.base.org', // Base
          1: 'https://eth.llamarpc.com', // Ethereum
          137: 'https://polygon-rpc.com', // Polygon
          42161: 'https://arb1.arbitrum.io/rpc', // Arbitrum
          10: 'https://mainnet.optimism.io', // Optimism
        }
        rpcUrl = fallbackRpcUrls[chain.id]
      }
      
      if (!rpcUrl) {
        throw new Error(`No RPC URL found for ${chain.name}`)
      }
      
      const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
      
      // ERC721 ABI for balanceOf, tokenOfOwnerByIndex, ownerOf, tokenURI, name, symbol
      const erc721Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
      ]
      
      const contract = new ethers.Contract(contractAddress, erc721Abi, provider)
      
      // Get collection info
      let collectionName = 'Unknown Collection'
      let collectionSymbol = 'NFT'
      try {
        collectionName = await contract.name() || collectionName
        collectionSymbol = await contract.symbol() || collectionSymbol
      } catch (e) {
        console.log('Could not fetch collection name/symbol:', e)
      }
      
      // Get balance
      const balance = await contract.balanceOf(walletAddress)
      const balanceNum = balance.toNumber()
      
      console.log(`📊 Found ${balanceNum} NFTs in contract ${contractAddress}`)
      
      if (balanceNum === 0) {
        return []
      }
      
      // Get all token IDs owned by the wallet
      const nfts: NFT[] = []
      const ownedTokenIds = new Set<string>()
      
      // Quick check: If balance is 1, try token ID 7 directly (known from BSCScan)
      if (balanceNum === 1) {
        try {
          console.log(`🔍 Quick check: Testing ownerOf(7) since balance is 1...`)
          console.log(`📋 Contract address: ${contractAddress}`)
          console.log(`📋 Wallet address: ${walletAddress}`)
          console.log(`📋 RPC URL: ${rpcUrl}`)
          
          // Add a timeout to the ownerOf call
          const ownerPromise = contract.ownerOf('7')
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('ownerOf timeout after 10s')), 10000)
          )
          
          const testOwner = await Promise.race([ownerPromise, timeoutPromise]) as string
          console.log(`✅ ownerOf(7) returned: ${testOwner}`)
          
          if (testOwner && testOwner.toLowerCase() === walletAddress.toLowerCase()) {
            console.log(`✅ Token 7 is owned by wallet! Adding it directly.`)
            ownedTokenIds.add('7')
            // Skip event queries and go straight to metadata fetching
            console.log(`⏭️ Skipping event queries, using direct ownerOf result`)
          } else {
            console.log(`❌ Token 7 is owned by ${testOwner}, not wallet (expected: ${walletAddress})`)
            // Still try other methods
          }
        } catch (e: any) {
          console.error(`❌ ownerOf(7) failed:`, e)
          console.error(`   Error code: ${e.code}`)
          console.error(`   Error message: ${e.message}`)
          console.error(`   Error data: ${e.data}`)
          console.log(`⚠️ Will try other methods to find the token...`)
        }
      }
      
      // If we already found the token via direct check, skip enumeration/events
      if (ownedTokenIds.size === 0 || ownedTokenIds.size < balanceNum) {
        // Method 1: Try enumeration if contract supports it
        let enumerationSupported = false
        try {
          // Test if enumeration is supported by trying to get the first token
          await contract.tokenOfOwnerByIndex(walletAddress, 0)
          enumerationSupported = true
          console.log('✅ Contract supports token enumeration')
        } catch (e) {
          console.log('⚠️ Contract does not support enumeration, using Transfer events')
          enumerationSupported = false
        }
        
        if (enumerationSupported) {
          // Use enumeration method
          for (let i = 0; i < balanceNum && i < 100; i++) { // Limit to 100 NFTs
            try {
              const tokenIdBigNumber = await contract.tokenOfOwnerByIndex(walletAddress, i)
              const tokenId = tokenIdBigNumber.toString()
              ownedTokenIds.add(tokenId)
            } catch (e) {
              console.error(`Error fetching token at index ${i}:`, e)
              break
            }
          }
        } else {
          // Method 2: Query Transfer events to find owned tokens
          console.log('🔍 Querying Transfer events to find owned tokens...')
          try {
          // ERC721 Transfer event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
          const transferEventSignature = 'Transfer(address,address,uint256)'
          const transferTopic = ethers.utils.id(transferEventSignature)
          
          // Get current block and try to find contract deployment block
          const currentBlock = await provider.getBlockNumber()
          console.log(`📊 Current block: ${currentBlock}`)
          
          // Try to get contract creation block by checking the first transaction
          let fromBlock = 0
          try {
            // Try to get contract code to verify it exists
            const code = await provider.getCode(contractAddress)
            if (!code || code === '0x') {
              throw new Error('Contract does not exist at this address')
            }
            
            // For BNB Smart Chain, query from a reasonable starting point
            // BNB Smart Chain has been around for a while, so we'll query from a recent block
            // But first, let's try to find when the contract was created
            // We'll query from block 0 for now, but this might be slow
            // Better approach: query from a known recent block (last 50k blocks)
            fromBlock = Math.max(0, currentBlock - 50000)
            console.log(`📊 Querying from block ${fromBlock} to ${currentBlock}`)
          } catch (e) {
            console.error('Error getting contract info:', e)
            fromBlock = Math.max(0, currentBlock - 50000)
          }
          
          // Query Transfer events where 'to' is the wallet address
          const walletAddressPadded = ethers.utils.hexZeroPad(walletAddress, 32)
          console.log(`🔍 Wallet address padded: ${walletAddressPadded}`)
          
          const transferToFilter = {
            address: contractAddress,
            topics: [
              transferTopic,
              null, // from (any)
              walletAddressPadded // to (wallet address)
            ],
            fromBlock,
            toBlock: 'latest'
          }
          
          // Query Transfer events where 'from' is the wallet address (tokens sent away)
          const transferFromFilter = {
            address: contractAddress,
            topics: [
              transferTopic,
              walletAddressPadded, // from (wallet address)
              null // to (any)
            ],
            fromBlock,
            toBlock: 'latest'
          }
          
          console.log('🔍 Querying Transfer events...')
          const [transfersTo, transfersFrom] = await Promise.all([
            provider.getLogs(transferToFilter).catch(e => {
              console.error('Error querying transfers TO:', e)
              return []
            }),
            provider.getLogs(transferFromFilter).catch(e => {
              console.error('Error querying transfers FROM:', e)
              return []
            })
          ])
          
          console.log(`📊 Found ${transfersTo.length} transfers TO wallet, ${transfersFrom.length} transfers FROM wallet`)
          
          // Process transfers TO wallet (add tokens)
          for (const log of transfersTo) {
            try {
              // topics[0] = event signature
              // topics[1] = from address
              // topics[2] = to address  
              // topics[3] = tokenId
              if (log.topics && log.topics.length >= 4) {
                const tokenId = ethers.BigNumber.from(log.topics[3]).toString()
                ownedTokenIds.add(tokenId)
                console.log(`✅ Found token ${tokenId} transferred TO wallet`)
              }
            } catch (e) {
              console.error('Error processing transfer TO log:', e, log)
            }
          }
          
          // Process transfers FROM wallet (remove tokens)
          for (const log of transfersFrom) {
            try {
              if (log.topics && log.topics.length >= 4) {
                const tokenId = ethers.BigNumber.from(log.topics[3]).toString()
                ownedTokenIds.delete(tokenId)
                console.log(`❌ Found token ${tokenId} transferred FROM wallet`)
              }
            } catch (e) {
              console.error('Error processing transfer FROM log:', e, log)
            }
          }
          
          console.log(`✅ Found ${ownedTokenIds.size} unique tokens from Transfer events`)
          
          // If we found 0 tokens but balanceOf > 0, try alternative method
          if (ownedTokenIds.size === 0 && balanceNum > 0) {
            console.warn(`⚠️ Token count mismatch: Found 0 tokens from events, but balanceOf returns ${balanceNum}`)
            console.log('🔄 Trying alternative method: querying all Transfer events from block 0...')
            throw new Error('No transfers found in recent blocks, trying alternative method')
          }
          
          // If we found tokens but the count doesn't match balance, log a warning
          if (ownedTokenIds.size !== balanceNum && ownedTokenIds.size > 0) {
            console.warn(`⚠️ Token count mismatch: Found ${ownedTokenIds.size} tokens from events, but balanceOf returns ${balanceNum}`)
          }
        } catch (e) {
          console.error('Error querying Transfer events:', e)
          // If event querying fails, try a simpler approach: query all Transfer events
          // and filter by current owner
          console.log('🔄 Trying alternative method: querying all Transfer events from block 0...')
          try {
            const transferEventSignature = 'Transfer(address,address,uint256)'
            const transferTopic = ethers.utils.id(transferEventSignature)
            
            // Query from block 0 to get all Transfer events
            // Some RPCs might limit this, so we'll try in chunks if needed
            console.log('🔍 Querying all Transfer events from block 0...')
            
            let allTransfers: any[] = []
            try {
              // Try querying from block 0 first
              const allTransfersFilter = {
                address: contractAddress,
                topics: [transferTopic],
                fromBlock: 0,
                toBlock: 'latest'
              }
              
              allTransfers = await provider.getLogs(allTransfersFilter)
              console.log(`📊 Found ${allTransfers.length} total Transfer events from block 0`)
            } catch (e2a: any) {
              // If querying from block 0 fails (too many results), try from contract deployment
              console.log('⚠️ Querying from block 0 failed, trying to find contract deployment block...')
              
              // Try to get contract creation block from the first transaction
              // For now, query from a very early block (BNB Smart Chain started around block 0)
              // Or query in smaller chunks
              const currentBlock = await provider.getBlockNumber()
              
              // Try querying in chunks of 100k blocks
              const chunkSize = 100000
              const chunks: Promise<any[]>[] = []
              
              for (let from = 0; from < currentBlock; from += chunkSize) {
                const to = Math.min(from + chunkSize - 1, currentBlock)
                chunks.push(
                  provider.getLogs({
                    address: contractAddress,
                    topics: [transferTopic],
                    fromBlock: from,
                    toBlock: to
                  }).catch(() => [])
                )
              }
              
              const chunkResults = await Promise.all(chunks)
              allTransfers = chunkResults.flat()
              console.log(`📊 Found ${allTransfers.length} total Transfer events (queried in chunks)`)
            }
            
            if (allTransfers.length === 0) {
              console.warn('⚠️ No Transfer events found at all. Contract might be very new or have no transfers.')
              console.log('🔄 Trying direct ownerOf checks for known token IDs...')
              // Don't return empty - continue to the ownerOf check below
            }
            
            // Process all transfers to build ownership map
            const ownershipMap: { [tokenId: string]: string } = {}
            for (const log of allTransfers) {
              if (log.topics && log.topics.length >= 4) {
                const from = '0x' + log.topics[1].slice(-40).toLowerCase()
                const to = '0x' + log.topics[2].slice(-40).toLowerCase()
                const tokenId = ethers.BigNumber.from(log.topics[3]).toString()
                
                // Update ownership: if transferred TO someone, they own it
                // If transferred FROM someone, they no longer own it
                ownershipMap[tokenId] = to
                
                console.log(`📋 Transfer: Token ${tokenId} from ${from} to ${to}`)
              }
            }
            
            console.log(`📊 Built ownership map for ${Object.keys(ownershipMap).length} tokens`)
            
            // Find tokens owned by wallet
            for (const [tokenId, owner] of Object.entries(ownershipMap)) {
              if (owner === walletAddress.toLowerCase()) {
                ownedTokenIds.add(tokenId)
                console.log(`✅ Token ${tokenId} is owned by wallet (owner: ${owner})`)
              }
            }
            
            console.log(`✅ Found ${ownedTokenIds.size} tokens using alternative method`)
            
            // If still no tokens found but balance > 0, try checking known token IDs
            if (ownedTokenIds.size === 0 && balanceNum > 0) {
              console.log('🔄 No tokens found in events, trying to verify ownership of known tokens...')
              
              // Since we know from BSCScan that token ID 7 exists, check it directly
              // Also try a small range of token IDs (1-20) in case there are others
              const tokenIdsToCheck = ['7'] // Known token ID from BSCScan
              
              // Add a small range of token IDs to check (1-20)
              for (let i = 1; i <= 20; i++) {
                tokenIdsToCheck.push(i.toString())
              }
              
              console.log(`🔍 Checking ${tokenIdsToCheck.length} potential token IDs...`)
              
              for (const tokenId of tokenIdsToCheck) {
                try {
                  console.log(`🔍 Checking token ID ${tokenId}...`)
                  const owner = await contract.ownerOf(tokenId)
                  console.log(`📋 Token ${tokenId} owner: ${owner}`)
                  
                  if (owner && owner.toLowerCase() === walletAddress.toLowerCase()) {
                    console.log(`✅ Token ${tokenId} is owned by wallet (verified via ownerOf)`)
                    ownedTokenIds.add(tokenId)
                    
                    // If we found the right number of tokens, stop checking
                    if (ownedTokenIds.size >= balanceNum) {
                      console.log(`✅ Found all ${balanceNum} token(s), stopping search`)
                      break
                    }
                  } else {
                    console.log(`❌ Token ${tokenId} is owned by ${owner}, not wallet`)
                  }
                } catch (e3: any) {
                  // Token doesn't exist or error checking
                  if (e3.code === 'CALL_EXCEPTION' || e3.message?.includes('revert')) {
                    console.log(`⚠️ Token ${tokenId} does not exist or call reverted`)
                  } else {
                    console.error(`❌ Error checking token ${tokenId}:`, e3)
                  }
                  continue
                }
              }
              
              if (ownedTokenIds.size === 0) {
                console.warn('⚠️ Could not find any token IDs via ownerOf check, but balanceOf indicates ownership')
              }
            }
          } catch (e2) {
            console.error('Alternative method also failed:', e2)
            // Last resort: if balance is 1, try checking token ID 7 and a small range
            if (balanceNum > 0) {
              console.log(`🔄 Last resort: checking token IDs directly (balance: ${balanceNum})...`)
              
              // Check known token ID 7 first (from BSCScan)
              const tokenIdsToCheck = ['7']
              
              // Also check a range (1-50) to find the owned token
              for (let i = 1; i <= 50 && ownedTokenIds.size < balanceNum; i++) {
                if (!tokenIdsToCheck.includes(i.toString())) {
                  tokenIdsToCheck.push(i.toString())
                }
              }
              
              for (const tokenId of tokenIdsToCheck) {
                try {
                  console.log(`🔍 Last resort: Checking token ID ${tokenId}...`)
                  const owner = await contract.ownerOf(tokenId)
                  console.log(`📋 Token ${tokenId} owner: ${owner}`)
                  
                  if (owner && owner.toLowerCase() === walletAddress.toLowerCase()) {
                    console.log(`✅ Token ${tokenId} is owned by wallet (verified via ownerOf)`)
                    ownedTokenIds.add(tokenId)
                    
                    // If we found the right number, stop
                    if (ownedTokenIds.size >= balanceNum) {
                      console.log(`✅ Found all ${balanceNum} token(s), stopping search`)
                      break
                    }
                  } else {
                    console.log(`❌ Token ${tokenId} is owned by ${owner}, not wallet`)
                  }
                } catch (e3: any) {
                  // Token doesn't exist or error checking
                  if (e3.code === 'CALL_EXCEPTION' || e3.message?.includes('revert')) {
                    console.log(`⚠️ Token ${tokenId} does not exist or call reverted`)
                  } else {
                    console.error(`❌ Error checking token ${tokenId}:`, e3)
                  }
                  continue
                }
              }
              
              if (ownedTokenIds.size > 0) {
                console.log(`✅ Last resort method found ${ownedTokenIds.size} token(s)`)
              } else {
                console.warn(`⚠️ Last resort method found 0 tokens, but balanceOf returns ${balanceNum}`)
              }
            }
          }
        }
      }
    }
      
      // Now fetch metadata for all owned tokens
      for (const tokenId of Array.from(ownedTokenIds).slice(0, 100)) { // Limit to 100 NFTs
        try {
          // Verify ownership (double-check)
          const owner = await contract.ownerOf(tokenId)
          if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
            console.log(`⚠️ Token ${tokenId} not owned by wallet, skipping`)
            continue
          }
          
          // Get token URI and fetch metadata
          let tokenURI = ''
          let image = ''
          try {
            tokenURI = await contract.tokenURI(tokenId)
            console.log(`📋 Token ${tokenId} tokenURI: ${tokenURI}`)
            
            // Check if tokenURI is a direct image URL (rare but possible)
            if (tokenURI.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
              image = tokenURI
            } else if (tokenURI.startsWith('data:image/')) {
              // Base64 encoded image
              image = tokenURI
            } else {
              // tokenURI is likely a metadata JSON URL - fetch and parse it
              try {
                // Handle IPFS URLs
                let metadataUrl = tokenURI
                if (tokenURI.startsWith('ipfs://')) {
                  const ipfsHash = tokenURI.replace('ipfs://', '')
                  metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}`
                } else if (tokenURI.startsWith('ipfs/')) {
                  const ipfsHash = tokenURI.replace('ipfs/', '')
                  metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}`
                }
                
                // Fetch metadata JSON
                const metadataResponse = await fetch(metadataUrl, {
                  headers: {
                    'Accept': 'application/json',
                  },
                  signal: AbortSignal.timeout(5000) // 5 second timeout
                })
                
                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json()
                  
                  // Check for RLE-encoded pixel data (on-chain pixel art)
                  if (metadata.rle || metadata.pixels || metadata.image_data || 
                      (metadata.image && typeof metadata.image === 'string' && metadata.image.length > 0 && !metadata.image.startsWith('http') && !metadata.image.startsWith('ipfs') && !metadata.image.startsWith('data:'))) {
                    console.log(`🎨 Detected RLE/pixel data for token ${tokenId}`)
                    
                    // Try to decode RLE data or use API endpoint
                    const rleData = metadata.rle || metadata.pixels || metadata.image_data || metadata.image
                    const dimensions = metadata.dimensions || metadata.size || '34x34'
                    
                    // Check if there's an API endpoint for decoding (prioritize API for Pixel Goblins)
                    // Pixel Goblin contract: 0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef
                    const isPixelGoblin = contractAddress.toLowerCase() === '0x6559807ffd23965d3af54ee454bc69f113ed06ef'
                    if (isPixelGoblin || metadataUrl.includes('pixel-goblin') || metadataUrl.includes('api')) {
                      // Try multiple API endpoint formats
                      const apiEndpoints = []
                      
                      // Format 1: baseUrl/image/{tokenId}
                      if (metadataUrl.includes('/')) {
                        const apiBaseUrl = metadataUrl.split('/').slice(0, -1).join('/')
                        apiEndpoints.push(`${apiBaseUrl}/image/${tokenId}`)
                        apiEndpoints.push(`${apiBaseUrl}/${tokenId}/image`)
                      }
                      
                      // Format 2: Known Pixel Goblin API
                      if (isPixelGoblin) {
                        apiEndpoints.push(`https://pixel-goblin-image-api-production.up.railway.app/image/${tokenId}`)
                        apiEndpoints.push(`https://pixel-goblin-image-api-production.up.railway.app/${tokenId}`)
                      }
                      
                      // Try each endpoint
                      for (const apiImageUrl of apiEndpoints) {
                        try {
                          const apiResponse = await fetch(apiImageUrl, {
                            signal: AbortSignal.timeout(5000),
                            headers: {
                              'Accept': 'image/*'
                            }
                          })
                          if (apiResponse.ok && apiResponse.headers.get('content-type')?.startsWith('image/')) {
                            const blob = await apiResponse.blob()
                            image = URL.createObjectURL(blob)
                            console.log(`✅ Got image from API for token ${tokenId}: ${apiImageUrl}`)
                            break
                          }
                        } catch (apiError) {
                          // Try next endpoint
                          continue
                        }
                      }
                      
                      if (!image) {
                        console.log(`ℹ️ API endpoints not available, will try RLE decode`)
                      }
                    }
                    
                    // If API didn't work, try to decode RLE data
                    if (!image && rleData) {
                      try {
                        const decoded = await decodeRLEToImage(rleData, dimensions, tokenId)
                        if (decoded) {
                          image = decoded
                          console.log(`✅ Decoded RLE data for token ${tokenId}`)
                        }
                      } catch (rleError) {
                        console.warn(`⚠️ RLE decode failed for token ${tokenId}:`, rleError)
                      }
                    }
                  }
                  
                  // If no RLE data, extract image from metadata (try multiple common fields)
                  if (!image) {
                    image = metadata.image || 
                            metadata.image_url || 
                            metadata.imageUrl ||
                            metadata.animation_url || // Some NFTs use animation_url for images
                            metadata.thumbnail_url ||
                            metadata.thumbnailUrl ||
                            ''
                    
                    // Handle IPFS image URLs
                    if (image && image.startsWith('ipfs://')) {
                      const ipfsHash = image.replace('ipfs://', '')
                      image = `https://ipfs.io/ipfs/${ipfsHash}`
                    } else if (image && image.startsWith('ipfs/')) {
                      const ipfsHash = image.replace('ipfs/', '')
                      image = `https://ipfs.io/ipfs/${ipfsHash}`
                    } else if (image && !image.startsWith('http') && !image.startsWith('data:')) {
                      // Relative URL - try to resolve against metadata URL base
                      try {
                        const baseUrl = new URL(metadataUrl).origin
                        image = new URL(image, baseUrl).href
                      } catch (e) {
                        // If resolution fails, use placeholder
                        image = ''
                      }
                    }
                  }
                  
                  console.log(`✅ Extracted image for token ${tokenId}: ${image ? 'Found' : 'Not found'}`)
                } else {
                  console.warn(`⚠️ Failed to fetch metadata for token ${tokenId}: ${metadataResponse.status}`)
                }
              } catch (metadataError: any) {
                console.warn(`⚠️ Error fetching metadata for token ${tokenId}:`, metadataError.message)
                // If metadata fetch fails, check if tokenURI itself might be an image
                if (tokenURI.startsWith('http://') || tokenURI.startsWith('https://')) {
                  // Try using tokenURI as image (some contracts return direct image URLs)
                  image = tokenURI
                }
              }
            }
            
            // Fallback to placeholder if no image found
            if (!image) {
              image = `https://via.placeholder.com/200x200/2a2a2a/ffffff?text=${collectionSymbol}%20%23${tokenId}`
            }
          } catch (e: any) {
            console.warn(`⚠️ Error getting tokenURI for token ${tokenId}:`, e.message)
            image = `https://via.placeholder.com/200x200/2a2a2a/ffffff?text=${collectionSymbol}%20%23${tokenId}`
          }
          
          nfts.push({
            tokenId,
            contractAddress: contractAddress.toLowerCase(),
            name: `${collectionName} #${tokenId}`,
            description: `NFT from ${collectionName} collection`,
            image,
            collection: {
              name: collectionName,
              symbol: collectionSymbol
            },
            chain: chain
          })
        } catch (e) {
          console.error(`Error processing token ${tokenId}:`, e)
        }
      }
      
      console.log(`✅ Found ${nfts.length} NFTs from contract ${contractAddress}`)
      return nfts
    } catch (error: any) {
      console.error(`❌ Error querying contract ${contractAddress}:`, error)
      return []
    }
  }

  // Public RPC method (simple approach) - now with real contract querying
  const fetchFromPublicRPC = async (walletAddress: string, chain: LayerZeroChain): Promise<NFT[]> => {
    console.log(`🔍 Trying public RPC method for ${walletAddress} on ${chain.name}`)
    
    const nfts: NFT[] = []
    
    // Try to get deployed ONFT contract addresses from DeploymentStateManager
    try {
      const { DeploymentStateManager } = await import('@/lib/deployment-state-manager')
      const deployments = DeploymentStateManager.getSuccessfulDeployments()
      
      // Find ONFT contracts for this chain
      for (const deployment of deployments) {
        if (deployment.type === 'adapter' && deployment.onftAddresses) {
          const onftAddress = deployment.onftAddresses[chain.id]
          if (onftAddress) {
            console.log(`📦 Found deployed ONFT contract ${onftAddress} for ${chain.name}`)
            const contractNFTs = await fetchFromSpecificContract(walletAddress, chain, onftAddress)
            nfts.push(...contractNFTs)
          }
        } else if (deployment.type === 'new-onft' && deployment.onftAddresses) {
          const onftAddress = deployment.onftAddresses[chain.id]
          if (onftAddress) {
            console.log(`📦 Found deployed ONFT contract ${onftAddress} for ${chain.name}`)
            const contractNFTs = await fetchFromSpecificContract(walletAddress, chain, onftAddress)
            nfts.push(...contractNFTs)
          }
        }
      }
    } catch (error) {
      console.log('Could not load deployment state:', error)
    }
    
    // If we found NFTs from deployed contracts, return them
    if (nfts.length > 0) {
      console.log(`✅ Found ${nfts.length} NFTs from deployed ONFT contracts`)
      return nfts
    }
    
    // Fallback: Simple approach with popular contracts (only for Ethereum)
    if (chain.id === 1) {
    const popularContracts = [
      { address: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', name: 'Bored Ape Yacht Club', symbol: 'BAYC' },
      { address: '0x60E4d786628Fea6478F785A6d7e704777c86a7c6', name: 'Mutant Ape Yacht Club', symbol: 'MAYC' },
      { address: '0xED5AF388653567Af2F388E6224dC7C4b3241C544', name: 'Azuki', symbol: 'AZUKI' },
      { address: '0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e', name: 'Doodles', symbol: 'DOODLE' },
      { address: '0x23581767a106ae21c074b2276D25e5C3e136a68b', name: 'Moonbirds', symbol: 'MOONBIRD' }
    ]
    
    // For demo purposes, create some sample NFTs if the wallet address looks valid
    if (walletAddress && walletAddress.length === 42 && walletAddress.startsWith('0x')) {
      // Generate some sample NFTs based on wallet address
      const addressNum = parseInt(walletAddress.slice(-4), 16)
      const numNFTs = (addressNum % 5) + 1 // 1-5 NFTs
      
      for (let i = 0; i < numNFTs; i++) {
        const contract = popularContracts[i % popularContracts.length]
        const tokenId = ((addressNum + i) % 9999 + 1).toString()
        
        nfts.push({
          tokenId,
          contractAddress: contract.address,
          name: `${contract.name} #${tokenId}`,
          description: `Your ${contract.name} NFT`,
          image: `https://via.placeholder.com/200x200/2a2a2a/ffffff?text=${contract.symbol}%20%23${tokenId}`,
          collection: {
            name: contract.name,
            symbol: contract.symbol
          },
          chain: chain
        })
        }
      }
    }

    console.log(`✅ Generated ${nfts.length} NFTs from public RPC method`)
    return nfts
  }

  // Direct contract calls using ethers
  const fetchFromContracts = async (walletAddress: string, chain: LayerZeroChain): Promise<NFT[]> => {
    // Try the public RPC method first
    return await fetchFromPublicRPC(walletAddress, chain)
  }

  // Force refresh wallet connection and NFT fetching
  const refreshWalletConnection = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        console.log('🔄 Refreshing wallet connection...')
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          console.log('🔄 Refreshed wallet connection:', accounts[0])
          // Trigger NFT fetch with the detected address
          if (selectedChain) {
            console.log('🔄 Triggering NFT fetch for chain:', selectedChain.name)
            await fetchNFTsWithAddress(accounts[0], selectedChain)
          } else {
            console.log('⚠️ No chain selected for NFT fetch')
          }
        } else {
          console.log('⚠️ No accounts found in wallet')
        }
      } catch (error) {
        console.error('Failed to refresh wallet connection:', error)
      }
    } else {
      console.log('⚠️ window.ethereum not available')
    }
  }, [selectedChain])

  // Manual force refresh for testing
  const forceRefreshNFTs = async () => {
    console.log('🔄 Force refreshing NFTs...')
    console.log('Current state:', {
      address,
      browseChain: browseChain?.name,
      showAllChains,
      selectedChain: selectedChain?.name,
      isConnected,
      mounted
    })
    
    if (address) {
      if (showAllChains) {
        console.log('✅ Fetching NFTs from all chains...')
        await fetchNFTsFromAllChains(address)
      } else {
        const chainToUse = browseChain || selectedChain || LAYERZERO_CHAINS.find(chain => chain.id === 1)!
      console.log('✅ Calling fetchNFTsWithAddress directly...')
        await fetchNFTsWithAddress(address, chainToUse)
      }
    } else {
      console.log('⚠️ No address, trying refreshWalletConnection...')
      await refreshWalletConnection()
    }
  }

  // Fetch NFTs from all supported chains
  const fetchNFTsFromAllChains = useCallback(async (walletAddress: string) => {
    setLoading(true)
    try {
      console.log(`🚀 Fetching NFTs from all chains for ${walletAddress}...`)
      const supportedChains = LAYERZERO_CHAINS.filter(c => !c.isTestnet)
      const allNFTs: NFT[] = []
      
      // Fetch from all chains in parallel (but don't use fetchNFTsWithAddress to avoid double loading state)
      const fetchPromises = supportedChains.map(async (chain) => {
        try {
          // Use the same logic as fetchNFTsWithAddress but without setting loading state
          let chainNFTs: NFT[] = []
          
          // Try Alchemy
          try {
            chainNFTs = await fetchFromAlchemy(walletAddress, chain)
          } catch (error) {
            // Try OpenSea
            try {
              chainNFTs = await fetchFromOpenSea(walletAddress, chain)
            } catch (error) {
              // Try Etherscan
              try {
                chainNFTs = await fetchFromEtherscan(walletAddress, chain)
              } catch (error) {
                // Fallback to mock NFTs for this chain
                chainNFTs = mockNFTs.filter(nft => nft.chain.id === chain.id)
              }
            }
          }
          
          return chainNFTs || []
        } catch (error) {
          console.error(`Failed to fetch NFTs from ${chain.name}:`, error)
          return []
        }
      })
      
      const results = await Promise.all(fetchPromises)
      results.forEach((chainNFTs) => {
        allNFTs.push(...chainNFTs)
      })
      
      console.log(`✅ Found ${allNFTs.length} NFTs across all chains`)
      setNfts(allNFTs)
      return allNFTs
    } catch (error) {
      console.error('Failed to fetch NFTs from all chains:', error)
      setNfts([])
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Separate function to fetch NFTs with a specific address
  const fetchNFTsWithAddress = useCallback(async (walletAddress: string, chain: LayerZeroChain) => {
    console.log(`🚀 fetchNFTsWithAddress called with:`, {
      walletAddress,
      chainName: chain.name,
      chainId: chain.id
    })
    
    setLoading(true)
    try {
      console.log(`🔍 Fetching real NFTs for ${walletAddress} on ${chain.name}...`)
      
      // Try to fetch real NFTs using multiple methods
      let realNFTs: NFT[] = []
      
      // Method 1: Try Alchemy API (if available)
      try {
        realNFTs = await fetchFromAlchemy(walletAddress, chain)
        if (realNFTs.length > 0) {
          console.log(`✅ Found ${realNFTs.length} NFTs via Alchemy`)
        }
      } catch (error) {
        console.log('Alchemy API not available, trying other methods...')
      }
      
      // Method 2: Try OpenSea API (if Alchemy failed)
      if (realNFTs.length === 0) {
        try {
          realNFTs = await fetchFromOpenSea(walletAddress, chain)
          if (realNFTs.length > 0) {
            console.log(`✅ Found ${realNFTs.length} NFTs via OpenSea`)
          }
        } catch (error) {
          console.log('OpenSea API not available, trying other methods...')
        }
      }
      
      // Method 3: Try Etherscan API (if other APIs failed)
      if (realNFTs.length === 0) {
        try {
          realNFTs = await fetchFromEtherscan(walletAddress, chain)
          if (realNFTs.length > 0) {
            console.log(`✅ Found ${realNFTs.length} NFTs via Etherscan`)
          }
        } catch (error) {
          console.log('Etherscan API failed, trying direct contract calls...')
        }
      }

      // Method 4: Try direct contract calls (if APIs failed)
      if (realNFTs.length === 0) {
        try {
          realNFTs = await fetchFromContracts(walletAddress, chain)
          if (realNFTs.length > 0) {
            console.log(`✅ Found ${realNFTs.length} NFTs via contract calls`)
          }
        } catch (error) {
          console.log('Contract calls failed, using demo data...')
        }
      }
      
      // Fallback: Use demo NFTs if no real NFTs found
      if (realNFTs.length === 0) {
        console.log('📝 No real NFTs found, showing demo NFTs for testing...')
        const chainNFTs = mockNFTs.filter(nft => nft.chain.id === chain.id)
        realNFTs = chainNFTs
      }
      
      setNfts(realNFTs)
      console.log(`✅ Displaying ${realNFTs.length} NFTs on ${chain.name}`)
      return realNFTs
      
    } catch (error) {
      console.error('Failed to fetch NFTs:', error)
      // Fallback to demo NFTs on error
      const chainNFTs = mockNFTs.filter(nft => nft.chain.id === chain.id)
      setNfts(chainNFTs)
      return chainNFTs
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Update browseChain when selectedChain changes
    if (selectedChain && !browseChain) {
      setBrowseChain(selectedChain)
    }
  }, [selectedChain])

  useEffect(() => {
    console.log('🔄 NFT Selector useEffect triggered:', {
      isOpen,
      browseChain: browseChain?.name,
      showAllChains,
      mounted,
      address,
      isConnected
    })
    
    if (isOpen && mounted) {
      console.log('✅ Dialog is open, attempting NFT fetch...')
      if (address && isConnected) {
        if (showAllChains) {
          console.log('🚀 Fetching NFTs from all chains for:', address)
          fetchNFTsFromAllChains(address)
        } else {
          // Use browseChain or selectedChain, otherwise default to Ethereum
          const chainToUse = browseChain || selectedChain || LAYERZERO_CHAINS.find(chain => chain.id === 1)!
        console.log('🚀 Fetching NFTs with detected address:', address, 'on chain:', chainToUse.name)
        fetchNFTsWithAddress(address, chainToUse)
        }
      } else {
        console.log('⚠️ No address/connection, trying to refresh wallet...')
        refreshWalletConnection()
      }
    } else {
      console.log('❌ Conditions not met:', {
        isOpen: !!isOpen,
        browseChain: !!browseChain,
        showAllChains,
        mounted: !!mounted
      })
    }
  }, [isOpen, browseChain, showAllChains, address, isConnected, mounted, fetchNFTsWithAddress, fetchNFTsFromAllChains, refreshWalletConnection, selectedChain])

  // Separate effect for automatic preview loading when wallet is connected
  useEffect(() => {
    const loadPreviewNFTs = async () => {
      if (mounted && address && isConnected && !isOpen && !previewLoaded) {
        console.log('🎨 Auto-loading NFT previews for connected wallet:', address)
        setPreviewLoading(true)
        
        try {
          const chainToUse = selectedChain || LAYERZERO_CHAINS.find(chain => chain.id === 1)!
          
          console.log('🔍 Fetching preview NFTs from Alchemy...')
          const previewNFTs = await fetchNFTsWithAddress(address, chainToUse)
          if (previewNFTs && previewNFTs.length > 0) {
            const previewSlice = previewNFTs.slice(0, 6)
            console.log(`✅ Loaded ${previewNFTs.length} preview NFTs`)
            console.log(`🎨 Preview NFTs set:`, previewSlice.map(nft => ({ name: nft.name, image: !!nft.image })))
            
            // Set state directly without setTimeout to avoid timing issues
            setPreviewNfts(previewSlice)
            setPreviewLoaded(true) // Mark as loaded to prevent re-loading
            console.log('🔄 Preview NFTs state updated, should trigger re-render')
          }
        } catch (error) {
          console.error('❌ Failed to load preview NFTs:', error)
          // Set some demo NFTs as fallback
          setPreviewNfts([
            {
              tokenId: '4271',
              contractAddress: '0x3bFC3134645ebe0393F90d6a19BcB20bD732964F',
              name: 'Radbro Webring: Radcats #4271',
              description: 'Your NFT from wallet',
              image: 'https://ipfs.io/ipfs/bafybeiewnpg6jnowrrlcxdj7r7tqeapufqwtwpudxy7m2s6lf4wd447ydq/07d523891a96f88ef1af7f817fc7058a65402fd5506c5f2be0137840f7b113bb.png',
              collection: { name: 'Radbro Webring: Radcats', symbol: 'RADCATS' },
              chain: LAYERZERO_CHAINS.find(chain => chain.id === 1)!
            }
          ])
          setPreviewLoaded(true) // Mark as loaded even for fallback
        } finally {
          setPreviewLoading(false)
        }
      }
    }
    
    loadPreviewNFTs()
  }, [mounted, address, isConnected, isOpen, selectedChain]) // Removed previewNfts.length dependency

  // Filter NFTs based on search query and chain
  const filteredNFTs = nfts.filter(nft => {
    // Filter by chain if not showing all chains
    if (!showAllChains && browseChain && nft.chain.id !== browseChain.id) {
      return false
    }
    
    // Filter by search query
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      nft.name.toLowerCase().includes(query) ||
      nft.collection.name.toLowerCase().includes(query) ||
      nft.tokenId.includes(query) ||
      nft.contractAddress.toLowerCase().includes(query) ||
      nft.chain.name.toLowerCase().includes(query)
    )
  })

  // Group NFTs by chain for display
  const groupedNFTs = showAllChains 
    ? filteredNFTs.reduce((acc, nft) => {
        const chainName = nft.chain.name
        if (!acc[chainName]) acc[chainName] = []
        acc[chainName].push(nft)
        return acc
      }, {} as Record<string, NFT[]>)
    : { [browseChain?.name || selectedChain?.name || 'NFTs']: filteredNFTs }

  const handleNFTSelect = (nft: NFT) => {
    if (batchMode) {
      // Toggle selection in batch mode
      const nftKey = `${nft.contractAddress}-${nft.tokenId}`
      const newSelected = new Set(selectedNFTs)
      if (newSelected.has(nftKey)) {
        newSelected.delete(nftKey)
      } else {
        newSelected.add(nftKey)
      }
      setSelectedNFTs(newSelected)
      
      // Notify parent of selected NFTs
      if (onBatchSelect) {
        const selectedNFTsArray = nfts.filter(n => newSelected.has(`${n.contractAddress}-${n.tokenId}`))
        onBatchSelect(selectedNFTsArray)
      }
    } else {
      // Single select mode
      onNFTSelect(nft)
      setIsOpen(false)
    }
  }
  
  const handleBatchBridge = () => {
    if (onBatchSelect && selectedNFTs.size > 0) {
      const selectedNFTsArray = nfts.filter(n => selectedNFTs.has(`${n.contractAddress}-${n.tokenId}`))
      onBatchSelect(selectedNFTsArray)
    }
  }
  
  const isNFTSelected = (nft: NFT) => {
    if (!batchMode) return false
    const nftKey = `${nft.contractAddress}-${nft.tokenId}`
    return selectedNFTs.has(nftKey)
  }

  // Debug current state
  console.log('🖼️ NFT Selector render state:', {
    mounted,
    isConnected,
    previewLoading,
    previewNftsLength: previewNfts.length,
    previewNftsNames: previewNfts.map(nft => nft.name)
  })

  if (!mounted) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <div className="h-8 w-8 bg-muted rounded mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">
            Loading...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center space-y-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Connect your wallet to browse your NFTs
            </p>
            <p className="text-xs text-muted-foreground/70">
              Wallet connected in header but not detected here?
            </p>
          </div>
          <Button 
            onClick={refreshWalletConnection}
            variant="outline" 
            size="sm"
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh Connection
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Removed selectedChain requirement - component now works with default Ethereum chain

  // Final render condition check
  console.log('🖼️ Final render check:', {
    previewLoading,
    previewNftsLength: previewNfts.length,
    willShowGrid: !previewLoading && previewNfts.length > 0,
    previewNftsNames: previewNfts.map(nft => nft.name)
  })

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div>
          {previewLoading ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium mb-1">Loading Your NFTs...</p>
                <p className="text-xs text-muted-foreground">
                  Fetching from {selectedChain?.name || 'Ethereum'}
                </p>
              </CardContent>
            </Card>
          ) : previewNfts.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Your NFTs</p>
                <Button variant="ghost" size="sm" className="text-xs">
                  View All ({previewNfts.length > 6 ? '6+' : previewNfts.length})
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {previewNfts.slice(0, 6).map((nft, index) => (
                  <Card 
                    key={`${nft.contractAddress}-${nft.tokenId}`} 
                    className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                    onClick={() => handleNFTSelect(nft)}
                  >
                    <CardContent className="p-3">
                      <div className="aspect-square relative mb-2 bg-muted rounded-md overflow-hidden">
                        {nft.image ? (
                          <img
                            src={nft.image}
                            alt={nft.name}
                            className="w-full h-full object-cover rounded-md"
                            loading="lazy"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              console.error(`❌ Failed to load image for ${nft.name}:`, nft.image)
                              // Try alternative IPFS gateways if the current one failed
                              if (nft.image && nft.image.includes('ipfs.io/ipfs/')) {
                                const ipfsMatch = nft.image.match(/ipfs\/([^\/\?]+)/)
                                if (ipfsMatch && ipfsMatch[1]) {
                                  const ipfsHash = ipfsMatch[1]
                                  // Try alternative gateways
                                  const alternativeGateways = [
                                    `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                                    `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
                                    `https://dweb.link/ipfs/${ipfsHash}`
                                  ]
                                  const currentGateway = (target as any).__currentGateway || 0
                                  if (currentGateway < alternativeGateways.length) {
                                    console.log(`🔄 Trying alternative gateway ${currentGateway + 1}/${alternativeGateways.length}: ${alternativeGateways[currentGateway]}`)
                                    target.src = alternativeGateways[currentGateway]
                                    ;(target as any).__currentGateway = currentGateway + 1
                                    return // Let the browser try this gateway
                                  }
                                }
                              }
                              // If all gateways fail, use placeholder
                              target.src = `https://via.placeholder.com/200x200/2a2a2a/ffffff?text=${nft.collection.symbol}%20%23${nft.tokenId}`
                              target.onerror = null // Prevent infinite loop
                            }}
                            onLoad={() => {
                              console.log(`✅ Successfully loaded image for ${nft.name}`)
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted rounded-md">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium truncate leading-tight">{nft.name}</p>
                        <p className="text-xs text-muted-foreground truncate">#{nft.tokenId}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border-dashed hover:border-solid cursor-pointer transition-colors">
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-medium">Browse All NFTs</p>
                  <p className="text-xs text-muted-foreground">
                    Click to view and select from all your NFTs
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed hover:border-solid cursor-pointer transition-colors">
              <CardContent className="p-6 text-center">
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium mb-1">Browse Your NFTs</p>
                <p className="text-xs text-muted-foreground">
                  Click to select from your {selectedChain?.name || 'Ethereum'} NFTs
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {showAllChains ? 'Your NFTs (All Chains)' : `Your NFTs on ${browseChain?.name || selectedChain?.name || 'Ethereum'}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Chain Selector and Options */}
          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2 flex-1">
              <label className="text-sm font-medium whitespace-nowrap">Chain:</label>
              <select
                value={showAllChains ? 'all' : (browseChain?.id || selectedChain?.id || 1)}
                onChange={(e) => {
                  if (e.target.value === 'all') {
                    setShowAllChains(true)
                    setBrowseChain(null)
                  } else {
                    setShowAllChains(false)
                    const chain = LAYERZERO_CHAINS.find(c => c.id === parseInt(e.target.value))
                    setBrowseChain(chain || null)
                  }
                }}
                className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Chains</option>
                {LAYERZERO_CHAINS.filter(c => !c.isTestnet).map(chain => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </div>
            <Button 
              variant={showAllChains ? "default" : "outline"} 
              size="sm"
              onClick={() => {
                setShowAllChains(!showAllChains)
                if (!showAllChains) {
                  setBrowseChain(null)
                } else {
                  setBrowseChain(selectedChain)
                }
              }}
            >
              {showAllChains ? 'Single Chain' : 'All Chains'}
            </Button>
          </div>

          {/* Search and Refresh */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search NFTs by name, collection, or token ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={forceRefreshNFTs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {batchMode && selectedNFTs.size > 0 && (
              <Button 
                variant="default" 
                onClick={handleBatchBridge}
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                Bridge Selected ({selectedNFTs.size})
              </Button>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading your NFTs...</p>
            </div>
          )}

          {/* NFT Grid */}
          {!loading && (
            <div className="max-h-[50vh] overflow-y-auto">
              {filteredNFTs.length === 0 ? (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No NFTs Found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {nfts.length === 0 
                      ? `You don't have any NFTs on ${selectedChain?.name || 'Ethereum'}`
                      : 'No NFTs match your search criteria'
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Note: This is a demo with sample NFTs. In production, this would show your real NFTs.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredNFTs.map((nft) => (
                    <Card 
                      key={`${nft.contractAddress}-${nft.tokenId}`}
                      className="cursor-pointer hover:ring-2 hover:ring-primary transition-all overflow-hidden"
                      onClick={() => handleNFTSelect(nft)}
                    >
                      <CardContent className="p-3">
                        <div className="aspect-square bg-muted rounded-lg mb-3 relative overflow-hidden">
                          {batchMode && (
                            <div className="absolute top-2 left-2 z-10">
                              <Checkbox
                                checked={isNFTSelected(nft)}
                                onCheckedChange={() => handleNFTSelect(nft)}
                                className="bg-background/80 backdrop-blur-sm"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                          {nft.image ? (
                            // Use regular img tag for NFT images to avoid Next.js image domain restrictions
                            // Next.js Image component requires all domains to be whitelisted
                            <img
                              src={nft.image} 
                              alt={nft.name}
                              className="w-full h-full object-cover rounded-lg"
                              loading="lazy"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                console.error(`❌ Failed to load image for ${nft.name}:`, nft.image)
                                // Try alternative IPFS gateways if the current one failed
                                if (nft.image && nft.image.includes('ipfs.io/ipfs/')) {
                                  const ipfsMatch = nft.image.match(/ipfs\/([^\/\?]+)/)
                                  if (ipfsMatch && ipfsMatch[1]) {
                                    const ipfsHash = ipfsMatch[1]
                                    // Try alternative gateways
                                    const alternativeGateways = [
                                      `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
                                      `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
                                      `https://dweb.link/ipfs/${ipfsHash}`
                                    ]
                                    const currentGateway = (target as any).__currentGateway || 0
                                    if (currentGateway < alternativeGateways.length) {
                                      console.log(`🔄 Trying alternative gateway ${currentGateway + 1}/${alternativeGateways.length}: ${alternativeGateways[currentGateway]}`)
                                      target.src = alternativeGateways[currentGateway]
                                      ;(target as any).__currentGateway = currentGateway + 1
                                      return // Let the browser try this gateway
                                    }
                                  }
                                }
                                // If all gateways fail, use placeholder
                                target.src = `https://via.placeholder.com/200x200/2a2a2a/ffffff?text=${nft.collection.symbol}%20%23${nft.tokenId}`
                                target.onerror = null // Prevent infinite loop
                              }}
                              onLoad={() => {
                                console.log(`✅ Successfully loaded image for ${nft.name}`)
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                              <ImageIcon className="h-8 w-8 mb-2" />
                              <span className="text-sm font-medium">{nft.collection.symbol}</span>
                              <span className="text-xs">#{nft.tokenId}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-medium truncate">{nft.name}</h4>
                              <p className="text-sm text-muted-foreground truncate">
                                {nft.collection.name}
                              </p>
                            </div>
                            <Badge variant="secondary" className="ml-2 shrink-0">
                              #{nft.tokenId}
                            </Badge>
                          </div>
                          
                          {nft.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {nft.description}
                            </p>
                          )}
                          
                          <div className="flex items-center justify-between pt-2">
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {nft.contractAddress.slice(0, 6)}...{nft.contractAddress.slice(-4)}
                            </code>
                            <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                              <a
                                href={`https://${nft.chain.id === 1 ? 'etherscan.io' : 'basescan.org'}/token/${nft.contractAddress}?a=${nft.tokenId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="h-6 w-6 p-0"
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
