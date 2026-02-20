// Script to set baseURI on Base ONFT contract
// Run this in the browser console while connected to Base network

const BASE_ONFT_ADDRESS = '0x3d843E9Fc456eA112F968Bfe701903251696E577';
const ORIGINAL_NFT_ADDRESS = '0x6559807FfD23965d3aF54ee454bC69F113Ed06Ef';
const OWNER_ADDRESS = '0x0aB705B9734CB776A8F5b18c9036c14C6828933F';

async function setBaseURI() {
  if (!window.ethereum) {
    console.error('❌ MetaMask not found');
    return;
  }

  try {
    // Check current network
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();
    
    if (network.chainId !== 8453) {
      console.log('🔄 Switching to Base network...');
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }], // Base mainnet
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const signer = provider.getSigner();
    const userAddress = await signer.getAddress();
    
    if (userAddress.toLowerCase() !== OWNER_ADDRESS.toLowerCase()) {
      console.error('❌ You are not the contract owner!');
      console.log('Expected owner:', OWNER_ADDRESS);
      console.log('Your address:', userAddress);
      return;
    }

    // First, get the tokenURI from the original NFT to determine the baseURI pattern
    console.log('🔍 Checking original NFT metadata...');
    const originalNFT = new ethers.Contract(
      ORIGINAL_NFT_ADDRESS,
      ['function tokenURI(uint256) view returns (string)'],
      provider
    );
    
    const sampleTokenURI = await originalNFT.tokenURI(7);
    console.log('📋 Sample tokenURI:', sampleTokenURI);
    
    // Extract baseURI (everything before the token ID)
    // Common patterns: "https://api.example.com/metadata/7" or "ipfs://Qm.../7"
    let baseURI = sampleTokenURI;
    if (sampleTokenURI.includes('/7')) {
      baseURI = sampleTokenURI.replace('/7', '/');
    } else if (sampleTokenURI.endsWith('7')) {
      baseURI = sampleTokenURI.slice(0, -1);
    }
    
    console.log('📋 Extracted baseURI:', baseURI);
    
    // Set baseURI on Base ONFT contract
    console.log('🔧 Setting baseURI on Base ONFT contract...');
    const baseONFT = new ethers.Contract(
      BASE_ONFT_ADDRESS,
      [
        'function setBaseURI(string calldata _baseTokenURI) external onlyOwner',
        'function owner() view returns (address)'
      ],
      signer
    );
    
    // Verify ownership
    const contractOwner = await baseONFT.owner();
    console.log('👤 Contract owner:', contractOwner);
    
    if (contractOwner.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error('You are not the contract owner!');
    }
    
    // Set the baseURI
    console.log('📝 Setting baseURI:', baseURI);
    const tx = await baseONFT.setBaseURI(baseURI);
    console.log('📡 Transaction hash:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    await tx.wait();
    console.log('✅ BaseURI set successfully!');
    console.log('🔗 Transaction:', `https://basescan.org/tx/${tx.hash}`);
    
    // Verify it was set
    const baseONFTWithURI = new ethers.Contract(
      BASE_ONFT_ADDRESS,
      ['function tokenURI(uint256) view returns (string)'],
      provider
    );
    
    const newTokenURI = await baseONFTWithURI.tokenURI(7);
    console.log('✅ Verified new tokenURI:', newTokenURI);
    
  } catch (error) {
    console.error('❌ Error setting baseURI:', error);
    if (error.message) {
      console.error('Error message:', error.message);
    }
  }
}

// Run the function
setBaseURI();
