import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  bsc,
  sepolia,
  polygonAmoy,
  arbitrumSepolia,
  optimismSepolia,
  baseSepolia,
} from 'wagmi/chains'

// Use a public project ID for development - this is a safe public ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c4f79cc821944d9680842e34466bfbd'

export const config = getDefaultConfig({
  appName: '0NFT Deployer',
  projectId,
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    bsc,
    // Testnets
    sepolia,
    polygonAmoy,
    arbitrumSepolia,
    optimismSepolia,
    baseSepolia,
  ],
  ssr: true,
})
