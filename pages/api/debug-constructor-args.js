// Debug endpoint to test constructor argument formats
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { constructorArgs } = req.body;
  
  console.log('🔍 Debug Constructor Args Input:', constructorArgs);
  
  const constructorFormats = [];
  
  if (constructorArgs) {
    // Format 1: Original with 0x prefix
    constructorFormats.push({
      name: 'Original with 0x prefix',
      value: constructorArgs
    });
    
    // Format 2: Without 0x prefix
    const withoutPrefix = constructorArgs.startsWith('0x') ? constructorArgs.slice(2) : constructorArgs;
    constructorFormats.push({
      name: 'Without 0x prefix',
      value: withoutPrefix
    });
    
    // Format 3: Lowercase without prefix
    constructorFormats.push({
      name: 'Lowercase without prefix',
      value: withoutPrefix.toLowerCase()
    });
    
    // Format 4: Parse as already ABI-encoded (167 chars = partial encoding)
    if (withoutPrefix.length === 167) {
      // This appears to be already ABI-encoded but truncated
      // Let's try to parse it correctly
      
      // First address: chars 0-39 (40 chars)
      const addr1 = withoutPrefix.substring(0, 40);
      
      // The rest seems to be the encoded endpoint and delegate
      // Let's try to extract them properly
      const remaining = withoutPrefix.substring(40); // 127 chars remaining
      
      // Try to find the LayerZero endpoint address pattern
      // Looking for 1a44076050125825900e736c501f58089c167c (LayerZero endpoint)
      const endpointPattern = '1a44076050125825900e736c501f58089c167c';
      const endpointIndex = remaining.indexOf(endpointPattern);
      
      if (endpointIndex >= 0) {
        const addr2 = endpointPattern;
        // The delegate address should be at the end
        const delegateStart = remaining.lastIndexOf('ab705b9734cb776a8f5b18c9036c14c6828933f');
        const addr3 = delegateStart >= 0 ? remaining.substring(delegateStart, delegateStart + 40) : '';
        
        if (addr3) {
          const properAbiEncoded = 
            '000000000000000000000000' + addr1.toLowerCase() +
            '000000000000000000000000' + addr2.toLowerCase() +
            '000000000000000000000000' + addr3.toLowerCase();
          
          constructorFormats.push({
            name: 'Parsed from existing ABI encoding',
            value: properAbiEncoded,
            addresses: {
              addr1: '0x' + addr1,
              addr2: '0x' + addr2,
              addr3: '0x' + addr3
            }
          });
        }
      }
    }
    
    // Format 5: Manual parsing based on known addresses
    if (withoutPrefix.length === 167) {
      // Known addresses from the deployment:
      // token_: 0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef (your NFT contract)
      // endpoint_: 0x1a44076050125825900e736c501f58089c167c (LayerZero endpoint)  
      // delegate_: 0x0aB705B9734CB776A8F5b18c9036c14C6828933F (your address)
      
      const knownToken = '6559807FfD23965d3aF54ee454bC69F113Ed06Ef';
      const knownEndpoint = '1a44076050125825900e736c501f58089c167c';
      const knownDelegate = '0aB705B9734CB776A8F5b18c9036c14C6828933F';
      
      // Create proper ABI encoding
      const manualAbiEncoded = 
        '000000000000000000000000' + knownToken.toLowerCase() +
        '000000000000000000000000' + knownEndpoint.toLowerCase() + '00000000000000000000' + // LayerZero endpoint needs padding
        '000000000000000000000000' + knownDelegate.toLowerCase();
      
      constructorFormats.push({
        name: 'Manual ABI encoding with known addresses',
        value: manualAbiEncoded,
        addresses: {
          token: '0x' + knownToken,
          endpoint: '0x' + knownEndpoint,
          delegate: '0x' + knownDelegate
        }
      });
    }
  }
  
  return res.status(200).json({
    input: constructorArgs,
    inputLength: constructorArgs?.length || 0,
    formats: constructorFormats,
    totalFormats: constructorFormats.length
  });
}
