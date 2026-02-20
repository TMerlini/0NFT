# Solana Integration Plan

## Overview

Solana is a non-EVM blockchain with a fundamentally different architecture than EVM chains. Integration requires special handling due to:

- **Different VM**: Solana uses its own runtime, not EVM
- **Account Model**: Uses Program Derived Addresses (PDAs) instead of contract addresses
- **Programs vs Contracts**: Uses Solana Programs (executable code) instead of smart contracts
- **Token Standard**: Uses SPL Token Program instead of ERC721/ERC20
- **Development Framework**: Uses Anchor framework instead of Solidity

## Key Differences from EVM

### Architecture

| EVM Chains | Solana |
|------------|--------|
| Smart Contracts | Programs |
| Contract Addresses | Program Derived Addresses (PDAs) |
| ERC721/ERC20 | SPL Token Program |
| Solidity | Rust + Anchor |
| ethers.js | @solana/web3.js + Anchor |
| Hardhat/Truffle | Anchor CLI |

### LayerZero Integration

| Aspect | EVM | Solana |
|--------|-----|--------|
| **OFT Standard** | ERC20-based | SPL Token-based |
| **ONFT Standard** | ERC721-based | ❌ Not available (NFTs use different approach) |
| **Deployment** | Contract deployment | Program deployment + PDA creation |
| **Message Options** | Bytes array | Buffer (different format) |
| **DVN Limit** | No specific limit | Max 5 DVNs (transaction size limit) |
| **CPI Depth** | N/A | Max 4 (affects composability) |

## Solana OFT vs ONFT

### ✅ Solana OFT (Fungible Tokens)
- **Supported**: Yes, via Solana OFT Program
- **Documentation**: https://docs.layerzero.network/v2/developers/solana/oft/overview
- **Example**: https://github.com/LayerZero-Labs/devtools/tree/main/examples/oft-solana
- **Standard**: SPL Token Program integration

### ❌ Solana ONFT (Non-Fungible Tokens)
- **Status**: Not currently supported
- **Reason**: Solana uses different NFT standards (Metaplex, etc.)
- **Alternative**: May need custom implementation or wait for LayerZero Solana NFT support

## Solana OFT Account Model

The Solana OFT uses 6 main accounts:

1. **OFT Program** (Executable)
   - The program itself that controls OFT interactions
   - Deployed via `solana program deploy`

2. **Mint Account** (Data)
   - SPL Token mint account
   - Stores token metadata (supply, decimals, authorities)

3. **Mint Authority Multisig** (Data)
   - 1-of-N multisig for mint authority
   - OFT Store is always required as signer

4. **Escrow** (Data)
   - Token account owned by OFT Store
   - Stores fees and locked tokens

5. **OFT Store** (PDA)
   - Program Derived Address storing OFT configuration
   - Owns the Escrow account
   - Signer for Mint Authority multisig

6. **PeerConfig** (PDA)
   - Stores configuration for each remote chain
   - Derived from OFT Store + remote EID

## Integration Requirements

### Prerequisites

1. **Solana Development Environment**
   - Rust toolchain
   - Solana CLI
   - Anchor framework
   - Docker (for verifiable builds)

2. **LayerZero Solana SDK**
   - `@layerzerolabs/lz-v2-utils-solana`
   - Solana-specific message execution options

3. **Web3 Libraries**
   - `@solana/web3.js` for Solana interactions
   - `@coral-xyz/anchor` for Anchor programs

### Deployment Process

1. **Scaffold Project**
   ```bash
   LZ_ENABLE_SOLANA_OFT_EXAMPLE=1 npx create-lz-oapp@latest
   ```

2. **Build Program**
   ```bash
   anchor build -v -e OFT_ID=<OFT_PROGRAM_ID>
   ```

3. **Deploy Program**
   ```bash
   solana program deploy --program-id target/deploy/oft-keypair.json \
     target/deploy/oft.so -u mainnet-beta \
     --with-compute-unit-price 300000
   ```

4. **Initialize OFT Store**
   - Create PDA accounts
   - Configure peer connections
   - Set up DVN and Executor options

## Known Limitations

### 1. Max DVNs
- **Limit**: 5 DVNs maximum for Solana pathways
- **Reason**: Solana transaction size limit (1232 bytes)

### 2. CPI Depth
- **Limit**: Maximum 4 Cross-Program Invocations
- **Impact**: Cannot CPI into OFT program from other programs
- **Workaround**: Group instructions in same transaction

### 3. Token Extensions
- **Transfer Hook**: Only works with OFT fees = 0
- **OFT Adapters**: Do not support Transfer Hook extension
- **Recommendation**: Test end-to-end if using extensions

### 4. Shared Decimals
- **Default**: 6 decimals (optimal for 18-decimal ERC20s)
- **Max Supply**: uint64.max() with 6 decimals = 18,446,744,073,709.551615
- **Override**: Can modify `OFT_DECIMALS` during deployment

## Implementation Strategy

### Phase 1: Research & Planning ✅
- [x] Document Solana-specific differences
- [x] Review LayerZero Solana documentation
- [x] Understand OFT account model
- [ ] Review example implementation

### Phase 2: Infrastructure Setup (Future)
- [ ] Add Solana wallet connection (Phantom, etc.)
- [ ] Integrate Solana Web3 provider
- [ ] Add Solana chain configuration
- [ ] Create Solana-specific UI components

### Phase 3: OFT Deployment (Future)
- [ ] Create Solana OFT deployment flow
- [ ] Integrate Anchor build process
- [ ] Handle PDA account creation
- [ ] Configure peer connections

### Phase 4: Bridging (Future)
- [ ] Implement Solana → EVM bridging
- [ ] Implement EVM → Solana bridging
- [ ] Handle message execution options (Buffer format)
- [ ] Test cross-chain transfers

## Resources

### Official Documentation
- **Solana OFT Overview**: https://docs.layerzero.network/v2/developers/solana/oft/overview
- **Solana OApp**: https://docs.layerzero.network/v2/developers/solana/oapp/overview
- **Example Repository**: https://github.com/LayerZero-Labs/devtools/tree/main/examples/oft-solana
- **LayerZero CLI**: `npx create-lz-oapp@latest` (with `LZ_ENABLE_SOLANA_OFT_EXAMPLE=1`)

### Solana Development
- **Anchor Framework**: https://www.anchor-lang.com/
- **Solana Web3.js**: https://solana-labs.github.io/solana-web3.js/
- **SPL Token Program**: https://spl.solana.com/token
- **Solana Cookbook**: https://solanacookbook.com/

### LayerZero Solana
- **Solana SDK**: `@layerzerolabs/lz-v2-utils-solana`
- **Message Options**: Different format (Buffer instead of bytes)
- **DVN Configuration**: Max 5 DVNs for Solana pathways

## Current Status

**Status**: ⏸️ Planned for Future

Solana integration is documented but not yet implemented. The current application focuses on EVM chains (Ethereum, Base, Arbitrum, etc.).

When implementing Solana support:
1. Review this document
2. Study the example repository
3. Set up Solana development environment
4. Follow the deployment process above
5. Test thoroughly due to architectural differences

## Notes

- **NFT Support**: Solana ONFT (NFTs) is not currently supported by LayerZero
- **Focus**: Current implementation is EVM-only
- **Compatibility**: Solana OFT can bridge with EVM OFTs, but not ONFTs
- **Complexity**: Solana integration is significantly more complex than EVM chains
