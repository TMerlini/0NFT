import type { NextApiRequest, NextApiResponse } from 'next'

/**
 * Proxy API route for Etherscan verification POST requests
 * This handles the verifysourcecode action which requires POST
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url, formData } = req.body

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid URL parameter' })
  }

  if (!formData || typeof formData !== 'object') {
    return res.status(400).json({ error: 'Missing or invalid formData parameter' })
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
        allowedDomains
      })
      return res.status(403).json({ 
        error: 'Domain not allowed',
        hostname: urlObj.hostname
      })
    }
    
    console.log('Proxying verification request to:', urlObj.hostname)
    
    // Convert formData object to URLSearchParams
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(formData)) {
      if (value !== null && value !== undefined) {
        params.append(key, String(value))
      }
    }
    
    // Forward the POST request to Etherscan API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; Next.js Etherscan Proxy)',
      },
      body: params.toString()
    })

    const data = await response.text()

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json')

    // Log response status for debugging
    if (!response.ok) {
      console.error('Etherscan verification API error:', {
        status: response.status,
        statusText: response.statusText,
        data: data.substring(0, 500)
      })
    } else {
      console.log('Verification submitted successfully')
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
