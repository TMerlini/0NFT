// Manual verification guide for your paid verification
// Since payment 0x3b163c116e91b2bff74c55350c1e903d56f763a4061b69a8cbfea1468bfe4dc8 was successful

console.log('🎯 Manual Verification Guide - Payment Confirmed');
console.log('💰 Payment TX: 0x3b163c116e91b2bff74c55350c1e903d56f763a4061b69a8cbfea1468bfe4dc8');
console.log('✅ Payment Status: Confirmed on Ethereum');
console.log('');

const CONTRACTS_TO_VERIFY = {
  ethereum: {
    address: '0x810b68b2b502366f95e09cF10afd294c5A0b3426',
    type: 'ONFT721Adapter',
    verifyUrl: 'https://etherscan.io/verifyContract?a=0x810b68b2b502366f95e09cF10afd294c5A0b3426',
    constructorArgs: '0000000000000000000000006559807ffd23965d3af54ee454bc69f113ed06ef0000000000000000000000001a44076050125825900e736c501f859c50fe728c0000000000000000000000000ab705b9734cb776a8f5b18c9036c14c6828933f'
  },
  base: {
    address: '0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7',
    type: 'ONFT721',
    verifyUrl: 'https://basescan.org/verifyContract?a=0x622A0138Aa1fB1c3b049de609F4FAabad764f9F7',
    constructorArgs: '000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000001a44076050125825900e736c501f859c50fe728c0000000000000000000000000ab705b9734cb776a8f5b18c9036c14c6828933f000000000000000000000000000000000000000000000000000000000000000d506978656c20476f626c696e73000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004504750420000000000000000000000000000000000000000000000000000000'
  }
};

console.log('📋 Contracts Ready for Verification:');
console.log('');

Object.entries(CONTRACTS_TO_VERIFY).forEach(([network, contract]) => {
  console.log(`🔗 ${network.toUpperCase()} - ${contract.type}`);
  console.log(`   Address: ${contract.address}`);
  console.log(`   Verify URL: ${contract.verifyUrl}`);
  console.log(`   Constructor Args: ${contract.constructorArgs}`);
  console.log('');
});

console.log('⚙️ Verification Settings for Both Contracts:');
console.log('   • Compiler Type: Solidity (Single file)');
console.log('   • Compiler Version: v0.8.22+commit.4fc1097e');
console.log('   • Optimization: Yes (200 runs)');
console.log('   • License: MIT License (MIT)');
console.log('');

console.log('📝 Next Steps:');
console.log('1. ✅ Payment confirmed - you have paid for verification service');
console.log('2. 🔗 Click the verification URLs above to verify each contract');
console.log('3. 📋 Use the provided constructor arguments');
console.log('4. 📄 You will need the full LayerZero V2 source code');
console.log('5. ⏰ Verification typically takes 5-10 minutes per contract');
console.log('');

console.log('💡 Source Code Resources:');
console.log('   • LayerZero GitHub: https://github.com/LayerZero-Labs/LayerZero-v2');
console.log('   • ONFT Contracts: https://github.com/LayerZero-Labs/LayerZero-v2/tree/main/packages/layerzero-v2/evm/oapp/contracts/onft721');
console.log('   • Flattened contracts available in LayerZero documentation');

// Quick verification buttons
console.log('');
console.log('🚀 Quick Actions:');
console.log('   Run these commands to open verification pages:');
console.log('   window.open("' + CONTRACTS_TO_VERIFY.ethereum.verifyUrl + '", "_blank")');
console.log('   window.open("' + CONTRACTS_TO_VERIFY.base.verifyUrl + '", "_blank")');
