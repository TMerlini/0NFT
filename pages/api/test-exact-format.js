// Test the exact constructor format we know should work
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { paymentTxHash, userAddress, customConstructorArgs } = req.body;
    
    console.log('🧪 Testing exact constructor format that should work...');
    
    // Use custom constructor args if provided, otherwise use default
    const exactConstructorArgs = customConstructorArgs || '0000000000000000000000006559807ffd23965d3af54ee454bc69f113ed06ef0000000000000000000000001a44076050125825900e736c501f58089c167c000000000000000000000000ab705b9734cb776a8f5b18c9036c14c6828933f';
    
    console.log('📋 Using exact constructor args:', exactConstructorArgs);
    console.log('📋 Length:', exactConstructorArgs.length);
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }
    
    // Use V2 API with chainid
    const baseUrl = 'https://api.etherscan.io/v2/api';
    const chainId = '1';
    
    const verificationData = {
      apikey: apiKey,
      chainid: chainId,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: '0x810b68b2b502366f95e09cF10afd294c5A0b3426',
      sourceCode: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract PixelGoblinONFTAdapter {
    address private immutable _token;
    address private immutable _endpoint;
    address public owner;
    mapping(uint32 => uint256) public peers;
    
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    
    constructor(address token_, address endpoint_, address delegate_) {
        _token = token_;
        _endpoint = endpoint_;
        owner = delegate_;
        emit OwnershipTransferred(address(0), delegate_);
    }
    
    function token() external view returns (address) {
        return _token;
    }
    
    function endpoint() external view returns (address) {
        return _endpoint;
    }
    
    function name() external pure returns (string memory) {
        return "Pixel Goblins";
    }
    
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Ownable: caller is not the owner");
        _;
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }
    
    function setPeer(uint32 eid, uint256 peer) external onlyOwner {
        peers[eid] = peer;
    }
}`,
      codeformat: 'solidity-single-file',
      contractname: 'PixelGoblinONFTAdapter',
      compilerversion: 'v0.8.22+commit.4fc1097e',
      optimizationUsed: '1',
      runs: '200',
      constructorArguements: exactConstructorArgs, // Note: Etherscan API uses this spelling
      licenseType: '3'
    };
    
    console.log('📡 Submitting to Etherscan V2 API...');
    console.log('🔑 API Key:', apiKey ? `${apiKey.substring(0, 8)}...` : 'Not found');
    console.log('🔗 Chain ID:', chainId);
    
    // Wait 3 seconds to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const response = await axios.post(baseUrl, verificationData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 30000
    });
    
    console.log('📡 Etherscan API Response:', response.data);
    
    if (response.data && response.data.status === '1') {
      const guid = response.data.result;
      console.log('✅ SUCCESS! Verification submitted!');
      console.log('🆔 GUID:', guid);
      
      return res.status(200).json({
        success: true,
        message: 'Contract verification submitted successfully with exact format!',
        guid: guid,
        constructorArgs: exactConstructorArgs,
        explorerUrl: `https://etherscan.io/address/0x810b68b2b502366f95e09cF10afd294c5A0b3426#code`,
        verificationUrl: `https://etherscan.io/address/0x810b68b2b502366f95e09cF10afd294c5A0b3426#code`
      });
    } else {
      console.error('❌ Etherscan API Error:', response.data);
      return res.status(500).json({
        success: false,
        error: response.data?.result || 'Etherscan API returned error',
        details: response.data,
        constructorArgs: exactConstructorArgs
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return res.status(500).json({
      success: false,
      error: `Test failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
