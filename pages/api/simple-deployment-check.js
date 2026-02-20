// Simple check to find the real deployment transaction
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Simple deployment check...');
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    // Method 1: Try Etherscan's contract creation API
    console.log('📡 Checking contract creation API...');
    let contractCreationResult = null;
    try {
      const creationUrl = `https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${apiKey}`;
      const creationResponse = await axios.get(creationUrl);
      
      console.log('📋 Contract creation API response:', creationResponse.data);
      contractCreationResult = creationResponse.data;
      
    } catch (error) {
      console.log('❌ Contract creation API failed:', error.message);
    }
    
    // Method 2: Get basic contract info
    console.log('📡 Getting basic contract info...');
    let contractInfo = null;
    try {
      const infoUrl = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
      const infoResponse = await axios.get(infoUrl);
      
      console.log('📋 Contract info response:', infoResponse.data);
      contractInfo = infoResponse.data;
      
    } catch (error) {
      console.log('❌ Contract info failed:', error.message);
    }
    
    // Method 3: Check current bytecode
    console.log('📡 Getting current bytecode...');
    let bytecodeInfo = null;
    try {
      const bytecodeUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
      const bytecodeResponse = await axios.get(bytecodeUrl);
      
      console.log('📋 Bytecode length:', bytecodeResponse.data?.result?.length || 0);
      bytecodeInfo = {
        length: bytecodeResponse.data?.result?.length || 0,
        preview: bytecodeResponse.data?.result?.substring(0, 100) + '...',
        full: bytecodeResponse.data?.result
      };
      
    } catch (error) {
      console.log('❌ Bytecode check failed:', error.message);
    }
    
    // Analyze results
    let actualDeploymentTx = null;
    let deploymentCreator = null;
    
    if (contractCreationResult?.result && Array.isArray(contractCreationResult.result) && contractCreationResult.result.length > 0) {
      const creation = contractCreationResult.result[0];
      actualDeploymentTx = creation.txHash;
      deploymentCreator = creation.contractCreator;
    }
    
    // Determine contract status
    const hasSourceCode = contractInfo?.result?.[0]?.SourceCode && contractInfo.result[0].SourceCode !== '';
    const contractName = contractInfo?.result?.[0]?.ContractName || 'Unknown';
    const isVerified = hasSourceCode && contractName !== 'Unknown';
    
    return res.status(200).json({
      success: true,
      contractAddress: contractAddress,
      wrongTx: '0x8f991ffb5de1632c0bcac8c845691ce7f300a34e1ade2a9275e3bf3fbc8cb770',
      actualDeploymentTx: actualDeploymentTx,
      deploymentCreator: deploymentCreator,
      contractCreationResult: contractCreationResult,
      contractInfo: contractInfo,
      bytecodeInfo: bytecodeInfo,
      analysis: {
        hasRealDeploymentTx: !!actualDeploymentTx,
        isVerified: isVerified,
        contractName: contractName,
        hasSourceCode: hasSourceCode,
        bytecodeLength: bytecodeInfo?.length || 0,
        isRealContract: (bytecodeInfo?.length || 0) > 100
      },
      explanation: actualDeploymentTx 
        ? `Found real deployment: ${actualDeploymentTx} by ${deploymentCreator}`
        : 'Could not find deployment transaction via API',
      recommendations: [
        actualDeploymentTx ? `Real deployment TX: ${actualDeploymentTx}` : 'No deployment TX found via API',
        `Contract has ${bytecodeInfo?.length || 0} bytes of bytecode`,
        isVerified ? 'Contract is already verified!' : 'Contract needs verification',
        actualDeploymentTx ? 'Use real deployment TX for verification' : 'Manual investigation needed'
      ],
      etherscanUrls: {
        contract: `https://etherscan.io/address/${contractAddress}`,
        wrongTx: `https://etherscan.io/tx/0x8f991ffb5de1632c0bcac8c845691ce7f300a34e1ade2a9275e3bf3fbc8cb770`,
        actualTx: actualDeploymentTx ? `https://etherscan.io/tx/${actualDeploymentTx}` : null
      }
    });
    
  } catch (error) {
    console.error('❌ Simple deployment check failed:', error);
    return res.status(500).json({
      success: false,
      error: `Simple deployment check failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
