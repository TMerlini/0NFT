'use client'

import { useState, useEffect } from 'react'
import { CrossChainQuery } from '@/components/cross-chain-query'

export default function QueryPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Cross-Chain Queries</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Cross-Chain Queries</h1>
          <p className="text-muted-foreground">
            Query contract state from other chains using LayerZero Read (lzRead).
            This enables you to pull data from remote blockchains without deploying contracts on every chain.
          </p>
        </div>
        
        <CrossChainQuery />
      </div>
    </div>
  )
}
