// Verify if the contract actually exists and get real details
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    const deploymentTx = '0x8f991ffb5de1632c0bcac8c845691ce7f300a34e1ade2a9275e3bf3fbc8cb770';
    
    console.log('🔍 Verifying contract existence:', contractAddress);
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }
    
    const checks = {};
    
    // 1. Check if address exists and has balance
    console.log('📡 Checking address balance...');
    try {
      const balanceUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
      const balanceResponse = await axios.get(balanceUrl);
      
      checks.balance = {
        success: true,
        balance: balanceResponse.data?.result,
        balanceEth: balanceResponse.data?.result ? (parseInt(balanceResponse.data.result) / 1e18).toString() : '0',
        exists: balanceResponse.data?.result !== undefined
      };
    } catch (error) {
      checks.balance = { success: false, error: error.message };
    }
    
    // 2. Check transaction count (nonce)
    console.log('📡 Checking transaction count...');
    try {
      const nonceUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionCount&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
      const nonceResponse = await axios.get(nonceUrl);
      
      checks.nonce = {
        success: true,
        nonce: nonceResponse.data?.result,
        hasTransactions: nonceResponse.data?.result !== '0x0'
      };
    } catch (error) {
      checks.nonce = { success: false, error: error.message };
    }
    
    // 3. Try V2 API for bytecode
    console.log('📡 Checking bytecode with V2 API...');
    try {
      const bytecodeUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getCode&address=${contractAddress}&tag=latest&apikey=${apiKey}`;
      const bytecodeResponse = await axios.get(bytecodeUrl);
      
      checks.bytecodeV2 = {
        success: true,
        response: bytecodeResponse.data,
        bytecode: bytecodeResponse.data?.result,
        hasCode: bytecodeResponse.data?.result && bytecodeResponse.data.result !== '0x',
        length: bytecodeResponse.data?.result?.length || 0
      };
    } catch (error) {
      checks.bytecodeV2 = { success: false, error: error.message };
    }
    
    // 4. Check the deployment transaction directly
    console.log('📡 Checking deployment transaction...');
    try {
      const txUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=${deploymentTx}&apikey=${apiKey}`;
      const txResponse = await axios.get(txUrl);
      
      checks.deploymentTx = {
        success: true,
        response: txResponse.data,
        transaction: txResponse.data?.result,
        exists: txResponse.data?.result !== null,
        to: txResponse.data?.result?.to,
        from: txResponse.data?.result?.from,
        input: txResponse.data?.result?.input,
        inputLength: txResponse.data?.result?.input?.length || 0
      };
    } catch (error) {
      checks.deploymentTx = { success: false, error: error.message };
    }
    
    // 5. Get transaction receipt
    console.log('📡 Checking transaction receipt...');
    try {
      const receiptUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionReceipt&txhash=${deploymentTx}&apikey=${apiKey}`;
      const receiptResponse = await axios.get(receiptUrl);
      
      checks.receipt = {
        success: true,
        response: receiptResponse.data,
        receipt: receiptResponse.data?.result,
        contractAddress: receiptResponse.data?.result?.contractAddress,
        status: receiptResponse.data?.result?.status,
        gasUsed: receiptResponse.data?.result?.gasUsed
      };
    } catch (error) {
      checks.receipt = { success: false, error: error.message };
    }
    
    // Analysis
    const analysis = {
      addressExists: checks.balance?.exists || false,
      hasCode: checks.bytecodeV2?.hasCode || false,
      deploymentTxExists: checks.deploymentTx?.exists || false,
      contractCreated: checks.receipt?.contractAddress !== null,
      actualContractAddress: checks.receipt?.contractAddress || null,
      addressMismatch: false
    };
    
    // Check if there's an address mismatch
    if (analysis.contractCreated && analysis.actualContractAddress) {
      analysis.addressMismatch = analysis.actualContractAddress.toLowerCase() !== contractAddress.toLowerCase();
    }
    
    // Determine the issue
    let issue = 'unknown';
    let solution = 'unknown';
    
    if (!analysis.deploymentTxExists) {
      issue = 'deployment_tx_not_found';
      solution = 'Check if the deployment transaction hash is correct';
    } else if (analysis.addressMismatch) {
      issue = 'wrong_contract_address';
      solution = `Use the correct contract address: ${analysis.actualContractAddress}`;
    } else if (!analysis.hasCode) {
      issue = 'no_code_at_address';
      solution = 'The address exists but has no contract code';
    } else if (!analysis.addressExists) {
      issue = 'address_not_found';
      solution = 'The contract address does not exist on Ethereum mainnet';
    } else {
      issue = 'verification_mismatch';
      solution = 'Contract exists but source code verification failed';
    }
    
    return res.status(200).json({
      success: true,
      contractAddress: contractAddress,
      deploymentTx: deploymentTx,
      checks: checks,
      analysis: analysis,
      issue: issue,
      solution: solution,
      recommendations: [
        `Issue identified: ${issue}`,
        `Solution: ${solution}`,
        analysis.actualContractAddress ? `Correct contract address: ${analysis.actualContractAddress}` : 'No contract address found',
        analysis.hasCode ? 'Contract has code - verification should be possible' : 'No contract code found',
        'Check Etherscan directly to verify these findings'
      ]
    });
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    return res.status(500).json({
      success: false,
      error: `Verification failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
