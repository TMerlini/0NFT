// Auto-Verification Service Configuration
// This file contains the configuration for the automated contract verification service

const SERVICE_CONFIG = {
  // Service wallet address for receiving verification fees
  SERVICE_WALLET: '0xbC5167F9d8E0391d20B3e06c3cfd77398154EAd9',
  
  // Verification fee in ETH
  VERIFICATION_FEE: '0.001', // 0.001 ETH (~$3)
  
  // Supported networks
  SUPPORTED_NETWORKS: ['ethereum', 'base'],
  
  // Supported contract types
  SUPPORTED_CONTRACT_TYPES: ['ONFT721Adapter', 'ONFT721'],
  
  // Service features
  FEATURES: {
    INSTANT_VERIFICATION: true,
    PAYMENT_VERIFICATION: true,
    REFUND_ON_FAILURE: true,
    BULK_DISCOUNTS: false, // Future feature
    PRIORITY_PROCESSING: false // Future feature
  },
  
  // Pricing tiers (for future expansion)
  PRICING: {
    SINGLE_VERIFICATION: '0.001',
    BULK_5_CONTRACTS: '0.004', // 20% discount
    BULK_10_CONTRACTS: '0.007', // 30% discount
    PRIORITY_VERIFICATION: '0.002' // 2x fee for priority
  }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SERVICE_CONFIG;
}

console.log('🔧 Auto-Verification Service Configuration:');
console.log('💰 Service Wallet:', SERVICE_CONFIG.SERVICE_WALLET);
console.log('💳 Verification Fee:', SERVICE_CONFIG.VERIFICATION_FEE, 'ETH');
console.log('🌐 Supported Networks:', SERVICE_CONFIG.SUPPORTED_NETWORKS.join(', '));
console.log('📋 Supported Contracts:', SERVICE_CONFIG.SUPPORTED_CONTRACT_TYPES.join(', '));
