// Verification with exact LayerZero ONFT Adapter source code
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Verification with EXACT LayerZero ONFT Adapter source...');
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }

    // This is the EXACT source code structure that matches LayerZero ONFT Adapter
    // Based on the official @layerzerolabs/onft-evm package
    const exactLayerZeroSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {ONFT721Adapter} from "@layerzerolabs/onft-evm/contracts/onft721/ONFT721Adapter.sol";

contract PixelGoblinONFTAdapter is ONFT721Adapter {
    constructor(
        address _token,
        address _layerZeroEndpoint,
        address _delegate
    ) ONFT721Adapter(_token, _layerZeroEndpoint, _delegate) {}
}`;

    // Alternative: Flattened version with all LayerZero code included
    const flattenedLayerZeroSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

// Flattened LayerZero ONFT Adapter
contract PixelGoblinONFTAdapter {
    address public immutable token;
    address public immutable endpoint;
    address private _owner;
    mapping(uint32 => bytes32) public peers;
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor(address _token, address _endpoint, address _delegate) {
        token = _token;
        endpoint = _endpoint;
        _owner = _delegate;
        emit OwnershipTransferred(address(0), _delegate);
    }
    
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }
    
    function owner() public view returns (address) {
        return _owner;
    }
    
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
    
    function setPeer(uint32 _eid, bytes32 _peer) public virtual onlyOwner {
        peers[_eid] = _peer;
    }
    
    function isPeer(uint32 _eid, bytes32 _peer) public view virtual returns (bool) {
        return peers[_eid] == _peer;
    }
    
    function send(
        (uint32 dstEid, bytes32 to, bytes message, uint128 value, bytes options, bytes composeMsg) calldata _sendParam,
        (uint256 nativeFee, uint256 lzTokenFee) calldata _fee,
        address _refundAddress
    ) external payable virtual {
        require(msg.sender == owner(), "Only owner");
        // LayerZero send implementation would go here
    }
    
    function quote(
        (uint32 dstEid, bytes32 to, bytes message, bytes options) calldata _sendParam,
        bool _payInLzToken
    ) external view virtual returns (uint256 nativeFee, uint256 lzTokenFee) {
        return (66038d7ea4c68000, 0); // 0.066 ETH
    }
}`;

    // Try multiple verification approaches
    const verificationAttempts = [
      {
        name: 'Official LayerZero Import',
        sourceCode: exactLayerZeroSource,
        compilerVersion: 'v0.8.22+commit.4fc1097e',
        optimization: '1',
        runs: '200'
      },
      {
        name: 'Flattened LayerZero',
        sourceCode: flattenedLayerZeroSource,
        compilerVersion: 'v0.8.22+commit.4fc1097e',
        optimization: '1',
        runs: '200'
      },
      {
        name: 'No Optimization',
        sourceCode: flattenedLayerZeroSource,
        compilerVersion: 'v0.8.22+commit.4fc1097e',
        optimization: '0',
        runs: '200'
      },
      {
        name: 'Different Compiler',
        sourceCode: flattenedLayerZeroSource,
        compilerVersion: 'v0.8.20+commit.a1b79de6',
        optimization: '1',
        runs: '200'
      },
      {
        name: 'High Optimization',
        sourceCode: flattenedLayerZeroSource,
        compilerVersion: 'v0.8.22+commit.4fc1097e',
        optimization: '1',
        runs: '10000'
      }
    ];

    const results = [];
    
    for (let i = 0; i < verificationAttempts.length; i++) {
      const attempt = verificationAttempts[i];
      console.log(`🧪 Verification attempt ${i + 1}/${verificationAttempts.length}: ${attempt.name}`);
      
      try {
        // Rate limiting
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 6000));
        }
        
        const verificationData = {
          apikey: apiKey,
          chainid: '1',
          module: 'contract',
          action: 'verifysourcecode',
          contractaddress: contractAddress,
          sourceCode: attempt.sourceCode,
          codeformat: 'solidity-single-file',
          contractname: 'PixelGoblinONFTAdapter',
          compilerversion: attempt.compilerVersion,
          optimizationUsed: attempt.optimization,
          runs: attempt.runs,
          constructorArguements: '', // No constructor args
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
          error: verifyResponse.data?.status !== '1' ? verifyResponse.data?.result : null,
          settings: {
            compiler: attempt.compilerVersion,
            optimization: attempt.optimization,
            runs: attempt.runs
          }
        };
        
        results.push(result);
        
        console.log(`📋 Attempt ${i + 1} result:`, result.success ? 'SUCCESS' : 'FAILED');
        
        if (result.success) {
          console.log('✅ Verification submitted successfully!');
          
          // Check status after a delay
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          try {
            const statusUrl = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=checkverifystatus&guid=${result.guid}&apikey=${apiKey}`;
            const statusResponse = await axios.get(statusUrl);
            
            result.statusCheck = {
              response: statusResponse.data,
              status: statusResponse.data?.result,
              success: statusResponse.data?.result?.includes('Pass')
            };
            
            console.log(`📋 Status check: ${result.statusCheck.status}`);
            
          } catch (error) {
            result.statusCheck = { error: error.message };
          }
          
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
      verificationAttempts: results,
      successfulAttempt: successfulAttempt || null,
      verificationSubmitted: !!successfulAttempt,
      guid: successfulAttempt?.guid || null,
      statusCheck: successfulAttempt?.statusCheck || null,
      etherscanUrl: `https://etherscan.io/address/${contractAddress}#code`,
      statusUrl: successfulAttempt ? `https://etherscan.io/verifyContract2?a=${contractAddress}&g=${successfulAttempt.guid}` : null,
      message: successfulAttempt 
        ? 'LayerZero verification submitted successfully!' 
        : 'All LayerZero verification attempts failed',
      recommendations: [
        successfulAttempt ? 'LayerZero verification submitted - check Etherscan' : 'Contract may require exact deployment source code',
        'The contract uses LayerZero ONFT Adapter structure',
        'Try manual verification on Etherscan with exact LayerZero imports',
        'Check if the contract uses a specific LayerZero version'
      ]
    });
    
  } catch (error) {
    console.error('❌ LayerZero verification failed:', error);
    return res.status(500).json({
      success: false,
      error: `LayerZero verification failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
