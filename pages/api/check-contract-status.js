// Check contract verification status and details
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Checking contract status for:', contractAddress);
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }
    
    // Check if contract is already verified
    const sourceCodeUrl = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
    
    console.log('📡 Checking if contract is already verified...');
    const sourceResponse = await axios.get(sourceCodeUrl);
    
    const isVerified = sourceResponse.data?.result?.[0]?.SourceCode !== '';
    const contractName = sourceResponse.data?.result?.[0]?.ContractName || 'Unknown';
    const compilerVersion = sourceResponse.data?.result?.[0]?.CompilerVersion || 'Unknown';
    
    console.log('📋 Contract verification status:', isVerified ? 'VERIFIED' : 'NOT VERIFIED');
    console.log('📋 Contract name:', contractName);
    console.log('📋 Compiler version:', compilerVersion);
    
    // Get contract creation details
    const creationUrl = `https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${apiKey}`;
    
    console.log('📡 Getting contract creation details...');
    const creationResponse = await axios.get(creationUrl);
    
    const creationData = creationResponse.data?.result?.[0];
    const creationTxHash = creationData?.txHash;
    const creatorAddress = creationData?.contractCreator;
    
    console.log('📋 Creation tx hash:', creationTxHash);
    console.log('📋 Creator address:', creatorAddress);
    
    // Get the actual bytecode
    const bytecodeUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
    
    console.log('📡 Getting contract bytecode...');
    const bytecodeResponse = await axios.get(bytecodeUrl);
    
    const bytecode = bytecodeResponse.data?.result;
    const bytecodeLength = bytecode ? bytecode.length : 0;
    
    console.log('📋 Bytecode length:', bytecodeLength);
    
    // If not verified, let's try to get the deployment transaction details
    let deploymentInputData = null;
    if (creationTxHash) {
      const txUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${creationTxHash}&apikey=${apiKey}`;
      
      console.log('📡 Getting deployment transaction details...');
      const txResponse = await axios.get(txUrl);
      
      deploymentInputData = txResponse.data?.result?.input;
      console.log('📋 Deployment input data length:', deploymentInputData ? deploymentInputData.length : 0);
    }
    
    // Try to extract constructor args from deployment input data
    let extractedConstructorArgs = null;
    if (deploymentInputData && deploymentInputData.length > 2) {
      // Constructor args are typically at the end of the input data
      // Let's try different approaches to extract them
      
      const inputWithoutPrefix = deploymentInputData.startsWith('0x') ? deploymentInputData.slice(2) : deploymentInputData;
      
      // Try last 192 characters (3 addresses * 64 chars each)
      if (inputWithoutPrefix.length >= 192) {
        extractedConstructorArgs = inputWithoutPrefix.slice(-192);
      }
      
      console.log('📋 Extracted constructor args (last 192 chars):', extractedConstructorArgs);
    }
    
    return res.status(200).json({
      success: true,
      contractAddress: contractAddress,
      isVerified: isVerified,
      contractName: contractName,
      compilerVersion: compilerVersion,
      creationTxHash: creationTxHash,
      creatorAddress: creatorAddress,
      bytecodeLength: bytecodeLength,
      deploymentInputDataLength: deploymentInputData ? deploymentInputData.length : 0,
      extractedConstructorArgs: extractedConstructorArgs,
      sourceCodeResponse: sourceResponse.data?.result?.[0],
      recommendations: [
        isVerified ? 'Contract is already verified!' : 'Contract needs verification',
        creationTxHash ? `Use deployment tx: ${creationTxHash}` : 'No creation tx found',
        extractedConstructorArgs ? `Try constructor args: ${extractedConstructorArgs}` : 'Could not extract constructor args'
      ]
    });
    
  } catch (error) {
    console.error('❌ Status check failed:', error);
    return res.status(500).json({
      success: false,
      error: `Status check failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
