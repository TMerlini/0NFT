// Detailed contract verification check
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Detailed contract check for:', contractAddress);
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }
    
    const results = {};
    
    // 1. Check source code (most reliable verification check)
    console.log('📡 Checking source code...');
    try {
      const sourceUrl = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
      const sourceResponse = await axios.get(sourceUrl);
      
      results.sourceCodeCheck = {
        success: true,
        data: sourceResponse.data,
        isVerified: sourceResponse.data?.result?.[0]?.SourceCode !== '',
        sourceCodeLength: sourceResponse.data?.result?.[0]?.SourceCode?.length || 0,
        contractName: sourceResponse.data?.result?.[0]?.ContractName || null,
        compilerVersion: sourceResponse.data?.result?.[0]?.CompilerVersion || null,
        constructorArguments: sourceResponse.data?.result?.[0]?.ConstructorArguments || null
      };
    } catch (error) {
      results.sourceCodeCheck = { success: false, error: error.message };
    }
    
    // 2. Check contract bytecode
    console.log('📡 Checking bytecode...');
    try {
      const bytecodeUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
      const bytecodeResponse = await axios.get(bytecodeUrl);
      
      results.bytecodeCheck = {
        success: true,
        bytecode: bytecodeResponse.data?.result,
        bytecodeLength: bytecodeResponse.data?.result?.length || 0,
        hasCode: bytecodeResponse.data?.result !== '0x'
      };
    } catch (error) {
      results.bytecodeCheck = { success: false, error: error.message };
    }
    
    // 3. Check if address exists and has transactions
    console.log('📡 Checking address info...');
    try {
      const balanceUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
      const balanceResponse = await axios.get(balanceUrl);
      
      results.addressCheck = {
        success: true,
        balance: balanceResponse.data?.result,
        exists: balanceResponse.data?.result !== undefined
      };
    } catch (error) {
      results.addressCheck = { success: false, error: error.message };
    }
    
    // 4. Try to get contract creation info using different method
    console.log('📡 Checking contract creation...');
    try {
      const creationUrl = `https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${apiKey}`;
      const creationResponse = await axios.get(creationUrl);
      
      results.creationCheck = {
        success: true,
        data: creationResponse.data,
        hasCreationInfo: creationResponse.data?.result?.length > 0,
        creationTx: creationResponse.data?.result?.[0]?.txHash,
        creator: creationResponse.data?.result?.[0]?.contractCreator
      };
    } catch (error) {
      results.creationCheck = { success: false, error: error.message };
    }
    
    // 5. If we have creation tx, get its details
    if (results.creationCheck?.creationTx) {
      console.log('📡 Getting creation transaction details...');
      try {
        const txUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${results.creationCheck.creationTx}&apikey=${apiKey}`;
        const txResponse = await axios.get(txUrl);
        
        results.creationTxCheck = {
          success: true,
          transaction: txResponse.data?.result,
          inputDataLength: txResponse.data?.result?.input?.length || 0,
          inputData: txResponse.data?.result?.input
        };
      } catch (error) {
        results.creationTxCheck = { success: false, error: error.message };
      }
    }
    
    // Analyze results
    const analysis = {
      contractExists: results.addressCheck?.exists || false,
      hasCode: results.bytecodeCheck?.hasCode || false,
      isVerified: results.sourceCodeCheck?.isVerified || false,
      verificationStatus: 'unknown'
    };
    
    if (!analysis.contractExists) {
      analysis.verificationStatus = 'contract_not_found';
    } else if (!analysis.hasCode) {
      analysis.verificationStatus = 'no_code';
    } else if (analysis.isVerified) {
      analysis.verificationStatus = 'verified';
    } else {
      analysis.verificationStatus = 'not_verified';
    }
    
    console.log('📋 Analysis result:', analysis.verificationStatus);
    
    return res.status(200).json({
      success: true,
      contractAddress: contractAddress,
      analysis: analysis,
      results: results,
      etherscanUrl: `https://etherscan.io/address/${contractAddress}`,
      recommendations: [
        `Contract status: ${analysis.verificationStatus}`,
        analysis.isVerified ? 'Contract is verified' : 'Contract needs verification',
        results.creationCheck?.creationTx ? `Creation tx: ${results.creationCheck.creationTx}` : 'No creation tx found'
      ]
    });
    
  } catch (error) {
    console.error('❌ Detailed check failed:', error);
    return res.status(500).json({
      success: false,
      error: `Detailed check failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
