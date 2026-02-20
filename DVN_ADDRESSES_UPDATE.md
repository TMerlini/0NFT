# DVN Addresses Update Guide

## Current Status

The DVN configuration feature is fully implemented, but the DVN addresses need to be updated with official LayerZero V2 addresses.

## What's Already Implemented

✅ **zkLightClient DVN** - Address added for Ethereum and Base:
- `0x8ddF05F9A5c488b4973897E278B58895bF87Cb24`

⚠️ **Other DVNs** - Need to be updated:
- LayerZero Labs DVN
- Google Cloud DVN
- Polyhedra Network DVN
- Blockdaemon DVN

⚠️ **Message Libraries** - Need to be updated:
- ULN302 Send Library addresses
- ULN302 Receive Library addresses

⚠️ **Executors** - Need to be updated:
- LayerZero Labs Executor addresses

## How to Find Official Addresses

### Method 1: LayerZero Scan (Recommended)
1. Visit https://layerzeroscan.com/
2. Navigate to "Default Configs" section
3. Select your chain (Ethereum, Base, etc.)
4. View the default DVN addresses and library addresses

### Method 2: Query LayerZero Endpoint
The app now includes a `getDefaultConfig()` function that can fetch default addresses directly from the LayerZero Endpoint contract. This is automatically called when you open the DVN configuration dialog.

### Method 3: LayerZero Documentation
- Check: https://docs.layerzero.network/v2/developers/evm/configuration/dvn-executor-config
- Check LayerZero GitHub repositories for deployed contract addresses

### Method 4: LayerZero Developer Resources
- Visit: https://docs.layerzero.network/v2/developers/evm/overview
- Check the "Developer Resources" section for contract addresses

## Files to Update

### 1. `src/lib/dvn-configurator.ts`

Update these constants:

```typescript
export const DEFAULT_DVN_ADDRESSES: { [chainId: number]: { [name: string]: string } } = {
  1: { // Ethereum Mainnet
    'zkLightClient': '0x8ddF05F9A5c488b4973897E278B58895bF87Cb24', // ✅ Already added
    'LayerZero Labs': '0x...', // ⚠️ UPDATE THIS
    'Google Cloud': '0x...', // ⚠️ UPDATE THIS
    'Polyhedra': '0x...', // ⚠️ UPDATE THIS
  },
  8453: { // Base Mainnet
    'zkLightClient': '0x8ddF05F9A5c488b4973897E278B58895bF87Cb24', // ✅ Already added
    'LayerZero Labs': '0x...', // ⚠️ UPDATE THIS
    'Google Cloud': '0x...', // ⚠️ UPDATE THIS
    'Polyhedra': '0x...', // ⚠️ UPDATE THIS
  },
}

export const DEFAULT_EXECUTOR_ADDRESSES: { [chainId: number]: string } = {
  1: '0x...', // ⚠️ UPDATE THIS
  8453: '0x...', // ⚠️ UPDATE THIS
}

export const DEFAULT_MESSAGE_LIBRARIES: { [chainId: number]: { send: string; receive: string } } = {
  1: {
    send: '0x...', // ⚠️ UPDATE THIS
    receive: '0x...', // ⚠️ UPDATE THIS
  },
  8453: {
    send: '0x...', // ⚠️ UPDATE THIS
    receive: '0x...', // ⚠️ UPDATE THIS
  },
}
```

## Quick Start: Using Default Configs

The app can automatically fetch default DVN addresses from the LayerZero Endpoint:

1. Open the "Configure DVN" dialog in Portfolio
2. The app will automatically fetch default DVN addresses
3. You'll see them displayed in a green info box
4. You can use these addresses directly or update the config file

## Verification

After updating addresses:

1. Test the DVN configuration dialog
2. Verify addresses are displayed correctly
3. Try configuring DVNs for a test deployment
4. Check that transactions succeed on LayerZero Scan

## Resources

- **LayerZero Scan**: https://layerzeroscan.com/
- **LayerZero V2 Docs**: https://docs.layerzero.network/v2
- **DVN Configuration Guide**: https://docs.layerzero.network/v2/developers/evm/configuration/dvn-executor-config
- **Security Stack Docs**: https://docs.layerzero.network/v2/concepts/modular-security/security-stack-dvns

## Notes

- DVN addresses may vary by chain
- Always verify addresses on LayerZero Scan before using in production
- The app will show a warning if addresses are not configured
- Default configs can be fetched automatically from the endpoint
