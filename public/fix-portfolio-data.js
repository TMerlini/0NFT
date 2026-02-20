// Script to fix corrupted Portfolio localStorage data
// Run this in browser console if Portfolio page crashes

(function fixPortfolioData() {
  console.log('🔧 Fixing Portfolio localStorage data...');

  try {
    // Get existing deployments
    const existingData = localStorage.getItem('onft-deployment-states');
    
    if (!existingData) {
      console.log('✅ No existing data found, creating empty array');
      localStorage.setItem('onft-deployment-states', JSON.stringify([]));
      return;
    }
  
  const deployments = JSON.parse(existingData);
  console.log(`📋 Found ${deployments.length} deployments`);
  
  // Fix each deployment to ensure proper structure
  const fixedDeployments = deployments.map((deployment, index) => {
    console.log(`🔍 Checking deployment ${index + 1}:`, deployment.id || 'unnamed');
    
    // Ensure completedSteps exists
    if (!deployment.completedSteps) {
      deployment.completedSteps = {};
      console.log(`   ✅ Added missing completedSteps`);
    }
    
    // Ensure steps array exists
    if (!deployment.steps) {
      deployment.steps = [];
      console.log(`   ✅ Added missing steps array`);
    }
    
    // Ensure basic properties exist
    if (!deployment.id) {
      deployment.id = `deployment-${Date.now()}-${index}`;
      console.log(`   ✅ Added missing ID: ${deployment.id}`);
    }
    
    if (!deployment.timestamp) {
      deployment.timestamp = Date.now();
      console.log(`   ✅ Added missing timestamp`);
    }
    
    if (!deployment.type) {
      deployment.type = 'adapter';
      console.log(`   ✅ Added missing type: adapter`);
    }
    
    if (!deployment.deployerAddress) {
      deployment.deployerAddress = '0x0000000000000000000000000000000000000000';
      console.log(`   ✅ Added missing deployerAddress`);
    }
    
    return deployment;
  });
  
  // Save the fixed data
  localStorage.setItem('onft-deployment-states', JSON.stringify(fixedDeployments));
  
  console.log('✅ Portfolio data fixed successfully!');
  console.log('🔄 Refresh the Portfolio page to see the changes');
  
} catch (error) {
  console.error('❌ Error fixing Portfolio data:', error);
  console.log('🗑️ Clearing corrupted data and starting fresh...');
  localStorage.removeItem('onft-deployment-states');
  localStorage.setItem('onft-deployment-states', JSON.stringify([]));
  console.log('✅ Portfolio data reset. Refresh the page.');
}
})(); // End of function and immediately invoke it
