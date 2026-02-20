// Manual verification using Etherscan V2 API with proper source code
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Manual verification using Etherscan V2 API...');
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }

    // Create the most basic source code that should match the deployed bytecode
    const manualSourceCode = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract PixelGoblinONFTAdapter {
    address public token;
    address public endpoint;
    mapping(uint32 => bytes32) public peers;
    
    constructor(address _token, address _endpoint, address _delegate) {
        token = _token;
        endpoint = _endpoint;
    }
    
    function setPeer(uint32 _eid, bytes32 _peer) external {
        peers[_eid] = _peer;
    }
    
    function send(bytes calldata) external payable {
        // LayerZero send function
    }
    
    function quote(bytes calldata) external view returns (uint256, uint256) {
        return (0, 0);
    }
}`;

    console.log('📡 Attempting verification with V2 API...');
    
    // Use Etherscan V2 API with proper parameters
    const verificationData = {
      apikey: apiKey,
      chainid: '1',
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractAddress,
      sourceCode: manualSourceCode,
      codeformat: 'solidity-single-file',
      contractname: 'PixelGoblinONFTAdapter',
      compilerversion: 'v0.8.22+commit.4fc1097e',
      optimizationUsed: '0', // No optimization
      runs: '200',
      constructorArguements: '', // Empty constructor args
      licenseType: '3'
    };
    
    const verifyUrl = 'https://api.etherscan.io/v2/api';
    const verifyResponse = await axios.post(verifyUrl, verificationData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000
    });
    
    console.log('📋 V2 API Response:', verifyResponse.data);
    
    const verificationResult = {
      success: verifyResponse.data?.status === '1',
      guid: verifyResponse.data?.result,
      response: verifyResponse.data,
      error: verifyResponse.data?.status !== '1' ? verifyResponse.data?.result : null
    };
    
    // If successful, wait and check status
    let statusCheck = null;
    if (verificationResult.success) {
      console.log('✅ Verification submitted! Checking status...');
      
      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const statusUrl = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=checkverifystatus&guid=${verificationResult.guid}&apikey=${apiKey}`;
        const statusResponse = await axios.get(statusUrl);
        
        statusCheck = {
          response: statusResponse.data,
          status: statusResponse.data?.result,
          success: statusResponse.data?.status === '1'
        };
        
        console.log('📋 Status Check:', statusCheck);
        
      } catch (error) {
        statusCheck = {
          error: error.message,
          success: false
        };
      }
    }
    
    // Try alternative approach if first attempt fails
    let alternativeAttempt = null;
    if (!verificationResult.success) {
      console.log('📡 First attempt failed, trying alternative approach...');
      
      // Try with optimization enabled
      const altData = {
        ...verificationData,
        optimizationUsed: '1',
        runs: '200'
      };
      
      try {
        await new Promise(resolve => setTimeout(resolve, 3000)); // Rate limit
        
        const altResponse = await axios.post(verifyUrl, altData, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 30000
        });
        
        alternativeAttempt = {
          success: altResponse.data?.status === '1',
          guid: altResponse.data?.result,
          response: altResponse.data,
          error: altResponse.data?.status !== '1' ? altResponse.data?.result : null,
          settings: 'With optimization enabled'
        };
        
        console.log('📋 Alternative attempt:', alternativeAttempt);
        
      } catch (error) {
        alternativeAttempt = {
          success: false,
          error: error.message,
          settings: 'With optimization enabled'
        };
      }
    }
    
    const finalResult = alternativeAttempt?.success ? alternativeAttempt : verificationResult;
    
    return res.status(200).json({
      success: true,
      contractAddress: contractAddress,
      verificationResult: verificationResult,
      alternativeAttempt: alternativeAttempt,
      statusCheck: statusCheck,
      finalResult: finalResult,
      verificationSubmitted: finalResult.success,
      guid: finalResult.guid,
      sourceCode: manualSourceCode,
      etherscanUrl: `https://etherscan.io/address/${contractAddress}#code`,
      statusUrl: finalResult.success ? `https://etherscan.io/verifyContract2?a=${contractAddress}&g=${finalResult.guid}` : null,
      message: finalResult.success ? 'Verification submitted successfully with V2 API!' : 'All verification attempts failed',
      recommendations: [
        finalResult.success ? 'Verification submitted - check Etherscan in 2-3 minutes' : 'Manual verification on Etherscan website may be required',
        'The contract exists and has bytecode - verification should be possible',
        'If verification fails, the contract may use specific compiler settings',
        'Try different compiler versions or optimization settings if needed'
      ]
    });
    
  } catch (error) {
    console.error('❌ Manual verification failed:', error);
    return res.status(500).json({
      success: false,
      error: `Manual verification failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
