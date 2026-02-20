// Final verification check using V2 APIs and direct verification attempt
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Final verification check for:', contractAddress);
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }
    
    // Use V2 API for source code check
    console.log('📡 Checking source code with V2 API...');
    const sourceUrl = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
    
    let sourceResult = null;
    try {
      const sourceResponse = await axios.get(sourceUrl);
      sourceResult = {
        success: true,
        data: sourceResponse.data,
        isVerified: sourceResponse.data?.result?.[0]?.SourceCode !== '' && sourceResponse.data?.result?.[0]?.SourceCode !== null,
        sourceCode: sourceResponse.data?.result?.[0]?.SourceCode || '',
        contractName: sourceResponse.data?.result?.[0]?.ContractName || null,
        compilerVersion: sourceResponse.data?.result?.[0]?.CompilerVersion || null,
        constructorArguments: sourceResponse.data?.result?.[0]?.ConstructorArguments || null
      };
    } catch (error) {
      sourceResult = { success: false, error: error.message };
    }
    
    console.log('📋 V2 Source check result:', sourceResult.isVerified ? 'VERIFIED' : 'NOT VERIFIED');
    
    // If not verified, let's try to verify it with a simple format
    let verificationAttempt = null;
    if (!sourceResult.isVerified) {
      console.log('🧪 Contract is not verified. Attempting verification...');
      
      // Try the simplest possible verification with no constructor args
      const verificationData = {
        apikey: apiKey,
        chainid: '1',
        module: 'contract',
        action: 'verifysourcecode',
        contractaddress: contractAddress,
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
        constructorArguements: '', // Try with empty constructor args first
        licenseType: '3'
      };
      
      try {
        // Wait to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const verifyUrl = 'https://api.etherscan.io/v2/api';
        const verifyResponse = await axios.post(verifyUrl, verificationData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 30000
        });
        
        verificationAttempt = {
          success: true,
          response: verifyResponse.data,
          submitted: verifyResponse.data?.status === '1',
          guid: verifyResponse.data?.result,
          error: verifyResponse.data?.result
        };
        
        console.log('📡 Verification attempt result:', verificationAttempt.submitted ? 'SUBMITTED' : 'FAILED');
        
      } catch (error) {
        verificationAttempt = {
          success: false,
          error: error.message,
          details: error.response?.data
        };
      }
    }
    
    // Final assessment
    const finalStatus = {
      contractAddress: contractAddress,
      isActuallyVerified: sourceResult.isVerified,
      verificationAttempted: verificationAttempt !== null,
      verificationSubmitted: verificationAttempt?.submitted || false,
      verificationGuid: verificationAttempt?.guid || null,
      sourceCodeLength: sourceResult.sourceCode?.length || 0,
      hasValidSourceCode: (sourceResult.sourceCode?.length || 0) > 100,
      etherscanUrl: `https://etherscan.io/address/${contractAddress}#code`
    };
    
    return res.status(200).json({
      success: true,
      status: finalStatus,
      sourceResult: sourceResult,
      verificationAttempt: verificationAttempt,
      recommendations: [
        finalStatus.isActuallyVerified ? '✅ Contract is verified' : '❌ Contract is NOT verified',
        finalStatus.verificationSubmitted ? `✅ Verification submitted with GUID: ${finalStatus.verificationGuid}` : '❌ No verification submitted',
        finalStatus.verificationSubmitted ? '⏳ Check Etherscan in 2-5 minutes for verification status' : '🔧 Manual verification may be needed',
        `🔗 View on Etherscan: ${finalStatus.etherscanUrl}`
      ]
    });
    
  } catch (error) {
    console.error('❌ Final check failed:', error);
    return res.status(500).json({
      success: false,
      error: `Final check failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
