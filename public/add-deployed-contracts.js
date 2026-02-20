// Script to manually add the deployed contracts to portfolio
// Run this in the browser console to add the real deployed contracts

function addDeployedContracts() {
  const deploymentState = {
    id: `official-${Date.now()}`,
    type: 'adapter',
    timestamp: Date.now(),
    deployerAddress: '0x0aB705B9734CB776A8F5b18c9036c14C6828933F',
    sourceChain: {
      id: 1,
      name: 'Ethereum',
      lzEid: 30101
    },
    targetChains: [{
      id: 8453,
      name: 'Base',
      lzEid: 30184
    }],
    collectionName: 'Pixel Goblins',
    collectionSymbol: 'PGOB',
    contractAddress: '0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef',
    adapterAddress: '0x810b68b2b502366f95e09cF10afd294c5A0b3426',
    onftAddresses: {
      8453: '0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7'
    },
    steps: [
      {
        id: 'step-0',
        name: 'Deploy PixelGoblinsONFTAdapter on ethereum',
        status: 'completed',
        chainId: 1,
        contractAddress: '0x810b68b2b502366f95e09cF10afd294c5A0b3426',
        transactionHash: '0x9e9afd892f7c935d1bd2af21febf90dcfa7ff2893c4c4c339daf289c604443ca',
        verified: false,
        verificationStatus: 'Failed'
      },
      {
        id: 'step-1',
        name: 'Deploy PixelGoblinsONFT on base',
        status: 'completed',
        chainId: 8453,
        contractAddress: '0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7',
        transactionHash: '0x46fa118d5a3c9e1f32bc4be12829d8d02f00fbb4eeef16e1b50501c72949c59a',
        verified: false,
        verificationStatus: 'Failed'
      }
    ]
  };

  // Get existing deployments
  const existing = JSON.parse(localStorage.getItem('onft-deployment-states') || '[]');
  
  // Add new deployment
  existing.push(deploymentState);
  
  // Save back to localStorage
  localStorage.setItem('onft-deployment-states', JSON.stringify(existing));
  
  console.log('✅ Added deployed contracts to portfolio!');
  console.log('🔄 Refresh the portfolio page to see the contracts');
  
  return deploymentState;
}

// Run the function
addDeployedContracts();
