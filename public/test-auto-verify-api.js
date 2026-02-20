// Test script to debug the auto-verification API
// Run this in the browser console to test the API directly

async function testAutoVerifyAPI() {
  console.log('🧪 Testing Auto-Verification API...');
  
  const testData = {
    contractAddress: '0x810b68b2b502366f95e09cF10afd294c5A0b3426',
    network: 'ethereum',
    contractType: 'ONFT721Adapter',
    constructorArgs: '0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef0000000000000000000000001a44076050125825900e736c501f58089c167c00000000000000000000000000ab705b9734cb776a8f5b18c9036c14c6828933f',
    paymentTxHash: '0x3e06737c589e2551e91b689fcb86ac5ee2d60fdeb8230ff8a2c6685f9c2c4ae9',
    userAddress: '0x0aB705B9734CB776A8F5b18c9036c14C6828933F'
  };
  
  try {
    console.log('📡 Sending request to /api/auto-verify-contract...');
    console.log('📋 Request data:', testData);
    
    const response = await fetch('/api/auto-verify-contract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('📡 Raw response:', responseText);
    
    try {
      const responseData = JSON.parse(responseText);
      console.log('📡 Parsed response:', responseData);
      
      if (responseData.success) {
        console.log('✅ Auto-verification succeeded!');
        console.log('🆔 GUID:', responseData.guid);
        console.log('🔗 Verification URL:', responseData.verificationUrl);
      } else {
        console.log('❌ Auto-verification failed:', responseData.error);
        console.log('📋 Details:', responseData.details);
      }
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:', parseError);
      console.log('📄 Response was:', responseText);
    }
    
  } catch (error) {
    console.error('❌ API call failed:', error);
  }
}

// Run the test
testAutoVerifyAPI();

console.log('🔧 To run this test, copy and paste this entire script into your browser console while on the app page.');
