// Check the status of our submitted verification request
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const guid = 'd4agzwjkhz6rrqfc6vssbfmcb6tcrsfu84ufg6dc91mkxbgt5v';
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Checking verification status for GUID:', guid);
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }
    
    // Check verification status using the GUID
    console.log('📡 Checking verification status...');
    const statusUrl = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=checkverifystatus&guid=${guid}&apikey=${apiKey}`;
    const statusResponse = await axios.get(statusUrl);
    
    console.log('📋 Status response:', statusResponse.data);
    
    // Also check if the contract is already verified
    console.log('📡 Checking if contract is already verified...');
    const sourceUrl = `https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=${contractAddress}&apikey=${apiKey}`;
    const sourceResponse = await axios.get(sourceUrl);
    
    console.log('📋 Source code response:', sourceResponse.data);
    
    const verificationStatus = statusResponse.data;
    const sourceCodeData = sourceResponse.data;
    
    // Analyze the results
    const analysis = {
      submissionStatus: verificationStatus?.result || 'Unknown',
      isVerified: sourceCodeData?.result?.[0]?.SourceCode !== '',
      contractName: sourceCodeData?.result?.[0]?.ContractName || 'Unknown',
      compilerVersion: sourceCodeData?.result?.[0]?.CompilerVersion || 'Unknown',
      sourceCode: sourceCodeData?.result?.[0]?.SourceCode || '',
      abi: sourceCodeData?.result?.[0]?.ABI || '',
      constructorArguments: sourceCodeData?.result?.[0]?.ConstructorArguments || ''
    };
    
    // Determine what happened
    let status = 'unknown';
    let message = 'Unknown status';
    let nextAction = 'Check manually';
    
    if (analysis.isVerified) {
      status = 'verified';
      message = 'Contract is already verified!';
      nextAction = 'No action needed';
    } else if (verificationStatus?.result === 'Pending in queue') {
      status = 'pending';
      message = 'Verification is still processing';
      nextAction = 'Wait a few more minutes and check again';
    } else if (verificationStatus?.result === 'Pass - Verified') {
      status = 'success';
      message = 'Verification completed successfully!';
      nextAction = 'Refresh the Etherscan page';
    } else if (verificationStatus?.result?.includes('Fail')) {
      status = 'failed';
      message = `Verification failed: ${verificationStatus.result}`;
      nextAction = 'Try different source code or compiler settings';
    } else {
      status = 'unknown';
      message = `Status: ${verificationStatus?.result || 'Unknown'}`;
      nextAction = 'Check the verification manually on Etherscan';
    }
    
    return res.status(200).json({
      success: true,
      guid: guid,
      contractAddress: contractAddress,
      status: status,
      message: message,
      nextAction: nextAction,
      verificationResponse: verificationStatus,
      sourceCodeResponse: sourceCodeData,
      analysis: analysis,
      etherscanUrls: {
        contract: `https://etherscan.io/address/${contractAddress}#code`,
        verificationStatus: `https://etherscan.io/verifyContract2?a=${contractAddress}&g=${guid}`
      }
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