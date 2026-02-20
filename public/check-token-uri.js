// Script to check tokenURI and verify metadata
const { ethers } = require('ethers');

const BASE_ONFT_ADDRESS = '0x3d843E9Fc456eA112F968Bfe701903251696E577';
const BASE_RPC = 'https://base.llamarpc.com';
const TOKEN_ID = 7;

async function checkTokenURI() {
  try {
    console.log('🔍 Checking tokenURI for token #7...');
    
    const provider = new ethers.providers.JsonRpcProvider(BASE_RPC);
    
    const baseONFT = new ethers.Contract(
      BASE_ONFT_ADDRESS,
      [
        'function tokenURI(uint256) view returns (string)',
        'function ownerOf(uint256) view returns (address)',
        'function totalSupply() view returns (uint256)'
      ],
      provider
    );
    
    // Check if token exists
    try {
      const owner = await baseONFT.ownerOf(TOKEN_ID);
      console.log('✅ Token #7 exists, owner:', owner);
    } catch (error) {
      console.log('❌ Token #7 does not exist on Base ONFT contract');
      console.log('   This means the token was not bridged/minted yet');
    }
    
    // Get total supply
    try {
      const totalSupply = await baseONFT.totalSupply();
      console.log('📊 Total supply:', totalSupply.toString());
    } catch (error) {
      console.log('⚠️  Could not get total supply');
    }
    
    // Try to get tokenURI
    try {
      const tokenURI = await baseONFT.tokenURI(TOKEN_ID);
      console.log('📋 TokenURI from contract:', tokenURI);
    } catch (error) {
      console.log('❌ Could not get tokenURI (token may not exist or baseURI not set)');
    }
    
    // Also check original NFT on Ethereum
    console.log('\n🔍 Checking original NFT on Ethereum...');
    const ethProvider = new ethers.providers.JsonRpcProvider('https://eth.llamarpc.com');
    const originalNFT = new ethers.Contract(
      '0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef',
      ['function tokenURI(uint256) view returns (string)'],
      ethProvider
    );
    
    const originalTokenURI = await originalNFT.tokenURI(TOKEN_ID);
    console.log('📋 Original NFT TokenURI:', originalTokenURI);
    
    // Check if metadata endpoint is accessible
    console.log('\n🔍 Checking metadata endpoint...');
    try {
      const response = await fetch(tokenURI);
      if (response.ok) {
        const metadata = await response.json();
        console.log('✅ Metadata retrieved:', JSON.stringify(metadata, null, 2));
      } else {
        console.log('❌ Metadata endpoint returned status:', response.status);
      }
    } catch (error) {
      console.log('❌ Error fetching metadata:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTokenURI();
