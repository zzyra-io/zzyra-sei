// Price service to fetch cryptocurrency prices
export async function fetchCryptoPrice(asset: string): Promise<{ price: number; timestamp: string }> {
  // RPC failover: try multiple endpoints
  const assetId = asset.toLowerCase()
  const defaultEndpoints = [
    `https://api.coingecko.com/api/v3/simple/price?ids=${assetId}&vs_currencies=usd`,
    `https://api.coincap.io/v2/assets/${assetId}`,
  ]
  const endpoints = (process.env.PRICE_RPC_ENDPOINTS?.split(",") || defaultEndpoints).map((url) => url.trim())
  let lastError: any
  for (const url of endpoints) {
    try {
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`Status ${resp.status}`)
      const data = await resp.json()
      let price: number | undefined
      // CoinGecko format
      if (data[assetId]?.usd != null) {
        price = data[assetId].usd
      // CoinCap format
      } else if (data.data?.priceUsd) {
        price = Number.parseFloat(data.data.priceUsd)
      }
      if (price == null || Number.isNaN(price)) {
        throw new Error(`Invalid price data from ${url}`)
      }
      return { price, timestamp: new Date().toISOString() }
    } catch (err: any) {
      console.warn(`fetchCryptoPrice endpoint failed (${url}):`, err)
      lastError = err
      continue
    }
  }
  console.error(`All RPC endpoints failed for ${asset}:`, lastError)
  throw new Error(`All RPC endpoints failed for ${asset}: ${lastError?.message}`)
}

// Mock function for development/testing
export async function mockFetchCryptoPrice(asset: string): Promise<{ price: number; timestamp: string }> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Return mock data
  return {
    price: Math.random() * 2000 + 1000, // Random price between 1000-3000
    timestamp: new Date().toISOString(),
  }
}
