'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Zap, ArrowLeftRight, FolderOpen, Settings, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Deploy',
    href: '/',
    icon: Zap,
    description: 'Deploy ONFT contracts'
  },
  {
    name: 'Bridge',
    href: '/bridge',
    icon: ArrowLeftRight,
    description: 'Bridge NFTs cross-chain'
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: FolderOpen,
    description: 'View deployments & NFTs'
  },
  {
    name: 'Query',
    href: '/query',
    icon: Search,
    description: 'Cross-chain queries (lzRead)'
  },
  {
    name: 'OApp Config',
    href: '/oapp-config',
    icon: Settings,
    description: 'Configure OApp settings'
  }
]

export function Header() {
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-white to-gray-300">
                <Zap className="h-6 w-6 text-black" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">0NFT Platform</h1>
                <p className="text-sm text-muted-foreground">Cross-Chain NFT Infrastructure</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-6">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                    title={item.description}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Wallet Connect Button */}
          <div className="flex items-center gap-4">
            {mounted ? (
              <ConnectButton 
                chainStatus="icon"
                accountStatus={{
                  smallScreen: 'avatar',
                  largeScreen: 'full',
                }}
                showBalance={{
                  smallScreen: false,
                  largeScreen: true,
                }}
              />
            ) : (
              <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
