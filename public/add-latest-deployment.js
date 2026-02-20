// Script to manually add the latest successful deployment to localStorage
// Run this in browser console: copy and paste this entire script

console.log('🔧 Adding latest deployment to Portfolio...');

// Your latest successful deployment
const latestDeployment = {
  id: `deployment-${Date.now()}`,
  type: 'adapter', // Assuming this was an ONFT Adapter deployment
  contractName: 'PixelGoblinONFTAdapter',
  sourceCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";

/**
 * @title PixelGoblinONFTAdapter
 * @dev ONFT721Adapter for existing ERC721 tokens to enable cross-chain transfers
 */
contract PixelGoblinONFTAdapter is ONFT721Adapter {
    /**
     * @dev Constructor for the ONFT721Adapter contract.
     * @param _token The underlying ERC721 token address this adapts
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     */
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) {}
}`,
  deployerAddress: '0x0aB705B9734CB776A8F5b18c9036c14C6828933F',
  timestamp: Date.now(),
  steps: [{
    network: 'Ethereum',
    contractAddress: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
    transactionHash: '0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
    explorerUrl: 'https://etherscan.io/tx/0xb4224485026bd8fe602805f4d3e330a22bf89bfd785bf0a137565b970c7bcf12',
    verified: false,
    verificationStatus: 'Not Verified'
  }]
};

// Get existing deployments
const existingDeployments = JSON.parse(localStorage.getItem('onft-deployment-states') || '[]');

// Add the new deployment
existingDeployments.push(latestDeployment);

// Save back to localStorage
localStorage.setItem('onft-deployment-states', JSON.stringify(existingDeployments));

console.log('✅ Latest deployment added to Portfolio!');
console.log('📋 Deployment details:', latestDeployment);
console.log('🔄 Refresh the Portfolio page to see the new deployment');

// Also update the Bridge page example contracts
const bridgeExamples = {
  ethereum: {
    name: 'Latest ONFT Adapter (Ethereum)',
    address: '0x4bfbabec9dbb5679c3ad9a442582bbe85e15f76f',
    description: 'Your latest deployed LayerZero V2 ONFT Adapter'
  }
};

console.log('🌉 Bridge page should now show:', bridgeExamples);
