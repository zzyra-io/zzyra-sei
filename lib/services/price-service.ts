// Price service to fetch cryptocurrency prices
export async function fetchCryptoPrice(asset: string): Promise<{ price: number; timestamp: string }> {
  try {
    // Use CoinGecko API for demonstration
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${asset.toLowerCase()}&vs_currencies=usd`,
    )

    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`)
    }

    const data = await response.json()
    const assetId = asset.toLowerCase()

    if (!data[assetId] || !data[assetId].usd) {
      throw new Error(`Price data not available for ${asset}`)
    }

    return {
      price: data[assetId].usd,
      timestamp: new Date().toISOString(),
    }
  } catch (error: any) {
    console.error(`Error fetching price for ${asset}:`, error)
    throw new Error(`Failed to fetch price for ${asset}: ${error.message}`)
  }
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
