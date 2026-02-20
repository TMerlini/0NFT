// Contract verification API endpoint
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Network configurations for verification
const NETWORK_CONFIGS = {
  ethereum: {
    apiUrl: 'https://api.etherscan.io/api',
    explorerUrl: 'https://etherscan.io',
    chainId: 1
  },
  base: {
    apiUrl: 'https://api.basescan.org/api',
    explorerUrl: 'https://basescan.org',
    chainId: 8453
  },
  polygon: {
    apiUrl: 'https://api.polygonscan.com/api',
    explorerUrl: 'https://polygonscan.com',
    chainId: 137
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      contractAddress,
      network,
      contractName,
      sourceCode,
      constructorArgs,
      compilerVersion = '0.8.22'
    } = req.body;

    if (!contractAddress || !network || !contractName || !sourceCode) {
      return res.status(400).json({ 
        error: 'Missing required fields: contractAddress, network, contractName, sourceCode' 
      });
    }

    const networkConfig = NETWORK_CONFIGS[network];
    if (!networkConfig) {
      return res.status(400).json({ 
        error: `Unsupported network: ${network}. Supported: ${Object.keys(NETWORK_CONFIGS).join(', ')}` 
      });
    }

    console.log(`🔍 Verifying contract ${contractAddress} on ${network}...`);

    // Get API key from environment
    const apiKey = getApiKey(network);
    if (!apiKey) {
      return res.status(400).json({ 
        error: `Missing API key for ${network}. Please set ETHERSCAN_API_KEY, BASESCAN_API_KEY, or POLYGONSCAN_API_KEY in environment variables.` 
      });
    }

    // Prepare verification data
    const verificationData = {
      apikey: apiKey,
      module: 'contract',
      action: 'verifysourcecode',
      contractaddress: contractAddress,
      sourceCode: sourceCode,
      codeformat: 'solidity-single-file',
      contractname: contractName,
      compilerversion: `v${compilerVersion}+commit.87f61d96`,
      optimizationUsed: '1',
      runs: '200',
      constructorArguements: constructorArgs || '',
      evmversion: 'london',
      licenseType: '3' // MIT License
    };

    // Submit verification request
    const verifyResponse = await submitVerification(networkConfig.apiUrl, verificationData);
    
    if (verifyResponse.status !== '1') {
      throw new Error(`Verification submission failed: ${verifyResponse.result}`);
    }

    const guid = verifyResponse.result;
    console.log(`📝 Verification submitted with GUID: ${guid}`);

    // Check verification status (with timeout)
    const maxAttempts = 10;
    let attempts = 0;
    let verificationStatus = 'Pending';

    while (attempts < maxAttempts && verificationStatus === 'Pending') {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      
      const statusResponse = await checkVerificationStatus(networkConfig.apiUrl, apiKey, guid);
      verificationStatus = statusResponse.result;
      attempts++;
      
      console.log(`🔄 Verification attempt ${attempts}: ${verificationStatus}`);
    }

    const success = verificationStatus === 'Pass - Verified';
    const explorerUrl = `${networkConfig.explorerUrl}/address/${contractAddress}#code`;

    res.status(200).json({
      success,
      guid,
      status: verificationStatus,
      contractAddress,
      network,
      explorerUrl,
      message: success 
        ? `Contract successfully verified on ${network}!` 
        : `Verification ${verificationStatus.toLowerCase()}. Check status manually.`
    });

  } catch (error) {
    console.error('❌ Contract verification error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Contract verification failed',
      details: error.toString()
    });
  }
}

function getApiKey(network) {
  switch (network) {
    case 'ethereum':
      return process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
    case 'base':
      return process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
    case 'polygon':
      return process.env.POLYGONSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
    default:
      return null;
  }
}

async function submitVerification(apiUrl, data) {
  const formData = new URLSearchParams(data);
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData
  });

  return await response.json();
}

async function checkVerificationStatus(apiUrl, apiKey, guid) {
  const params = new URLSearchParams({
    apikey: apiKey,
    module: 'contract',
    action: 'checkverifystatus',
    guid: guid
  });

  const response = await fetch(`${apiUrl}?${params}`);
  return await response.json();
}
