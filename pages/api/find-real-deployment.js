// Find the actual contract creation transaction for this address
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const contractAddress = '0x810b68b2b502366f95e09cF10afd294c5A0b3426';
    
    console.log('🔍 Finding the REAL contract creation transaction...');
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    // Method 1: Get all transactions for this address
    console.log('📡 Method 1: Getting all transactions for the address...');
    const txListUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;
    const txListResponse = await axios.get(txListUrl);
    
    const transactions = txListResponse.data?.result || [];
    console.log(`📋 Found ${transactions.length} transactions`);
    
    // Find contract creation transactions (where to="" and contractAddress is created)
    const contractCreations = transactions.filter(tx => 
      tx.to === '' || tx.to === null || tx.contractAddress === contractAddress
    );
    
    console.log(`📋 Found ${contractCreations.length} potential contract creation transactions`);
    
    // Method 2: Check the first transaction (usually contract creation)
    const firstTx = transactions[0];
    let realDeploymentTx = null;
    
    if (firstTx) {
      console.log('📡 Analyzing first transaction...');
      
      // Get detailed info about the first transaction
      const firstTxUrl = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionByHash&txhash=${firstTx.hash}&apikey=${apiKey}`;
      const firstTxResponse = await axios.get(firstTxUrl);
      
      const firstTxReceipt = `https://api.etherscan.io/v2/api?chainid=1&module=proxy&action=eth_getTransactionReceipt&txhash=${firstTx.hash}&apikey=${apiKey}`;
      const firstReceiptResponse = await axios.get(firstTxReceipt);
      
      realDeploymentTx = {
        hash: firstTx.hash,
        from: firstTx.from,
        to: firstTx.to,
        value: firstTx.value,
        gasUsed: firstTx.gasUsed,
        gasPrice: firstTx.gasPrice,
        isError: firstTx.isError,
        txreceipt_status: firstTx.txreceipt_status,
        blockNumber: firstTx.blockNumber,
        timeStamp: firstTx.timeStamp,
        details: firstTxResponse.data?.result,
        receipt: firstReceiptResponse.data?.result
      };
    }
    
    // Method 3: Use Etherscan's contract creation API
    console.log('📡 Method 3: Using contract creation API...');
    let contractCreationInfo = null;
    try {
      const creationUrl = `https://api.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${apiKey}`;
      const creationResponse = await axios.get(creationUrl);
      contractCreationInfo = creationResponse.data?.result?.[0];
    } catch (error) {
      console.log('Contract creation API failed:', error.message);
    }
    
    // Analyze the findings
    const analysis = {
      totalTransactions: transactions.length,
      contractCreations: contractCreations.length,
      firstTransaction: firstTx ? {
        hash: firstTx.hash,
        from: firstTx.from,
        to: firstTx.to || 'null (contract creation)',
        isContractCreation: !firstTx.to || firstTx.to === '',
        blockNumber: firstTx.blockNumber,
        timestamp: new Date(firstTx.timeStamp * 1000).toISOString()
      } : null,
      contractCreationInfo: contractCreationInfo,
      realDeploymentTx: realDeploymentTx
    };
    
    // Determine the actual deployment transaction
    let actualDeploymentTx = null;
    let deploymentSource = 'unknown';
    
    if (contractCreationInfo?.txHash) {
      actualDeploymentTx = contractCreationInfo.txHash;
      deploymentSource = 'contract_creation_api';
    } else if (firstTx && (!firstTx.to || firstTx.to === '')) {
      actualDeploymentTx = firstTx.hash;
      deploymentSource = 'first_transaction';
    } else if (contractCreations.length > 0) {
      actualDeploymentTx = contractCreations[0].hash;
      deploymentSource = 'filtered_transactions';
    }
    
    return res.status(200).json({
      success: true,
      contractAddress: contractAddress,
      wrongTx: '0x8f991ffb5de1632c0bcac8c845691ce7f300a34e1ade2a9275e3bf3fbc8cb770',
      actualDeploymentTx: actualDeploymentTx,
      deploymentSource: deploymentSource,
      analysis: analysis,
      transactions: transactions.slice(0, 5), // First 5 transactions
      contractCreations: contractCreations,
      explanation: actualDeploymentTx 
        ? `Found actual deployment transaction: ${actualDeploymentTx}`
        : 'Could not determine the actual deployment transaction',
      recommendations: [
        actualDeploymentTx ? `Real deployment tx: ${actualDeploymentTx}` : 'No deployment transaction found',
        `Wrong tx was: 0x8f991ffb5de1632c0bcac8c845691ce7f300a34e1ade2a9275e3bf3fbc8cb770`,
        'The contract exists and has real bytecode',
        actualDeploymentTx ? 'Use the real deployment tx for verification' : 'Manual investigation needed'
      ],
      etherscanUrls: {
        contract: `https://etherscan.io/address/${contractAddress}`,
        wrongTx: `https://etherscan.io/tx/0x8f991ffb5de1632c0bcac8c845691ce7f300a34e1ade2a9275e3bf3fbc8cb770`,
        actualTx: actualDeploymentTx ? `https://etherscan.io/tx/${actualDeploymentTx}` : null
      }
    });
    
  } catch (error) {
    console.error('❌ Real deployment search failed:', error);
    return res.status(500).json({
      success: false,
      error: `Real deployment search failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
