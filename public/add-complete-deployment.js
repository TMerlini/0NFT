// Script to add the complete successful deployment to Portfolio
// This will replace the incomplete "0/3 steps" entry

console.log('🔧 Adding complete deployment data to Portfolio...');

// Clear existing incomplete data
localStorage.removeItem('onft-deployment-states');

// Create the complete deployment record
const completeDeployment = {
  id: `deployment-${Date.now()}`,
  type: 'adapter',
  contractName: 'PixelGoblinONFTAdapter',
  sourceCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";

/**
 * @title PixelGoblinONFTAdapter
 * @dev ONFT721Adapter for existing ERC721 tokens to enable cross-chain transfers
 */
contract PixelGoblinONFTAdapter is ONFT721Adapter {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) {}
}`,
  deployerAddress: '0x0aB705B9734CB776A8F5b18c9036c14C6828933F',
  timestamp: Date.now(),
  
  // Portfolio expects these specific fields
  adapterAddress: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
  sourceChain: { id: 1, name: 'Ethereum' },
  targetChains: [{ id: 8453, name: 'Base' }],
  
  // Complete steps array (this is what was missing!)
  steps: [{
    network: 'Ethereum',
    contractAddress: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
    transactionHash: '0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
    explorerUrl: 'https://etherscan.io/tx/0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
    verified: false,
    verificationStatus: 'Not Verified'
  }],
  
  // Complete completedSteps object (this fixes the 0/3 issue!)
  completedSteps: {
    'compile-contract': {
      stepId: 'compile-contract',
      network: 'Ethereum',
      status: 'completed',
      transactionHash: '0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
      contractAddress: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
      explorerUrl: 'https://etherscan.io/tx/0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
      timestamp: Date.now()
    },
    'deploy-adapter': {
      stepId: 'deploy-adapter',
      network: 'Ethereum',
      status: 'completed',
      transactionHash: '0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
      contractAddress: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
      explorerUrl: 'https://etherscan.io/tx/0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
      timestamp: Date.now()
    },
    'verify-contract': {
      stepId: 'verify-contract',
      network: 'Ethereum',
      status: 'pending',
      transactionHash: '0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
      contractAddress: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
      explorerUrl: 'https://etherscan.io/tx/0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
      timestamp: Date.now()
    }
  }
};

// Save the complete deployment
const deployments = [completeDeployment];
localStorage.setItem('onft-deployment-states', JSON.stringify(deployments));

console.log('✅ Complete deployment added to Portfolio!');
console.log('📋 Deployment details:', completeDeployment);
console.log('🎯 Status: 2/3 steps completed (Compile ✅, Deploy ✅, Verify ⏳)');
console.log('🔄 Refresh the Portfolio page to see the complete deployment');

// Verify the data was saved correctly
const savedData = JSON.parse(localStorage.getItem('onft-deployment-states'));
console.log('💾 Saved data verification:', savedData.length, 'deployments saved');
