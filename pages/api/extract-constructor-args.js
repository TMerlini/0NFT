// Extract constructor arguments from deployment transaction
import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { deploymentTxHash } = req.body;
    
    console.log('🔍 Extracting constructor args from deployment transaction:', deploymentTxHash);
    
    // Get API key
    const apiKey = process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || 'VI9U5XERZ1TK3CVEMWA3P9MCGBBRV38MCG';
    
    if (!apiKey) {
      return res.status(400).json({ error: 'No API key found' });
    }
    
    // Get transaction details from Etherscan
    const txUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${deploymentTxHash}&apikey=${apiKey}`;
    
    console.log('📡 Fetching transaction details...');
    const txResponse = await axios.get(txUrl);
    
    if (!txResponse.data || !txResponse.data.result) {
      return res.status(400).json({ 
        error: 'Transaction not found',
        txHash: deploymentTxHash
      });
    }
    
    const transaction = txResponse.data.result;
    
    if (!transaction || !transaction.input) {
      return res.status(400).json({ 
        error: 'No input data found in transaction',
        transaction: transaction
      });
    }
    
    const inputData = transaction.input;
    
    console.log('📋 Transaction input data length:', inputData ? inputData.length : 0);
    console.log('📋 Input data preview:', inputData ? inputData.substring(0, 100) + '...' : 'No input data');
    
    // The constructor arguments are at the end of the input data
    // We need to find where the contract bytecode ends and constructor args begin
    
    // For a typical contract deployment, the input data structure is:
    // 0x + contract_creation_code + constructor_arguments
    
    // Let's try to identify the constructor arguments
    // They should be the last part of the input data
    
    // Common approach: constructor args are usually the last 192 characters (3 addresses * 64 chars each)
    // But let's be more flexible and look for patterns
    
    let constructorArgs = '';
    
    // Method 1: Try last 192 characters (3 addresses)
    if (inputData.length >= 194) { // 0x + at least 192 chars
      const last192 = inputData.slice(-192);
      console.log('📋 Last 192 characters:', last192);
      
      // Check if this looks like ABI-encoded addresses
      if (last192.length === 192 && /^[0-9a-fA-F]+$/.test(last192)) {
        constructorArgs = last192;
      }
    }
    
    // Method 2: Try different lengths
    const possibleLengths = [192, 160, 128, 96, 64]; // Different possible constructor arg lengths
    const candidates = [];
    
    for (const length of possibleLengths) {
      if (inputData.length >= length + 2) { // +2 for 0x prefix
        const candidate = inputData.slice(-length);
        if (/^[0-9a-fA-F]+$/.test(candidate)) {
          candidates.push({
            length: length,
            value: candidate,
            description: `Last ${length} characters`
          });
        }
      }
    }
    
    // Method 3: Look for our known addresses in the input data
    const knownAddresses = [
      '6559807ffd23965d3af54ee454bc69f113ed06ef', // Your NFT contract (lowercase)
      '1a44076050125825900e736c501f58089c167c',   // LayerZero endpoint
      '0ab705b9734cb776a8f5b18c9036c14c6828933f'  // Your address (lowercase)
    ];
    
    const inputLower = inputData.toLowerCase();
    const addressPositions = [];
    
    for (const addr of knownAddresses) {
      const pos = inputLower.lastIndexOf(addr);
      if (pos !== -1) {
        addressPositions.push({
          address: '0x' + addr,
          position: pos,
          endPosition: pos + addr.length
        });
      }
    }
    
    console.log('📍 Address positions in input data:', addressPositions);
    
    // Try to extract constructor args based on address positions
    if (addressPositions.length > 0) {
      const lastPosition = Math.max(...addressPositions.map(p => p.endPosition));
      const firstPosition = Math.min(...addressPositions.map(p => p.position));
      
      // Extract from first address position to end
      const extractedArgs = inputData.substring(firstPosition - 24); // Include padding
      console.log('📋 Extracted based on address positions:', extractedArgs);
      
      if (!constructorArgs && extractedArgs.length >= 64) {
        constructorArgs = extractedArgs;
      }
    }
    
    return res.status(200).json({
      success: true,
      deploymentTxHash: deploymentTxHash,
      inputData: inputData,
      inputDataLength: inputData.length,
      extractedConstructorArgs: constructorArgs,
      candidates: candidates,
      addressPositions: addressPositions,
      recommendations: [
        {
          name: 'Primary candidate',
          value: constructorArgs,
          reason: 'Most likely constructor arguments'
        },
        ...candidates.map(c => ({
          name: c.description,
          value: c.value,
          reason: `${c.length} character extraction`
        }))
      ]
    });
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    return res.status(500).json({
      success: false,
      error: `Extraction failed: ${error.message}`,
      details: error.response?.data || error.message
    });
  }
}
