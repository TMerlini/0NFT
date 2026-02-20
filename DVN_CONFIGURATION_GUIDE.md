# Recommended DVN Configuration for Ethereum ↔ Base Mainnet

## 📋 Configuration Summary

This guide provides production-ready DVN (Decentralized Verifier Network) configuration settings for your LayerZero V2 ONFT contracts on Ethereum and Base mainnet.

---

## 🔗 Configuration for Both Directions

### **Ethereum → Base (Send Config)**

#### Required DVNs (3 - All must verify)
These are the most trusted and reliable DVNs. **All 3 must verify** for maximum security:

1. **LayerZero Labs** (Official)
   - Address: `0x589dedbd617e0cbcb916a9223f4d1300c294236b`
   - Status: Official LayerZero DVN, highest reliability

2. **Google Cloud**
   - Address: `0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc`
   - Status: Enterprise-grade infrastructure

3. **Nethermind**
   - Address: `0xa59ba433ac34d2927232918ef5b2eaafcf130ba5`
   - Status: Established Ethereum infrastructure provider

#### Optional DVNs (3 - 2 out of 3 must verify)
Additional redundancy for high availability:

1. **Polyhedra zkBridge**
   - Address: `0x8ddf05f9a5c488b4973897e278b58895bf87cb24`

2. **Horizen**
   - Address: `0x380275805876ff19055ea900cdb2b46a94ecf20d`

3. **BitGo**
   - Address: `0xc9ca319f6da263910fd9b037ec3d817a814ef3d8`

#### Configuration Values:
- **Confirmations**: `15` blocks
- **Required DVN Count**: `3`
- **Optional DVN Count**: `3`
- **Optional DVN Threshold**: `2` (at least 2 of 3 optional DVNs must verify)

---

### **Base → Ethereum (Send Config)**

#### Required DVNs (3 - All must verify)
1. **LayerZero Labs**
   - Address: `0x9e059a54699a285714207b43b055483e78faac25`
   - ⚠️ **Note**: Different address on Base!

2. **Google Cloud**
   - Address: `0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc`
   - ✅ Same address on Base

3. **Nethermind**
   - Address: `0xcd37ca043f8479064e10635020c65ffc005d36f6`
   - ⚠️ **Note**: Different address on Base!

#### Optional DVNs (3 - 2 out of 3 must verify)
1. **Polyhedra zkBridge**
   - Address: `0x8ddf05f9a5c488b4973897e278b58895bf87cb24`
   - ✅ Same address on Base

2. **Horizen**
   - Address: `0xa7b5189bca84cd304d8553977c7c614329750d99`
   - ⚠️ **Note**: Different address on Base!

3. **BitGo**
   - Address: `0x133e9fb2d339d8428476a714b1113b024343811e`
   - ⚠️ **Note**: Different address on Base!

#### Configuration Values:
- **Confirmations**: `15` blocks
- **Required DVN Count**: `3`
- **Optional DVN Count**: `3`
- **Optional DVN Threshold**: `2`

---

## 🔄 Receive Configurations

**Use the SAME settings for Receive ULN Config (type 3) as Send ULN Config (type 2).**

The receive configuration should match the send configuration for consistency:
- Same Required DVNs
- Same Optional DVNs
- Same thresholds and confirmations

---

## ⚡ Executor Configuration

### Executor Options Settings:
- **LZ_RECEIVE Gas Limit**: `200000` (standard for ONFT)
- **Max Message Size**: `10000` bytes (standard)
- **Executor Address**: Will be fetched automatically from LayerZero Endpoint

### Why These Settings?
- **200k gas**: Standard for ONFT receive operations, covers most NFT transfers
- **10k message size**: Sufficient for NFT metadata and standard payloads
- **Executor enabled**: Allows users to pay only on source chain (single transaction)

---

## 📊 Configuration Matrix

| Setting | Value | Notes |
|---------|-------|-------|
| **Confirmations** | 15 | Standard for mainnet (Ethereum ~3 min, Base ~2 sec) |
| **Required DVNs** | 3 | All must verify (100% consensus for security) |
| **Optional DVNs** | 3 | Provides redundancy |
| **Optional Threshold** | 2 | At least 2 of 3 optional DVNs must verify |
| **Total Verification** | 5/6 DVNs | Very high security (83% consensus) |
| **Executor Gas** | 200,000 | Standard for ONFT operations |
| **Max Message Size** | 10,000 bytes | Sufficient for NFT metadata |

---

## 🎯 Quick Reference: DVN Addresses by Chain

### Ethereum Mainnet (Chain ID: 1)
```
Required:
- LayerZero Labs: 0x589dedbd617e0cbcb916a9223f4d1300c294236b
- Google Cloud:   0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc
- Nethermind:     0xa59ba433ac34d2927232918ef5b2eaafcf130ba5

Optional:
- Polyhedra:      0x8ddf05f9a5c488b4973897e278b58895bf87cb24
- Horizen:        0x380275805876ff19055ea900cdb2b46a94ecf20d
- BitGo:          0xc9ca319f6da263910fd9b037ec3d817a814ef3d8
```

### Base Mainnet (Chain ID: 8453)
```
Required:
- LayerZero Labs: 0x9e059a54699a285714207b43b055483e78faac25
- Google Cloud:   0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc
- Nethermind:     0xcd37ca043f8479064e10635020c65ffc005d36f6

Optional:
- Polyhedra:      0x8ddf05f9a5c488b4973897e278b58895bf87cb24
- Horizen:        0xa7b5189bca84cd304d8553977c7c614329750d99
- BitGo:          0x133e9fb2d339d8428476a714b1113b024343811e
```

---

## 🚀 How to Apply These Settings

### Step 1: Access DVN Configurator
1. Go to your Portfolio page
2. Find your deployed ONFT contract
3. Click "Configure DVN" button

### Step 2: Configure Send ULN (Type 2)
For **Ethereum → Base**:
1. Select source chain: **Ethereum**
2. Select destination chain: **Base**
3. **Required DVNs**: Select all 3 (LayerZero Labs, Google Cloud, Nethermind)
4. **Optional DVNs**: Select all 3 (Polyhedra, Horizen, BitGo)
5. **Optional Threshold**: Set to `2`
6. **Confirmations**: Set to `15`
7. Click "Configure"

For **Base → Ethereum**:
1. Select source chain: **Base**
2. Select destination chain: **Ethereum**
3. Use Base addresses from the list above
4. Same settings: 3 required, 3 optional, threshold 2, 15 confirmations

### Step 3: Configure Receive ULN (Type 3)
- Repeat Step 2 with the same settings
- This ensures consistency for both directions

### Step 4: Configure Executor (Type 1)
- **Max Message Size**: `10000`
- **Executor Address**: Will be auto-detected (or use default if not available)
- Click "Configure"

---

## ⚠️ Important Notes

1. **DVN Addresses Vary by Chain**: Always use the correct addresses for each chain
2. **Google Cloud Address is Same**: `0xd56e4eab23cb81f43168f9f45211eb027b9ac7cc` works on both chains
3. **Polyhedra Address is Same**: `0x8ddf05f9a5c488b4973897e278b58895bf87cb24` works on both chains
4. **Most Other DVNs Have Different Addresses**: Always verify using the chain-specific list above

---

## ✅ Security Level Assessment

This configuration provides:
- ✅ **High Security**: 5 out of 6 DVNs must verify (83% consensus)
- ✅ **High Availability**: 3 optional DVNs provide redundancy
- ✅ **Trusted Providers**: All DVNs are from reputable organizations
- ✅ **Production Ready**: Conservative settings suitable for mainnet

---

## 🔍 Verification Steps

After configuration:
1. Check LayerZero Scan for your contract
2. Verify DVN configuration matches your settings
3. Test a small bridge transaction
4. Monitor message delivery and verification

---

## 📚 Additional Resources

- [LayerZero V2 DVN Addresses](https://docs.layerzero.network/v2/deployments/dvn-addresses)
- [LayerZero Scan](https://layerzeroscan.com/)
- [LayerZero V2 Documentation](https://docs.layerzero.network/v2)

---

**Last Updated**: Configuration based on LayerZero V2 mainnet addresses (verify before deploying)
