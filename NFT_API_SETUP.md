# 🎨 Real NFT Detection Setup Guide

Your NFT selector is ready to display your real NFTs! Currently showing demo NFTs because no API keys are configured.

## 🚀 Quick Setup (5 minutes)

### Option 1: Alchemy API (Recommended)

1. **Get Free API Key:**
   - Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
   - Sign up/login
   - Create new app
   - Copy your API key

2. **Add to Environment:**
   ```bash
   # Create .env.local file in your project root
   echo "NEXT_PUBLIC_ALCHEMY_API_KEY=your_actual_api_key_here" >> .env.local
   ```

3. **Restart Server:**
   ```bash
   npm run dev
   ```

### Option 2: OpenSea API (Alternative)

1. **Get API Key:**
   - Go to [OpenSea API Keys](https://docs.opensea.io/reference/api-keys)
   - Request API access
   - Get your API key

2. **Add to Environment:**
   ```bash
   echo "NEXT_PUBLIC_OPENSEA_API_KEY=your_opensea_api_key" >> .env.local
   ```

## 🎯 What You'll Get

### ✅ With API Keys:
- **Your Real NFTs**: Browse your actual NFT collection
- **Live Metadata**: Real names, descriptions, images
- **Multi-Chain Support**: Ethereum, Base, and more
- **Auto-Fill**: Click any NFT to populate bridge form

### 📝 Without API Keys (Current):
- **Demo NFTs**: Sample "Pixel Goblins" collection
- **Testing Mode**: Perfect for development
- **Full Functionality**: All features work with demo data

## 🔧 Supported Chains

- **Ethereum Mainnet** ✅
- **Base Mainnet** ✅  
- **Polygon** (Alchemy only)
- **Arbitrum** (Alchemy only)
- **More chains** (via Alchemy)

## 🛠️ Technical Details

The NFT selector tries multiple methods:

1. **Alchemy API** (fastest, most reliable)
2. **OpenSea API** (fallback)
3. **Demo NFTs** (if no APIs available)

## 🎨 Example .env.local File

```bash
# NFT API Keys
NEXT_PUBLIC_ALCHEMY_API_KEY=alch_1234567890abcdef
NEXT_PUBLIC_OPENSEA_API_KEY=opensea_key_here

# Existing WalletConnect (already configured)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=c4f79cc821944d9680842e34466bfbd
```

## 🚨 Important Notes

- **Free Tiers Available**: Both Alchemy and OpenSea offer free API access
- **No Credit Card Required**: Free tiers don't require payment info
- **Instant Results**: Your NFTs will appear immediately after setup
- **Secure**: API keys are only used client-side for NFT metadata

## 🎉 Ready to See Your NFTs!

Once you add an API key and restart the server, connect your wallet and select a chain - you'll see your real NFT collection! 🖼️✨
