'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { LayerZeroChain, getSupportedChains } from '@/lib/chains'
import { ChainLogo } from './chain-logo'

interface ChainSelectorProps {
  value?: LayerZeroChain
  onValueChange?: (chain: LayerZeroChain) => void
  includeTestnets?: boolean
  placeholder?: string
  className?: string
  excludeChains?: LayerZeroChain[]
}

export function ChainSelector({
  value,
  onValueChange,
  includeTestnets = false,
  placeholder = 'Select chain...',
  className,
  excludeChains = [],
}: ChainSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const allChains = getSupportedChains(includeTestnets)
  const chains = allChains.filter(chain => 
    !excludeChains.some(excludeChain => excludeChain.id === chain.id)
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          {value ? (
            <div className="flex items-center gap-2">
              <ChainLogo chainName={value.name} chainId={value.id} size="sm" />
              <span>{value.name}</span>
              {value.isTestnet && (
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  Testnet
                </span>
              )}
            </div>
          ) : (
            placeholder
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search chains..." />
          <CommandEmpty>No chain found.</CommandEmpty>
          <CommandGroup>
            {chains.map((chain) => (
              <CommandItem
                key={chain.id}
                value={chain.name}
                onSelect={() => {
                  onValueChange?.(chain)
                  setOpen(false)
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  <ChainLogo chainName={chain.name} chainId={chain.id} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{chain.name}</span>
                      {chain.isTestnet && (
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          Testnet
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {chain.description}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {chain.layerZeroEndpointId}
                  </div>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4',
                      value?.id === chain.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
