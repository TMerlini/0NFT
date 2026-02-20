// Script to fix verification status in Portfolio
// Run this in browser console on Portfolio page

console.log('🔧 Fixing verification status...');

// Get current deployment data
const currentData = JSON.parse(localStorage.getItem('onft-deployment-states') || '[]');

if (currentData.length > 0) {
  // Update verification status for all deployments
  currentData.forEach(deployment => {
    if (deployment.steps) {
      deployment.steps.forEach(step => {
        // Set all contracts as not verified (until manually verified)
        step.verified = false;
        step.verificationStatus = "Not Verified";
      });
    }
  });
  
  // Save updated data
  localStorage.setItem('onft-deployment-states', JSON.stringify(currentData));
  
  console.log('✅ Verification status updated!');
  console.log('📊 All contracts now show "Not Verified" status');
  console.log('💡 You can manually verify them using the verification buttons');
  
  // Reload page to see changes
  window.location.reload();
} else {
  console.log('❌ No deployment data found. Run the main update script first.');
}
