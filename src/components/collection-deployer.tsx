'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { OfficialONFTDeployer } from './official-onft-deployer'
import { LayerZeroChain } from '@/lib/chains'
import { 
  Zap, 
  Plus,
  Trash2,
  CheckCircle
} from 'lucide-react'

interface CollectionConfig {
  id: string
  name: string
  symbol: string
  contractAddress: string
  description: string
}

interface CollectionDeployerProps {
  sourceChain?: LayerZeroChain
  targetChains?: LayerZeroChain[]
}

export function CollectionDeployer({ sourceChain, targetChains = [] }: CollectionDeployerProps) {
  const [collections, setCollections] = useState<CollectionConfig[]>([
    {
      id: 'pixel-goblins',
      name: 'Pixel Goblins',
      symbol: 'PGOB',
      contractAddress: '0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef',
      description: 'Original Pixel Goblin NFT collection'
    }
  ])
  
  const [selectedCollection, setSelectedCollection] = useState<CollectionConfig | null>(collections[0])
  const [showDeployer, setShowDeployer] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  
  // New collection form state
  const [newCollection, setNewCollection] = useState({
    name: '',
    symbol: '',
    contractAddress: '',
    description: ''
  })

  const addCollection = () => {
    if (!newCollection.name || !newCollection.symbol || !newCollection.contractAddress) {
      return
    }

    const collection: CollectionConfig = {
      id: newCollection.name.toLowerCase().replace(/\s+/g, '-'),
      ...newCollection
    }

    setCollections(prev => [...prev, collection])
    setNewCollection({ name: '', symbol: '', contractAddress: '', description: '' })
    setShowAddForm(false)
  }

  const removeCollection = (id: string) => {
    setCollections(prev => prev.filter(c => c.id !== id))
    if (selectedCollection?.id === id) {
      setSelectedCollection(collections[0] || null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Collection Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select NFT Collection</CardTitle>
              <CardDescription>
                Choose an existing collection or add a new one to deploy ONFT Adapter
              </CardDescription>
            </div>
            <Button
              onClick={() => setShowAddForm(true)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Collection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collections.map((collection) => (
              <Card
                key={collection.id}
                className={`cursor-pointer transition-colors ${
                  selectedCollection?.id === collection.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'hover:border-gray-600'
                }`}
                onClick={() => setSelectedCollection(collection)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{collection.name}</h3>
                      <Badge variant="outline" className="text-xs">
                        {collection.symbol}
                      </Badge>
                    </div>
                    {selectedCollection?.id === collection.id && (
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {collection.description}
                  </p>
                  <p className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-1 rounded">
                    {collection.contractAddress}
                  </p>
                  {collections.length > 1 && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeCollection(collection.id)
                      }}
                      variant="ghost"
                      size="sm"
                      className="mt-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Collection Form */}
      {showAddForm && (
        <Card className="border-blue-500/20 bg-blue-500/10">
          <CardHeader>
            <CardTitle>Add New Collection</CardTitle>
            <CardDescription>
              Add details for your NFT collection to deploy an ONFT Adapter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Collection Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Bored Apes"
                  value={newCollection.name}
                  onChange={(e) => setNewCollection(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="e.g., BAYC"
                  value={newCollection.symbol}
                  onChange={(e) => setNewCollection(prev => ({ ...prev, symbol: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract">Contract Address</Label>
              <Input
                id="contract"
                placeholder="0x..."
                value={newCollection.contractAddress}
                onChange={(e) => setNewCollection(prev => ({ ...prev, contractAddress: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of the collection"
                value={newCollection.description}
                onChange={(e) => setNewCollection(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={addCollection}>
                Add Collection
              </Button>
              <Button 
                onClick={() => setShowAddForm(false)} 
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deploy Button */}
      {selectedCollection && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ready to Deploy</h3>
                <p className="text-sm text-muted-foreground">
                  Deploy ONFT Adapter for <strong>{selectedCollection.name}</strong>
                </p>
              </div>
              <Button
                onClick={() => setShowDeployer(true)}
                disabled={!sourceChain || targetChains.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Deploy Official ONFT Adapter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Official ONFT Deployer */}
      {selectedCollection && (
        <OfficialONFTDeployer
          isOpen={showDeployer}
          onClose={() => setShowDeployer(false)}
          deploymentType="adapter"
          sourceChain={sourceChain}
          targetChains={targetChains}
          contractAddress={selectedCollection.contractAddress}
          contractInfo={{
            name: selectedCollection.name,
            symbol: selectedCollection.symbol,
            description: selectedCollection.description
          }}
          collectionName={selectedCollection.name}
          collectionSymbol={selectedCollection.symbol}
        />
      )}
    </div>
  )
}
