/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 13+
  
  // Webpack configuration to handle Web3 and MetaMask SDK issues
  webpack: (config, { isServer }) => {
    // Ignore warnings and errors during build
    config.ignoreWarnings = [
      /Failed to parse source map/,
      /Critical dependency: the request of a dependency is an expression/,
      /Can't resolve '@react-native-async-storage\/async-storage'/,
      /Can't resolve 'react-native'/,
      /Can't resolve 'pino-pretty'/, // Optional dependency for pino logger
    ]

    // Handle node modules that don't work well with webpack
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        assert: false,
        http: false,
        https: false,
        os: false,
        url: false,
        zlib: false,
        // Fix for MetaMask SDK React Native dependencies
        '@react-native-async-storage/async-storage': false,
        'react-native': false,
        'react-native-randombytes': false,
      }
    }

    // Handle MetaMask SDK and other Web3 packages
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
    }

    // Externalize problematic packages for browser
    if (!isServer) {
      config.externals = config.externals || []
      config.externals.push({
        '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
        'react-native': 'commonjs react-native',
      })
    }

    return config
  },

  // Suppress hydration warnings for Web3 components
  reactStrictMode: false,
  
  // Handle external packages that need transpilation
  transpilePackages: [
    '@walletconnect/core', 
    '@walletconnect/ethereum-provider',
    '@metamask/sdk',
    '@wagmi/connectors',
    'wagmi',
    '@rainbow-me/rainbowkit'
  ],

  // Experimental features for better Web3 support
  experimental: {
    esmExternals: 'loose',
  },

  // Image configuration for NFT images from external sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ipfs.io',
        port: '',
        pathname: '/ipfs/**',
      },
      {
        protocol: 'https',
        hostname: 'nft-cdn.alchemy.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.coingecko.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'opensea.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.seadn.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i2c.seadn.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.seadn.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.pinata.cloud',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.arweave.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pixel-goblin-image-api-production.up.railway.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.railway.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ipfs.dweb.link',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ipfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gateway.ipfs.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.mypinata.cloud',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'metadata.ens.domains',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.ens.domains',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pengu-distributions.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.pengu-distributions.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'metadata-c1b.pages.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.pages.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.mypinata.cloud',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.netlify.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
