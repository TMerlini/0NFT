// Next.js API Route: /api/compile-contract
const solc = require('solc');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { contractType, contractAddress, collectionName, collectionSymbol } = req.body;

  try {
    console.warn('⚠️ WARNING: This endpoint uses simplified LayerZero interfaces that will NOT work for bridging!');
    console.warn('⚠️ The compiled contracts will be missing critical LayerZero functionality.');
    console.warn('⚠️ Use /api/compile-with-hardhat instead to compile with the real LayerZero source code.');
    console.log('🔧 Backend compilation started (SIMPLIFIED - NOT FOR PRODUCTION):', { contractType, collectionName });

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

    console.log('📝 Generated contract:', contractName);

    // Prepare Solidity compilation input
    const solcInput = {
      language: 'Solidity',
      sources: {
        [`${contractName}.sol`]: {
          content: contractContent
        },
        // Include required imports (simplified versions for compilation)
        'ONFT721Adapter.sol': {
          content: getONFTAdapterInterface()
        },
        'ONFT721.sol': {
          content: getONFTInterface()
        },
        'Ownable.sol': {
          content: getOwnableInterface()
        }
      },
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode']
          }
        },
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    };

    // Compile the contract
    console.log('⚙️ Compiling with solc...');
    const output = JSON.parse(solc.compile(JSON.stringify(solcInput)));

    // Check for compilation errors
    if (output.errors) {
      const errors = output.errors.filter(error => error.severity === 'error');
      if (errors.length > 0) {
        console.error('❌ Compilation errors:', errors);
        return res.status(400).json({ 
          success: false, 
          error: `Compilation failed: ${errors.map(e => e.formattedMessage).join('\n')}` 
        });
      }
    }

    // Extract compiled contract
    const contract = output.contracts[`${contractName}.sol`][contractName];
    
    if (!contract) {
      return res.status(500).json({ 
        success: false, 
        error: 'Contract not found in compilation output' 
      });
    }

    console.log('✅ Backend compilation successful!');

    res.status(200).json({
      success: true,
      contractName,
      bytecode: contract.evm.bytecode.object,
      abi: contract.abi,
      sourceCode: contractContent,
      constructorArgs: getConstructorArgs(contractType, contractAddress, collectionName, collectionSymbol)
    });

  } catch (error) {
    console.error('❌ Backend compilation failed:', error);
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

import "./ONFT721Adapter.sol";
import "./Ownable.sol";

/**
 * @title ${contractName}
 * @dev ONFT721Adapter for ${collectionName} NFT collection
 */
contract ${contractName} is ONFT721Adapter, Ownable {
    constructor(
        address _token,        // ${tokenAddress}
        address _lzEndpoint,   // LayerZero endpoint address
        address _delegate      // Owner/delegate address
    ) ONFT721Adapter(_token, _lzEndpoint, _delegate) Ownable(_delegate) {}
    
    function collectionName() external pure returns (string memory) {
        return "${collectionName}";
    }
}`;
}

function generateONFTContract(collectionName, collectionSymbol, contractName) {
  return `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "./ONFT721.sol";
import "./Ownable.sol";

/**
 * @title ${contractName}
 * @dev ONFT721 contract for ${collectionName} on destination chains
 */
contract ${contractName} is ONFT721, Ownable {
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

// Complete interfaces for compilation
function getONFTAdapterInterface() {
  return `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract ONFT721Adapter {
    address public immutable token;
    address public lzEndpoint;
    mapping(uint32 => bytes32) public peers;
    
    constructor(address _token, address _lzEndpoint, address _delegate) {
        token = _token;
        lzEndpoint = _lzEndpoint;
    }
    
    function setPeer(uint32 _eid, bytes32 _peer) external virtual {
        peers[_eid] = _peer;
    }
    
    function quoteSend(bytes calldata _sendParam, bool _payInLzToken) external view virtual returns (uint256 nativeFee, uint256 lzTokenFee) {
        return (0.001 ether, 0);
    }
    
    function send(bytes calldata _sendParam, bytes calldata _fee, address _refundAddress) external payable virtual returns (bytes32 guid, uint64 nonce) {
        return (bytes32(0), 0);
    }
}`;
}

function getONFTInterface() {
  return `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract ONFT721 {
    string private _name;
    string private _symbol;
    address public lzEndpoint;
    mapping(uint32 => bytes32) public peers;
    mapping(uint256 => address) private _owners;
    
    constructor(string memory name_, string memory symbol_, address _lzEndpoint, address _delegate) {
        _name = name_;
        _symbol = symbol_;
        lzEndpoint = _lzEndpoint;
    }
    
    function name() external view virtual returns (string memory) {
        return _name;
    }
    
    function symbol() external view virtual returns (string memory) {
        return _symbol;
    }
    
    function _mint(address _to, uint256 _tokenId) internal virtual {
        _owners[_tokenId] = _to;
    }
    
    function setPeer(uint32 _eid, bytes32 _peer) external virtual {
        peers[_eid] = _peer;
    }
}`;
}

function getOwnableInterface() {
  return `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

abstract contract Ownable {
    address private _owner;
    
    constructor(address _initialOwner) {
        _owner = _initialOwner;
    }
    
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }
}`;
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
