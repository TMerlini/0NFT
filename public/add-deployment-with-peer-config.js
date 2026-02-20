// Add the latest deployment with proper structure for peer configuration
console.log('🔧 Adding deployment with peer configuration support...')

const deployment = {
  "id": "deployment_" + Date.now(),
  "type": "adapter",
  "timestamp": Date.now(),
  "deployerAddress": "0x0aB705B9734CB776A8F5b18c9036c14C6828933F",
  "sourceChain": {
    "id": 1,
    "name": "Ethereum",
    "nativeCurrency": { "name": "Ether", "symbol": "ETH", "decimals": 18 },
    "rpcUrls": { "default": { "http": ["https://eth.llamarpc.com"] } },
    "blockExplorers": { "default": { "name": "Etherscan", "url": "https://etherscan.io" } },
    "lzEndpointV2": "0x1a44076050125825900e736c501f859c50fE728c"
  },
  "targetChains": [{
    "id": 8453,
    "name": "Base",
    "nativeCurrency": { "name": "Ether", "symbol": "ETH", "decimals": 18 },
    "rpcUrls": { "default": { "http": ["https://mainnet.base.org"] } },
    "blockExplorers": { "default": { "name": "BaseScan", "url": "https://basescan.org" } },
    "lzEndpointV2": "0xb6319cC6c8c27A8F5dAF0dD3DF91EA35C4720dd7"
  }],
  "contractAddress": "0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef",
  "collectionName": "PixelGoblinONFT",
  "collectionSymbol": "PGONFT",
  "adapterAddress": "0x79CE8f5d8892502A99f040be88Cb94a07aD548D1",
  "onftAddresses": {
    "8453": "0xbd8e612B465F273d3Bd06839f6Df6237D80B68c0"
  },
  "completedSteps": {
    "deploy-adapter-ethereum": {
      "transactionHash": "0x1234567890abcdef",
      "contractAddress": "0x79CE8f5d8892502A99f040be88Cb94a07aD548D1",
      "blockNumber": 21000000,
      "timestamp": Date.now(),
      "chainId": 1
    },
    "deploy-onft-base": {
      "transactionHash": "0xabcdef1234567890",
      "contractAddress": "0xbd8e612B465F273d3Bd06839f6Df6237D80B68c0",
      "blockNumber": 21000000,
      "timestamp": Date.now(),
      "chainId": 8453
    }
  },
  "steps": [
    {
      "id": "deploy-adapter-ethereum",
      "name": "Deploy ONFT Adapter on Ethereum",
      "status": "completed",
      "chainId": 1,
      "contractAddress": "0x79CE8f5d8892502A99f040be88Cb94a07aD548D1",
      "transactionHash": "0x1234567890abcdef",
      "verified": false,
      "verificationStatus": "Pending"
    },
    {
      "id": "deploy-onft-base",
      "name": "Deploy ONFT Contract on Base",
      "status": "completed",
      "chainId": 8453,
      "contractAddress": "0xbd8e612B465F273d3Bd06839f6Df6237D80B68c0",
      "transactionHash": "0xabcdef1234567890",
      "verified": false,
      "verificationStatus": "Pending"
    }
  ]
}

// Clear existing deployments and add the new one
localStorage.setItem('onft-deployment-states', JSON.stringify([deployment]))

console.log('✅ Deployment added with peer configuration support!')
console.log('📋 Deployment details:')
console.log('  - ONFT Adapter (Ethereum):', deployment.adapterAddress)
console.log('  - ONFT Contract (Base):', deployment.onftAddresses["8453"])
console.log('🔄 Refresh the Portfolio page to see the peer configurator!')

// Verify it was saved
const saved = localStorage.getItem('onft-deployment-states')
console.log('✅ Verification - data saved:', saved ? 'Yes' : 'No')
console.log('📊 Data length:', saved?.length || 0)
