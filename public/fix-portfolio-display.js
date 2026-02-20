// Fix Portfolio display - add all required fields for UI to work
console.log('🔧 Fixing Portfolio display...');

localStorage.removeItem('onft-deployment-states');

const deployment = {
  id: `deployment-${Date.now()}`,
  type: 'adapter',
  contractName: 'PixelGoblinONFTAdapter',
  deployerAddress: '0x0aB705B9734CB776A8F5b18c9036c14C6828933F',
  timestamp: Date.now(),
  
  // Required for Portfolio UI
  adapterAddress: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
  sourceChain: { id: 1, name: 'Ethereum' },
  targetChains: [{ id: 8453, name: 'Base' }],
  
  // Steps array for contract details
  steps: [{
    network: 'Ethereum',
    contractAddress: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
    transactionHash: '0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
    explorerUrl: 'https://etherscan.io/tx/0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
    verified: false,
    verificationStatus: 'Not Verified'
  }],
  
  // Completed steps for progress calculation
  completedSteps: {
    'compile-contract': {
      stepId: 'compile-contract',
      status: 'completed',
      contractAddress: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
      transactionHash: '0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12'
    },
    'deploy-adapter': {
      stepId: 'deploy-adapter', 
      status: 'completed',
      contractAddress: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
      transactionHash: '0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12'
    }
  }
};

localStorage.setItem('onft-deployment-states', JSON.stringify([deployment]));

console.log('✅ Portfolio display fixed!');
console.log('📋 Contract Address:', deployment.adapterAddress);
console.log('🔗 Transaction:', deployment.steps[0].transactionHash);
console.log('🔄 Refresh the Portfolio page to see all details');

// Verify
const saved = JSON.parse(localStorage.getItem('onft-deployment-states'));
console.log('💾 Verification - adapterAddress exists:', !!saved[0].adapterAddress);
console.log('💾 Verification - steps exist:', !!saved[0].steps);
console.log('💾 Verification - completedSteps exist:', !!saved[0].completedSteps);
