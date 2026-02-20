// Analyze why the deployment resulted in a revert-only contract
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const deploymentTx = '0x8f991ffb5de1632c0bcac8c845691ce7f300a34e1ade2a9275e3bf3fbc8cb770';
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Analyzing deployment failure...');
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    // Get deployment transaction details
    const txUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=${deploymentTx}&apikey=${apiKey}`;
    const txResponse = await axios.get(txUrl);
    
    // Get transaction receipt
    const receiptUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionReceipt&txhash=${deploymentTx}&apikey=${apiKey}`;
    const receiptResponse = await axios.get(receiptUrl);
    
    // Get current bytecode
    const bytecodeUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
    const bytecodeResponse = await axios.get(bytecodeUrl);
    
    const transaction = txResponse.data?.result;
    const receipt = receiptResponse.data?.result;
    const bytecode = bytecodeResponse.data?.result;
    
    // Analyze the deployment
    const analysis = {
      transaction: {
        from: transaction?.from,
        to: transaction?.to, // Should be null for contract creation
        value: transaction?.value,
        gasLimit: transaction?.gas,
        gasPrice: transaction?.gasPrice,
        inputLength: transaction?.input?.length || 0,
        inputPreview: transaction?.input?.substring(0, 100) + '...'
      },
      receipt: {
        status: receipt?.status, // 1 = success, 0 = failed
        gasUsed: receipt?.gasUsed,
        contractAddress: receipt?.contractAddress,
        logs: receipt?.logs?.length || 0,
        logsPreview: receipt?.logs?.slice(0, 3) || []
      },
      bytecode: {
        length: bytecode?.length || 0,
        content: bytecode,
        isRevertOnly: bytecode === '0x6080604052348015600e575f80fd5b50348015601a575f80fd5b50005b' || bytecode?.length < 100
      }
    };
    
    // Determine what went wrong
    let diagnosis = 'unknown';
    let explanation = 'Unknown deployment issue';
    let solution = 'Investigate further';
    
    if (analysis.receipt.status === '0x0') {
      diagnosis = 'transaction_failed';
      explanation = 'The deployment transaction failed completely';
      solution = 'Check transaction logs for revert reason';
    } else if (analysis.transaction.to !== null) {
      diagnosis = 'not_contract_creation';
      explanation = 'This was not a contract creation transaction';
      solution = 'Use a contract creation transaction (to: null)';
    } else if (analysis.transaction.inputLength < 100) {
      diagnosis = 'no_bytecode';
      explanation = 'No contract bytecode was provided in the transaction';
      solution = 'Include proper contract bytecode in transaction data';
    } else if (analysis.bytecode.isRevertOnly) {
      diagnosis = 'revert_only_contract';
      explanation = 'Contract deployed but only contains revert functionality';
      solution = 'The constructor likely failed - check constructor arguments and logic';
    } else if (!analysis.receipt.contractAddress) {
      diagnosis = 'no_contract_created';
      explanation = 'Transaction succeeded but no contract was created';
      solution = 'Check if this was actually a contract creation transaction';
    } else {
      diagnosis = 'deployment_succeeded';
      explanation = 'Contract deployment appears to have succeeded';
      solution = 'Contract should be functional';
    }
    
    return res.status(200).json({
      success: true,
      deploymentTx: deploymentTx,
      contractAddress: contractAddress,
      analysis: analysis,
      diagnosis: diagnosis,
      explanation: explanation,
      solution: solution,
      recommendations: [
        `Diagnosis: ${diagnosis}`,
        `Issue: ${explanation}`,
        `Solution: ${solution}`,
        analysis.bytecode.isRevertOnly ? 'Contract needs to be redeployed with proper bytecode' : 'Contract may be functional',
        'Check the deployment process for errors'
      ],
      nextSteps: analysis.bytecode.isRevertOnly ? [
        'Redeploy the contract with correct parameters',
        'Ensure constructor arguments are valid',
        'Use proper LayerZero V2 bytecode',
        'Test deployment on testnet first'
      ] : [
        'Contract appears functional',
        'Verification should be possible',
        'Check for specific verification requirements'
      ]
    });
    
  } catch (error) {
    console.error('❌ Deployment analysis failed:', error);
    return res.status(500).json({
      success: false,
      error: `Deployment analysis failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
