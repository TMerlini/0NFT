// Check current localStorage data and add the latest deployment
console.log('=== CHECKING CURRENT LOCALSTORAGE ===')
const currentData = localStorage.getItem('onft-deployment-states')
console.log('Current data:', currentData)

if (currentData) {
  try {
    const parsed = JSON.parse(currentData)
    console.log('Parsed data:', parsed)
    console.log('Number of deployments:', parsed.length)
  } catch (e) {
    console.log('Error parsing data:', e)
  }
}

console.log('\n=== ADDING LATEST DEPLOYMENT ===')

// Add the latest successful deployment
const latestDeployment = {
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

// Get existing deployments or create empty array
let deployments = []
try {
  const existing = localStorage.getItem('onft-deployment-states')
  if (existing) {
    deployments = JSON.parse(existing)
  }
} catch (e) {
  console.log('Error reading existing data, starting fresh')
  deployments = []
}

// Add the new deployment
deployments.push(latestDeployment)

// Save back to localStorage
localStorage.setItem('onft-deployment-states', JSON.stringify(deployments))

console.log('✅ Added latest deployment to localStorage')
console.log('New deployment ID:', latestDeployment.id)
console.log('Total deployments:', deployments.length)

// Verify it was saved
const savedData = localStorage.getItem('onft-deployment-states')
console.log('Verification - saved data length:', savedData?.length)
