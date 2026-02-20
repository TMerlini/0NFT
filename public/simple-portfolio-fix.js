// Simple Portfolio fix - just clear and reset
console.log('🔧 Clearing Portfolio data...');
localStorage.removeItem('onft-deployment-states');
localStorage.setItem('onft-deployment-states', JSON.stringify([]));
console.log('✅ Portfolio data cleared. Refresh the page.');
