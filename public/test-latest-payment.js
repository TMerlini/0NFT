// Test the latest payment transaction
async function testLatestPayment() {
  console.log('🧪 Testing latest payment transaction...');
  
  const response = await fetch('/api/auto-verify-contract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractAddress: '0x810b68b2b502366f95e09cF10afd294c5A0b3426',
      network: 'ethereum',
      contractType: 'ONFT721Adapter',
      constructorArgs: '0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef0000000000000000000000001a44076050125825900e736c501f58089c167c00000000000000000000000000ab705b9734cb776a8f5b18c9036c14c6828933f',
      paymentTxHash: '0xbf246d51ed8f418d6645180f099b6f98562e6b72096db1108eae237faa2d477d', // Latest payment
      userAddress: '0x0aB705B9734CB776A8F5b18c9036c14C6828933F'
    })
  });
  
  const responseText = await response.text();
  console.log('🔍 Latest Payment API Response:');
  console.log('Status:', response.status);
  console.log('Response:', responseText);
  
  try {
    const parsed = JSON.parse(responseText);
    console.log('📋 Parsed Response:', parsed);
    
    if (parsed.success) {
      console.log('✅ SUCCESS! GUID:', parsed.guid);
      console.log('🔗 Verification URL:', parsed.verificationUrl);
    } else {
      console.log('❌ FAILED:', parsed.error);
      console.log('📋 Details:', parsed.details);
    }
  } catch (e) {
    console.log('❌ Could not parse JSON, raw response:', responseText);
  }
}

testLatestPayment();
