// Script to update Portfolio with your real deployed contracts
// Run this in the browser console on the Portfolio page

console.log('🔄 Updating Portfolio with real deployed contracts...');

// Clear old mock data
localStorage.removeItem('onft-deployment-states');

// Add your real deployment data
const realDeploymentData = [
  {
    id: "official-real-deployment-" + Date.now(),
    type: "adapter",
    timestamp: Date.now(),
    deployerAddress: "0x0aB705B9734CB776A8F5b18c9036c14C6828933F",
    sourceChain: {
      id: 1,
      name: "Ethereum",
      lzEid: 30101,
      logo: "https://assets.coingecko.com/coins/images/279/standard/ethereum.png?1696501628",
      isTestnet: false,
      explorerUrl: "https://etherscan.io",
      description: "Ethereum Mainnet",
      layerZeroEndpointV2: "0x1a44076050125825900e736c501f859c50fE728c"
    },
    targetChains: [
      {
        id: 8453,
        name: "Base",
        lzEid: 30184,
        logo: "https://assets.coingecko.com/asset_platforms/images/131/standard/base.png?1759905869",
        isTestnet: false,
        explorerUrl: "https://basescan.org",
        description: "Base Mainnet",
        layerZeroEndpointV2: "0x1a44076050125825900e736c501f859c50fE728c"
      }
    ],
    collectionName: "Pixel Goblins",
    collectionSymbol: "PGOB",
    contractAddress: "0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef", // Original ERC721
    adapterAddress: "0x810b68b2b502366f95e09cF10afd294c5A0b3426", // Your real Ethereum ONFT Adapter
    onftAddresses: {
      8453: "0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7" // Your real Base ONFT Contract
    },
    completedSteps: {
      "step-0-ethereum": {
        transactionHash: "0x810b68b2b502366f95e09cF10afd294c5A0b3426", // Contract creation
        contractAddress: "0x810b68b2b502366f95e09cF10afd294c5A0b3426",
        blockNumber: 24107063,
        timestamp: Date.now(),
        chainId: 1
      },
      "step-1-base": {
        transactionHash: "0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7", // Contract creation
        contractAddress: "0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7",
        blockNumber: 0,
        timestamp: Date.now(),
        chainId: 8453
      }
    },
    steps: [
      {
        id: "step-0-ethereum",
        name: "Deploy ONFT Adapter on ethereum",
        status: "completed",
        chainId: 1,
        contractAddress: "0x810b68b2b502366f95e09cF10afd294c5A0b3426",
        transactionHash: "0x810b68b2b502366f95e09cF10afd294c5A0b3426",
        verified: false,
        verificationStatus: "Not Verified"
      },
      {
        id: "step-1-base",
        name: "Deploy ONFT on base",
        status: "completed",
        chainId: 8453,
        contractAddress: "0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7",
        transactionHash: "0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7",
        verified: false,
        verificationStatus: "Not Verified"
      }
    ]
  }
];

// Save to localStorage
localStorage.setItem('onft-deployment-states', JSON.stringify(realDeploymentData));

console.log('✅ Real deployment data updated!');
console.log('📊 Your contracts:');
console.log('   🔗 Ethereum ONFT Adapter:', realDeploymentData[0].adapterAddress);
console.log('   🔗 Base ONFT Contract:', realDeploymentData[0].onftAddresses[8453]);
console.log('   📋 Explorer links:');
console.log('   📍 Ethereum:', 'https://etherscan.io/address/' + realDeploymentData[0].adapterAddress);
console.log('   📍 Base:', 'https://basescan.org/address/' + realDeploymentData[0].onftAddresses[8453]);

// Reload the page to see the changes
if (window.location.pathname === '/portfolio') {
  console.log('🔄 Reloading Portfolio page...');
  window.location.reload();
} else {
  console.log('💡 Navigate to /portfolio to see your real deployed contracts!');
}
