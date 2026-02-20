// Script to fix deployment state in localStorage
// Run this in the browser console on the Portfolio page

console.log('🔧 Fixing deployment state in localStorage...');

// Get current deployments
const storageKey = 'onft-deployment-states';
const stored = localStorage.getItem(storageKey);
const deployments = stored ? JSON.parse(stored) : [];

console.log(`📦 Found ${deployments.length} deployment(s)`);

// Find the deployment with the adapter address
const adapterAddress = '0x20507738D04355c8255AfA547E9858c522796485';
const onftAddress = '0x3d843E9Fc456eA112F968Bfe701903251696E577';

const deployment = deployments.find(d => 
  d.adapterAddress === adapterAddress || 
  d.adapterAddress?.toLowerCase() === adapterAddress.toLowerCase()
);

if (!deployment) {
  console.error('❌ Deployment not found!');
  console.log('Available deployments:', deployments.map(d => ({
    id: d.id,
    adapterAddress: d.adapterAddress,
    type: d.type
  })));
} else {
  console.log('✅ Found deployment:', deployment.id);
  
  // Update the deployment state
  deployment.onftAddresses = {
    8453: onftAddress // Base chain ID
  };
  
  // Ensure sourceChain and targetChains are properly set
  if (!deployment.sourceChain) {
    deployment.sourceChain = {
      id: 1,
      name: 'Ethereum',
      layerZeroEndpointId: 30101,
      layerZeroEndpointV2: '0x1a44076050125825900e736c501f859c50fE728c',
      isTestnet: false
    };
  }
  
  if (!deployment.targetChains || deployment.targetChains.length === 0) {
    deployment.targetChains = [{
      id: 8453,
      name: 'Base',
      layerZeroEndpointId: 30184,
      layerZeroEndpointV2: '0x1a44076050125825900e736c501f859c50fE728c',
      isTestnet: false
    }];
  }
  
  // Update steps to include proper structure
  if (!deployment.steps || deployment.steps.length === 0) {
    deployment.steps = [
      {
        id: 'deploy-adapter-ethereum',
        name: 'Deploy ONFT Adapter on Ethereum',
        status: 'completed',
        chainId: 1,
        contractAddress: adapterAddress,
        verified: false,
        verificationStatus: 'Not Verified'
      },
      {
        id: 'deploy-onft-base',
        name: 'Deploy ONFT Contract on Base',
        status: 'completed',
        chainId: 8453,
        contractAddress: onftAddress,
        verified: false,
        verificationStatus: 'Not Verified'
      }
    ];
  }
  
  // Update completedSteps structure
  if (!deployment.completedSteps) {
    deployment.completedSteps = {};
  }
  
  // Ensure completedSteps have the correct structure
  if (!deployment.completedSteps['deploy-adapter']) {
    deployment.completedSteps['deploy-adapter'] = {
      transactionHash: '',
      blockNumber: 0,
      timestamp: deployment.timestamp || Date.now(),
      chainId: 1,
      contractAddress: adapterAddress
    };
  }
  
  if (!deployment.completedSteps['deploy-onft-8453']) {
    deployment.completedSteps['deploy-onft-8453'] = {
      transactionHash: '',
      blockNumber: 0,
      timestamp: deployment.timestamp || Date.now(),
      chainId: 8453,
      contractAddress: onftAddress
    };
  }
  
  // Save back to localStorage
  const updatedDeployments = deployments.map(d => 
    d.id === deployment.id ? deployment : d
  );
  
  localStorage.setItem(storageKey, JSON.stringify(updatedDeployments));
  
  console.log('✅ Deployment state updated!');
  console.log('📋 Updated deployment:', {
    id: deployment.id,
    adapterAddress: deployment.adapterAddress,
    onftAddresses: deployment.onftAddresses,
    sourceChain: deployment.sourceChain?.name,
    targetChains: deployment.targetChains?.map(c => c.name)
  });
  
  console.log('🔄 Reloading page to see changes...');
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}
