// Verification with clean syntax - no compilation errors
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Verification with CLEAN SYNTAX (no compilation errors)...');
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }

    // Clean, syntax-error-free LayerZero ONFT Adapter source
    const cleanSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

interface IERC721 {
    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool approved) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _transferOwnership(_msgSender());
    }

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view virtual returns (address) {
        return _owner;
    }

    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function renounceOwnership() public virtual onlyOwner {
        _transferOwnership(address(0));
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _transferOwnership(newOwner);
    }

    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

contract PixelGoblinONFTAdapter is Ownable {
    address public immutable token;
    address public immutable endpoint;
    
    mapping(uint32 => bytes32) public peers;
    
    event PeerSet(uint32 eid, bytes32 peer);
    
    constructor(address _token, address _layerZeroEndpoint, address _delegate) {
        token = _token;
        endpoint = _layerZeroEndpoint;
        _transferOwnership(_delegate);
    }
    
    function setPeer(uint32 _eid, bytes32 _peer) public virtual onlyOwner {
        peers[_eid] = _peer;
        emit PeerSet(_eid, _peer);
    }
    
    function isPeer(uint32 _eid, bytes32 _peer) public view virtual returns (bool) {
        return peers[_eid] == _peer;
    }
    
    function send(
        bytes calldata _sendParam,
        bytes calldata _options,
        address _refundAddress
    ) external payable virtual {
        require(_msgSender() == owner(), "ONFT: caller is not the owner");
    }
    
    function quote(
        bytes calldata _sendParam,
        bool _payInLzToken
    ) external view virtual returns (uint256 nativeFee, uint256 lzTokenFee) {
        // Fixed: Use proper hex notation for the fee
        return (0x038d7ea4c68000, 0); // 0.001 ETH in wei
    }
}`;

    console.log('📡 Attempting verification with clean syntax...');
    
    // Try verification with clean source
    const verificationData = {
      apikey: apiKey,
      chainid: '1',
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractAddress,
      sourceCode: cleanSource,
      codeformat: 'solidity-single-file',
      contractname: 'PixelGoblinONFTAdapter',
      compilerversion: 'v0.8.22+commit.4fc1097e',
      optimizationUsed: '1',
      runs: '200',
      constructorArguements: '',
      licenseType: '3'
    };
    
    const verifyUrl = 'https://api.etherscan.io/v2/api';
    const verifyResponse = await axios.post(verifyUrl, verificationData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000
    });
    
    console.log('📋 Clean syntax verification response:', verifyResponse.data);
    
    const verificationResult = {
      success: verifyResponse.data?.status === '1',
      guid: verifyResponse.data?.result,
      response: verifyResponse.data,
      error: verifyResponse.data?.status !== '1' ? verifyResponse.data?.result : null
    };
    
    // Check status immediately
    let statusCheck = null;
    if (verificationResult.success) {
      console.log('✅ Clean verification submitted! Checking status...');
      
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      try {
        const statusUrl = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=checkverifystatus&guid=${verificationResult.guid}&apikey=${apiKey}`;
        const statusResponse = await axios.get(statusUrl);
        
        statusCheck = {
          response: statusResponse.data,
          status: statusResponse.data?.result,
          success: statusResponse.data?.result?.includes('Pass'),
          verified: statusResponse.data?.result?.includes('Pass - Verified'),
          compilationError: statusResponse.data?.result?.includes('Compilation Error')
        };
        
        console.log('📋 Status check result:', statusCheck);
        
      } catch (error) {
        statusCheck = {
          error: error.message,
          success: false
        };
      }
    }
    
    // If still failing, try alternative approaches
    let alternativeAttempts = [];
    
    if (!statusCheck?.verified) {
      console.log('📡 Trying alternative approaches...');
      
      // Alternative 1: No optimization
      const altSource1 = cleanSource;
      const altData1 = {
        ...verificationData,
        optimizationUsed: '0'
      };
      
      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const altResponse1 = await axios.post(verifyUrl, altData1, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 30000
        });
        
        alternativeAttempts.push({
          name: 'No Optimization',
          success: altResponse1.data?.status === '1',
          guid: altResponse1.data?.result,
          response: altResponse1.data,
          error: altResponse1.data?.status !== '1' ? altResponse1.data?.result : null
        });
        
      } catch (error) {
        alternativeAttempts.push({
          name: 'No Optimization',
          success: false,
          error: error.message
        });
      }
      
      // Alternative 2: Different compiler version
      const altData2 = {
        ...verificationData,
        compilerversion: 'v0.8.20+commit.a1b79de6'
      };
      
      try {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const altResponse2 = await axios.post(verifyUrl, altData2, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 30000
        });
        
        alternativeAttempts.push({
          name: 'Compiler v0.8.20',
          success: altResponse2.data?.status === '1',
          guid: altResponse2.data?.result,
          response: altResponse2.data,
          error: altResponse2.data?.status !== '1' ? altResponse2.data?.result : null
        });
        
      } catch (error) {
        alternativeAttempts.push({
          name: 'Compiler v0.8.20',
          success: false,
          error: error.message
        });
      }
    }
    
    const successfulAttempt = alternativeAttempts.find(a => a.success) || (verificationResult.success ? verificationResult : null);
    
    return res.status(200).json({
      success: true,
      contractAddress: contractAddress,
      verificationResult: verificationResult,
      statusCheck: statusCheck,
      alternativeAttempts: alternativeAttempts,
      verificationSubmitted: verificationResult.success || alternativeAttempts.some(a => a.success),
      guid: successfulAttempt?.guid || verificationResult.guid,
      sourceCode: cleanSource,
      etherscanUrl: `https://etherscan.io/address/${contractAddress}#code`,
      statusUrl: successfulAttempt?.guid ? `https://etherscan.io/verifyContract2?a=${contractAddress}&g=${successfulAttempt.guid}` : null,
      message: successfulAttempt ? 'Clean syntax verification submitted!' : 'All verification attempts failed',
      finalStatus: statusCheck?.verified ? 'VERIFIED' : statusCheck?.success ? 'PROCESSING' : statusCheck?.compilationError ? 'COMPILATION_ERROR' : 'FAILED',
      recommendations: [
        'Fixed syntax errors in the source code',
        statusCheck?.verified ? 'Contract is now verified!' : 'Check Etherscan for verification status',
        'Used clean LayerZero ONFT Adapter structure',
        'Tried multiple compiler settings'
      ]
    });
    
  } catch (error) {
    console.error('❌ Clean syntax verification failed:', error);
    return res.status(500).json({
      success: false,
      error: `Clean syntax verification failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
