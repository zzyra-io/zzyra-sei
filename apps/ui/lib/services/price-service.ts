// Price service to fetch cryptocurrency prices
export async function fetchCryptoPrice(
  asset: string
): Promise<{ price: number; timestamp: string }> {
  // Map UI asset symbols to CoinGecko IDs
  const mapAssetToCoinGeckoId = (asset: string): string => {
    const mapping: Record<string, string> = {
      SEI: "sei-network",
      SEI_NETWORK: "sei-network",
      ETH: "ethereum",
      ETHEREUM: "ethereum",
      BTC: "bitcoin",
      BITCOIN: "bitcoin",
      SOL: "solana",
      SOLANA: "solana",
      USDC: "usd-coin",
      USDT: "tether",
      TETHER: "tether",
      ADA: "cardano",
      CARDANO: "cardano",
      DOGE: "dogecoin",
      DOGECOIN: "dogecoin",
      MATIC: "matic-network",
      POLYGON: "matic-network",
      LINK: "chainlink",
      UNI: "uniswap",
      AAVE: "aave",
      MKR: "maker",
    };

    return mapping[asset.toUpperCase()] || asset.toLowerCase();
  };

  const coinGeckoId = mapAssetToCoinGeckoId(asset);

  // RPC failover: try multiple endpoints
  const defaultEndpoints = [
    `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=usd`,
    `https://api.coincap.io/v2/assets/${coinGeckoId}`,
  ];
  const endpoints = (
    process.env.PRICE_RPC_ENDPOINTS?.split(",") || defaultEndpoints
  ).map((url) => url.trim());
  let lastError: Error | unknown;
  for (const url of endpoints) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const data = await resp.json();
      let price: number | undefined;
      // CoinGecko format
      if (data[coinGeckoId]?.usd != null) {
        price = data[coinGeckoId].usd;
        // CoinCap format
      } else if (data.data?.priceUsd) {
        price = Number.parseFloat(data.data.priceUsd);
      }
      if (price == null || Number.isNaN(price)) {
        throw new Error(`Invalid price data from ${url}`);
      }
      return { price, timestamp: new Date().toISOString() };
    } catch (err: unknown) {
      console.warn(`fetchCryptoPrice endpoint failed (${url}):`, err);
      lastError = err;
      continue;
    }
  }
  console.error(`All RPC endpoints failed for ${asset}:`, lastError);
  const errorMessage =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`All RPC endpoints failed for ${asset}: ${errorMessage}`);
}
