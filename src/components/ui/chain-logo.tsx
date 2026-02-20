'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ChainLogoProps {
  chainName: string
  chainId?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

// Map of chain names to their CoinGecko URLs (based on the pattern you provided)
const COINGECKO_LOGO_MAP: Record<string, string> = {
  'Ethereum': 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png?1696501628',
  'Polygon': 'https://assets.coingecko.com/coins/images/4713/standard/matic-token-icon.png?1624446912',
  'Arbitrum One': 'https://assets.coingecko.com/coins/images/16547/standard/photo_2023-03-29_21.47.00.jpeg?1696516109',
  'Arbitrum': 'https://assets.coingecko.com/coins/images/16547/standard/photo_2023-03-29_21.47.00.jpeg?1696516109',
  'Optimism': 'https://assets.coingecko.com/coins/images/25244/standard/Optimism.png?1696524385',
  'OP Mainnet': 'https://assets.coingecko.com/coins/images/25244/standard/Optimism.png?1696524385',
  'Base': 'https://assets.coingecko.com/asset_platforms/images/131/standard/base.png?1759905869',
  'Avalanche': 'https://assets.coingecko.com/coins/images/12559/standard/Avalanche_Circle_RedWhite_Trans.png?1696512369',
  'Avalanche C-Chain': 'https://assets.coingecko.com/coins/images/12559/standard/Avalanche_Circle_RedWhite_Trans.png?1696512369',
  'BNB Smart Chain': 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png?1696501970',
  'BSC': 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png?1696501970',
  'Fantom': 'https://assets.coingecko.com/coins/images/4001/standard/Fantom_round.png?1696504642',
  'Aurora': 'https://assets.coingecko.com/coins/images/20582/standard/aurora.jpeg?1696519951',
  'Celo': 'https://assets.coingecko.com/coins/images/11090/standard/InjXBNx9_400x400.jpg?1696511031',
  'Cronos': 'https://assets.coingecko.com/coins/images/7310/standard/cro_token_logo.png?1696507599',
  'Dogechain': 'https://assets.coingecko.com/coins/images/26828/standard/dogechain.jpeg?1696525887',
  'Harmony': 'https://assets.coingecko.com/coins/images/4344/standard/Y88JAze.png?1696505039',
  'Moonbeam': 'https://assets.coingecko.com/coins/images/22459/standard/glmr.png?1696521687',
  'Moonriver': 'https://assets.coingecko.com/coins/images/17984/standard/9285.png?1696517702',
  'Metis': 'https://assets.coingecko.com/coins/images/15595/standard/Metis_Black_Bg.png?1702968192',
  'Polygon zkEVM': 'https://assets.coingecko.com/coins/images/4713/standard/matic-token-icon.png?1624446912',
  'zkSync Era': 'https://assets.coingecko.com/asset_platforms/images/121/standard/zksync.jpeg?1706606814',
  'Linea': 'https://assets.coingecko.com/asset_platforms/images/135/standard/linea.jpeg?1706606705',
  'Mantle': 'https://assets.coingecko.com/coins/images/30980/standard/token-logo.png?1696529819',
  'Scroll': 'https://assets.coingecko.com/asset_platforms/images/153/standard/scroll.jpeg?1706606782',
  'Arbitrum Nova': 'https://assets.coingecko.com/coins/images/16547/standard/photo_2023-03-29_21.47.00.jpeg?1696516109',
  // Testnets use same logos as mainnets
  'Sepolia': 'https://assets.coingecko.com/coins/images/279/standard/ethereum.png?1696501628',
  'Polygon Amoy': 'https://assets.coingecko.com/coins/images/4713/standard/matic-token-icon.png?1624446912',
  'Arbitrum Sepolia': 'https://assets.coingecko.com/coins/images/16547/standard/photo_2023-03-29_21.47.00.jpeg?1696516109',
  'Optimism Sepolia': 'https://assets.coingecko.com/coins/images/25244/standard/Optimism.png?1696524385',
  'Base Sepolia': 'https://assets.coingecko.com/asset_platforms/images/131/standard/base.png?1759905869',
  'BSC Testnet': 'https://assets.coingecko.com/coins/images/825/standard/bnb-icon2_2x.png?1696501970',
  'Avalanche Fuji': 'https://assets.coingecko.com/coins/images/12559/standard/Avalanche_Circle_RedWhite_Trans.png?1696512369',
  'Fantom Testnet': 'https://assets.coingecko.com/coins/images/4001/standard/Fantom_round.png?1696504642',
  'Celo Alfajores': 'https://assets.coingecko.com/coins/images/11090/standard/InjXBNx9_400x400.jpg?1696511031',
  'Cronos Testnet': 'https://assets.coingecko.com/coins/images/7310/standard/cro_token_logo.png?1696507599',
  'Moonbase Alpha': 'https://assets.coingecko.com/coins/images/22459/standard/glmr.png?1696521687',
  'zkSync Era Testnet': 'https://assets.coingecko.com/asset_platforms/images/121/standard/zksync.jpeg?1706606814',
  'Linea Goerli': 'https://assets.coingecko.com/asset_platforms/images/135/standard/linea.jpeg?1706606705',
  'Mantle Testnet': 'https://assets.coingecko.com/coins/images/30980/standard/token-logo.png?1696529819',
  'Scroll Sepolia': 'https://assets.coingecko.com/asset_platforms/images/153/standard/scroll.jpeg?1706606782',
}

// Fallback colors for chains without icons
const CHAIN_COLORS: Record<string, string> = {
  'Ethereum': '#627EEA',
  'Polygon': '#8247E5',
  'Arbitrum One': '#28A0F0',
  'Arbitrum': '#28A0F0',
  'Optimism': '#FF0420',
  'OP Mainnet': '#FF0420',
  'Base': '#0052FF',
  'Avalanche': '#E84142',
  'BNB Smart Chain': '#F3BA2F',
  'Fantom': '#1969FF',
  'Aurora': '#70D44B',
  'Celo': '#35D07F',
  'Cronos': '#002D74',
  'Dogechain': '#BA9F33',
  'Harmony': '#00AEE9',
  'Moonbeam': '#53CBC9',
  'Moonriver': '#F2B705',
  'Metis': '#00D4AA',
  'zkSync Era': '#8C8DFC',
  'Linea': '#61DFFF',
  'Mantle': '#000000',
  'Scroll': '#FFEEDA',
  'Arbitrum Nova': '#28A0F0',
}

export function ChainLogo({ chainName, chainId, className, size = 'md' }: ChainLogoProps) {
  const [imageError, setImageError] = React.useState(false)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  
  const coingeckoUrl = COINGECKO_LOGO_MAP[chainName]
  const fallbackColor = CHAIN_COLORS[chainName] || '#6B7280'
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }
  
  // Primary source: Direct CoinGecko URLs
  const iconSources = React.useMemo(() => {
    const sources = []
    
    if (coingeckoUrl) {
      // Use the direct CoinGecko URL
      sources.push(coingeckoUrl)
      
      // Also try without the timestamp parameter as fallback
      const urlWithoutTimestamp = coingeckoUrl.split('?')[0]
      if (urlWithoutTimestamp !== coingeckoUrl) {
        sources.push(urlWithoutTimestamp)
      }
    }
    
    return sources
  }, [chainName, coingeckoUrl])
  
  const [currentSourceIndex, setCurrentSourceIndex] = React.useState(0)
  
  const handleImageError = () => {
    if (currentSourceIndex < iconSources.length - 1) {
      setCurrentSourceIndex(currentSourceIndex + 1)
      setImageError(false)
    } else {
      setImageError(true)
    }
  }
  
  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }
  
  // Reset when chainName changes
  React.useEffect(() => {
    setImageError(false)
    setImageLoaded(false)
    setCurrentSourceIndex(0)
  }, [chainName])
  
  if (imageError || !imageLoaded) {
    // Show fallback colored circle with first letter
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center text-white font-semibold text-xs',
          sizeClasses[size],
          className
        )}
        style={{ backgroundColor: fallbackColor }}
      >
        {chainName.charAt(0).toUpperCase()}
        {/* Hidden image to keep trying to load */}
        {!imageError && iconSources.length > 0 && (
          <img
            src={iconSources[currentSourceIndex]}
            alt={chainName}
            className="hidden"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>
    )
  }
  
  return (
    <img
      src={iconSources[currentSourceIndex]}
      alt={chainName}
      className={cn(
        'rounded-full object-cover bg-white', // Added bg-white for better logo visibility
        sizeClasses[size],
        className
      )}
      onError={handleImageError}
      onLoad={handleImageLoad}
    />
  )
}
