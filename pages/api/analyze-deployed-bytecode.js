// Analyze the actual deployed bytecode to reverse-engineer the source code
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Analyzing deployed bytecode to reverse-engineer source code...');
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }
    
    // Get the actual deployed bytecode
    console.log('📡 Fetching deployed bytecode...');
    const bytecodeUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
    const bytecodeResponse = await axios.get(bytecodeUrl);
    
    const deployedBytecode = bytecodeResponse.data?.result;
    
    if (!deployedBytecode || deployedBytecode === '0x') {
      throw new Error('No bytecode found at address');
    }
    
    console.log('📋 Deployed bytecode length:', deployedBytecode.length);
    console.log('📋 Deployed bytecode preview:', deployedBytecode.substring(0, 100) + '...');
    
    // Analyze the bytecode patterns
    const analysis = {
      length: deployedBytecode.length,
      hasConstructor: deployedBytecode.includes('60806040'), // Common Solidity constructor pattern
      hasOwnable: deployedBytecode.includes('8da5cb5b'), // owner() function selector
      hasERC721: deployedBytecode.includes('70a08231'), // balanceOf function selector
      hasLayerZero: deployedBytecode.includes('b353aaa7'), // Common LayerZero function
      hasPeers: deployedBytecode.includes('bb0b6a53'), // peers function selector
      hasDelegate: deployedBytecode.includes('5c60da1b'), // implementation function selector (proxy)
      isProxy: deployedBytecode.includes('3659cfe6'), // delegatecall pattern
      compilerFingerprint: deployedBytecode.substring(-68, -4) // Last 32 bytes often contain metadata
    };
    
    // Based on the bytecode analysis, determine the most likely source code
    let likelySourceCode = '';
    let contractName = 'UnknownContract';
    let compilerVersion = 'v0.8.22+commit.4fc1097e';
    
    // From the bytecode patterns, this looks like a simple contract with basic functions
    if (analysis.hasOwnable && !analysis.hasERC721 && !analysis.isProxy) {
      // Simple contract with owner functionality
      contractName = 'PixelGoblinONFTAdapter';
      likelySourceCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract PixelGoblinONFTAdapter {
    address private _owner;
    address public immutable token;
    mapping(uint32 => bytes32) public peers;
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor(address _token, address _endpoint, address _delegate) {
        token = _token;
        _owner = _delegate;
        emit OwnershipTransferred(address(0), _delegate);
    }
    
    function owner() public view returns (address) {
        return _owner;
    }
    
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }
    
    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
    
    function setPeer(uint32 _eid, bytes32 _peer) external onlyOwner {
        peers[_eid] = _peer;
    }
}`;
    } else if (analysis.isProxy) {
      // This is a proxy contract
      contractName = 'PixelGoblinProxy';
      likelySourceCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract PixelGoblinProxy {
    address private _implementation;
    address private _admin;
    
    constructor(address implementation, address admin) {
        _implementation = implementation;
        _admin = admin;
    }
    
    fallback() external payable {
        address impl = _implementation;
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}`;
    }
    
    // Try multiple verification attempts with different settings
    const verificationAttempts = [
      {
        name: 'Exact Match Attempt',
        sourceCode: likelySourceCode,
        contractName: contractName,
        compilerVersion: 'v0.8.22+commit.4fc1097e',
        optimization: '1',
        runs: '200',
        constructorArgs: '' // Try without constructor args first
      },
      {
        name: 'No Optimization',
        sourceCode: likelySourceCode,
        contractName: contractName,
        compilerVersion: 'v0.8.22+commit.4fc1097e',
        optimization: '0',
        runs: '200',
        constructorArgs: ''
      },
      {
        name: 'Different Compiler',
        sourceCode: likelySourceCode,
        contractName: contractName,
        compilerVersion: 'v0.8.20+commit.a1b79de6',
        optimization: '1',
        runs: '200',
        constructorArgs: ''
      }
    ];
    
    const results = [];
    
    for (let i = 0; i < verificationAttempts.length; i++) {
      const attempt = verificationAttempts[i];
      console.log(`🧪 Attempting verification ${i + 1}/${verificationAttempts.length}: ${attempt.name}`);
      
      try {
        // Wait to avoid rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        const verificationData = {
          apikey: apiKey,
          chainid: '1',
          module: 'contract',
          action: 'verifysourcecode',
          contractaddress: contractAddress,
          sourceCode: attempt.sourceCode,
          codeformat: 'solidity-single-file',
          contractname: attempt.contractName,
          compilerversion: attempt.compilerVersion,
          optimizationUsed: attempt.optimization,
          runs: attempt.runs,
          constructorArguements: attempt.constructorArgs,
          licenseType: '3'
        };
        
        const verifyUrl = 'https://api.etherscan.io/v2/api';
        const verifyResponse = await axios.post(verifyUrl, verificationData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 30000
        });
        
        const result = {
          attempt: i + 1,
          name: attempt.name,
          success: verifyResponse.data?.status === '1',
          guid: verifyResponse.data?.result,
          response: verifyResponse.data,
          error: verifyResponse.data?.status !== '1' ? verifyResponse.data?.result : null
        };
        
        results.push(result);
        
        console.log(`📋 Attempt ${i + 1} result:`, result.success ? 'SUCCESS' : 'FAILED');
        
        if (result.success) {
          console.log('✅ Verification submitted successfully!');
          break; // Stop on first success
        }
        
      } catch (error) {
        results.push({
          attempt: i + 1,
          name: attempt.name,
          success: false,
          error: error.message,
          details: error.response?.data
        });
      }
    }
    
    const successfulAttempt = results.find(r => r.success);
    
    return res.status(200).json({
      success: true,
      contractAddress: contractAddress,
      deployedBytecode: {
        length: deployedBytecode.length,
        preview: deployedBytecode.substring(0, 200) + '...',
        full: deployedBytecode
      },
      analysis: analysis,
      likelySourceCode: likelySourceCode,
      verificationAttempts: results,
      successfulAttempt: successfulAttempt || null,
      verificationSubmitted: !!successfulAttempt,
      guid: successfulAttempt?.guid || null,
      recommendations: [
        'Analyzed deployed bytecode patterns',
        `Contract appears to be: ${contractName}`,
        analysis.isProxy ? 'This looks like a proxy contract' : 'This looks like a direct implementation',
        successfulAttempt ? 'New verification submitted!' : 'All attempts failed - may need manual analysis'
      ]
    });
    
  } catch (error) {
    console.error('❌ Bytecode analysis failed:', error);
    return res.status(500).json({
      success: false,
      error: `Bytecode analysis failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
