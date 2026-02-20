// Next.js API Route: /api/compile-with-hardhat
// Uses Hardhat to compile contracts with real LayerZero source code
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contractType, contractAddress, collectionName, collectionSymbol } = req.body;

  try {
    console.log('🔧 Hardhat compilation started:', { contractType, collectionName });

    // Generate contract name
    let contractName;
    if (contractType === 'adapter') {
      contractName = `${collectionName.replace(/\s+/g, '')}ONFTAdapter`;
    } else {
      contractName = `${collectionName.replace(/\s+/g, '')}ONFT`;
    }

    // Create wrapper contract that imports real LayerZero contracts
    const contractsDir = path.join(process.cwd(), 'contracts');
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir, { recursive: true });
    }

    let contractContent;
    if (contractType === 'adapter') {
      contractContent = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721Adapter } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";

/**
 * @title ${contractName}
 * @dev ONFT721Adapter for ${collectionName} NFT collection
 * This contract uses the official LayerZero ONFT721Adapter implementation
 */
contract ${contractName} is ONFT721Adapter {
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
}`;
    } else {
      contractContent = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { ONFT721 } from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721.sol";

/**
 * @title ${contractName}
 * @dev ONFT721 contract for ${collectionName} NFT collection
 */
contract ${contractName} is ONFT721 {
    /**
     * @dev Constructor for the ONFT721 contract.
     * @param _name The name of the ONFT collection.
     * @param _symbol The symbol of the ONFT collection.
     * @param _lzEndpoint The LayerZero endpoint address.
     * @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _lzEndpoint,
        address _delegate
    ) ONFT721(_name, _symbol, _lzEndpoint, _delegate) {}
    
    /**
     * @dev Mint function for the owner to create new NFTs
     * @param _to The address to mint the NFT to
     * @param _tokenId The token ID to mint
     */
    function mint(address _to, uint256 _tokenId) external onlyOwner {
        _mint(_to, _tokenId);
    }
}`;
    }

    // Write contract to contracts directory
    const contractPath = path.join(contractsDir, `${contractName}.sol`);
    fs.writeFileSync(contractPath, contractContent);

    console.log('📝 Contract written to:', contractPath);

    // Compile using Hardhat via command line (works better in Next.js)
    console.log('⚙️ Compiling with Hardhat...');
    const { stdout, stderr } = await execAsync('npx hardhat compile', {
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    if (stderr && !stderr.includes('Compiled')) {
      console.warn('⚠️ Hardhat compilation warnings:', stderr);
    }

    // Read the compiled artifact
    const artifactPath = path.join(process.cwd(), 'artifacts', 'contracts', `${contractName}.sol`, `${contractName}.json`);
    
    if (!fs.existsSync(artifactPath)) {
      // Try alternative path (Hardhat might organize artifacts differently)
      const altPath = path.join(process.cwd(), 'artifacts', `${contractName}.sol`, `${contractName}.json`);
      if (fs.existsSync(altPath)) {
        const artifact = JSON.parse(fs.readFileSync(altPath, 'utf8'));
        console.log('✅ Hardhat compilation successful!');
        return res.status(200).json({
          success: true,
          contractName,
          bytecode: artifact.bytecode,
          abi: artifact.abi,
          sourceCode: contractContent,
          compilationMethod: 'hardhat'
        });
      }
      throw new Error(`Compiled artifact not found. Checked: ${artifactPath} and ${altPath}`);
    }

    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    console.log('✅ Hardhat compilation successful!');
    console.log('📦 Bytecode length:', artifact.bytecode.length);
    console.log('🔧 ABI functions:', artifact.abi.length);

    res.status(200).json({
      success: true,
      contractName,
      bytecode: artifact.bytecode,
      abi: artifact.abi,
      sourceCode: contractContent,
      compilationMethod: 'hardhat'
    });

  } catch (error) {
    console.error('❌ Hardhat compilation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

