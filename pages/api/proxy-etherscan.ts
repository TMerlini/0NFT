import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Proxy API route for Etherscan API requests
 * This is needed because Etherscan APIs don't support CORS from browsers
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.query

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL parameter' })
  }

  try {
    // Validate that the URL is an Etherscan API endpoint
    const allowedDomains = [
      'api.etherscan.io',
      'api.basescan.org',
      'api-sepolia.basescan.org',
      'api.bscscan.com',
      'api.arbiscan.io',
      'api.polygonscan.com',
      'api.snowtrace.io',
      'api.celoscan.io',
      'api-moonbeam.moonscan.io',
      'api-moonriver.moonscan.io',
      'api-zkevm.polygonscan.com',
      'api-era.zksync.network',
      'api.lineascan.build'
    ]

    let urlObj: URL
    try {
      urlObj = new URL(url)
    } catch (e) {
      return res.status(400).json({ error: 'Invalid URL format' })
    }

    const isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain))
    if (!isAllowed) {
      console.error('Domain not allowed:', {
        hostname: urlObj.hostname,
        fullUrl: url.replace(/apikey=[^&]+/, 'apikey=***'),
        allowedDomains
      })
      return res.status(403).json({ 
        error: 'Domain not allowed',
        hostname: urlObj.hostname,
        allowedDomains 
      })
    }
    
    console.log('✅ Domain allowed:', urlObj.hostname)

    // Forward the request to Etherscan API
    console.log('Proxying request to:', url.replace(/apikey=[^&]+/, 'apikey=***'))
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; Next.js Etherscan Proxy)',
      }
    })

    const data = await response.text()

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')

    // Log response status for debugging
    if (!response.ok) {
      console.error('Etherscan API error:', {
        status: response.status,
        statusText: response.statusText,
        data: data.substring(0, 500)
      })
    }

    // Return the response
    res.status(response.status).send(data)
  } catch (error: any) {
    console.error('Proxy error:', error)
    res.status(500).json({ 
      error: 'Proxy request failed',
      message: error.message 
    })
  }
}
