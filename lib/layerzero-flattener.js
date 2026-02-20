// Utility to flatten LayerZero contracts using Hardhat
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Flattens a LayerZero contract using Hardhat's flatten command
 * This reads the actual source from node_modules and includes all dependencies
 */
function flattenLayerZeroContract(contractPath, outputPath) {
  try {
    // Use Hardhat to flatten the contract
    // This requires Hardhat to be configured with proper remappings
    const command = `npx hardhat flatten "${contractPath}" > "${outputPath}"`;
    execSync(command, { 
      cwd: process.cwd(),
      stdio: 'pipe'
    });
    
    return fs.readFileSync(outputPath, 'utf8');
  } catch (error) {
    console.error('Flattening failed:', error.message);
    throw error;
  }
}

/**
 * Creates a wrapper contract that extends LayerZero ONFT721Adapter
 * Then flattens it with all dependencies
 */
function createAndFlattenONFTAdapter(contractName, tokenAddress, collectionName, outputDir) {
  // Create wrapper contract
  const wrapperContent = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";

contract ${contractName} is ONFT721Adapter {
    constructor(
        address _token,
        address _lzEndpoint,
        address _delegate
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) {}
}`;

  const wrapperPath = path.join(outputDir, `${contractName}.sol`);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(wrapperPath, wrapperContent);

  // Flatten it
  const flattenedPath = path.join(outputDir, `${contractName}_flattened.sol`);
  const flattened = flattenLayerZeroContract(wrapperPath, flattenedPath);

  return {
    wrapperPath,
    flattenedPath,
    flattenedContent: flattened
  };
}

module.exports = {
  flattenLayerZeroContract,
  createAndFlattenONFTAdapter
};

