// Script to add real deployment data to localStorage for testing Portfolio page
// Run this in the browser console to add sample data

const realDeploymentData = [
  {
    id: "official-1735397234567",
    type: "adapter",
    timestamp: 1735397234567,
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
    contractAddress: "0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef",
    adapterAddress: "0x810b68b2b502366f95e09cF10afd294c5A0b3426",
    onftAddresses: {
      8453: "0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7"
    },
    completedSteps: {
      "step-0-ethereum": {
        transactionHash: "0x810b68b2b502366f95e09cF10afd294c5A0b3426", // Contract creation tx
        contractAddress: "0x810b68b2b502366f95e09cF10afd294c5A0b3426",
        blockNumber: 24107063,
        timestamp: 1735397234567,
        chainId: 1
      },
      "step-1-base": {
        transactionHash: "0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7", // Contract creation tx
        contractAddress: "0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7",
        blockNumber: 0,
        timestamp: 1735397234567,
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
        verified: true,
        verificationStatus: "Verified"
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
console.log('✅ Real deployment data added to localStorage');
console.log('📊 Data:', realDeploymentData);

// Reload the page to see the changes
if (window.location.pathname === '/portfolio') {
  window.location.reload();
}
