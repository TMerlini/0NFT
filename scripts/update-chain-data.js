/**
 * Script to help update chain data from LayerZero documentation
 * 
 * This script provides utilities to:
 * 1. Fetch chain-specific data from LayerZero docs
 * 2. Update layerzero-contracts.json
 * 3. Validate chain data
 * 
 * Usage:
 *   node scripts/update-chain-data.js --chain arbitrum
 *   node scripts/update-chain-data.js --chain base --update-json
 */

const fs = require('fs')
const path = require('path')

const CHAIN_PAGE_BASE_URL = 'https://docs.layerzero.network/v2/deployments/chains'
const CONTRACTS_JSON_PATH = path.join(__dirname, '../src/lib/layerzero-contracts.json')

/**
 * Chain name to URL slug mapping
 */
const CHAIN_URL_SLUGS = {
  'ethereum': 'ethereum',
  'base': 'base',
  'arbitrum': 'arbitrum',
  'polygon': 'polygon',
  'optimism': 'optimism',
  'avalanche': 'avalanche',
  'bsc': 'bnb-smart-chain-bsc-mainnet',
  'bnb': 'bnb-smart-chain-bsc-mainnet',
  'fantom': 'fantom',
  'sepolia': 'ethereum-sepolia-testnet',
  'base-sepolia': 'base-sepolia-testnet',
  'arbitrum-sepolia': 'arbitrum-sepolia-testnet',
  'optimism-sepolia': 'optimism-sepolia-testnet',
  'polygon-amoy': 'polygon-amoy-testnet',
  'avalanche-fuji': 'avalanche-fuji-testnet',
  'bsc-testnet': 'bnb-smart-chain-bsc-testnet',
}

/**
 * Get chain documentation URL
 */
function getChainDocUrl(chainName) {
  const slug = CHAIN_URL_SLUGS[chainName.toLowerCase()] || chainName.toLowerCase()
  return `${CHAIN_PAGE_BASE_URL}/${slug}`
}

/**
 * Load current contracts data
 */
function loadContractsData() {
  try {
    const data = fs.readFileSync(CONTRACTS_JSON_PATH, 'utf8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error loading contracts data:', error)
    return null
  }
}

/**
 * Save contracts data
 */
function saveContractsData(data) {
  try {
    fs.writeFileSync(CONTRACTS_JSON_PATH, JSON.stringify(data, null, 2), 'utf8')
    console.log('✅ Contracts data saved successfully')
  } catch (error) {
    console.error('Error saving contracts data:', error)
  }
}

/**
 * Display chain information
 */
function displayChainInfo(chainName) {
  const url = getChainDocUrl(chainName)
  const data = loadContractsData()
  
  console.log('\n📋 Chain Information')
  console.log('='.repeat(50))
  console.log(`Chain: ${chainName}`)
  console.log(`Documentation URL: ${url}`)
  
  if (data) {
    // Find chain in data
    const chainEntry = Object.entries(data.chains).find(([_, chain]) => 
      chain.name.toLowerCase().includes(chainName.toLowerCase())
    )
    
    if (chainEntry) {
      const [chainId, chainData] = chainEntry
      console.log(`\n✅ Found in contracts data:`)
      console.log(`   Chain ID: ${chainId}`)
      console.log(`   Endpoint ID: ${chainData.endpointId}`)
      console.log(`   EndpointV2: ${chainData.endpointV2}`)
      console.log(`   Executor: ${chainData.lzExecutor}`)
      console.log(`   ReadLib1002: ${chainData.readLib1002 || 'Not available'}`)
    } else {
      console.log(`\n⚠️  Chain not found in contracts data`)
      console.log(`   Visit the URL above to extract contract addresses`)
    }
  }
  
  console.log('\n📝 Next Steps:')
  console.log('1. Visit the documentation URL above')
  console.log('2. Extract protocol contract addresses')
  console.log('3. Update src/lib/layerzero-contracts.json')
  console.log('4. Update src/lib/chains.ts if adding a new chain')
  console.log('5. Update src/lib/layerzero-chain-pages.md to mark as documented')
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2)
  const chainIndex = args.indexOf('--chain')
  
  if (chainIndex === -1 || !args[chainIndex + 1]) {
    console.log('Usage: node scripts/update-chain-data.js --chain <chain-name>')
    console.log('\nAvailable chains:')
    console.log(Object.keys(CHAIN_URL_SLUGS).join(', '))
    return
  }
  
  const chainName = args[chainIndex + 1]
  displayChainInfo(chainName)
}

if (require.main === module) {
  main()
}

module.exports = {
  getChainDocUrl,
  loadContractsData,
  saveContractsData,
  CHAIN_URL_SLUGS
}
