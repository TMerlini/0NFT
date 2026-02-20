// Next.js API Route: /api/compile-contract
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contractType, contractAddress, collectionName, collectionSymbol } = req.body;

  try {
    // Generate contract based on type
    let contractContent;
    let contractName;

    if (contractType === 'adapter') {
      contractName = `${collectionName.replace(/\s+/g, '')}ONFTAdapter`;
      contractContent = generateONFTAdapterContract(contractAddress, collectionName, contractName);
    } else {
      contractName = `${collectionName.replace(/\s+/g, '')}ONFT`;
      contractContent = generateONFTContract(collectionName, collectionSymbol, contractName);
    }

    // Write contract to temporary file
    const contractPath = path.join(process.cwd(), 'temp', `${contractName}.sol`);
    fs.writeFileSync(contractPath, contractContent);

    // Compile with Hardhat
    const compilationResult = await compileContract(contractPath, contractName);

    // Clean up temporary file
    fs.unlinkSync(contractPath);

    res.status(200).json({
      success: true,
      contractName,
      bytecode: compilationResult.bytecode,
      abi: compilationResult.abi,
      constructorArgs: getConstructorArgs(contractType, contractAddress, collectionName, collectionSymbol)
    });

  } catch (error) {
    console.error('Compilation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

function generateONFTAdapterContract(tokenAddress, collectionName, contractName) {
  return `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ${contractName}
 * @dev ONFT721Adapter for ${collectionName} NFT collection
 */
contract ${contractName} is ONFT721Adapter {
    constructor(
        address _token,        // ${tokenAddress}
        address _lzEndpoint,   // LayerZero endpoint address
        address _delegate      // Owner/delegate address
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
}`;
}

function generateONFTContract(collectionName, collectionSymbol, contractName) {
  return `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721 } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ${contractName}
 * @dev ONFT721 contract for ${collectionName} on destination chains
 */
contract ${contractName} is ONFT721 {
    constructor(
        string memory _name,     // "${collectionName}"
        string memory _symbol,   // "${collectionSymbol}"
        address _lzEndpoint,     // LayerZero endpoint address
        address _delegate        // Owner/delegate address
    ) ONFT721(_name, _symbol, _lzEndpoint, _delegate) Ownable(_delegate) {}

    function mint(address _to, uint256 _tokenId) external onlyOwner {
        _mint(_to, _tokenId);
    }
}`;
}

async function compileContract(contractPath, contractName) {
  return new Promise((resolve, reject) => {
    // Use Hardhat to compile
    exec(`npx hardhat compile --sources ${contractPath}`, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Compilation failed: ${error.message}`));
        return;
      }

      try {
        // Read compiled artifacts
        const artifactPath = path.join(process.cwd(), 'artifacts', 'temp', `${contractName}.sol`, `${contractName}.json`);
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

        resolve({
          bytecode: artifact.bytecode,
          abi: artifact.abi
        });
      } catch (parseError) {
        reject(new Error(`Failed to parse compilation result: ${parseError.message}`));
      }
    });
  });
}

function getConstructorArgs(contractType, contractAddress, collectionName, collectionSymbol) {
  if (contractType === 'adapter') {
    return {
      _token: contractAddress,
      _lzEndpoint: '0x1a44076050125825900e736c501f859c50fE728c', // Ethereum
      _delegate: '{{DEPLOYER_ADDRESS}}' // Will be replaced with actual deployer
    };
  } else {
    return {
      _name: collectionName,
      _symbol: collectionSymbol,
      _lzEndpoint: '{{LZ_ENDPOINT}}', // Will be replaced with chain-specific endpoint
      _delegate: '{{DEPLOYER_ADDRESS}}' // Will be replaced with actual deployer
    };
  }
}
