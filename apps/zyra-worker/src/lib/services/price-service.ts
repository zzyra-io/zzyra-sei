export interface PriceData {
  price: number;
  timestamp: string;
  currency?: string;
  change24h?: number;
  source: string;
}

type DataSource = 'coingecko' | 'binance' | 'coinmarketcap';

/**
 * Fetch current USD price for a given asset using the specified data source
 * @param asset The asset ticker or ID to look up (e.g., 'ethereum', 'btc')
 * @param source The data source to use (defaults to 'coingecko')
 */
export async function fetchCryptoPrice(
  asset: string, 
  source: DataSource = 'coingecko'
): Promise<PriceData> {
  const id = asset.toLowerCase();
  let price: number;
  
  try {
    switch (source) {
      case 'coingecko':
        price = await fetchCoinGeckoPrice(id);
        break;
      case 'binance':
        price = await fetchBinancePrice(id);
        break;
      case 'coinmarketcap':
        price = await fetchCoinMarketCapPrice(id);
        break;
      default:
        price = await fetchCoinGeckoPrice(id);
    }
    
    return { 
      price, 
      timestamp: new Date().toISOString(),
      currency: 'USD',
      source
    };
  } catch (error) {
    // If the primary source fails, try a fallback
    if (source !== 'coingecko') {
      console.warn(`Failed to fetch from ${source}, falling back to CoinGecko`);
      return fetchCryptoPrice(asset, 'coingecko');
    }
    throw error;
  }
}

/**
 * Fetch from CoinGecko API
 */
async function fetchCoinGeckoPrice(id: string): Promise<number> {
  // Add API key if available
  const apiKey = process.env.COINGECKO_API_KEY || '';
  const headers: HeadersInit = apiKey ? { 'x-cg-pro-api-key': apiKey } : {};
  
  // Use pro API if we have a key, otherwise use public API
  const baseUrl = apiKey 
    ? 'https://pro-api.coingecko.com/api/v3' 
    : 'https://api.coingecko.com/api/v3';
    
  const url = `${baseUrl}/simple/price?ids=${id}&vs_currencies=usd`;
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    // Handle rate limiting specifically
    if (res.status === 429) {
      throw new Error('CoinGecko API rate limit exceeded. Please try again later.');
    }
    throw new Error(`Failed to fetch price from CoinGecko for ${id}: ${res.status}`);
  }
  
  const json = await res.json();
  const price = json[id]?.usd;
  
  if (price == null) {
    throw new Error(`No price data available from CoinGecko for ${id}`);
  }
  
  return price;
}

/**
 * Fetch from Binance API
 */
async function fetchBinancePrice(id: string): Promise<number> {
  // Map common IDs to Binance symbols
  const symbolMap: Record<string, string> = {
    'bitcoin': 'BTCUSDT',
    'btc': 'BTCUSDT',
    'ethereum': 'ETHUSDT',
    'eth': 'ETHUSDT',
    // Add more mappings as needed
  };
  
  const symbol = symbolMap[id] || `${id.toUpperCase()}USDT`;
  const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
  
  if (!res.ok) {
    throw new Error(`Failed to fetch price from Binance for ${id}: ${res.status}`);
  }
  
  const json = await res.json();
  if (!json.price) {
    throw new Error(`No price data available from Binance for ${id}`);
  }
  
  return parseFloat(json.price);
}

/**
 * Fetch from CoinMarketCap API (requires an API key)
 */
async function fetchCoinMarketCapPrice(id: string): Promise<number> {
  const apiKey = process.env.COINMARKETCAP_API_KEY;
  
  if (!apiKey) {
    throw new Error('CoinMarketCap API key is required but not configured');
  }
  
  // Map common IDs to CMC slugs
  const res = await fetch(
    `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?slug=${id}`,
    {
      headers: {
        'X-CMC_PRO_API_KEY': apiKey,
        'Accept': 'application/json'
      }
    }
  );
  
  if (!res.ok) {
    throw new Error(`Failed to fetch price from CoinMarketCap for ${id}: ${res.status}`);
  }
  
  const json = await res.json();
  
  // Find the first matching entry
  // Type assertion with validation for CoinMarketCap API response format
  const data = Object.values(json.data)[0] as any;
  if (!data || !data.quote || !data.quote.USD || !data.quote.USD.price) {
    throw new Error(`No price data available from CoinMarketCap for ${id}`);
  }
  
  return data.quote.USD.price;
}
