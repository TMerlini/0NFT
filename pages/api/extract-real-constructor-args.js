// Extract the real constructor arguments from the deployment transaction
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const deploymentTx = '0x8f991ffb5de1632c0bcac8c845691ce7f300a34e1ade2a9275e3bf3fbc8cb770';
    
    console.log('🔍 Extracting real constructor arguments from deployment transaction...');
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }
    
    // Get the deployment transaction details
    console.log('📡 Fetching deployment transaction...');
    const txUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=${deploymentTx}&apikey=${apiKey}`;
    const txResponse = await axios.get(txUrl);
    
    if (!txResponse.data?.result) {
      throw new Error('Transaction not found');
    }
    
    const transaction = txResponse.data.result;
    const inputData = transaction.input;
    
    console.log('📋 Transaction details:');
    console.log('From:', transaction.from);
    console.log('To:', transaction.to);
    console.log('Input length:', inputData?.length || 0);
    console.log('Input preview:', inputData?.substring(0, 100) + '...');
    
    // For contract creation, the input contains both bytecode and constructor args
    // The constructor args are at the end of the input data
    
    // Let's also try verification WITHOUT constructor arguments first
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    const simpleSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract PixelGoblinONFTAdapter {
    address public token;
    address public endpoint;
    address public owner;
    
    constructor(address _token, address _endpoint, address _delegate) {
        token = _token;
        endpoint = _endpoint;
        owner = _delegate;
    }
}`;

    console.log('🧪 Attempting verification WITHOUT constructor arguments...');
    
    // Try verification without constructor arguments
    const verificationData = {
      apikey: apiKey,
      chainid: '1',
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractAddress,
      sourceCode: simpleSource,
      codeformat: 'solidity-single-file',
      contractname: 'PixelGoblinONFTAdapter',
      compilerversion: 'v0.8.22+commit.4fc1097e',
      optimizationUsed: '1',
      runs: '200',
      // NO constructor arguments
      licenseType: '3'
    };
    
    const verifyUrl = 'https://api.etherscan.io/v2/api';
    const verifyResponse = await axios.post(verifyUrl, verificationData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000
    });
    
    const verificationResult = {
      success: verifyResponse.data?.status === '1',
      guid: verifyResponse.data?.result,
      response: verifyResponse.data,
      error: verifyResponse.data?.status !== '1' ? verifyResponse.data?.result : null
    };
    
    // Also try to extract constructor args from the input data
    let extractedArgs = null;
    if (inputData && inputData.length > 2) {
      // Try to find where the constructor args start
      // This is tricky without the exact bytecode, but we can make educated guesses
      
      // Common patterns for constructor args extraction
      const possibleArgStarts = [];
      
      // Look for our known addresses in the input data
      const tokenAddress = '6559807ffd23965d3af54ee454bc69f113ed06ef'; // without 0x
      const endpointAddress = '1a44076050125825900e736c501f58089c167c'; // without 0x  
      const delegateAddress = '0ab705b9734cb776a8f5b18c9036c14c6828933f'; // without 0x
      
      const tokenIndex = inputData.toLowerCase().indexOf(tokenAddress.toLowerCase());
      const endpointIndex = inputData.toLowerCase().indexOf(endpointAddress.toLowerCase());
      const delegateIndex = inputData.toLowerCase().indexOf(delegateAddress.toLowerCase());
      
      if (tokenIndex > 0) {
        // Found token address, constructor args likely start before it
        const argsStart = tokenIndex - 24; // 24 chars for padding
        if (argsStart > 0) {
          extractedArgs = inputData.substring(argsStart);
        }
      }
    }
    
    return res.status(200).json({
      success: true,
      deploymentTx: deploymentTx,
      transaction: {
        from: transaction.from,
        to: transaction.to,
        inputLength: inputData?.length || 0,
        inputPreview: inputData?.substring(0, 200) + '...',
        fullInput: inputData
      },
      verificationWithoutArgs: verificationResult,
      extractedArgs: extractedArgs,
      knownAddresses: {
        token: '0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef',
        endpoint: '0x1a44076050125825900e736c501f58089c167c',
        delegate: '0x0aB705B9734CB776A8F5b18c9036c14C6828933F'
      },
      recommendations: [
        verificationResult.success ? 'Verification without constructor args succeeded!' : 'Verification without constructor args failed',
        extractedArgs ? `Possible constructor args found: ${extractedArgs.substring(0, 100)}...` : 'Could not extract constructor args from transaction',
        'Try manual verification on Etherscan with the simple source code',
        'If that fails, the contract might use different source code structure'
      ]
    });
    
  } catch (error) {
    console.error('❌ Constructor extraction failed:', error);
    return res.status(500).json({
      success: false,
      error: `Constructor extraction failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
