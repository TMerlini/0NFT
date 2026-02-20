// Analyze the actual deployed contract to understand what was deployed
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    const deploymentTx = '0x8f991ffb5de1632c0bcac8c845691ce7f300a34e1ade2a9275e3bf3fbc8cb770';
    
    console.log('🔍 Analyzing deployed contract:', contractAddress);
    console.log('🔍 Deployment transaction:', deploymentTx);
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }
    
    const analysis = {};
    
    // 1. Get the actual deployed bytecode
    console.log('📡 Getting deployed bytecode...');
    try {
      const bytecodeUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
      const bytecodeResponse = await axios.get(bytecodeUrl);
      
      analysis.deployedBytecode = {
        success: true,
        bytecode: bytecodeResponse.data?.result,
        length: bytecodeResponse.data?.result?.length || 0,
        preview: bytecodeResponse.data?.result?.substring(0, 200) + '...'
      };
    } catch (error) {
      analysis.deployedBytecode = { success: false, error: error.message };
    }
    
    // 2. Get the deployment transaction details
    console.log('📡 Getting deployment transaction...');
    try {
      const txUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${deploymentTx}&apikey=${apiKey}`;
      const txResponse = await axios.get(txUrl);
      
      const transaction = txResponse.data?.result;
      
      analysis.deploymentTransaction = {
        success: true,
        transaction: transaction,
        inputData: transaction?.input,
        inputLength: transaction?.input?.length || 0,
        from: transaction?.from,
        to: transaction?.to,
        value: transaction?.value,
        gasUsed: transaction?.gas
      };
      
      // Try to extract constructor arguments from the input data
      if (transaction?.input && transaction.input.length > 2) {
        const inputData = transaction.input;
        
        // The input data structure is: creation_bytecode + constructor_arguments
        // We need to find where the creation bytecode ends and constructor args begin
        
        // Common approach: constructor args are usually at the end
        // Let's try different lengths
        const possibleConstructorArgs = [];
        
        // Try last 64, 128, 192, 256 characters
        for (const length of [64, 128, 192, 256]) {
          if (inputData.length >= length + 2) {
            const args = inputData.slice(-length);
            if (/^[0-9a-fA-F]+$/.test(args)) {
              possibleConstructorArgs.push({
                length: length,
                args: args,
                description: `Last ${length} characters`
              });
            }
          }
        }
        
        analysis.constructorArgs = possibleConstructorArgs;
      }
      
    } catch (error) {
      analysis.deploymentTransaction = { success: false, error: error.message };
    }
    
    // 3. Try to determine what type of contract this is
    console.log('🔍 Analyzing contract type...');
    
    const contractAnalysis = {
      isProxy: false,
      hasConstructor: false,
      likelyType: 'unknown',
      suggestions: []
    };
    
    if (analysis.deployedBytecode?.bytecode) {
      const bytecode = analysis.deployedBytecode.bytecode;
      
      // Check for common patterns
      if (bytecode.includes('363d3d373d3d3d363d73')) {
        contractAnalysis.isProxy = true;
        contractAnalysis.likelyType = 'proxy';
        contractAnalysis.suggestions.push('This appears to be a proxy contract');
      }
      
      // Check bytecode length
      if (bytecode.length < 1000) {
        contractAnalysis.suggestions.push('Very small bytecode - might be a simple contract or proxy');
      } else if (bytecode.length > 10000) {
        contractAnalysis.suggestions.push('Large bytecode - likely a complex contract with many functions');
      }
      
      // Check for LayerZero patterns (if any)
      if (bytecode.toLowerCase().includes('layerzero') || bytecode.toLowerCase().includes('onft')) {
        contractAnalysis.suggestions.push('May contain LayerZero or ONFT related code');
      }
    }
    
    analysis.contractAnalysis = contractAnalysis;
    
    // 4. Provide recommendations
    const recommendations = [
      'The verification failed because the source code doesn\'t match the deployed bytecode',
      'This could be due to:'
    ];
    
    if (contractAnalysis.isProxy) {
      recommendations.push('• Contract is a proxy - you need to verify the implementation contract instead');
    } else {
      recommendations.push('• Wrong compiler version (try different versions)');
      recommendations.push('• Wrong optimization settings (try with/without optimization)');
      recommendations.push('• Missing imports or inheritance');
      recommendations.push('• Wrong constructor arguments');
    }
    
    recommendations.push('• The contract might use a different source code structure');
    
    return res.status(200).json({
      success: true,
      contractAddress: contractAddress,
      deploymentTx: deploymentTx,
      analysis: analysis,
      recommendations: recommendations,
      nextSteps: [
        'Check if this is a proxy contract',
        'Try different compiler versions (0.8.20, 0.8.21, 0.8.23)',
        'Try with optimization disabled',
        'Check if the contract uses OpenZeppelin imports',
        'Verify the constructor arguments are correct'
      ]
    });
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return res.status(500).json({
      success: false,
      error: `Analysis failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
