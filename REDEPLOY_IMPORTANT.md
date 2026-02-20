# ⚠️ IMPORTANT: Contracts Need to be Redeployed

## Current Status

You just deployed contracts, but they were compiled with the **simplified LayerZero implementation** because Hardhat compilation failed. These contracts **WILL NOT WORK for bridging**.

### Deployed Contracts (Simplified Version - Non-Functional)

- **ONFT Adapter (Ethereum)**: `0xb8848F269AEA7b95871c1e78A8Ebc399fAC380Cf`
- **ONFT Contract (Base)**: `0xceeeA671e5681966Cd8432f80C10f76b48D782Bb`

These contracts are missing:
- ❌ `innerToken()` function (critical for ONFT Adapters)
- ❌ Proper `quoteSend()` implementation
- ❌ Working `send()` function for bridging

## Next Steps

1. **Hardhat compilation is being fixed** - we're installing ts-node which is required for Hardhat to work with TypeScript config files

2. **After Hardhat is fixed**, you need to **redeploy both contracts**:
   - The ONFT Adapter on Ethereum
   - The ONFT Contract on Base

3. **The new contracts will have full LayerZero functionality** and will work for bridging

## Why This Happened

The compilation system tried to use Hardhat first, but it failed because:
- Hardhat 3.x required ESM (incompatible with Next.js)
- We downgraded to Hardhat 2.x (now compatible)
- But Hardhat needs `ts-node` for TypeScript config files

We're fixing this now. Once fixed, future deployments will automatically use the real LayerZero implementation.

