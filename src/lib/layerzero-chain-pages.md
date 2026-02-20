# LayerZero V2 Chain-Specific Documentation

This file tracks individual chain pages from the LayerZero V2 documentation that contain detailed information for each chain.

## Documentation Pattern

Each chain has a dedicated page at:
```
https://docs.layerzero.network/v2/deployments/chains/{chain-name}
```

These pages contain:
- **Protocol Contracts**: EndpointV2, SendUln302, ReceiveUln302, ReadLib1002, Executors
- **Push-based DVNs**: DVNs that actively push verification data
- **Pull-based DVNs**: DVNs that are queried for verification
- **Omnichain Fungible Tokens (OFTs)**: List of deployed OFT contracts
- **Chain-specific notes**: Special requirements, warnings, or configurations

## Currently Documented Chains

### Mainnets

| Chain | URL | Status | Notes |
|-------|-----|--------|-------|
| Ethereum | https://docs.layerzero.network/v2/deployments/chains/ethereum | ✅ In JSON | Full contract addresses |
| Base | https://docs.layerzero.network/v2/deployments/chains/base | ✅ In JSON | Full contract addresses |
| Arbitrum | https://docs.layerzero.network/v2/deployments/chains/arbitrum | ✅ In JSON | Full contract addresses |
| Polygon | https://docs.layerzero.network/v2/deployments/chains/polygon | ✅ In JSON | Full contract addresses |
| Optimism | https://docs.layerzero.network/v2/deployments/chains/optimism | ✅ In JSON | Full contract addresses |
| Avalanche | https://docs.layerzero.network/v2/deployments/chains/avalanche | ✅ In JSON | Full contract addresses |
| BNB Smart Chain | https://docs.layerzero.network/v2/deployments/chains/bnb-smart-chain-bsc-mainnet | ⚠️ Partial | Contract addresses only |
| Fantom | https://docs.layerzero.network/v2/deployments/chains/fantom | ⚠️ Partial | Contract addresses only |

### Testnets

| Chain | URL | Status | Notes |
|-------|-----|--------|-------|
| Ethereum Sepolia | https://docs.layerzero.network/v2/deployments/chains/ethereum-sepolia-testnet | ✅ In JSON | Full contract addresses |
| Base Sepolia | https://docs.layerzero.network/v2/deployments/chains/base-sepolia-testnet | ✅ In JSON | Full contract addresses |
| Arbitrum Sepolia | https://docs.layerzero.network/v2/deployments/chains/arbitrum-sepolia-testnet | ✅ In JSON | Full contract addresses |
| Optimism Sepolia | https://docs.layerzero.network/v2/deployments/chains/optimism-sepolia-testnet | ✅ In JSON | Full contract addresses |
| Polygon Amoy | https://docs.layerzero.network/v2/deployments/chains/polygon-amoy-testnet | ✅ In JSON | Full contract addresses |
| Avalanche Fuji | https://docs.layerzero.network/v2/deployments/chains/avalanche-fuji-testnet | ✅ In JSON | Full contract addresses |
| BNB Testnet | https://docs.layerzero.network/v2/deployments/chains/bnb-smart-chain-bsc-testnet | ✅ In JSON | Full contract addresses |

## Data to Extract from Chain Pages

When adding a new chain, extract the following information:

1. **Protocol Contracts**:
   - EndpointV2 address
   - SendUln302 address
   - ReceiveUln302 address
   - ReadLib1002 address (if available)
   - BlockedMessageLib address
   - LZ Executor address
   - LZ Dead DVN address

2. **DVNs**:
   - Push-based DVNs (with addresses)
   - Pull-based DVNs (with addresses)
   - DVN-specific notes or requirements

3. **Chain-Specific Notes**:
   - Special gas token requirements
   - Decimal differences
   - Compiler requirements (e.g., zkSync, zkLink)
   - Alternative fee tokens (e.g., Homeverse, Skale)

4. **OFT Ecosystem**:
   - List of deployed OFT contracts (for reference)

## How to Add a New Chain

1. Visit the chain's documentation page: `https://docs.layerzero.network/v2/deployments/chains/{chain-name}`
2. Extract protocol contract addresses
3. Add to `src/lib/layerzero-contracts.json`:
   ```json
   "chainId": {
     "name": "Chain Name",
     "chainId": 12345,
     "endpointId": 30123,
     "endpointV2": "0x...",
     "sendUln302": "0x...",
     "receiveUln302": "0x...",
     "readLib1002": "0x...", // if available
     "blockedMessageLib": "0x...",
     "lzExecutor": "0x...",
     "lzDeadDvn": "0x..." // if available
   }
   ```
4. Update `src/lib/chains.ts` to add the chain to `LAYERZERO_CHAINS` array
5. Update this file to mark the chain as documented
6. Check for special chain notes and add to `layerzero-contracts.json` notes section

## Chain Name Mapping

Some chain names in URLs differ from display names:

| Display Name | URL Slug | Chain ID |
|-------------|----------|----------|
| BNB Smart Chain (BSC) Mainnet | `bnb-smart-chain-bsc-mainnet` | 56 |
| BNB Smart Chain (BSC) Testnet | `bnb-smart-chain-bsc-testnet` | 97 |
| Arbitrum Mainnet | `arbitrum` | 42161 |
| Base Mainnet | `base` | 8453 |
| Ethereum Mainnet | `ethereum` | 1 |
| Polygon Mainnet | `polygon` | 137 |

## Special Chain Requirements

Some chains have special requirements documented on their pages:

### EVM Chains with Special Requirements
- **Hedera**: 8 decimals for msg.value (JSON RPC uses 18)
- **Shimmer**: Different gas token decimals
- **Tron**: TRX uses 6 decimals
- **zkSync**: Uses zkSync-solc compiler (different bytecode)
- **zkLink**: Unique compiler for ZK proofs
- **Homeverse**: Uses alternative ERC20 token for fees
- **Skale**: Uses alternative ERC20 token for fees

### Non-EVM Chains

#### Solana
- **Architecture**: Completely different from EVM (Programs, PDAs, SPL Tokens)
- **OFT Support**: ✅ Yes (fungible tokens via SPL Token Program)
- **ONFT Support**: ❌ No (NFTs use different standards)
- **Documentation**: https://docs.layerzero.network/v2/developers/solana/oft/overview
- **Example**: https://github.com/LayerZero-Labs/devtools/tree/main/examples/oft-solana
- **Limitations**: 
  - Max 5 DVNs (transaction size limit)
  - CPI depth limit of 4
  - Token extensions have limited compatibility
- **Integration Plan**: See `docs/SOLANA_INTEGRATION_PLAN.md`

#### Aptos
- **Architecture**: Move-based blockchain
- **Documentation**: https://docs.layerzero.network/v2/developers/aptos/overview
- **Status**: Separate integration required

#### Sui
- **Architecture**: Move-based blockchain
- **Documentation**: https://docs.layerzero.network/v2/developers/sui/overview
- **Status**: Separate integration required

## Resources

- **Main Documentation**: https://docs.layerzero.network/v2/deployments/deployed-contracts
- **Chain Pages**: https://docs.layerzero.network/v2/deployments/chains/
- **DVN Providers**: https://docs.layerzero.network/v2/deployments/dvn-addresses
- **Read Channels**: https://docs.layerzero.network/v2/deployments/read-contracts
