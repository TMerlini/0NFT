# Troubleshooting Guide - 0NFT Deployer

## Common Issues and Solutions

### 🔧 MetaMask SDK / React Native Async Storage Error

**Error**: `Module not found: Can't resolve '@react-native-async-storage/async-storage'`

**Solution**: ✅ **FIXED** - We've implemented comprehensive polyfills and webpack configuration:

1. **Polyfills Added** (`src/lib/polyfills.ts`):
   - Mock AsyncStorage using localStorage
   - React Native module mocks
   - Global polyfill registration

2. **Webpack Configuration** (`next.config.js`):
   - Fallback configurations for React Native modules
   - External module handling
   - Transpilation of Web3 packages

3. **Error Suppression** (`src/app/error-suppression.tsx`):
   - Suppresses non-critical MetaMask SDK warnings
   - Handles async-storage related errors gracefully

### 🌐 WalletConnect Issues

**Error**: `Connection interrupted while trying to subscribe`

**Solution**: ✅ **HANDLED** - Comprehensive error suppression and fallbacks:

- Error boundaries catch and handle WalletConnect errors
- Graceful fallbacks for connection issues
- User-friendly error messages

### 🔄 Build Cache Issues

**Error**: `ChunkLoadError: Loading chunk failed`

**Solution**: Use the clean script:
```bash
npm run clean
npm run dev
```

Or the fresh install script:
```bash
npm run fresh
```

### 📱 Wallet Connection Problems

**Issue**: Wallet not connecting or showing errors

**Solutions**:
1. **Refresh the page** - Often resolves temporary connection issues
2. **Clear browser cache** - Remove cached wallet connection data
3. **Try different wallet** - Test with MetaMask, WalletConnect, etc.
4. **Check network** - Ensure you're on the correct network

### ⛓️ Chain Selection Issues

**Issue**: Chains not loading or showing incorrect information

**Solutions**:
1. **Check RPC endpoints** - Ensure RPC URLs are accessible
2. **Verify chain configuration** - Check `src/lib/chains.ts`
3. **Clear localStorage** - Remove cached chain data

### 🎨 Logo Loading Issues

**Issue**: Chain logos not displaying

**Solutions**:
1. **Check CoinGecko URLs** - Verify logo URLs in `src/components/ui/chain-logo.tsx`
2. **Network connectivity** - Ensure external image loading is allowed
3. **Fallback system** - Colored circles will show if logos fail to load

## Development Tips

### 🛠️ Debugging Web3 Issues

1. **Open Browser DevTools**
   - Check Console for suppressed errors
   - Monitor Network tab for failed requests
   - Inspect Application tab for localStorage issues

2. **Enable Verbose Logging**
   ```typescript
   // Temporarily disable error suppression in error-suppression.tsx
   // Comment out the suppression logic to see all errors
   ```

3. **Test with Different Wallets**
   - MetaMask (browser extension)
   - WalletConnect (mobile wallets)
   - Coinbase Wallet
   - Rainbow Wallet

### 📦 Package Management

**If you encounter dependency conflicts**:

1. **Clear everything**:
   ```bash
   rm -rf node_modules package-lock.json .next
   npm install
   ```

2. **Use legacy peer deps** (if needed):
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Force resolution** (last resort):
   ```bash
   npm install --force
   ```

### 🔍 Common Error Patterns

#### Module Resolution Errors
- **Cause**: Webpack can't resolve React Native modules
- **Fix**: Already handled in `next.config.js` with fallbacks

#### Hydration Errors
- **Cause**: Server/client mismatch in Web3 components
- **Fix**: Using `mounted` state in Web3 components

#### LocalStorage Errors
- **Cause**: Server-side rendering trying to access localStorage
- **Fix**: Client-side only components and polyfills

## Environment Setup

### Required Environment Variables

Create `.env.local` with:
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Optional Configuration

```env
# Custom RPC endpoints
NEXT_PUBLIC_ETHEREUM_RPC_URL=your_ethereum_rpc
NEXT_PUBLIC_POLYGON_RPC_URL=your_polygon_rpc

# Development flags
NEXT_PUBLIC_ENABLE_TESTNETS=true
NEXT_PUBLIC_ENABLE_MOCK_DEPLOYMENTS=true
```

## Performance Optimization

### Bundle Size Issues

If the app loads slowly:

1. **Check bundle analyzer**:
   ```bash
   npm install --save-dev @next/bundle-analyzer
   ```

2. **Optimize imports**:
   ```typescript
   // Instead of importing entire libraries
   import { specific } from 'library/specific'
   ```

3. **Lazy load components**:
   ```typescript
   const HeavyComponent = dynamic(() => import('./HeavyComponent'))
   ```

### Memory Usage

For high memory usage:

1. **Clear browser cache regularly**
2. **Restart development server**:
   ```bash
   npm run clean && npm run dev
   ```

## Production Deployment

### Vercel Deployment

1. **Environment Variables**: Set in Vercel dashboard
2. **Build Settings**: Use default Next.js settings
3. **Function Regions**: Choose closest to users

### Self-Hosted Deployment

1. **Build the app**:
   ```bash
   npm run build
   npm start
   ```

2. **Environment**: Ensure all environment variables are set
3. **HTTPS**: Required for wallet connections

## Getting Help

### 📚 Resources
- [LayerZero V2 Documentation](https://docs.layerzero.network/v2)
- [RainbowKit Documentation](https://rainbowkit.com/)
- [Wagmi Documentation](https://wagmi.sh/)
- [Next.js Documentation](https://nextjs.org/docs)

### 🐛 Reporting Issues
1. **Check this troubleshooting guide first**
2. **Search existing GitHub issues**
3. **Provide detailed error messages and steps to reproduce**
4. **Include browser and wallet information**

### 💬 Community Support
- LayerZero Discord
- Ethereum Developer communities
- Next.js discussions

---

**Most issues are resolved by refreshing the page or clearing the cache. The application includes comprehensive error handling for Web3-related issues.**
