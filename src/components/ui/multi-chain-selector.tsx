'use client'

import * as React from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { LayerZeroChain, getSupportedChains } from '@/lib/chains'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChainLogo } from './chain-logo'

interface MultiChainSelectorProps {
  selectedChains: LayerZeroChain[]
  onChainsChange: (chains: LayerZeroChain[]) => void
  includeTestnets?: boolean
  maxSelections?: number
  className?: string
}

export function MultiChainSelector({
  selectedChains,
  onChainsChange,
  includeTestnets = false,
  maxSelections,
  className,
}: MultiChainSelectorProps) {
  const availableChains = getSupportedChains(includeTestnets)
  const [showAll, setShowAll] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  
  // Filter chains based on search query
  const filteredChains = React.useMemo(() => {
    if (!searchQuery) return availableChains
    return availableChains.filter(chain => 
      chain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chain.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [availableChains, searchQuery])
  
  // Pagination logic
  const INITIAL_DISPLAY_COUNT = 12
  const displayedChains = showAll ? filteredChains : filteredChains.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMoreChains = filteredChains.length > INITIAL_DISPLAY_COUNT

  const toggleChain = (chain: LayerZeroChain) => {
    const isSelected = selectedChains.some(c => c.id === chain.id)
    
    if (isSelected) {
      onChainsChange(selectedChains.filter(c => c.id !== chain.id))
    } else {
      if (maxSelections && selectedChains.length >= maxSelections) {
        return // Don't add if max reached
      }
      onChainsChange([...selectedChains, chain])
    }
  }

  const isChainSelected = (chain: LayerZeroChain) => {
    return selectedChains.some(c => c.id === chain.id)
  }

  const canSelectMore = !maxSelections || selectedChains.length < maxSelections

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with chain count and search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            {filteredChains.length} chains available
            {includeTestnets ? ' (including testnets)' : ' (mainnets only)'}
          </p>
        </div>
        
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search chains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      {/* Selected chains summary */}
      {selectedChains.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Selected Chains ({selectedChains.length}
            {maxSelections && `/${maxSelections}`})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedChains.map((chain) => (
              <div
                key={chain.id}
                className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5"
              >
                <ChainLogo chainName={chain.name} chainId={chain.id} size="sm" className="w-3 h-3" />
                <span className="text-sm font-medium">{chain.name}</span>
                {chain.isTestnet && (
                  <span className="text-xs bg-muted px-1 py-0.5 rounded">
                    Testnet
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive/20"
                  onClick={() => toggleChain(chain)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available chains grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {displayedChains.map((chain) => {
          const isSelected = isChainSelected(chain)
          const canSelect = canSelectMore || isSelected
          
          return (
            <Card
              key={chain.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:scale-105',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-md'
                  : canSelect
                  ? 'hover:bg-accent border-border'
                  : 'opacity-50 cursor-not-allowed',
                !canSelect && 'hover:scale-100'
              )}
              onClick={() => canSelect && toggleChain(chain)}
            >
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-between mb-2">
                  <ChainLogo chainName={chain.name} chainId={chain.id} size="md" />
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-tight">
                    {chain.name}
                  </p>
                  
                  {chain.isTestnet && (
                    <span className="inline-block text-xs bg-muted px-1.5 py-0.5 rounded">
                      Testnet
                    </span>
                  )}
                  
                  <p className="text-xs text-muted-foreground leading-tight">
                    ID: {chain.layerZeroEndpointId}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Show more/less button */}
      {hasMoreChains && !searchQuery && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="flex items-center gap-2"
          >
            {showAll ? (
              <>
                Show Less
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show More ({filteredChains.length - INITIAL_DISPLAY_COUNT} more)
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}

      {maxSelections && selectedChains.length >= maxSelections && (
        <p className="text-sm text-muted-foreground">
          Maximum of {maxSelections} chains can be selected.
        </p>
      )}
      
      {searchQuery && filteredChains.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            No chains found matching &quot;{searchQuery}&quot;
          </p>
        </div>
      )}
    </div>
  )
}
